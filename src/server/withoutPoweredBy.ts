/**
 * Strip `x-powered-by` from every response.
 *
 * The framework stamps the exact platform version (e.g. `deco@7.20.7`) on
 * outgoing responses, which hands an attacker a precise version to match
 * against known CVEs. The header has no functional purpose for clients, so we
 * drop it entirely rather than ofuscate it.
 *
 * Lives in its own module so the behaviour can be unit tested without booting
 * the whole worker (see `withoutPoweredBy.test.ts`).
 */
export interface FetchWorker {
  fetch(request: Request, env: never, ctx: never): Response | Promise<Response>;
}

export const withoutPoweredBy = <T extends FetchWorker>(worker: T): T => ({
  ...worker,
  fetch: async (request: Request, env: never, ctx: never) => {
    const response = await worker.fetch(request, env, ctx);

    // WebSocket upgrades and bodyless responses can't be reconstructed.
    if (
      ("webSocket" in response && response.webSocket) ||
      !response.headers.has("x-powered-by")
    ) {
      return response;
    }

    const stripped = new Response(response.body, response);
    stripped.headers.delete("x-powered-by");
    return stripped;
  },
});
