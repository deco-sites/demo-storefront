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
