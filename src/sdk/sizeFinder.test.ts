import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendSize } from "./sizeFinder";

test("weight alone", () => {
  assert.equal(recommendSize(20)?.size, "Pup");
  assert.equal(recommendSize(48)?.size, "Adult");
  assert.equal(recommendSize(60)?.size, "Big Boss");
});
test("girth alone", () => {
  assert.equal(recommendSize(null, 90)?.size, "Pup");
  assert.equal(recommendSize(null, 100)?.size, "Adult");
  assert.equal(recommendSize(null, 120)?.size, "Big Boss");
});
test("girth wins when they disagree", () => {
  const a = recommendSize(48, 120);
  assert.equal(a?.size, "Big Boss");
  assert.equal(a?.girthWon, true);
  assert.equal(recommendSize(55, 100)?.size, "Adult");
  assert.equal(recommendSize(40, 100)?.girthWon, false);
});
test("nothing to go on / outside the table", () => {
  assert.equal(recommendSize(null, null), null);
  assert.equal(recommendSize(80, 140)?.outside, true);
  assert.equal(recommendSize(80, 140)?.size, "Big Boss");
});
