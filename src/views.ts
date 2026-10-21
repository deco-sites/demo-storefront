/**
 * The view registry (/next/rendering): the section each descriptor's `component` names. Keys are
 * the sections' block types (.deco/index.ts).
 */
import type { ComponentType } from "react";
import * as ClassicProductShelf from "./sections/Product/ProductShelf";
import * as CollectionCards from "./sections/Capy/CollectionCards";
import * as CollectionHeader from "./sections/Capy/CollectionHeader";
import * as CollectionScene from "./sections/Capy/CollectionScene";
import * as Footer from "./sections/Capy/Footer";
import * as Header from "./sections/Capy/Header";
import * as HeroScene from "./sections/Capy/HeroScene";
import * as IntroStatement from "./sections/Capy/IntroStatement";
import * as JournalCards from "./sections/Capy/JournalCards";
import * as LifestyleBanner from "./sections/Capy/LifestyleBanner";
import * as Manifesto from "./sections/Capy/Manifesto";
import * as Newsletter from "./sections/Capy/Newsletter";
import * as ProductDetails from "./sections/Capy/ProductDetails";
import * as ProductListing from "./sections/Capy/ProductListing";
import * as ProductRail from "./sections/Capy/ProductRail";
import * as ProductShelf from "./sections/Capy/ProductShelf";
import * as SizingStory from "./sections/Capy/SizingStory";

export interface SectionView {
  default: ComponentType<any>;
  /** The landmark the section renders, so the page keeps it out of `<main>` (src/runtime/PageView.tsx). */
  landmark?: "header" | "footer";
}

export const views: Record<string, SectionView> = {
  "site-header": { ...Header, landmark: "header" },
  "site-footer": { ...Footer, landmark: "footer" },
  newsletter: Newsletter,
  "hero-scene": HeroScene,
  "intro-statement": IntroStatement,
  "collection-scene": CollectionScene,
  "product-rail": ProductRail,
  manifesto: Manifesto,
  "sizing-story": SizingStory,
  "journal-cards": JournalCards,
  "collection-header": CollectionHeader,
  "product-listing": ProductListing,
  "collection-cards": CollectionCards,
  "product-details": ProductDetails,
  "lifestyle-banner": LifestyleBanner,
  "product-shelf": ProductShelf,
  "classic-product-shelf": ClassicProductShelf,
};
