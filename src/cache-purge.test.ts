import assert from "node:assert/strict";
import { test } from "node:test";
import type { Route } from "@decocms/blocks";
import { purgeVersions } from "./cache-purge";

const ROUTES: Route[] = [
  { name: "pages-home", path: "/" },
  { name: "pages-pdp", path: "/products/:slug" },
];

/**
 * A CMS right after a publish: the current index is `new`, and a client that pins on a page in
 * `stale` stays on the previous index, `old`, while that page's new blocks load.
 */
function publishedCMS(stale: Set<string>) {
  const fetched: string[] = [];
  const cms = {
    forRelease() {
      let pinned: string | undefined;
      return {
        routes: async () => [ROUTES, null] as const,
        prefetch(name: string) {
          fetched.push(name);
          pinned ??= stale.has(name) ? "old" : "new";
        },
        revision: async () => (pinned ??= "new"),
      };
    },
  } as unknown as Parameters<typeof purgeVersions>[0];
  return { cms, fetched };
}

test("a page pinned to the previous index is dropped under both revisions", async () => {
  const { cms, fetched } = publishedCMS(new Set(["pages-pdp"]));
  const url = new URL("https://shop.example/products/capy-tee");
  assert.deepEqual(await purgeVersions(cms, "build", url), ["build.old", "build.new"]);
  assert.deepEqual(fetched, ["pages-pdp"]);
});

test("a page on the current index is dropped under it once", async () => {
  const { cms } = publishedCMS(new Set(["pages-pdp"]));
  const url = new URL("https://shop.example/");
  assert.deepEqual(await purgeVersions(cms, "build", url), ["build.new"]);
});

test("a path no page matches is dropped under the current revision", async () => {
  const { cms, fetched } = publishedCMS(new Set(["pages-pdp"]));
  const url = new URL("https://shop.example/nowhere");
  assert.deepEqual(await purgeVersions(cms, "build", url), ["build.new"]);
  assert.deepEqual(fetched, []);
});
