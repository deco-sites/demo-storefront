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

## Migrating a Deco Fresh storefront to this stack

If you have an existing Deco storefront on the legacy **Fresh + Preact + Deno** stack, the [`@decocms/start`](https://github.com/decocms/deco-start) framework ships a migration CLI that takes you from a Fresh site to a working TanStack Start + Cloudflare Workers site in one pass — this repo is one of the outputs (see `MIGRATION_REPORT.md`).

The script does six phases automatically:

1. **Analyze** — scan source, detect Preact/Fresh/Deco patterns, GTM, commerce platform
2. **Scaffold** — generate `package.json`, `tsconfig.json`, `vite.config.ts`, `wrangler.jsonc`, `src/server.ts`, `src/worker-entry.ts`, `src/router.tsx`, `src/setup.ts`, `src/cache-config.ts`, `src/routes/{__root,$,index,deco/*}`, `src/styles/app.css`, image components, `useCart` / `useUser` / `useWishlist` hooks, types
3. **Transform** — rewrite imports (70+ rules), JSX attrs, Fresh APIs, Deno-isms, Tailwind v3 → v4
4. **Cleanup** — delete `islands/`, old routes, `deno.json`; move `static/` → `public/`
5. **Report** — write `MIGRATION_REPORT.md` with manual review items
6. **Verify** — 18+ smoke tests (zero old imports, scaffolded files exist)

Your existing `src/sections/`, `src/components/`, and `.deco/blocks/` carry over unchanged. The script gets you to "builds clean with zero old imports" — manual work starts at platform hooks (`useCart`) and runtime tuning, tracked in `MIGRATION_NEXT_STEPS.md`.

### Option A — drive the migration through an AI coding tool (recommended)

`@decocms/start` ships an Agent Skill that primes Claude Code, Cursor, Codex, and other AI coding tools with the full 12-phase migration playbook plus the reference docs and templates. The skill knows what `@decocms/start` supports, runs the migration script for you, and flags anything that needs manual attention as it goes — so you stay in a conversation rather than juggling flags.

Install the skill once:

```sh
npx skills add decocms/deco-start
```

Open your Fresh site in your AI tool and prompt:

> migrate this project to TanStack Start

The agent will analyze the site, run the migration phases, talk through anything ambiguous (CSP domains, site-specific loaders, GTM IDs, custom Fresh handlers), and stop on the manual-review items so you can answer in plain English instead of editing config by hand.

See [`@decocms/start#migrating-from-freshpreactdeno`](https://github.com/decocms/deco-start#migrating-from-freshpreactdeno) for the full skill index.

### Option B — run the migration script manually

If you'd rather drive it yourself, the same logic is exposed as a CLI. From the **root of your existing Fresh site**, with nothing pre-installed:

```sh
# Preview changes (no files written):
npx -p @decocms/start deco-migrate --dry-run --verbose

# Run the migration in place:
npx -p @decocms/start deco-migrate

# Migrate a different directory:
npx -p @decocms/start deco-migrate --source ./my-site
```

Flags:

| Flag | Description |
|---|---|
| `--source <dir>` | Source directory (default: current directory) |
| `--dry-run` | Preview changes without writing files |
| `--verbose` | Show detailed output for every file |
| `--help`, `-h` | Show help |

After it finishes (this is how the Fresh → TanStack step worked in v7; the site has since moved to the next major):

```sh
npm install
npx tsr generate
npm run dev
```

Then open `MIGRATION_REPORT.md` for the manual review checklist (CSP domains, site-specific loaders, GTM, etc.).

### What's left after the script finishes

Open `MIGRATION_NEXT_STEPS.md` in this repo for the canonical follow-up checklist used during the migration of this site. The recurring patterns are:

- Replace `window.STOREFRONT.*` channels (USER, WISHLIST) with `src/platform/<domain>/` modules following the `cart/` shape: `*.types.ts`, `*.actions.ts` (`createServerFn`), `*.hooks.ts` (`useQuery` + `useMutation`), `*.<commerce>.ts` adapter, `index.ts` barrel.
- Switch internal navigation from `<a href>` to `<Link preload="intent">` from `@tanstack/react-router`.
- Group flat section `Props` into `*Config` sub-interfaces with JSDoc (see `src/sections/Product/ProductDetails.tsx`).
- Add scoped skeletons via `useRouterState({ select: s => s.isLoading })` for the bits that actually change during a route transition.
- Decompose god-components into narrow leaves so React Compiler can auto-memoize them.

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
| `npm run parity:*` | The v7 → v8 parity harness (`parity/README.md`) |

## Project layout

```
.deco/
├── blocks/               # Saved content, one JSON file per block (source of truth)
├── index.ts              # The block map: every type content can name (v7 type names)
└── schema.gen.json       # Editor forms (`deco schema`; committed). blocks.gen.ts is generated and gitignored
src/
├── cms.ts                # createCMS (explicit params; the site reads its own env)
├── views.ts              # View registry: section type → component
├── open-page.server.ts   # matchRoute + one promise per block
├── page.functions.ts     # The page loader as a server function
├── page-route.tsx        # Route options shared by `/` and `/$`
├── head.ts               # <head> from the page SEO and the site-wide SEO defaults
├── request-state.server.ts # The page being rendered, for block functions (AsyncLocalStorage)
├── blocks/               # Block functions: commerce loaders, SEO, matchers, section helper
├── runtime/              # Root document, page view (sections, <main> landmark)
├── routes/               # TanStack Router file routes (__root, $, index, account, login)
├── sections/             # CMS-rendered sections (Header, Footer, Product, Newsletter, …)
├── components/           # UI components (header, minicart, product, search, ui, …)
├── platform/             # Domain state — TanStack Query hooks + createServerFn actions
├── server/               # Edge cache, cache profiles, the site's server functions
├── loaders/, actions/    # Site loaders and actions (called by blocks and server functions)
├── vendor/               # Code copied from the v7 packages: Shopify, commerce types, Image
├── sdk/                  # clx, debounce, device, logger, …
├── styles/app.css        # Tailwind v4 entry
├── server.ts             # TanStack Start server entry
├── start.ts              # Start middleware (draft cookie)
├── worker-entry.ts       # Cloudflare Worker entry: CSP, segmentation, edge cache
└── router.tsx            # Router configuration
```

## How rendering works

1. A request hits `src/worker-entry.ts` → `withEdgeCache` (`src/server/edge-cache.ts`): security headers, CSP, device/region segmentation, the edge cache.
2. The request goes on to the TanStack Start server entry (`src/server.ts`).
3. The catch-all route (`src/routes/$.tsx`) and the home route call `loadPage`, which finds the page with `matchRoute` (`src/open-page.server.ts`) and starts every block on it.
4. Each section block returns a descriptor; `src/runtime/PageView.tsx` renders it through `src/views.ts`.
5. Commerce data (Shopify PDP, PLP, search, cart) comes from the loaders in `src/vendor/shopify`, sent through the v8 Shopify client.

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

The worker entry applies Cloudflare edge cache profiles (defined in `src/server/cache-profiles.ts`):

| URL pattern | Profile | Edge TTL |
|---|---|---|
| `/` | static | 15 min |
| `*/p` | product | 5 min |
| `/s`, `?q=` | search | 60s |
| `/cart`, `/checkout` | private | none |
| Everything else | listing | 2 min |

Change a profile or a URL rule in `src/server/cache-profiles.ts`.

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

For Argo CD / Kubernetes deployment manifests see `deploy/`.

## Migration artifacts

This repo was itself produced by the migration flow above. Two generated docs are kept for reference:

- `MIGRATION_REPORT.md` — files scaffolded / transformed / deleted, manual review items
- `MIGRATION_NEXT_STEPS.md` — open follow-up work and canonical patterns to follow

## Operations

- [`docs/email-authentication.md`](docs/email-authentication.md) — SPF / DKIM / DMARC records for the storefront domain, and how to find the DKIM selector once a mail provider is wired up

## Help

- [deco.cx docs](https://www.deco.cx/docs/en/overview)
- [Discord](https://deco.cx/discord)
- Framework source: [`@decocms/start`](https://github.com/decocms/deco-start), [`@decocms/apps`](https://github.com/decocms/apps-start)

## License

MIT
