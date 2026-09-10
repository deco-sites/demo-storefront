/**
 * Soft-404 guard for the CMS catch-all route.
 *
 * The CMS holds two *template* pages whose paths match URLs that don't
 * necessarily exist in the catalog:
 *
 *   - "Category Page" at `/*`             — matches literally every path
 *   - "Product Page"  at `/products/:slug`
 *
 * Because `findPageByPath` (framework) matches them, `resolveDecoPage` always
 * returns a page, so the route loader never sees `null` and the response is a
 * 200 rendering an empty listing / an empty PDP. Crawlers then index phantom
 * URLs (`/zzz-nonexistent-abc`), which is exactly the soft-404 this module
 * exists to prevent.
 *
 * The check is a single, cheap Storefront API existence query (one field, no
 * fragments) — it does NOT refetch the listing/product data the sections load
 * themselves.
 */
import { createServerFn } from "@tanstack/react-start";
import { getShopifyClient } from "@decocms/apps-shopify/client";

const COLLECTION_EXISTS = /* GraphQL */ `
  query CollectionExists($handle: String!) {
    collection(handle: $handle) {
      handle
    }
  }
`;

const PRODUCT_EXISTS = /* GraphQL */ `
  query ProductExists($handle: String!) {
    product(handle: $handle) {
      handle
    }
  }
`;

export interface CatalogPathInput {
  /** The matched CMS page's path pattern, e.g. `/*`, `/products/:slug`, `/women`. */
  pattern: string;
  /** The requested pathname, e.g. `/shirts`. */
  path: string;
}

/**
 * What the matched CMS page pattern implies about the requested path.
 *
 * - `static`     — the CMS page is authored for this exact path; it exists by
 *                  definition and needs no catalog lookup (`/`, `/women`, `/s`).
 * - `collection` — matched only via the `/*` wildcard, so the first path
 *                  segment must be a real Shopify collection handle.
 * - `product`    — matched via `/products/:slug`, so the slug must be a real
 *                  Shopify product handle.
 * - `missing`    — the shape itself is unservable (e.g. a multi-segment path
 *                  falling through to `/*`, where the listing loader silently
 *                  ignores every segment past the first and would render the
 *                  same collection under unlimited phantom URLs).
 */
export type CatalogPathKind = "static" | "collection" | "product" | "missing";

/**
 * Strips the trailing numeric variant id from a PDP slug, exactly as
 * `shopify/loaders/ProductDetailsPage.ts` does — `deco-tee-47781418401969`
 * is the product `deco-tee` on variant `47781418401969`. Without this the
 * existence check would 404 every real PDP that links a specific variant.
 *
 * @internal exported for tests
 */
export function slugToProductHandle(slug: string): string {
  const parts = slug.split("-");
  const maybeSkuId = Number(parts[parts.length - 1]);
  return parts.slice(0, maybeSkuId ? -1 : undefined).join("-");
}

/** @internal exported for tests */
export function classifyCatalogPath({ pattern, path }: CatalogPathInput): {
  kind: CatalogPathKind;
  handle: string;
} {
  const segments = path.split("/").filter(Boolean);

  // Product template: the slug sits at the position the `:param` occupies in
  // `/products/:slug`, so `/products/` (no slug at all) is `missing`, not a
  // lookup for the handle "products".
  const patternSegments = pattern.split("/").filter(Boolean);
  if (patternSegments[0] === "products" && patternSegments[1]?.startsWith(":")) {
    const handle = slugToProductHandle(segments[1] ?? "");
    return handle ? { kind: "product", handle } : { kind: "missing", handle: "" };
  }

  // Wildcard template: the whole path must be a single collection handle.
  if (pattern.includes("*")) {
    if (segments.length !== 1) return { kind: "missing", handle: "" };
    return { kind: "collection", handle: segments[0]! };
  }

  // Anything else is an authored page (or an unrecognised `:param` template we
  // deliberately don't second-guess) — always servable.
  return { kind: "static", handle: "" };
}

/**
 * `true` when the requested path is backed by real content, `false` when the
 * route loader should `throw notFound()`.
 *
 * Fails OPEN: if the Storefront API errors we return `true` rather than 404 a
 * page that probably exists — a transient upstream blip must not de-index the
 * catalog.
 */
export async function catalogPathExists(input: CatalogPathInput): Promise<boolean> {
  const { kind, handle } = classifyCatalogPath(input);

  if (kind === "static") return true;
  if (kind === "missing") return false;

  try {
    const client = getShopifyClient();
    if (kind === "collection") {
      const data = await client.query<{ collection?: { handle: string } | null }>(
        COLLECTION_EXISTS,
        { handle },
      );
      return Boolean(data?.collection);
    }
    const data = await client.query<{ product?: { handle: string } | null }>(PRODUCT_EXISTS, {
      handle,
    });
    return Boolean(data?.product);
  } catch (error) {
    console.warn(`[catalogPath] existence check failed for ${input.path} — serving 200`, error);
    return true;
  }
}

/**
 * Server-fn wrapper so the catch-all route loader can run the check on client
 * navigations too (the Storefront token is server-only). On SSR it executes
 * in-process; on SPA nav it is one small RPC.
 */
export const catalogPathExistsServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: CatalogPathInput) => input)
  .handler(({ data }) => catalogPathExists(data));
