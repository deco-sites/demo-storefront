/**
 * CollectionScene (capybara redesign): one collection told as a scene. `photo` is a full-bleed
 * photo with the copy bottom-left, `photo-night` a dusk photo with the copy top-left, and
 * `products` puts three packshots on the collection's colour field (the Rio field).
 */
import type { Product } from "~/vendor/commerce/types";
import { type CardProduct, money, sized, srcSetOf, toCards } from "~/sdk/capyProduct";
import { Ico } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import { Tag } from "~/components/capy/Tag";
import type { CapyImage, Cta } from "~/components/capy/types";
import type { Color } from "~/types/widgets";

export interface Props {
  /** @title Layout */
  variant: "photo" | "photo-night" | "products";
  /** @title Collection */
  collection: "sol" | "rio" | "onsen";
  /**
   * @title Anchor
   * @description id for in-page links (e.g. "rio" for /#rio).
   */
  anchor?: string;
  /** @title Image (photo layouts) */
  image?: CapyImage;
  /** @title Headline */
  title: string;
  /** @title Body */
  body?: string;
  /** @title Button */
  primaryCta?: Cta;
  /** @title Link */
  link?: Cta;
  /** @title Photo credit line */
  credit?: string;
  /**
   * @title Products (products layout)
   * @description The first one is the lead.
   */
  products?: Product[] | null;
  /**
   * @title Order
   * @description Product handles to show first, in this order (the first is the lead).
   */
  order?: string[];
  /**
   * @title Colour per product
   * @description Colour names, in the order of the products (e.g. Pool Mint, Charcoal, Marigold).
   */
  colors?: string[];
  /**
   * @title Field colour
   * @format color
   */
  field?: Color;
}

export const loader = (props: Props) => ({
  ...props,
  products: toCards(props.products, props.order).slice(0, 3),
});

type ViewProps = Omit<Props, "products"> & { products?: CardProduct[] };

function FieldCard({
  product,
  color,
  className,
}: {
  product: CardProduct;
  color?: string;
  className: string;
}) {
  const c = product.colors.find((x) => x.name === color) ?? product.colors[0];
  const href =
    c && c !== product.colors[0]
      ? `${product.url}?color=${encodeURIComponent(c.name)}`
      : product.url;
  return (
    <a className={`rcard ${className}`} href={href} data-product={product.handle}>
      <span className="rstage">
        {c?.image && (
          <img
            src={sized(c.image, 1064)}
            srcSet={srcSetOf(c.image)}
            sizes="(max-width: 900px) 100vw, 50vw"
            width={1064}
            height={1064}
            alt={c.alt ?? `${product.title} in ${c.name}`}
            loading="lazy"
            decoding="async"
          />
        )}
      </span>
      <span className="rmeta">
        <span className="name">{product.title}</span>
        <span className="price">
          {money(product.price, product.currency)}
          {c ? ` · ${c.name}` : ""}
        </span>
      </span>
    </a>
  );
}

function Copy({ props, dark }: { props: ViewProps; dark: boolean }) {
  return (
    <>
      <Tag collection={props.collection} />
      <h2 className="display-xl">{props.title}</h2>
      {props.body && <p className="body">{props.body}</p>}
      {(props.primaryCta || props.link) && (
        <div className="ctas">
          {props.primaryCta && (
            <a className="pill pill-lime" href={props.primaryCta.href}>
              {props.primaryCta.label} <Ico name="arrow" />
            </a>
          )}
          {props.link && (
            <a className={`ulink${dark ? " on-dark" : ""}`} href={props.link.href}>
              {props.link.label} <Ico name="arrow" />
            </a>
          )}
        </div>
      )}
    </>
  );
}

export default function CollectionScene(props: ViewProps) {
  const { variant, collection, anchor, image, credit, products = [], colors = [], field } = props;
  const id = anchor || collection;

  if (variant === "products") {
    const [lead, ...rest] = products;
    return (
      <div
        className={`scene scene-field ${collection}`}
        id={id}
        data-section="CollectionScene"
        aria-label={props.title}
        style={field ? ({ "--field": field, background: field } as React.CSSProperties) : undefined}
      >
        <div className="wrap field-grid">
          <div className="field-lead">
            <div className="field-head rise">
              <Copy props={props} dark={false} />
            </div>
            {lead && <FieldCard product={lead} color={colors[0]} className="rc-big" />}
          </div>
          {rest.map((p, i) => (
            <FieldCard
              key={p.handle}
              product={p}
              color={colors[i + 1]}
              className={i === 0 ? "rc-a" : "rc-b"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`scene ${variant === "photo-night" ? "scene-night" : "scene-photo"}`}
      id={id}
      data-section="CollectionScene"
      aria-label={props.title}
    >
      <div className="scene-media">
        <Img image={image} sizes="100vw" />
      </div>
      <div className="wrap scene-copy rise">
        <Copy props={props} dark />
      </div>
      {credit && <p className="credit">{credit}</p>}
    </div>
  );
}
