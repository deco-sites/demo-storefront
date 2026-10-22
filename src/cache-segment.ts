/**
 * What splits the page cache besides the path, the assignments and the version
 * (src/worker-entry.ts): the device, mobile or desktop. Nothing on the demo
 * renders by region, so the key has none. Every value the segment can take is
 * listed here, so a purge without segments can drop every copy of a page.
 */
import { type Segment, segmentKey } from "@decocms/tanstack/worker";
import { detectDevice } from "./sdk/device";
import { getCookies } from "./vendor/shopify/utils/cookies";

/** The devices the key splits on: tablets share the mobile entry. */
export const DEVICES = ["mobile", "desktop"] as const;

/** The segment as key parts, or `"private"` for a request that never shares a cached page. */
export function segmentOf(request: Request): Segment | "private" {
  // Signed-in shoppers carry the Shopify customer token cookie (src/platform/user/user.actions.ts):
  // their pages are never stored in or served from the shared cache.
  if (getCookies(request.headers).secure_customer_sig) return "private";
  const device = detectDevice(request.headers.get("user-agent") ?? "");
  return { device: device === "desktop" ? "desktop" : "mobile" };
}

/** Every segment `segmentOf` can produce: each device. */
export function knownSegments(): Segment[] {
  return DEVICES.map((device) => ({ device }));
}

/**
 * The segments a purge drops: the body's `segments` when it names any (an
 * override, e.g. `[{ "device": "desktop" }]`), else every known segment, so
 * `{ "paths": [...] }` alone (or `"segments": []`) drops every copy.
 */
export function purgeSegments(bodySegments: unknown): Segment[] {
  const segments = new Map<string, Segment>();
  const named = Array.isArray(bodySegments) && bodySegments.length > 0;
  for (const s of named ? bodySegments : knownSegments()) {
    if (!s || typeof s !== "object") continue;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(s)) if (typeof v === "string" && v) clean[k] = v;
    segments.set(segmentKey(clean), clean);
  }
  return [...segments.values()];
}
