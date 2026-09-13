// Ruling 438 (F19): the security headers, in one place, for every response the worker produces.
//
// The Content-Security-Policy keeps script-src at 'self' plus a per-response nonce. TanStack
// Start's SSR emits two inline scripts (the scroll-restoration bootstrap and the router's
// dehydrated state behind the stream barrier), and their content changes per request, so a hash
// cannot cover them and 'unsafe-inline' is the thing this policy exists to refuse.
//
// Rulings 542 and 545: one value, two layers, and no HTMLRewriter pass over the body. The render
// is the layer that mints, because it is the only layer that can stamp the script tags: the nonce
// is minted here, inside the per-request router factory, set on `ssr.nonce` so every inline script
// the router emits carries it, echoed in the shell as `<meta property="csp-nonce">` so the
// client-side router reads the same value at hydration, and recorded on CSP_NONCE_HEADER so the
// worker entry can build this response's policy from the same value and strip the header again.
// It travels on the response and never on a request, because handing it forward meant rebuilding
// the incoming Request, and `new Request(request, { headers })` is what ruling 542 names: the dev
// server's Request is not the global one, so undici read its internals as undefined and threw
// before any route rendered. Nothing on this path constructs a Request.
//
// Static assets never run an inline script; their copy of these headers is public/_headers, which
// carries the same policy with script-src 'self' and no nonce.
import { createIsomorphicFn } from "@tanstack/react-start";
import { getResponseHeader, setResponseHeader } from "@tanstack/react-start/server";

/** The response header the render uses to hand the nonce to the worker entry. Internal only: the
 *  worker strips it before the response leaves, so it never reaches a client or a cache. */
export const CSP_NONCE_HEADER = "x-dna-csp-nonce";

/**
 * This response's nonce on the server, minted once per request; undefined on the client, where the
 * meta tag carries it. Idempotent: a second call in the same request reads back the first value
 * rather than minting a second one, so the markup and the policy can never disagree.
 */
export const cspNonce = createIsomorphicFn()
  .server((): string | undefined => {
    try {
      const already = getResponseHeader(CSP_NONCE_HEADER);
      if (already) return already;
      const nonce = mintNonce();
      setResponseHeader(CSP_NONCE_HEADER, nonce);
      return nonce;
    } catch {
      // Outside the server request runtime (a build-time render, a client bundle): no nonce, and
      // the policy falls back to script-src 'self' with no inline script to cover.
      return undefined;
    }
  })
  .client((): string | undefined => undefined);

const SUPABASE = "https://dgspjevjoblujcoljvkn.supabase.co";
const SUPABASE_WS = "wss://dgspjevjoblujcoljvkn.supabase.co";

export function contentSecurityPolicy(nonce: string | undefined): string {
  const script = nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self'";
  return [
    "default-src 'self'",
    `connect-src 'self' ${SUPABASE} ${SUPABASE_WS} https://api.mapbox.com`,
    `img-src 'self' data: blob: https: ${SUPABASE}`,
    script,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** The six headers of ruling 438, as name and value pairs, for one response. */
export function securityHeaders(nonce: string | undefined): [string, string][] {
  return [
    ["Content-Security-Policy", contentSecurityPolicy(nonce)],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
    ["X-Content-Type-Options", "nosniff"],
    ["Permissions-Policy", "camera=(self), geolocation=(), microphone=()"],
  ];
}

/** A fresh nonce: 128 bits, base64, per response. */
export function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
