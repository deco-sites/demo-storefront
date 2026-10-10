/**
 * The document every page renders in. In v7 the site composed it from @decocms/tanstack's pieces in
 * src/routes/__root.tsx; the markup is the same: the DECO.events bus and the data-event observer
 * that the site's analytics events go through, a navigation progress bar, a content area that keeps
 * its height while the next page loads, v7's editor bridge (LiveControls), and the router's head and
 * scripts.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { HeadContent, Outlet, ScriptOnce, Scripts, useRouterState } from "@tanstack/react-router";
import { LiveControls } from "../vendor/blocks/LiveControls";

/** The DECO.events bus. Events dispatched before a subscriber exists are replayed to it. */
const EVENTS_BOOTSTRAP = `
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
 * Dispatches the events elements declare with `data-event` (src/sdk/useSendEvent.ts), on view or click.
 * v7's `ANALYTICS_SCRIPT` (@decocms/blocks 7.64.3, src/sdk/analytics.ts): it waits for a Speculation
 * Rules prerender to activate before observing anything.
 */
const DATA_EVENT_OBSERVER = `
(function() {
  function start() {
  function dispatch(event) {
    if (window.dataLayer) {
      window.dataLayer.push({ event: event.name, ...event.params });
    }
    if (window.DECO && window.DECO.events) {
      window.DECO.events.dispatch(event);
    }
  }

  function getEvent(el) {
    var raw = el.getAttribute("data-event");
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(raw)); } catch(e) { return null; }
  }

  var viewObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var event = getEvent(entry.target);
        if (event) dispatch(event);
        viewObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.addEventListener("click", function(e) {
    var el = e.target.closest("[data-event-trigger='click']");
    if (el) {
      var event = getEvent(el);
      if (event) dispatch(event);
    }
  });

  function observeAll() {
    document.querySelectorAll("[data-event-trigger='view']").forEach(function(el) {
      viewObserver.observe(el);
    });
  }

  observeAll();
  var mo = new MutationObserver(observeAll);
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(function() { mo.observe(document.body, { childList: true, subtree: true }); });
  } else {
    setTimeout(function() { mo.observe(document.body, { childList: true, subtree: true }); }, 0);
  }
  }

  if (document.prerendering) {
    document.addEventListener('prerenderingchange', start, { once: true });
  } else {
    start();
  }
})();
`;

const PROGRESS_CSS = `
@keyframes progressSlide { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.nav-progress-bar { animation: progressSlide 1s ease-in-out infinite; }
`;

/**
 * A loading bar at the top of the page during client-side navigation (v7's `NavigationProgress`,
 * @decocms/tanstack 7.64.3): the site's `brand-primary-500` color when it defines one, else the
 * inherited text color.
 */
function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  if (!isLoading) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden"
      style={{ color: "var(--color-brand-primary-500, currentColor)" }}
      role="progressbar"
      aria-label="Carregando página"
    >
      <style dangerouslySetInnerHTML={{ __html: PROGRESS_CSS }} />
      {/* Track and bar are siblings so the track's 20% alpha does not inherit onto the bar. */}
      <div className="absolute inset-0" style={{ backgroundColor: "currentColor", opacity: 0.2 }} />
      <div
        className="nav-progress-bar absolute inset-y-0 left-0 w-1/3 rounded-full"
        style={{ backgroundColor: "currentColor" }}
      />
    </div>
  );
}

/** Keeps the content area's height while the next page loads, so the footer doesn't jump. */
function StableOutlet() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const ref = useRef<HTMLDivElement>(null);
  const [savedHeight, setSavedHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (isLoading && ref.current) setSavedHeight(ref.current.offsetHeight);
    else if (!isLoading) setSavedHeight(undefined);
  }, [isLoading]);

  return (
    <div ref={ref} style={savedHeight ? { minHeight: savedHeight } : undefined}>
      <Outlet />
    </div>
  );
}

declare global {
  interface Window {
    __deco_ready?: boolean;
  }
}

export function RootDocument({ children }: { children?: ReactNode }) {
  // Pages wait for this signal before running work that must follow hydration.
  useEffect(() => {
    const id = setTimeout(() => {
      window.__deco_ready = true;
      document.dispatchEvent(new Event("deco:ready"));
    }, 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="capy" suppressHydrationWarning>
        <ScriptOnce children={EVENTS_BOOTSTRAP} />
        <NavigationProgress />
        {/* A plain div, not <main>: the page wraps its content sections in <main id="main-content">
            itself (src/runtime/PageView.tsx), between the Header and Footer landmarks. */}
        <div>
          <StableOutlet />
        </div>
        {children}
        <LiveControls site="demo-storefront" />
        <ScriptOnce children={DATA_EVENT_OBSERVER} />
        <Scripts />
      </body>
    </html>
  );
}
