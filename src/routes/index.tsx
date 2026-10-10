import { createFileRoute } from "@tanstack/react-router";
import { loadPageAt, PageContent, pageHead, pageHeaders, pageRouteOptions } from "../page-route";

export const Route = createFileRoute("/")({
  ...pageRouteOptions,
  gcTime: 1_800_000,
  loader: ({ deps }) => loadPageAt("/", deps.search),
  // The home page always emits an `og:url` tag. The head builder only adds it when the page's SEO
  // block sets an explicit canonical URL, so pages without one (like the home, by default) would
  // lose the social preview when shared: fall back to the page's absolute URL.
  head: ({ loaderData }) => {
    const head = pageHead(loaderData);
    const hasOgUrl = head.meta.some((tag) => tag.property === "og:url");
    const pageUrl = loaderData?.url;
    return {
      ...head,
      meta:
        hasOgUrl || !pageUrl ? head.meta : [...head.meta, { property: "og:url", content: pageUrl }],
    };
  },
  headers: ({ loaderData }) => pageHeaders(loaderData),
  component: HomePage,
});

function HomePage() {
  return <PageContent page={Route.useLoaderData()} />;
}
