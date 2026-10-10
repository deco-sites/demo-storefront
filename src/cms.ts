/**
 * The CMS, created once at module scope (/next/content#create-the-cms), and the client every request
 * reads content with (/next/tanstack-start-descriptors#2-create-the-cms).
 *
 * With `DECO_SITE` and `DECO_SITE_TOKEN` set, it serves releases published in the hosted Deco CMS
 * without a deploy (/next/hosted#cloudflare-workers); without them it serves the content module, the
 * content of the commit this build was made from. Drafts need neither: `cms.forDraft` fetches what
 * the draft's branch changed from the Studio the pointer names (/next/hosted-drafts).
 */
import { createCMS, parseDraftPointer } from "@decocms/blocks";
import { env } from "cloudflare:workers";
import blocks from "../.deco";
import content from "../.deco/blocks.gen";

// The token needs the site (createCMS throws on a token alone), and hosted releases stay off until
// both are set, as before.
const hosted = Boolean(env.DECO_SITE && env.DECO_SITE_TOKEN);
const site = hosted ? (env.DECO_SITE as string) : undefined;
const token = hosted ? (env.DECO_SITE_TOKEN as string) : undefined;

/** `k1=v1,k2=v2` with URL-encoded values, the format of `OTEL_EXPORTER_OTLP_HEADERS`. */
const otlpHeaders = (raw: string | undefined) => {
  const headers: Record<string, string> = {};
  for (const pair of raw?.split(",") ?? []) {
    const at = pair.indexOf("=");
    if (at <= 0) continue;
    try {
      headers[decodeURIComponent(pair.slice(0, at).trim())] = decodeURIComponent(
        pair.slice(at + 1).trim(),
      );
    } catch {
      // A malformed pair is skipped.
    }
  }
  return headers;
};

const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT as string | undefined;

/**
 * v7's telemetry identity (/next/telemetry): `service.name` from DECO_SITE_NAME, the environment from
 * DECO_ENV_NAME and `service.version` from the Workers version (the `CF_VERSION_METADATA` binding),
 * as v7's `instrumentWorker` set them. Unset values keep the SDK's defaults.
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
  // `vite dev` keeps local files even with hosted releases on. Releases of @decocms/blocks after
  // 8.1.0-next.7 take it from here instead of reading NODE_ENV; earlier ones ignore it.
  dev: import.meta.env.DEV,
  // The hosted collector when the site is connected (the token sends there); otherwise the standard
  // OTEL_EXPORTER_OTLP_ENDPOINT/HEADERS, if set (/next/telemetry#choose-where-telemetry-goes). The SDK
  // reads no environment variables, so the site passes them. `vite dev` sends nothing, so local work
  // never reaches the production collector wrangler.jsonc points at.
  ...(import.meta.env.DEV
    ? { telemetry: false as const }
    : hosted || !otlpEndpoint
      ? { telemetry: { resource } }
      : {
          telemetry: {
            endpoint: otlpEndpoint,
            headers: otlpHeaders(env.OTEL_EXPORTER_OTLP_HEADERS as string | undefined),
            resource,
          },
        }),
};

export const cms = createCMS({ ...options, content });

// In `vite dev`, `deco serve` (the site editor's local server) rewrites the content module on every
// save. The new content goes into the same CMS (createCMS adopts it for the same content root), so
// this module stays as it is: re-running it made the first request after each save fail with
// "client is not a function" from a server function still holding the old module.
if (import.meta.hot) {
  import.meta.hot.accept("../.deco/blocks.gen", (next) => {
    if (next) createCMS({ ...options, content: next.default });
  });
}

/**
 * The client for this request: the draft a `?__draft=` link or the draft cookie points at, or the
 * release. On a host outside the `CMS` block's preview hosts the draft is ignored and the request
 * gets the release (/next/releases-and-drafts#allow-previews-per-host).
 */
export const client = async (request: Request) => {
  const pointer = await draftPointer(request);
  return pointer ? cms.forDraft(pointer) : cms.forRelease();
};

/**
 * The draft this request previews, or null. A pointer that doesn't parse (`?__draft=junk`) is no
 * draft: `cms.forDraft` would throw on it and answer 500.
 */
export const draftPointer = async (request: Request) => {
  const pointer = await cms.draftPointer(request);
  return pointer && parseDraftPointer(pointer) !== null ? pointer : null;
};
