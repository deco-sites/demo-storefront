import { MINICART_DRAWER_ID } from "../../constants";
import Minicart from "./Minicart";

export default function MinicartDrawer() {
  return (
    <>
      {
        /* CSS-only toggle. It is the only keyboard-operable control for the
          drawer (the Bag pill and "Close cart" are bare <label>s), so it stays
          focusable and labelled — never aria-hidden and never tabIndex={-1}. */
      }
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="peer/minicart sr-only"
        aria-label="Cart"
      />
      {
        /* Click-outside overlay: pointer-only. It lives outside every landmark,
          so expose it to nobody — the drawer has its own "Close cart" button. */
      }
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked/minicart:opacity-100 peer-checked/minicart:pointer-events-auto"
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md translate-x-full invisible transition-[transform,visibility] duration-200 peer-checked/minicart:translate-x-0 peer-checked/minicart:visible bg-base-100 shadow-xl"
        aria-label="Your bag"
      >
        <Minicart />
      </aside>
    </>
  );
}
