import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SECURITY_TXT_PATH, securityTxt } from "./lib/contact";
import { CSP_NONCE_HEADER, mintNonce, securityHeaders } from "./lib/csp";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Ruling 387: security.txt (RFC 9116) is served here, from the contact constants module, rather
// than as a static file under public/. A static file would carry the address literal a third time
// and the scan in tests/contact.cjs allows exactly two files; served from the worker entry there is
// one source for the address and for the Expires date, and no dependence on how a dot-prefixed
// directory survives the Vite copy or Cloudflare Pages' asset rules. Text only; no UI, no route.
function securityTxtResponse(): Response {
  return new Response(securityTxt(), {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

// Ruling 438 (F19): the six security headers on every response this worker produces, the CSP with
// this response's nonce. The body streams through untouched; only the headers are re-built.
function withSecurityHeaders(response: Response, nonce: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of securityHeaders(nonce)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const nonce = mintNonce();
    if (new URL(request.url).pathname === SECURITY_TXT_PATH)
      return withSecurityHeaders(securityTxtResponse(), nonce);
    try {
      const handler = await getServerEntry();
      // The router reads the nonce back from this header (src/lib/csp.ts) when it is created for
      // the request, so every inline script TanStack Start emits carries it.
      const headers = new Headers(request.headers);
      headers.set(CSP_NONCE_HEADER, nonce);
      const response = await handler.fetch(new Request(request, { headers }), env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), nonce);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    }
  },
};
