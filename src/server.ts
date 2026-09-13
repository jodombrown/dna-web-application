import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SECURITY_TXT_PATH, securityTxt } from "./lib/contact";
import { CSP_NONCE_HEADER, securityHeaders } from "./lib/csp";

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
//
// Ruling 545: the nonce arrives on CSP_NONCE_HEADER, put there by the render (src/lib/csp.ts) after
// it stamped the same value on every inline script it emitted, so the policy and the markup are one
// value by construction rather than by two layers agreeing. The header is internal and is stripped
// here; a response with no nonce (security.txt, the error page, an asset) gets script-src 'self'.
//
// Cloudflare Pages serves this worker in advanced mode (Nitro emits dist/_worker.js), which is why
// the minting does not sit in a functions/_middleware.ts: a _worker.js makes Pages ignore the
// functions directory entirely, so a middleware layer there would never run. This entry is the
// outermost layer the deployment has.
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  const nonce = headers.get(CSP_NONCE_HEADER) ?? undefined;
  headers.delete(CSP_NONCE_HEADER);
  for (const [name, value] of securityHeaders(nonce)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (new URL(request.url).pathname === SECURITY_TXT_PATH)
      return withSecurityHeaders(securityTxtResponse());
    try {
      const handler = await getServerEntry();
      // The incoming request is passed through as it arrived. Ruling 542: rebuilding it to carry
      // the nonce forward is what broke `vite dev`, and ruling 545 moved the nonce onto the
      // response instead, so there is nothing to hand forward here.
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
