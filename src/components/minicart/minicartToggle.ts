import type { KeyboardEvent } from "react";
import { MINICART_DRAWER_ID } from "../../constants";

/**
 * The minicart is driven by a hidden `aria-hidden` checkbox, so the checkbox
 * itself must stay out of the tab order. These props put the *labels* in the
 * tab order instead and make Enter/Space toggle the drawer, which is what a
 * keyboard user expects from a button.
 */
export const minicartToggleProps = {
  role: "button",
  tabIndex: 0,
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const input = document.getElementById(MINICART_DRAWER_ID) as HTMLInputElement | null;
    if (input) input.checked = !input.checked;
  },
} as const;
