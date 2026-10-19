import type { Product } from "../vendor/commerce/types";
import { pageState } from "../request-state.server";
import { getShopifyClient } from "../vendor/shopify/client";
import { GetProduct } from "../vendor/shopify/utils/storefront/queries";
import { toProduct, type ProductShopify } from "../vendor/shopify/utils/transform";

export interface Props {
  /**
   * @title Product handle
   * @description The product's URL handle/slug (e.g. "high-top-canvas-shoes") — pins an exact product instead of relying on a search query.
   */
  handle: string;
}

/** Returns the pinned product as a single-item list, so it drops straight into any prop typed `Product[] | null`. */
export default async function productByHandleLoader({ handle }: Props): Promise<Product[] | null> {
  if (!handle) return null;

  const client = getShopifyClient();
  const data = await client.query<{ product?: ProductShopify }>(GetProduct, {
    handle,
    identifiers: [],
  });

  if (!data?.product) return null;

  // Product links are built on the URL of the page being rendered, as v7 built them on the request's.
  return [toProduct(data.product, data.product.variants.nodes[0], pageState().url)];
}
