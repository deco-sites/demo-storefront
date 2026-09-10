import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyCatalogPath, slugToProductHandle } from "./catalogPath";

test("authored pages need no catalog lookup", () => {
  for (const [pattern, path] of [
    ["/", "/"],
    ["/women", "/women"],
    ["/s", "/s"],
    ["/offline", "/offline"],
  ]) {
    assert.equal(classifyCatalogPath({ pattern, path }).kind, "static", `${pattern} ${path}`);
  }
});

test("wildcard-matched single segment must be a collection handle", () => {
  assert.deepEqual(classifyCatalogPath({ pattern: "/*", path: "/shirts" }), {
    kind: "collection",
    handle: "shirts",
  });
  assert.deepEqual(classifyCatalogPath({ pattern: "/*", path: "/zzz-nonexistent-abc" }), {
    kind: "collection",
    handle: "zzz-nonexistent-abc",
  });
});

test("wildcard-matched multi-segment paths are unservable", () => {
  // The listing loader reads only the first segment, so `/shirts/anything`
  // would render the shirts collection under unlimited phantom URLs.
  assert.equal(classifyCatalogPath({ pattern: "/*", path: "/shirts/anything" }).kind, "missing");
  assert.equal(classifyCatalogPath({ pattern: "/*", path: "/a/b/c" }).kind, "missing");
});

test("product template validates the slug", () => {
  assert.deepEqual(classifyCatalogPath({ pattern: "/products/:slug", path: "/products/code-deco" }), {
    kind: "product",
    handle: "code-deco",
  });
  assert.equal(
    classifyCatalogPath({ pattern: "/products/:slug", path: "/products/" }).kind,
    "missing",
  );
});

test("product slugs drop the trailing variant id, like the Shopify PDP loader", () => {
  assert.equal(slugToProductHandle("deco-tee-47781418401969"), "deco-tee");
  assert.equal(slugToProductHandle("t-shirt-44363187880113"), "t-shirt");
  // No numeric suffix — the whole slug is the handle.
  assert.equal(slugToProductHandle("code-deco"), "code-deco");
  assert.deepEqual(
    classifyCatalogPath({ pattern: "/products/:slug", path: "/products/deco-tee-47781418401969" }),
    { kind: "product", handle: "deco-tee" },
  );
});

test("unrecognised param templates are left alone", () => {
  assert.equal(classifyCatalogPath({ pattern: "/blog/:slug", path: "/blog/hello" }).kind, "static");
});
