/**
 * Pure ordering logic behind the page's `<main>` landmark (src/runtime/PageView.tsx).
 *
 * The CMS section list is flat and already contains the Header (`role=banner`)
 * and Footer (`role=contentinfo`) sections, so we can't wrap the whole list in
 * `<main>` — that would nest those landmarks and stop them from being
 * top-level. Instead we compute the span of the list that holds the page
 * content and render only that span inside `<main>`.
 */

/**
 * A section of the page, by the landmark its view declares (src/views.ts): the Header renders the
 * `banner` landmark and the Footer `contentinfo`; every other section is page content.
 */
export type PositionedSection = { landmark?: "header" | "footer" };

type SectionKind = "header" | "footer" | "content";

const sectionKind = (s: PositionedSection): SectionKind => s.landmark ?? "content";

interface MainBounds {
  /** First position (inclusive) that belongs inside `<main>`. */
  first: number;
  /** Last position (inclusive) that belongs inside `<main>`. */
  last: number;
}

/**
 * Given every section paired with its position in the original CMS order,
 * returns the `<main>` boundaries, or `null` when there is no content to wrap.
 *
 * The bounds start at the first content section and end at the last one, then
 * are clamped so that no Header-ish or Footer-ish section can ever fall inside
 * them.
 */
export function mainBounds(positioned: { s: PositionedSection; pos: number }[]): MainBounds | null {
  const content = positioned.filter(({ s }) => sectionKind(s) === "content").map(({ pos }) => pos);
  if (!content.length) return null;

  let first = Math.min(...content);
  let last = Math.max(...content);

  // A Header-ish section inside the span pushes `main` to start after the last
  // of them; a Footer-ish section pushes it to end before the first of them.
  const headers = positioned.filter(({ s }) => sectionKind(s) === "header").map(({ pos }) => pos);
  const footers = positioned.filter(({ s }) => sectionKind(s) === "footer").map(({ pos }) => pos);

  const headersInSpan = headers.filter((pos) => pos >= first && pos < last);
  if (headersInSpan.length) first = Math.max(...headersInSpan) + 1;

  const footersInSpan = footers.filter((pos) => pos > first && pos <= last);
  if (footersInSpan.length) last = Math.min(...footersInSpan) - 1;

  if (first > last) return null;

  // Known limitation: exactly one `<main>` per document is allowed, so a page
  // with several content runs separated by Header/Footer sections (e.g.
  // [Header, Content, Header, Content, Footer]) can only have one of them
  // wrapped — the clamping above keeps the landmarks correct, but the content
  // outside the chosen span stays outside `main`. That layout isn't produced by
  // any page in this site; warn loudly if the CMS ever yields one.
  const orphans = content.filter((pos) => pos < first || pos > last);
  if (orphans.length) {
    console.warn(
      `[PageSections] ${orphans.length} content section(s) at position(s) ` +
        `${orphans.join(", ")} fall outside <main> (${first}..${last}) because ` +
        `a Header/Footer section splits the page content into multiple runs. ` +
        `Reorder the page so all content sits between the Header and the Footer.`,
    );
  }

  return { first, last };
}
