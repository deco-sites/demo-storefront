import assert from "node:assert/strict";
import { test } from "node:test";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import type { Redirect, Route } from "@decocms/blocks";
import { openPage, type PageClient } from "./open-page.server";
import { pageState } from "./request-state.server";

const ORIGIN = "https://shop.example";

const PAGES: Record<string, unknown> = {
  "pages-home": {
    name: "Home Page",
    path: "/",
    seo: { title: "Home" },
    sections: [{ __resolveType: "Header" }, { __resolveType: "HeroScene" }],
  },
  "pages-pdp": {
    name: "Product Page",
    path: "/products/:slug",
    sections: [{ __resolveType: "ProductDetails" }],
  },
  "pages-404": { name: "Not Found Page", path: "/*", sections: [] },
};

const ROUTES: Route[] = Object.entries(PAGES)
  .map(([name, body]) => ({ name, path: (body as Route).path }))
  .sort((a, b) => (a.name < b.name ? -1 : 1));

const REDIRECTS: Redirect[] = [{ from: "/shirts", to: "/collections/the-herd", permanent: false }];

/** A client over the pages above that records every call, in order. */
function fakeClient(
  options: { routes?: Route[]; redirects?: Redirect[]; routesError?: Error } = {},
) {
  const calls: string[] = [];
  const c: PageClient = {
    routes: async () => {
      calls.push("routes");
      if (options.routesError) return [null, options.routesError] as never;
      return [options.routes ?? ROUTES, null];
    },
    prefetch: (name) => {
      calls.push(`prefetch:${name}`);
    },
    redirects: async () => {
      calls.push("redirects");
      return [options.redirects ?? REDIRECTS, null];
    },
    resolve: (async (target: unknown, opts?: { run?: boolean }) => {
      if (typeof target === "string") {
        calls.push(`resolve:${target}:${opts?.run === false ? "stored" : "run"}`);
        return [PAGES[target], null];
      }
      if (
        target &&
        typeof target === "object" &&
        "__resolveType" in target &&
        opts?.run !== false
      ) {
        // A section runs inside the page's request state.
        const { url, params } = pageState();
        return [
          {
            component: (target as { __resolveType: string }).__resolveType,
            props: { url: url.pathname, params },
          },
          null,
        ];
      }
      return [target, null];
    }) as PageClient["resolve"],
  };
  // The list API is gone from routing: a call would be a type error here, and a runtime one too.
  Object.defineProperty(c, "list", {
    value: () => {
      throw new Error("openPage must not call list()");
    },
  });
  return { c, calls };
}

const request = (path = "/") =>
  new Request(`${ORIGIN}${path}`, { headers: { "user-agent": "Mozilla/5.0 (iPhone) Mobile" } });

test("a page: routes, then its subtree is prefetched before the redirects are read, then resolved by name", async () => {
  const { c, calls } = fakeClient();
  const page = await openPage("/products/capy-tee", request(), async () => c);
  assert.deepEqual(calls, [
    "routes",
    "prefetch:pages-pdp",
    "redirects",
    "resolve:pages-pdp:stored",
  ]);
  assert.equal(page.name, "Product Page");
  assert.equal(page.url, `${ORIGIN}/products/capy-tee`);
  assert.equal(page.device, "mobile");
  assert.equal(page.blocks.length, 1);
  assert.equal(page.blocks[0]?.component, "ProductDetails");
  assert.equal(page.blocks[0]?.key, "ProductDetails-0");
  const block = await page.blocks[0]?.value;
  assert.deepEqual(block, {
    value: {
      component: "ProductDetails",
      props: { url: "/products/capy-tee", params: { slug: "capy-tee" } },
    },
    failed: false,
  });
});

test("the home page gets its SEO and the static profile", async () => {
  const { c } = fakeClient();
  const page = await openPage("/", request(), async () => c);
  assert.equal(page.name, "Home Page");
  assert.deepEqual(page.seo, { title: "Home" });
  assert.equal(page.profile, "static");
  assert.deepEqual(
    page.blocks.map((b) => b.key),
    ["Header-0", "HeroScene-1"],
  );
});

test("a redirect wins: the routed page is prefetched with the redirects block but never resolved", async () => {
  const { c, calls } = fakeClient();
  await assert.rejects(
    () => openPage("/shirts", request(), async () => c),
    (error: unknown) => {
      assert.ok(isRedirect(error));
      assert.equal(error.options.href, "/collections/the-herd");
      assert.equal(error.status, 307);
      return true;
    },
  );
  // `/shirts` also matches the catch-all page: its wave started, then the redirect answered.
  assert.deepEqual(calls, ["routes", "prefetch:pages-404", "redirects"]);
});

test("a redirect still answers when no page matches", async () => {
  const routes = ROUTES.filter((r) => r.path !== "/*");
  const { c, calls } = fakeClient({ routes });
  await assert.rejects(
    () => openPage("/shirts", request(), async () => c),
    (error: unknown) => isRedirect(error),
  );
  assert.deepEqual(calls, ["routes", "redirects"]);
});

test("no page and no redirect: not found, with nothing prefetched or resolved", async () => {
  const routes = ROUTES.filter((r) => r.path !== "/*");
  const { c, calls } = fakeClient({ routes, redirects: [] });
  await assert.rejects(
    () => openPage("/nowhere", request(), async () => c),
    (error: unknown) => isNotFound(error),
  );
  assert.deepEqual(calls, ["routes", "redirects"]);
});

test("a routes error is thrown", async () => {
  const failure = new Error("index unavailable");
  const { c, calls } = fakeClient({ routesError: failure });
  await assert.rejects(() => openPage("/", request(), async () => c), failure);
  assert.deepEqual(calls, ["routes"]);
});

test("an href on another origin is not found before any content is read", async () => {
  let asked = false;
  await assert.rejects(
    () =>
      openPage("//evil.example/x", request(), async () => {
        asked = true;
        return fakeClient().c;
      }),
    (error: unknown) => isNotFound(error),
  );
  assert.equal(asked, false);
});
