import { useEffect, useRef } from "react";

/**
 * Ref to attach to an element with the `reveal` CSS class (see app.css) —
 * fades/blurs/rises the element in once it scrolls into view, then
 * disconnects. Falls back to immediately-visible when IntersectionObserver
 * isn't available (rare) or `prefers-reduced-motion` handles the rest via CSS.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-revealed", "true");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-revealed", "true");
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
