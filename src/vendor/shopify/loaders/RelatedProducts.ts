// Vendored from @decocms/apps-shopify 7.64.3 (loaders/RelatedProducts.ts). v7 offered it in every product-list
// picker of the editor; no saved content uses it. It's your code now.
import type { Product } from "../../commerce/types";
import { getShopifyClient } from "../client";
import { GetProduct, ProductRecommendations } from "../utils/storefront/queries";
import { type ProductShopify, toProduct } from "../utils/transform";
import type { Metafield } from "../utils/types";

export interface Props {
	slug: string;
	count?: number;
	metafields?: Metafield[];
}

export default async function relatedProductsLoader(
	props: Props,
	url?: URL,
): Promise<Product[] | null> {
	const client = getShopifyClient();
	const { slug, count = 10, metafields = [] } = props;

	const splitted = slug?.split("-") ?? [];
	const maybeSkuId = Number(splitted[splitted.length - 1]);
	const handle = splitted.slice(0, maybeSkuId ? -1 : undefined).join("-");

	const productData = await client.query<{ product?: ProductShopify }>(GetProduct, {
		handle,
		identifiers: metafields,
	});

	if (!productData?.product) return [];

	const data = await client.query<{
		productRecommendations?: ProductShopify[];
	}>(ProductRecommendations, { productId: productData.product.id, identifiers: metafields });

	if (!data?.productRecommendations) return [];

	const baseUrl = url ?? new URL("https://localhost");

	return data.productRecommendations
		.map((p) => toProduct(p, p.variants.nodes[0], baseUrl))
		.slice(0, count);
}
