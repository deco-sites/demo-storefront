import { createFileRoute, notFound } from "@tanstack/react-router";
import { cmsRouteConfig, DecoPageRenderer } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";

const routeConfig = cmsRouteConfig({
  siteName: "Storefront-tanstack",
  defaultTitle: "Storefront-tanstack",
  ignoreSearchParams: ["skuId"],
  // Keep the previous route UI visible while the loader re-runs on filter/sort
  // navigation. Without this, framework defaults (pendingMs=200) flash the
  // pending UI. The SearchResult section refetches its own data via TanStack
  // Query (see useProductListingPage), so only the products grid swaps.
  pendingMs: 60_000,
  pendingMinMs: 0,
});

/**
 * A CMS page whose path is a pattern (`/*`, `/products/:slug`) is shared by
 * every URL that matches it — so "the page resolved" says nothing about the
 * URL existing. Static paths (`/women`, `/s`) always exist.
 */
function isPatternPath(path: unknown): boolean {
  return typeof path === "string" && /[*:]/.test(path);
}

/**
 * True when every commerce-backed section on the page came back empty — no
 * collection, no product. That's the soft-404 signal for pattern pages: the
 * PLP/PDP loader found nothing behind the URL.
 *
 * Sections that are still deferred carry no data here, so an inconclusive
 * page (no commerce section resolved) is treated as existing — we only ever
 * escalate to 404 on positive evidence of emptiness. Crawlers get eager
 * resolution (`isEagerRequest`), so the audience this matters for always has
 * the data at loader time; browsers may keep getting 200 while the PLP is
 * still deferred, and bot responses are cached under a separate key
 * (`__bot=1`), so the 404 is never served to a real visitor.
 */
function hasNoCommerceContent(sections: Array<Record<string, any>>): boolean {
  const withPageProp = sections.filter((s) => s?.props && "page" in s.props);
  if (!withPageProp.length) return false;

  return withPageProp.every(({ props }) => {
    const page = props.page;
    if (page == null) return true;
    // ProductListingPage — a collection that exists but lists nothing.
    if (Array.isArray(page.products)) return page.products.length === 0;
    // ProductDetailsPage — no product behind the slug.
    if ("product" in page) return page.product == null;
    return false;
  });
}

export const Route = createFileRoute("/$")({
  ...routeConfig,
  // Unknown URLs used to answer 200: either the CMS loader returned `null`
  // (no page block matches) or a catch-all page block matched and rendered
  // an empty PLP/PDP. Both are soft-404s, which make crawlers index phantom
  // pages. Throwing `notFound()` puts the match in the router's `notFound`
  // state, so `router.state.statusCode` — and the SSR response — is 404.
  loader: async (ctx: Parameters<typeof routeConfig.loader>[0]) => {
    const page = await routeConfig.loader(ctx);
    if (!page) throw notFound();

    if (isPatternPath(page.path) && hasNoCommerceContent(page.resolvedSections ?? [])) {
      throw notFound();
    }

    return page;
  },
  component: CmsPage,
  notFoundComponent: NotFoundPage,
});

function CmsPage() {
  const data = Route.useLoaderData() as Record<string, any> | null;
  if (!data) return <NotFoundPage />;

  return (
    <DecoPageRenderer
      sections={data.resolvedSections ?? []}
      deferredSections={data.deferredSections ?? []}
      deferredPromises={data.deferredPromises}
      pagePath={data.pagePath}
      pageUrl={data.pageUrl}
      loadDeferredSectionFn={deferredSectionLoader}
    />
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-base-content/20 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
        <p className="text-base-content/60 mb-6">No CMS page block matches this URL.</p>
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
      </div>
    </div>
  );
}
