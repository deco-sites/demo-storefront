import assert from "node:assert/strict";
import { test } from "node:test";
import { segmentOf } from "../cache-segment";
import { withPage } from "../request-state.server";
import { type Device, type DeviceClass, deviceClass, detectDevice } from "../sdk/device";
import { device, type DeviceProps } from "./matchers";

const USER_AGENTS: Record<Device, string> = {
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  tablet:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1",
  desktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

function on(current: DeviceClass, props: DeviceProps): boolean {
  const url = new URL("https://example.com/");
  return withPage({ url, request: new Request(url), params: {}, device: current }, () =>
    device(props),
  );
}

/** The device class open-page.server.ts stores for a visitor with this User-Agent. */
function visitor(ua: Device): DeviceClass {
  return deviceClass(detectDevice(USER_AGENTS[ua]));
}

test("the page state folds tablets into mobile, as the cache key does", () => {
  assert.equal(visitor("mobile"), "mobile");
  assert.equal(visitor("tablet"), "mobile");
  assert.equal(visitor("desktop"), "desktop");
});

test("the page state and the cache key agree for every visitor", () => {
  for (const ua of ["mobile", "tablet", "desktop"] as const) {
    const request = new Request("https://example.com/", {
      headers: { "user-agent": USER_AGENTS[ua] },
    });
    assert.deepEqual(segmentOf(request), { device: visitor(ua) }, ua);
  }
});

test("mobile matches phones and tablets", () => {
  assert.equal(on(visitor("mobile"), { mobile: true }), true);
  assert.equal(on(visitor("tablet"), { mobile: true }), true);
  assert.equal(on(visitor("desktop"), { mobile: true }), false);
});

test("desktop matches desktops only", () => {
  assert.equal(on(visitor("desktop"), { desktop: true }), true);
  assert.equal(on(visitor("mobile"), { desktop: true }), false);
  assert.equal(on(visitor("tablet"), { desktop: true }), false);
});

test("tablet checked alone means mobile visitors: it can't diverge from mobile", () => {
  assert.equal(on(visitor("tablet"), { tablet: true }), true);
  assert.equal(on(visitor("mobile"), { tablet: true }), true);
  assert.equal(on(visitor("desktop"), { tablet: true }), false);
});

test("nothing checked matches nobody; everything checked matches everybody", () => {
  for (const d of ["mobile", "desktop"] as const) {
    assert.equal(on(d, {}), false);
    assert.equal(on(d, { mobile: true, tablet: true, desktop: true }), true);
  }
});

test("phones and tablets always get the same answer, whatever is checked", () => {
  const flags = [undefined, false, true];
  for (const mobile of flags)
    for (const tablet of flags)
      for (const desktop of flags) {
        const props = { mobile, tablet, desktop };
        assert.equal(
          on(visitor("tablet"), props),
          on(visitor("mobile"), props),
          JSON.stringify(props),
        );
      }
});
