import type { ImageWidget } from "~/types/widgets";

/** A link with a label: buttons and underlined links. */
export interface Cta {
  /** @title Label */
  label: string;
  /** @title Link */
  href: string;
}

/** An editable image. Files under /capy/img get their 2x copy automatically. */
export interface CapyImage {
  /**
   * @title Image
   * @format image-uri
   */
  src: ImageWidget;
  /** @title Alt text */
  alt: string;
  /**
   * @title Focal point
   * @description CSS object-position, e.g. "64% 50%".
   */
  position?: string;
  /**
   * @title Focal point on phones
   * @description CSS object-position on screens up to 720px wide.
   */
  positionMobile?: string;
}

/**
 * Which products a section shows: a collection, or a search when no collection is set. The
 * section's own block function fetches them from Shopify (src/loaders/capyProducts.ts).
 */
export interface ProductSelection {
  /**
   * @title Collection
   * @description The collection's handle, e.g. "the-herd".
   */
  collection?: string;
  /**
   * @title Search
   * @description A Shopify search query, used when no collection is set, e.g. "tag:capy-2026".
   */
  query?: string;
  /** @title How many to fetch */
  count?: number;
  /**
   * @title Sort
   * @description Empty keeps the store's own order. A search sorts by relevance or price only.
   */
  sort?:
    | ""
    | "price-descending"
    | "price-ascending"
    | "best-selling"
    | "title-descending"
    | "title-ascending"
    | "created-descending";
}
