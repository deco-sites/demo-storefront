import { DecoPageRenderer } from "@decocms/tanstack";

type SectionLike = { component?: string; key?: string };

/**
 * CMS sections are rendered as a flat list of siblings. Header renders
 * <header role="banner"> and Footer renders <footer role="contentinfo">, but
 * everything between them had no <main> of its own, and the only <main> on the
 * page wrapped all three — which scopes banner/contentinfo to that main and
 * stops them counting as page landmarks. See __root.tsx, which replaced that
 * wrapper with a neutral <div id="app">.
 *
 * This splits the page's sections into header / content / footer groups and
 * wraps only the content group in <main>, so the three landmarks are siblings.
 * CMS order is preserved inside each group (DecoPageRenderer sorts by index).
 */
const isHeader = (s: SectionLike) => /sections\/Header\//.test(s.component ?? s.key ?? "");
const isFooter = (s: SectionLike) => /sections\/Footer\//.test(s.component ?? s.key ?? "");

type Props = Omit<Parameters<typeof DecoPageRenderer>[0], "sections">;

interface PageLandmarksProps extends Props {
  sections: Parameters<typeof DecoPageRenderer>[0]["sections"];
}

export default function PageLandmarks({ sections, deferredSections, ...rest }: PageLandmarksProps) {
  const eager = sections ?? [];
  const deferred = deferredSections ?? [];

  const group = (predicate: (s: SectionLike) => boolean) => ({
    sections: eager.filter(predicate),
    deferredSections: deferred.filter(predicate),
  });

  const header = group(isHeader);
  const footer = group(isFooter);
  const content = group((s) => !isHeader(s) && !isFooter(s));

  const hasHeader = header.sections.length + header.deferredSections.length > 0;
  const hasFooter = footer.sections.length + footer.deferredSections.length > 0;

  return (
    <>
      {hasHeader && <DecoPageRenderer {...rest} {...header} />}
      <main id="main-content">
        <DecoPageRenderer {...rest} {...content} />
      </main>
      {hasFooter && <DecoPageRenderer {...rest} {...footer} />}
    </>
  );
}
