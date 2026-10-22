/**
 * What splits the page cache besides the path, the assignments and the version
 * (src/worker-entry.ts): the device and the region. Every value either part can
 * take is listed here, so a purge without segments can drop every copy of a page.
 */
import { type Segment, segmentKey } from "@decocms/tanstack/worker";
import { detectDevice } from "./sdk/device";
import { getCookies } from "./vendor/shopify/utils/cookies";

/** The devices the key splits on: tablets share the mobile entry. */
export const DEVICES = ["mobile", "desktop"] as const;

/** The country whose regions get their own entries (the store sells in BRL). */
export const REGION_COUNTRY = "BR";

/**
 * The regions with their own entries: Brazil's states and the Federal District,
 * as Cloudflare's `cf-region-code` names them. A visitor anywhere else gets the
 * entry with no region.
 */
export const REGIONS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

const KNOWN_REGIONS: ReadonlySet<string> = new Set(REGIONS);

/**
 * The site's segment (v7's `buildSegment`): the device and the region, each in
 * the key. `loggedIn: true` is a signed-in shopper: never served from or stored
 * in the cache.
 */
type SiteSegment = { device: string; loggedIn?: boolean } & Record<
  string,
  string | boolean | undefined
>;

interface CfProperties {
  country?: string;
  regionCode?: string;
}

/** The request's region when it is one of `REGIONS` (cf headers, `request.cf` fallback). */
function regionOf(request: Request): string | undefined {
  const cf = (request as unknown as { cf?: CfProperties }).cf;
  const country = (request.headers.get("cf-ipcountry") ?? cf?.country ?? "").toUpperCase();
  if (country !== REGION_COUNTRY) return undefined;
  const region = (request.headers.get("cf-region-code") ?? cf?.regionCode ?? "").toUpperCase();
  return KNOWN_REGIONS.has(region) ? region : undefined;
}

function buildSegment(request: Request): SiteSegment {
  return {
    device:
      detectDevice(request.headers.get("user-agent") ?? "") === "desktop" ? "desktop" : "mobile",
    regionId: regionOf(request),
    // Signed-in shoppers carry the Shopify customer token cookie (src/platform/user/user.actions.ts):
    // their pages are never stored in or served from the shared cache.
    loggedIn: Boolean(getCookies(request.headers).secure_customer_sig),
  };
}

/** The segment as key parts, or `"private"` for a request that never shares a cached page. */
export function segmentOf(request: Request): Segment | "private" {
  const { loggedIn, ...parts } = buildSegment(request);
  if (loggedIn === true) return "private";
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(parts)) {
    if (value !== undefined && value !== "" && value !== false) out[name] = String(value);
  }
  return out;
}

/** Every segment `segmentOf` can produce: each device, in each region and in none. */
export function knownSegments(): Segment[] {
  const out: Segment[] = [];
  for (const device of DEVICES) {
    out.push({ device });
    for (const regionId of REGIONS) out.push({ device, regionId });
  }
  return out;
}

/**
 * The segments a purge drops: the body's `segments` when it names any (an
 * override, e.g. `[{ "device": "desktop", "regionId": "SP" }]`), else every
 * known segment, so `{ "paths": [...] }` alone (or `"segments": []`) drops every copy.
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
