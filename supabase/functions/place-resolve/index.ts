// place-resolve: a venue name to one place, through Mapbox Search Box, for the Convene form
// (Convene Pass 1, SPEC section 3 "Place, resolved never typed"; rulings 633, 581; handoff PR 2).
//
// Input  { action: 'suggest' | 'retrieve', q: string, session_token: string,
//          proximity?: { lng: number, lat: number } | null, mapbox_id?: string }
// Output one of three typed states, never an error body for the member:
//   { state: 'one', place: Place }            exactly one suggestion (ruling owed 4, default), or a retrieve
//   { state: 'several', places: Suggested[] }  two to five suggestions; nothing is chosen for the member
//   { state: 'none' }                          zero, a short query, a 429, a timeout
// Place    = { place_id, place_name, area, city, country, lng, lat, timezone, label }
// Suggested = the same without coordinates or a time zone: Search Box's suggest carries none for a
//            poi or an address, so `several` hands back names and labels and the client's pick comes
//            back through `retrieve` for the coordinates, inside the same session_token. `one` is
//            resolved here: the single suggestion is retrieved in the same call, so the client holds
//            coordinates and the zone at once. label is `{place_name}, {area}, {city}` in Convene's
//            words (`Front Room, Osu, Accra`).
//
// Reference (cite, per the handoff): https://docs.mapbox.com/api/search/search-box/ — suggest
// GET /search/searchbox/v1/suggest with q, access_token, session_token, language, limit,
// proximity={lng},{lat}, types; retrieve GET /search/searchbox/v1/retrieve/{mapbox_id} with
// access_token and session_token, a GeoJSON FeatureCollection whose feature carries
// geometry.coordinates [lng, lat] and properties.context. Calls to suggest and the retrieve that
// follows them under one session_token bill as one session. Confidence High that the endpoints exist
// as named; Moderate on the parameter set, which was written from the reference as known at build
// because docs.mapbox.com was unreachable from the build environment (egress policy); the four
// proof calls the handoff owes are what confirms it on the deployed function.
//
// The token lives in Supabase secrets as MAPBOX_TOKEN and never reaches a client; the browser makes
// no Mapbox request, which is why src/lib/csp.ts no longer allows api.mapbox.com. The member's
// session is verified here against Supabase Auth (the JWT from the Authorization header, the same
// header dia-compose-read and connect-suggest read); no token means 401. Budget 3 s in total, one
// retry on a 5xx, a 429 from Mapbox is `none` with Retry-After echoed. The time zone is derived from
// the coordinates offline with tz-lookup (coordinate-only, no network; ruling: derived, never
// asked). This function never writes.
// Logs latency, action and state only. Never logs the query, the place or the member.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import tzlookup from "npm:tz-lookup@6.1.25";

const BUDGET_MS = 3000;
const MIN_CHARS = 3;
const MAX_CHARS = 256;
const LIMIT = 5;
const TYPES = "poi,address";
const LANGUAGE = "en";
const SEARCHBOX = "https://api.mapbox.com/search/searchbox/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extra, "Content-Type": "application/json" },
  });

export type Place = {
  place_id: string;
  place_name: string;
  area: string | null;
  city: string | null;
  country: string | null;
  lng: number;
  lat: number;
  timezone: string;
  label: string;
};
export type Suggested = Omit<Place, "lng" | "lat" | "timezone">;
export type Resolved =
  { state: "one"; place: Place } | { state: "several"; places: Suggested[] } | { state: "none" };

const NONE: Resolved = { state: "none" };

type Ctx = { name?: string; country_code?: string };
type Context = {
  country?: Ctx;
  region?: Ctx;
  place?: Ctx;
  locality?: Ctx;
  neighborhood?: Ctx;
  district?: Ctx;
};
type Suggestion = {
  name?: string;
  mapbox_id?: string;
  feature_type?: string;
  place_formatted?: string;
  full_address?: string;
  context?: Context;
};
type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Suggestion & { coordinates?: { longitude?: number; latitude?: number } };
};

function named(s: Suggestion): Suggested | null {
  const id = typeof s.mapbox_id === "string" ? s.mapbox_id : "";
  const name = typeof s.name === "string" ? s.name.trim() : "";
  if (!id || !name) return null;
  const ctx = s.context ?? {};
  const area = ctx.neighborhood?.name ?? ctx.locality?.name ?? ctx.district?.name ?? null;
  const city = ctx.place?.name ?? ctx.locality?.name ?? ctx.region?.name ?? null;
  const country = ctx.country?.name ?? null;
  const parts = [name, area, city].filter((p, i, a) => p && a.indexOf(p) === i) as string[];
  const label =
    parts.length > 1
      ? parts.join(", ")
      : s.place_formatted
        ? name + ", " + s.place_formatted
        : name;
  return { place_id: id, place_name: name, area, city, country, label };
}

function zoneFor(lng: number, lat: number): string | null {
  try {
    const z = (tzlookup as (lat: number, lng: number) => string)(lat, lng);
    return typeof z === "string" && z ? z : null;
  } catch {
    return null;
  }
}

function placeOf(f: Feature): Place | null {
  const props = f.properties ?? {};
  const base = named(props);
  const coords = f.geometry?.coordinates;
  const lng = Array.isArray(coords) ? Number(coords[0]) : Number(props.coordinates?.longitude);
  const lat = Array.isArray(coords) ? Number(coords[1]) : Number(props.coordinates?.latitude);
  if (!base || !Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const timezone = zoneFor(lng, lat);
  if (!timezone) return null;
  return { ...base, lng, lat, timezone };
}

/** One Mapbox call inside the shared budget: one retry on a 5xx, a 429 surfaces as such. */
async function mapbox(
  url: URL,
  signal: AbortSignal,
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; retryAfter: string | null }> {
  let last = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
    if (res.ok) return { ok: true, body: await res.json().catch(() => null) };
    last = res.status;
    try {
      await res.body?.cancel();
    } catch {
      /* closed */
    }
    if (res.status === 429)
      return { ok: false, status: 429, retryAfter: res.headers.get("retry-after") };
    if (res.status < 500) break;
  }
  return { ok: false, status: last, retryAfter: null };
}

function retrieveUrl(token: string, session: string, id: string): URL {
  const u = new URL(SEARCHBOX + "/retrieve/" + encodeURIComponent(id));
  u.searchParams.set("access_token", token);
  u.searchParams.set("session_token", session);
  u.searchParams.set("language", LANGUAGE);
  return u;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(NONE, 405);
  const started = Date.now();

  // The member's session, verified against Auth. A missing or invalid token is 401, never a state.
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json(NONE, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anon) return json(NONE, 500);
  const sb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: who, error: authError } = await sb.auth.getUser();
  if (authError || !who?.user) return json(NONE, 401);

  let action: "suggest" | "retrieve" = "suggest";
  let q = "";
  let session = "";
  let proximity: { lng: number; lat: number } | null = null;
  let mapboxId = "";
  try {
    const body = await req.json();
    action = body?.action === "retrieve" ? "retrieve" : "suggest";
    q = typeof body?.q === "string" ? body.q.trim().slice(0, MAX_CHARS) : "";
    session = typeof body?.session_token === "string" ? body.session_token.trim() : "";
    mapboxId = typeof body?.mapbox_id === "string" ? body.mapbox_id.trim().slice(0, 200) : "";
    const p = body?.proximity;
    if (
      p &&
      typeof p === "object" &&
      Number.isFinite(p.lng) &&
      Number.isFinite(p.lat) &&
      Math.abs(p.lng) <= 180 &&
      Math.abs(p.lat) <= 90
    )
      proximity = { lng: p.lng, lat: p.lat };
  } catch {
    return json(NONE, 400);
  }
  // The session token is the client's; it is what makes suggest and retrieve one billed session.
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(session)) return json(NONE, 400);

  const token = Deno.env.get("MAPBOX_TOKEN");
  if (!token) {
    // Names only, never values: tells an operator which secret is missing or misnamed.
    const names = Object.keys(Deno.env.toObject()).filter((k) => /MAPBOX/i.test(k));
    console.log(JSON.stringify({ event: "place_no_key", candidate_env_names: names }));
    return json(NONE);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  const done = (state: Resolved["state"], extra?: Record<string, string>) => {
    clearTimeout(timer);
    console.log(
      JSON.stringify({ event: "place_resolve", action, state, latency_ms: Date.now() - started }),
    );
    return extra;
  };

  try {
    if (action === "retrieve") {
      if (!mapboxId) return json(NONE, 400);
      const r = await mapbox(retrieveUrl(token, session, mapboxId), controller.signal);
      if (!r.ok) {
        done("none");
        return json(
          NONE,
          200,
          r.status === 429 && r.retryAfter ? { "Retry-After": r.retryAfter } : {},
        );
      }
      const feature = (r.body as { features?: Feature[] } | null)?.features?.[0];
      const place = feature ? placeOf(feature) : null;
      done(place ? "one" : "none");
      return json(place ? { state: "one", place } : NONE);
    }

    // suggest: under three characters is `none` without a call.
    if (q.length < MIN_CHARS) {
      done("none");
      return json(NONE);
    }
    const u = new URL(SEARCHBOX + "/suggest");
    u.searchParams.set("q", q);
    u.searchParams.set("access_token", token);
    u.searchParams.set("session_token", session);
    u.searchParams.set("language", LANGUAGE);
    u.searchParams.set("limit", String(LIMIT));
    u.searchParams.set("types", TYPES);
    // 633: a home narrows the lookup and never filters it, which is what proximity does and a
    // bbox or country would not.
    if (proximity) u.searchParams.set("proximity", proximity.lng + "," + proximity.lat);
    const r = await mapbox(u, controller.signal);
    if (!r.ok) {
      done("none");
      return json(
        NONE,
        200,
        r.status === 429 && r.retryAfter ? { "Retry-After": r.retryAfter } : {},
      );
    }
    const raw = (r.body as { suggestions?: Suggestion[] } | null)?.suggestions ?? [];
    const places = raw
      .map(named)
      .filter((p): p is Suggested => p !== null)
      .slice(0, LIMIT);
    if (places.length === 0) {
      done("none");
      return json(NONE);
    }
    if (places.length >= 2) {
      done("several");
      return json({ state: "several", places });
    }
    // Exactly one (ruling owed 4, default): resolve it now, in the same session, so the client holds
    // the coordinates and the zone without a second round trip.
    const one = places[0]!;
    const rr = await mapbox(retrieveUrl(token, session, one.place_id), controller.signal);
    const feature = rr.ok ? (rr.body as { features?: Feature[] } | null)?.features?.[0] : undefined;
    const place = feature ? placeOf(feature) : null;
    if (!place) {
      // The name is known but not the point: the words stand in place_text on the client (SPEC 3).
      done("none");
      return json(NONE);
    }
    done("one");
    return json({ state: "one", place });
  } catch {
    done("none");
    return json(NONE);
  }
});
