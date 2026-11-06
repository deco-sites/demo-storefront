import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isLegacyRuleFile,
  routeKey,
  legacyFileRules,
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

/** Old per-rule files, as `deco pull` saves them. */
const ruleFile = (from, to = TARGET, permanent = false) => [
  `redirect-legacy-${from.slice(1).replaceAll("/", "-")}.json`,
  { __resolveType: "redirect", from, to, permanent },
];

test("the old per-rule files' rules are folded into the block", () => {
  const files = [ruleFile("/products/t-shirt"), ruleFile("/shirts"), ruleFile("/products/mug")];
  // /products/mug is gone from the catalog: its file's rule is the only one that redirects it.
  const { block, rules, folded, conflicts, dropped } = withLegacyRules(
    undefined,
    ["/shirts", "/products/t-shirt", "/men"],
    TARGET,
    [],
    legacyFileRules(files),
  );
  assert.deepEqual(block.redirects, [
    { from: "/products/mug", to: TARGET, permanent: false },
    { from: "/men", to: TARGET, permanent: false },
    { from: "/products/t-shirt", to: TARGET, permanent: false },
    { from: "/shirts", to: TARGET, permanent: false },
  ]);
  assert.deepEqual(folded, [{ from: "/products/mug", to: TARGET, permanent: false }]);
  assert.equal(rules.length, 3);
  assert.deepEqual(conflicts, []);
  assert.deepEqual(dropped, []);
  // Every old file's path is still redirected.
  const froms = new Set(block.redirects.map((rule) => rule.from));
  for (const [, body] of files) assert.ok(froms.has(body.from), body.from);
});

test("folded rules are deduped by path, and keep their fields but the type", () => {
  const files = [
    [
      "redirect-legacy-a.json",
      {
        __resolveType: "redirect",
        from: "/old",
        to: "/new",
        permanent: true,
        discardQueryParameters: true,
      },
    ],
    [
      "redirect-legacy-b.json",
      { __resolveType: "redirect", from: "/old", to: "/new", permanent: true },
    ],
  ];
  const { block, folded, conflicts } = withLegacyRules(
    undefined,
    [],
    TARGET,
    [],
    legacyFileRules(files),
  );
  assert.deepEqual(block.redirects, [
    { from: "/old", to: "/new", permanent: true, discardQueryParameters: true },
  ]);
  assert.equal(folded.length, 1);
  // b keeps the query string a discards: not the same redirect, so reported.
  assert.deepEqual(
    conflicts.map((c) => c.file),
    ["redirect-legacy-b.json"],
  );
});

test("on a conflict the catalog's rule is kept and the old file's is reported", () => {
  const files = [ruleFile("/shirts", "/collections/sol", true), ruleFile("/hats", TARGET, true)];
  const { block, conflicts, folded } = withLegacyRules(
    undefined,
    ["/shirts", "/hats"],
    TARGET,
    [],
    legacyFileRules(files),
  );
  assert.deepEqual(block.redirects, [
    { from: "/hats", to: TARGET, permanent: false },
    { from: "/shirts", to: TARGET, permanent: false },
  ]);
  assert.deepEqual(folded, []);
  assert.deepEqual(conflicts, [
    {
      file: "redirect-legacy-hats.json",
      rule: { from: "/hats", to: TARGET, permanent: true },
      kept: { from: "/hats", to: TARGET, permanent: false },
    },
    {
      file: "redirect-legacy-shirts.json",
      rule: { from: "/shirts", to: "/collections/sol", permanent: true },
      kept: { from: "/shirts", to: TARGET, permanent: false },
    },
  ]);
  // Two old files for one path: the first by name is kept, the other reported.
  const twice = withLegacyRules(
    undefined,
    [],
    TARGET,
    [],
    legacyFileRules([
      ["redirect-legacy-x2.json", { __resolveType: "redirect", from: "/x", to: "/b" }],
      ["redirect-legacy-x1.json", { __resolveType: "redirect", from: "/x", to: "/a" }],
    ]),
  );
  assert.deepEqual(twice.block.redirects, [{ from: "/x", to: "/a" }]);
  assert.deepEqual(
    twice.conflicts.map((c) => c.file),
    ["redirect-legacy-x2.json"],
  );
});

test("an old file's rule another block rule or the live catalog overrides is dropped", () => {
  const existing = {
    __resolveType: "redirects",
    redirects: [{ from: "/kids", to: "/collections/rio", permanent: true }],
  };
  const { block, dropped } = withLegacyRules(
    existing,
    [],
    TARGET,
    ["/products/capy-tee"],
    legacyFileRules([ruleFile("/kids"), ruleFile("/products/capy-tee")]),
  );
  assert.deepEqual(block.redirects, existing.redirects);
  assert.deepEqual(
    dropped.map((d) => [d.file, d.reason]),
    [
      ["redirect-legacy-kids.json", "another rule in the block redirects it"],
      ["redirect-legacy-products-capy-tee.json", "its page is in the live catalog"],
    ],
  );
});

test("a re-run, once the old files are removed, writes the same block", () => {
  const existing = {
    __resolveType: "redirects",
    redirects: [{ from: "/old-sale", to: "/sale", permanent: true }],
  };
  const froms = ["/shirts", "/products/t-shirt", "/men"];
  const files = legacyFileRules([
    ruleFile("/products/t-shirt"),
    ruleFile("/products/mug"),
    ruleFile("/shirts", "/collections/sol"),
    ruleFile("/legacy-page", "/pages/about", true),
  ]);
  const first = withLegacyRules(existing, froms, TARGET, [], files);
  const rerun = withLegacyRules(structuredClone(first.block), froms, TARGET, [], []);
  assert.deepEqual(rerun.block, first.block);
  assert.deepEqual(rerun.conflicts, []);
  // And a re-run that still sees the files (e.g. their removal failed) changes nothing either.
  assert.deepEqual(
    withLegacyRules(structuredClone(first.block), froms, TARGET, [], files).block,
    first.block,
  );
});

test("an old file without a from and a to is never removed unfolded", () => {
  assert.throws(
    () => legacyFileRules([["redirect-legacy-x.json", { __resolveType: "redirect", from: "/x" }]]),
    /redirect-legacy-x.json has no from and to/,
  );
});

test("the old files never make a block of another type the redirects block", () => {
  const blocks = [
    ["Redirects.json", { __resolveType: "website/pages/Page.tsx" }],
    ruleFile("/shirts"),
  ];
  assert.throws(() => redirectsBlockFile(blocks), /Redirects.json is not a redirects block/);
  assert.equal(redirectsBlockFile([ruleFile("/shirts")]), REDIRECTS_FILE);
});

test("paths are compared as routing does: trailing slash and encoding, not case or query", () => {
  assert.equal(routeKey("/products/x/"), routeKey("/products/x"));
  assert.equal(routeKey("//products//x"), routeKey("/products/x"));
  assert.equal(routeKey("/caf%C3%A9"), routeKey("/café"));
  assert.equal(routeKey("/p/:id"), routeKey("/p/:slug"));
  assert.notEqual(routeKey("/Products/x"), routeKey("/products/x"));
  assert.notEqual(routeKey("/x?a=1"), routeKey("/x"));
  // An old file for /shirts/ is the catalog's /shirts: it never lands before it and wins.
  const slash = withLegacyRules(
    undefined,
    ["/shirts"],
    TARGET,
    [],
    legacyFileRules([ruleFile("/shirts/", "/collections/sol")]),
  );
  assert.deepEqual(slash.block.redirects, [{ from: "/shirts", to: TARGET, permanent: false }]);
  assert.deepEqual(
    slash.conflicts.map((c) => c.rule.from),
    ["/shirts/"],
  );
  // Another case, or a query scope, is another redirect: folded next to the catalog's.
  const other = withLegacyRules(
    undefined,
    ["/shirts"],
    TARGET,
    [],
    legacyFileRules([ruleFile("/Shirts"), ruleFile("/shirts?color=red")]),
  );
  assert.deepEqual(other.folded.map((r) => r.from).sort(), ["/Shirts", "/shirts?color=red"]);
  assert.deepEqual(other.conflicts, []);
  // A live page under another spelling is still live.
  const live = withLegacyRules(
    undefined,
    [],
    TARGET,
    ["/products/capy-tee"],
    legacyFileRules([ruleFile("/products/capy-tee/")]),
  );
  assert.deepEqual(live.block.redirects, []);
  assert.equal(live.dropped.length, 1);
});

test("rules that answer with another status are a conflict, not merged silently", () => {
  const files = legacyFileRules([
    ["redirect-legacy-a.json", { __resolveType: "redirect", from: "/a", to: TARGET, status: 308 }],
    [
      "redirect-legacy-b.json",
      { __resolveType: "redirect", from: "/b", to: TARGET, permanent: false, status: 302 },
    ],
  ]);
  const { conflicts } = withLegacyRules(undefined, ["/a", "/b"], TARGET, [], files);
  // 308 is not the catalog's 302; an explicit 302 is.
  assert.deepEqual(
    conflicts.map((c) => c.file),
    ["redirect-legacy-a.json"],
  );
});

test("an old file in the v7 nested shape is folded as it is", () => {
  const files = legacyFileRules([
    [
      "redirect-legacy-v7.json",
      {
        __resolveType: "website/loaders/redirect.ts",
        redirect: { from: "/v7", to: "/new", type: "permanent" },
      },
    ],
  ]);
  const { block, folded } = withLegacyRules(undefined, [], TARGET, [], files);
  assert.deepEqual(block.redirects, [{ redirect: { from: "/v7", to: "/new", type: "permanent" } }]);
  assert.equal(folded.length, 1);
});

test("a re-run that still sees the old files reports nothing for rules already folded", () => {
  const files = legacyFileRules([ruleFile("/products/mug"), ruleFile("/legacy", "/about", true)]);
  const first = withLegacyRules(undefined, [], TARGET, [], files);
  const again = withLegacyRules(structuredClone(first.block), [], TARGET, [], files);
  assert.deepEqual(again.block, first.block);
  assert.deepEqual(again.dropped, []);
  assert.deepEqual(again.conflicts, []);
});
