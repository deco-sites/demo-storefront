/**
 * Slim view models for the capybara sections, built on the server from the commerce `Product`
 * the Shopify loaders return. A full Product carries every variant expanded (with its own
 * variants, offers and properties), which would be serialized into the page for every card; the
 * sections only need these few fields.
 */
import type { Product, PropertyValue } from "../vendor/commerce/types";
import type { Metafield } from "../vendor/shopify/utils/types";
import { backdrop, cardScale, displayImage, isLifestyle } from "./capyDisplay";

/** The `deco.*` product metafields the redesign reads (tagline, badge, swatches, facts, …). */
export const DECO_METAFIELDS: Metafield[] = [
  "tagline",
  "badge",
  "swatches",
  "facts",
  "model_note",
  "materials",
].map((key) => ({ namespace: "deco", key }));

/** Adds the `deco.*` metafields to the ones a loader block saved. */
export function withDecoMetafields(saved: Metafield[] | undefined): Metafield[] {
  const list = [...(saved ?? [])];
  for (const m of DECO_METAFIELDS)
    if (!list.some((s) => s.namespace === m.namespace && s.key === m.key)) list.push(m);
  return list;
}

export interface CardColor {
  name: string;
  /** Swatch colour (hex), from the `deco.swatches` metafield. */
  swatch: string;
  image?: string;
  alt?: string;
  /** The packshot's backdrop colour. */
  bg: string;
  /** The first size of this colour that can be bought (for one-tap adds). */
  variantId?: string;
}

export interface CardProduct {
  handle: string;
  url: string;
  title: string;
  price: number;
  currency: string;
  tagline?: string;
  badge?: string;
  /** Packshot height as a fraction of the card height. */
  scale: number;
  colors: CardColor[];
  /** Sizes with at least one variant in stock. */
  sizes: string[];
}

export interface SizeOption {
  name: string;
  variantId: string;
  available: boolean;
}

export interface PdpColor extends CardColor {
  sizes: SizeOption[];
}

export interface PdpData extends CardProduct {
  descriptionHtml?: string;
  facts: string[];
  modelNote?: string;
  materials?: string;
  /** The product's collection other than the catch-all one, for the breadcrumb. */
  collection?: { handle: string; title: string };
  colors: PdpColor[];
  lifestyle?: { src: string; alt: string };
}

const COLOR = /^colou?r$/i;
const SIZE = /^size$/i;

const prop = (list: PropertyValue[] | undefined, name: string) =>
  list?.find((p) => p.name === name)?.value;

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function handleOf(product: Product): string {
  const url = product.isVariantOf?.url ?? product.url ?? "";
  const path = url.replace(/^https?:\/\/[^/]+/, "");
  return path.split("/products/")[1]?.split(/[?#]/)[0] ?? "";
}

const optionOf = (variant: Product, re: RegExp) =>
  variant.additionalProperty?.find((p) => re.test(p.name ?? ""))?.value;

const priceOf = (variant: Product) =>
  variant.offers?.offers?.[0]?.price ?? variant.offers?.lowPrice ?? 0;

const available = (variant: Product) =>
  (variant.offers?.offers?.[0]?.availability ?? "").endsWith("InStock");

/** The colours of a product in option order, each with its packshot and sizes. */
function colorsOf(product: Product, swatches: Record<string, string>): PdpColor[] {
  const variants = product.isVariantOf?.hasVariant?.length
    ? product.isVariantOf.hasVariant
    : [product];
  const byName = new Map<string, PdpColor>();
  for (const variant of variants) {
    const name = optionOf(variant, COLOR) ?? "Default";
    let color = byName.get(name);
    if (!color) {
      const raw = variant.image?.[0];
      const url = raw?.url && !raw.url.includes("no-image") ? raw.url : undefined;
      color = {
        name,
        swatch: swatches[name] ?? "#d9d0c1",
        image: url ? displayImage(url) : undefined,
        alt: raw?.alternateName || undefined,
        bg: backdrop(url),
        sizes: [],
      };
      byName.set(name, color);
    }
    const size = optionOf(variant, SIZE);
    const ok = available(variant);
    if (size) color.sizes.push({ name: size, variantId: variant.productID, available: ok });
    if (!color.variantId && ok) color.variantId = variant.productID;
  }
  return [...byName.values()];
}

/** A product card's data. */
export function toCard(product: Product): CardProduct {
  const handle = handleOf(product);
  const swatches = parseJson<Record<string, string>>(
    prop(product.additionalProperty, "swatches"),
    {},
  );
  const colors = colorsOf(product, swatches);
  return {
    handle,
    url: `/products/${handle}`,
    title: product.isVariantOf?.name ?? product.name ?? "",
    price: priceOf(product),
    currency: product.offers?.priceCurrency ?? "BRL",
    tagline: prop(product.additionalProperty, "tagline") || undefined,
    badge: prop(product.additionalProperty, "badge") || undefined,
    scale: cardScale(handle),
    colors: colors.map(({ sizes: _sizes, ...color }) => color),
    sizes: [
      ...new Set(colors.flatMap((c) => c.sizes.filter((x) => x.available).map((x) => x.name))),
    ],
  };
}

/** Cards for a product list, in the saved order, optionally re-ordered by handle. */
export function toCards(products: Product[] | null | undefined, order?: string[]): CardProduct[] {
  const cards = (products ?? []).map(toCard).filter((c) => c.handle);
  if (!order?.length) return cards;
  const rank = (h: string) => {
    const i = order.indexOf(h);
    return i === -1 ? order.length : i;
  };
  return [...cards].sort((a, b) => rank(a.handle) - rank(b.handle));
}

/** The product page's data. */
export function toPdp(product: Product): PdpData {
  const card = toCard(product);
  const swatches = parseJson<Record<string, string>>(
    prop(product.additionalProperty, "swatches"),
    {},
  );
  const collections = (product.isVariantOf?.additionalProperty ?? []).filter(
    (p) => p.name === "COLLECTION" && p.valueReference && p.valueReference !== "the-herd",
  );
  const lifestyle = product.isVariantOf?.image?.find((img) => isLifestyle(img.url));
  return {
    ...card,
    colors: colorsOf(product, swatches),
    descriptionHtml: prop(product.additionalProperty, "descriptionHtml") || undefined,
    facts: parseJson<string[]>(prop(product.additionalProperty, "facts"), []),
    modelNote: prop(product.additionalProperty, "model_note") || undefined,
    materials: prop(product.additionalProperty, "materials") || undefined,
    collection: collections[0]
      ? { handle: String(collections[0].valueReference), title: String(collections[0].value) }
      : undefined,
    lifestyle: lifestyle?.url
      ? { src: displayImage(lifestyle.url), alt: lifestyle.alternateName ?? "" }
      : undefined,
  };
}

/** `R$ 389` for whole reais, `R$ 389,90` otherwise; other currencies through Intl. */
export function money(amount: number, currency = "BRL"): string {
  if (currency === "BRL") {
    const whole = Number.isInteger(amount);
    return `R$ ${amount.toLocaleString("pt-BR", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })}`;
  }
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

/** A Shopify CDN image at a given width; other URLs as they are. */
export function sized(url: string | undefined, width: number): string | undefined {
  if (!url) return url;
  if (!url.includes("cdn.shopify.com")) return url;
  const u = new URL(url);
  u.searchParams.set("width", String(width));
  return u.toString();
}

/** A srcset for an image: Shopify widths, or the site's 1x/2x pair for /capy/img files. */
export function srcSetOf(url: string | undefined, widths = [480, 800, 1064]): string | undefined {
  if (!url) return undefined;
  if (url.includes("cdn.shopify.com"))
    return widths.map((w) => `${sized(url, w)} ${w}w`).join(", ");
  const local = url.match(/^(\/capy\/img\/[bjls]-[^@]+)\.webp$/);
  if (local) return `${url} 1344w, ${local[1]}@2x.webp 2688w`;
  return undefined;
}
