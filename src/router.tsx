import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cspNonce } from "./lib/csp";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();
  const nonce = cspNonce();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // W58 (ruling 465) at the cause. The document never scrolls inside the shell (ruling 104): every
    // tier scrolls its own container, so the router's element restoration is what governs them, not
    // window scroll. On a navigation to a location it has no entry for, that restoration copies the
    // outgoing location's element positions into the incoming one and applies them — which is how a
    // profile opened from a Members card arrived already scrolled past its masthead, and why a
    // scrollTo on the profile's mount would only have papered over it. Naming the shell's scrollers
    // here is the framework's own answer: they are excluded from that copy and scrolled to the top
    // instead.
    //
    // Ruling 105 is unaffected in both directions. Expanding a card in place navigates with
    // resetScroll: false, so nothing here runs; collapsing goes back, and a location the router
    // already holds an entry for is restored from that entry rather than scrolled to the top.
    scrollToTopSelectors: [
      '[data-scroller="feed"]',
      '[data-scroller="left"]',
      '[data-scroller="right"]',
    ],
    defaultPreloadStaleTime: 0,
    // Ruling 438: the per-response CSP nonce on every inline script the router emits during SSR.
    // On the client this is undefined and the router reads the shell's csp-nonce meta instead.
    ssr: { ...(nonce ? { nonce } : {}) },
  });

  return router;
};
