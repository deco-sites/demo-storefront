/**
 * ProductListing (capybara redesign): the sticky colour/size toolbar and the 4-column grid, with
 * a promo tile placed in it. Products come from the listing loader (a collection in the URL, or a
 * search on /s). Colour families and sizes filter the page in place and keep `?color=` and
 * `?size=` in the URL; Shopify's own filters for these options aren't configured on the store, so
 * the families map variant colour names here.
 */
import { useEffect, useMemo, useState } from "react";
import type { ProductListingPage } from "~/vendor/commerce/types";
import { type CardProduct, toCards } from "~/sdk/capyProduct";
import { Ico, Motif } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import ProductCard from "~/components/capy/ProductCard";
import { Tag } from "~/components/capy/Tag";
import type { CapyImage, Cta } from "~/components/capy/types";
import type { Color } from "~/types/widgets";

export interface ColorFamily {
  /** @title Name */
  name: string;
  /**
   * @title Swatch
   * @format color
   */
  swatch: Color;
  /**
   * @title Variant colours
   * @description Variant colour names that belong to this family (e.g. Lime, Lime/Green).
   */
  matches: string[];
}

export interface Promo {
  /**
   * @title Position
   * @description The grid slot the tile starts at (1 = first).
   */
  position?: number;
  /** @title Image */
  image: CapyImage;
  /**
   * @title Backdrop colour
   * @format color
   */
  background?: Color;
  /** @title Collection tag */
  collection?: "sol" | "rio" | "onsen";
  /** @title Show the petal motif */
  petal?: boolean;
  /** @title Title */
  title: string;
  /** @title Body */
  body?: string;
  /** @title Link */
  link?: Cta;
}

export interface Props {
  /** @title Products */
  page: ProductListingPage | null;
  /** @title Colour families */
  colorFamilies?: ColorFamily[];
  /** @title Sizes */
  sizes?: string[];
  /** @title Promo tile */
  promo?: Promo | null;
  /** @title Empty result text */
  emptyText?: string;
  /** @title Empty result link */
  emptyLink?: Cta;
}

type Sort = "" | "price-asc" | "price-desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Runs on the server with a request for the page (src/blocks/section.ts). */
export function loader(props: Props, req?: Request) {
  const url = new URL(req?.url ?? "https://localhost/");
  const { page, ...rest } = props;
  return {
    ...rest,
    products: toCards(page?.products),
    nextPage: page?.pageInfo?.nextPage ?? null,
    initial: {
      color: url.searchParams.get("color") ?? "",
      size: url.searchParams.get("size") ?? "",
      sort: (url.searchParams.get("sort") ?? "") as Sort,
    },
  };
}

type ViewProps = Awaited<ReturnType<typeof loader>>;

const inFamily = (p: CardProduct, f: ColorFamily | undefined) =>
  !f || p.colors.some((c) => f.matches.some((m) => m.toLowerCase() === c.name.toLowerCase()));

const hasSize = (p: CardProduct, size: string) =>
  !size || p.sizes.some((s) => slug(s) === slug(size));

function PromoTile({ promo }: { promo: Promo }) {
  return (
    <a
      className="promo"
      href={promo.link?.href ?? "#"}
      data-section="PromoTile"
      style={{ "--bg": promo.background ?? "#f2e9dc" } as React.CSSProperties}
    >
      <Img image={promo.image} sizes="(max-width: 900px) 100vw, 50vw" width={1064} height={1064} />
      <div className="promo-copy">
        {(promo.collection || promo.petal) && (
          <p className="promo-tags">
            {promo.collection && <Tag collection={promo.collection} />}
            {promo.petal && <Motif name="petal" className="petal" />}
          </p>
        )}
        <h2 className="h2">{promo.title}</h2>
        {promo.body && <p className="body">{promo.body}</p>}
        {promo.link && (
          <span className="ulink">
            {promo.link.label} <Ico name="arrow" />
          </span>
        )}
      </div>
    </a>
  );
}

export default function ProductListing({
  products = [],
  colorFamilies = [],
  sizes = [],
  promo,
  emptyText = "Nothing here yet. The herd is resting.",
  emptyLink = { label: "Meet the herd", href: "/collections/the-herd" },
  nextPage,
  initial,
}: ViewProps) {
  const [color, setColor] = useState(initial?.color ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [sort, setSort] = useState<Sort>(initial?.sort ?? "");

  // Keep the filters in the URL, without a navigation (the page stays as it is).
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries({ color, size, sort })) {
      if (v) url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    }
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url);
  }, [color, size, sort]);

  const family = colorFamilies.find((f) => slug(f.name) === color);
  const shown = useMemo(() => {
    const list = products.filter((p) => inFamily(p, family) && hasSize(p, size));
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, family, size, sort]);

  const filtered = Boolean(color || size);
  const promoAt = promo ? Math.max(0, (promo.position ?? 5) - 1) : -1;
  const items: React.ReactNode[] = shown.map((p, i) => (
    <ProductCard key={p.handle} product={p} eager={i < 4} sizes="(max-width: 900px) 50vw, 25vw" />
  ));
  if (promo && !filtered && shown.length >= promoAt)
    items.splice(promoAt, 0, <PromoTile key="promo" promo={promo} />);

  return (
    <div className="listing" data-section="ProductListing">
      {products.length > 0 && (
        <div className="toolbar">
          <div className="wrap tb">
            {colorFamilies.length > 0 && (
              <div className="fgroup colors" role="group" aria-label="Color">
                <span className="flabel">Color</span>
                <div className="chips">
                  {colorFamilies.map((f) => {
                    const n = products.filter((p) => inFamily(p, f)).length;
                    if (!n) return null;
                    const on = slug(f.name) === color;
                    return (
                      <button
                        key={f.name}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => setColor(on ? "" : slug(f.name))}
                      >
                        <i style={{ background: f.swatch }} />
                        {f.name}
                        <span className="n">{n}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {sizes.length > 0 && (
              <div className="fgroup sizes" role="group" aria-label="Size">
                <span className="flabel">Size</span>
                <div className="chips">
                  {sizes.map((s) => {
                    const on = slug(s) === slug(size);
                    return (
                      <button
                        key={s}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => setSize(on ? "" : slug(s))}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="tb-right">
              <span className="count-line" aria-live="polite">
                {shown.length} {shown.length === 1 ? "piece" : "pieces"}
              </span>
              <label className="sort">
                <span aria-hidden="true">Sort: {SORTS.find((o) => o.value === sort)?.label}</span>
                <Ico name="down" />
                <select
                  aria-label="Sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                >
                  {SORTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
      <div className="wrap">
        {shown.length > 0 ? (
          <div className="grid4">{items}</div>
        ) : (
          <div className="listing-empty">
            <p className="h3">{filtered ? "No pieces in that combination." : emptyText}</p>
            {filtered ? (
              <button
                type="button"
                className="pill pill-line"
                onClick={() => {
                  setColor("");
                  setSize("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <a className="pill pill-line" href={emptyLink.href}>
                {emptyLink.label} <Ico name="arrow" />
              </a>
            )}
          </div>
        )}
        {nextPage && (
          <div className="listing-more">
            <a className="pill pill-line" href={nextPage}>
              More pieces <Ico name="arrow" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
