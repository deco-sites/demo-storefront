import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutPoweredBy, type FetchWorker } from "./withoutPoweredBy";

const POWERED_BY = "deco@7.20.7";

/** Wraps a worker whose fetch always returns `response`. */
const wrap = (response: Response) =>
  withoutPoweredBy({ fetch: () => response } as unknown as FetchWorker);

const get = (worker: FetchWorker, url = "https://example.com/") =>
  worker.fetch(new Request(url), undefined as never, undefined as never);

test("normal page response comes back without x-powered-by", async () => {
  const response = await get(
    wrap(
      new Response("<html>ok</html>", {
        headers: { "content-type": "text/html", "x-powered-by": POWERED_BY },
      }),
    ),
  );

  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html");
  assert.equal(await response.text(), "<html>ok</html>");
});

test("404 response comes back without x-powered-by", async () => {
  const response = await get(
    wrap(
      new Response("not found", {
        status: 404,
        statusText: "Not Found",
        headers: { "x-powered-by": POWERED_BY },
      }),
    ),
    "https://example.com/does-not-exist",
  );

  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.status, 404);
  assert.equal(response.statusText, "Not Found");
});

test("500 response comes back without x-powered-by", async () => {
  const response = await get(
    wrap(new Response("boom", { status: 500, headers: { "x-powered-by": POWERED_BY } })),
  );

  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.status, 500);
});

test("streamed SSR response is stripped and stays streamed", async () => {
  let push: (chunk: string) => void = () => {};
  let close: () => void = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      push = (chunk) => controller.enqueue(encoder.encode(chunk));
      close = () => controller.close();
    },
  });

  const response = await get(wrap(new Response(body, { headers: { "x-powered-by": POWERED_BY } })));

  // Header is already gone before any chunk is produced — i.e. the wrapper
  // did not buffer the body waiting for the stream to finish.
  assert.equal(response.headers.get("x-powered-by"), null);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  push("<html>");
  assert.equal(decoder.decode((await reader.read()).value), "<html>");
  push("</html>");
  assert.equal(decoder.decode((await reader.read()).value), "</html>");
  close();
  assert.equal((await reader.read()).done, true);
});

test("bodyless 304 response is stripped without throwing", async () => {
  const response = await get(
    wrap(new Response(null, { status: 304, headers: { "x-powered-by": POWERED_BY } })),
  );

  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.status, 304);
  assert.equal(response.body, null);
});

test("header is matched case-insensitively", async () => {
  const response = await get(wrap(new Response("ok", { headers: { "X-Powered-By": POWERED_BY } })));

  assert.equal(response.headers.get("x-powered-by"), null);
});

test("response without the header is passed through untouched", async () => {
  const original = new Response("ok", { headers: { "content-type": "text/plain" } });
  const response = await get(wrap(original));

  assert.equal(response, original);
});

test("websocket upgrade responses are passed through untouched", async () => {
  const original = { headers: new Headers(), webSocket: {} } as unknown as Response;
  const response = await get(withoutPoweredBy({ fetch: () => original } as unknown as FetchWorker));

  assert.equal(response, original);
});

test("other worker properties are preserved by the wrapper", async () => {
  const worker = { fetch: () => new Response("ok"), scheduled: () => {} };
  const wrapped = withoutPoweredBy(worker as unknown as FetchWorker) as typeof worker;

  assert.equal(typeof wrapped.scheduled, "function");
});
