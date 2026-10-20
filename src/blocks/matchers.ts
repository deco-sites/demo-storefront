/**
 * The site's own matchers (/next/matchers-and-variants#write-your-own-matcher). Each reads the
 * request the way the rest of the site does: from the page being rendered.
 */
import { pageState } from "../request-state.server";

/** Shows the variant to visitors on the devices checked. */
export function device(props: { mobile?: boolean; tablet?: boolean; desktop?: boolean }): boolean {
  const current = pageState().device;
  return Boolean(props[current]);
}
