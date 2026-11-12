import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

test("deploys preserve the managed Shopify credential and require it to exist", () => {
  const path = new URL("../wrangler.jsonc", import.meta.url);
  const { config, error } = ts.parseConfigFileTextToJson(path.pathname, readFileSync(path, "utf8"));
  assert.equal(error, undefined);
  const secret = "SHOPIFY_STOREFRONT_ACCESS_TOKEN";
  for (const settings of [config, ...Object.values(config.env ?? {})]) {
    assert.equal(
      Object.hasOwn(settings.vars ?? {}, secret),
      false,
      "A plaintext var would overwrite a rotated Worker secret on deploy",
    );
    assert.ok(
      settings.secrets?.required?.includes(secret),
      "Each deployed environment must fail if the secret is missing",
    );
  }
});
