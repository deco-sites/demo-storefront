# demo-storefront

A [deco.cx](https://deco.cx) storefront built on **TanStack Start + React 19 + Cloudflare Workers**, with Shopify as the commerce backend.

This is a **site repo** on the next major of Deco CMS: [`@decocms/blocks`](https://www.npmjs.com/package/@decocms/blocks) reads the content (`createCMS`, `matchRoute`, the `deco` CLI) and [`@decocms/apps-shopify`](https://www.npmjs.com/package/@decocms/apps-shopify) is the thin Shopify client. Everything else is the site's own code: UI, sections, routes, the worker's edge cache, and the commerce loaders and flows (`src/vendor/`).

## Stack

| Layer | Tech |
|---|---|
| Runtime | Cloudflare Workers (`nodejs_compat`) |
| Framework | TanStack Start / TanStack Router |
| UI | React 19 + React Compiler |
| Styles | Tailwind CSS v4 + DaisyUI |
| Build | Vite 7 |
| Data | TanStack Query, server functions |
| Commerce | Shopify Storefront API (via `createShopifyClient` from `@decocms/apps-shopify`) |
| CMS | Deco CMS (`@decocms/blocks`): content in `.deco/blocks`, block map in `.deco/index.ts` |
| Deploy | Wrangler (Cloudflare Workers) |

## Quick start

Requires Node 20+ and `npm`.

```sh
npm install
npm run dev
```

Open `http://localhost:5173`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run dev:clean` | Wipe Vite/Wrangler/TanStack caches and start fresh |
| `npm run build` | `prebuild` (`deco schema && deco content && deco check`), then routes and `vite build` |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | `npm run build` then `wrangler deploy` |
| `npm run typecheck` | `tsr generate && tsc --noEmit` |
| `npm test` | Unit tests (`src/**/*.test.ts`) |
| `npm run format` / `format:check` | Prettier on `src/**/*.{ts,tsx}` |
| `npm run knip` / `knip:fix` | Find / auto-fix unused exports and files |
| `npm run tailwind:lint` / `tailwind:fix` | Lint/auto-fix Tailwind class usage |
| `npm run generate:routes` | Regenerate `src/routeTree.gen.ts` |
| `npm run parity:*` | The parity harness: pixel and snapshot compare against production (`parity/README.md`) |

## Project layout

```
.deco/
├── blocks/               # Saved content, one JSON file per block (source of truth)
├── index.ts              # The block map: every type content can name
└── schema.gen.json       # Editor forms (`deco schema`; committed). blocks.gen.ts is generated and gitignored
src/
├── cms.ts                # createCMS (explicit params; the site reads its own env)
├── views.ts              # View registry: section type → component
├── open-page.server.ts   # matchRoute + one promise per block
├── page.functions.ts     # The page loader as a server function
├── page-route.tsx        # Route options shared by `/` and `/$`
├── head.ts               # <head> from the page SEO and the site-wide SEO defaults
├── request-state.server.ts # The page being rendered, for block functions (AsyncLocalStorage)
├── blocks/               # Block functions: commerce loaders, SEO, matchers
├── runtime/              # Root document, page view (sections, <main> landmark)
├── routes/               # TanStack Router file routes (__root, $, index, account, login)
├── sections/             # CMS-rendered sections (Capy: the capybara design; Product: the offline page's shelf)
├── components/           # UI components (capy: minicart, product card, icons; product, ui, account, wishlist)
├── platform/             # Domain state — TanStack Query hooks + createServerFn actions
├── server/               # Edge cache, cache profiles, the site's server functions
├── loaders/, actions/    # Site loaders and actions (called by blocks and server functions)
├── vendor/               # Shopify loaders and flows, commerce types, image helpers (the site's own code)
├── sdk/                  # clx, device, url, …
├── styles/app.css        # Tailwind v4 entry
├── server.ts             # TanStack Start server entry
├── start.ts              # Start instance (server-function fetch with the CDN segment token)
├── worker-entry.ts       # Cloudflare Worker entry: createDecoWorker (CSP, drafts, request metrics) and the site's edge cache
├── cache-segment.ts      # What splits the edge cache (device, region) and what a purge drops
└── router.tsx            # Router configuration
```

## How rendering works

1. A request hits `src/worker-entry.ts` → `createDecoWorker` (`@decocms/tanstack/worker`) with the CMS from `src/cms.ts`: security headers, CSP, drafts, CMS redirects, the site's own edge cache (in the same file: assignments, cache profiles, the purge route; the device/region/sign-in segmentation is in `src/cache-segment.ts`), and `http.server.request.duration` for every request in the CMS's telemetry (what Studio's Monitor shows; nothing in `vite dev`, where telemetry is off).
2. The request goes on to the TanStack Start server entry (`src/server.ts`).
3. The catch-all route (`src/routes/$.tsx`) and the home route call `loadPage`, which finds the page with `matchRoute` (`src/open-page.server.ts`) and starts every block on it.
4. Each section block returns a descriptor; `src/runtime/PageView.tsx` renders it through `src/views.ts`.
5. Commerce data (Shopify PDP, PLP, search, cart) comes from the loaders in `src/vendor/shopify`, sent through the Shopify upstream client.

## Data fetching pattern

Domain state (cart, user, wishlist) follows a single pattern under `src/platform/<domain>/`:

```
<domain>.types.ts     # platform-agnostic state shape
<domain>.actions.ts   # createServerFn wrappers (run on the worker)
<domain>.hooks.ts     # useQuery + useMutation
<domain>.shopify.ts   # adapter: Shopify response → state shape
index.ts              # barrel
```

`src/routes/__root.tsx` prefetches cart + user in `beforeLoad` and seeds the QueryClient. The minicart drawer is mounted at root and driven by the `useCart()` hook.

For navigation, use `<Link from="@tanstack/react-router" preload="intent">` on internal links — never plain `<a href>`.

## Edge caching

The worker entry keeps pages in the Cloudflare Cache API, keyed by path, device (mobile or desktop), region (a Brazilian state, from Cloudflare's `cf-region-code`; any other visitor shares the entry with no region: `src/cache-segment.ts`), the visitor's A/B test and campaign assignments and `<build>.<content revision>`; signed-in shoppers are never served from it. Its cache profiles (`PROFILES` in `src/worker-entry.ts`; `src/server/cache-profiles.ts` has the same values for the page's own headers):

| URL pattern | Profile | Edge TTL |
|---|---|---|
| `/` | static | 15 min |
| `*/p` | product | 5 min |
| `/s`, `?q=` | search | 60s |
| `/cart`, `/checkout` | private | none |
| Everything else | listing | 2 min |

Change a profile or a URL rule in both files. `POST /_cache/purge` with `Authorization: Bearer <PURGE_TOKEN>` (a Worker secret) and `{ "paths": ["/"] }` drops every copy of those pages from the edge cache: each device, in each region and in none. Add `"segments": [{ "device": "desktop", "regionId": "SP" }]` to drop only those copies. Each copy is one Cache API call, and a Worker request may make 1,000 of them on Workers Paid (50 on Free): when a purge runs out, it answers 503 with the `notPurged` paths, to send again in smaller requests.

## Deployment

Cloudflare Workers via Wrangler. Configuration is in `wrangler.jsonc` (entry: `src/worker-entry.ts`).

CI/CD is automatic (see [`.github/workflows/README.md`](./.github/workflows/README.md)):

- **Per-PR previews** — the Cloudflare **Workers Builds** GitHub App builds each PR and posts a sticky comment with the Commit/Branch preview URLs.
- **`deploy.yml`** — on push to `main`, runs `wrangler deploy` with `BUILD_HASH` injected.

Required repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

The build runs `deco check` (`prebuild`): content it rejects fails the build, and with it the deploy.
Worker secrets: `DECO_SITE_TOKEN` (with the `DECO_SITE` var, Studio releases go live without a deploy)
and `OTEL_EXPORTER_OTLP_HEADERS` (the collector's auth header); see `wrangler.jsonc`.

To deploy manually from your machine:

```sh
npm run deploy
```

## Operations

- [`docs/email-authentication.md`](docs/email-authentication.md) — SPF / DKIM / DMARC records for the storefront domain, and how to find the DKIM selector once a mail provider is wired up

## Help

- [deco.cx docs](https://www.deco.cx/docs/en/overview)
- [Discord](https://deco.cx/discord)
- Framework source: [`@decocms/blocks`](https://github.com/decocms/blocks)

## License

MIT
