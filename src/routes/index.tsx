import { createFileRoute } from "@tanstack/react-router";
import { cmsHomeRouteConfig, loadCmsPage } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";
import PageSections from "../components/ui/PageSections";
import { preloadSectionComponents } from "@decocms/blocks/cms";

const isServer = typeof document === "undefined";

// Variant selection (?skuId=…) is client-side only — don't refetch the page.
const IGNORED_SEARCH_PARAMS = new Set(["skuId"]);

const baseConfig = cmsHomeRouteConfig({
  defaultTitle: "Storefront-tanstack",
  siteName: "Storefront-tanstack",
  // Keep the previous route UI visible while the loader re-runs on filter/sort
  // navigation. Without this, framework defaults (pendingMs=200) flash the
  // pending UI and the page looks like a hard reload. The deferred SearchResult
  // section still shows its own skeleton via DeferredSectionWrapper.
  pendingMs: 60_000,
  pendingMinMs: 0,
});

const SITE_NAME = "Storefront-tanstack";
const SITE_URL = "https://demo-storefront.decocms.com";
// Same logo the Header renders (`.deco/blocks/Header.json`).
const SITE_LOGO = "https://decoims.com/decocms/e8c6326e-e009-4e3c-9787-b2fe25a1b993/deco-logo.png";

// Schema.org structured data for the home page. `sameAs` is intentionally
// omitted: every social link in `.deco/blocks/Footer.json` is still a "#"
// placeholder, and pointing search engines at fake profiles is worse than
// having none. TanStack Router serializes the object with `JSON.stringify`
// and HTML-escapes it into a `<script type="application/ld+json">` inside
// `<head>` (see `useTags` in @tanstack/react-router), so no manual escaping
// is needed here.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: SITE_LOGO,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      // Matches the real search form target (`/s?q=<term>`, see
      // src/components/search/Searchbar/Form.tsx).
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/s?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const Route = createFileRoute("/")({
  ...baseConfig,
  // Ensure the home page always emits an `og:url` tag. `cmsHomeRouteConfig`
  // only adds it when the CMS page's SEO block sets an explicit canonical
  // URL, so pages without one (like the home, by default) lose the social
  // preview when shared. Fall back to the resolved absolute page URL.
  head: (ctx: Parameters<typeof baseConfig.head>[0]) => {
    const head = baseConfig.head(ctx);
    const meta = head.meta ?? [];
    const pageUrl = (ctx.loaderData as { pageUrl?: string } | null | undefined)?.pageUrl;
    const hasOgUrl = meta.some((tag: Record<string, string>) => tag.property === "og:url");
    const withOgUrl =
      hasOgUrl || !pageUrl ? meta : [...meta, { property: "og:url", content: pageUrl }];
    return {
      ...head,
      // `script:ld+json` is TanStack Router's head API for structured data:
      // it emits a `<script type="application/ld+json">` in `<head>`.
      meta: [...withOgUrl, { "script:ld+json": HOME_JSON_LD } as unknown as Record<string, string>],
    };
  },
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
          <h1 className="text-4xl font-bold mb-4">Boas-vindas às capivaras da demo! 🌿</h1>
          <p className="text-sm text-base-content/40 mt-2">No CMS page found for /</p>
        </div>
      </div>
    );
  }

  return (
    <PageSections
      sections={data.resolvedSections ?? []}
      deferredSections={data.deferredSections ?? []}
      deferredPromises={data.deferredPromises}
      pagePath={data.pagePath}
      pageUrl={data.pageUrl}
      device={data.device}
      loadDeferredSectionFn={deferredSectionLoader}
    />
  );
}
