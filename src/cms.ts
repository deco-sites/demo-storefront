/**
 * The CMS, created once at module scope (/next/content#create-the-cms), and the client every request
 * reads content with (/next/tanstack-start-descriptors#2-create-the-cms).
 *
 * Content is never bundled: it serves the release published in Studio for the site `DECO_SITE` names,
 * fetched from the delivery CDN at runtime, and follows each publish without a deploy
 * (/next/hosted#cloudflare-workers). Drafts too: `cms.client({ version })` with a draft pointer
 * layers what the draft changed over that release (/next/hosted-drafts).
 */
import { createCMS } from "@decocms/blocks";
import { contentClient } from "@decocms/tanstack/server";
import { env } from "cloudflare:workers";
import blocks from "../.deco";

// The Studio site (a var in wrangler.jsonc). The token is optional: it only authenticates telemetry.
const site = env.DECO_SITE as string;
const token = (env.DECO_SITE_TOKEN as string | undefined) || undefined;

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

/**
 * The sample rates when the `CMS` block's telemetry section saves none (/next/telemetry#sampling):
 * every CMS error log, so Studio's Monitor › Logs lists each one instead of 5%. Traces stay off (the
 * built-in 0). A rate saved in the `CMS` block in Studio wins over these.
 */
const defaults = { errorSampleRate: 1 };

const options = {
  blocks,
  site,
  token,
  // Telemetry goes to the hosted Deco CMS collector, which the token authenticates
  // (/next/telemetry#choose-where-telemetry-goes); without a token it goes nowhere. `vite dev` sends
  // nothing.
  telemetry: import.meta.env.DEV ? (false as const) : { resource, defaults },
};

export const cms = createCMS(options);

/**
 * The client for this request, `cms.client` built from what the worker decided at the edge
 * (`createDecoWorker` checks the host and hands the app the version in `x-deco-version`, the visitor
 * in `x-deco-visitor` and each test and campaign on or off in `x-deco-assignments`): the page decides
 * nothing again, so it renders exactly what the page cache keyed on.
 */
export const client = async (request: Request) => contentClient(cms, request);
