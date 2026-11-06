import assert from "node:assert/strict";
import { test } from "node:test";
import { STUDIO_ORIGIN } from "@decocms/tanstack";
import { cspDirectives } from "./csp";

const scriptSrc = (directives: string[]) =>
  directives
    .find((d) => d.startsWith("script-src "))
    ?.split(" ")
    .slice(1) ?? [];

test("script-src allows Studio's origin, so Studio's site editor can load its modules in the page", () => {
  const env = process.env.DECO_STUDIO_ORIGIN;
  delete process.env.DECO_STUDIO_ORIGIN;
  try {
    assert.ok(scriptSrc(cspDirectives()).includes(STUDIO_ORIGIN));
    process.env.DECO_STUDIO_ORIGIN = "http://localhost:4000";
    const local = scriptSrc(cspDirectives());
    assert.ok(local.includes("http://localhost:4000"));
    assert.ok(!local.includes(STUDIO_ORIGIN));
  } finally {
    if (env === undefined) delete process.env.DECO_STUDIO_ORIGIN;
    else process.env.DECO_STUDIO_ORIGIN = env;
  }
});

test("the site's own script sources are kept", () => {
  const src = scriptSrc(cspDirectives("https://studio.example"));
  for (const s of [
    "'self'",
    "'unsafe-inline'",
    "cdn.shopify.com",
    "analytics.decocdn.com",
    "https://studio.example",
  ]) {
    assert.ok(src.includes(s), s);
  }
});
