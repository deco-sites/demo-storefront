#!/usr/bin/env node
/**
 * Parity harness CLI.
 *
 *   node parity/run.mjs record   [--only <substr>] [--rebuild]
 *   node parity/run.mjs compare  [--target <url>] [--only <substr>] [--label <name>] [--rebuild]
 *
 * record:  1) live pass — serves the parity build with the upstream proxy in
 *             record mode and every third-party browser request recorded into
 *             per-case HAR files;
 *          2) capture pass — restarts everything in replay mode and writes the
 *             baseline screenshots + snapshots (exactly the conditions compare
 *             uses), so the baseline is itself a replayed run.
 * record --capture-only: re-runs pass 2 only, from the fixtures already in
 *          parity/baseline (no live traffic), e.g. after the snapshot format changes.
 * record-pending --rule <id>: pins the new version's output for a pages.json
 *          `pendingBaselines` rule into its `dir`: a live pass records what the
 *          baseline fixtures lack (upstream + HAR, into that dir), then a replay
 *          pass captures the screens/snapshots compare checks those cases against,
 *          plus a v7-vs-new report for the product owner.
 * compare: replay mode against --target (default: starts the local parity
 *          build). Writes parity/runs/<label>/{actual,diff,summary.*} and exits
 *          non-zero on any pixel, snapshot or missing-capture difference.
 *          A --target served elsewhere must load parity/runtime/worker-shim.js
 *          with PARITY_UPSTREAM=http://127.0.0.1:<upstreamPort> (printed at
 *          start) to get the replayed upstream data.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { runCase } from "./lib/capture.mjs";
import { compareCase } from "./lib/compare.mjs";
import { startUpstream } from "./lib/upstream.mjs";
import { ROOT, build, ensureBuilt, killChildren, startSite } from "./lib/server.mjs";

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);
const log = (...m) => console.log(...m);

// Make sure Ctrl-C / kill never leaves the preview server or proxy holding the ports.
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    killChildren();
    process.exit(130);
  });
}

const PARITY = path.join(ROOT, "parity");
const BASE = path.join(PARITY, "baseline");
const manifest = JSON.parse(fs.readFileSync(path.join(PARITY, "pages.json"), "utf8"));
const SITE_PORT = manifest.ports?.site ?? 4173;
const UP_PORT = manifest.ports?.upstream ?? 4180;

function expandCases() {
  const cases = [];
  for (const p of manifest.pages) for (const vp of p.viewports ?? Object.keys(manifest.viewports)) cases.push({ ...p, kind: "page", viewport: vp, id: `${p.id}@${vp}` });
  // `blocked` flows cannot run on the baseline (a live bug); they are listed in meta.json, never run.
  for (const f of (manifest.flows ?? []).filter((x) => !x.blocked)) for (const vp of f.viewports ?? Object.keys(manifest.viewports)) cases.push({ ...f, kind: "flow", viewport: vp, id: `${f.id}@${vp}` });
  for (const t of manifest.texts ?? []) cases.push({ ...t, kind: "text", id: t.id });
  const only = flag("only");
  return only ? cases.filter((c) => only.split(",").some((o) => c.id.includes(o))) : cases;
}

const siteEnv = (upstreamUrl) => ({
  PARITY_UPSTREAM: upstreamUrl,
  PARITY_NOW: manifest.fixedTime,
  PARITY_SEED: manifest.randomSeed,
  ...(manifest.siteEnv ?? {}),
});

const fileId = (id) => id.replace(/[^a-zA-Z0-9@._-]+/g, "_");

/** The `pendingBaselines` rule a case is under, if any. */
const pendingBaselines = manifest.pendingBaselines ?? [];
const pendingFor = (id) => pendingBaselines.find((p) => p.cases.includes(id));
const pendingDir = (p) => path.join(ROOT, p.dir);
if (pendingBaselines.some((p) => p.status !== "pending")) throw new Error("pages.json pendingBaselines: every rule needs \"status\": \"pending\" (only the product owner signs a difference off)");

/** The replay proxy's per-case fallback store: the pending baselines' own upstream recordings. */
function upstreamFallback({ record = false, only } = {}) {
  const rules = only ? [only] : pendingBaselines;
  if (rules.length > 1) throw new Error("one pendingBaselines rule with fixtures is supported");
  if (!rules.length) return undefined;
  return { storePath: path.join(pendingDir(rules[0]), "upstream.json"), cases: new Set(rules[0].cases), record };
}

/** The HAR(s) a case replays from: the baseline's, then its pending baseline's own. */
function harsFor(kase, harDir, { recordPending = false } = {}) {
  const harPath = path.join(harDir, `${fileId(kase.id)}.har`);
  const p = pendingFor(kase.id);
  if (!p) return { harPath };
  const extra = path.join(pendingDir(p), "har", `${fileId(kase.id)}.har`);
  if (recordPending) return { harPath, extraHar: { path: extra, update: true } };
  return fs.existsSync(extra) ? { harPath, extraHar: { path: extra, update: false } } : { harPath };
}

async function capturePass({ cases, baseURL, mode, upstream, outDir, harDir, recordPending = false, noPending = false }) {
  const browser = await chromium.launch({ args: manifest.chromiumArgs ?? [] });
  const results = [];
  try {
    for (const kase of cases) {
      upstream.setCase(kase.id);
      const { harPath, extraHar } = noPending ? { harPath: path.join(harDir, `${fileId(kase.id)}.har`) } : harsFor(kase, harDir, { recordPending });
      if (mode === "replay" && kase.kind !== "text" && !fs.existsSync(harPath)) {
        results.push({ id: kase.id, error: `no HAR fixture ${path.relative(ROOT, harPath)} (run parity:record)` });
        continue;
      }
      const t0 = Date.now();
      try {
        if (extraHar?.update) fs.mkdirSync(path.dirname(extraHar.path), { recursive: true });
        const { screenshots, snapshot } = await runCase({ browser, manifest, kase, baseURL, mode, harPath, extraHar, log });
        if (outDir) {
          fs.mkdirSync(path.join(outDir, "screens"), { recursive: true });
          fs.mkdirSync(path.join(outDir, "snapshots"), { recursive: true });
          for (const s of screenshots) fs.writeFileSync(path.join(outDir, "screens", `${fileId(kase.id)}--${fileId(s.name)}.png`), s.buf);
          fs.writeFileSync(path.join(outDir, "snapshots", `${fileId(kase.id)}.json`), JSON.stringify(snapshot, null, 2) + "\n");
        }
        results.push({ id: kase.id, screenshots: screenshots.map((s) => s.name) });
        log(`  ok   ${kase.id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      } catch (err) {
        results.push({ id: kase.id, error: err.message });
        log(`  FAIL ${kase.id}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  return results;
}

/** Strip cookies from recorded HARs: they are never needed for replay and must not be committed. */
function sanitizeHars(harDir) {
  const DROP = new Set(["cookie", "set-cookie", "authorization"]);
  for (const f of fs.readdirSync(harDir).filter((x) => x.endsWith(".har"))) {
    const file = path.join(harDir, f);
    const har = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const e of har.log.entries) {
      for (const side of [e.request, e.response]) {
        side.headers = side.headers.filter((h) => !DROP.has(h.name.toLowerCase()));
        side.cookies = [];
      }
    }
    fs.writeFileSync(file, JSON.stringify(har));
  }
}

/**
 * Editor-form baseline: the admin's composed schema as the v7 site serves it
 * (GET /live/_meta). Not part of the pixel/snapshot compare (v8 has no admin
 * endpoint); it is the reference for the v8 schema.gen.json form review.
 */
async function saveForms(baseURL) {
  const dir = path.join(BASE, "forms");
  fs.mkdirSync(dir, { recursive: true });
  try {
    const res = await fetch(`${baseURL}/live/_meta`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const meta = await res.json();
    delete meta.etag;
    fs.writeFileSync(path.join(dir, "live-meta.json"), JSON.stringify(meta, null, 1) + "\n");
    log(`[record] editor forms saved to ${path.relative(ROOT, dir)}/live-meta.json`);
  } catch (err) {
    log(`[record] editor forms not saved: ${err.message}`);
  }
}

async function recaptureBaseline() {
  // Pass 2 of record alone: the same fixtures, replayed, rewrite the baseline screens and snapshots.
  const cases = expandCases();
  if (flag("only")) throw new Error("record --capture-only rewrites the whole baseline; --only is not supported");
  if (has("rebuild")) build({ log });
  else ensureBuilt({ log });
  const harDir = path.join(BASE, "har");
  const storePath = path.join(BASE, "upstream.json");
  fs.rmSync(path.join(BASE, "screens"), { recursive: true, force: true });
  fs.rmSync(path.join(BASE, "snapshots"), { recursive: true, force: true });
  log("[record] capture only: baseline capture in replay mode from the existing fixtures");
  const upstream = await startUpstream({ port: UP_PORT, mode: "replay", storePath, log });
  const site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  let r2;
  try {
    // No pending-baseline fixtures here: the baseline is the old version's capture, alone.
    r2 = await capturePass({ cases, baseURL: site.url, mode: "replay", upstream, outDir: BASE, harDir: path.join(BASE, "har"), noPending: true });
  } finally {
    await site.stop();
    await upstream.close();
  }
  const metaPath = path.join(BASE, "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const { execSync } = await import("node:child_process");
  meta.recapturedAt = new Date().toISOString();
  meta.recapturedFromGitSha = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  meta.upstreamMisses = upstream.misses;
  meta.cases = r2;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  const failed = r2.filter((r) => r.error);
  log(`[record] done: ${r2.length - failed.length}/${r2.length} cases captured, ${upstream.misses.length} upstream misses`);
  for (const f of failed) log(`  - ${f.id}: ${f.error}`);
  process.exitCode = failed.length || upstream.misses.length ? 1 : 0;
}

async function record() {
  if (has("capture-only")) return recaptureBaseline();
  const cases = expandCases();
  if (has("rebuild")) build({ log });
  else ensureBuilt({ log });
  const harDir = path.join(BASE, "har");
  const storePath = path.join(BASE, "upstream.json");
  const partial = !!flag("only");
  if (partial) throw new Error("record --only is not supported: the upstream store is rewritten as a whole");
  fs.rmSync(BASE, { recursive: true, force: true });
  fs.mkdirSync(harDir, { recursive: true });

  log("[record] pass 1/2: live recording (upstream + HAR)");
  let upstream = await startUpstream({ port: UP_PORT, mode: "record", storePath, log });
  let site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  let r1;
  try {
    r1 = await capturePass({ cases, baseURL: site.url, mode: "record", upstream, outDir: null, harDir, noPending: true });
  } finally {
    await site.stop();
    upstream.save();
    await upstream.close();
  }
  sanitizeHars(harDir);
  const failed1 = r1.filter((r) => r.error);
  if (failed1.length) log(`[record] ${failed1.length} case(s) failed during recording`);

  log("[record] pass 2/2: baseline capture in replay mode");
  upstream = await startUpstream({ port: UP_PORT, mode: "replay", storePath, log });
  site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  let r2;
  try {
    r2 = await capturePass({ cases, baseURL: site.url, mode: "replay", upstream, outDir: BASE, harDir, noPending: true });
    await saveForms(site.url);
  } finally {
    await site.stop();
    await upstream.close();
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const { execSync } = await import("node:child_process");
  const sha = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();
  const meta = {
    recordedAt: new Date().toISOString(),
    gitSha: sha,
    contentRevision: "bundled .deco/blocks at gitSha (DECO_FAST_DEPLOY=0)",
    playwright: JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/playwright/package.json"), "utf8")).version,
    chromium: (await chromium.launch().then(async (b) => { const v = b.version(); await b.close(); return v; })),
    platform: `${process.platform}-${process.arch}`,
    decocms: Object.fromEntries(Object.entries(pkg.dependencies).filter(([k]) => k.startsWith("@decocms/"))),
    upstreamMisses: upstream.misses,
    blockedFlows: (manifest.flows ?? []).filter((f) => f.blocked).map((f) => ({ id: f.id, reason: f.blocked })),
    cases: r2,
  };
  fs.writeFileSync(path.join(BASE, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  const failed = r2.filter((r) => r.error);
  log(`[record] done: ${r2.length - failed.length}/${r2.length} cases captured, ${upstream.misses.length} upstream misses`);
  for (const f of failed) log(`  - ${f.id}: ${f.error}`);
  process.exitCode = failed.length ? 1 : 0;
}

/** One line of counts: ok, PENDING (identical once pending rules apply) and DIFF are never added up. */
function countLine(report) {
  const ok = report.filter((r) => r.ok && !r.pending?.length).length;
  const pending = report.filter((r) => r.ok && r.pending?.length).length;
  const diff = report.filter((r) => !r.ok).length;
  return { ok, pending, diff, text: `${ok} ok, ${pending} PENDING, ${diff} DIFF (of ${report.length})` };
}

async function compare() {
  const cases = expandCases();
  // --no-pending: every case against the old version's baseline, pending baselines ignored (a
  // self-compare of the old version, or the raw old-vs-new picture).
  const usePending = !has("no-pending");
  const label = flag("label") ?? new Date().toISOString().replace(/[:.]/g, "-");
  const outRoot = path.join(PARITY, "runs", label);
  const actualDir = path.join(outRoot, "actual");
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(actualDir, { recursive: true });
  const storePath = path.join(BASE, "upstream.json");
  const upstream = await startUpstream({ port: UP_PORT, mode: "replay", storePath, passthroughOnMiss: has("upstream-passthrough"), fallback: usePending ? upstreamFallback() : undefined, log });
  log(`[compare] upstream replay proxy at ${upstream.url}`);
  let site = null;
  let baseURL = flag("target");
  try {
    if (!baseURL) {
      if (has("rebuild")) build({ log });
      else ensureBuilt({ log });
      site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
      baseURL = site.url;
    }
    baseURL = baseURL.replace(/\/$/, "");
    log(`[compare] target ${baseURL}, ${cases.length} cases -> ${path.relative(ROOT, outRoot)}`);
    const results = await capturePass({ cases, baseURL, mode: "replay", upstream, outDir: actualDir, harDir: path.join(BASE, "har"), noPending: !usePending });
    const report = [];
    for (const r of results) {
      const pb = usePending ? pendingFor(r.id) : undefined;
      report.push(compareCase({ id: r.id, fileId: fileId(r.id), error: r.error, baseDir: pb ? pendingDir(pb) : BASE, actualDir, outRoot, ignoreHeaders: manifest.ignoreHeaders, approvedDifferences: manifest.approvedDifferences, volatileHarMisses: manifest.volatileHarMisses, pendingBaseline: pb }));
    }
    const counts = countLine(report);
    const summary = {
      label,
      target: baseURL,
      at: new Date().toISOString(),
      total: report.length,
      ok: counts.ok,
      pendingCases: counts.pending,
      failed: counts.diff,
      upstreamMisses: upstream.misses,
      pendingFallbackServed: upstream.fallbackServed.length,
      pending: [...new Set(report.flatMap((r) => r.pending ?? []))],
      cases: report,
    };
    // `--strict` also fails on differences still pending the product owner's approval.
    const pass = summary.failed === 0 && (!has("strict") || summary.pending.length === 0);
    fs.writeFileSync(path.join(outRoot, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    const md = [
      `# Parity compare ${label}`,
      ``,
      `target: ${baseURL}${usePending ? "" : " (--no-pending: every case against the v7 baseline)"}  `,
      `result: **${pass ? "PASS" : "FAIL"}**${has("strict") ? " (--strict)" : ""} — ${counts.text}, upstream misses: ${upstream.misses.length}  `,
      summary.pending.length ? `pending rules (not approved): ${summary.pending.join(", ")}` : `pending rules: none`,
      ``,
      `| case | result | details |`,
      `|---|---|---|`,
      ...report.map((r) => `| ${r.id} | ${r.ok ? (r.pending?.length ? "PENDING" : "ok") : "**DIFF**"} | ${[...r.problems, ...(r.approved?.length ? [`approved: ${r.approved.join(", ")}`] : []), ...(r.pending?.length ? [`pending approval: ${r.pending.join(", ")}`] : [])].join("; ").replace(/\|/g, "\\|")} |`),
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(outRoot, "summary.md"), md);
    log(md);
    process.exitCode = pass && (!has("strict-upstream") || upstream.misses.length === 0) ? 0 : 1;
  } finally {
    if (site) await site.stop();
    await upstream.close();
  }
}

/**
 * Pins the new version's output for one `pendingBaselines` rule. Pass 1 serves the baseline's
 * recordings where they exist and records the rest live (upstream into <dir>/upstream.json, browser
 * third parties into <dir>/har/); pass 2 replays and writes <dir>/screens and <dir>/snapshots. The
 * report <dir>/README.md lists, per case, how the pinned capture differs from the v7 baseline.
 */
async function recordPending() {
  const rule = pendingBaselines.find((p) => p.id === flag("rule"));
  if (!rule) throw new Error(`record-pending --rule <id>: one of ${pendingBaselines.map((p) => p.id).join(", ") || "(none in pages.json)"}`);
  const dir = pendingDir(rule);
  const cases = expandCases().filter((c) => rule.cases.includes(c.id));
  if (cases.length !== rule.cases.length) throw new Error(`pendingBaselines ${rule.id}: unknown cases ${rule.cases.filter((id) => !cases.some((c) => c.id === id)).join(", ")}`);
  if (has("rebuild")) build({ log });
  else ensureBuilt({ log });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "har"), { recursive: true });
  const storePath = path.join(BASE, "upstream.json");

  log(`[record-pending] ${rule.id} pass 1/2: live recording of what the baseline fixtures lack`);
  let upstream = await startUpstream({ port: UP_PORT, mode: "replay", storePath, fallback: upstreamFallback({ record: true, only: rule }), log });
  let site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  try {
    await capturePass({ cases, baseURL: site.url, mode: "replay", upstream, outDir: null, harDir: path.join(BASE, "har"), recordPending: true });
  } finally {
    await site.stop();
    upstream.save();
    await upstream.close();
  }
  sanitizeHars(path.join(dir, "har"));

  log(`[record-pending] ${rule.id} pass 2/2: replayed capture`);
  upstream = await startUpstream({ port: UP_PORT, mode: "replay", storePath, fallback: upstreamFallback({ only: rule }), log });
  site = await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  let r2;
  try {
    r2 = await capturePass({ cases, baseURL: site.url, mode: "replay", upstream, outDir: dir, harDir: path.join(BASE, "har") });
  } finally {
    await site.stop();
    await upstream.close();
  }
  // Old vs new, for the product owner: the v7 baseline against the pinned capture.
  const vsDir = path.join(dir, "v7-vs-new");
  const rows = [];
  for (const r of r2) {
    const c = compareCase({ id: r.id, fileId: fileId(r.id), error: r.error, baseDir: BASE, actualDir: dir, outRoot: vsDir, ignoreHeaders: manifest.ignoreHeaders, approvedDifferences: manifest.approvedDifferences, volatileHarMisses: manifest.volatileHarMisses });
    rows.push(`| ${r.id} | ${c.ok ? "same as v7" : c.problems.join("; ").replace(/\|/g, "\\|")} |`);
  }
  const { execSync } = await import("node:child_process");
  fs.writeFileSync(path.join(dir, "README.md"), [
    `# PENDING: ${rule.id}`,
    ``,
    `Not approved. ${rule.reason ?? ""}`,
    ``,
    `Pinned from \`${execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim()}\` with \`node parity/run.mjs record-pending --rule ${rule.id}\`. Compare checks these cases against \`screens/\` and \`snapshots/\` here (reported PENDING when identical); \`--strict\` fails on them. The v7 captures are in \`parity/baseline/screens/\`; \`v7-vs-new/diff/\` has the red-pixel diffs and snapshot diffs.`,
    ``,
    `Upstream misses in the replayed capture: ${upstream.misses.length}.`,
    ``,
    `| case | v7 baseline vs this capture |`,
    `|---|---|`,
    ...rows,
    ``,
  ].join("\n"));
  const failed = r2.filter((r) => r.error);
  log(`[record-pending] done: ${r2.length - failed.length}/${r2.length} captured, ${upstream.misses.length} upstream misses -> ${path.relative(ROOT, dir)}`);
  for (const f of failed) log(`  - ${f.id}: ${f.error}`);
  process.exitCode = failed.length || upstream.misses.length ? 1 : 0;
}

async function probe() {
  // Authoring aid: run selected cases live (no fixtures written to baseline).
  const cases = expandCases();
  const outRoot = path.join(PARITY, "runs", "probe");
  fs.rmSync(outRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(outRoot, "har"), { recursive: true });
  ensureBuilt({ log });
  const upstream = await startUpstream({ port: UP_PORT, mode: "record", storePath: path.join(outRoot, "upstream.json"), log });
  const site = flag("target") ? null : await startSite({ port: SITE_PORT, env: siteEnv(upstream.url), log });
  try {
    await capturePass({ cases, baseURL: (flag("target") ?? site.url).replace(/\/$/, ""), mode: "record", upstream, outDir: outRoot, harDir: path.join(outRoot, "har") });
  } finally {
    if (site) await site.stop();
    await upstream.close();
  }
}

if (cmd === "record") await record();
else if (cmd === "record-pending") await recordPending();
else if (cmd === "probe") await probe();
else if (cmd === "compare") await compare();
else {
  console.error("usage: node parity/run.mjs <record [--capture-only]|record-pending --rule id|compare> [--target url] [--only ids] [--label name] [--rebuild] [--upstream-passthrough] [--strict-upstream] [--strict] [--no-pending]");
  process.exit(2);
}
