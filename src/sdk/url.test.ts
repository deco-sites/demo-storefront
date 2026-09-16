import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveOgUrl, SITE_ORIGIN, toAbsoluteOgUrl } from "./url";

const HOME = `${SITE_ORIGIN}/`;

test("toAbsoluteOgUrl keeps absolute http(s) URLs untouched", () => {
  assert.equal(toAbsoluteOgUrl(HOME), HOME);
  assert.equal(toAbsoluteOgUrl("http://example.com/foo"), "http://example.com/foo");
});

test("toAbsoluteOgUrl absolutizes relative paths against the site origin", () => {
  assert.equal(toAbsoluteOgUrl("/"), HOME);
  assert.equal(toAbsoluteOgUrl("/lista-de-desejos"), `${SITE_ORIGIN}/lista-de-desejos`);
  assert.equal(toAbsoluteOgUrl("  /?q=shirt  "), `${SITE_ORIGIN}/?q=shirt`);
});

test("toAbsoluteOgUrl rejects unusable values", () => {
  assert.equal(toAbsoluteOgUrl(undefined), undefined);
  assert.equal(toAbsoluteOgUrl(""), undefined);
  assert.equal(toAbsoluteOgUrl("   "), undefined);
  assert.equal(toAbsoluteOgUrl("mailto:hi@example.com"), undefined);
});

// Mirrors what the `/` route's `head` does with `baseConfig.head(ctx).meta`.
const homeMeta = (extra: Record<string, string>[] = []) => [
  { property: "og:title", content: "Demo Storefront" },
  { property: "og:image", content: "https://decoims.com/banner.png" },
  ...extra,
];

test("resolveOgUrl falls back to the absolute home when pageUrl is missing", () => {
  assert.equal(resolveOgUrl(homeMeta(), undefined), HOME);
  assert.equal(resolveOgUrl(homeMeta(), null), HOME);
  assert.equal(resolveOgUrl(homeMeta(), ""), HOME);
});

test("resolveOgUrl absolutizes a relative pageUrl", () => {
  assert.equal(resolveOgUrl(homeMeta(), "/"), HOME);
  assert.equal(resolveOgUrl(homeMeta(), "/?filter=color"), `${SITE_ORIGIN}/?filter=color`);
});

test("resolveOgUrl keeps an absolute pageUrl", () => {
  assert.equal(resolveOgUrl(homeMeta(), "https://demo-storefront.decocms.com/"), HOME);
});

test("resolveOgUrl prefers the CMS canonical over pageUrl", () => {
  const meta = homeMeta([{ property: "og:url", content: "https://www.acme.com/home" }]);
  assert.equal(resolveOgUrl(meta, "/other"), "https://www.acme.com/home");
});

test("resolveOgUrl absolutizes a relative CMS canonical", () => {
  const meta = homeMeta([{ property: "og:url", content: "/canonical-home" }]);
  assert.equal(resolveOgUrl(meta, "/other"), `${SITE_ORIGIN}/canonical-home`);
});

test("resolveOgUrl always returns a URL with protocol and host", () => {
  for (const pageUrl of [undefined, "", "   ", "/", "/x?y=1", "mailto:a@b.c", "https://a.com/z"]) {
    const url = new URL(resolveOgUrl(homeMeta(), pageUrl));
    assert.match(url.protocol, /^https?:$/);
    assert.ok(url.host.length > 0);
  }
});
