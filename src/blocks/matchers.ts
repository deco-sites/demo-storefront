/**
 * The site's own matchers (/next/matchers-and-variants#write-your-own-matcher). Each reads the
 * request the way the rest of the site does: from the page being rendered.
 */
import { pageState } from "../request-state.server";
import { type DeviceClass, deviceClass } from "../sdk/device";

export interface DeviceProps {
  mobile?: boolean;
  /** @description Tablets get the mobile page: checking Tablet is the same as checking Mobile. */
  tablet?: boolean;
  desktop?: boolean;
}

/** Shows the variant to visitors on the devices checked. Tablets count as mobile. */
export function device(props: DeviceProps): boolean {
  // Tablets are mobile visitors here, as in the page cache key (`segmentOf` in src/cache-segment.ts,
  // which stores one copy of a page for mobile and one for desktop) and as on v7: a rule that told
  // tablets apart from phones would cache whichever variant rendered first for both. So "mobile"
  // matches tablets, and the `tablet` checkbox, kept so saved rules and Studio's form still work, is
  // read as "mobile": checked alone it still matches every mobile visitor, phones included. A
  // tablet-only variant can't exist.
  const checked = new Set<DeviceClass>();
  if (props.mobile || props.tablet) checked.add("mobile");
  if (props.desktop) checked.add("desktop");
  return checked.has(deviceClass(pageState().device));
}
