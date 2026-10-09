/**
 * Cloudflare Worker entry point — Shopify storefront.
 *
 * TanStack Start serves every page; the site's edge-cache wrapper (src/server/edge-cache.ts) adds
 * security headers, page cache headers and the edge cache in front of it. In v7 this was
 * `createDecoWorkerEntry` from @decocms/tanstack. Shopify checkout runs on Shopify's hosted checkout
 * (or the store's domain) and needs no reverse proxy: every commerce call goes through the
 * Storefront API (GraphQL) from the server.
 *
 * MANUAL REVIEW: Add site-specific CSP domains (analytics, CDN, tag managers).
 */
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { withEdgeCache } from "./server/edge-cache";
import { detectDevice } from "./sdk/device";
import { getCookies } from "./vendor/shopify/utils/cookies";
// @ts-ignore Vite ?url import
import appCss from "./styles/app.css?url";

const serverEntry = createServerEntry({ fetch: handler.fetch });

// Enforced Content-Security-Policy, the same header v7 sent through `securityHeaders`.
//
// Hosts included here are the ones actually referenced by the rendered
// storefront: decoims.com (deco image CDN), cdn.shopify.com / *.shopify.com /
// *.myshopify.com (Shopify assets + Storefront API), api/cdn.fontshare.com
// (webfonts) and fbcdn/graph.instagram.com (Instagram feed section).
//
// `default-src` is intentionally broad (https:) so resource types with no
// explicit directive — media, manifest, prefetch — keep working; the XSS
// hardening comes from `script-src`, `object-src`, `base-uri` and
// `form-action`. `frame-ancestors` is deliberately omitted so the site editor
// can keep rendering the site in its preview iframe.
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

export default withEdgeCache(serverEntry, {
  enforcedCsp: CSP_DIRECTIVES.join("; "),
  cssHref: appCss,
  buildSegment: (request) => {
    const cookies = getCookies(request.headers);
    // The cache splits only mobile vs desktop: tablets share the mobile entry.
    const device =
      detectDevice(request.headers.get("user-agent") ?? "") === "desktop" ? "desktop" : "mobile";
    // Region splits the cache so a page cached for one region isn't served to another. Reads
    // cf-region-code (Cloudflare adds it in production), with request.cf as a fallback.
    const cf = (request as unknown as { cf?: { regionCode?: string } }).cf;
    const regionCode = request.headers.get("cf-region-code") ?? cf?.regionCode ?? "";
    return {
      device,
      // Signed-in shoppers carry the Shopify customer token cookie (src/platform/user/user.actions.ts):
      // their pages are never stored in or served from the shared cache. v7 looked for a
      // `customerAccessToken` cookie, which the sign-in flow never sets.
      ...(cookies.secure_customer_sig ? { loggedIn: true } : {}),
      ...(regionCode ? { regionId: regionCode } : {}),
    };
  },
});
