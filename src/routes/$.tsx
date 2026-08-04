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

type ResolvedSectionLike = { component: string; props?: Record<string, unknown> };

/**
 * Sections that render whatever entity a dynamic URL points at, mapped to a
 * predicate that answers "is there really something here?". A URL with no
 * product / no collection behind it renders "not found" copy, and without this
 * check the document still answers 200 — a soft-404 that search engines index
 * as a valid page.
 */
const ENTITY_SECTIONS: Record<string, (props: Record<string, unknown>) => boolean> = {
  // The `/*` catch-all resolves the collection from the URL. A missing
  // collection still yields a ProductListingPage, but an empty one (no
  // products, no `pageInfo.records`) — so emptiness is the only signal.
  "site/sections/Product/SearchResult.tsx": (props) => {
    const page = props.page as { products?: unknown[] } | null | undefined;
    return !!page?.products?.length;
  },
  // PDP: the loader returns null (or a page without a product) for a slug that
  // does not resolve to a product.
  "site/sections/Product/ProductDetails.tsx": (props) => {
    const page = props.page as { product?: unknown } | null | undefined;
    return page?.product != null;
  },
};

/**
 * True when the CMS matched this URL through a dynamic page block (the `/*`
 * catch-all Category Page, or `/products/:slug`) but there is no entity behind
 * it. Pages matched by a literal path (`/`, `/s`, landing pages) always exist
 * and are never probed.
 *
 * Sections resolve eagerly for crawlers (`isEagerRequest` in @decocms/blocks),
 * so `resolvedSections` carries the entity on exactly the requests whose status
 * code decides what gets indexed. Browser requests defer these sections and
 * fall through as before, rendering the section's own empty state.
 */
function isSoftNotFound(data: unknown): boolean {
  const { path = "", resolvedSections = [] } = (data ?? {}) as {
    path?: string;
    resolvedSections?: ResolvedSectionLike[];
  };
  if (!path.includes("*") && !path.includes(":")) return false;

  return resolvedSections.some((section) => {
    const hasEntity = ENTITY_SECTIONS[section.component];
    return hasEntity !== undefined && !hasEntity(section.props ?? {});
  });
}

export const Route = createFileRoute("/$")({
  ...routeConfig,
  // Wrap the CMS loader so URLs with nothing behind them answer 404 instead of
  // a soft-404 (200 + "not found" body). Throwing notFound() makes TanStack
  // Start set the 404 status on the SSR response and render notFoundComponent
  // below, so search engines stop indexing missing pages as valid.
  loader: async (ctx) => {
    const data = await routeConfig.loader?.(ctx);
    if (!data || isSoftNotFound(data)) throw notFound();
    return data;
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
