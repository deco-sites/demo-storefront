/**
 * The shopper's wishlist and address book, as server functions the browser calls
 * (/next/renames-and-migrations#loaders-actions-and-invoke).
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getResponse } from "@tanstack/react-start/server";
import { z } from "zod";
import submitAddress from "../actions/address/submit";
import submitWishlist from "../actions/wishlist/submit";
import loadAddresses from "../loaders/address";
import loadWishlist from "../loaders/wishlist";
import productListLoader from "../vendor/shopify/loaders/ProductList";
import { DECO_METAFIELDS, toCards } from "../sdk/capyProduct";
import { markPrivate } from "@decocms/tanstack/server";

const addressInput = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  recipient: z.string().optional(),
  streetAddress: z.string().optional(),
  addressLocality: z.string().optional(),
  addressRegion: z.string().optional(),
  postalCode: z.string().optional(),
  addressCountry: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const addressOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("save"), address: addressInput }),
  z.object({ op: z.literal("remove"), id: z.string() }),
  z.object({ op: z.literal("setDefault"), id: z.string() }),
]);

// The shopper's own wishlist and addresses: never shared, so never cached (createDecoWorker in src/worker-entry.ts).
export const getWishlistServerFn = createServerFn({ method: "GET" }).handler(() => {
  markPrivate();
  return loadWishlist(undefined, getRequest());
});

export const toggleWishlistServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productID: z.string(), productGroupID: z.string() }))
  .handler(({ data }) => submitWishlist(data, getRequest(), getResponse().headers));

export const getAddressesServerFn = createServerFn({ method: "GET" }).handler(() => {
  markPrivate();
  return loadAddresses(getRequest());
});

export const submitAddressServerFn = createServerFn({ method: "POST" })
  .inputValidator(addressOp)
  .handler(({ data }) => submitAddress(data, getRequest(), getResponse().headers));

// Header search suggestions: a few catalogue matches for what the shopper is typing. Public data,
// so it stays cacheable.
export const searchSuggestionsServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string().max(80) }))
  .handler(async ({ data }) => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    const products = await productListLoader({
      props: { query: q, count: 5 },
      metafields: DECO_METAFIELDS,
    });
    return toCards(products).map((p) => ({
      url: p.url,
      title: p.title,
      price: p.price,
      currency: p.currency,
      image: p.colors[0]?.image,
      bg: p.colors[0]?.bg,
    }));
  });
