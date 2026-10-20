/**
 * Start's instance options: server-function calls from the browser carry the page's CDN segment
 * token, so the CDN can cache client-side navigation data. The draft cookie of a `?__draft=` link is
 * set by the worker (`createDecoWorker`).
 */
import { decoServerFnFetch } from "@decocms/tanstack/start";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({ serverFns: { fetch: decoServerFnFetch } }));
