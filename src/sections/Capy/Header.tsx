/**
 * Header (capybara redesign): a floating glass pill with the logo, the main links, search,
 * account and the bag. `night` starts transparent over a dark hero and turns to paper glass after
 * 80px of scroll; `paper` is paper glass from the start. The bag drawer (Minicart) and the icon
 * sprite render here too, once per page.
 */
import { useEffect, useState } from "react";
import type { ImageWidget } from "~/types/widgets";
import type { Product } from "~/vendor/commerce/types";
import { useCart } from "~/platform/cart";
import { MINICART_DRAWER_ID } from "~/constants";
import { type CardProduct, toCards } from "~/sdk/capyProduct";
import { IconSprite, Ico } from "~/components/capy/Icons";
import Minicart, { type MinicartSettings } from "~/components/capy/Minicart";

export interface NavLink {
  /** @title Label */
  label: string;
  /** @title Link */
  href: string;
}

export interface Props {
  /**
   * @title Logo
   * @format image-uri
   */
  logo?: ImageWidget;
  /** @title Sub-line next to the logo */
  subline?: string;
  /** @title Links */
  links?: NavLink[];
  /** @title Show search */
  showSearch?: boolean;
  /** @title Show account */
  showAccount?: boolean;
  /**
   * @title Theme
   * @description night: transparent over a dark hero until the page scrolls. paper: paper glass.
   */
  theme?: "night" | "paper";
  /** @title Search placeholder */
  searchPlaceholder?: string;
  /** @title Bag drawer */
  minicart?: MinicartSettings;
  /**
   * @title Bag cross-sell
   * @description Two products offered in the bag drawer.
   */
  crossSell?: Product[] | null;
}

export const loader = (props: Props) => ({
  ...props,
  crossSell: toCards(props.crossSell).slice(0, 4),
});

type ViewProps = Omit<Props, "crossSell"> & { crossSell?: CardProduct[] };

function BagButton() {
  const { cart } = useCart();
  const count = cart.totalQuantity;
  return (
    <label
      htmlFor={MINICART_DRAWER_ID}
      className="bag-btn"
      role="button"
      tabIndex={0}
      aria-label={count ? `Bag, ${count} ${count === 1 ? "item" : "items"}` : "Bag"}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.currentTarget as HTMLLabelElement).click();
        }
      }}
    >
      <Ico name="bag" />
      {count > 0 && <span className="bag-count">{count > 9 ? "9+" : count}</span>}
    </label>
  );
}

export default function Header({
  logo = "/capy/deco-logo.svg",
  subline = "for capybaras",
  links = [],
  showSearch = true,
  showAccount = true,
  theme = "paper",
  searchPlaceholder = "Search the herd",
  minicart,
  crossSell = [],
}: ViewProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    if (theme !== "night") return;
    const on = () => setScrolled(window.scrollY > 80);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setSearch(false);
      const toggle = document.getElementById(MINICART_DRAWER_ID) as HTMLInputElement | null;
      if (toggle) toggle.checked = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = menu || search;
  const night = theme === "night" && !scrolled && !open;
  return (
    <>
      <IconSprite />
      <header
        role="banner"
        className={`nav veil ${night ? "nav-night" : "nav-paper"}${open ? " is-open" : ""}`}
        data-section="Header"
      >
        <a className="brand" href="/" aria-label={`deco ${subline}, home`}>
          <img src={logo} width={482} height={200} alt="deco" />
          {subline && <span className="brand-sub">{subline}</span>}
        </a>
        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <a key={l.href + l.label} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          {showSearch && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Search"
              aria-expanded={search}
              onClick={() => {
                setSearch(!search);
                setMenu(false);
              }}
            >
              <Ico name={search ? "close" : "search"} />
            </button>
          )}
          {showAccount && (
            <a className="icon-btn acct" href="/account" aria-label="Account">
              <Ico name="user" />
            </a>
          )}
          <BagButton />
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label="Menu"
            aria-expanded={menu}
            onClick={() => {
              setMenu(!menu);
              setSearch(false);
            }}
          >
            <Ico name={menu ? "close" : "menu"} />
          </button>
        </div>
        {search && (
          <form className="nav-panel nav-search" action="/s" method="get" role="search">
            <label className="sr" htmlFor="capy-search">
              Search
            </label>
            <Ico name="search" />
            <input
              id="capy-search"
              name="q"
              type="search"
              placeholder={searchPlaceholder}
              autoComplete="off"
              autoFocus
            />
            <button className="pill pill-lime pill-sm" type="submit">
              Search
            </button>
          </form>
        )}
        {menu && (
          <nav className="nav-panel nav-menu" aria-label="Menu">
            {showSearch && (
              <form className="nav-search" action="/s" method="get" role="search">
                <Ico name="search" />
                <input name="q" type="search" placeholder={searchPlaceholder} aria-label="Search" />
              </form>
            )}
            {links.map((l) => (
              <a key={l.href + l.label} href={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </a>
            ))}
            {showAccount && <a href="/account">Account</a>}
          </nav>
        )}
      </header>
      <Minicart settings={minicart} crossSell={crossSell} />
    </>
  );
}
