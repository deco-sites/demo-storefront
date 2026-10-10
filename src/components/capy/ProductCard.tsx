import type { CardProduct } from "~/sdk/capyProduct";
import { money, sized, srcSetOf } from "~/sdk/capyProduct";

const SIZES = "(max-width: 720px) 76vw, (max-width: 1080px) 40vw, 30vw";

/**
 * The shared product card: a 4:5 stage on the packshot's own backdrop, the packshot
 * bottom-anchored at the product's scale, a crossfade to the second colourway on hover, then name,
 * price, tagline and colour dots.
 */
export default function ProductCard({
  product,
  sizes = SIZES,
  eager = false,
}: {
  product: CardProduct;
  sizes?: string;
  eager?: boolean;
}) {
  const [first, second] = product.colors;
  const scale = { "--s": product.scale } as React.CSSProperties;
  return (
    <a className="pcard" href={product.url} data-product={product.handle}>
      <div className="stage" style={{ "--bg": first?.bg } as React.CSSProperties}>
        {product.badge && <span className="tag tag-new nbadge">{product.badge}</span>}
        {first?.image && (
          <img
            style={scale}
            src={sized(first.image, 800)}
            srcSet={srcSetOf(first.image)}
            sizes={sizes}
            width={1064}
            height={1064}
            alt={first.alt ?? `${product.title} in ${first.name}`}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        )}
        {second?.image && (
          <img
            className="alt"
            style={scale}
            src={sized(second.image, 800)}
            srcSet={srcSetOf(second.image)}
            sizes={sizes}
            width={1064}
            height={1064}
            alt={second.alt ?? `${product.title} in ${second.name}`}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
      <div className="meta">
        <span className="name">{product.title}</span>
        <span className="price">{money(product.price, product.currency)}</span>
        {product.tagline && <p className="line">{product.tagline}</p>}
        {product.colors.length > 0 && (
          <span className="dots" aria-label={`${product.colors.length} colours`}>
            {product.colors.map((c) => (
              <i key={c.name} style={{ background: c.swatch }} title={c.name} />
            ))}
          </span>
        )}
      </div>
    </a>
  );
}
