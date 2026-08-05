/**
 * Response compression for text payloads.
 *
 * The worker was serving HTML/JS/CSS/JSON uncompressed, so downloads were
 * larger than they need to be. This wraps the worker's fetch handler and pipes
 * compressible responses through `CompressionStream` when the client advertises
 * support. Cloudflare Workers' `CompressionStream` implements gzip and deflate
 * (no brotli), so gzip is the encoding we negotiate.
 *
 * Streaming is preserved: the body is piped, never buffered.
 */

const COMPRESSIBLE_TYPE =
  /^(?:text\/|application\/(?:json|manifest\+json|ld\+json|javascript|xml|xhtml\+xml|rss\+xml|atom\+xml|wasm)|image\/svg\+xml)/i;

/** Below this many bytes the gzip framing overhead outweighs the savings. */
const MIN_BYTES = 1024;

const acceptsGzip = (accepted: string | null): boolean => {
  if (!accepted) return false;
  return accepted
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => {
      const [encoding, ...params] = part.split(";").map((p) => p.trim());
      if (encoding !== "gzip" && encoding !== "*") return false;
      // `gzip;q=0` is an explicit refusal.
      return !params.some((p) => p.replace(/\s/g, "") === "q=0" || p.startsWith("q=0."));
    });
};

const isCompressible = (response: Response): boolean => {
  if (!response.body) return false;
  // 204/304 have no body to compress; 206 must keep byte ranges intact.
  if (response.status === 204 || response.status === 304 || response.status === 206) return false;
  if (response.headers.has("content-encoding")) return false;
  // Server-sent events rely on immediate per-chunk delivery.
  const type = response.headers.get("content-type") ?? "";
  if (type.startsWith("text/event-stream")) return false;
  if (!COMPRESSIBLE_TYPE.test(type)) return false;

  const length = response.headers.get("content-length");
  if (length !== null && Number(length) < MIN_BYTES) return false;

  return true;
};

const appendVary = (headers: Headers) => {
  const vary = headers.get("vary");
  if (!vary) {
    headers.set("vary", "Accept-Encoding");
    return;
  }
  const has = vary
    .split(",")
    .some((v) => v.trim().toLowerCase() === "accept-encoding" || v.trim() === "*");
  if (!has) headers.set("vary", `${vary}, Accept-Encoding`);
};

export const compress = (request: Request, response: Response): Response => {
  if (request.method === "HEAD") return response;

  const headers = new Headers(response.headers);

  if (!isCompressible(response)) {
    // Still signal that the representation varies, so caches don't hand a
    // compressed entry to a client that can't read it (and vice versa).
    if (COMPRESSIBLE_TYPE.test(response.headers.get("content-type") ?? "")) appendVary(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  appendVary(headers);

  if (!acceptsGzip(request.headers.get("accept-encoding"))) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  headers.set("content-encoding", "gzip");
  // Length changes once compressed, and it is unknown up front.
  headers.delete("content-length");

  return new Response(response.body!.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

type FetchHandler = { fetch: (request: Request, ...rest: any[]) => Response | Promise<Response> };

/** Wraps a worker fetch handler so its text responses are gzipped. */
export const withCompression = <T extends FetchHandler>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, ...rest: any[]) => {
    const response = await worker.fetch(request, ...rest);
    try {
      return compress(request, response);
    } catch {
      return response;
    }
  },
});
