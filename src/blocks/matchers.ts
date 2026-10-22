/**
 * The site's own matchers (/next/matchers-and-variants#write-your-own-matcher). Each reads the
 * request the way the rest of the site does: from the page being rendered.
 */
import { pageState } from "../request-state.server";

export interface DeviceProps {
  mobile?: boolean;
  /** @description Tablets get the mobile page: checking Tablet is the same as checking Mobile. */
  tablet?: boolean;
  desktop?: boolean;
}

/** Shows the variant to visitors on the devices checked. Tablets count as mobile. */
export function device(props: DeviceProps): boolean {
  // The page's device is already mobile or desktop (src/open-page.server.ts folds tablets into mobile,
  // as the page cache key and v7 do), so a rule can't tell tablets from phones and cache whichever
  // variant rendered first for both. The `tablet` checkbox, kept so saved rules and Studio's form
  // still work, is read as "mobile": checked alone it matches every mobile visitor, phones included.
  // A tablet-only variant can't exist.
  if (pageState().device === "desktop") return props.desktop === true;
  return props.mobile === true || props.tablet === true;
}
