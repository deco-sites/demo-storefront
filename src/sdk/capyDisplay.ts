/**
 * Display data the Shopify catalog doesn't carry: how each product sits in its 4:5 card and the
 * backdrop colour of each packshot. Values come from the approved prototype
 * (catalog.json `products[].display.cardScale`, and the mean of the top 4% rows of each packshot),
 * keyed by product handle and by the packshot's file stem (`capy-p-rio-rct-front.jpg` ->
 * `p-rio-rct-front`). A product or image missing here gets the defaults, so a new product still
 * renders well; move these to `deco.*` metafields if editors need to change them.
 */

/** The packshot's height as a fraction of the card's height (bottom-anchored). */
const CARD_SCALE: Record<string, number> = {
  "rio-raincoat": 0.925,
  "sol-linen-poncho": 0.9,
  "yuzu-bucket-hat": 0.86,
  "onsen-waffle-robe": 0.88,
  "boia-swim-vest": 0.9,
  "largo-sunglasses": 0.8,
  "passeio-grazing-vest": 0.925,
  "passo-four-paw-sandals": 0.9,
};

/** Each packshot's own seamless colour, so the band above a scaled image continues it. */
const BACKDROP: Record<string, string> = {
  "p-ons-rob-front": "#e7dcce",
  "p-ons-rob-lila": "#f5eadd",
  "p-ons-yuz-front": "#e8dccd",
  "p-ons-yuz-lila": "#f3e9dd",
  "p-ons-yuz-steam": "#f1e8db",
  "p-rio-boi-front": "#ebe1d5",
  "p-rio-boi-mint": "#f2e7db",
  "p-rio-pas-char": "#f2e9dc",
  "p-rio-pas-front": "#efe2d2",
  "p-rio-rct-front": "#eae0d1",
  "p-rio-rct-lime": "#efe6d4",
  "p-rio-rct-mari": "#f1e7dc",
  "p-sol-lrg-front": "#e7ddcf",
  "p-sol-lrg-lime": "#f1e8dc",
  "p-sol-pon-bone": "#f0e7dc",
  "p-sol-pon-front": "#e7dbcb",
  "p-sol-pon-lime": "#dcd3c2",
  "p-sol-psv-front": "#e5dacb",
  "p-sol-psv-mari": "#f2e9dd",
};

/**
 * Images whose Shopify copy has a dark 1–5px line baked into an edge. The site serves the cropped
 * copies from public/capy/img instead (lifestyle shots and two poncho packshots).
 */
const CROPPED: Record<string, string> = {
  "p-sol-pon-front": "/capy/img/p-sol-pon-front.webp",
  "p-sol-pon-lime": "/capy/img/p-sol-pon-lime.webp",
  "l-pdp-pon": "/capy/img/l-pdp-pon.webp",
  "l-pdp-rob": "/capy/img/l-pdp-rob.webp",
};

const DEFAULT_SCALE = 0.9;
const DEFAULT_BACKDROP = "#ece3d6";

/** `https://cdn.shopify.com/.../capy-p-rio-rct-front.jpg?v=1` -> `p-rio-rct-front`. */
export function imageStem(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const file = url.split("?")[0].split("/").pop() ?? "";
  const match = file.match(/^(?:capy-)?([a-z]-[a-z0-9-]+?)(?:@2x|_2x.*)?\.(?:jpe?g|png|webp)$/i);
  return match?.[1];
}

export const cardScale = (handle: string) => CARD_SCALE[handle] ?? DEFAULT_SCALE;

export const backdrop = (url: string | undefined) =>
  BACKDROP[imageStem(url) ?? ""] ?? DEFAULT_BACKDROP;

/** The image to show for a catalog URL: the cropped site copy when there is one. */
export function displayImage(url: string): string {
  return CROPPED[imageStem(url) ?? ""] ?? url;
}

/** True for the lifestyle shots uploaded with the products (landscape `l-pdp-*` files). */
export const isLifestyle = (url: string | undefined) => /^l-/.test(imageStem(url) ?? "");
