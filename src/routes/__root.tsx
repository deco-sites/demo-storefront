import { createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { DecoRootLayout } from "@decocms/tanstack";
import { CART_QUERY_KEY, getCartServerFn } from "../platform/cart";
import { getUserServerFn, USER_QUERY_KEY } from "../platform/user";
import MinicartDrawer from "../components/minicart/MinicartDrawer";
// @ts-ignore Vite ?url import
import appCss from "../styles/app.css?url";

const SITE_TITLE = "Storefront-tanstack";
const SITE_DESCRIPTION = "Build profitable websites with deco.cx";
const SITE_URL = "https://demo-storefront.decocms.com/";
const SITE_IMAGE =
  "https://decoims.com/storefront-tanstack/bfe00763-d6fa-40f0-9fa9-77e6769fe02d/1742560188441-74d13a55-4c18-4a5c-8cb4-dcaa27aae923.png";

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
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      // Open Graph — without these, social shares render with no title,
      // description or preview image.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_TITLE },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: SITE_IMAGE },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: SITE_IMAGE },
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

function RootLayout() {
  return (
    <DecoRootLayout lang="en" siteName="demo-storefront">
      <MinicartDrawer />
    </DecoRootLayout>
  );
}
