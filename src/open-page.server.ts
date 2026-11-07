/**
 * Finds the page for a URL and starts every block on it (/next/tanstack-start-descriptors#3-match-the-url-to-a-page).
 * Routing reads only the release index: the pages' paths (`routes()`), then the one redirects block.
 * The page's blocks start downloading with the redirects block, in one wave (`prefetch`), so a
 * redirect costs nothing extra and a page costs no extra round trip. Each block then resolves on its
 * own, so its promise streams to the browser when it's ready, and the page's SEO is awaited only
 * after every block has started.
 */
import { notFound, redirect } from "@tanstack/react-router";
import { type Block, type Client, matchRoute } from "@decocms/blocks";
import type { BlockDescriptor, PageSeo, StoredPage } from "./model";
import { withPage } from "./request-state.server";
import { detectDevice, deviceClass } from "./sdk/device";
import { type CacheProfileName, detectCacheProfile } from "./server/cache-profiles";

/** What the page loader reads content with: the request's client (`client` in src/cms.ts). */
export type PageClient = Pick<Client, "routes" | "prefetch" | "redirects" | "resolve">;

/** The section type saved, read before the block resolves, when the block is a section. */
function componentOf(stored: unknown): string | undefined {
  if (!stored || typeof stored !== "object") return undefined;
  return (stored as Block).__resolveType;
}

/** Opens the page at `href` for `request`, reading content with the client `clientFor` returns. */
export async function openPage(
  href: string,
  request: Request,
  clientFor: (request: Request) => Promise<PageClient>,
) {
  const url = new URL(href, request.url);
  // Blocks read the page URL (pageState().url) and its request: it must stay on this site's origin.
  if (url.origin !== new URL(request.url).origin) throw notFound();
  const c = await clientFor(request);

  // Pages only: the index holds every page's path, so routing fetches no page body.
  const [routes, routesError] = await c.routes();
  if (routesError) throw routesError;
  const match = matchRoute(url, { routes });
  // The page's blocks start downloading with the redirects block, in one wave.
  if (match.kind === "match") c.prefetch(match.entry.name);
  const [redirects, redirectsError] = await c.redirects();
  if (redirectsError) throw redirectsError;
  // A redirect wins over a page with the same path, as it did when both were matched together.
  const moved = matchRoute(url, { routes: [], redirects });
  if (moved.kind === "redirect") throw redirect({ href: moved.location, statusCode: moved.status });
  if (match.kind !== "match") throw notFound();

  // The saved page, its saved blocks expanded, nothing run.
  const [page, pageError] = await c.resolve<StoredPage>(match.entry.name, { run: false });
  if (pageError) throw pageError;
  // Folded to mobile or desktop here, at the source, as the page cache key folds it (src/cache-segment.ts):
  // the page data, useDevice() and the `device` rule can't tell a tablet from a phone, so they can't
  // disagree with the cached copy.
  const device = deviceClass(detectDevice(request.headers.get("user-agent") ?? ""));
  const state = {
    url,
    request: new Request(url, { headers: request.headers }),
    params: match.params,
    device,
  };

  return withPage(state, async () => {
    // Variants of the whole list are one multivariate block: it resolves to the chosen list and streams as one.
    const sections = Array.isArray(page.sections) ? page.sections : [page.sections];
    // Reading the saved blocks runs nothing: it only expands saved-block references.
    const stored = await Promise.all(sections.map((block) => c.resolve(block, { run: false })));
    const blocks = sections.map((block, index) => ({
      // Keyed by type and position, so a section that stays on the page keeps its state across
      // client-side navigations.
      key: `${componentOf(stored[index]?.[0]) ?? "block"}-${index}`,
      // The saved section type, so the page can tell the Header and Footer landmarks from content.
      component: componentOf(stored[index]?.[0]),
      value: c
        .resolve<BlockDescriptor | BlockDescriptor[] | undefined>(block)
        .then(([value, blockError]) => {
          if (blockError) console.error(blockError);
          return { value: value ?? undefined, failed: blockError !== null };
        }),
    }));

    // Every block has started before SEO is awaited.
    const [seo, seoError] = await c.resolve<PageSeo | undefined>(page.seo);
    if (seoError) throw seoError;

    const profile: CacheProfileName =
      url.pathname === "/" ? "static" : detectCacheProfile(url.pathname);
    return {
      name: page.name,
      seo: seo ?? undefined,
      // The page's absolute URL, query string included (the home's og:url fallback).
      url: url.href,
      device,
      profile,
      blocks,
    };
  });
}

export type OpenedPage = Awaited<ReturnType<typeof openPage>>;
