import assert from "node:assert/strict";
import { test } from "node:test";
import { mainBounds, type PositionedSection } from "./splitPageSections";

/** Builds the `{ s, pos }` list from an ordered list of section component paths. */
const page = (components: string[]) =>
  components.map((component, pos) => ({ s: { component } as PositionedSection, pos }));

const HEADER = "site/sections/Header/Header.tsx";
const FOOTER = "site/sections/Footer/Footer.tsx";
const THEME = "site/sections/Theme/Theme.tsx";
const SEO_PLP = "commerce/sections/Seo/SeoPLPV2.tsx";
const SEO_PDP = "commerce/sections/Seo/SeoPDPV2.tsx";

test("PLP shape: SEO before Header keeps main below the Header", () => {
  const sections = page([
    SEO_PLP,
    HEADER,
    "site/sections/Category/CategoryBanner.tsx",
    "site/sections/Product/SearchResult.tsx",
    FOOTER,
  ]);
  assert.deepEqual(mainBounds(sections), { first: 2, last: 3 });
});

test("PDP shape: SEO before Header keeps main below the Header", () => {
  const sections = page([SEO_PDP, HEADER, "site/sections/Product/ProductDetails.tsx", FOOTER]);
  assert.deepEqual(mainBounds(sections), { first: 2, last: 2 });
});

test("home shape: Header first", () => {
  const sections = page([
    THEME,
    HEADER,
    "site/sections/Images/Carousel.tsx",
    "site/sections/Product/ProductShelf.tsx",
    FOOTER,
  ]);
  assert.deepEqual(mainBounds(sections), { first: 2, last: 3 });
});

test("no landmark sections at all: everything goes inside main", () => {
  const sections = page(["site/sections/Content/Hero.tsx", "site/sections/Content/Faq.tsx"]);
  assert.deepEqual(mainBounds(sections), { first: 0, last: 1 });
});

test("no content sections: no main at all", () => {
  assert.equal(mainBounds(page([THEME, HEADER, FOOTER])), null);
  assert.equal(mainBounds(page([SEO_PLP, HEADER, FOOTER])), null);
  assert.equal(mainBounds(page([])), null);
});

test("content after the Footer does not pull the Footer into main", () => {
  const sections = page([
    HEADER,
    "site/sections/Content/Hero.tsx",
    FOOTER,
    "site/sections/Content/Newsletter.tsx",
  ]);
  assert.deepEqual(mainBounds(sections), { first: 1, last: 1 });
});

test("a Header after content does not end up inside main", () => {
  const sections = page([
    "site/sections/Content/Hero.tsx",
    HEADER,
    "site/sections/Content/Faq.tsx",
    FOOTER,
  ]);
  assert.deepEqual(mainBounds(sections), { first: 2, last: 2 });
});

test("uses the stamped index rather than array order", () => {
  const sections = [
    { s: { component: HEADER, index: 1 }, pos: 1 },
    { s: { component: SEO_PLP, index: 0 }, pos: 0 },
    { s: { component: "site/sections/Content/Hero.tsx", index: 2 }, pos: 2 },
    { s: { component: FOOTER, index: 3 }, pos: 3 },
  ];
  assert.deepEqual(mainBounds(sections), { first: 2, last: 2 });
});

test("matches on `key` when `component` is absent", () => {
  const sections = [
    { s: { key: SEO_PLP }, pos: 0 },
    { s: { key: HEADER }, pos: 1 },
    { s: { key: "site/sections/Content/Hero.tsx" }, pos: 2 },
    { s: { key: FOOTER }, pos: 3 },
  ];
  assert.deepEqual(mainBounds(sections), { first: 2, last: 2 });
});
