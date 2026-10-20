/**
 * The view registry (/next/rendering): the section each descriptor's `component` names. Keys are
 * the sections' v7 type names, which .deco/index.ts puts in every descriptor.
 */
import type { ComponentType } from "react";
import * as ProductShelf from "./sections/Product/ProductShelf";
import * as CapyHeader from "./sections/Capy/Header";
import * as CapyFooter from "./sections/Capy/Footer";
import * as CapyNewsletter from "./sections/Capy/Newsletter";
import * as CapyHeroScene from "./sections/Capy/HeroScene";
import * as CapyIntroStatement from "./sections/Capy/IntroStatement";
import * as CapyCollectionScene from "./sections/Capy/CollectionScene";
import * as CapyProductRail from "./sections/Capy/ProductRail";
import * as CapyManifesto from "./sections/Capy/Manifesto";
import * as CapySizingStory from "./sections/Capy/SizingStory";
import * as CapyJournalCards from "./sections/Capy/JournalCards";
import * as CapyCollectionHeader from "./sections/Capy/CollectionHeader";
import * as CapyProductListing from "./sections/Capy/ProductListing";
import * as CapyCollectionCards from "./sections/Capy/CollectionCards";
import * as CapyProductDetails from "./sections/Capy/ProductDetails";
import * as CapyLifestyleBanner from "./sections/Capy/LifestyleBanner";
import * as CapyProductShelf from "./sections/Capy/ProductShelf";

export interface SectionView {
  default: ComponentType<any>;
}

export const views: Record<string, SectionView> = {
  "site/sections/Product/ProductShelf.tsx": ProductShelf,
  "site/sections/Capy/Header.tsx": CapyHeader,
  "site/sections/Capy/Footer.tsx": CapyFooter,
  "site/sections/Capy/Newsletter.tsx": CapyNewsletter,
  "site/sections/Capy/HeroScene.tsx": CapyHeroScene,
  "site/sections/Capy/IntroStatement.tsx": CapyIntroStatement,
  "site/sections/Capy/CollectionScene.tsx": CapyCollectionScene,
  "site/sections/Capy/ProductRail.tsx": CapyProductRail,
  "site/sections/Capy/Manifesto.tsx": CapyManifesto,
  "site/sections/Capy/SizingStory.tsx": CapySizingStory,
  "site/sections/Capy/JournalCards.tsx": CapyJournalCards,
  "site/sections/Capy/CollectionHeader.tsx": CapyCollectionHeader,
  "site/sections/Capy/ProductListing.tsx": CapyProductListing,
  "site/sections/Capy/CollectionCards.tsx": CapyCollectionCards,
  "site/sections/Capy/ProductDetails.tsx": CapyProductDetails,
  "site/sections/Capy/LifestyleBanner.tsx": CapyLifestyleBanner,
  "site/sections/Capy/ProductShelf.tsx": CapyProductShelf,
};
