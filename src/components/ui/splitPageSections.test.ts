import assert from "node:assert/strict";
import { test } from "node:test";
import { mainBounds, type PositionedSection } from "./splitPageSections";

const HEADER: PositionedSection = { landmark: "header" };
const FOOTER: PositionedSection = { landmark: "footer" };
const CONTENT: PositionedSection = {};

/** Builds the `{ s, pos }` list from an ordered list of sections. */
const page = (sections: PositionedSection[]) => sections.map((s, pos) => ({ s, pos }));

/** Runs `fn` with `console.warn` captured, so tests don't print to stdout. */
const captureWarnings = <T>(fn: () => T): { result: T; warnings: unknown[][] } => {
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = original;
  }
};

test("home shape: main holds everything between the Header and the Footer", () => {
  const sections = page([HEADER, CONTENT, CONTENT, CONTENT, FOOTER]);
  assert.deepEqual(mainBounds(sections), { first: 1, last: 3 });
});

test("product page shape: one content section", () => {
  assert.deepEqual(mainBounds(page([HEADER, CONTENT, FOOTER])), { first: 1, last: 1 });
});

test("no landmark sections at all: everything goes inside main", () => {
  assert.deepEqual(mainBounds(page([CONTENT, CONTENT])), { first: 0, last: 1 });
});

test("no content sections: no main at all", () => {
  assert.equal(mainBounds(page([HEADER, FOOTER])), null);
  assert.equal(mainBounds(page([])), null);
});

test("content after the Footer does not pull the Footer into main", () => {
  const sections = page([HEADER, CONTENT, FOOTER, CONTENT]);
  assert.deepEqual(captureWarnings(() => mainBounds(sections)).result, { first: 1, last: 1 });
});

test("a Header after content does not end up inside main", () => {
  const sections = page([CONTENT, HEADER, CONTENT, FOOTER]);
  assert.deepEqual(captureWarnings(() => mainBounds(sections)).result, { first: 2, last: 2 });
});

test("uses each section's position rather than array order", () => {
  const sections = [
    { s: HEADER, pos: 1 },
    { s: CONTENT, pos: 2 },
    { s: FOOTER, pos: 3 },
  ];
  assert.deepEqual(mainBounds(sections), { first: 2, last: 2 });
});

test("documents the multiple-content-runs limitation: only one run gets wrapped", () => {
  // Only one `<main>` per document is valid, so a page whose content is split
  // by a second Header can't have both runs wrapped. The bounds stay landmark-
  // safe (Header/Footer never inside main) and the dropped run is warned about.
  const sections = page([HEADER, CONTENT, HEADER, CONTENT, FOOTER]);
  const { result, warnings } = captureWarnings(() => mainBounds(sections));
  assert.deepEqual(result, { first: 3, last: 3 });
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][0]), /fall outside <main>/);
});
