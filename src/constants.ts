// SEO safety net. Used by the root route's static `head()` and passed to
// `cmsHomeRouteConfig` as `defaultDescription`, so the home page always emits a
// `<meta name="description">` in the SSR HTML even when the CMS page has no
// `seo` block (page not found, loader error, description cleared in the admin).
export const SITE_NAME = "Storefront-tanstack";
export const SITE_DESCRIPTION =
  "Shop the new season at Storefront-tanstack — apparel, accessories and more, with up to 60% off.";

export const MINICART_FORM_ID = "minicart-form";
export const MINICART_DRAWER_ID = "minicart-drawer";

export const SIDEMENU_CONTAINER_ID = "sidemenu";
export const SIDEMENU_DRAWER_ID = "sidemenu-drawer";

export const SEARCHBAR_INPUT_FORM_ID = "searchbar-form";

export const USER_ID = "user-json";

export const WISHLIST_FORM_ID = "wishlist-form";

// Floating glass header — a single compact bar on every breakpoint (see
// src/sections/Header/Header.tsx). HEADER_HEIGHT is the space the page
// reserves (spacer element); the visible bar itself is fixed inside it.
export const HEADER_TOP_GAP = "12px";
export const HEADER_BAR_HEIGHT_DESKTOP = "64px";
export const HEADER_BAR_HEIGHT_MOBILE = "56px";
export const HEADER_HEIGHT_DESKTOP = "76px";
export const HEADER_HEIGHT_MOBILE = "68px";
