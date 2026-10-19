#!/usr/bin/env node
/**
 * Site editor protocol check: drives `deco serve` (the local server the site editor talks to) the way
 * the editor does, against a running `vite dev`, and prints a log.
 *
 *   PORT=5340 npm run dev                                  # the site, in another terminal
 *   npx deco serve --port 4653 --preview http://localhost:5340
 *   node parity/editor-check.mjs [--serve http://localhost:4653] [--site http://localhost:5340]
 *
 * Steps: describe; schema.get, then schema.get with ifNoneMatch (notModified); blocks.list (count,
 * diagnostics); blocks.apply with a stale ifMatch (must be refused); an edit of the home's Newsletter
 * title, which the dev server must render without a restart; the original block put back, after which
 * the block's version and the content revision must equal the starting ones and the file must be
 * byte-identical. Exits non-zero when any step fails.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createContentClient } from "@decocms/blocks/protocol";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const SERVE = flag("serve", "http://localhost:4653");
const SITE = flag("site", "http://localhost:5340");
const BLOCK = "pages-home";
const FILE = path.join(ROOT, ".deco/blocks/pages-home.json");

let failed = 0;
const step = (ok, text) => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${text}`);
};
const newsletterOf = (block) => block.sections.find((s) => String(s.__resolveType).includes("Newsletter"));
const fetchHome = async () => (await fetch(`${SITE}/?editor-check=${Date.now()}`)).text();
const waitFor = async (predicate, ms = 20_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const client = createContentClient({ endpoint: `${SERVE}/rpc` });
const originalBytes = fs.readFileSync(FILE);

const d = await client.describe();
step(!!d, `describe: ${JSON.stringify(d)}`);

const s1 = await client.schemaGet();
step(!s1.notModified && s1.version !== null, `schema.get: version ${s1.version}, ${Object.keys(s1.schema?.schema?.definitions ?? {}).length} definitions`);
const s2 = await client.schemaGet({ ifNoneMatch: s1.version });
step(s2.notModified === true, `schema.get ifNoneMatch=${s1.version}: notModified=${s2.notModified}`);

const l1 = await client.blocksList();
step(l1.diagnostics.length === 0, `blocks.list: ${Object.keys(l1.blocks).length} blocks, revision ${l1.revision}, ${l1.diagnostics.length} diagnostics`);
const startVersion = l1.versions[BLOCK];
const original = l1.blocks[BLOCK];
const originalTitle = newsletterOf(original).notices.empty.title;

try {
  await client.blocksApply({ set: { [BLOCK]: original }, ifMatch: { [BLOCK]: "stale-version" } });
  step(false, "blocks.apply with a stale ifMatch was accepted");
} catch (error) {
  step(true, `blocks.apply with a stale ifMatch refused: ${error.message}${error.data ? ` ${JSON.stringify(error.data)}` : ""}`);
}

const title = `Editor check ${new Date().toISOString()}`;
const edited = structuredClone(original);
newsletterOf(edited).notices.empty.title = title;
const a1 = await client.blocksApply({ set: { [BLOCK]: edited }, ifMatch: { [BLOCK]: startVersion } });
step(a1.versions[BLOCK] && a1.versions[BLOCK] !== startVersion, `blocks.apply edit: Newsletter title -> "${title}", version ${a1.versions[BLOCK]}`);
step(await waitFor(async () => (await fetchHome()).includes(title)), `vite dev renders the new title without a restart`);

const a2 = await client.blocksApply({ set: { [BLOCK]: original }, ifMatch: { [BLOCK]: a1.versions[BLOCK] } });
step(a2.versions[BLOCK] === startVersion, `blocks.apply restore: version ${a2.versions[BLOCK]} (start ${startVersion})`);
step(a2.revision === l1.revision, `content revision ${a2.revision} (start ${l1.revision})`);
step(fs.readFileSync(FILE).equals(originalBytes), `.deco/blocks/pages-home.json byte-identical to before`);
step(await waitFor(async () => (await fetchHome()).includes(originalTitle)), `vite dev renders the original title again`);
const status = execFileSync("git", ["status", "--porcelain", "--", ".deco/blocks"], { cwd: ROOT }).toString().trim();
step(status === "", `git status .deco/blocks: ${status || "clean"}`);

console.log(failed ? `${failed} step(s) failed` : "all steps passed");
process.exitCode = failed ? 1 : 0;
