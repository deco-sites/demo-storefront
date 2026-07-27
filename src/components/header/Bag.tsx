import { useMutationState } from "@tanstack/react-query";
import { MINICART_DRAWER_ID } from "../../constants";
import { useCart } from "../../platform/cart";
import { clx } from "~/sdk/clx";

/** The Figma "Action button" — plain text pill: "Bag", with an item count. */
export default function Bag({ size = "md" }: { size?: "sm" | "md" }) {
  const { cart } = useCart();
  const count = cart.items.length;
  // Global "cart busy" indicator: any in-flight cart mutation (add/update/
  // remove) from anywhere in the tree, read via useMutationState by the
  // ["cart", …] mutationKey — no prop drilling.
  const busy =
    useMutationState({
      filters: { mutationKey: ["cart"], status: "pending" },
    }).length > 0;

  return (
    <label
      htmlFor={MINICART_DRAWER_ID}
      aria-label="Open cart"
      className={clx(
        "frost tap-scale inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-sm font-medium capitalize transition-colors duration-(--duration-fast) hover:bg-glass-strong",
        size === "md" ? "h-10 px-3 text-sm" : "h-8 px-3 text-2xs",
      )}
    >
      {busy ? <span className="loading loading-spinner loading-xs" /> : "Bag"}
      {!busy && count > 0 && (
        <span className="tabular-nums text-muted">({count > 9 ? "9+" : count})</span>
      )}
    </label>
  );
}
