/**
 * The page's SEO block: the settings the site's head builder (src/head.ts) turns into the page's
 * `<head>` tags.
 */
import type { PageSeo } from "../model";

export interface SeoProps {
  /** @title Title */
  title?: string;
  /** @title Description */
  description?: string;
  /** @title Canonical URL */
  canonical?: string;
  /**
   * @title Favicon
   * @format image-uri
   */
  favicon?: string;
  /** @title No Indexing */
  noIndexing?: boolean;
  /** @title Title Template */
  titleTemplate?: string;
  /** @title Description Template */
  descriptionTemplate?: string;
  /** @title Page Type */
  type?: string;
  /**
   * @title OG Image
   * @format image-uri
   */
  image?: string;
  /**
   * @title Theme Color
   * @format color
   */
  themeColor?: string;
  /** @title JSON-LD Structured Data */
  jsonLDs?: Record<string, unknown>[];
}

export const seo = (props: SeoProps): PageSeo => props;
