/** Footer (capybara redesign): about line, link columns, the closing line and the legal row, on paper. */
import type { ImageWidget } from "~/types/widgets";

export interface FooterLink {
  /** @title Label */
  label: string;
  /** @title Link */
  href: string;
}

export interface FooterColumn {
  /** @title Title */
  title: string;
  /** @title Links */
  links: FooterLink[];
}

export interface Props {
  /** @title About */
  about?: string;
  /** @title Columns */
  columns?: FooterColumn[];
  /** @title Closing line */
  closingLine?: string;
  /** @title Legal lines */
  legal?: string[];
  /**
   * @title Logo
   * @format image-uri
   */
  logo?: ImageWidget;
  /** @title Sub-line next to the logo */
  subline?: string;
  /** @title Logo width (px) */
  logoWidth?: number;
}

export default function Footer({
  about,
  columns = [],
  closingLine,
  legal = [],
  logo = "/capy/deco-logo.svg",
  subline = "for capybaras",
  logoWidth = 128,
}: Props) {
  return (
    <footer className="site-footer" role="contentinfo" data-section="Footer">
      <div className="wrap">
        <div className="cols">
          {about && <p className="about">{about}</p>}
          {columns.map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {closingLine && <p className="closing">{closingLine}</p>}
        <div className="base">
          <a className="foot-brand" href="/" aria-label={`deco ${subline}, home`}>
            <img
              src={logo}
              width={482}
              height={200}
              alt="deco"
              loading="lazy"
              style={{ width: logoWidth }}
            />
            {subline && <span>{subline}</span>}
          </a>
          {legal.length > 0 && (
            <p className="legal">
              {legal.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
