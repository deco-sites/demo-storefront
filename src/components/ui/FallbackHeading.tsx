import { useEffect, useRef, useState } from "react";

/**
 * Visually hidden `<h1>` used as a safety net for CMS-driven pages.
 *
 * The section list of a CMS page is content, not code, so we can't guarantee
 * at build time that one of the published sections emits an `<h1>` (the home
 * page, for instance, renders a `Carousel` whose slide titles are `<span>`s).
 * Without an `<h1>` screen readers lose the page's main subject and the
 * `page-has-heading-one` accessibility check fails.
 *
 * Rendering this heading unconditionally would risk the opposite problem — two
 * `<h1>`s — as soon as a section that does provide one (e.g. `Content/Hero` or
 * `Content/Intro`) is added to the same page. So the heading is rendered on the
 * server and removes itself on mount when any other `<h1>` is present in the
 * document.
 */
export default function FallbackHeading({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [redundant, setRedundant] = useState(false);

  useEffect(() => {
    const others = Array.from(document.querySelectorAll("h1")).filter(
      (el) => el !== ref.current,
    );
    if (others.length) setRedundant(true);
  }, []);

  if (redundant) return null;

  return (
    <h1 ref={ref} className="sr-only">
      {text}
    </h1>
  );
}
