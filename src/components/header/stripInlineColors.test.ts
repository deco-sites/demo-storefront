import assert from "node:assert/strict";
import { test } from "node:test";
import { stripInlineColors } from "./stripInlineColors";

test("drops the inline color that broke contrast on the alert bar", () => {
  assert.equal(
    stripInlineColors(
      '<p style="color: green;"><strong style="color: green">Hurry, offer ends soon!</strong></p>',
    ),
    "<p><strong>Hurry, offer ends soon!</strong></p>",
  );
});

test("drops color even when flagged !important", () => {
  assert.equal(
    stripInlineColors(`<span style='color: green !important'>x</span>`),
    "<span>x</span>",
  );
});

test("keeps other declarations and custom HTML untouched", () => {
  assert.equal(
    stripInlineColors(
      '<a href="/sale" style="color:#0f0;font-weight:700;text-decoration:underline">Save 10%</a>',
    ),
    '<a href="/sale" style="font-weight:700; text-decoration:underline">Save 10%</a>',
  );
  assert.equal(stripInlineColors("<em>no styles here</em>"), "<em>no styles here</em>");
});

test("leaves background-color alone", () => {
  assert.equal(
    stripInlineColors('<b style="background-color: red; color: green">x</b>'),
    '<b style="background-color: red">x</b>',
  );
});
