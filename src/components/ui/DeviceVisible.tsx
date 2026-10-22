import { type ReactNode } from "react";
import { type Device, deviceClass, useDevice } from "~/sdk/device";

export type DeviceVisibility = "all" | "mobile-only" | "desktop-only";

export interface VisibilityConfig {
  /**
   * @title Exibir em
   * @description Em quais dispositivos esta seção aparece. Útil para mostrar
   * conteúdo diferente no celular e no computador.
   * @default "all"
   */
  visibility?: DeviceVisibility;
}

/** Tablets count as mobile ("mobile-only" shows on them), as in the page cache key and the `device` rule. */
export function isVisibleOnDevice(device: Device, visibility: DeviceVisibility = "all"): boolean {
  if (visibility === "all") return true;
  return deviceClass(device) === (visibility === "desktop-only" ? "desktop" : "mobile");
}

/**
 * Server-side device gate. Renders children only on the configured device(s).
 *
 * Safe for SSR + caching: device is resolved server-side via `useDevice`
 * (from the request user-agent) and the edge cache is segmented by device
 * (`segmentOf` in src/cache-segment.ts), so the gated-out markup is never sent
 * to — nor cached for — the wrong device, and there's no hydration mismatch.
 */
export default function DeviceVisible({
  visibility = "all",
  children,
}: VisibilityConfig & { children: ReactNode }) {
  const device = useDevice();
  if (!isVisibleOnDevice(device, visibility)) return null;
  return <>{children}</>;
}
