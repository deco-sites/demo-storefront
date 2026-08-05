import type { KeyboardEvent } from "react";
import { MINICART_DRAWER_ID } from "../../constants";

/**
 * The drawer is driven by a hidden `<input type="checkbox">` that is
 * `aria-hidden` (and kept out of the tab order, so screen reader users never
 * land on an element that is hidden from them). The visible `<label>`s that
 * toggle it therefore have to carry the keyboard affordance themselves.
 */
export function toggleMinicartOnKey(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  document.getElementById(MINICART_DRAWER_ID)?.click();
}

export const minicartToggleProps = {
  tabIndex: 0,
  role: "button",
  onKeyDown: toggleMinicartOnKey,
} as const;
