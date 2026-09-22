// The browser origins Convene's Edge Functions answer (handoff 30-D item 3.1): the app at APP_ORIGIN
// and the Pages previews at https://*.dna-web-application.pages.dev, and nothing else. A request with
// no Origin header is not a browser's and is not gated here; what it may do is decided in the database.

const PAGES_PREVIEW = /^https:\/\/[a-z0-9-]+\.dna-web-application\.pages\.dev$/i;

/** The origin to echo in Access-Control-Allow-Origin, or null when it is not one of ours. */
export function allowedOrigin(origin: string | null, appOrigin: string): string | null {
  if (!origin) return null;
  if (origin === appOrigin.replace(/\/$/, "")) return origin;
  if (PAGES_PREVIEW.test(origin)) return origin;
  return null;
}

/** CORS headers for an allowed origin. Vary so a cache never serves one origin's answer to another. */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
