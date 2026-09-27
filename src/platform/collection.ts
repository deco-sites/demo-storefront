import { createServerFn } from "@tanstack/react-start";
import { getShopifyClient } from "@decocms/apps-shopify/client";

/**
 * Checks whether a Shopify collection handle exists.
 *
 * The CMS "Category Page" block is configured with the catch-all path `/*`, so
 * ANY unmatched URL resolves to a page and renders an empty product listing
 * with HTTP 200 — a soft-404 that search engines happily index. The PLP loader
 * derives the collection handle from the first path segment
 * (`shopify/loaders/ProductListingPage.ts`), so asking Shopify whether that
 * handle exists is exactly the "is this a real category?" question.
 *
 * Fails OPEN (returns true) on any transport/config error: a Shopify hiccup
 * must never turn a legitimate category into a 404.
 */
export const collectionExistsServerFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async (ctx): Promise<boolean> => {
    const handle = ctx.data;
    if (!handle) return false;

    try {
      const data = await getShopifyClient().query<{
        collection?: { handle?: string } | null;
      }>(
        `query CollectionExists($handle: String!) {
          collection(handle: $handle) { handle }
        }`,
        { handle },
      );
      return Boolean(data?.collection);
    } catch {
      return true;
    }
  });
