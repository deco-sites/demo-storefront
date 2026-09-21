/**
 * Removes `color` declarations from inline `style` attributes of a CMS-authored HTML
 * snippet, so the alert bar text always inherits the theme's `ink` token and keeps a
 * WCAG AA contrast ratio against the bar background.
 *
 * Only the `color` property is dropped — every other inline style, attribute and tag
 * (links, `<strong>`, `<em>`, …) is preserved, so custom HTML keeps working.
 */
export function stripInlineColors(html: string): string {
  return html.replace(
    /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (match, _quoted, double, single) => {
      const value = double ?? single ?? "";
      const kept = value
        .split(";")
        .filter((declaration) => {
          const property = declaration.split(":")[0]?.trim().toLowerCase();
          return property !== undefined && property !== "" && property !== "color";
        })
        .map((declaration) => declaration.trim())
        .join("; ");

      if (kept === "") return "";
      return match.includes('"') ? ` style="${kept}"` : ` style='${kept}'`;
    },
  );
}
