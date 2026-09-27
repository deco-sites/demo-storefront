# Scripts

## `smoke-headers.ts` — no `x-powered-by` in responses

Fails (exit 1) if any response carries `x-powered-by`. The header leaks the
exact framework version (e.g. `deco@7.20.7`), a precise target for known-CVE
matching. `withoutPoweredBy` in `src/worker-entry.ts` strips it; this script is
the regression guard.

```
npm run smoke:headers https://demo-storefront.decocms.com
```

Checks home, PLP, PDP and a 404 route. Uses GET rather than HEAD: the worker's
cache short-circuits HEAD (`x-cache-reason: method:HEAD`), so HEAD would skip
the cached-response codepath this check exists to cover. `server: cloudflare` is
deliberately not checked — it is injected by the Cloudflare edge, outside the
Worker's control.

### Wiring it into CI (pending)

The workflow that runs this could not be committed by the automation that wrote
the script: a GitHub App cannot push `.github/workflows/**` without the
`workflows` permission. To wire it up, add a workflow that runs
`npx tsx scripts/smoke-headers.ts <url>` on:

- `check_run: [completed]`, filtered to check names starting with
  `Workers Builds:` — derive the preview host from the
  `Version ID: ([0-9a-f]{8})` in `check_run.output.summary` and hit
  `https://<id>-demo-storefront.deco-cx.workers.dev`, exactly as
  `.github/workflows/preview-url.yml` already does;
- `push` to `main`, against `https://demo-storefront.decocms.com`;
- `workflow_dispatch` with a `url` input, for ad-hoc runs.

Give the deploy a moment before asserting — poll `curl -sSf <url>/` until it
answers, then run the script.
