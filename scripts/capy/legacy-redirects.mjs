#!/usr/bin/env node
/**
 * Writes the site's redirects block (one block holding every rule: the .deco/blocks file whose type
 * is `redirects` or v7's `website/loaders/redirects.ts`, rewritten as `redirects`, else a new
 * Redirects.json) with a rule for every
 * product and collection of the old demo catalog, so their pages send visitors to
 * /collections/the-herd. The capybara catalog is everything tagged `capy-2026` and the collections
 * the-herd, sol, rio and onsen; everything else in the store is legacy. The block's other rules are
 * kept, and a legacy path one of them already redirects is skipped (redirects-block.mjs). The rules
 * of the per-rule redirect-legacy-*.json files older runs wrote are folded into the block first, one
 * per path (the catalog's rule wins a conflict, which is reported), so no live redirect is lost;
 * only once the block is written are those files removed. A re-run writes the same block.
 *
 * Read-only: it reads the Storefront API with the site's public token (wrangler.jsonc vars) and
 * writes files in .deco/blocks. Re-run it after the catalog changes, on a fresh `deco pull`, then
 * `deco check` and `deco push --draft=<name>` (with `--prune` the first time, so the removed
 * per-rule blocks are deleted too; publish the draft in Studio or with `deco publish`).
 *
 *   node scripts/capy/legacy-redirects.mjs           # write the block
 *   node scripts/capy/legacy-redirects.mjs --dry-run # list what it would write
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  isLegacyRuleFile,
  legacyFileRules,
  redirectsBlockFile,
  withLegacyRules,
} from "./redirects-block.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;
const BLOCKS = join(ROOT, ".deco/blocks");
const TARGET = "/collections/the-herd";
const NEW_TAG = "capy-2026";
const NEW_COLLECTIONS = new Set(["the-herd", "sol", "rio", "onsen"]);
/** Old landing pages that aren't Shopify collections. */
const OLD_PATHS = ["/accessories", "/home-and-living", "/kids", "/men", "/women"];
const dryRun = process.argv.includes("--dry-run");

const wrangler = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
const store = wrangler.match(/"SHOPIFY_STORE_NAME":\s*"([^"]+)"/)?.[1];
const token = wrangler.match(/"SHOPIFY_STOREFRONT_ACCESS_TOKEN":\s*"([^"]+)"/)?.[1];
if (!store || !token)
  throw new Error(
    "SHOPIFY_STORE_NAME / SHOPIFY_STOREFRONT_ACCESS_TOKEN not found in wrangler.jsonc",
  );

async function query(q, variables) {
  const res = await fetch(`https://${store}.myshopify.com/api/2025-04/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query: q, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

async function all(field, nodeFields) {
  const out = [];
  let after = null;
  do {
    const data = await query(
      `query($after: String) { ${field}(first: 250, after: $after) { nodes { ${nodeFields} } pageInfo { hasNextPage endCursor } } }`,
      { after },
    );
    out.push(...data[field].nodes);
    after = data[field].pageInfo.hasNextPage ? data[field].pageInfo.endCursor : null;
  } while (after);
  return out;
}

const allProducts = await all("products", "handle tags");
const allCollections = await all("collections", "handle");
const isNew = {
  product: (p) => p.tags.includes(NEW_TAG),
  collection: (c) => NEW_COLLECTIONS.has(c.handle),
};
const products = allProducts.filter((p) => !isNew.product(p));
const collections = allCollections.filter((c) => !isNew.collection(c));
const pathsOf = (ps, cs) => [
  ...ps.map((p) => `/products/${p.handle}`),
  ...cs.flatMap((c) => [`/collections/${c.handle}`, `/${c.handle}`]),
];

const froms = [...pathsOf(products, collections), ...OLD_PATHS];
// The live catalog's pages: a rule sending one to the target is left from a run when it was legacy.
const live = pathsOf(allProducts.filter(isNew.product), allCollections.filter(isNew.collection));

const blockFiles = existsSync(BLOCKS) ? readdirSync(BLOCKS).filter((f) => f.endsWith(".json")) : [];
const blocks = blockFiles.map((f) => [f, JSON.parse(readFileSync(join(BLOCKS, f), "utf8"))]);
const name = redirectsBlockFile(blocks);
const file = join(BLOCKS, name);
const existing = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
const legacyBlocks = blocks.filter(([f]) => isLegacyRuleFile(f));
const { block, rules, skipped, folded, conflicts, dropped } = withLegacyRules(
  existing,
  froms,
  TARGET,
  live,
  legacyFileRules(legacyBlocks),
);
const legacyFiles = legacyBlocks.map(([f]) => f);
const summary = `${block.redirects.length} rules, ${rules.length} legacy (${products.length} products, ${collections.length} collections), ${folded.length} folded from per-rule files`;

const show = (rule) => `${rule.from} -> ${rule.to}${rule.permanent ? " (permanent)" : ""}`;
for (const { file: f, rule, kept } of conflicts) {
  console.log(`conflict ${f}: ${show(rule)}; kept ${show(kept)}`);
}
for (const { file: f, rule, reason } of dropped)
  console.log(`not folded ${f}: ${show(rule)}: ${reason}`);

if (dryRun) {
  for (const rule of folded) console.log(`folded ${show(rule)}`);
  for (const rule of rules) console.log(show(rule));
  for (const from of skipped)
    console.log(`skipped ${from}: another rule in the block redirects it`);
  console.log(`would write .deco/blocks/${name}: ${summary}`);
  if (legacyFiles.length > 0)
    console.log(`would remove ${legacyFiles.length} per-rule redirect-legacy-*.json files`);
  process.exit(0);
}

mkdirSync(BLOCKS, { recursive: true });
// The block first, so the per-rule files' rules are in it before the files go.
writeFileSync(file, `${JSON.stringify(block, null, 2)}\n`);
for (const f of legacyFiles) rmSync(join(BLOCKS, f));
if (skipped.length > 0)
  console.log(`skipped ${skipped.length} legacy paths another rule already redirects`);
console.log(`wrote .deco/blocks/${name}: ${summary}`);
if (legacyFiles.length > 0)
  console.log(`removed ${legacyFiles.length} per-rule redirect-legacy-*.json files`);
