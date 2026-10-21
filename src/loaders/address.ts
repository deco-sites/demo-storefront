import { type AddressBookState } from "../platform/address/address.types";
import { readAddressCookie } from "../platform/address/cookie";

async function loader(req: Request): Promise<AddressBookState> {
  // The address book lives in a cookie: the demo store has no customer address backend.
  return readAddressCookie(req);
}

export default loader;
