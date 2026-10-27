/**
 * The product data the capybara sections fetch for themselves. No saved block fetches products: a
 * section's own block function (.deco/index.ts) calls these with the settings saved on the section
 * and the page being rendered (/next/routing#the-example-project), which it reads from the request
 * state (/next/blocks#reading-the-request). Server-only, so it lives apart from the sections' views.
 *
 * The apps ship no loaders (/next/renames-and-migrations#loaders-actions-and-invoke): these are the
 * site's own functions over its Shopify code (src/vendor/shopify) and the upstream client. Every one
 * also asks for the `deco.*` metafields the design reads (src/sdk/capyProduct.ts).
 */
import type { Product, ProductDetailsPage, ProductListingPage } from "../vendor/commerce/types";
import productListLoader, {
  type Props as ProductListProps,
} from "../vendor/shopify/loaders/ProductList";
import productDetailsPageLoader from "../vendor/shopify/loaders/ProductDetailsPage";
import productListingPageLoader from "../vendor/shopify/loaders/ProductListingPage";
import { type PageState, pageState } from "../request-state.server";
import { withDecoMetafields } from "../sdk/capyProduct";
import type { ProductSelection } from "../components/capy/types";

/** The products a section's settings pick: a collection, or a search. Nothing when neither is set. */
export async function selectedProducts(
  selection: ProductSelection | undefined,
): Promise<Product[] | null> {
  if (!selection) return null;
  const { collection, query, count = 12, sort = "" } = selection;
  let props: ProductListProps["props"];
  if (collection) props = { collection, count, sort };
  // A search sorts by relevance or price only.
  else if (query)
    props = {
      query,
      count,
      sort: sort === "price-ascending" || sort === "price-descending" ? sort : "",
    };
  else return null;
  return productListLoader({ props, metafields: withDecoMetafields(undefined) });
}

// The product page's sections (details, lifestyle banner) share one fetch per page render.
const productPages = new WeakMap<PageState, Promise<ProductDetailsPage | null>>();

/** The product of the page being rendered (`/products/:slug`); nothing on a page without a slug. */
export function currentProductPage(): Promise<ProductDetailsPage | null> {
  const state = pageState();
  const slug = state.params.slug;
  if (!slug) return Promise.resolve(null);
  let page = productPages.get(state);
  if (!page) {
    page = productDetailsPageLoader({ slug, metafields: withDecoMetafields(undefined) });
    productPages.set(state, page);
  }
  return page;
}

/**
 * The listing of the page being rendered: the collection in the route (`/collections/:handle`), or
 * the search in `?q=` on `/s`, with the URL's filters, sort and page.
 */
export function currentListingPage(count = 12): Promise<ProductListingPage | null> {
  const { url, params } = pageState();
  return productListingPageLoader(
    { count, collectionName: params.handle, metafields: withDecoMetafields(undefined) },
    url,
  );
}
