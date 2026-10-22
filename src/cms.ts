/**
 * The CMS, created once at module scope (/next/content#create-the-cms), and the client every request
 * reads content with (/next/tanstack-start-descriptors#2-create-the-cms).
 *
 * With `DECO_SITE` and `DECO_SITE_TOKEN` set, it serves releases published in the hosted Deco CMS
 * without a deploy (/next/hosted#cloudflare-workers); without them it serves the content module, the
 * content of the commit this build was made from. Drafts need neither: `cms.client({ version })` with a draft pointer
 * fetches what the draft's branch changed from the Studio the pointer names (/next/hosted-drafts).
 */
import { createCMS } from "@decocms/blocks";
import { contentClient } from "@decocms/tanstack/server";
import { env } from "cloudflare:workers";
import blocks from "../.deco";
import content from "../.deco/blocks.gen";

// The token needs the site (createCMS throws on a token alone), and hosted releases stay off until
// both are set, as before.
const hosted = Boolean(env.DECO_SITE && env.DECO_SITE_TOKEN);
const site = hosted ? (env.DECO_SITE as string) : undefined;
const token = hosted ? (env.DECO_SITE_TOKEN as string) : undefined;

/**
 * The telemetry identity (/next/telemetry): `service.name` from DECO_SITE_NAME, the environment from
 * DECO_ENV_NAME and `service.version` from the Workers version (the `CF_VERSION_METADATA` binding).
 * Unset values keep the SDK's defaults.
 */
const resource = Object.fromEntries(
  Object.entries({
    "service.name": env.DECO_SITE_NAME as string | undefined,
    "deployment.environment.name": env.DECO_ENV_NAME as string | undefined,
    "service.version": (env.CF_VERSION_METADATA as { id?: string } | undefined)?.id,
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""),
);

const options = {
  blocks,
  site,
  token,
  // `vite dev` keeps local files even with hosted releases on. The SDK reads no NODE_ENV; it takes
  // local development from this option.
  dev: import.meta.env.DEV,
  // Telemetry goes to the hosted Deco CMS collector, which the token authenticates
  // (/next/telemetry#choose-where-telemetry-goes); without a token it goes nowhere. `vite dev` sends
  // nothing.
  telemetry: import.meta.env.DEV ? (false as const) : { resource },
};

export const cms = createCMS({ ...options, content });

/**
 * The client for this request, `cms.client` built from what the worker decided at the edge
 * (`createDecoWorker` checks the host and hands the app the version in `x-deco-version`, the visitor
 * in `x-deco-visitor` and each test and campaign on or off in `x-deco-assignments`): the page decides
 * nothing again, so it renders exactly what the page cache keyed on.
 */
export const client = async (request: Request) => contentClient(cms, request);
