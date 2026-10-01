import { mintNonce, securityHeaders } from "@/lib/csp";
import { withCspNonce } from "@/lib/csp-nonce.server";
import { renderErrorPage } from "@/lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};
let serverEntryPromise: Promise<ServerEntry> | undefined;
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise)
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  return serverEntryPromise;
}
function withHeaders(response: Response, nonce: string, pathname: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of securityHeaders(nonce, pathname)) headers.set(name, value);
  headers.set("X-Robots-Tag", "noindex");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const nonce = mintNonce();
    const pathname = new URL(request.url).pathname;
    try {
      const handler = await getServerEntry();
      const response = await withCspNonce(nonce, () => handler.fetch(request, env, ctx));
      return withHeaders(response, nonce, pathname);
    } catch (error) {
      console.error(error);
      return withHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
        pathname,
      );
    }
  },
};
