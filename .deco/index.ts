// The block map (/next/blocks#the-block-map): every block type saved content can name. Sections
// return descriptors (/next/rendering), which src/views.ts maps to components; a section with a
// loader runs it here, on the server, and the loader's result becomes the view's props. The saved
// props are the loader's input, so that's the type the editor form is generated from.
import type { Blocks } from "@decocms/blocks";
import type { BlockDescriptor } from "../src/model";
import { pageState } from "../src/request-state.server";
import { shopifyProductDetailsPage, shopifyProductListingPage } from "../src/blocks/commerce";
import { device } from "../src/blocks/matchers";
import { seo } from "../src/blocks/seo";
import type { Props as ClassicProductShelfProps } from "../src/sections/Product/ProductShelf";
import { loader as loadHeader, type Props as HeaderProps } from "../src/sections/Capy/Header";
import type { Props as FooterProps } from "../src/sections/Capy/Footer";
import type { Props as NewsletterProps } from "../src/sections/Capy/Newsletter";
import type { Props as HeroSceneProps } from "../src/sections/Capy/HeroScene";
import type { Props as IntroStatementProps } from "../src/sections/Capy/IntroStatement";
import {
  loader as loadCollectionScene,
  type Props as CollectionSceneProps,
} from "../src/sections/Capy/CollectionScene";
import {
  loader as loadProductRail,
  type Props as ProductRailProps,
} from "../src/sections/Capy/ProductRail";
import type { Props as ManifestoProps } from "../src/sections/Capy/Manifesto";
import type { Props as SizingStoryProps } from "../src/sections/Capy/SizingStory";
import type { Props as JournalCardsProps } from "../src/sections/Capy/JournalCards";
import type { Props as CollectionHeaderProps } from "../src/sections/Capy/CollectionHeader";
import { loader as loadCollectionHeader } from "../src/loaders/capyCollectionHeader";
import {
  loader as loadProductListing,
  type Props as ProductListingProps,
} from "../src/sections/Capy/ProductListing";
import type { Props as CollectionCardsProps } from "../src/sections/Capy/CollectionCards";
import {
  loader as loadProductDetails,
  type Props as ProductDetailsProps,
} from "../src/sections/Capy/ProductDetails";
import {
  loader as loadLifestyleBanner,
  type Props as LifestyleBannerProps,
} from "../src/sections/Capy/LifestyleBanner";
import {
  loader as loadProductShelf,
  type Props as ProductShelfProps,
} from "../src/sections/Capy/ProductShelf";
import productByHandle from "../src/loaders/productByHandle";
import shopifyProductList, {
  type Props as ShopifyProductListProps,
} from "../src/vendor/shopify/loaders/ProductList";
import { withDecoMetafields } from "../src/sdk/capyProduct";
import shopifyRelatedProducts, {
  type Props as RelatedProductsProps,
} from "../src/vendor/shopify/loaders/RelatedProducts";

/**
 * A section's descriptor: the view to render (its key in src/views.ts) and its props. Every section
 * block is async, so each one resolves on its own tick and streams in the same order.
 */
const view = (component: string, props: object): BlockDescriptor => ({
  component,
  props: props as BlockDescriptor["props"],
});

export default {
  // The page's SEO. The site editor finds a page's SEO type, and fills it into every new page, by
  // this name, so it keeps it until the site editor reads it from the page schema instead.
  "website/sections/Seo/SeoV2.tsx": seo,

  // Commerce data, over the Shopify upstream client, in the order the editor's product pickers list them.
  /** @title Product by Handle */
  "product-by-handle": productByHandle,
  /** @title Shopify Product Details Page */
  "shopify-product-details-page": shopifyProductDetailsPage,
  // Every product loader also asks for the `deco.*` metafields the design reads (src/sdk/capyProduct.ts).
  /** @title Shopify Product List */
  "shopify-product-list": (props: ShopifyProductListProps) =>
    shopifyProductList({ ...props, metafields: withDecoMetafields(props.metafields) }),
  /** @title Shopify Product Listing Page */
  "shopify-product-listing-page": shopifyProductListingPage,
  /** @title Shopify Related Products */
  "shopify-related-products": (props: RelatedProductsProps) => shopifyRelatedProducts(props),

  // Matchers
  /** @title Device */
  device,

  // Sections
  /** @title Header */
  "site-header": async (props: HeaderProps) => view("site-header", await loadHeader(props)),
  /** @title Footer */
  "site-footer": async (props: FooterProps) => view("site-footer", props),
  /** @title Newsletter */
  newsletter: async (props: NewsletterProps) => view("newsletter", props),
  /** @title Hero Scene */
  "hero-scene": async (props: HeroSceneProps) => view("hero-scene", props),
  /** @title Intro Statement */
  "intro-statement": async (props: IntroStatementProps) => view("intro-statement", props),
  /** @title Collection Scene */
  "collection-scene": async (props: CollectionSceneProps) =>
    view("collection-scene", await loadCollectionScene(props)),
  /** @title Product Rail */
  "product-rail": async (props: ProductRailProps) =>
    view("product-rail", await loadProductRail(props)),
  /** @title Manifesto */
  manifesto: async (props: ManifestoProps) => view("manifesto", props),
  /** @title Sizing Story */
  "sizing-story": async (props: SizingStoryProps) => view("sizing-story", props),
  /** @title Journal Cards */
  "journal-cards": async (props: JournalCardsProps) => view("journal-cards", props),
  /** @title Collection Header */
  "collection-header": async (props: CollectionHeaderProps) =>
    view("collection-header", await loadCollectionHeader(props)),
  /** @title Product Listing */
  "product-listing": async (props: ProductListingProps) =>
    view("product-listing", await loadProductListing(props, pageState().url)),
  /** @title Collection Cards */
  "collection-cards": async (props: CollectionCardsProps) => view("collection-cards", props),
  /** @title Product Details */
  "product-details": async (props: ProductDetailsProps) =>
    view("product-details", await loadProductDetails(props, pageState().url)),
  /** @title Lifestyle Banner */
  "lifestyle-banner": async (props: LifestyleBannerProps) =>
    view("lifestyle-banner", await loadLifestyleBanner(props)),
  /** @title Product Shelf */
  "product-shelf": async (props: ProductShelfProps) =>
    view("product-shelf", await loadProductShelf(props, pageState().url)),
  // The shelf of the design before the capybara one, which the offline page still shows.
  /** @title Classic Product Shelf */
  "classic-product-shelf": async (props: ClassicProductShelfProps) =>
    view("classic-product-shelf", props),
} satisfies Blocks;
