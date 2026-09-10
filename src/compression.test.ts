import assert from "node:assert/strict";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import { withCompression, type FetchWorker } from "./compression";

const worker = (
  body: BodyInit | null,
  headers: Record<string, string>,
  status = 200,
): FetchWorker => ({
  fetch: () => new Response(body, { status, headers }),
});

const request = (acceptEncoding?: string) =>
  new Request("https://example.com/", {
    headers: acceptEncoding ? { "accept-encoding": acceptEncoding } : {},
  });

const HTML = `<html>${"hello ".repeat(500)}</html>`;

/** Streaming body, as produced by the SSR stream handler. */
const streamOf = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

test("compresses streamed HTML and keeps the payload intact", async () => {
  const response = await withCompression(
    worker(streamOf(HTML), { "content-type": "text/html; charset=utf-8" }),
  ).fetch(request("br, gzip"), undefined as never, undefined as never);

  // Node's CompressionStream has no brotli, so `gzip` is the negotiated result.
  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("vary"), "Accept-Encoding");

  const encoded = Buffer.from(await response.arrayBuffer());
  assert.ok(encoded.length < HTML.length);
  assert.equal(gunzipSync(encoded).toString(), HTML);
});

test("compresses JSON and drops the now-wrong content-length", async () => {
  const body = JSON.stringify({ a: "x".repeat(2000) });
  const response = await withCompression(
    worker(body, { "content-type": "application/json", "content-length": String(body.length) }),
  ).fetch(request("gzip"), undefined as never, undefined as never);

  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(response.headers.get("content-length"), null);
});

test("leaves binary content types untouched but still varies", async () => {
  const response = await withCompression(worker("binary", { "content-type": "image/png" })).fetch(
    request("br, gzip"),
    undefined as never,
    undefined as never,
  );

  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(response.headers.get("vary"), "Accept-Encoding");
  assert.equal(await response.text(), "binary");
});

test("does nothing when the client accepts no supported encoding", async () => {
  for (const accept of [undefined, "identity", "br;q=0"]) {
    const response = await withCompression(worker(HTML, { "content-type": "text/css" })).fetch(
      request(accept),
      undefined as never,
      undefined as never,
    );
    assert.equal(response.headers.get("content-encoding"), null);
    assert.equal(await response.text(), HTML);
  }
});

test("never double-compresses an already encoded response", async () => {
  const response = await withCompression(
    worker(HTML, { "content-type": "text/html", "content-encoding": "gzip" }),
  ).fetch(request("gzip"), undefined as never, undefined as never);

  assert.equal(response.headers.get("content-encoding"), "gzip");
  assert.equal(await response.text(), HTML);
});

test("keeps bodyless responses bodyless and appends to an existing vary", async () => {
  const response = await withCompression(
    worker(null, { "content-type": "text/html", vary: "Cookie" }, 304),
  ).fetch(request("gzip"), undefined as never, undefined as never);

  assert.equal(response.status, 304);
  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(response.headers.get("vary"), "Cookie, Accept-Encoding");
});
