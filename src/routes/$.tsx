import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
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
 * Sections that render whatever entity a *dynamic* CMS page path points at,
 * mapped to a predicate answering "is there really something behind this URL?".
 *
 * The `Category Page` block has `path: "/*"`, so it matches every unclaimed
 * URL — a bogus path still resolves to a page, just one whose
 * ProductListingPage lists no products. The `Product Page` block
 * (`/products/:slug`) behaves the same for an unknown slug. Without the
 * emptiness check below, those URLs answer 200 with "no results" copy: a
 * soft-404 that crawlers index as a real page.
 */
const ENTITY_SECTIONS: Record<string, (entity: any) => boolean> = {
  "site/sections/Product/SearchResult.tsx": (page) => !!page?.products?.length,
  "site/sections/Product/ProductDetails.tsx": (page) => page?.product != null,
};

/** CMS page paths that match by pattern (`/*`, `/products/:slug`). */
function isDynamicPagePath(path: unknown): boolean {
  return typeof path === "string" && /[*:]/.test(path);
}

/** Depth-first search for the first section registered in ENTITY_SECTIONS. */
function findEntitySection(
  value: unknown,
  blocks: Record<string, unknown>,
  depth = 0,
): { entity: unknown; hasEntity: (entity: any) => boolean } | null {
  if (depth > 10 || !value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEntitySection(item, blocks, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const obj = value as Record<string, unknown>;
  const resolveType = obj.__resolveType as string | undefined;

  const hasEntity = resolveType ? ENTITY_SECTIONS[resolveType] : undefined;
  if (hasEntity) return obj.page ? { entity: obj.page, hasEntity } : null;

  // Named block reference (e.g. "Header") — follow it.
  if (resolveType && blocks[resolveType]) {
    const found = findEntitySection(blocks[resolveType], blocks, depth + 1);
    if (found) return found;
  }

  for (const key of Object.keys(obj)) {
    if (key === "__resolveType") continue;
    const found = findEntitySection(obj[key], blocks, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve the entity behind a dynamically-matched URL server-side and report
 * whether it exists.
 *
 * Needed because on a regular SSR request the entity section is *deferred*, so
 * the loader data carries no product data to inspect — the section only
 * resolves later, over a separate request, once it scrolls into view. Checking
 * here keeps the 404 independent of User-Agent/bot detection: a plain `curl`
 * and Googlebot get the same status.
 *
 * The entity is resolved from `path` only — search params are dropped on
 * purpose, so a real collection filtered down to zero products
 * (`/shirts?filter…`) still answers 200.
 */
const pageEntityExists = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => data as { path: string; origin: string })
  .handler(async ({ data: { path, origin } }) => {
    const { findPageByPath, loadBlocks, resolveValue } = await import("@decocms/blocks/cms");

    const match = findPageByPath(path);
    if (!match) return false;

    // Walk the raw CMS section tree (sections are wrapped in Lazy/flag blocks)
    // for an entity section, and resolve its entity prop.
    const found = findEntitySection(match.page.sections, loadBlocks());
    if (!found) return true;

    const entity = await resolveValue(found.entity, match.params, {
      url: new URL(path, origin).href,
      path,
    });
    return found.hasEntity(entity);
  });

export const Route = createFileRoute("/$")({
  ...routeConfig,
  // cmsRouteConfig's loader returns `null` when no CMS page block matches the
  // URL, and a page with an empty entity when a *dynamic* block (`/*`,
  // `/products/:slug`) matched a URL with nothing behind it. Both answered 200
  // (soft-404), which misleads crawlers and users. Throwing `notFound()` makes
  // TanStack Router set `router.state.statusCode = 404`, which
  // `renderRouterToString` uses as the actual Response status.
  loader: async (opts: Parameters<typeof routeConfig.loader>[0]) => {
    const page = (await routeConfig.loader(opts)) as Record<string, any> | null;
    if (!page) throw notFound();

    if (isDynamicPagePath(page.path)) {
      // Eagerly-resolved entity section (bots, SPA navigation): inspect the
      // loader data directly instead of paying for a second resolve.
      const eager = (page.resolvedSections ?? []).find(
        (section: { component: string }) => ENTITY_SECTIONS[section.component],
      );
      const exists = eager
        ? ENTITY_SECTIONS[eager.component](eager.props?.page)
        : await pageEntityExists({
            data: { path: page.pagePath, origin: new URL(page.pageUrl).origin },
          });
      if (!exists) throw notFound();
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
