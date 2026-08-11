/**
 * Cloudflare Worker entry point — Shopify storefront.
 *
 * Handles admin protocol, CSP, device segmentation, and edge caching.
 * Shopify checkout runs on Shopify's hosted checkout (or the store's domain)
 * and does not need a reverse proxy — all commerce calls go via the
 * Storefront API (GraphQL) from the server loaders.
 *
 * MANUAL REVIEW: Add site-specific CSP domains (analytics, CDN, tag managers).
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

// Enforced Content-Security-Policy.
//
// The framework's `csp` option only ever emits
// `Content-Security-Policy-Report-Only`, so the enforcing header is set
// explicitly through `securityHeaders` below (custom entries win over the
// framework defaults).
//
// Hosts included here are the ones actually referenced by the rendered
// storefront: decoims.com (deco image CDN), cdn.shopify.com / *.shopify.com /
// *.myshopify.com (Shopify assets + Storefront API), api/cdn.fontshare.com
// (webfonts) and fbcdn/graph.instagram.com (Instagram feed section).
//
// `default-src` is intentionally broad (https:) so resource types with no
// explicit directive — media, manifest, prefetch — keep working; the XSS
// hardening comes from `script-src`, `object-src`, `base-uri` and
// `form-action`. `frame-ancestors` is deliberately omitted so the deco CMS
// admin can keep rendering the site in its preview iframe; clickjacking is
// still covered by the default `X-Frame-Options: SAMEORIGIN`.
const CSP_DIRECTIVES = [
  "default-src 'self' https: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.shopify.com *.shopify.com",
  "img-src 'self' data: blob: decoims.com cdn.shopify.com *.shopify.com *.myshopify.com *.fbcdn.net",
  "connect-src 'self' *.myshopify.com cdn.shopify.com decoims.com graph.instagram.com",
  "frame-src 'self' *.shopify.com",
  "style-src 'self' 'unsafe-inline' api.fontshare.com fonts.googleapis.com",
  "font-src 'self' data: cdn.fontshare.com api.fontshare.com fonts.gstatic.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' *.myshopify.com *.shopify.com",
  // TODO: Add site-specific domains (analytics, CDN, tag managers)
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

  // Enforced header — `csp` would only produce the report-only variant.
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
// Cross-Origin-Resource-Policy (CORP).
//
// CORP tells the browser which origins may embed a response as a no-cors
// subresource. Without it, any site can pull our documents/assets into its own
// process and use a Spectre-style side channel to read them. Default here is
// `same-site`, which is the strictest value compatible with serving the
// storefront from apex + `www` + preview subdomains.
//
// Resources that genuinely need to be readable from other origins are opted
// into `cross-origin`:
//   - static public assets (favicons, webmanifest, sprite sheet, robots) —
//     these are fetched by the deco CMS admin (different origin) when it
//     renders the site preview, and by browsers/crawlers with an opaque origin;
//   - build output under /_build/ and /assets/;
//   - /image/* (deco image proxy output), which is referenced from the CMS
//     admin previews as well.
//
// COEP (`require-corp`) is deliberately NOT set: it would require every
// third-party subresource (Shopify CDN assets/frames, fontshare webfonts,
// Instagram images) to send CORP or CORS headers of its own, and those are
// outside our control — enabling it would break the storefront. CORP on our
// own responses is the half of the pair we can ship safely.
// ---------------------------------------------------------------------------
const CORP_SAME_SITE = "same-site";
const CORP_CROSS_ORIGIN = "cross-origin";

const CROSS_ORIGIN_PREFIXES = ["/_build/", "/assets/", "/image/", "/live/invoke/"];
const CROSS_ORIGIN_PATHS = new Set([
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/site.webmanifest",
  "/browserconfig.xml",
  "/sprites.svg",
  "/robots.txt",
  "/sw.js",
]);

const corpValueFor = (pathname: string): string =>
  CROSS_ORIGIN_PATHS.has(pathname) ||
    CROSS_ORIGIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ? CORP_CROSS_ORIGIN
    : CORP_SAME_SITE;

// ---------------------------------------------------------------------------
// Strip `x-powered-by` from every response, and stamp CORP.
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

const withSecurityHeaders = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, env: never, ctx: never) => {
    const response = await worker.fetch(request, env, ctx);

    // WebSocket upgrades can't be reconstructed.
    if ("webSocket" in response && response.webSocket) {
      return response;
    }

    const needsCorp = !response.headers.has("cross-origin-resource-policy");
    if (!needsCorp && !response.headers.has("x-powered-by")) {
      return response;
    }

    const patched = new Response(response.body, response);
    patched.headers.delete("x-powered-by");
    if (needsCorp) {
      patched.headers.set(
        "Cross-Origin-Resource-Policy",
        corpValueFor(new URL(request.url).pathname),
      );
    }
    return patched;
  },
});

// instrumentWorker MUST be the outermost wrapper. It initialises the OTel
// pipeline (metrics buffering, error log direct-POST) and reads
// DECO_OTEL_METRICS_ENDPOINT + DECO_OTEL_LOGS_ENDPOINT from env at boot.
export default instrumentWorker(withSecurityHeaders(abTestedWorker));
