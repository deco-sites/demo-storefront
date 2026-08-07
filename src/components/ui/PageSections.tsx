import { DecoPageRenderer } from "@decocms/tanstack";

/**
 * Wraps the CMS page content in a `<main>` landmark.
 *
 * The CMS section list is flat and already contains the Header (`role=banner`)
 * and Footer (`role=contentinfo`) sections, so we can't wrap the whole list in
 * `<main>` — that would nest those landmarks and stop them from being
 * top-level. Instead we split the list into the landmark sections that lead
 * and trail the page and render everything in between inside `<main>`, so no
 * page content is left outside a landmark region.
 */

type Section = { key?: string; component?: string; index?: number };

const LANDMARK_SECTION = /sections\/(Header|Footer|Theme)\//;

const isLandmark = (s: Section) =>
  LANDMARK_SECTION.test(s.component ?? "") || LANDMARK_SECTION.test(s.key ?? "");

interface Props {
  sections: any[];
  deferredSections?: any[];
  deferredPromises?: Record<string, Promise<any>>;
  pagePath?: string;
  pageUrl?: string;
  loadDeferredSectionFn?: any;
}

export default function PageSections({
  sections,
  deferredSections,
  deferredPromises,
  pagePath,
  pageUrl,
  loadDeferredSectionFn,
}: Props) {
  const eager = sections ?? [];
  const deferred = deferredSections ?? [];

  // Position of every section in the original CMS order.
  const positioned = [
    ...eager.map((s, i) => ({ s, pos: s?.index ?? i })),
    ...deferred.map((s, i) => ({ s, pos: s?.index ?? eager.length + i })),
  ];
  const contentPositions = positioned.filter(({ s }) => !isLandmark(s)).map(({ pos }) => pos);

  // No content sections (or no landmarks at all): nothing to split.
  if (!contentPositions.length) {
    return (
      <DecoPageRenderer
        sections={eager}
        deferredSections={deferred}
        deferredPromises={deferredPromises}
        pagePath={pagePath}
        pageUrl={pageUrl}
        loadDeferredSectionFn={loadDeferredSectionFn}
      />
    );
  }

  const first = Math.min(...contentPositions);
  const last = Math.max(...contentPositions);

  const pick = (from: number, to: number) => ({
    sections: eager.filter((s, i) => {
      const pos = s?.index ?? i;
      return pos >= from && pos <= to;
    }),
    deferredSections: deferred.filter((s, i) => {
      const pos = s?.index ?? eager.length + i;
      return pos >= from && pos <= to;
    }),
  });

  const before = pick(-Infinity, first - 1);
  const main = pick(first, last);
  const after = pick(last + 1, Infinity);

  const render = (group: ReturnType<typeof pick>) => (
    <DecoPageRenderer
      sections={group.sections}
      deferredSections={group.deferredSections}
      deferredPromises={deferredPromises}
      pagePath={pagePath}
      pageUrl={pageUrl}
      loadDeferredSectionFn={loadDeferredSectionFn}
    />
  );

  return (
    <>
      {render(before)}
      <main id="main-content">{render(main)}</main>
      {render(after)}
    </>
  );
}
