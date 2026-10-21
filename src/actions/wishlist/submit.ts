import { type WishlistState } from "../../platform/wishlist";
import { readWishlistCookie, serializeWishlistCookie } from "../../loaders/_cookie";

interface Props {
  productID: string;
  productGroupID: string;
}

async function action(
  props: Props,
  request: Request,
  responseHeaders: Headers,
): Promise<WishlistState> {
  if (!props?.productID) throw new Error("productID is required");

  // The wishlist lives in a cookie, so it persists per browser without a backend.
  const current = readWishlistCookie(request);
  const next: WishlistState = current.productIDs.includes(props.productID)
    ? {
        productIDs: current.productIDs.filter((id) => id !== props.productID),
      }
    : { productIDs: [...current.productIDs, props.productID] };

  responseHeaders.append("Set-Cookie", serializeWishlistCookie(next));
  return next;
}

export default action;
