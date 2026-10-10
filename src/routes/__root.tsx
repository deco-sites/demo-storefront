import { createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { CART_QUERY_KEY, getCartServerFn } from "../platform/cart";
import { getUserServerFn, USER_QUERY_KEY } from "../platform/user";
import { RootDocument } from "../runtime/RootDocument";
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "deco for capybaras" },
      {
        name: "description",
        content:
          "Clothes made for capybaras to wear, in a capybara world. Dressed for doing nothing.",
      },
      { name: "theme-color", content: "#f6f1e7" },
      // Open Graph / Twitter defaults so shared links render a preview card.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "deco for capybaras" },
      { property: "og:title", content: "deco for capybaras" },
      {
        property: "og:description",
        content:
          "Clothes made for capybaras to wear, in a capybara world. Dressed for doing nothing.",
      },
      { property: "og:image", content: "/capy/img/b-rain-d@2x.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      // The redesign's typeface, self-hosted (public/capy/fonts).
      {
        rel: "preload",
        href: "/capy/fonts/Switzer-Variable.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    // The bag drawer renders with the Header section (src/sections/Capy/Header.tsx), which carries
    // its editable settings.
    <RootDocument />
  );
}
