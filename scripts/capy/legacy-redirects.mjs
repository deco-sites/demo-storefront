#!/usr/bin/env node
/**
 * Writes a redirect block (.deco/blocks/redirect-legacy-*.json) for every product and collection
 * of the old demo catalog, so their pages send visitors to /collections/the-herd. The capybara
 * catalog is everything tagged `capy-2026` and the collections the-herd, sol, rio and onsen;
 * everything else in the store is legacy.
 *
 * Read-only: it reads the Storefront API with the site's public token (wrangler.jsonc vars) and
 * writes files in this repo. Re-run it after the catalog changes, then `deco content && deco check`.
 *
 *   node scripts/capy/legacy-redirects.mjs           # write the blocks
 *   node scripts/capy/legacy-redirects.mjs --dry-run # list what it would write
 */
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
if (!store || !token) throw new Error("SHOPIFY_STORE_NAME / SHOPIFY_STOREFRONT_ACCESS_TOKEN not found in wrangler.jsonc");

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

const products = (await all("products", "handle tags")).filter((p) => !p.tags.includes(NEW_TAG));
const collections = (await all("collections", "handle")).filter((c) => !NEW_COLLECTIONS.has(c.handle));

const froms = [
  ...products.map((p) => `/products/${p.handle}`),
  ...collections.flatMap((c) => [`/collections/${c.handle}`, `/${c.handle}`]),
  ...OLD_PATHS,
];
const unique = [...new Set(froms)].sort();

const fileOf = (from) =>
  `redirect-legacy${from.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-$/, "")}.json`;

if (dryRun) {
  for (const from of unique) console.log(`${from} -> ${TARGET}  (${fileOf(from)})`);
  console.log(`${unique.length} redirects (${products.length} products, ${collections.length} collections)`);
  process.exit(0);
}

for (const f of readdirSync(BLOCKS)) if (f.startsWith("redirect-legacy-")) rmSync(join(BLOCKS, f));
for (const from of unique) {
  const block = { __resolveType: "redirect", from, to: TARGET, permanent: false };
  writeFileSync(join(BLOCKS, fileOf(from)), `${JSON.stringify(block, null, 2)}\n`);
}
console.log(`wrote ${unique.length} redirect blocks (${products.length} products, ${collections.length} collections)`);
