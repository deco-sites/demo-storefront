import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutPoweredBy, type FetchWorker } from "./withoutPoweredBy";

/** Builds a worker whose fetch returns `response`. */
const workerReturning = (response: Response): FetchWorker => ({
  fetch: () => response,
});

const call = (worker: FetchWorker, request = new Request("https://example.com/")) =>
  withoutPoweredBy(worker).fetch(request, undefined as never, undefined as never);

test("removes x-powered-by from the response", async () => {
  const response = await call(
    workerReturning(
      new Response("<html></html>", {
        headers: { "content-type": "text/html", "x-powered-by": "deco@7.20.7" },
      }),
    ),
  );

  assert.equal(response.headers.has("x-powered-by"), false);
  assert.equal(response.headers.get("content-type"), "text/html");
  assert.equal(await response.text(), "<html></html>");
});

test("removes x-powered-by regardless of header name casing", async () => {
  const response = await call(
    workerReturning(new Response("ok", { headers: { "X-Powered-By": "deco@7.20.7" } })),
  );

  assert.equal(response.headers.has("x-powered-by"), false);
});

test("preserves status, statusText and other headers", async () => {
  const response = await call(
    workerReturning(
      new Response("nope", {
        status: 404,
        statusText: "Not Found",
        headers: { "x-powered-by": "deco@7.20.7", "cache-control": "no-store" },
      }),
    ),
  );

  assert.equal(response.status, 404);
  assert.equal(response.statusText, "Not Found");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.has("x-powered-by"), false);
});

test("passes through responses that have no x-powered-by untouched", async () => {
  const original = new Response("ok");
  const response = await call(workerReturning(original));

  assert.equal(response, original);
});

test("passes through bodyless responses (redirects, 204)", async () => {
  for (const original of [
    new Response(null, { status: 204, headers: { "x-powered-by": "deco@7.20.7" } }),
    new Response(null, {
      status: 302,
      headers: { location: "/other", "x-powered-by": "deco@7.20.7" },
    }),
  ]) {
    const response = await call(workerReturning(original));
    assert.equal(response.headers.has("x-powered-by"), false);
    assert.equal(response.status, original.status);
  }
});

test("does not reconstruct WebSocket upgrade responses", async () => {
  // Cloudflare returns a 101 with a `webSocket` property; `new Response` can't
  // reproduce it, so the wrapper must hand it back as-is.
  const original = new Response(null, { headers: { "x-powered-by": "deco@7.20.7" } });
  Object.defineProperty(original, "webSocket", { value: {}, enumerable: true });

  const response = await call(workerReturning(original));

  assert.equal(response, original);
});

test("keeps streamed bodies flowing", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("chunk-1"));
      controller.close();
    },
  });
  const response = await call(
    workerReturning(new Response(stream, { headers: { "x-powered-by": "deco@7.20.7" } })),
  );

  assert.equal(response.headers.has("x-powered-by"), false);
  assert.equal(await response.text(), "chunk-1");
});

test("preserves other worker properties (scheduled handlers etc.)", () => {
  const scheduled = () => {};
  const wrapped = withoutPoweredBy({ fetch: () => new Response("ok"), scheduled });

  assert.equal(wrapped.scheduled, scheduled);
});
