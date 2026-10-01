// The admin app's worker entry (handoff 40-B sections 1 and 5). The member app's entry
// (src/server.ts) minus what is the member host's own, security.txt and h3's swallowed-error shape,
// with the admin headers in place of the member's. The nonce travels the member way (rulings 438,
// 542, 545): minted here, held in request scope, read by the router, stamped on the policy.
import { mintNonce } from "@/lib/csp";
import { withCspNonce } from "@/lib/csp-nonce.server";
import { renderErrorPage } from "@/lib/error-page";
import { adminSecurityHeaders } from "./lib/headers";

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

function withAdminHeaders(response: Response, nonce: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of adminSecurityHeaders(nonce)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const nonce = mintNonce();
    try {
      const handler = await getServerEntry();
      const response = await withCspNonce(nonce, () => handler.fetch(request, env, ctx));
      return withAdminHeaders(response, nonce);
    } catch (error) {
      console.error(error);
      return withAdminHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    }
  },
};
