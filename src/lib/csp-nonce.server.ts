// The per-request home of this response's CSP nonce (rulings 438, 542, 545). Server only, and it is
// its own module for a reason the build states out loud: `node:async_hooks` cannot be constructed in a
// browser bundle, and src/lib/csp.ts is imported by the router, which ships to the client. Keeping the
// store here means the client bundle never sees the import at all — with it in csp.ts, Vite
// externalises the module to an empty object and `new AsyncLocalStorage()` becomes `new undefined`,
// which throws while the client bundle is still evaluating and takes hydration down with it.
//
// Request-scoped, not a global in the sense that matters: a module-level variable shared across
// requests is what would let one response's nonce reach another, and this cannot, because the value
// exists only inside the `run` the worker entry opened for that one request. TanStack Start holds its
// own request event exactly this way (@tanstack/start-server-core's request-response module).
import { AsyncLocalStorage } from "node:async_hooks";

const nonceStore = new AsyncLocalStorage<string>();

/**
 * Run the render with this response's nonce in scope. Called once per request by src/server.ts, which
 * keeps the same value for the response's Content-Security-Policy, so the policy and the markup are
 * one value by construction rather than by two layers agreeing.
 */
export function withCspNonce<T>(nonce: string, run: () => T): T {
  return nonceStore.run(nonce, run);
}

/** This request's nonce, or undefined outside a request (a build-time render). */
export function nonceInScope(): string | undefined {
  return nonceStore.getStore();
}
