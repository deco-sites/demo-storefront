/**
 * Response compression for the storefront worker.
 *
 * Responses were leaving the origin uncompressed (`Accept-Encoding: br, gzip`
 * in, no `content-encoding` out), so every HTML/JSON/CSS/JS payload was
 * transferred raw. This wraps the worker's `fetch` and pipes textual bodies
 * through the runtime's native `CompressionStream`, which keeps SSR streaming
 * intact (no buffering — the stream is piped, not awaited).
 *
 * `br` is only used when the runtime's `CompressionStream` actually supports
 * it; otherwise we fall back to `gzip`, which every `fetch` runtime (workerd,
 * Deno, Node) implements.
 */

/** Content types worth compressing — text and text-ish payloads only. */
const COMPRESSIBLE = [
  "text/",
  "application/json",
  "application/ld+json",
  "application/javascript",
  "application/manifest+json",
  "application/xml",
  "application/rss+xml",
  "application/atom+xml",
  "image/svg+xml",
];

const supports = (format: string): boolean => {
  try {
    new CompressionStream(format as CompressionFormat);
    return true;
  } catch {
    return false;
  }
};

// Probed once at module load — the set of formats never changes at runtime.
const BROTLI_SUPPORTED = supports("br");

const isCompressible = (contentType: string | null): boolean => {
  if (!contentType) return false;
  const type = contentType.toLowerCase();
  return COMPRESSIBLE.some((prefix) => type.startsWith(prefix));
};

/** Picks `br` (when available) then `gzip` from the client's Accept-Encoding. */
const negotiate = (acceptEncoding: string | null): "br" | "gzip" | null => {
  if (!acceptEncoding) return null;
  const accepted = acceptEncoding
    .toLowerCase()
    .split(",")
    .map((part) => {
      const [name, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { name: name.trim(), q: q === undefined ? 1 : Number(q) };
    })
    .filter(({ name, q }) => name.length > 0 && !Number.isNaN(q) && q > 0);

  const has = (name: string) => accepted.some((e) => e.name === name);

  if (BROTLI_SUPPORTED && has("br")) return "br";
  if (has("gzip")) return "gzip";
  return null;
};

export interface FetchWorker {
  fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

/**
 * Wraps a worker so textual responses come back compressed, always advertising
 * `Vary: Accept-Encoding` so caches/CDNs key on the negotiated encoding.
 *
 * Skipped when: the response has no body, is a WebSocket upgrade, is already
 * encoded (a CDN/proxy got there first), is a 204/304, or the content type is
 * not textual.
 */
export const withCompression = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, env: never, ctx: never) => {
    const response = await worker.fetch(request, env, ctx);

    if ("webSocket" in response && response.webSocket) return response;

    const alreadyEncoded = response.headers.has("content-encoding");
    const bodyless = !response.body || response.status === 204 || response.status === 304;
    const encoding = negotiate(request.headers.get("accept-encoding"));

    if (
      alreadyEncoded ||
      bodyless ||
      !encoding ||
      !isCompressible(response.headers.get("content-type"))
    ) {
      // Still advertise the vary so a cached uncompressed entry is not served
      // to a client that would have gotten a compressed one.
      const varied = new Response(response.body, response);
      appendVary(varied.headers);
      return varied;
    }

    const compressed = response.body!.pipeThrough(
      new CompressionStream(encoding as CompressionFormat),
    );

    const headers = new Headers(response.headers);
    headers.set("content-encoding", encoding);
    // Length no longer matches the encoded body, and the encoded size is
    // unknown up front (streaming).
    headers.delete("content-length");
    appendVary(headers);

    return new Response(compressed, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
});

const appendVary = (headers: Headers): void => {
  const vary = headers.get("vary");
  if (!vary) {
    headers.set("vary", "Accept-Encoding");
    return;
  }
  const present = vary
    .split(",")
    .some((v) => v.trim().toLowerCase() === "accept-encoding" || v.trim() === "*");
  if (!present) headers.set("vary", `${vary}, Accept-Encoding`);
};
