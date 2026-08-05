/**
 * Response compression for the Cloudflare Worker.
 *
 * Text responses (HTML, JSON, JS, CSS, SVG, RSC/streaming payloads) were being
 * served uncompressed even when the browser sent `Accept-Encoding`, which
 * inflates transfer size. This wraps the worker's fetch handler and pipes
 * eligible bodies through `CompressionStream`, which is available in the
 * Workers runtime.
 *
 * gzip is used (not brotli) because `CompressionStream` only supports
 * `gzip`/`deflate`; brotli would need a userland WASM encoder. `Accept-Encoding`
 * is honoured, so a client that only advertises brotli gets the plain body.
 */

interface FetchWorker {
  // eslint-disable-next-line
  fetch: (request: Request, env: any, ctx: ExecutionContext) => Response | Promise<Response>;
}

const COMPRESSIBLE_TYPE =
  /^(?:text\/|application\/(?:json|manifest\+json|ld\+json|javascript|xml|rss\+xml|atom\+xml|xhtml\+xml)|image\/svg\+xml)/i;

/** Below this, framing overhead outweighs the savings. */
const MIN_BYTES = 1024;

const acceptsGzip = (request: Request): boolean =>
  /(^|,)\s*gzip\s*(;|,|$)/i.test(request.headers.get("accept-encoding") ?? "");

const isCompressible = (response: Response): boolean => {
  // Already encoded upstream (or explicitly `identity`) — leave it alone.
  if (response.headers.has("content-encoding")) return false;
  if (!response.body) return false;
  // 204/304 and friends carry no body; range responses must not be re-framed.
  if (response.status === 204 || response.status === 304 || response.status === 206) {
    return false;
  }
  // Proxies/CDNs are told not to alter the payload.
  if (/\bno-transform\b/i.test(response.headers.get("cache-control") ?? "")) return false;

  if (!COMPRESSIBLE_TYPE.test(response.headers.get("content-type") ?? "")) return false;

  const length = Number(response.headers.get("content-length"));
  // Streamed responses have no content-length — those are the HTML/RSC
  // payloads we most want compressed, so only skip when we know it's tiny.
  if (Number.isFinite(length) && length > 0 && length < MIN_BYTES) return false;

  return true;
};

const compress = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("content-encoding", "gzip");
  headers.delete("content-length");
  // Cached/shared copies must key on the negotiated encoding.
  const vary = headers.get("vary");
  if (!vary) {
    headers.set("vary", "Accept-Encoding");
  } else if (!/\baccept-encoding\b/i.test(vary)) {
    headers.set("vary", `${vary}, Accept-Encoding`);
  }

  return new Response(response.body!.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/** Wraps a worker so eligible text responses are gzip-encoded. */
export const withCompression = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  async fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    const response = await worker.fetch(request, env, ctx);

    if (!acceptsGzip(request) || !isCompressible(response)) return response;

    return compress(response);
  },
});
