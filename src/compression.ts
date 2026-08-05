/**
 * Response compression for text payloads.
 *
 * Cloudflare only compresses on our behalf in some paths — HTML/JSON/JS/CSS
 * responses produced by the worker were going out uncompressed even when the
 * browser advertised `Accept-Encoding: gzip`. This wrapper compresses text
 * responses in the worker itself with `CompressionStream`, which is available
 * in the Workers runtime.
 *
 * Only gzip/deflate are supported for compression by the runtime (there is no
 * brotli CompressionStream), so gzip is what we negotiate.
 */
// Minimal shape of a Workers module handler — kept local so this file does not
// depend on the generated Cloudflare ambient types.
type WorkerLike = {
  fetch: (
    request: Request,
    env: never,
    ctx: never,
  ) => Response | Promise<Response>;
};

const COMPRESSIBLE = [
  "text/",
  "application/json",
  "application/javascript",
  "application/xml",
  "application/manifest+json",
  "application/ld+json",
  "image/svg+xml",
  "+json",
  "+xml",
];

// Below this size the gzip framing overhead is not worth the CPU. Responses
// without a Content-Length (streamed HTML) are always compressed.
const MIN_BYTES = 512;

const acceptsGzip = (request: Request) =>
  /(^|,)\s*gzip\s*(;|,|$)/i.test(request.headers.get("accept-encoding") ?? "");

const isCompressible = (response: Response) => {
  if (!response.body) return false;
  if (response.status === 204 || response.status === 304) return false;
  if (response.headers.has("content-encoding")) return false;

  const cacheControl = response.headers.get("cache-control") ?? "";
  if (cacheControl.includes("no-transform")) return false;

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!COMPRESSIBLE.some((type) => contentType.includes(type))) return false;

  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > 0 && length < MIN_BYTES) return false;

  return true;
};

const appendVary = (headers: Headers) => {
  const vary = headers.get("vary");
  if (!vary) return headers.set("vary", "Accept-Encoding");
  if (/(^|,)\s*(\*|accept-encoding)\s*(,|$)/i.test(vary)) return;
  headers.set("vary", `${vary}, Accept-Encoding`);
};

const compress = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("content-encoding", "gzip");
  // The compressed body has a different length than the declared one.
  headers.delete("content-length");
  appendVary(headers);

  return new Response(response.body!.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/** Wraps a worker so its text responses are gzipped when the client asks. */
export const withCompression = <T extends WorkerLike>(worker: T): T => ({
  ...worker,
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const response = await worker.fetch(request, env as never, ctx as never);

    if (!acceptsGzip(request) || !isCompressible(response)) {
      // Still tell caches the response varies by encoding, so a plain body
      // isn't reused for a client that would have gotten a gzipped one.
      if (response.body) {
        const headers = new Headers(response.headers);
        appendVary(headers);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
      return response;
    }

    return compress(response);
  },
});
