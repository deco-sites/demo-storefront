/**
 * The redesign's icon sprite and the white-balance filter the Rio field uses (see
 * src/styles/capy.css `.rstage img`). Rendered once per page by the Header section; every icon
 * is a `<use href="#i-…">` into it.
 */
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="wb" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="1.09 0 0 0 0  0 1.14 0 0 0  0 0 1.22 0 0  0 0 0 1 0" />
      </filter>
      <symbol id="i-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2" />
      </symbol>
      <symbol id="i-bag" viewBox="0 0 24 24">
        <path d="M5.5 8.5h13l-1 11.5h-11z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </symbol>
      <symbol id="i-user" viewBox="0 0 24 24">
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.6 3.8-5.2 7-5.2s5.8 1.6 7 5.2" />
      </symbol>
      <symbol id="i-menu" viewBox="0 0 24 24">
        <path d="M4 9h16M4 15h16" />
      </symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </symbol>
      <symbol id="i-left" viewBox="0 0 24 24">
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </symbol>
      <symbol id="i-plus" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14" />
      </symbol>
      <symbol id="i-minus" viewBox="0 0 24 24">
        <path d="M5 12h14" />
      </symbol>
      <symbol id="i-close" viewBox="0 0 24 24">
        <path d="m6 6 12 12M18 6 6 18" />
      </symbol>
      <symbol id="i-down" viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6" />
      </symbol>
      <symbol id="i-rain" viewBox="0 0 24 24">
        <path d="M7 15.5a4 4 0 0 1 .4-8 5.5 5.5 0 0 1 10.3 1.6A3.2 3.2 0 0 1 17 15.5z" />
        <path d="m9 18-1 2.5M13 18l-1 2.5M17 18l-1 2.5" />
      </symbol>
      <symbol id="i-water" viewBox="0 0 24 24">
        <path d="M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15M3 19c2 0 2-1.5 4.5-1.5S9.5 19 12 19s2.5-1.5 4.5-1.5S19 19 21 19" />
        <path d="M12 4c2 2.6 3 4.4 3 5.6a3 3 0 0 1-6 0c0-1.2 1-3 3-5.6z" />
      </symbol>
      <symbol id="i-truck" viewBox="0 0 24 24">
        <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z" />
        <circle cx="7" cy="17.5" r="1.8" />
        <circle cx="17.5" cy="17.5" r="1.8" />
      </symbol>
      <symbol id="m-ring" viewBox="0 0 24 24">
        <rect x="1.5" y="1.5" width="21" height="21" rx="2" />
        <circle cx="12" cy="12" r="6" />
      </symbol>
      <symbol id="m-meander" viewBox="0 0 24 24">
        <rect x="1.5" y="1.5" width="21" height="21" rx="2" />
        <path d="M6 18V6h12v12h-8v-8h4v4" />
      </symbol>
      <symbol id="m-quatre" viewBox="0 0 24 24">
        <rect x="1.5" y="1.5" width="21" height="21" rx="2" />
        <path d="M12 12C10 9 10 6.6 12 4.6c2 2 2 4.4 0 7.4zM12 12c3-2 5.4-2 7.4 0-2 2-4.4 2-7.4 0zM12 12c2 3 2 5.4 0 7.4-2-2-2-4.4 0-7.4zM12 12c-3 2-5.4 2-7.4 0 2-2 4.4-2 7.4 0z" />
      </symbol>
      <symbol id="m-petal" viewBox="0 0 24 24">
        <path d="M12 12C9.6 8.4 9.6 5.4 12 3c2.4 2.4 2.4 5.4 0 9zM12 12c3.6-2.4 6.6-2.4 9 0-2.4 2.4-5.4 2.4-9 0zM12 12c2.4 3.6 2.4 6.6 0 9-2.4-2.4-2.4-5.4 0-9zM12 12c-3.6 2.4-6.6 2.4-9 0 2.4-2.4 5.4-2.4 9 0z" />
      </symbol>
    </svg>
  );
}

export type IconName =
  | "search"
  | "bag"
  | "user"
  | "menu"
  | "arrow"
  | "left"
  | "plus"
  | "minus"
  | "close"
  | "down"
  | "rain"
  | "water"
  | "truck";

export function Ico({ name, className = "ico" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

export type MotifName = "ring" | "meander" | "quatre" | "petal";

export function Motif({ name, className = "motif" }: { name: MotifName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`#m-${name}`} />
    </svg>
  );
}
