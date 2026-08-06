import { MINICART_DRAWER_ID } from "../../constants";
import Minicart from "./Minicart";

export default function MinicartDrawer() {
  // The drawer renders as a sibling of the layout's <main>, so it needs its own
  // landmark — otherwise the toggle/overlay controls sit outside every region
  // and screen reader users can't reach them by landmark navigation.
  // The <aside> itself has no visual footprint (all children are fixed), so it
  // only wraps the existing peer/label markup, which must stay sibling-ordered.
  return (
    <aside aria-label="Cart">
      <input
        type="checkbox"
        id={MINICART_DRAWER_ID}
        className="peer/minicart sr-only"
        aria-label="Cart"
      />
      <label
        htmlFor={MINICART_DRAWER_ID}
        aria-label="Close cart"
        className="fixed inset-0 z-40 bg-black/40 opacity-0 pointer-events-none transition-opacity duration-200 peer-checked/minicart:opacity-100 peer-checked/minicart:pointer-events-auto"
      />
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md translate-x-full transition-transform duration-200 peer-checked/minicart:translate-x-0 bg-base-100 shadow-xl">
        <Minicart />
      </div>
    </aside>
  );
}
