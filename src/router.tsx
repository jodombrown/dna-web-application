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
    defaultPreloadStaleTime: 0,
    // Ruling 438: the per-response CSP nonce on every inline script the router emits during SSR.
    // On the client this is undefined and the router reads the shell's csp-nonce meta instead.
    ssr: { ...(nonce ? { nonce } : {}) },
  });

  return router;
};
