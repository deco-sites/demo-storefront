# PENDING: listing-gets-page-url

Not approved. PENDING product-owner approval (not approved). On v7 the Shopify listing loader never got the page URL (it fell back to https://localhost), so every category, search, catch-all and /sitemap.xml page asked Shopify for the collection "" and showed "12 of 0" results, live too. v8 passes the page URL: the breadcrumb names the collection or the query, the listing JSON-LD carries the collection's title and description, and the page lists the collection's products. The store's catalog was replaced on 2026-10-10 (its old collections are empty now), so the capture pinned here, recorded after that, shows today's empty collections: identical to v7 except the breadcrumb and the JSON-LD. parity/pending/listing-live-before-catalog-change/ has v8 captured live on 2026-10-09, before the change, listing the products (7 shirts, filters, sort).

Pinned from `85052fc` with `node parity/run.mjs record-pending --rule listing-gets-page-url`. Compare checks these cases against `screens/` and `snapshots/` here (reported PENDING when identical); `--strict` fails on them. The v7 captures are in `parity/baseline/screens/`; `v7-vs-new/diff/` has the red-pixel diffs and snapshot diffs.

Upstream misses in the replayed capture: 0.

| case | v7 baseline vs this capture |
|---|---|
| plp-shirts@mobile | plp-shirts@mobile--page.png: 204 px differ (0.030%); snapshot differs (diff/plp-shirts@mobile.snapshot.diff) |
| plp-shirts@desktop | plp-shirts@desktop--page.png: 219 px differ (0.015%); snapshot differs (diff/plp-shirts@desktop.snapshot.diff) |
| plp-stickers@mobile | plp-stickers@mobile--page.png: 273 px differ (0.041%); snapshot differs (diff/plp-stickers@mobile.snapshot.diff) |
| plp-stickers@desktop | plp-stickers@desktop--page.png: 289 px differ (0.020%); snapshot differs (diff/plp-stickers@desktop.snapshot.diff) |
| plp-hoodies@mobile | plp-hoodies@mobile--page.png: 656 px differ (0.098%); snapshot differs (diff/plp-hoodies@mobile.snapshot.diff) |
| plp-hoodies@desktop | plp-hoodies@desktop--page.png: 669 px differ (0.046%); snapshot differs (diff/plp-hoodies@desktop.snapshot.diff) |
| plp-shirts-sorted@mobile | plp-shirts-sorted@mobile--page.png: 204 px differ (0.030%); snapshot differs (diff/plp-shirts-sorted@mobile.snapshot.diff) |
| plp-shirts-sorted@desktop | plp-shirts-sorted@desktop--page.png: 219 px differ (0.015%); snapshot differs (diff/plp-shirts-sorted@desktop.snapshot.diff) |
| plp-empty-collection@mobile | plp-empty-collection@mobile--page.png: 316 px differ (0.047%); snapshot differs (diff/plp-empty-collection@mobile.snapshot.diff) |
| plp-empty-collection@desktop | plp-empty-collection@desktop--page.png: 330 px differ (0.023%); snapshot differs (diff/plp-empty-collection@desktop.snapshot.diff) |
| search@mobile | search@mobile--page.png: 953 px differ (0.142%); snapshot differs (diff/search@mobile.snapshot.diff) |
| search@desktop | search@desktop--page.png: 977 px differ (0.068%); snapshot differs (diff/search@desktop.snapshot.diff) |
| search-no-results@mobile | search-no-results@mobile--page.png: 1200 px differ (0.178%); snapshot differs (diff/search-no-results@mobile.snapshot.diff) |
| search-no-results@desktop | search-no-results@desktop--page.png: 1231 px differ (0.085%); snapshot differs (diff/search-no-results@desktop.snapshot.diff) |
| not-found@mobile | not-found@mobile--page.png: 754 px differ (0.112%); snapshot differs (diff/not-found@mobile.snapshot.diff) |
| not-found@desktop | not-found@desktop--page.png: 776 px differ (0.054%); snapshot differs (diff/not-found@desktop.snapshot.diff) |
| not-found-single@mobile | not-found-single@mobile--page.png: 501 px differ (0.074%); snapshot differs (diff/not-found-single@mobile.snapshot.diff) |
| not-found-single@desktop | not-found-single@desktop--page.png: 521 px differ (0.036%); snapshot differs (diff/not-found-single@desktop.snapshot.diff) |
| sitemap-xml-page@mobile | sitemap-xml-page@mobile--page.png: 396 px differ (0.059%); snapshot differs (diff/sitemap-xml-page@mobile.snapshot.diff) |
| sitemap-xml-page@desktop | sitemap-xml-page@desktop--page.png: 410 px differ (0.028%); snapshot differs (diff/sitemap-xml-page@desktop.snapshot.diff) |
| search-submit@mobile | search-submit@mobile--results.png: 950 px differ (0.141%); snapshot differs (diff/search-submit@mobile.snapshot.diff) |
| search-submit@desktop | search-submit@desktop--results.png: 977 px differ (0.068%); snapshot differs (diff/search-submit@desktop.snapshot.diff) |
| plp-sort@mobile | plp-sort@mobile--sorted.png: 204 px differ (0.030%); snapshot differs (diff/plp-sort@mobile.snapshot.diff) |
| plp-sort@desktop | plp-sort@desktop--sorted.png: 219 px differ (0.015%); snapshot differs (diff/plp-sort@desktop.snapshot.diff) |
| header-nav-spa@desktop | header-nav-spa@desktop--shirts.png: 219 px differ (0.015%); snapshot differs (diff/header-nav-spa@desktop.snapshot.diff) |
