/**
 * Cloudflare Worker entry point — Shopify storefront.
 *
 * TanStack Start serves every page; `createDecoWorker` (@decocms/tanstack) puts the Deco edge in
 * front of it: the page cache (keyed on build, content revision, device, region and login), drafts,
 * Studio framing, CMS redirects, security headers and the CDN caching of navigation data. Shopify
 * checkout runs on Shopify's hosted checkout (or the store's domain) and needs no reverse proxy.
 */
import { createDecoWorker } from "@decocms/tanstack/worker";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { cms } from "./cms";
import { detectDevice } from "./sdk/device";
import { getCookies } from "./vendor/shopify/utils/cookies";
// @ts-ignore Vite ?url import
import appCss from "./styles/app.css?url";

// Enforced Content-Security-Policy.
//
// Hosts included here are the ones actually referenced by the rendered
// storefront: decoims.com (deco image CDN), cdn.shopify.com / *.shopify.com /
// *.myshopify.com (Shopify assets + Storefront API), api/cdn.fontshare.com
// (webfonts) and fbcdn/graph.instagram.com (Instagram feed section).
//
// `default-src` is intentionally broad (https:) so resource types with no
// explicit directive — media, manifest, prefetch — keep working; the XSS
// hardening comes from `script-src`, `object-src`, `base-uri` and
// `form-action`. The worker adds `frame-ancestors` (Studio and the site).
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
];

export default createDecoWorker({
  serverEntry: createServerEntry({ fetch: handler.fetch }),
  cms,
  site: "demo-storefront",
  buildHash: __BUILD_HASH__,
  dev: import.meta.env.DEV,
  csp: { enforce: CSP_DIRECTIVES },
  preload: { styles: [appCss] },
  purgeToken: (env: { PURGE_TOKEN?: string }) => env.PURGE_TOKEN,
  segment: (request) => {
    // Signed-in shoppers carry the Shopify customer token cookie (src/platform/user/user.actions.ts):
    // their pages are never stored in or served from the shared cache.
    if (getCookies(request.headers).secure_customer_sig) return "private";
    // The cache splits only mobile vs desktop: tablets share the mobile entry. Region splits it so
    // a page cached for one region isn't served to another (cf-region-code, request.cf fallback).
    const cf = (request as unknown as { cf?: { regionCode?: string } }).cf;
    return {
      device:
        detectDevice(request.headers.get("user-agent") ?? "") === "desktop" ? "desktop" : "mobile",
      regionId: request.headers.get("cf-region-code") ?? cf?.regionCode,
    };
  },
});
