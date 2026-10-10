/**
 * LifestyleBanner (capybara redesign): a full-bleed lifestyle photo with an ink caption in the
 * sky. On a product page it shows the product's own lifestyle shot (uploaded with the product in
 * Shopify) with its tagline; without one it falls back to the image saved here, or renders nothing.
 */
import type { ProductDetailsPage } from "~/vendor/commerce/types";
import { toPdp } from "~/sdk/capyProduct";
import Img from "~/components/capy/Img";
import type { CapyImage } from "~/components/capy/types";

export interface Props {
  /** @title Product (uses its lifestyle shot and tagline) */
  page?: ProductDetailsPage | null;
  /** @title Image (when the product has none) */
  image?: CapyImage;
  /**
   * @title Caption line
   * @description On a product page, {color} is replaced by the product's first colour.
   */
  meta?: string;
  /** @title Title (when the product has no tagline) */
  title?: string;
  /** @title Caption position */
  position?: "top-right" | "top-left";
}

export function loader(props: Props) {
  const { page, ...rest } = props;
  const pdp = page?.product ? toPdp(page.product) : null;
  const firstColor = pdp?.colors[0]?.name ?? "";
  const image: CapyImage | undefined = pdp?.lifestyle
    ? { src: pdp.lifestyle.src, alt: pdp.lifestyle.alt }
    : props.image;
  return {
    ...rest,
    image,
    meta: rest.meta?.replace("{color}", firstColor),
    title: pdp?.tagline ?? rest.title,
  };
}

type ViewProps = ReturnType<typeof loader>;

export default function LifestyleBanner({ image, meta, title, position = "top-right" }: ViewProps) {
  if (!image?.src) return null;
  return (
    <div className={`life life-${position}`} data-section="LifestyleBanner">
      <Img image={image} sizes="100vw" />
      {(meta || title) && (
        <div className="life-copy rise">
          {meta && <p className="cap-meta">{meta}</p>}
          {title && <h2 className="h3">{title}</h2>}
        </div>
      )}
    </div>
  );
}
