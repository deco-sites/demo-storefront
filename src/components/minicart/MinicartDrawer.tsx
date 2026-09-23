import { MINICART_DRAWER_ID } from "../../constants";
import Minicart from "./Minicart";

export default function MinicartDrawer() {
  return (
    /* The whole drawer — toggle checkbox, click-outside overlay and panel — is
       wrapped in a single `aside` landmark, so none of its markup sits outside
       a landmark region. The checkbox stays a sibling of the overlay and the
       panel inside the wrapper, which is what the `peer-checked/minicart:`
       variants need. */
    <aside aria-label="Your bag">
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="peer/minicart sr-only"
        aria-label="Cart"
      />
      {/* Click-outside overlay: pointer-only, exposed to nobody — the drawer
          has its own "Close cart" button. */}
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked/minicart:opacity-100 peer-checked/minicart:pointer-events-auto"
      />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md translate-x-full transition-transform duration-200 peer-checked/minicart:translate-x-0 bg-base-100 shadow-xl">
        <Minicart />
      </div>
    </aside>
  );
}
