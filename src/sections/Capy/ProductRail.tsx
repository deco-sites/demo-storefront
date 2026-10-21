/** ProductRail (capybara redesign): a horizontal rail of product cards with a scroll-driven progress line. */
import { useRef } from "react";
import type { Product } from "~/vendor/commerce/types";
import { type CardProduct, toCards } from "~/sdk/capyProduct";
import { Ico } from "~/components/capy/Icons";
import ProductCard from "~/components/capy/ProductCard";
import type { Cta } from "~/components/capy/types";

export interface Props {
  /** @title Title */
  title: string;
  /** @title Products */
  products: Product[] | null;
  /**
   * @title Order
   * @description Product handles to show first, in this order. The rest follow.
   */
  order?: string[];
  /** @title Link */
  link?: Cta;
}

export const loader = (props: Props) => ({
  ...props,
  products: toCards(props.products, props.order),
});

type ViewProps = Omit<Props, "products"> & { products: CardProduct[] };

export default function ProductRail({ title, products = [], link }: ViewProps) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.6, behavior: "smooth" });
  if (!products.length) return null;
  return (
    <div className="rail-sec" data-section="ProductRail">
      <div className="wrap sec-head rise">
        <h2 className="h2">{title}</h2>
        <div className="tools">
          {link && (
            <a className="ulink" href={link.href}>
              {link.label} <Ico name="arrow" />
            </a>
          )}
          <button
            type="button"
            className="circle-btn"
            aria-label="Previous"
            onClick={() => scroll(-1)}
          >
            <Ico name="left" />
          </button>
          <button type="button" className="circle-btn" aria-label="Next" onClick={() => scroll(1)}>
            <Ico name="arrow" />
          </button>
        </div>
      </div>
      <div className="rail" ref={rail}>
        {products.map((p) => (
          <ProductCard key={p.handle} product={p} />
        ))}
      </div>
      <div className="wrap">
        <div className="rail-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
