import { studioOrigin } from "@decocms/tanstack";

// Enforced Content-Security-Policy.
//
// Hosts included here are the ones actually referenced by the rendered
// storefront: decoims.com (deco image CDN), cdn.shopify.com / *.shopify.com /
// *.myshopify.com (Shopify assets + Storefront API), api/cdn.fontshare.com
// (webfonts), fbcdn/graph.instagram.com (Instagram feed section) and
// analytics.decocdn.com (Deco Analytics — see src/runtime/RootDocument.tsx).
//
// analytics.decocdn.com needs BOTH `script-src` and `connect-src`: the first
// serves `/_dq/a.js`, the second receives the `/_dq/e` beacon. Allowing only
// the script is the quiet failure here — the tag loads, the page looks
// instrumented, and every event is blocked on its way out.
//
// `default-src` is intentionally broad (https:) so resource types with no
// explicit directive — media, manifest, prefetch — keep working; the XSS
// hardening comes from `script-src`, `object-src`, `base-uri` and
// `form-action`. The worker adds `frame-ancestors` (Studio and the site).
//
// Studio's origin is in `script-src` too (`studioOrigin()`: `DECO_STUDIO_ORIGIN`, else Studio's
// production origin). Framed by Studio's site editor, the page imports the editor's modules from
// it (the section outlines, the HTML swap after a save) through the Studio channel `DecoPreview`
// mounts. Without it the page still renders, but the editor can't outline its sections, and a
// save reloads the frame.
export function cspDirectives(studio: string = studioOrigin()): string[] {
  return [
    "default-src 'self' https: data: blob:",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.shopify.com *.shopify.com analytics.decocdn.com ${studio}`,
    "img-src 'self' data: blob: decoims.com cdn.shopify.com *.shopify.com *.myshopify.com *.fbcdn.net",
    "connect-src 'self' *.myshopify.com cdn.shopify.com decoims.com graph.instagram.com analytics.decocdn.com",
    "frame-src 'self' *.shopify.com",
    "style-src 'self' 'unsafe-inline' api.fontshare.com fonts.googleapis.com",
    "font-src 'self' data: cdn.fontshare.com api.fontshare.com fonts.gstatic.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' *.myshopify.com *.shopify.com",
  ];
}
