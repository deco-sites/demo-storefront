export const relative = (link?: string | undefined) => {
  const linkUrl = link ? new URL(link, "http://localhost") : undefined;
  const linkPath = linkUrl ? `${linkUrl.pathname}${linkUrl.search}` : undefined;
  return linkPath;
};

/**
 * Filter/sort/pagination URLs returned by commerce loaders sometimes carry the
 * wrong pathname/origin (e.g. Shopify's PLP loader falls back to
 * `https://localhost` when no page URL is forwarded). To stay safe across
 * platforms, keep the current page's pathname and only adopt the search
 * params built by the loader.
 */
export const rebaseSearch = (
  loaderHref: string | undefined,
  basePath: string | undefined,
): string | undefined => {
  if (!loaderHref) return undefined;
  try {
    const next = new URL(loaderHref, "http://localhost");
    // Fall back to the loader's path when the base is missing/invalid —
    // better than producing "/undefined" via `new URL(undefined, …)`.
    const base = basePath ? new URL(basePath, "http://localhost") : { pathname: next.pathname };
    return `${base.pathname}${next.search}`;
  } catch {
    return undefined;
  }
};

/**
 * Same as `rebaseSearch`, but returns `{ to, search }` so callers can pass
 * them as separate props to TanStack Router's `<Link>` / `useNavigate`.
 *
 * Critical: when you pass `to="/path?foo=bar"` to a strict-typed `<Link>`,
 * Router treats the entire string as a pathname literal and the `?...` is
 * NOT folded into the route's `search` deps — so `loaderDeps({ search })`
 * never sees the change and the loader doesn't re-run on client navigation
 * (only F5 works, since SSR re-parses the URL fresh).
 */
export const rebaseToSearch = (
  loaderHref: string | undefined,
  basePath: string | undefined,
): { to: string; search: Record<string, string> } | undefined => {
  const rebased = rebaseSearch(loaderHref, basePath);
  if (!rebased) return undefined;
  const url = new URL(rebased, "http://localhost");
  return {
    to: url.pathname,
    search: Object.fromEntries(url.searchParams),
  };
};

/** Canonical origin of the storefront, used to absolutize social/SEO URLs. */
export const SITE_ORIGIN = "https://demo-storefront.decocms.com";

/**
 * Resolves the value for the `og:url` meta tag.
 *
 * Facebook/Twitter/WhatsApp reject relative `og:url` values, so a path-only
 * `pageUrl` (which is what the CMS loader forwards on the home route) must be
 * absolutized against the site origin. Returns `undefined` only when the input
 * is unusable, so callers can decide on their own fallback.
 */
export const toAbsoluteOgUrl = (
  pageUrl: string | undefined | null,
  origin: string = SITE_ORIGIN,
): string | undefined => {
  const raw = pageUrl?.trim();
  if (!raw) return undefined;
  try {
    // Already absolute (http/https) → keep as-is; anything else is resolved
    // against the site origin.
    const url = new URL(raw, origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

/**
 * Picks the `og:url` value for a page, given the meta tags already produced by
 * the CMS SEO block. Precedence: an explicit canonical from the CMS, then the
 * page URL resolved by the loader, then the site home — always absolute.
 */
export const resolveOgUrl = (
  meta: readonly Record<string, string | undefined>[],
  pageUrl: string | undefined | null,
  origin: string = SITE_ORIGIN,
): string => {
  const cmsOgUrl = meta.find((tag) => tag.property === "og:url")?.content;
  return (
    toAbsoluteOgUrl(cmsOgUrl, origin) ??
    toAbsoluteOgUrl(pageUrl, origin) ??
    new URL("/", origin).href
  );
};
