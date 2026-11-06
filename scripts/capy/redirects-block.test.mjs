import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLegacyRuleFile,
  REDIRECTS_FILE,
  redirectsBlockFile,
  withLegacyRules,
} from "./redirects-block.mjs";

const TARGET = "/collections/the-herd";

test("one block of the redirects type, its rules sorted and unique", () => {
  const { block, rules, skipped } = withLegacyRules(
    undefined,
    ["/shirts", "/products/t-shirt", "/shirts"],
    TARGET,
  );
  assert.deepEqual(block, {
    __resolveType: "redirects",
    redirects: [
      { from: "/products/t-shirt", to: TARGET, permanent: false },
      { from: "/shirts", to: TARGET, permanent: false },
    ],
  });
  assert.equal(rules.length, 2);
  assert.deepEqual(skipped, []);
});

test("a re-run replaces only its own rules and keeps every other rule, in order", () => {
  const existing = {
    __resolveType: "website/loaders/redirects.ts",
    redirects: [
      { from: "/old-sale", to: "/sale", permanent: true },
      // An editor's rule to the same target: not a legacy path, so it stays.
      { from: "/gone", to: TARGET, permanent: false },
      { redirect: { from: "/v7", to: "/new", type: "permanent" } },
      // An earlier run's rule, in either shape: replaced.
      { redirect: { from: "/shirts", to: TARGET } },
      { from: "/hats", to: TARGET, permanent: false },
    ],
  };
  const { block } = withLegacyRules(existing, ["/shirts", "/hats"], TARGET);
  assert.equal(block.__resolveType, "website/loaders/redirects.ts");
  assert.deepEqual(block.redirects, [
    { from: "/old-sale", to: "/sale", permanent: true },
    { from: "/gone", to: TARGET, permanent: false },
    { redirect: { from: "/v7", to: "/new", type: "permanent" } },
    { from: "/hats", to: TARGET, permanent: false },
    { from: "/shirts", to: TARGET, permanent: false },
  ]);
});

test("a path another rule already redirects gets no legacy rule", () => {
  const existing = {
    __resolveType: "redirects",
    redirects: [
      { from: "/shirts", to: "/collections/sol", permanent: true },
      { redirect: { from: "/kids", to: "/collections/rio" } },
    ],
  };
  const { block, rules, skipped } = withLegacyRules(existing, ["/shirts", "/kids", "/men"], TARGET);
  assert.deepEqual(block.redirects, [
    { from: "/shirts", to: "/collections/sol", permanent: true },
    { redirect: { from: "/kids", to: "/collections/rio" } },
    { from: "/men", to: TARGET, permanent: false },
  ]);
  assert.deepEqual(rules, [{ from: "/men", to: TARGET, permanent: false }]);
  assert.deepEqual(skipped, ["/kids", "/shirts"]);
});

test("a rule an earlier run wrote for a page now in the live catalog is dropped", () => {
  const existing = {
    redirects: [
      { from: "/products/capy-tee", to: TARGET, permanent: false },
      { from: "/products/capy-tee-old", to: "/products/capy-tee", permanent: true },
    ],
  };
  const { block } = withLegacyRules(existing, ["/men"], TARGET, ["/products/capy-tee"]);
  assert.deepEqual(block.redirects, [
    { from: "/products/capy-tee-old", to: "/products/capy-tee", permanent: true },
    { from: "/men", to: TARGET, permanent: false },
  ]);
});

test("the site's redirects block is found by its type, under any name", () => {
  const page = { __resolveType: "website/pages/Page.tsx" };
  assert.equal(redirectsBlockFile([["pages-home.json", page]]), REDIRECTS_FILE);
  assert.equal(REDIRECTS_FILE, "Redirects.json");
  assert.equal(
    redirectsBlockFile([
      ["pages-home.json", page],
      ["site-redirects.json", { __resolveType: "website/loaders/redirects.ts", redirects: [] }],
    ]),
    "site-redirects.json",
  );
  assert.equal(
    redirectsBlockFile([["Redirects.json", { __resolveType: "redirects" }]]),
    "Redirects.json",
  );
  assert.throws(
    () =>
      redirectsBlockFile([
        ["Redirects.json", { __resolveType: "redirects" }],
        ["redirects-old.json", { __resolveType: "website/loaders/redirects.ts" }],
      ]),
    /several redirects blocks/,
  );
});

test("a block of another type saved as Redirects is never written over", () => {
  assert.throws(
    () => redirectsBlockFile([["Redirects.json", { __resolveType: "website/pages/Page.tsx" }]]),
    /Redirects.json is not a redirects block/,
  );
  // The site's redirects block under another name is still the one written.
  assert.equal(
    redirectsBlockFile([
      ["Redirects.json", { __resolveType: "website/pages/Page.tsx" }],
      ["site-redirects.json", { __resolveType: "redirects", redirects: [] }],
    ]),
    "site-redirects.json",
  );
});

test("only the old per-rule files are legacy", () => {
  assert.equal(isLegacyRuleFile("redirect-legacy-shirts.json"), true);
  assert.equal(isLegacyRuleFile("Redirects.json"), false);
  assert.equal(isLegacyRuleFile("redirect-sale.json"), false);
});
