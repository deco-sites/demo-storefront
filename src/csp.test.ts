import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_STUDIO_ORIGINS, withStudioCsp } from "@decocms/tanstack";
import { CSP_DIRECTIVES } from "./csp";

const sources = (directives: readonly string[], name: string) =>
  directives
    .find((d) => d.startsWith(`${name} `))
    ?.split(" ")
    .slice(1) ?? [];

/** Runs `fn` with `DECO_STUDIO_ORIGIN` set to `value` (unset when undefined). */
function withEnv(value: string | undefined, fn: () => void) {
  const env = process.env.DECO_STUDIO_ORIGIN;
  if (value === undefined) delete process.env.DECO_STUDIO_ORIGIN;
  else process.env.DECO_STUDIO_ORIGIN = value;
  try {
    fn();
  } finally {
    if (env === undefined) delete process.env.DECO_STUDIO_ORIGIN;
    else process.env.DECO_STUDIO_ORIGIN = env;
  }
}

test("the site's policy names no Studio origin: the binding adds them", () => {
  for (const origin of DEFAULT_STUDIO_ORIGINS) {
    assert.ok(!CSP_DIRECTIVES.join("; ").includes(origin), origin);
  }
  assert.ok(!CSP_DIRECTIVES.some((d) => d.startsWith("frame-ancestors ")));
});

test("as the worker sends it, script-src allows Studio's production and staging origins, so the editor's modules load", () => {
  withEnv(undefined, () => {
    const policy = withStudioCsp(CSP_DIRECTIVES);
    const script = sources(policy, "script-src");
    for (const origin of DEFAULT_STUDIO_ORIGINS) {
      assert.ok(script.includes(origin), origin);
      assert.ok(sources(policy, "frame-ancestors").includes(origin), origin);
    }
  });
});

test("DECO_STUDIO_ORIGIN replaces Studio's origins in script-src (a local Studio)", () => {
  withEnv("http://localhost:4000", () => {
    const script = sources(withStudioCsp(CSP_DIRECTIVES), "script-src");
    assert.ok(script.includes("http://localhost:4000"));
    for (const origin of DEFAULT_STUDIO_ORIGINS) {
      assert.ok(!script.includes(origin), origin);
    }
  });
});

test("the site's own script sources and other directives are kept", () => {
  withEnv(undefined, () => {
    const policy = withStudioCsp(CSP_DIRECTIVES);
    const script = sources(policy, "script-src");
    for (const s of [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "cdn.shopify.com",
      "*.shopify.com",
      "analytics.decocdn.com",
    ]) {
      assert.ok(script.includes(s), s);
    }
    for (const directive of CSP_DIRECTIVES) {
      if (directive.startsWith("script-src ")) continue;
      assert.ok(policy.includes(directive), directive);
    }
  });
});
