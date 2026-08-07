import type { Product } from "@decocms/apps-commerce/types";
import { clx } from "~/sdk/clx";
import ProductCard from "../product/card/ProductCard";

export interface Props {
  products: Product[];
  /** Index offset of the first product in the slice (used for analytics) */
  offset?: number;
  /** Router preload strategy passed to each card's product link. */
  prefetch?: "intent" | false;
  /**
   * Heading level of each card title. Defaults to 2 because the result set is
   * the first content under the page h1 on search/category pages.
   * @default 2
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export default function SearchResultGrid({
  products,
  offset = 0,
  prefetch = "intent",
  headingLevel = 2,
}: Props) {
  return (
    <div
      data-product-list
      className={clx(
        "grid w-full",
        "grid-cols-2 gap-3",
        "sm:grid-cols-3",
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={`product-card-${product.productID}`}
          product={product}
          preload={index === 0}
          prefetch={prefetch}
          index={offset + index}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
