import { DecoPageRenderer } from "@decocms/tanstack";
import { deferredSectionLoader } from "@decocms/tanstack/sdk/deferredSectionLoader";

/**
 * Sections that expose their own top-level landmark and therefore must stay
 * outside `<main>`: `<header>`/`<footer>` only expose the `banner`/`contentinfo`
 * roles while they are NOT nested inside `<main>`, so we cannot simply wrap the
 * whole section list in a single element.
 */
const HEADER_SECTION = /\/sections\/Header\//;
const FOOTER_SECTION = /\/sections\/Footer\//;

/**
 * Sections that are not page content: the landmark ones above, sections that
 * render nothing visible (Theme), and the site-wide globals that the CMS route
 * loader prepends to every page (`site.global` in .deco/blocks/site.json —
 * currently htmx, Analytics and Session). Those globals sit *before* the page's
 * own Header, so they must not be mistaken for content when computing the
 * `<main>` boundary — otherwise the boundary would start at index 0 and swallow
 * the Header.
 */
const NON_CONTENT_SECTION =
  /\/sections\/(Header|Footer|Theme)\/|\/sections\/Session\.tsx$|htmx\/sections\/|\/sections\/Analytics\//;

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

/** Every section of the page paired with its original CMS position. */
function sectionPositions(page: CmsPage) {
  const eager = page.resolvedSections ?? [];
  const deferred = page.deferredSections ?? [];

  return [
    ...eager.map((s, i) => ({
      position: s.index ?? i,
      component: s.component ?? "",
    })),
    ...deferred.map((d) => ({
      position: d.index,
      component: d.component ?? "",
    })),
  ];
}

/**
 * Range of CMS positions that `<main>` should cover.
 *
 * Anchored on the Header/Footer positions themselves rather than on "everything
 * that is not a layout section", so unrelated non-content sections sitting
 * outside them (the site-wide globals) cannot stretch the range over the
 * landmarks.
 */
function contentRange(page: CmsPage) {
  const all = sectionPositions(page);
  const content = all.filter((s) => !NON_CONTENT_SECTION.test(s.component));
  if (!content.length) return null;

  const header = all.find((s) => HEADER_SECTION.test(s.component));
  const footer = all.find((s) => FOOTER_SECTION.test(s.component));

  const start = header
    ? header.position + 1
    : Math.min(...content.map((s) => s.position));
  const end = footer
    ? footer.position - 1
    : Math.max(...content.map((s) => s.position));

  if (start > end) return null;
  return { start, end };
}

type Group = "before" | "main" | "after";

/**
 * Renders a CMS page's sections wrapped in semantic landmarks: layout sections
 * (Header/Footer/Theme) and site-wide globals stay at the top level, the page
 * content between Header and Footer goes inside `<main>`.
 */
export default function CmsPageSections({ page }: { page: CmsPage }) {
  const eager = page.resolvedSections ?? [];
  const deferred = page.deferredSections ?? [];
  const range = contentRange(page);

  const renderGroup = (group: Group) => {
    const keep = (position: number, component: string) => {
      // Nothing but layout sections: keep them all at the top level.
      if (!range) return group === "before";
      // Header/Footer never go inside `<main>`, whatever their position is.
      if (HEADER_SECTION.test(component)) return group === "before";
      if (FOOTER_SECTION.test(component)) return group === "after";
      if (group === "before") return position < range.start;
      if (group === "after") return position > range.end;
      return position >= range.start && position <= range.end;
    };

    const groupEager = eager.filter((s, i) =>
      keep(s.index ?? i, s.component ?? ""),
    );
    const groupDeferred = deferred.filter((d) =>
      keep(d.index, d.component ?? ""),
    );
    if (!groupEager.length && !groupDeferred.length) return null;

    // Deferred promises are keyed `d_<original index>` by the route loader.
    const groupPromises = page.deferredPromises
      ? Object.fromEntries(
          Object.entries(page.deferredPromises).filter(([key]) => {
            const position = Number(key.replace(/^d_/, ""));
            const section = deferred.find((d) => d.index === position);
            return keep(position, section?.component ?? "");
          }),
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
