import { createServerFn } from "@tanstack/react-start";
import { getShopifyClient } from "@decocms/apps-shopify";

const QUERIES = {
  collection: `query CollectionExists($handle: String!) { resource: collection(handle: $handle) { id } }`,
  product: `query ProductExists($handle: String!) { resource: product(handle: $handle) { id } }`,
};

/**
 * Whether a Shopify collection/product with this handle exists. Used by the
 * CMS catch-all route to answer a real 404 for URLs that match a wildcard page
 * block (`/*`, `/products/:slug`) but have nothing behind them.
 */
export const shopifyResourceExistsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { type: keyof typeof QUERIES; handle: string }) => input)
  .handler(async ({ data: { type, handle } }): Promise<boolean> => {
    const res = await getShopifyClient().query<{ resource?: { id: string } | null }>(
      QUERIES[type],
      { handle },
    );
    return Boolean(res.resource);
  });
