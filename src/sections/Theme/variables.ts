/**
 * Server-side theme variable computation. Kept out of `Theme.tsx` so the
 * colorjs.io dependency (~40 KiB gzipped) is not part of the client bundle:
 * this module is only reached through the Theme section loader.
 */
import Color from "colorjs.io";
import type { Button, ComplementaryColors, Miscellaneous, Props, ThemeColors } from "./Theme";

type Theme = ThemeColors & ComplementaryColors & Button & Miscellaneous;

const darken = (color: string, percentage: number) => new Color(color).darken(percentage);

const isDark = (c: Color) => c.contrast("black", "WCAG21") < c.contrast("white", "WCAG21");

const contrasted = (color: string, percentage = 0.8) => {
  const c = new Color(color);

  return isDark(c) ? c.mix("white", percentage) : c.mix("black", percentage);
};

const toVariables = (t: Theme & Required<ThemeColors>): [string, string][] => {
  // DaisyUI v5 expects full oklch() values, e.g. "oklch(70% 0.18 250deg)"
  const toValue = (color: string | ReturnType<typeof darken>) => {
    const [l, c, h] = new Color(color).oklch;

    return `oklch(${(l * 100).toFixed(0)}% ${c.toFixed(2)} ${(h || 0).toFixed(0)}deg)`;
  };

  // DaisyUI v5 variable names (--color-* prefix instead of the old v4 shorthand)
  const colorVariables = Object.entries({
    "--color-primary": t["primary"],
    "--color-primary-content": t["primary-content"] ?? contrasted(t["primary"]),

    "--color-secondary": t["secondary"],
    "--color-secondary-content": t["secondary-content"] ?? contrasted(t["secondary"]),

    "--color-accent": t["tertiary"],
    "--color-accent-content": t["tertiary-content"] ?? contrasted(t["tertiary"]),

    "--color-neutral": t["neutral"],
    "--color-neutral-content": t["neutral-content"] ?? contrasted(t["neutral"]),

    "--color-base-100": t["base-100"],
    "--color-base-200": t["base-200"] ?? darken(t["base-100"], 0.07),
    "--color-base-300": t["base-300"] ?? darken(t["base-100"], 0.14),
    "--color-base-content": t["base-content"] ?? contrasted(t["base-100"]),

    "--color-success": t["success"],
    "--color-success-content": t["success-content"] ?? contrasted(t["success"]),

    "--color-warning": t["warning"],
    "--color-warning-content": t["warning-content"] ?? contrasted(t["warning"]),

    "--color-error": t["error"],
    "--color-error-content": t["error-content"] ?? contrasted(t["error"]),

    "--color-info": t["info"],
    "--color-info-content": t["info-content"] ?? contrasted(t["info"]),
  }).map(([key, color]) => [key, toValue(color)] as [string, string]);

  // DaisyUI v5 renamed misc variables — map old interface fields to new names
  const miscellaneousVariables = Object.entries({
    "--radius-box": t["--rounded-box"], // was --rounded-box
    "--radius-field": t["--rounded-btn"], // was --rounded-btn (inputs, selects)
    "--radius-selector": t["--rounded-badge"], // was --rounded-badge (badges, toggles)
    "--border": t["--border-btn"], // was --border-btn
    // animation/tab vars have no DaisyUI v5 equivalent; keep as custom props
    "--animation-btn": t["--animation-btn"],
    "--animation-input": t["--animation-input"],
    "--btn-focus-scale": t["--btn-focus-scale"],
    "--tab-border": t["--tab-border"],
    "--tab-radius": t["--tab-radius"],
  });

  return [...colorVariables, ...miscellaneousVariables];
};

const defaultTheme = {
  primary: "oklch(1 0 0)",
  secondary: "oklch(1 0 0)",
  tertiary: "oklch(1 0 0)",
  neutral: "oklch(1 0 0)",
  "base-100": "oklch(1 0 0)",
  info: "oklch(1 0 0)",
  success: "oklch(0.9054 0.1546 194.7689)",
  warning: "oklch(1 0 0)",
  error: "oklch(1 0 0)",

  "--rounded-box": "1rem", // border radius rounded-box utility class, used in card and other large boxes
  "--rounded-btn": "0.2rem" as const, // border radius rounded-btn utility class, used in buttons and similar element
  "--rounded-badge": "1.9rem", // border radius rounded-badge utility class, used in badges and similar
  "--animation-btn": "0.25s" as const, // duration of animation when you click on button
  "--animation-input": "0.2s", // duration of animation for inputs like checkbox, toggle, radio, etc
  "--btn-focus-scale": "0.95" as const, // scale transform of button when you focus on it
  "--border-btn": "1px" as const, // border width of buttons
  "--tab-border": "1px", // border width of tabs
  "--tab-radius": "0.5rem", // border radius of tabs
};

export function computeThemeVariables({
  mainColors,
  complementaryColors,
  buttonStyle,
  otherStyles,
}: Props): [string, string][] {
  return toVariables({
    ...defaultTheme,
    ...complementaryColors,
    ...mainColors,
    ...buttonStyle,
    ...otherStyles,
  });
}
