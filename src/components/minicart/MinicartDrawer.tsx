import { MINICART_DRAWER_ID } from "../../constants";
import Minicart from "./Minicart";

export default function MinicartDrawer() {
  return (
    <>
      {/* CSS-only toggle: the Bag button and the "Close cart" label are the real
          controls, so keep this out of both the a11y tree and the tab order. */}
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="peer/minicart sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* Click-outside overlay: pointer-only. It lives outside every landmark,
          so expose it to nobody — the drawer has its own "Close cart" button. */}
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked/minicart:opacity-100 peer-checked/minicart:pointer-events-auto"
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md translate-x-full transition-transform duration-200 peer-checked/minicart:translate-x-0 bg-base-100 shadow-xl"
        aria-label="Your bag"
      >
        <Minicart />
      </aside>
    </>
  );
}
