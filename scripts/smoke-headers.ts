/**
 * Post-deploy header smoke test.
 *
 * Fails (exit 1) if any response carries `x-powered-by` — the header leaks the
 * exact framework version (e.g. `deco@7.20.7`), which hands an attacker a
 * precise target to match against known CVEs. `withoutPoweredBy` in
 * `src/worker-entry.ts` strips it; this script is the regression guard so a
 * refactor that drops the wrapper (or a stale deploy) fails the pipeline
 * instead of silently shipping.
 *
 * `server: cloudflare` is deliberately NOT checked: it is injected by the
 * Cloudflare edge, outside the Worker's control.
 *
 * Usage: tsx scripts/smoke-headers.ts <base-url> [extra paths...]
 *
 * Paths cover the distinct response codepaths — cacheable listing/detail routes
 * and the error page — since those can differ from the main document fetch.
 */

const FORBIDDEN_HEADERS = ["x-powered-by"];

const DEFAULT_PATHS = [
  "/", // home
  "/collections/all", // PLP (catch-all route)
  "/products/", // PDP prefix (catch-all route)
  "/__smoke-test-nonexistent-page", // 404 / error page
];

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error("usage: tsx scripts/smoke-headers.ts <base-url> [paths...]");
  process.exit(2);
}

const paths = process.argv.length > 3 ? process.argv.slice(3) : DEFAULT_PATHS;
const origin = baseUrl.replace(/\/+$/, "");

let failures = 0;

for (const path of paths) {
  const url = `${origin}${path}`;

  let response: Response;
  try {
    // GET, not HEAD: the worker's cache layer short-circuits HEAD
    // (`x-cache-reason: method:HEAD`), so HEAD would not exercise the
    // cached-response codepath this check exists to cover.
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    console.error(`✗ ${url} — request failed: ${error}`);
    failures++;
    continue;
  }

  const leaked = FORBIDDEN_HEADERS.filter((header) => response.headers.has(header));

  if (leaked.length > 0) {
    for (const header of leaked) {
      console.error(
        `✗ ${url} [${response.status}] — leaks ${header}: ${response.headers.get(header)}`,
      );
    }
    failures++;
  } else {
    console.log(`✓ ${url} [${response.status}] — no forbidden headers`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${paths.length} route(s) clean.`);
