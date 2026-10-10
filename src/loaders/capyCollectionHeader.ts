/**
 * The CollectionHeader section's loader (src/sections/Capy/CollectionHeader.tsx): the collection
 * in the URL and the tabs' product counts, in one Storefront API query. Server-only, so it lives
 * apart from the section's view.
 */
import { pageState } from "../request-state.server";
import { getShopifyClient } from "../vendor/shopify/client";
import type { Props, ViewProps } from "../sections/Capy/CollectionHeader";

const alias = (handle: string) => `c_${handle.replace(/[^a-zA-Z0-9]/g, "_")}`;

export async function loader(props: Props): Promise<ViewProps> {
  const { url, params } = pageState();
  const query = url.searchParams.get("q");
  const handle = params.handle;
  const tabs = props.showTabs === false ? [] : (props.tabs ?? []);
  const handles = [...new Set([...tabs.map((t) => t.handle), ...(handle ? [handle] : [])])];

  let data: Record<
    string,
    { title: string; description: string; products: { nodes: unknown[] } } | null
  > = {};
  if (handles.length) {
    const fields = handles
      .map(
        (h) =>
          `${alias(h)}: collection(handle: ${JSON.stringify(h)}) { title description products(first: 100) { nodes { id } } }`,
      )
      .join("\n");
    try {
      data = await getShopifyClient().query(`query CollectionTabs { ${fields} }`);
    } catch (error) {
      console.error("[CollectionHeader]", error);
    }
  }

  const current = handle ? data[alias(handle)] : null;
  const title =
    props.title ??
    (query
      ? `Results for “${query}”`
      : current
        ? `${current.title}.`
        : handle
          ? "Not here."
          : "The Herd.");
  const description =
    props.description ??
    (query
      ? undefined
      : current
        ? current.description || undefined
        : handle
          ? "This collection has wandered off."
          : undefined);
  return {
    title,
    description,
    crumb: query ? "Search" : (current?.title ?? props.title ?? "Collection"),
    current: handle,
    tabs: tabs.map((t) => ({ ...t, count: data[alias(t.handle)]?.products.nodes.length })),
  };
}
