import { EMPTY_WISHLIST, type WishlistState } from "../platform/wishlist";
import { readWishlistCookie } from "./_cookie";

async function loader(_props?: unknown, req?: Request): Promise<WishlistState> {
  // The wishlist lives in a cookie, so it persists per browser without a backend.
  return req ? readWishlistCookie(req) : EMPTY_WISHLIST;
}

export default loader;
