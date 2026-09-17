import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cmsHomeRouteConfig } from "@decocms/tanstack";
import { HOME_SEO_OPTIONS, withOgUrl } from "./homeHead";
import { SITE_DESCRIPTION } from "../constants";

// Mirrors the wiring in src/routes/index.tsx.
const base = cmsHomeRouteConfig(HOME_SEO_OPTIONS) as {
  head: (ctx: { loaderData?: unknown }) => { meta?: Record<string, string>[] };
};
const homeHead = (loaderData?: unknown) =>
  withOgUrl(base.head({ loaderData }), (loaderData as { pageUrl?: string })?.pageUrl);

const descriptions = (meta: Record<string, string>[] = []) =>
  meta.filter((tag) => tag.name === "description");

describe("home route head — meta description", () => {
  it("emits the CMS SEO description exactly once", () => {
    const meta = homeHead({
      pageUrl: "https://example.com/",
      seo: { title: "Demo", description: "Shop the new season at Demo Storefront." },
    }).meta;

    assert.deepEqual(descriptions(meta), [
      { name: "description", content: "Shop the new season at Demo Storefront." },
    ]);
  });

  it("falls back to the site description when the CMS page has no seo block", () => {
    for (const loaderData of [undefined, null, {}, { seo: {} }, { seo: { description: "" } }]) {
      assert.deepEqual(
        descriptions(homeHead(loaderData).meta),
        [{ name: "description", content: SITE_DESCRIPTION }],
        `loaderData: ${JSON.stringify(loaderData)}`,
      );
    }
  });

  it("keeps every base tag while adding og:url", () => {
    const loaderData = { pageUrl: "https://example.com/", seo: { description: "d" } };
    const baseMeta = base.head({ loaderData }).meta ?? [];
    const meta = homeHead(loaderData).meta ?? [];

    assert.deepEqual(meta.slice(0, baseMeta.length), baseMeta);
    assert.ok(meta.some((t) => t.property === "og:url" && t.content === "https://example.com/"));
  });
});
