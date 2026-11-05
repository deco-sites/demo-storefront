import assert from "node:assert/strict";
import { test } from "node:test";
import { isLegacyRuleFile, REDIRECTS_FILE, withLegacyRules } from "./redirects-block.mjs";

const TARGET = "/collections/the-herd";

test("one block of the redirects type, its rules sorted and unique", () => {
  const block = withLegacyRules(undefined, ["/shirts", "/products/t-shirt", "/shirts"], TARGET);
  assert.deepEqual(block, {
    __resolveType: "redirects",
    redirects: [
      { from: "/products/t-shirt", to: TARGET, permanent: false },
      { from: "/shirts", to: TARGET, permanent: false },
    ],
  });
  assert.equal(REDIRECTS_FILE, "Redirects.json");
});

test("a re-run replaces the legacy rules and keeps every other rule, in order", () => {
  const existing = {
    __resolveType: "website/loaders/redirects.ts",
    redirects: [
      { from: "/old-sale", to: "/sale", permanent: true },
      { from: "/gone", to: TARGET, permanent: false },
      { redirect: { from: "/v7", to: "/new", type: "permanent" } },
      { redirect: { from: "/v7-legacy", to: TARGET } },
    ],
  };
  const block = withLegacyRules(existing, ["/shirts"], TARGET);
  assert.equal(block.__resolveType, "website/loaders/redirects.ts");
  assert.deepEqual(block.redirects, [
    { from: "/old-sale", to: "/sale", permanent: true },
    { redirect: { from: "/v7", to: "/new", type: "permanent" } },
    { from: "/shirts", to: TARGET, permanent: false },
  ]);
});

test("only the old per-rule files are legacy", () => {
  assert.equal(isLegacyRuleFile("redirect-legacy-shirts.json"), true);
  assert.equal(isLegacyRuleFile("Redirects.json"), false);
  assert.equal(isLegacyRuleFile("redirect-sale.json"), false);
});
