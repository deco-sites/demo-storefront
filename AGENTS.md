# AGENTS.md

Guidance for AI agents and automated tooling working in this repository.

## Stack

TanStack Start (React) storefront on the next major of Deco CMS
(`@decocms/blocks`), deployed to Cloudflare Workers via wrangler. Dev server:
`npm run dev` (Vite). Build: `npm run build`. Type-check: `npm run typecheck`.
Pages are rendered as described in the TanStack Start guide of the Deco docs
(descriptors): `src/open-page.server.ts` routes on the release index
(`routes()` → `matchRoute`, then the redirects block via `redirects()`; never
`list("page")`) and resolves each section, `src/views.ts` maps each section to its component.

## Deco CMS content (`.deco/`) — read before editing content

**Source of truth: the site in Studio** (the `DECO_SITE` var in `wrangler.jsonc`
names it; the `deco` CLI reads it from there). The site
reads the published release from the delivery CDN at runtime; nothing is bundled.
`.deco/blocks/` is git-ignored: `deco pull` fills it with one JSON file per saved
block (pages, sections, matchers, site settings, and `Redirects`, the one
block holding every redirect rule), named by the URI-encoded block name. For ANY content change: `deco pull`, edit only the
matching `.deco/blocks/*.json` file(s), run `deco schema && deco check` (0 errors),
`deco diff`, then `deco push --draft=<name>`. A push never goes live; only
`deco publish --draft=<name>` (or Studio) does.

**The block map is `.deco/index.ts`**: every type content can name, by its
short name (`hero-scene`, `product-rail`, `device`, …). The one
exception is the page SEO block, `website/sections/Seo/SeoV2.tsx`: the site
editor writes that name into new pages, so keep it. A section returns a
descriptor; a new section needs an entry there and in `src/views.ts`.

**Never hand-edit generated files:**

- `.deco/schema.gen.json` (`deco schema`; committed)
- `src/routeTree.gen.ts`

## Code changes

- Cite files as `path:line` when explaining code.
- Run `npm run typecheck` after TypeScript changes.
- `npm run format` (Prettier) before committing `src/**` changes.
