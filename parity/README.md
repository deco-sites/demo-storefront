# Parity harness

Deterministic pixel and snapshot baseline of this storefront (demo-storefront, Shopify). It exists so a change that must not change what shoppers see (a refactor, a dependency upgrade, a content migration) can be shown to be 100% pixel-identical with production: record the baseline from a production (main) build, then compare the change against it. Ports are 5340 (site) and 5347 (upstream proxy). Comparison uses Playwright (Chromium) and pixelmatch at threshold 0, with `includeAA`, so every differing pixel counts.

## Run it

```sh
bun install                         # or npm install
npx playwright install chromium     # once; playwright is pinned to 1.59.0 (Chromium 147)

npm run parity:build                # site codegen + vite build with the parity shim (see below)
npm run parity:record               # record fixtures + baseline into parity/baseline/
npm run parity:compare              # serve the local build in replay mode, diff against the baseline
npm run parity:compare -- --target http://localhost:5340 --label my-change
```

`parity:record` and `parity:compare` build automatically when `dist/` is missing or wasn't produced by `parity:build`. Pass `--rebuild` to force a build.

Other flags:

- `--only a,b` filters cases by id substring. Works with compare and probe only.
- `--label` names the run directory.
- `--upstream-passthrough` sends server-side requests that have no recording to the live upstream instead of returning an HTTP 599.
- `--strict-upstream` fails the run when any server-side request has no recording.
- `--strict` fails the run on anything still pending the product owner (pending rules, pending baselines, a volatile drop that changed a result).
- `--no-pending` compares every case with the baseline and ignores `pendingBaselines`: a self-compare of the baseline build, or the raw before-vs-after picture.

`node parity/run.mjs record --capture-only` re-runs only the second pass of `record` (below): the baseline screens and snapshots are captured again, in replay, from the fixtures already in `parity/baseline`. Use it on the baseline build after a snapshot format change; no live traffic.

`node parity/run.mjs record-pending --rule <id>` (`npm run parity:record-pending -- --rule <id>`) pins the new output for a `pendingBaselines` rule into its `dir`; see "Pending baselines" below.

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
- **texts.** Raw responses fetched without following redirects: `robots.txt`, `sitemap.xml`, the trailing-slash redirects (`/collections/the-herd/` answers 307 to `/collections/the-herd`), the legacy URL redirects (`/shirts` answers 302 to `/collections/the-herd`), the unknown paths and the favicon. Status, headers and body are stored, except that HTML bodies are omitted and `binary` bodies are stored as size + sha256.
- **editor forms.** `record` also copies the baseline build's `.deco/schema.gen.json` to `parity/baseline/forms/schema.gen.json`. It is not part of `compare`: it is the reference for reviewing a change's editor forms.

Facts about production that the cases pin down:

- The `/*` catch-all page (Not Found Page) answers **200** for any unknown path, including `/products/does-not-exist-1` and `/collections/does-not-exist`. There is no 404 status.
- There is **no sitemap**: `/sitemap.xml` is that same catch-all page (200 HTML), so the `sitemap-xml-page` case screenshots it.
- The URLs of the design before the capybara one (`/shirts`, `/products/t-shirt`, …) are CMS redirects (`redirect-legacy-*`, 302). The other redirect is the trailing-slash 307.
- Every response carries an **enforced** `Content-Security-Policy` (`src/worker-entry.ts`), which is snapshotted with the other headers.

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
| Edge cache / content / telemetry | `.wrangler/state` is wiped on every server start. Content is the bundled `.deco/blocks` at the build's git sha, the pinned content revision, through empty `DECO_SITE` and `DECO_SITE_TOKEN` (no hosted releases). Telemetry stays local: with no token, `createCMS` has nowhere to send. `siteEnv` in `pages.json` sets both, for both sides. |
| Workers `request.cf` (region, city, colo) | The local Workers runtime fills `request.cf` from `node_modules/.mf/cf.json`, fetched for the machine's current network location (and refetched after 30 days). The region feeds the cache segment (`x-cache-segment: …\|r=SP`); this site's `buildSegment` splits the cache by region. `parity/lib/server.mjs` pins it instead: on every start it copies `parity/runtime/cf.json` (São Paulo, the location the baseline was recorded with) to `.wrangler/parity-cf.json` and points `CLOUDFLARE_CF_FETCH_PATH` at it. The fresh copy matters because the runtime also refetches a pinned file older than 30 days. |
| Screenshot-triggered image requests | Chromium's full-page capture (`captureBeyondViewport`) sometimes re-runs `<picture>` source selection against a transient narrow frame, so a desktop capture of the home requests the mobile `<source>` images (the four `-mob` Hero/Banner files) and the harness aborts them, on some runs of the same build and not on others. `harMisses` entries are full URLs, so `volatileHarMisses` in `pages.json` names exactly those four and drops only them, on both sides, for `home@desktop` and `home-utm@desktop`. It has `"status": "pending"`: when a drop changes a case's result, the case is reported PENDING (rule `home-desktop-mobile-sources`) and `--strict` fails. Pixels and `thirdPartyRequests` still compare. `PARITY_DEBUG_MISSES=1` prints the full URL of every aborted request. |
| Rendering | Chromium is pinned through `playwright@1.59.0` (headless shell). It runs software-only, with no GPU raster and no threaded animation or scrolling (`chromiumArgs` in `pages.json`). It also uses sRGB, `--font-render-hinting=none`, `--disable-lcd-text`, a fixed locale (en-US), timezone (UTC) and color scheme (light). Baselines are platform-specific: `baseline/meta.json` records the OS/arch they were recorded on (the current baseline: linux-x64), so compare on the same OS/arch. |

`fixedTime` must be in the future relative to the wall clock. The worker dates the 7-day cart cookie from the frozen clock, but Chromium's cookie jar uses real time, so a past `fixedTime` silently drops the cart cookie and add to cart fails. The current value is `2030-01-01T12:00Z`, so re-record before 2030-01-08.

`record` makes two passes:

1. A live pass that writes the upstream recordings and the HARs.
2. A replay pass that writes the baseline PNGs and snapshots.

The baseline is therefore itself a replayed run, captured under exactly the conditions `compare` uses.

## Comparing a change

`npm run parity:compare` builds the checked-out code with the parity shim and compares it against `parity/baseline`. To record the baseline, run `npm run parity:record` on a checkout of production (main) with this branch's `parity/` folder (the cases are in `parity/pages.json`): record it here before changing anything, or copy `parity/` into a worktree of main, record there and copy its `parity/baseline` back. A target served elsewhere (`--target <url>`) must:

1. Load `parity/runtime/worker-shim.js` first in its worker entry, for example through the same Vite plugin. Without it, the target fetches live data instead of the recorded fixtures.
2. Run with `PARITY_UPSTREAM=http://127.0.0.1:5347`, `PARITY_NOW` and `PARITY_SEED` from `pages.json`, the `siteEnv` of `pages.json`, and the same content revision.

Then run `npm run parity:compare -- --target <url>`. While compare runs, it serves the replay proxy on port 5347.

Expected differences are approved by the product owner only, never by an agent, and approvals are **per site**: every approved rule applies to every later compare, so when a new baseline is recorded, remove the rules it no longer needs. Until the product owner signs a difference off, it is listed as PENDING in the PR with its screenshots. Once approved, it is encoded in `pages.json`, never by editing the baseline:

- `ignoreHeaders` drops a header from both snapshots.
- `approvedDifferences` holds one rule per case list and snapshot field. Each rule names the `cases`, the field `path` (dotted; `[*]` pairs up array elements, e.g. `analytics.events[*].props.items`), and exactly what the new value must be: `actual` (an exact value, `"$absent"` for a dropped field), `actualSameAs` (equal to another field of the same capture), `addsOnly` (an array that is the baseline plus exactly these entries) `replace` (the baseline value with each listed `[from, to]` string replaced, on its JSON text) or `mask` (a string equal to the baseline once the regex matches are blanked). `baseline` optionally pins the old value as well, and `approval` cites the sign-off. Where the capture matches, compare resets that field to the baseline value; any other change to the field still fails. The summary lists the rules applied per case.

Both are applied to the baseline and the new capture at compare time, so approving a difference needs no re-record.

A rule with `"status": "pending"` is a difference that is explained but **not approved**: it applies like an approval, the summary prints the case as `PENDING`, and `npm run parity:compare -- --strict` fails until the product owner approves it by deleting the `status` field. Agents add pending rules; only the product owner removes the status.

### Pending baselines

Some pages can differ from the baseline as a whole, for one explained reason, in ways a field rule can't express. `pendingBaselines` in `pages.json` lists such a rule with its `cases` and a `dir`. Compare checks those cases against the new capture pinned in that `dir` instead of the baseline: identical is reported **PENDING** (never ok), anything else is a DIFF, so a regression on those pages still fails. `--strict` fails on them; `--no-pending` compares them with the baseline again.

`record-pending --rule <id>` makes the pinned capture. Its first pass serves the baseline's recordings where they exist and records only what they lack from the live upstream, at the fixed time: server-side requests into `<dir>/upstream.json` (used only for that rule's cases and only on a miss in the baseline's store) and browser third parties into `<dir>/har/` (tried after the case's baseline HAR). Its second pass replays everything and writes `<dir>/screens` and `<dir>/snapshots`, plus `<dir>/README.md` and `<dir>/baseline-vs-new/diff/` (red-pixel PNGs and snapshot diffs) showing how each case differs from the baseline. Like `parity/baseline`, the recorded fixtures (`har/`, `upstream.json`) aren't committed; the screens, snapshots and diffs are.

## Tailwind and the harness

Tailwind v4 detects class names in every non-ignored file of the repo, so text in `parity/` (selectors, step names) would otherwise add CSS to the site build and change pixels. `src/styles/app.css` therefore has `@source not "../../parity";`. `x-cache-version` (the git sha of the build) is snapshotted as `<build-id>`: its presence is checked, its value is not.

Analytics snapshot shape: `{ views, events }`. `views` lists pageviews in order. `events` is the sorted, de-duplicated set of `{name, path, props}`: view-triggered events (e.g. `view_item_list`) fire from IntersectionObservers, so their count and order vary with scroll timing, while which events fire with which payloads is stable.

## Pending for the product owner

Nothing below is approved. Each item is a `"status": "pending"` entry in `pages.json` or, where none can express it, listed here.

`refactor: v8-native blocks` (branch `feat/v8-native`), against the baseline recorded from main `0da47c7`:

- `css-bundle-unused-rules` (rule, the `link` header of every HTML case): the stylesheet's file name changes because the stylesheet lost the utilities only the removed pre-redesign sections and saved blocks used, and those only the removed PDP components' README named (`.select`, `.transition`, `.duration-150`, `data-[loading=true]:opacity-60`: Tailwind generates CSS from the class names it finds in every source file, Markdown included). No rendered element uses them, and no case changes a pixel.
- Not expressible as a rule (the snapshot holds the `<head>`, not the body): every section's wrapper changes from `id="Capy-HeroScene" data-manifest-key="site/sections/Capy/HeroScene.tsx"` to `id="hero-scene" data-manifest-key="hero-scene"` (the site editor's click-to-edit finds a section by `data-manifest-key`, which must be its block type), and the pages that had the SeoPLPV2/SeoPDPV2 sections lose their empty Suspense boundary (comment nodes and React's streaming ids only).
