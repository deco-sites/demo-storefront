/**
 * Cloudflare Worker entry point — Shopify storefront.
 *
 * Handles admin protocol, CSP, device segmentation, and edge caching.
 * Shopify checkout runs on Shopify's hosted checkout (or the store's domain)
 * and does not need a reverse proxy — all commerce calls go via the
 * Storefront API (GraphQL) from the server loaders.
 */
import "./setup";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { createDecoWorkerEntry } from "@decocms/tanstack";
import { instrumentWorker } from "@decocms/blocks/sdk/otel";
import { detectDevice } from "@decocms/blocks/sdk/useDevice";
import {
  handleMeta,
  handleDecofileRead,
  handleDecofileReload,
  handleRender,
  corsHeaders,
} from "@decocms/blocks-admin";
import { getCookies } from "@decocms/apps-shopify/utils/cookies";
import { withABTesting } from "@decocms/blocks/sdk/abTesting";

const serverEntry = createServerEntry({ fetch: handler.fetch });

// ---------------------------------------------------------------------------
// Content Security Policy.
//
// The framework's `csp` option only ever emits
// `Content-Security-Policy-Report-Only`, which browsers do not enforce. The
// only enforcing policy the site shipped was the framework default, which
// carries `frame-ancestors` and nothing else — there was no script/resource
// policy at all. We build the full directive list here and hand it to
// `securityHeaders` as the enforcing `Content-Security-Policy` header instead
// (see `securityHeaders` below).
//
// Notes on the loose bits:
//   - `'unsafe-inline'`/`'unsafe-eval'` in script-src are required by the
//     TanStack Start hydration payload and the Shopify/deco inline snippets.
//     Removing them needs a nonce plumbed through the SSR stream first.
//   - `img-src`/`media-src` allow any https origin because banner, logo and
//     product media URLs are authored in the CMS and can point anywhere.
//   - `frame-ancestors` keeps the Studio preview iframe working. A custom
//     `Content-Security-Policy` REPLACES the framework's default header rather
//     than merging into it, so this list must stay a superset of
//     `DECO_ADMIN_FRAME_ANCESTORS` in `@decocms/tanstack`
//     (`src/sdk/workerEntry.ts`). If a framework bump adds an admin surface it
//     will NOT propagate here — add it by hand, or the Studio preview goes
//     blank on that surface.
// ---------------------------------------------------------------------------
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://*.shopify.com https://*.decocms.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://cdn.shopify.com https://*.shopify.com https://*.myshopify.com https://graph.instagram.com https://*.decocms.com https://otel-ingest.infra.deco.cx",
  "frame-src 'self' https://*.shopify.com",
  // Superset of DECO_ADMIN_FRAME_ANCESTORS — see note above.
  "frame-ancestors 'self' https://*.decocms.com https://*.deco.studio",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self' https://*.shopify.com https://*.myshopify.com",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

const decoWorker = createDecoWorkerEntry(serverEntry, {
  // Opt out of the auto-wrap the framework (6.6.0+) applies inside
  // createDecoWorkerEntry. We keep the manual `instrumentWorker(decoWorker)`
  // wrap at the bottom of this file as the outermost layer. Without
  // `observability: false` we'd double-wrap and reinitialize the OTel SDK
  // twice per request. Manual wrap is the proven path on every tanstack site
  // that emits today.
  observability: false,

  admin: {
    handleMeta,
    handleDecofileRead,
    handleDecofileReload,
    handleRender,
    corsHeaders,
  },

  // Report-only duplicate would be redundant — the enforcing header below is
  // the policy we actually ship.
  csp: false,

  securityHeaders: {
    "Content-Security-Policy": CSP_DIRECTIVES.join("; "),
  },

  buildSegment: (request) => {
    const cookies = getCookies(request.headers);
    const rawDevice = detectDevice(request.headers.get("user-agent") ?? "");
    // SegmentKey only splits mobile vs desktop — collapse tablet to mobile
    const device: "mobile" | "desktop" = rawDevice === "desktop" ? "desktop" : "mobile";

    // Region splits the cache so a RJ-cached response isn't served to SP
    // visitors when pages use the website/matchers/location.ts matcher.
    // Reads cf-region-code (Cloudflare adds this in prod) with request.cf
    // as a fallback for environments that drop the header.
    const cf = (request as unknown as { cf?: { regionCode?: string } }).cf;
    const regionCode = request.headers.get("cf-region-code") ?? cf?.regionCode ?? "";

    return {
      device,
      ...(cookies.customerAccessToken ? { loggedIn: true } : {}),
      ...(regionCode ? { regionId: regionCode } : {}),
    };
  },

  // Shopify storefront needs no upstream proxy — checkout is hosted by Shopify
  // and the Storefront API is called server-side from loaders. Leaving
  // proxyHandler unset keeps all routes going through TanStack Start.
});

// ---------------------------------------------------------------------------
// A/B wrapper — KV-driven traffic split between the TanStack worker and a
// legacy fallback origin during the migration period.
//
// Reads config from KV (binding below) keyed by hostname. When the binding is
// absent, or KV has no config for the host, ALL traffic passes straight to the
// worker (no split). So this is safe to ship before SITES_KV exists — to
// actually enable A/B, add the `SITES_KV` binding in wrangler.jsonc and a
// per-host config: { "workerName": "...", "fallbackOrigin": "...",
// "abTest": { "ratio": 0.5 } }.
// ---------------------------------------------------------------------------

const abTestedWorker = withABTesting(decoWorker, {
  kvBinding: "SITES_KV",
});

// ---------------------------------------------------------------------------
// Strip `x-powered-by` from every response.
//
// The framework stamps the exact platform version (e.g. `deco@7.20.7`) on
// outgoing responses, which hands an attacker a precise version to match
// against known CVEs. The header has no functional purpose for clients, so we
// drop it entirely rather than ofuscate it.
//
// Sits inside `instrumentWorker` (which adds no response headers of its own)
// so the OTel wrapper stays the outermost layer.
// ---------------------------------------------------------------------------
interface FetchWorker {
  fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

const withoutPoweredBy = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, env: never, ctx: never) => {
    const response = await worker.fetch(request, env, ctx);

    // WebSocket upgrades and bodyless responses can't be reconstructed.
    if (
      ("webSocket" in response && response.webSocket) ||
      !response.headers.has("x-powered-by")
    ) {
      return response;
    }

    const stripped = new Response(response.body, response);
    stripped.headers.delete("x-powered-by");
    return stripped;
  },
});

// instrumentWorker MUST be the outermost wrapper. It initialises the OTel
// pipeline (metrics buffering, error log direct-POST) and reads
// DECO_OTEL_METRICS_ENDPOINT + DECO_OTEL_LOGS_ENDPOINT from env at boot.
export default instrumentWorker(withoutPoweredBy(abTestedWorker));
