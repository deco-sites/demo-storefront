import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { Product } from "@decocms/apps-commerce/types";
import productListLoader from "@decocms/apps-shopify/loaders/ProductList";

export interface SearchSuggestions {
  products: Product[];
}

const SUGGESTION_COUNT = 4;

/**
 * Live search suggestions for the header searchbar. Queries the platform for
 * the top few products matching the typed term — enough to preview results
 * before the shopper commits to the full /s page.
 */
export const searchSuggestionsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => input)
  .handler(async (ctx): Promise<SearchSuggestions> => {
    const query = ctx.data.query?.trim();
    if (!query) return { products: [] };

    const url = new URL(getRequest().url);
    const products = await productListLoader(
      { props: { query, count: SUGGESTION_COUNT } },
      url,
    );

    return { products: products ?? [] };
  });
