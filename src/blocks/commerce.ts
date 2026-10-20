/**
 * The Shopify product page blocks. The apps ship no loaders
 * (/next/renames-and-migrations#loaders-actions-and-invoke), so these are the site's own functions
 * over its Shopify loaders (src/vendor/shopify) and the upstream client.
 */
import productListingPageLoader, {
  type Props as ProductListingPageProps,
} from "../vendor/shopify/loaders/ProductListingPage";
import productDetailsPageLoader, {
  type Props as ProductDetailsPageProps,
} from "../vendor/shopify/loaders/ProductDetailsPage";
import { pageState } from "../request-state.server";
import { withDecoMetafields } from "../sdk/capyProduct";

/**
 * Shopify's product listing page reads filters, sort and pagination from the page URL, which a block
 * function doesn't get as an argument: it reads it from the page being rendered.
 */
export const shopifyProductListingPage = (props: ProductListingPageProps) => {
  const { url, params } = pageState();
  return productListingPageLoader(
    {
      ...props,
      // `/collections/:handle` names the collection in a route param (the loader would read the
      // first path segment, "collections").
      collectionName: props.collectionName || params.handle,
      metafields: withDecoMetafields(props.metafields),
    },
    url,
  );
};

/**
 * Shopify's product details page. The slug comes from the route param of the page being rendered
 * (`/products/:slug`), unless one is saved.
 */
export const shopifyProductDetailsPage = (
  props: Omit<ProductDetailsPageProps, "slug"> & { slug?: string },
) =>
  productDetailsPageLoader({
    ...props,
    slug: props.slug ?? pageState().params.slug ?? "",
    metafields: withDecoMetafields(props.metafields),
  });
