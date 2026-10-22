import assert from "node:assert/strict";
import { test } from "node:test";
import { isVisibleOnDevice } from "./DeviceVisible";

test("mobile-only shows on phones and tablets, desktop-only on desktops", () => {
  assert.equal(isVisibleOnDevice("mobile", "mobile-only"), true);
  assert.equal(isVisibleOnDevice("tablet", "mobile-only"), true);
  assert.equal(isVisibleOnDevice("desktop", "mobile-only"), false);
  assert.equal(isVisibleOnDevice("mobile", "desktop-only"), false);
  assert.equal(isVisibleOnDevice("tablet", "desktop-only"), false);
  assert.equal(isVisibleOnDevice("desktop", "desktop-only"), true);
  for (const d of ["mobile", "tablet", "desktop"] as const) {
    assert.equal(isVisibleOnDevice(d), true);
    assert.equal(isVisibleOnDevice(d, "all"), true);
  }
});
