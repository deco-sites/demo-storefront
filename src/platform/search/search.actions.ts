import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import productListLoader from "@decocms/apps-shopify/loaders/ProductList";

const SUGGESTION_COUNT = 4;

export interface SearchSuggestionProduct {
  id: string;
  url: string;
  title: string;
  image?: string;
  price?: number;
  listPrice?: number;
  currencyCode?: string;
}

/**
 * Live search suggestions for the header searchbar. Queries the platform for
 * the top few products matching the typed term — enough to preview results
 * before the shopper commits to the full /s page.
 *
 * Only the handful of fields the suggestion rows render are returned (rather
 * than the whole commerce `Product`), keeping the per-keystroke payload small.
 */
export const searchSuggestionsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => input)
  .handler(async (ctx) => {
    const query = ctx.data.query?.trim();
    const empty: SearchSuggestionProduct[] = [];
    if (!query) return { products: empty };

    const url = new URL(getRequest().url);
    const products = await productListLoader({ props: { query, count: SUGGESTION_COUNT } }, url);

    const suggestions: SearchSuggestionProduct[] = (products ?? []).map((product) => {
      const { price, listPrice } = useOffer(product.offers);
      return {
        id: product.productID,
        url: product.url ?? "/",
        title: product.isVariantOf?.name ?? product.name ?? "",
        image: product.image?.[0]?.url,
        price,
        listPrice,
        currencyCode: product.offers?.priceCurrency,
      };
    });

    return { products: suggestions };
  });
