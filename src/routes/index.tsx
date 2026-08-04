import { createFileRoute } from "@tanstack/react-router";
import { cmsHomeRouteConfig, DecoPageRenderer, loadCmsPage } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";
import { preloadSectionComponents } from "@decocms/blocks/cms";

const isServer = typeof document === "undefined";

// Variant selection (?skuId=…) is client-side only — don't refetch the page.
const IGNORED_SEARCH_PARAMS = new Set(["skuId"]);

const SITE_NAME = "Storefront-tanstack";

// Fallbacks for the home page's social metadata, applied only when the CMS SEO
// config leaves the field empty. `buildHead()` in @decocms/tanstack already
// emits og:url/canonical from `seo.canonical`, og:image from `seo.image` and so
// on; whatever the CMS provides always wins (see homeHead below). These are
// scoped to the home route on purpose — a fixed URL must never leak into other
// routes' head.
const HOME_DESCRIPTION = "Build profitable websites with deco.cx";
const HOME_URL = "https://demo-storefront.decocms.com/";
const HOME_IMAGE =
  "https://decoims.com/storefront-tanstack/bfe00763-d6fa-40f0-9fa9-77e6769fe02d/1742560188441-74d13a55-4c18-4a5c-8cb4-dcaa27aae923.png";

const baseConfig = cmsHomeRouteConfig({
  defaultTitle: SITE_NAME,
  siteName: SITE_NAME,
  defaultDescription: HOME_DESCRIPTION,
  // Keep the previous route UI visible while the loader re-runs on filter/sort
  // navigation. Without this, framework defaults (pendingMs=200) flash the
  // pending UI and the page looks like a hard reload. The deferred SearchResult
  // section still shows its own skeleton via DeferredSectionWrapper.
  pendingMs: 60_000,
  pendingMinMs: 0,
});

type HeadTag = Record<string, string>;

/**
 * Framework head() for the home page, plus fallbacks for the Open Graph fields
 * the CMS SEO config currently leaves empty (og:url/canonical and og:image).
 * Any value coming from the CMS is kept untouched.
 */
function homeHead(ctx: Parameters<typeof baseConfig.head>[0]) {
  const head = baseConfig.head(ctx);
  const meta: HeadTag[] = [...head.meta];
  const links: HeadTag[] = [...head.links];
  const hasMeta = (key: "name" | "property", value: string) =>
    meta.some((tag) => tag[key] === value);

  if (!hasMeta("property", "og:site_name")) {
    meta.push({ property: "og:site_name", content: SITE_NAME });
  }
  if (!hasMeta("property", "og:url")) {
    meta.push({ property: "og:url", content: HOME_URL });
  }
  if (!links.some((link) => link.rel === "canonical")) {
    links.push({ rel: "canonical", href: HOME_URL });
  }
  if (!hasMeta("property", "og:image")) {
    meta.push({ property: "og:image", content: HOME_IMAGE });
    meta.push({ name: "twitter:image", content: HOME_IMAGE });
    // buildHead() picked "summary" because it saw no image — with one, the
    // large card is the right variant.
    const cardIndex = meta.findIndex((tag) => tag.name === "twitter:card");
    if (cardIndex >= 0) meta[cardIndex] = { name: "twitter:card", content: "summary_large_image" };
  }

  return { ...head, meta, links };
}

export const Route = createFileRoute("/")({
  ...baseConfig,
  head: homeHead,
  // Preserve query string so filter/sort/pagination changes reach the loader.
  // Without this, TanStack Router collapses the home route to "/" and skips
  // re-fetching when the user clicks a filter or changes sort order.
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
  loaderDeps: ({ search }: { search: Record<string, string> }) => {
    const filtered = Object.fromEntries(
      Object.entries(search ?? {}).filter(([k]) => !IGNORED_SEARCH_PARAMS.has(k)),
    );
    return {
      search: Object.keys(filtered).length ? filtered : undefined,
    };
  },
  loader: async ({ deps }) => {
    const searchStr = deps.search ? "?" + new URLSearchParams(deps.search).toString() : "";
    const fullPath = "/" + searchStr;
    // Forward the real page URL via header. On CSR for the home route,
    // the framework's `loadCmsPageInternal` falls back to the `_serverFn`
    // URL when basePath is "/", so commerce loaders see the wrong filters.
    // Our Shopify wrapper in setup.ts reads this header to recover the URL.
    const page = await loadCmsPage({
      data: fullPath,
      headers: { "x-deco-page-url": fullPath },
    });
    if (!page) return null;

    if (!isServer && page.resolvedSections) {
      const keys = page.resolvedSections.map((s: { component: string }) => s.component);
      await preloadSectionComponents(keys);
    }
    return page;
  },
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData() as Record<string, any> | null;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Storefront-tanstack</h1>
          <p className="text-sm text-base-content/40 mt-2">No CMS page found for /</p>
        </div>
      </div>
    );
  }

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
