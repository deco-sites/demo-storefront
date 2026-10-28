/**
 * Quick view: a glass dialog opened from a product card with the colourways' packshots, name,
 * price, a short description, the size control and add to bag, so a product can be bagged without
 * leaving the page. A native <dialog>: Esc closes it, and so does a click on the backdrop.
 */
import { useEffect, useRef, useState } from "react";
import { useAddToCart } from "~/platform/cart";
import { money, sized, srcSetOf, type QuickProduct } from "~/sdk/capyProduct";
import { Ico } from "./Icons";
import { openMinicart } from "./Minicart";

const SIZES = [
  { name: "Pup", range: "up to 25 kg", bar: 1 },
  { name: "Adult", range: "25–50 kg", bar: 1.4 },
  { name: "Big Boss", range: "50–70 kg", bar: 1.8 },
];

export default function QuickView({
  product,
  onClose,
}: {
  product: QuickProduct | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [colorName, setColor] = useState("");
  const [sizeName, setSize] = useState("");
  const add = useAddToCart();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product) {
      const first = product.colors[0];
      setColor(first?.name ?? "");
      const names = first?.sizes.map((s) => s.name) ?? [];
      setSize(names.includes("Adult") ? "Adult" : (names[0] ?? ""));
      add.reset();
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const color = product?.colors.find((c) => c.name === colorName) ?? product?.colors[0];
  const variant = color?.sizes.find((s) => s.name === sizeName) ?? color?.sizes[0];
  const variantId = variant?.variantId ?? color?.variantId;
  const canBuy = Boolean(variantId && (variant ? variant.available : true));
  const price = product ? money(product.price, product.currency) : "";
  const label = add.isPending ? "Adding…" : canBuy ? `Add to bag · ${price}` : "Sold out";

  const addToBag = () => {
    if (!variantId) return;
    add.mutate(
      { merchandiseId: variantId, quantity: 1 },
      {
        onSuccess: () => {
          onClose();
          openMinicart();
        },
      },
    );
  };

  return (
    <dialog
      ref={ref}
      className="qv veil"
      aria-label={product ? `Quick view: ${product.title}` : "Quick view"}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {product && (
        <div className="qv-grid">
          <div className="qv-gallery">
            <div className="stage" style={{ "--bg": color?.bg } as React.CSSProperties}>
              {product.badge && <span className="tag tag-new nbadge">{product.badge}</span>}
              {color?.image && (
                <img
                  style={{ "--s": product.scale } as React.CSSProperties}
                  src={sized(color.image, 800)}
                  srcSet={srcSetOf(color.image)}
                  sizes="(max-width: 720px) 90vw, 440px"
                  width={1064}
                  height={1064}
                  alt={color.alt ?? `${product.title} in ${color.name}`}
                />
              )}
            </div>
            {product.colors.length > 1 && (
              <div className="qv-thumbs" role="radiogroup" aria-label="Color">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={c.name === color?.name}
                    aria-label={c.name}
                    className={c.name === color?.name ? "on" : undefined}
                    style={{ "--bg": c.bg } as React.CSSProperties}
                    onClick={() => setColor(c.name)}
                  >
                    {c.image && <img src={sized(c.image, 240)} alt="" width={120} height={120} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="qv-buy">
            <button
              type="button"
              className="circle-btn qv-close"
              aria-label="Close"
              onClick={onClose}
            >
              <Ico name="close" />
            </button>
            <h2 className="qv-name">{product.title}</h2>
            <p className="qv-price">{price}</p>
            {product.summary && <p className="qv-summary">{product.summary}</p>}
            {color && color.sizes.length > 0 && (
              <div className="opt">
                <div className="opt-head">
                  <p className="q">
                    Size. <span>Fits every capybara.</span>
                  </p>
                  {product.colors.length > 1 && <p className="val">{color.name}</p>}
                </div>
                <div className="sizes-pick" role="radiogroup" aria-label="Size">
                  {color.sizes.map((s) => {
                    const info = SIZES.find((x) => x.name === s.name);
                    const id = `qv-size-${s.name.replace(/\W+/g, "-").toLowerCase()}`;
                    return (
                      <span key={s.name} style={{ display: "contents" }}>
                        <input
                          type="radio"
                          name="qv-size"
                          id={id}
                          checked={s.name === sizeName}
                          onChange={() => setSize(s.name)}
                        />
                        <label htmlFor={id} className={s.available ? undefined : "out"}>
                          <span className="n">{s.name}</span>
                          <span className="k">
                            {s.available ? (info?.range ?? "") : "Sold out"}
                          </span>
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
              </div>
            )}
            <button
              type="button"
              className="pill pill-lime pill-block qv-add"
              disabled={!canBuy || add.isPending}
              onClick={addToBag}
            >
              {label}
            </button>
            {add.isError && <p className="ship">Something went wrong. Please try again.</p>}
            <a className="ulink small qv-more" href={product.url}>
              Take your time with the details <Ico name="arrow" />
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
