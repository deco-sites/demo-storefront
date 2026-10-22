/**
 * Device detection, owned by the site: mobile, tablet or desktop, from the User-Agent.
 *
 * The server detects the device from the request's User-Agent once per page (src/open-page.server.ts)
 * and the page renders inside a `DeviceProvider` seeded with it, so server rendering and hydration
 * read the same value.
 */
import { createContext, createElement, type ReactNode, useContext } from "react";

export type Device = "mobile" | "tablet" | "desktop";

/**
 * What the site renders for, and what the page cache splits on (src/cache-segment.ts): tablets get the
 * mobile page, as on v7. Detection still tells a tablet apart; rendering never does.
 */
export type DeviceClass = "mobile" | "desktop";

export function deviceClass(device: Device): DeviceClass {
  return device === "desktop" ? "desktop" : "mobile";
}

const MOBILE_RE = /mobile|android.*mobile|iphone|ipod|webos|blackberry|opera mini|iemobile/i;
const TABLET_RE = /ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i;

export function isMobileUA(userAgent: string): boolean {
  return MOBILE_RE.test(userAgent) || TABLET_RE.test(userAgent);
}

export function detectDevice(userAgent: string): Device {
  if (TABLET_RE.test(userAgent)) return "tablet";
  if (MOBILE_RE.test(userAgent)) return "mobile";
  return "desktop";
}

const DeviceContext = createContext<Device | null>(null);

/** Outside a provider: the browser's own User-Agent, or "desktop" on the server. */
function runtimeDevice(): Device {
  if (typeof navigator === "undefined" || typeof document === "undefined") return "desktop";
  return detectDevice(navigator.userAgent);
}

export function useDevice(): Device {
  return useContext(DeviceContext) ?? runtimeDevice();
}

export function DeviceProvider(props: { children: ReactNode; value?: Device }): ReactNode {
  return createElement(
    DeviceContext.Provider,
    { value: props.value ?? runtimeDevice() },
    props.children,
  );
}
