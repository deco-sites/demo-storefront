import { MINICART_DRAWER_ID } from "../../constants";
import Minicart from "./Minicart";

export default function MinicartDrawer() {
  return (
    /* The drawer is rendered by the root layout, outside the CMS page's
       Header/`main`/Footer landmarks. Wrapping the whole group in a
       `complementary` landmark keeps its focusable checkbox (the keyboard
       control that opens the cart) from being page content that sits outside
       every region. The wrapper is unstyled, so the peer/sibling CSS below is
       unaffected — the elements stay siblings of one another. */
    <aside aria-label="Your bag">
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="peer/minicart sr-only"
        aria-label="Cart"
      />
      {/* Click-outside overlay: pointer-only, so expose it to nobody — the
          drawer has its own "Close cart" button. */}
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked/minicart:opacity-100 peer-checked/minicart:pointer-events-auto"
      />
      {/* Plain `div`: the landmark is the wrapper above, so this stays a
          styling box and no complementary landmark is nested inside another. */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md translate-x-full transition-transform duration-200 peer-checked/minicart:translate-x-0 bg-base-100 shadow-xl">
        <Minicart />
      </div>
    </aside>
  );
}
