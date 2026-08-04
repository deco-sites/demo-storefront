import { DecoPageRenderer } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";

/**
 * Sections that bring their own top-level landmark (`<header>` in Header,
 * `<footer>` in Footer) or render no visible content at all (Theme).
 *
 * Everything else is page content and belongs inside `<main>` so screen reader
 * users can jump straight to it with region shortcuts. The split matters:
 * `<header>`/`<footer>` only expose the `banner`/`contentinfo` landmarks while
 * they are NOT nested inside `<main>`, so we cannot simply wrap the whole
 * section list in a single element.
 */
const OWN_LANDMARK_SECTION = /\/sections\/(Header|Footer|Theme)\//;

interface SectionLike {
  component: string;
  index?: number;
}

interface CmsPage {
  resolvedSections?: SectionLike[];
  deferredSections?: (SectionLike & { index: number })[];
  deferredPromises?: Record<string, Promise<any>>;
  pagePath?: string;
  pageUrl?: string;
}

/** Original CMS positions of the sections that make up the page content. */
function contentRange(page: CmsPage) {
  const eager = page.resolvedSections ?? [];
  const deferred = page.deferredSections ?? [];

  const positions = [
    ...eager.map((s, i) => [s.index ?? i, s.component] as const),
    ...deferred.map((d) => [d.index, d.component] as const),
  ]
    .filter(([, component]) => !OWN_LANDMARK_SECTION.test(component ?? ""))
    .map(([position]) => position);

  if (!positions.length) return null;
  return { start: Math.min(...positions), end: Math.max(...positions) };
}

type Group = "before" | "main" | "after";

/**
 * Renders a CMS page's sections wrapped in semantic landmarks: layout sections
 * (Header/Footer/Theme) stay at the top level, everything between the first and
 * the last content section goes inside `<main>`.
 */
export default function CmsPageSections({ page }: { page: CmsPage }) {
  const eager = page.resolvedSections ?? [];
  const deferred = page.deferredSections ?? [];
  const range = contentRange(page);

  const renderGroup = (group: Group) => {
    const keep = (position: number) => {
      // Nothing but layout sections: keep them all at the top level.
      if (!range) return group === "before";
      if (group === "before") return position < range.start;
      if (group === "after") return position > range.end;
      return position >= range.start && position <= range.end;
    };

    const groupEager = eager.filter((s, i) => keep(s.index ?? i));
    const groupDeferred = deferred.filter((d) => keep(d.index));
    if (!groupEager.length && !groupDeferred.length) return null;

    // Deferred promises are keyed `d_<original index>` by the route loader.
    const groupPromises = page.deferredPromises
      ? Object.fromEntries(
          Object.entries(page.deferredPromises).filter(([key]) =>
            keep(Number(key.replace(/^d_/, ""))),
          ),
        )
      : undefined;

    return (
      <DecoPageRenderer
        sections={groupEager as any}
        deferredSections={groupDeferred as any}
        deferredPromises={groupPromises}
        pagePath={page.pagePath}
        pageUrl={page.pageUrl}
        loadDeferredSectionFn={deferredSectionLoader}
      />
    );
  };

  return (
    <>
      {renderGroup("before")}
      {range && <main>{renderGroup("main")}</main>}
      {renderGroup("after")}
    </>
  );
}
