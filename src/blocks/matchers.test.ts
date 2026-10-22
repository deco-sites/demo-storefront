import assert from "node:assert/strict";
import { test } from "node:test";
import { withPage } from "../request-state.server";
import type { Device } from "../sdk/device";
import { device, type DeviceProps } from "./matchers";

function on(current: Device, props: DeviceProps): boolean {
  const url = new URL("https://example.com/");
  return withPage({ url, request: new Request(url), params: {}, device: current }, () =>
    device(props),
  );
}

test("mobile matches phones and tablets, as the cache key folds them", () => {
  assert.equal(on("mobile", { mobile: true }), true);
  assert.equal(on("tablet", { mobile: true }), true);
  assert.equal(on("desktop", { mobile: true }), false);
});

test("desktop matches desktops only", () => {
  assert.equal(on("desktop", { desktop: true }), true);
  assert.equal(on("mobile", { desktop: true }), false);
  assert.equal(on("tablet", { desktop: true }), false);
});

test("tablet checked alone means mobile visitors: it can't diverge from mobile", () => {
  assert.equal(on("tablet", { tablet: true }), true);
  assert.equal(on("mobile", { tablet: true }), true);
  assert.equal(on("desktop", { tablet: true }), false);
});

test("nothing checked matches nobody; everything checked matches everybody", () => {
  for (const d of ["mobile", "tablet", "desktop"] as const) {
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
        assert.equal(on("tablet", props), on("mobile", props), JSON.stringify(props));
      }
});
