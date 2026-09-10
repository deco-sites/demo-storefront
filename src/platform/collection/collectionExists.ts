/**
 * Collection existence check — used by the catch-all route to tell a real
 * category URL apart from a phantom one.
 *
 * The CMS has a "Category Page" block published on the wildcard path `/*`, so
 * `resolveDecoPage()` matches EVERY unknown URL and never returns null. On top
 * of that, Shopify's `ProductListingPage` loader answers a missing collection
 * with an empty-but-valid page instead of null. Together those two produce a
 * soft 404: `/zzz-does-not-exist` rendered the category shell with HTTP 200.
 *
 * This asks the Storefront API the one question that actually decides it — does
 * a collection with this handle exist? — with a tiny query (id only) and a
 * short-lived in-isolate cache so the extra hop is amortised across requests.
 *
 * Fails OPEN: if Shopify errors or is unreachable we report "exists" so an
 * upstream outage degrades into the previous behaviour (a 200 with an empty
 * grid) rather than 404-ing the whole category tree.
 */
import { createServerFn } from "@tanstack/react-start";
import { getShopifyClient } from "@decocms/apps-shopify";

const COLLECTION_EXISTS_QUERY = `query CollectionExists($handle: String!) {
  collection(handle: $handle) {
    id
  }
}`;

/** Positive and negative answers both cached — a crawler hammers the misses. */
const TTL_MS = 5 * 60_000;

const cache = new Map<string, { exists: boolean; expiresAt: number }>();

async function checkCollection(handle: string): Promise<boolean> {
  const cached = cache.get(handle);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.exists;

  try {
    const data = await getShopifyClient().query<{ collection?: { id?: string } | null }>(
      COLLECTION_EXISTS_QUERY,
      { handle },
    );
    const exists = Boolean(data.collection?.id);
    cache.set(handle, { exists, expiresAt: now + TTL_MS });
    return exists;
  } catch (error) {
    console.error(`[collectionExists] Shopify lookup failed for "${handle}":`, error);
    return true;
  }
}

export const collectionExistsServerFn = createServerFn({ method: "GET" })
  .inputValidator((handle: unknown) => String(handle))
  .handler(({ data: handle }) => checkCollection(handle));
