import assert from "node:assert/strict";
import { test } from "node:test";
import { segmentKey } from "@decocms/tanstack/worker";
import { DEVICES, knownSegments, purgeSegments, REGIONS, segmentOf } from "./cache-segment";

const USER_AGENTS = {
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
  mobile: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148",
  tablet: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
};

function request(headers: Record<string, string>, cf?: Record<string, string>): Request {
  const r = new Request("https://example.com/shoes", { headers });
  if (cf) Object.defineProperty(r, "cf", { value: cf });
  return r;
}

/** Every request shape the worker can see: each user agent, in each region, abroad and with no geo. */
function everyRequest(): Request[] {
  const out: Request[] = [];
  for (const ua of Object.values(USER_AGENTS)) {
    out.push(request({ "user-agent": ua }));
    out.push(request({ "user-agent": ua, "cf-ipcountry": "US", "cf-region-code": "PA" }));
    out.push(request({ "user-agent": ua, "cf-ipcountry": "BR", "cf-region-code": "XX" }));
    out.push(request({ "user-agent": ua, "cf-region-code": "SP" }));
    for (const region of REGIONS) {
      out.push(request({ "user-agent": ua, "cf-ipcountry": "BR", "cf-region-code": region }));
      out.push(request({ "user-agent": ua }, { country: "BR", regionCode: region.toLowerCase() }));
    }
  }
  return out;
}

const keys = (segments: Iterable<Record<string, string>>) => new Set([...segments].map(segmentKey));

test("a purge with no segments drops every segment a request can be cached under", () => {
  const purged = keys(purgeSegments(undefined));
  for (const r of everyRequest()) {
    const segment = segmentOf(r);
    assert.notEqual(segment, "private");
    if (segment === "private") continue;
    assert.ok(purged.has(segmentKey(segment)), `not purged: ${segmentKey(segment)}`);
  }
});

test("a purge with no segments asks only for segments a request can produce", () => {
  const produced = new Set<string>();
  for (const r of everyRequest()) {
    const segment = segmentOf(r);
    if (segment !== "private") produced.add(segmentKey(segment));
  }
  assert.deepEqual(keys(purgeSegments(undefined)), produced);
});

test("the default is each device in each region and in none", () => {
  assert.equal(knownSegments().length, DEVICES.length * (REGIONS.length + 1));
  assert.deepEqual(keys(purgeSegments(undefined)), keys(knownSegments()));
  assert.ok(keys(knownSegments()).has(segmentKey({ device: "desktop", regionId: "SP" })));
  assert.ok(keys(knownSegments()).has(segmentKey({ device: "mobile" })));
});

test("a body with no list of segments, or an empty one, gets the default", () => {
  for (const body of [null, [], "desktop", { device: "desktop" }, 3]) {
    assert.deepEqual(keys(purgeSegments(body)), keys(knownSegments()));
  }
});

test("the body's segments override the default", () => {
  const segments = purgeSegments([
    { device: "desktop", regionId: "SP" },
    { device: "desktop", regionId: "SP" },
    { device: "mobile", regionId: "", extra: 1 },
    null,
  ]);
  assert.deepEqual(segments, [{ device: "desktop", regionId: "SP" }, { device: "mobile" }]);
});

test("a tablet shares the mobile entry and a region abroad shares the one with none", () => {
  assert.deepEqual(segmentOf(request({ "user-agent": USER_AGENTS.tablet })), { device: "mobile" });
  assert.deepEqual(
    segmentOf(
      request({ "user-agent": USER_AGENTS.desktop, "cf-ipcountry": "US", "cf-region-code": "PA" }),
    ),
    { device: "desktop" },
  );
  assert.deepEqual(
    segmentOf(
      request({ "user-agent": USER_AGENTS.desktop, "cf-ipcountry": "BR", "cf-region-code": "PA" }),
    ),
    { device: "desktop", regionId: "PA" },
  );
});

test("a signed-in shopper is private", () => {
  assert.equal(segmentOf(request({ cookie: "secure_customer_sig=abc" })), "private");
});
