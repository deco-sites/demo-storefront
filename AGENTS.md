# AGENTS.md

Guidance for AI agents and automated tooling working in this repository.

## Stack

TanStack Start (React) storefront on the next major of Deco CMS
(`@decocms/blocks`), deployed to Cloudflare Workers via wrangler. Dev server:
`npm run dev` (Vite). Build: `npm run build`. Type-check: `npm run typecheck`.
Pages are rendered as described in the TanStack Start guide of the Deco docs
(descriptors): `src/open-page.server.ts` finds the page with `matchRoute` and
resolves each section, `src/views.ts` maps each section to its component.

## Deco CMS content (`.deco/`) — read before editing content

**Source of truth: `.deco/blocks/<encoded-key>.json`** — one JSON file per
saved block (pages, sections, redirects, matchers, site settings). The filename is the
URI-encoded name. For ANY content change, edit only the matching
`.deco/blocks/*.json` file(s), then run `npm run prebuild` (`deco schema`,
`deco content`, `deco check`): `deco check` must report 0 errors.

**The block map is `.deco/index.ts`**: every type content can name, by its
short name (`hero-scene`, `product-rail`, `device`, …). The one
exception is the page SEO block, `website/sections/Seo/SeoV2.tsx`: the site
editor writes that name into new pages, so keep it. A section returns a
descriptor; a new section needs an entry there and in `src/views.ts`.

**Never hand-edit generated files:**

- `.deco/schema.gen.json` (`deco schema`; committed)
- `.deco/blocks.gen.ts` (`deco content`; gitignored)
- `src/routeTree.gen.ts`

## Code changes

- Cite files as `path:line` when explaining code.
- Run `npm run typecheck` after TypeScript changes.
- `npm run format` (Prettier) before committing `src/**` changes.
