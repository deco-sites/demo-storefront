/** ProductShelf (capybara redesign): "Complete the look", four product cards in a row. */
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
   * @description Product handles to show first, in this order.
   */
  order?: string[];
  /** @title How many */
  count?: number;
  /** @title Link */
  link?: Cta;
}

/** Runs on the server with a request for the page (src/blocks/section.ts). */
export function loader(props: Props, req?: Request) {
  // On a product page, the product itself isn't offered with itself.
  const path = new URL(req?.url ?? "https://localhost/").pathname;
  const current = path.startsWith("/products/") ? path.slice("/products/".length) : undefined;
  const cards = toCards(props.products, props.order).filter(
    (c) => !current || !current.startsWith(c.handle),
  );
  return { ...props, products: cards.slice(0, props.count ?? 4) };
}

type ViewProps = Omit<Props, "products"> & { products: CardProduct[] };

export default function ProductShelf({ title, products = [], link }: ViewProps) {
  if (!products.length) return null;
  return (
    <div className="look" data-section="ProductShelf">
      <div className="wrap">
        <div className="sec-head rise">
          <h2 className="h2">{title}</h2>
          {link && (
            <div className="tools">
              <a className="ulink" href={link.href}>
                {link.label} <Ico name="arrow" />
              </a>
            </div>
          )}
        </div>
        <div className="grid4 shelf">
          {products.map((p) => (
            <ProductCard key={p.handle} product={p} sizes="(max-width: 900px) 64vw, 25vw" />
          ))}
        </div>
      </div>
    </div>
  );
}
