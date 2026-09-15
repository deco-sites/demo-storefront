/**
 * Strips `x-powered-by` from every worker response.
 *
 * The framework stamps the exact platform version (e.g. `deco@7.20.7`) on
 * outgoing responses, which hands an attacker a precise version to match
 * against known CVEs. The header has no functional purpose for clients, so we
 * drop it entirely rather than ofuscate it — a masked value would still
 * advertise the framework.
 *
 * Applied in `src/worker-entry.ts` as the layer just inside `instrumentWorker`
 * (which adds no response headers of its own), so it sees the final headers of
 * every route: pages, 404/500 errors, streamed SSR and API responses alike.
 *
 * Lives in its own module so it can be unit tested without importing the whole
 * worker entry (which boots OTel, the admin protocol and the Shopify apps).
 */

/** Minimal shape of a Cloudflare worker module — just the fetch handler. */
export interface FetchWorker {
  fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

export const withoutPoweredBy = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, env: never, ctx: never) => {
    const response = await worker.fetch(request, env, ctx);

    // WebSocket upgrades can't be reconstructed; and when the header is
    // absent there is nothing to strip, so avoid the copy entirely.
    if (("webSocket" in response && response.webSocket) || !response.headers.has("x-powered-by")) {
      return response;
    }

    // `new Response(body, response)` keeps status, statusText and headers and
    // passes the body through by reference, so streamed responses stay
    // streamed (no buffering) and null-body statuses (204/304) stay bodyless.
    const stripped = new Response(response.body, response);
    stripped.headers.delete("x-powered-by");
    return stripped;
  },
});
