import { DecoPageRenderer } from "@decocms/tanstack";

type SectionLike = { component?: string; key?: string };

/**
 * CMS sections are rendered as a flat list of siblings, so any section that
 * doesn't render its own landmark (Header renders <header>, Footer renders
 * <footer>) ends up outside every semantic region. Screen reader users then
 * can't jump between page regions and the content reads as orphaned text.
 *
 * This splits the page's sections into header / content / footer groups and
 * wraps the content group in <main>, keeping the CMS order inside each group.
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
