/**
 * E2E guard against soft-404s: unknown URLs must answer HTTP 404, while real
 * pages stay 200. Runs against a live server — set E2E_BASE_URL
 * (e.g. `E2E_BASE_URL=http://localhost:5173 npm test`); skipped otherwise.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.E2E_BASE_URL;
const status = async (path: string) =>
  (await fetch(new URL(path, BASE), { redirect: "follow" })).status;

test("unknown URLs return 404", { skip: !BASE }, async () => {
  for (const path of ["/nao-existe-xyz", "/nao-existe-xyz/", "/nao-existe-xyz?a=1", "/a/b/c", "/products/nao-existe"]) {
    assert.equal(await status(path), 404, path);
  }
});

test("real pages return 200", { skip: !BASE }, async () => {
  for (const path of ["/", "/shirts", "/s?q=shirt", "/products/dev-mode-tee-44073330344113"]) {
    assert.equal(await status(path), 200, path);
  }
});
