import { createRouter } from "@tanstack/react-router";
import { cspNonce } from "@/lib/csp";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const nonce = cspNonce();
  return createRouter({
    routeTree,
    defaultPreloadStaleTime: 0,
    // Ruling 438: the per-response CSP nonce on every inline script the router emits during SSR.
    ssr: { ...(nonce ? { nonce } : {}) },
  });
};
