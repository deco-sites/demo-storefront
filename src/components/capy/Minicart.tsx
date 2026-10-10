/**
 * The bag drawer: a glass slide-over opened by the `#minicart-drawer` checkbox (the Header's bag
 * button is its label), so it opens without JavaScript too. Lines, quantities and checkout come from
 * the site's cart hooks (src/platform/cart); checkout hands off to Shopify's `checkoutUrl`.
 */
import { useAddToCart, useCart, useRemoveCartItem, useUpdateCartItem } from "~/platform/cart";
import type { CartItem } from "~/platform/cart";
import { MINICART_DRAWER_ID } from "~/constants";
import type { CardProduct } from "~/sdk/capyProduct";
import { backdrop } from "~/sdk/capyDisplay";
import { money, sized } from "~/sdk/capyProduct";
import { Ico } from "./Icons";

export interface MinicartSettings {
  /**
   * @title Free delivery threshold
   * @description Cart subtotal (in the store currency) that unlocks free delivery. 0 hides the bar.
   */
  freeDeliveryThreshold?: number;
  /** @title Text after the missing amount */
  freeDeliveryText?: string;
  /** @title Text once free delivery is unlocked */
  freeDeliveryUnlocked?: string;
  /** @title Cross-sell title */
  crossSellTitle?: string;
  /** @title Note under the subtotal */
  note?: string;
  /** @title Empty bag text */
  emptyText?: string;
  /** @title Empty bag link */
  emptyLink?: { label: string; href: string };
}

const MINICART_DEFAULTS: Required<MinicartSettings> = {
  freeDeliveryThreshold: 400,
  freeDeliveryText: "to free riverbank delivery.",
  freeDeliveryUnlocked: "Free riverbank delivery is on us.",
  crossSellTitle: "Complete the look",
  note: "Taxes and delivery at checkout. Free size swap within 30 days.",
  emptyText: "Your bag is empty. The herd is waiting.",
  emptyLink: { label: "Meet the herd", href: "/collections/the-herd" },
};

/** Opens the bag drawer (after an add to bag). */
export function openMinicart() {
  const toggle = document.getElementById(MINICART_DRAWER_ID) as HTMLInputElement | null;
  if (toggle) toggle.checked = true;
}

function closeMinicart() {
  const toggle = document.getElementById(MINICART_DRAWER_ID) as HTMLInputElement | null;
  if (toggle) toggle.checked = false;
}

/** "Sand / Adult" -> "Sand · Adult"; Shopify's "Default Title" -> nothing. */
const variantLine = (title?: string) =>
  title && title !== "Default Title" ? title.split(" / ").join(" · ") : "";

function Line({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const removing = remove.isPending && remove.variables?.lineId === item.lineId;
  const set = (quantity: number) => {
    if (quantity < 1) remove.mutate({ lineId: item.lineId });
    else update.mutate({ lineId: item.lineId, quantity });
  };
  return (
    <div className="line-item" style={removing ? { opacity: 0.5 } : undefined}>
      <a
        className="th"
        href={`/products/${item.productHandle}`}
        style={{ "--bg": backdrop(item.image?.url) } as React.CSSProperties}
      >
        {item.image && (
          <img
            src={sized(item.image.url, 240)}
            width={168}
            height={208}
            alt={item.image.alt ?? item.title}
            loading="lazy"
            decoding="async"
          />
        )}
      </a>
      <div className="li-main">
        <p className="nm">
          <a href={`/products/${item.productHandle}`}>{item.title}</a>
        </p>
        {variantLine(item.variantTitle) && <p className="vr">{variantLine(item.variantTitle)}</p>}
        <div className="stepper">
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => set(item.quantity - 1)}
            disabled={removing}
          >
            <Ico name="minus" />
          </button>
          <span aria-live="polite">{item.quantity}</span>
          <button type="button" aria-label="Increase" onClick={() => set(item.quantity + 1)}>
            <Ico name="plus" />
          </button>
        </div>
      </div>
      <div className="li-side">
        <p className="pr">{money(item.price.amount * item.quantity, item.price.currencyCode)}</p>
        <button
          type="button"
          className="rm"
          onClick={() => remove.mutate({ lineId: item.lineId })}
          disabled={removing}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function CrossSell({
  products,
  title,
  missing,
  freeText,
}: {
  products: CardProduct[];
  title: string;
  missing: number;
  freeText: string;
}) {
  const add = useAddToCart();
  if (!products.length) return null;
  return (
    <div className="xsell">
      <p className="xs-head">{title}</p>
      <div className="xs-row">
        {products.slice(0, 2).map((p, i, shown) => {
          // "free delivery" on the first offer that would unlock it.
          const unlocks = missing > 0 && shown.findIndex((x) => x.price >= missing) === i;
          const color = p.colors.find((c) => c.variantId) ?? p.colors[0];
          const busy = add.isPending && add.variables?.merchandiseId === color?.variantId;
          return (
            <div className="xs-item" key={p.handle}>
              <a className="th" href={p.url} style={{ "--bg": color?.bg } as React.CSSProperties}>
                {color?.image && (
                  <img
                    src={sized(color.image, 400)}
                    width={400}
                    height={400}
                    alt={color.alt ?? p.title}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </a>
              <p className="nm">{p.title}</p>
              <p className="vr">
                {money(p.price, p.currency)} · {unlocks ? freeText : color?.name}
              </p>
              <button
                type="button"
                className="pill pill-line pill-sm"
                disabled={!color?.variantId || busy}
                onClick={() =>
                  color?.variantId && add.mutate({ merchandiseId: color.variantId, quantity: 1 })
                }
              >
                {busy ? "Adding…" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Minicart({
  settings,
  crossSell = [],
}: {
  settings?: MinicartSettings;
  crossSell?: CardProduct[];
}) {
  const s = { ...MINICART_DEFAULTS, ...settings };
  const { cart } = useCart();
  const currency = cart.subtotal.currencyCode || "BRL";
  const subtotal = cart.subtotal.amount;
  const count = cart.totalQuantity;
  const threshold = s.freeDeliveryThreshold;
  const missing = Math.max(0, threshold - subtotal);
  const inBag = new Set(cart.items.map((i) => i.productHandle));
  const offers = crossSell.filter((p) => !inBag.has(p.handle));

  return (
    <>
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="cart-toggle sr"
        aria-hidden="true"
        tabIndex={-1}
      />
      <label htmlFor={MINICART_DRAWER_ID} className="scrim" aria-hidden="true" />
      <aside className="bagdrawer veil" role="dialog" aria-modal="true" aria-label="Your bag">
        <div className="drawer-head">
          <h2 className="h3">
            Your bag{" "}
            {count > 0 && (
              <span>
                {count} {count === 1 ? "item" : "items"}
              </span>
            )}
          </h2>
          <label htmlFor={MINICART_DRAWER_ID} className="icon-btn" aria-label="Close bag">
            <Ico name="close" />
          </label>
        </div>
        {threshold > 0 && cart.items.length > 0 && (
          <div className="freebar">
            {missing > 0 ? (
              <p>
                <b>{money(missing, currency)}</b> {s.freeDeliveryText}
              </p>
            ) : (
              <p>{s.freeDeliveryUnlocked}</p>
            )}
            <div
              className="track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={threshold}
              aria-valuenow={Math.min(subtotal, threshold)}
              aria-label="Free delivery progress"
            >
              <span style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="drawer-body">
          {cart.items.length === 0 ? (
            <div className="bag-empty">
              <p>{s.emptyText}</p>
              <a className="pill pill-line" href={s.emptyLink.href} onClick={closeMinicart}>
                {s.emptyLink.label} <Ico name="arrow" />
              </a>
            </div>
          ) : (
            cart.items.map((item) => <Line key={item.lineId} item={item} />)
          )}
          <CrossSell
            products={offers}
            title={s.crossSellTitle}
            missing={missing}
            freeText="free delivery"
          />
        </div>
        {cart.items.length > 0 && (
          <div className="drawer-foot">
            <div className="row">
              <span>Subtotal</span>
              <span>{money(subtotal, currency)}</span>
            </div>
            <p className="small">{s.note}</p>
            {cart.checkoutUrl ? (
              <a className="pill pill-lime pill-block" href={cart.checkoutUrl}>
                Checkout <Ico name="arrow" />
              </a>
            ) : (
              <button type="button" className="pill pill-lime pill-block" disabled>
                Checkout
              </button>
            )}
            <label htmlFor={MINICART_DRAWER_ID} className="ulink alt" role="button" tabIndex={0}>
              Keep browsing
            </label>
          </div>
        )}
      </aside>
    </>
  );
}
