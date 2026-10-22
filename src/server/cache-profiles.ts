/**
 * Page cache profiles, owned by the site. A profile decides the Cache-Control a page is sent with
 * as the app renders it. The edge cache's own copy of these values and URL rules is in
 * src/worker-entry.ts (`PROFILES`, `pageProfile`): change both together.
 */
export type CacheProfileName =
  | "static"
  | "product"
  | "listing"
  | "search"
  | "cart"
  | "private"
  | "none";

interface Window {
  /** Seconds the response is fresh. */
  fresh: number;
  /** Seconds a stale response is still served while it revalidates. */
  swr: number;
  /** Seconds a stale response is served when the origin fails. */
  sie: number;
}

interface CacheProfile {
  edge: Window;
  browser: Window;
  isPublic: boolean;
}

const NO_CACHE: CacheProfile = {
  edge: { fresh: 0, swr: 0, sie: 0 },
  browser: { fresh: 0, swr: 0, sie: 0 },
  isPublic: false,
};

const PROFILES: Record<CacheProfileName, CacheProfile> = {
  static: {
    edge: { fresh: 900, swr: 7200, sie: 21600 },
    browser: { fresh: 120, swr: 1800, sie: 7200 },
    isPublic: true,
  },
  product: {
    edge: { fresh: 300, swr: 1800, sie: 7200 },
    browser: { fresh: 60, swr: 600, sie: 3600 },
    isPublic: true,
  },
  listing: {
    edge: { fresh: 120, swr: 900, sie: 3600 },
    browser: { fresh: 30, swr: 300, sie: 1800 },
    isPublic: true,
  },
  search: {
    edge: { fresh: 60, swr: 300, sie: 1800 },
    browser: { fresh: 0, swr: 120, sie: 600 },
    isPublic: true,
  },
  cart: NO_CACHE,
  private: NO_CACHE,
  none: NO_CACHE,
};

/** The response headers for a profile. */
export function cacheHeaders(profile: CacheProfileName): Record<string, string> {
  const p = PROFILES[profile];
  if (!p.isPublic || (p.edge.fresh === 0 && p.browser.fresh === 0)) {
    return { "Cache-Control": "private, no-cache, no-store, must-revalidate" };
  }
  const parts = ["public", p.browser.fresh > 0 ? `max-age=${p.browser.fresh}` : "max-age=0"];
  if (p.edge.fresh > 0) parts.push(`s-maxage=${p.edge.fresh}`);
  if (p.browser.swr > 0) parts.push(`stale-while-revalidate=${p.browser.swr}`);
  if (p.browser.sie > 0) parts.push(`stale-if-error=${p.browser.sie}`);
  return { "Cache-Control": parts.join(", "), Vary: "Accept-Encoding" };
}

const PRIVATE_PREFIX_RE = /^\/(cart|checkout|account|login|my-account)(\/|$)/;

/** The profile of a page URL (a path with an optional query string, or a URL). */
export function detectCacheProfile(pathnameOrUrl: string | URL): CacheProfileName {
  const url =
    typeof pathnameOrUrl === "string" ? new URL(pathnameOrUrl, "http://localhost") : pathnameOrUrl;
  const p = url.pathname;
  if (PRIVATE_PREFIX_RE.test(p)) return "private";
  if (p.startsWith("/api/") || p.startsWith("/deco/") || p.startsWith("/_build")) return "none";
  if (p === "/s" || p.startsWith("/s/") || url.searchParams.has("q")) return "search";
  if (p.endsWith("/p")) return "product";
  if (p === "/" || p === "") return "static";
  return "listing";
}
