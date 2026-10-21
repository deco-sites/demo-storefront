import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createDecoRouter } from "@decocms/tanstack/router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // One QueryClient per router: the server creates a router per request, so a visitor's cart and user
  // never reach another visitor's render. The browser creates one router, so it keeps one client.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  // Deco's router: plain URLSearchParams search params (commerce filter URLs such as
  // `?filter.size=M&filter.size=L` round-trip unchanged, and `?q=` is kept), scroll restoration,
  // preload on intent.
  return createDecoRouter({
    routeTree,
    context: { queryClient },
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
