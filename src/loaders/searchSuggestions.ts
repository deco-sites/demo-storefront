import type { Product } from "@decocms/apps-commerce/types";
import { RequestContext } from "@decocms/blocks/sdk/requestContext";
import productListLoader from "@decocms/apps-shopify/loaders/ProductList";

export interface Props {
  /** @description Term typed in the searchbar */
  query?: string;
  /** @description How many products to suggest */
  count?: number;
}

export interface SearchSuggestions {
  products: Product[];
}

/**
 * Product suggestions for the header search modal. Invoked from the client
 * (`invoke.site.loaders.searchSuggestions`) on every debounced keystroke, so it
 * stays intentionally small: a term in, a handful of products out.
 */
export default async function searchSuggestionsLoader({
  query,
  count = 4,
}: Props): Promise<SearchSuggestions> {
  const term = query?.trim();
  if (!term) return { products: [] };

  const req = RequestContext.current?.request;
  const url = req ? new URL(req.url) : undefined;

  const products = await productListLoader({ props: { query: term, count } }, url);

  return { products: products ?? [] };
}
