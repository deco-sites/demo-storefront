// The block map (/next/blocks#the-block-map). Started by the deco-v7-to-v8-migration skill's script from
// the v7 site and finished by hand. Each block is registered under the v7 name saved content stores, as it is
// (/next/renames-and-migrations#checklist-for-migrating-existing-content: "register them as they
// are"), and under no second name: the site editor lists every key of this map, so a short name
// next to each v7 name showed every section twice in its pickers, where v7's editor showed it once.
// Sections return descriptors (/next/rendering), which src/views.ts maps to components.
import type { Blocks, Route } from "@decocms/blocks";
import type { BlockDescriptor, PageSeo } from "../src/model";
import {
  detailsPageExtensions,
  listingPageExtensions,
  shopifyProductDetailsPage,
  shopifyProductListingPage,
} from "../src/blocks/commerce";
import { device } from "../src/blocks/matchers";
import { section } from "../src/blocks/section";
import { seo, seoDetailsPage, seoListingPage } from "../src/blocks/seo";
import { loader as capyHeaderLoader } from "../src/sections/Capy/Header";
import { loader as capyCollectionSceneLoader } from "../src/sections/Capy/CollectionScene";
import { loader as capyProductRailLoader } from "../src/sections/Capy/ProductRail";
import { loader as capyCollectionHeaderLoader } from "../src/loaders/capyCollectionHeader";
import { loader as capyProductListingLoader } from "../src/sections/Capy/ProductListing";
import { loader as capyProductDetailsLoader } from "../src/sections/Capy/ProductDetails";
import { loader as capyLifestyleBannerLoader } from "../src/sections/Capy/LifestyleBanner";
import { loader as capyProductShelfLoader } from "../src/sections/Capy/ProductShelf";
import productByHandle from "../src/loaders/productByHandle";
import shopifyProductList, {
  type Props as ShopifyProductListProps,
} from "../src/vendor/shopify/loaders/ProductList";
import { withDecoMetafields } from "../src/sdk/capyProduct";
import shopifyRelatedProducts, {
  type Props as RelatedProductsProps,
} from "../src/vendor/shopify/loaders/RelatedProducts";

/** The site's page: the built-in fields, with SEO for the site's head builder and descriptor sections. */
interface StorePage extends Route {
  seo?: PageSeo;
  sections: BlockDescriptor[];
}

const productShelf = section<typeof import("../src/sections/Product/ProductShelf")>(
  "site/sections/Product/ProductShelf.tsx",
);

// The capybara redesign (src/sections/Capy): every block of the new home, collection and product pages.
const capyHeader = section<typeof import("../src/sections/Capy/Header")>(
  "site/sections/Capy/Header.tsx",
  capyHeaderLoader,
);
const capyFooter = section<typeof import("../src/sections/Capy/Footer")>(
  "site/sections/Capy/Footer.tsx",
);
const capyNewsletter = section<typeof import("../src/sections/Capy/Newsletter")>(
  "site/sections/Capy/Newsletter.tsx",
);
const capyHeroScene = section<typeof import("../src/sections/Capy/HeroScene")>(
  "site/sections/Capy/HeroScene.tsx",
);
const capyIntroStatement = section<typeof import("../src/sections/Capy/IntroStatement")>(
  "site/sections/Capy/IntroStatement.tsx",
);
const capyCollectionScene = section<typeof import("../src/sections/Capy/CollectionScene")>(
  "site/sections/Capy/CollectionScene.tsx",
  capyCollectionSceneLoader,
);
const capyProductRail = section<typeof import("../src/sections/Capy/ProductRail")>(
  "site/sections/Capy/ProductRail.tsx",
  capyProductRailLoader,
);
const capyManifesto = section<typeof import("../src/sections/Capy/Manifesto")>(
  "site/sections/Capy/Manifesto.tsx",
);
const capySizingStory = section<typeof import("../src/sections/Capy/SizingStory")>(
  "site/sections/Capy/SizingStory.tsx",
);
const capyJournalCards = section<typeof import("../src/sections/Capy/JournalCards")>(
  "site/sections/Capy/JournalCards.tsx",
);
const capyCollectionHeader = section<typeof import("../src/loaders/capyCollectionHeader")>(
  "site/sections/Capy/CollectionHeader.tsx",
  capyCollectionHeaderLoader,
);
const capyProductListing = section<typeof import("../src/sections/Capy/ProductListing")>(
  "site/sections/Capy/ProductListing.tsx",
  capyProductListingLoader,
);
const capyCollectionCards = section<typeof import("../src/sections/Capy/CollectionCards")>(
  "site/sections/Capy/CollectionCards.tsx",
);
const capyProductDetails = section<typeof import("../src/sections/Capy/ProductDetails")>(
  "site/sections/Capy/ProductDetails.tsx",
  capyProductDetailsLoader,
);
const capyLifestyleBanner = section<typeof import("../src/sections/Capy/LifestyleBanner")>(
  "site/sections/Capy/LifestyleBanner.tsx",
  capyLifestyleBannerLoader,
);
const capyProductShelf = section<typeof import("../src/sections/Capy/ProductShelf")>(
  "site/sections/Capy/ProductShelf.tsx",
  capyProductShelfLoader,
);

export default {
  // The built-in page, replaced so its sections are descriptors and its seo is the site's
  // (/next/built-in-blocks#change-a-built-in). v7's website/pages/Page.tsx is a built-in alias.
  page: (input: StorePage) => input,

  // SEO
  "website/sections/Seo/SeoV2.tsx": seo,
  "commerce/sections/Seo/SeoPLPV2.tsx": seoListingPage,
  "commerce/sections/Seo/SeoPDPV2.tsx": seoDetailsPage,

  // Commerce data, over the Shopify upstream client
  // In v7's order, which is the order the editor lists them in a product picker.
  "site/loaders/productByHandle.ts": productByHandle,
  "shopify/loaders/ProductDetailsPage.ts": shopifyProductDetailsPage,
  // Every product loader also asks for the `deco.*` metafields the redesign reads (src/sdk/capyProduct.ts).
  "shopify/loaders/ProductList.ts": (props: ShopifyProductListProps) =>
    shopifyProductList({ ...props, metafields: withDecoMetafields(props.metafields) }),
  "shopify/loaders/ProductListingPage.ts": shopifyProductListingPage,
  "shopify/loaders/RelatedProducts.ts": (props: RelatedProductsProps) =>
    shopifyRelatedProducts(props),
  "commerce/loaders/product/extensions/listingPage.ts": listingPageExtensions,
  "commerce/loaders/product/extensions/detailsPage.ts": detailsPageExtensions,

  // Matchers
  "website/matchers/device.ts": device,

  // Sections
  "site/sections/Product/ProductShelf.tsx": productShelf,
  "site/sections/Capy/Header.tsx": capyHeader,
  "site/sections/Capy/Footer.tsx": capyFooter,
  "site/sections/Capy/Newsletter.tsx": capyNewsletter,
  "site/sections/Capy/HeroScene.tsx": capyHeroScene,
  "site/sections/Capy/IntroStatement.tsx": capyIntroStatement,
  "site/sections/Capy/CollectionScene.tsx": capyCollectionScene,
  "site/sections/Capy/ProductRail.tsx": capyProductRail,
  "site/sections/Capy/Manifesto.tsx": capyManifesto,
  "site/sections/Capy/SizingStory.tsx": capySizingStory,
  "site/sections/Capy/JournalCards.tsx": capyJournalCards,
  "site/sections/Capy/CollectionHeader.tsx": capyCollectionHeader,
  "site/sections/Capy/ProductListing.tsx": capyProductListing,
  "site/sections/Capy/CollectionCards.tsx": capyCollectionCards,
  "site/sections/Capy/ProductDetails.tsx": capyProductDetails,
  "site/sections/Capy/LifestyleBanner.tsx": capyLifestyleBanner,
  "site/sections/Capy/ProductShelf.tsx": capyProductShelf,
} satisfies Blocks;
