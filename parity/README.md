# Parity harness

Deterministic pixel and snapshot baseline of this storefront (demo-storefront, Shopify). It exists so the v8 (`feat/next-major`) port can be shown to be 100% pixel-identical with the same features. The harness was ported from storefront-tanstack's; ports are 5340 (site) and 5347 (upstream proxy). Comparison uses Playwright (Chromium) and pixelmatch at threshold 0, with `includeAA`, so every differing pixel counts.

## Run it

```sh
bun install                         # or npm install
npx playwright install chromium     # once; playwright is pinned to 1.59.0 (Chromium 147)

npm run parity:build                # site codegen + vite build with the parity shim (see below)
npm run parity:record               # record fixtures + baseline into parity/baseline/
npm run parity:compare              # serve the local build in replay mode, diff against the baseline
npm run parity:compare -- --target http://localhost:5340 --label v8
```

`parity:record` and `parity:compare` build automatically when `dist/` is missing or wasn't produced by `parity:build`. Pass `--rebuild` to force a build.

Other flags:

- `--only a,b` filters cases by id substring. Works with compare and probe only.
- `--label` names the run directory.
- `--upstream-passthrough` sends server-side requests that have no recording to the live upstream instead of returning an HTTP 599.
- `--strict-upstream` fails the run when any server-side request has no recording.
- `--strict` fails the run on anything still pending the product owner (pending rules, pending baselines, a volatile drop that changed a result).
- `--no-pending` compares every case with the v7 baseline and ignores `pendingBaselines`: a v7 self-compare, or the raw v7-vs-v8 picture.

`node parity/run.mjs record --capture-only` re-runs only the second pass of `record` (below): the baseline screens and snapshots are captured again, in replay, from the fixtures already in `parity/baseline`. Use it on the v7 build after a snapshot format change; no live traffic.

`node parity/run.mjs record-pending --rule <id>` (`npm run parity:record-pending -- --rule <id>`) pins the v8 output for a `pendingBaselines` rule into its `dir`; see "Pending baselines" below.

`node parity/run.mjs probe --only <ids>` runs cases live into `parity/runs/probe/` without touching the baseline. Use it while writing new flows. `node parity/serve.mjs [--record]` keeps the parity server running so you can debug by hand.

Compare output goes to `parity/runs/<label>/`, which git ignores. It contains:

- `actual/`: the new captures.
- `diff/`: a red-pixel PNG per differing screenshot and a `.snapshot.diff` per differing JSON snapshot.
- `summary.json` and `summary.md`, which count **ok**, **PENDING** and **DIFF** cases separately. A PENDING case is identical only once a difference the product owner has not approved is applied; it is never counted as ok.

Compare exits non-zero on any pixel difference, any size difference, any snapshot difference, or any missing capture, and with `--strict` on anything PENDING.

## What is captured (`parity/pages.json`)

- **pages × viewports.** Viewports are mobile 390×844 (iPhone UA, touch) and desktop 1440×900, both at DPR 1. Each page gets a full-page PNG and a snapshot JSON with:
  - HTTP status and response headers, minus volatile ones.
  - SEO `<head>` from the SSR HTML and from the hydrated DOM: title, meta, canonical/alternate/icon links, `lang`, `data-theme`.
  - JSON-LD from both sources.
  - The final URL.
  - The sorted set of third-party request URLs, which shows which analytics/CDN calls happen.
  - `analytics`: every event dispatched on the site's analytics bus, `window.DECO.events.dispatch` (`decoEventsRecorder` in `pages.json`). That covers the `data-event` observers of the analytics script (`view_item_list`, `view_item`, `select_item`, `view_promotion`, `add_to_cart`, ...) and direct dispatches such as the search form's `search` event, with their params. This site has no analytics collector (no SDK script, empty `trackingIds`), so nothing is sent anywhere either way. See the determinism table.
- **flows × viewports.** A small step language: `goto`, `click`, `fill`, `type`, `press`, `select`, `check`, `hover`, `scrollIntoView`, `waitFor`, `waitForURL`, `settle`, `capture`, `url`, `attr`, `text`, `count`. Steps can be limited with `viewports`. Each `capture` writes a PNG, and `url`/`attr`/`text` values go into the snapshot. Two examples:
  - The checkout handoff URL is snapshotted as the minicart's Begin Checkout `href`.
  - SPA navigations are covered too, so data loading on client-side navigation is exercised.
- **texts.** Raw responses fetched without following redirects: `robots.txt`, `sitemap.xml`, the trailing-slash redirects (`/shirts/` answers 307 to `/shirts`), the 404 paths and the favicon. Status, headers and body are stored, except that HTML bodies are omitted and `binary` bodies are stored as size + sha256.
- **editor forms.** `record` also saves the admin's composed schema (`GET /live/_meta`) to `parity/baseline/forms/live-meta.json`. It is not part of `compare` (v8 has no admin endpoint): it is the v7 reference for reviewing the v8 `schema.gen.json` forms.

Facts about v7 that the cases pin down, so the port keeps them:

- The `/*` catch-all Category page answers **200** for any unknown path, including `/products/does-not-exist-1`. There is no 404 status on v7.
- There is **no sitemap**: `/sitemap.xml` is that same catch-all page (200 HTML), so the `sitemap-xml-page` case screenshots it.
- No CMS redirects are configured (`website/loaders/redirects.ts` has none). The only redirect is the trailing-slash 307.
- Every response carries an **enforced** `Content-Security-Policy` (set through the worker's `securityHeaders`), which is snapshotted with the other headers.

The app origin is replaced with `{origin}` in every snapshot, so a target on another host/port compares cleanly.

## How determinism is achieved

| Source of noise | Control |
|---|---|
| Server-side upstream data (Shopify Storefront GraphQL, etc.) | `parity/runtime/worker-shim.js` is prepended to `src/worker-entry.ts` by `parity/vite.config.ts`. When `PARITY_UPSTREAM` is set, it rewrites every non-local `fetch()` in the worker to the record/replay proxy (`parity/lib/upstream.mjs`). Recordings live in `parity/baseline/upstream.json` and are keyed by method + URL + body hash, per case, in order. That ordering lets stateful sequences replay exactly, e.g. cart create → add line → cart query. |
| Browser third-party requests (Shopify CDN images, decoims assets, fonts) | One HAR per case, `parity/baseline/har/<case>.har`, replayed with `routeFromHAR` (`notFound: fallback`). A catch-all route aborts any third-party request the HAR does not have and lists it under `harMisses` in the snapshot. Two Playwright 1.59 problems shape this: with `notFound: abort` an unmatched request hangs instead of failing, and `.har.zip` archives hang `routeFromHAR` on Node 26. That is why the HARs are plain JSON. Requests to the app origin are never served from the HAR. |
| Analytics (`window.DECO.events`) | An init script traps the assignment of `window.DECO` / `DECO.events` and wraps `dispatch`, so each event is appended to the snapshot's `analytics.events`, whichever code path dispatched it. The harness also still supports a third-party SDK stub (`analyticsStub.script`, a `window.stonks.{view,event}` recorder) and `thirdParty.block` for beacons; this site uses neither. |
| Server clock / randomness | The shim freezes `Date` to `fixedTime` and seeds `Math.random` (`PARITY_NOW`, `PARITY_SEED`). |
| Browser clock / randomness | `context.clock.setFixedTime(fixedTime)`. A seeded `Math.random` is injected through `addInitScript`. |
| Carousel autoplay / countdown ticks | `setInterval` with a delay of 1s or more never fires (`parity/lib/determinism.js`). |
| Animations, transitions, caret | `parity/lib/determinism.js` puts `animation:none; transition:none` (`!important`) inside `@layer parity`, as the first node of `<head>`. It re-inserts that style after hydration removes it, because only an earlier cascade layer can override `!important` rules inside Tailwind v4 / DaisyUI 5 layers. Any animation that still starts is finished immediately, or cancelled if it is infinite or scroll-driven. Screenshots use `animations: "disabled"` and `caret: "hide"`, plus `reducedMotion: reduce`. Each capture repeats until two consecutive frames are byte-identical. |
| Lazy / deferred sections and lazy images | Before every full-page capture the harness scrolls the page in 80% steps until its height stops growing. It then waits for the network to go quiet, `document.fonts.ready`, every `<img>` to finish loading and `decode()`, and a stable layout height over consecutive frames. |
| Network idle | The harness uses its own quiet tracker: a request counts as done once its headers arrive. Playwright's `networkidle` counts a request as in flight until its body is read, so responses whose bodies the client never reads (seen on storefront-tanstack's wishlist invoke) would keep it from firing. |
| Edge cache / content / telemetry | `.wrangler/state` is wiped on every server start. Content is the bundled `.deco/blocks` at the build's git sha, the pinned content revision: on v7 through `DECO_FAST_DEPLOY=0`; on v8 through empty `DECO_SITE` and `DECO_SITE_TOKEN` (no hosted releases). Telemetry stays local: on v7 `DECO_OTEL=off` and empty `DECO_OTEL_*_ENDPOINT`; on v8 an empty `OTEL_EXPORTER_OTLP_ENDPOINT` and no token, so `createCMS` has nowhere to send. `siteEnv` in `pages.json` sets all of them, for both sides. |
| Workers `request.cf` (region, city, colo) | The local Workers runtime fills `request.cf` from `node_modules/.mf/cf.json`, fetched for the machine's current network location (and refetched after 30 days). The region feeds the cache segment (`x-cache-segment: …\|r=SP`); this site's `buildSegment` splits the cache by region. `parity/lib/server.mjs` pins it instead: on every start it copies `parity/runtime/cf.json` (São Paulo, the location the baseline was recorded with) to `.wrangler/parity-cf.json` and points `CLOUDFLARE_CF_FETCH_PATH` at it. The fresh copy matters because the runtime also refetches a pinned file older than 30 days. |
| Screenshot-triggered image requests | Chromium's full-page capture (`captureBeyondViewport`) sometimes re-runs `<picture>` source selection against a transient narrow frame, so a desktop capture of the home requests the mobile `<source>` images (the four `-mob` Hero/Banner files) and the harness aborts them, on some runs of the same build and not on others. `harMisses` entries are full URLs, so `volatileHarMisses` in `pages.json` names exactly those four and drops only them, on both sides, for `home@desktop` and `home-utm@desktop`. It has `"status": "pending"`: when a drop changes a case's result, the case is reported PENDING (rule `home-desktop-mobile-sources`) and `--strict` fails. Pixels and `thirdPartyRequests` still compare. `PARITY_DEBUG_MISSES=1` prints the full URL of every aborted request. |
| Rendering | Chromium is pinned through `playwright@1.59.0` (headless shell). It runs software-only, with no GPU raster and no threaded animation or scrolling (`chromiumArgs` in `pages.json`). It also uses sRGB, `--font-render-hinting=none`, `--disable-lcd-text`, a fixed locale (en-US), timezone (UTC) and color scheme (light). Baselines are platform-specific: `baseline/meta.json` records the OS/arch they were recorded on (the current baseline: linux-x64), so compare on the same OS/arch. |

`fixedTime` must be in the future relative to the wall clock. The worker dates the 7-day cart cookie from the frozen clock, but Chromium's cookie jar uses real time, so a past `fixedTime` silently drops the cart cookie and add to cart fails. The current value is `2030-01-01T12:00Z`, so re-record before 2030-01-08.

`record` makes two passes:

1. A live pass that writes the upstream recordings and the HARs.
2. A replay pass that writes the baseline PNGs and snapshots.

The baseline is therefore itself a replayed run, captured under exactly the conditions `compare` uses.

## Comparing the v8 port

The v8 site must:

1. Load `parity/runtime/worker-shim.js` first in its worker entry, for example through the same Vite plugin. Without it, the target fetches live data instead of the recorded fixtures.
2. Run with `PARITY_UPSTREAM=http://127.0.0.1:5347`, `PARITY_NOW` and `PARITY_SEED` from `pages.json`, the `siteEnv` of `pages.json`, and the same content revision.

Then run `npm run parity:compare -- --target <url>`. While compare runs, it serves the replay proxy on port 5347.

Expected differences are approved by the product owner only, never by an agent, and approvals are **per site**: the ones storefront-tanstack's harness carried (`ssr-jsonld-lazy`, `flow-images-load`, `plp-show-more-index`, `home-mobile-cache`, `x-powered-by`) were signed off for that site and were not copied. This site starts with none. Until the product owner signs a difference off, it is listed as PENDING in the PR with its screenshots. Once approved, it is encoded in `pages.json`, never by editing the baseline:

- `ignoreHeaders` drops a header from both snapshots.
- `approvedDifferences` holds one rule per case list and snapshot field. Each rule names the `cases`, the field `path` (dotted; `[*]` pairs up array elements, e.g. `analytics.events[*].props.items`), and exactly what the new value must be: `actual` (an exact value, `"$absent"` for a dropped field), `actualSameAs` (equal to another field of the same capture), `addsOnly` (an array that is the baseline plus exactly these entries) `replace` (the baseline value with each listed `[from, to]` string replaced, on its JSON text) or `mask` (a string equal to the baseline once the regex matches are blanked). `baseline` optionally pins the old value as well, and `approval` cites the sign-off. Where the capture matches, compare resets that field to the baseline value; any other change to the field still fails. The summary lists the rules applied per case.

Both are applied to the baseline and the new capture at compare time, so approving a difference needs no re-record.

A rule with `"status": "pending"` is a difference that is explained but **not approved**: it applies like an approval, the summary prints the case as `PENDING`, and `npm run parity:compare -- --strict` fails until the product owner approves it by deleting the `status` field. Agents add pending rules; only the product owner removes the status.

### Pending baselines

Some v8 pages differ from v7 as a whole, for one explained reason, in ways a field rule can't express (the listing pages below). `pendingBaselines` in `pages.json` lists such a rule with its `cases` and a `dir`. Compare checks those cases against the v8 capture pinned in that `dir` instead of the v7 baseline: identical is reported **PENDING** (never ok), anything else is a DIFF, so a regression on those pages still fails. `--strict` fails on them; `--no-pending` compares them with v7 again.

`record-pending --rule <id>` makes the pinned capture. Its first pass serves v7's recordings where they exist and records only what they lack from the live upstream, at the fixed time: server-side requests into `<dir>/upstream.json` (used only for that rule's cases and only on a miss in v7's store) and browser third parties into `<dir>/har/` (tried after the case's v7 HAR). Its second pass replays everything and writes `<dir>/screens` and `<dir>/snapshots`, plus `<dir>/README.md` and `<dir>/v7-vs-new/diff/` (red-pixel PNGs and snapshot diffs) showing how each case differs from v7. Like `parity/baseline`, the recorded fixtures (`har/`, `upstream.json`) aren't committed; the screens, snapshots and diffs are.

## Tailwind and the harness

Tailwind v4 detects class names in every non-ignored file of the repo, so text in `parity/` (selectors, step names) would otherwise add CSS to the site build and change pixels. `src/styles/app.css` therefore has `@source not "../../parity";`. The migrated site needs the same exclusion. `x-cache-version` (the git sha of the build) is snapshotted as `<build-id>`: its presence is checked, its value is not.

Analytics snapshot shape: `{ views, events }`. `views` lists pageviews in order. `events` is the sorted, de-duplicated set of `{name, path, props}`: view-triggered events (e.g. `view_item_list`) fire from IntersectionObservers, so their count and order vary with scroll timing, while which events fire with which payloads is stable.

## Pending for the product owner (v7 → v8, `feat/next-major`)

Nothing below is approved. Each item is a `"status": "pending"` entry in `pages.json` (a rule, a pending baseline or the volatile list) or, where none can express it, listed here.

Last full compares (local, not committed): `v8-9` and `v8-10`, the v8 build against the v7 baseline (`npm run parity:compare`):

- `v8-10` (final): **25 ok, 50 PENDING, 0 DIFF** of 75; 2 upstream misses (below). With `--strict` it fails on the 50 PENDING cases; with `--strict-upstream`, on the 2 misses.
- `v8-9`, the run before it: 25 ok, 47 PENDING, 3 DIFF. The 3 DIFFs were `home-shelf-images-load`'s rule still naming the images by origin + path after `harMisses` moved to full URLs; the rule now names the same six images by full URL (`v8-10`). The 25 `listing-gets-page-url` cases matched their pinned capture in both runs.

The 2 upstream misses are one request in `pdp-variant-select` (mobile and desktop): after the Color click, v8 loads `/products/insulated-tumbler-with-a-straw-…`, a card in the page's shelf, through `loadPage`, and that page's Shopify query was never recorded on v7, so it answers 599. It is most likely a router `intent` preload (the request carries that page's path, a second after the click): the cursor stays where the click left it while the harness scrolls the page for the full-page capture, and the shelf card passes under it. v7's product shelf was inside a Lazy wrapper, rendered later, which would explain why v7 never sent it. Nothing rendered or snapshotted changes (the case is ok on pixels and snapshot). Moving the cursor away before each capture would remove it, but changes the v7 capture too (a new baseline and new self-compares); listed here instead.

Harness proof on the current harness: `v7-self-3` and `v7-self-4`, the v7 build against its own baseline with `--no-pending --strict --strict-upstream`: 75 ok, 0 PENDING, 0 DIFF, 0 upstream misses each. The baseline was re-captured from its fixtures (`record --capture-only`) for the full-URL `harMisses` and is pixel- and snapshot-identical to the earlier one apart from that field.

Pending rules (compare prints them; `--strict` fails on them):

- `ssr-jsonld-first-html` (landing pages, product pages): JSON-LD of sections v7 wrapped in Lazy is in the first server HTML.
- `plp-page-url` (landing pages): JSON-LD and analytics URLs are on the site's origin and path instead of `https://localhost`.
- `home-mobile-no-cart-cookie` (`home@mobile`) and `home-utm-mobile-from-cache` (`home-utm@mobile`): v7 created a cart during the first SSR of an isolate and served that page private; v8 doesn't, so the home is edge-cached.
- `home-shelf-images-load` (desktop flows from the home): the tabbed shelf's first-tab images load without scrolling.
- `home-desktop-mobile-sources` (volatile list, `home@desktop`, `home-utm@desktop`): the four mobile `<source>` images a desktop full-page capture sometimes requests; reported only on a run where dropping them changed the result.

Pending baseline `listing-gets-page-url` (25 cases: `plp-*`, `search*`, `not-found*`, `sitemap-xml-page`, `search-submit`, `plp-sort`, `header-nav-spa`): on v7 every category, search, catch-all and `/sitemap.xml` page showed "12 of 0 results", live too, because the listing loader never got the page URL. v8 passes it. The Shopify catalog was replaced on 2026-10-10 and the old collections are empty now, so the pinned v8 capture shows them empty as well: against v7 it differs only in the breadcrumb (the collection or query is named), the listing JSON-LD (the collection's title and description, the page URL) and `view_item_list`'s list name and id; `search-submit` and `header-nav-spa` also carry `home-shelf-images-load`. `parity/pending/listing-gets-page-url/README.md` lists every case with its pixel count, `v7-vs-new/diff/` has the diffs, and `parity/pending/listing-live-before-catalog-change/` has v8 captured live on 2026-10-09, listing the products (filters, sort, 7 shirts). With products, the three flows marked `blocked` on v7 (filter, show more, listing → product) can run on v8; they aren't in the compare.

Not expressible as a rule, for the product owner to decide:

- **Clickjacking.** Neither v7 nor v8 sends `frame-ancestors` or `X-Frame-Options` when the site sets its own enforced CSP (the baseline headers show neither, despite a v7 comment claiming `X-Frame-Options: SAMEORIGIN`), so any origin can frame the store. Adding `frame-ancestors 'self' https://studio.decocms.com https://*.deco.studio` to the CSP in `src/worker-entry.ts` would stop it and keep the site editor's preview; it changes the `content-security-policy` header of 55 cases, so it isn't done without your call.

Site editor protocol: `parity/editor-check.mjs` drives `deco serve --port 4653 --preview http://localhost:5340` the way the site editor does, against `vite dev` on 5340 (`parity/runs/editor-check.log`, local): `describe` (working tree, writable, preview URL, server `deco-cli` 8.1.0-next.7); `schema.get` (131 definitions) and again with `ifNoneMatch` (`notModified`); `blocks.list` (39 blocks, 0 diagnostics); `blocks.apply` with a stale `ifMatch` (refused, with the current version); an edit of the home's Newsletter title, which `vite dev` rendered without a restart; the original block put back through `blocks.apply` (the block's version and the content revision equal the starting ones, the file is byte-identical, `git status` clean). All 12 steps passed.

Behaviour changes outside the compare:

- `withABTesting` (the `SITES_KV` worker split between this worker and a fallback origin) is gone; v8 has no equivalent.
- Telemetry: v7's `instrumentWorker` (`DECO_OTEL_*`) is replaced by `createCMS({ telemetry })` to the same collector (`OTEL_EXPORTER_OTLP_ENDPOINT` + the `OTEL_EXPORTER_OTLP_HEADERS` secret), with v7's identity: `service.name` from `DECO_SITE_NAME`, `deployment.environment.name` from `DECO_ENV_NAME`, `service.version` from the `CF_VERSION_METADATA` binding. Errors are sampled at 0.1 as v7's `DECO_OTEL_ERROR_PROMOTION_RATE` did (`telemetry.errorSampleRate` in the `CMS` block). Lost: `DECO_OTEL_LOGS_MIN_LEVEL=debug` (v8 sends error logs only, no debug/info logs), the per-signal endpoints, and the Analytics Engine metrics (the dataset was never enabled on this site).
- Fast deploy (`DECO_FAST_DEPLOY` + `DECO_KV`) becomes hosted releases: `DECO_SITE` is set, and they stay off until `DECO_SITE_TOKEN` is set as a secret.
- Drafts: the `CMS` block keeps v7's preview hosts, `demo-storefront.deco.site` and `demo-storefront.deco-cx.workers.dev`, and adds `localhost:5173` (`vite dev`) so a draft can be previewed locally; that host is new.
- Signed-in shoppers are detected by the `secure_customer_sig` cookie their sign-in sets (v7 looked for `customerAccessToken`, which nothing set), so their pages bypass the edge cache.
- The `site`, `deco-shopify`, `deco-htmx` and `deco-analytics` blocks are gone with their editor forms; their settings are code or env.
- `LiveControls` (the editor bridge and the `.` shortcut to Studio) is kept as a vendored copy; decide whether v8 Studio needs it.

Editor forms (v7 `forms/live-meta.json` vs v8 `.deco/schema.gen.json`), after keeping v7's SEO forms and product pickers:

- Lists lose "Select from saved" where no saved block fits (Hero slides, CategoryBanner and ImageGallery banners, Carousel images, HighlightStrip items, PromoGrid cards, ShoppableBanner pins, LinkTree social, Header nav items).
- Product pickers gain an "Inline data" option; the SEO sections' Data Source offers only the matching listing/product loaders, wrapped in lazy (v7 offered every loader); ProductDetails/SearchResult/Wishlist `page` pickers offer the loader, its extension wrapper and inline data (v7: the loader only).
- Literal order: CookieConsent's Banner position (`Expanded, Left, Center, Right`, v7 `Left, Center, Right, Expanded`) and Theme's Mode (`dark, light`, v7 `light, dark`) follow source order.
- CampaignTimer's Expires at is `format: date-time` (v7 `datetime`).
- Theme's Font is a lazy block; the PDP loader's `slug` is no longer required (it comes from the route).
- Section pickers no longer list Lazy, Seo, SeoV2, Component and multivariate/section.
