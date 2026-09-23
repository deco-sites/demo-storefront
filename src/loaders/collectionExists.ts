import { createServerFn } from "@tanstack/react-start";
import { getShopifyClient } from "@decocms/apps-shopify";

const CollectionExists = `query CollectionExists($handle: String!) {
  collection(handle: $handle) { id }
}`;

/**
 * Whether a Shopify collection with this handle exists. Used by the CMS
 * catch-all route to 404 URLs that only match the `/*` Category Page block.
 */
export const collectionExistsServerFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }): Promise<boolean> => {
    const res = await getShopifyClient().query<{ collection?: { id: string } | null }>(
      CollectionExists,
      { handle },
    );
    return Boolean(res.collection);
  });
