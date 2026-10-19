/**
 * ProductDetails (capybara redesign): the gallery (the colourway's packshot over two detail
 * crops of it), the buy column (name, tagline, price, description, facts, colour swatches, the
 * size control, add to bag) and the accordion. On phones a glass buy bar appears once the real
 * "Add to bag" has scrolled away. Product data comes from the Shopify product page loader and the
 * `deco.*` metafields; add to bag goes through the site's cart and opens the bag drawer.
 */
import { useEffect, useRef, useState } from "react";
import type { ProductDetailsPage } from "~/vendor/commerce/types";
import { mapProductToAnalyticsItem } from "~/vendor/commerce/utils/productToAnalyticsItem";
import { useAddToCart } from "~/platform/cart";
import { useSendEvent } from "~/sdk/useSendEvent";
import { money, sized, srcSetOf, toPdp } from "~/sdk/capyProduct";
import { Ico } from "~/components/capy/Icons";
import { openMinicart } from "~/components/capy/Minicart";
import type { Cta } from "~/components/capy/types";

export interface SizeInfo {
  /** @title Size name (as in Shopify) */
  name: string;
  /** @title Weight range */
  range: string;
  /**
   * @title Bar length
   * @description Relative width of the size bar: 1, 1.4, 1.8.
   */
  bar: number;
}

export interface AccordionItem {
  /** @title Title */
  title: string;
  /**
   * @title Text
   * @format textarea
   */
  body: string;
}

export interface Props {
  /** @title Product */
  page: ProductDetailsPage | null;
  /** @title Colour question */
  colorPrompt?: { question: string; hint?: string };
  /** @title Size question */
  sizePrompt?: { question: string; hint?: string };
  /** @title Sizes */
  sizes?: SizeInfo[];
  /** @title Size guide link */
  sizeGuide?: Cta;
  /**
   * @title Default size
   * @description Selected when the page opens.
   */
  defaultSize?: string;
  /**
   * @title Detail crops
   * @description Where the two detail crops zoom into the packshot (CSS transform-origin).
   */
  detailCrops?: { first: string; second: string };
  /** @title Delivery line */
  shippingNote?: string;
  /** @title Materials title (accordion, text from the product) */
  materialsTitle?: string;
  /** @title More accordion items */
  accordion?: AccordionItem[];
  /** @title Not found text */
  notFound?: { title: string; body?: string; link?: Cta };
}

/** Runs on the server with a request for the page (src/blocks/section.ts). */
export function loader(props: Props, req?: Request) {
  const { page, ...rest } = props;
  const product = page?.product;
  if (!product) return { ...rest, product: null, analytics: null, initialColor: "" };
  const pdp = toPdp(product);
  const asked = new URL(req?.url ?? "https://localhost/").searchParams.get("color") ?? "";
  const initialColor = pdp.colors.find((c) => c.name.toLowerCase() === asked.toLowerCase())?.name;
  const analytics = mapProductToAnalyticsItem({
    product,
    breadcrumbList: page.breadcrumbList,
    price: pdp.price,
  });
  return {
    ...rest,
    product: pdp,
    analytics,
    initialColor: initialColor ?? pdp.colors[0]?.name ?? "",
  };
}

type ViewProps = ReturnType<typeof loader>;

const DEFAULT_SIZES: SizeInfo[] = [
  { name: "Pup", range: "up to 25 kg", bar: 1 },
  { name: "Adult", range: "25–50 kg", bar: 1.4 },
  { name: "Big Boss", range: "50–70 kg", bar: 1.8 },
];

export default function ProductDetails({
  product,
  analytics,
  initialColor,
  colorPrompt = { question: "Color.", hint: "Pick your mood." },
  sizePrompt = { question: "Size.", hint: "Fits every capybara." },
  sizes = DEFAULT_SIZES,
  sizeGuide,
  defaultSize = "Adult",
  detailCrops = { first: "50% 40%", second: "50% 92%" },
  shippingNote,
  materialsTitle = "Materials & care",
  accordion = [],
  notFound = {
    title: "This piece has wandered off.",
    body: "It isn't in the herd any more. The rest of the herd is right here.",
    link: { label: "Meet the herd", href: "/collections/the-herd" },
  },
}: ViewProps) {
  const [colorName, setColor] = useState(initialColor);
  const color = product?.colors.find((c) => c.name === colorName) ?? product?.colors[0];
  const sizeNames = color?.sizes.map((s) => s.name) ?? [];
  const [sizeName, setSize] = useState(
    sizeNames.includes(defaultSize) ? defaultSize : (sizeNames[0] ?? ""),
  );
  const variant = color?.sizes.find((s) => s.name === sizeName) ?? color?.sizes[0];
  const variantId = variant?.variantId ?? color?.variantId;
  const canBuy = Boolean(variantId && (variant ? variant.available : true));

  const add = useAddToCart();
  const addRef = useRef<HTMLButtonElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const bottom = addRef.current?.getBoundingClientRect().bottom ?? 1;
      setShowBar(bottom < 0);
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const viewEvent = useSendEvent({
    on: "view",
    event: { name: "view_item", params: { items: analytics ? [analytics] : [] } },
  });
  const addEvent = useSendEvent({
    on: "click",
    event: {
      name: "add_to_cart",
      params: {
        items: analytics ? [{ ...analytics, item_variant: `${colorName} / ${sizeName}` }] : [],
      },
    },
  });

  if (!product) {
    return (
      <div className="pdp pdp-missing" data-section="ProductDetails">
        <div className="wrap">
          <h1 className="display-xl">{notFound.title}</h1>
          {notFound.body && <p className="body-l">{notFound.body}</p>}
          {notFound.link && (
            <a className="pill pill-lime" href={notFound.link.href}>
              {notFound.link.label} <Ico name="arrow" />
            </a>
          )}
        </div>
      </div>
    );
  }

  const price = money(product.price, product.currency);
  const addToBag = () => {
    if (!variantId) return;
    add.mutate({ merchandiseId: variantId, quantity: 1 }, { onSuccess: () => openMinicart() });
  };
  const label = add.isPending ? "Adding…" : canBuy ? `Add to bag · ${price}` : "Sold out";
  const crumbs = product.collection;

  return (
    <div className="pdp" data-section="ProductDetails" {...viewEvent}>
      <div className="wrap pdp-grid">
        <div className="pdp-gallery">
          <div className="g-main" style={{ "--bg": color?.bg } as React.CSSProperties}>
            {product.badge && <span className="tag tag-new nbadge">{product.badge}</span>}
            {product.colors.map((c, i) =>
              c.image ? (
                <img
                  key={c.name}
                  className={c.name === color?.name ? "on" : undefined}
                  src={sized(c.image, 1064)}
                  srcSet={srcSetOf(c.image, [640, 1064])}
                  sizes="(max-width: 900px) 100vw, 60vw"
                  width={1064}
                  height={1064}
                  alt={c.alt ?? `${product.title} in ${c.name}`}
                  {...(i === 0 || c.name === initialColor
                    ? { fetchPriority: "high" as const }
                    : { loading: "lazy" as const, decoding: "async" as const })}
                />
              ) : null,
            )}
          </div>
          <div className="g-pair">
            {[detailCrops.first, detailCrops.second].map((origin, n) => (
              <div
                className="g-det"
                key={origin + n}
                style={{ "--bg": color?.bg } as React.CSSProperties}
              >
                {product.colors.map((c) =>
                  c.image ? (
                    <img
                      key={c.name}
                      className={c.name === color?.name ? "on" : undefined}
                      style={{ transformOrigin: origin }}
                      src={sized(c.image, 1064)}
                      width={1064}
                      height={1064}
                      alt={`Detail of the ${product.title} in ${c.name}.`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="buy">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="/collections/the-herd">The Herd</a>
            {crumbs && (
              <>
                <span>/</span>
                <a href={`/collections/${crumbs.handle}`}>{crumbs.title}</a>
              </>
            )}
          </nav>
          <h1 className="h1">{product.title}</h1>
          {product.tagline && <p className="line">{product.tagline}</p>}
          <p className="price">{price}</p>
          {(product.descriptionHtml || product.facts.length > 0) && (
            <div className="about-p">
              {product.descriptionHtml && (
                <div
                  className="desc"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              )}
              {product.facts.length > 0 && (
                <ul className="facts">
                  {product.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {product.colors.length > 1 && (
            <div className="opt">
              <div className="opt-head">
                <p className="q">
                  {colorPrompt.question} {colorPrompt.hint && <span>{colorPrompt.hint}</span>}
                </p>
                <p className="val">
                  <b>{color?.name}</b>
                </p>
              </div>
              <div className="swatches" role="radiogroup" aria-label="Color">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={c.name === color?.name}
                    className={c.name === color?.name ? "on" : undefined}
                    style={{ background: c.swatch }}
                    data-name={c.name}
                    onClick={() => setColor(c.name)}
                  >
                    <span className="sr">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {sizeNames.length > 0 && (
            <div className="opt">
              <div className="opt-head">
                <p className="q">
                  {sizePrompt.question} {sizePrompt.hint && <span>{sizePrompt.hint}</span>}
                </p>
                {sizeGuide && (
                  <a className="ulink small" href={sizeGuide.href}>
                    {sizeGuide.label}
                  </a>
                )}
              </div>
              <div className="sizes-pick" role="radiogroup" aria-label="Size">
                {color?.sizes.map((s) => {
                  const info = sizes.find((x) => x.name === s.name);
                  const id = `size-${s.name.replace(/\W+/g, "-").toLowerCase()}`;
                  return (
                    <span key={s.name} style={{ display: "contents" }}>
                      <input
                        type="radio"
                        name="size"
                        id={id}
                        checked={s.name === sizeName}
                        onChange={() => setSize(s.name)}
                      />
                      <label htmlFor={id} className={s.available ? undefined : "out"}>
                        <span className="n">{s.name}</span>
                        <span className="k">{s.available ? (info?.range ?? "") : "Sold out"}</span>
                        <i
                          className="bar"
                          style={{ "--w": info?.bar ?? 1 } as React.CSSProperties}
                          aria-hidden="true"
                        />
                      </label>
                    </span>
                  );
                })}
              </div>
              {product.modelNote && <p className="model-note">{product.modelNote}</p>}
            </div>
          )}
          <button
            ref={addRef}
            type="button"
            className="pill pill-lime pill-block add"
            disabled={!canBuy || add.isPending}
            onClick={addToBag}
            {...addEvent}
          >
            {label}
          </button>
          {add.isError && <p className="ship">Something went wrong. Please try again.</p>}
          {shippingNote && (
            <p className="ship">
              <Ico name="truck" />
              {shippingNote}
            </p>
          )}
          <div className="acc">
            {product.materials && (
              <details>
                <summary>
                  {materialsTitle} <Ico name="plus" />
                </summary>
                <p>{product.materials}</p>
              </details>
            )}
            {accordion.map((a) => (
              <details key={a.title}>
                <summary>
                  {a.title} <Ico name="plus" />
                </summary>
                <p>{a.body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <div className={`mbar veil${showBar ? " show" : ""}`} data-part="StickyBuyBar">
        <p className="nm">
          {product.title}
          <span>
            {price} · {color?.name} · {sizeName}
          </span>
        </p>
        <button
          type="button"
          className="pill pill-lime"
          disabled={!canBuy || add.isPending}
          onClick={addToBag}
        >
          {add.isPending ? "Adding…" : "Add to bag"}
        </button>
      </div>
    </div>
  );
}
