// Ruling 438 (F19): the security headers, in one place, for every response the worker produces.
//
// The Content-Security-Policy keeps script-src at 'self' plus a per-response nonce. TanStack
// Start's SSR emits two inline scripts (the scroll-restoration bootstrap and the router's
// dehydrated state behind the stream barrier), and their content changes per request, so a hash
// cannot cover them and 'unsafe-inline' is the thing this policy exists to refuse. The nonce is
// minted in src/server.ts, handed to the router through a request header (never a global), set
// on `ssr.nonce` so every inline script the router emits carries it, and echoed in the shell as
// `<meta property="csp-nonce">` so the client-side router reads the same value at hydration.
//
// Static assets never run an inline script; their copy of these headers is public/_headers, which
// carries the same policy with script-src 'self' and no nonce.
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/** The request header the worker entry uses to hand the nonce to the router. Internal only. */
export const CSP_NONCE_HEADER = "x-dna-csp-nonce";

/** The nonce for this request on the server; undefined on the client, where the meta tag carries it. */
export const cspNonce = createIsomorphicFn()
  .server((): string | undefined => {
    try {
      return getRequestHeader(CSP_NONCE_HEADER) || undefined;
    } catch {
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
