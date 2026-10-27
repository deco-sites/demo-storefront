/**
 * The document every page renders in: the DECO.events bus and the data-event observer that the
 * site's analytics events go through, a navigation progress bar, a content area that keeps
 * its height while the next page loads, @decocms/tanstack's `DecoPreview` (the Studio bridge, the
 * draft badge, and the draft and CDN segment token `createDecoWorker` hands the page), and the
 * router's head and scripts.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { HeadContent, Outlet, ScriptOnce, Scripts, useRouterState } from "@tanstack/react-router";
import { DecoPreview } from "@decocms/tanstack/react";

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
 * It waits for a Speculation Rules prerender to activate before observing anything.
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
 * A loading bar at the top of the page during client-side navigation: the site's
 * `brand-primary-500` color when it defines one, else the inherited text color.
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

/**
 * Deco Analytics — the first-party collector (decocms/analytics).
 *
 * KEYED, not Host-resolved. The collector reads the `Host` header of the request for its own
 * bundle, which only works on a zone it has a route on (`analytics.decocdn.com/_dq/*`,
 * `*.deco.site/_dq/*`). This site answers on `demo-storefront.deco-cx.workers.dev`, where a
 * request for `/_dq/a.js` reaches THIS worker and gets HTML back — so it declares a key instead.
 *
 * The key is PUBLIC by design: it ships in the page source, so it identifies the site and never
 * authenticates it. The collector cross-checks the request `Origin` against the domains
 * registered for this key and records a mismatch as `origin.mismatch` rather than silently
 * accepting it. Rows carry `site_id_source = 'tag'` and are never used for billing — only
 * Host-resolved sites are.
 *
 * NO BRIDGE CODE, deliberately. The site's `deco` module (enabled for this key) subscribes to
 * the `window.DECO.events` bus defined in EVENTS_BOOTSTRAP above and maps the GA4-shaped
 * commerce events to typed columns (`value`, `currency`, `item_ids`), which is what a plain
 * `track()` passthrough would lose. Arriving late costs nothing: the bus keeps a `_q` and
 * replays it to every new subscriber, which is why `async` here is safe even though the
 * observer below starts dispatching before the bundle lands.
 *
 * `async`, and nothing on the page reads from it — a failure here degrades to "analytics
 * stopped", never to "the page broke". `vite dev` sends nothing: the runtime does not collect
 * on localhost unless `__dq.dev` is set.
 *
 * PRODUCTION HOST ONLY, and the gate is the hostname rather than an environment variable on
 * purpose. `DECO_ENV_NAME` is a static var in `wrangler.jsonc`, so a per-PR preview carries
 * `production` exactly like production does and would not be separated by it. What actually
 * differs is where the page answers: previews are `<version>-demo-storefront.deco-cx.workers.dev`.
 *
 * Without this gate preview traffic still lands in the production site's numbers. It arrives
 * with an `Origin` outside the registered `domains`, so the collector flags it
 * `origin.mismatch` — but a flag is not a filter, and only the heatmap rollups exclude it.
 * `mv_analytics_hourly` and `mv_sessions` filter bots and nothing else, so every preview
 * pageview would be counted as a real one.
 *
 * HOST_ALLOWED must stay equal to the `domains` registered for the key; they are the same
 * decision enforced in two places, and the collector's copy is the authority.
 */
const DECO_ANALYTICS_KEY = "dq_pwJlAz_1uGtf814k5wV54Q";
const DECO_ANALYTICS_HOST = "demo-storefront.deco-cx.workers.dev";

/** Injects the tag only on the production host. Late injection is free: the `deco` module polls
 *  for the `DECO.events` bus and the bus replays its queue to whoever subscribes. */
const DECO_ANALYTICS_TAG = `
(function () {
  if (location.hostname !== ${JSON.stringify(DECO_ANALYTICS_HOST)}) return;
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://analytics.decocdn.com/_dq/a.js?k=${DECO_ANALYTICS_KEY}";
  document.head.appendChild(s);
})();
`;

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
        <DecoPreview site="demo-storefront" />
        <ScriptOnce children={DATA_EVENT_OBSERVER} />
        <ScriptOnce children={DECO_ANALYTICS_TAG} />
        <Scripts />
      </body>
    </html>
  );
}
