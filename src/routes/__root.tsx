import { useEffect } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { NavigationProgress, StableOutlet } from "@decocms/tanstack";
import { LiveControls } from "@decocms/blocks/hooks";
import { ANALYTICS_SCRIPT } from "@decocms/blocks/sdk/analytics";
import { CART_QUERY_KEY, getCartServerFn } from "../platform/cart";
import { getUserServerFn, USER_QUERY_KEY } from "../platform/user";
import MinicartDrawer from "../components/minicart/MinicartDrawer";
// @ts-ignore Vite ?url import
import appCss from "../styles/app.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ context }) => {
    const tasks: Promise<unknown>[] = [];
    if (!context.queryClient.getQueryData(CART_QUERY_KEY)) {
      tasks.push(
        getCartServerFn()
          .then((cart) => context.queryClient.setQueryData(CART_QUERY_KEY, cart))
          .catch(() => {}),
      );
    }
    if (!context.queryClient.getQueryData(USER_QUERY_KEY)) {
      tasks.push(
        getUserServerFn()
          .then((user) => context.queryClient.setQueryData(USER_QUERY_KEY, user))
          .catch(() => {}),
      );
    }
    await Promise.all(tasks);
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Storefront-tanstack" },
    ],
    links: [
      { rel: "preconnect", href: "https://api.fontshare.com" },
      {
        rel: "stylesheet",
        href: "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootLayout,
});

// Kept verbatim from DecoRootLayout — it bootstraps window.DECO.events before
// hydration so sections can dispatch analytics events immediately.
const DECO_EVENTS_BOOTSTRAP = `
window.__RUNTIME__ = window.__RUNTIME__ || { account: "" };
window.DECO = window.DECO || {};
window.DECO.events = window.DECO.events || {
  _q: [],
  _subs: [],
  dispatch: function(e) {
    this._q.push(e);
    for (var i = 0; i < this._subs.length; i++) {
      try { this._subs[i](e); } catch(err) { console.error('[DECO.events]', err); }
    }
  },
  subscribe: function(fn) {
    this._subs.push(fn);
    for (var i = 0; i < this._q.length; i++) {
      try { fn(this._q[i]); } catch(err) {}
    }
  }
};
window.dataLayer = window.dataLayer || [];
`;

/**
 * Composed from @decocms/tanstack's individual pieces instead of using
 * <DecoRootLayout>, which wraps the outlet in a <main>. That wrapper swallowed
 * every page's header/main/footer, producing a nested second <main> and pulling
 * banner/contentinfo landmarks inside main (where they stop counting as page
 * landmarks). The wrapper here is a neutral <div>, so each route is free to
 * emit header / main / footer as siblings of the body.
 */
function RootLayout() {
  useEffect(() => {
    const id = setTimeout(() => {
      (window as unknown as { __deco_ready?: boolean }).__deco_ready = true;
      document.dispatchEvent(new Event("deco:ready"));
    }, 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-base-200 text-base-content" suppressHydrationWarning>
        <ScriptOnce children={DECO_EVENTS_BOOTSTRAP} />
        <NavigationProgress />
        <div id="app">
          <StableOutlet />
        </div>
        <MinicartDrawer />
        <LiveControls site="demo-storefront" />
        <ScriptOnce children={ANALYTICS_SCRIPT} />
        <Scripts />
      </body>
    </html>
  );
}
