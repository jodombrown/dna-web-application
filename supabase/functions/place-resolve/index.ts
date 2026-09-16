// place-resolve: a venue name to one place, through Mapbox Search Box, for the Convene form
// (Convene Pass 1, SPEC section 3 "Place, resolved never typed"; rulings 633, 581; handoff PR 2;
// Session 23 corrections "the unavailable state" and "place anchoring").
//
// Input  { action: 'suggest' | 'retrieve', q: string, session_token: string,
//          proximity?: { lng: number, lat: number } | null, country_name?: string | null,
//          mapbox_id?: string }
// Output one of four typed states, never an error body for the member:
//   { state: 'one', place: Place }            exactly one suggestion (ruling owed 4, default), or a retrieve
//   { state: 'several', places: Suggested[] }  two to five suggestions; nothing is chosen for the member
//   { state: 'none' }                          Mapbox answered 200 with zero suggestions, or the query
//                                              is under three characters and Mapbox was not called
//   { state: 'unavailable' }                   no answer was obtained from Mapbox: the fetch threw
//                                              (DNS, TLS, network), the status was not 200 (401 on a
//                                              bad or missing token, 403, 429, every 5xx), the budget
//                                              ran out, the token is not configured, or the call could
//                                              not be anchored (below). Never `none`: nothing was
//                                              found or not found, because the search did not run.
// Place    = { place_id, place_name, area, city, country, lng, lat, timezone, label, kind }
//            kind is 'venue' for a poi or an address and 'area' for a place, locality or
//            neighborhood (Session 23, change 2): Search Box holds no POI and no street addressing
//            for Ghana, so a venue there resolves to its area at best, and the form keeps the
//            member's words beside the resolved area rather than replacing them.
// Suggested = the same without coordinates or a time zone: Search Box's suggest carries none for a
//            poi or an address, so `several` hands back names and labels and the client's pick comes
//            back through `retrieve` for the coordinates, inside the same session_token. `one` is
//            resolved here: the single suggestion is retrieved in the same call, so the client holds
//            coordinates and the zone at once. label is `{place_name}, {area}, {city}` in Convene's
//            words (`Front Room, Osu, Accra`).
//
// Anchoring (Session 23, place anchoring; change 3 of the same session), in this order and never
// combined:
//   1. proximity given (a chosen home, 633): Search Box `proximity={lng},{lat}`, which narrows and
//      never filters.
//   2. no proximity, country_name given: Search Box `country=` with the ISO 3166-1 alpha-2 code for
//      that name, resolved through ICU's English region names (Intl.DisplayNames, long and short
//      styles) under a fixed fold. No table is kept here: a name ICU does not carry under that fold
//      resolves to nothing and falls to case 3. The form sends no country tonight: the country
//      derived from public.members.current_country is withdrawn (Session 23, change 3: a member in
//      California typing "Labadi beach" resolved to LABADIE CHERIE in West Palm Beach with a GMT-4
//      zone), and the parameter stays for the country control the member will set themselves, which
//      Design owns. Until then an in-person lookup with no chosen home is case 3.
//   3. neither: the call is not made and the state is `unavailable`, logged `reason: unanchored`.
//      Search Box applies the caller's IP as the proximity when none is sent (the reference: "if not
//      provided, the default is IP proximity"), and the caller is an Edge node, not the member; there
//      is no parameter that switches that default off. So an unanchored call cannot be made without
//      IP bias, and under "never bias by IP" it is not made. Case 3's form line is withheld pending
//      the founder's ruling; this refusal is the interim.
//
// Reference (cite, per the handoff): https://docs.mapbox.com/api/search/search-box/ — suggest
// GET /search/searchbox/v1/suggest with q, access_token, session_token, language, limit,
// proximity={lng},{lat} or country={alpha-2}, types; retrieve GET /search/searchbox/v1/retrieve/{mapbox_id}
// with access_token and session_token, a GeoJSON FeatureCollection whose feature carries
// geometry.coordinates [lng, lat] and properties.context. Calls to suggest and the retrieve that
// follows them under one session_token bill as one session. The suggest/retrieve pair and the
// parameter set are proven on the deployed function (Session 23); `country` is written from the
// reference's parameter table and is proven by the Ghana arm in tests/live-checks.cjs.
//
// The token lives in Supabase secrets as MAPBOX_TOKEN and never reaches a client; the browser makes
// no Mapbox request, which is why src/lib/csp.ts no longer allows api.mapbox.com. The member's
// session is verified here against Supabase Auth (the JWT from the Authorization header, the same
// header dia-compose-read and connect-suggest read); no token means 401. Budget 3 s in total, one
// retry on a 5xx, a 429 from Mapbox is `unavailable` with Retry-After echoed. The time zone is
// derived from the coordinates offline with tz-lookup (coordinate-only, no network; ruling: derived,
// never asked). This function never writes.
// Logs latency, action, state, the anchor kind and, for `unavailable`, the reason and the upstream
// status. Never logs the query, the place, the country or the member.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import tzlookup from "npm:tz-lookup@6.1.25";

const BUDGET_MS = 3000;
const MIN_CHARS = 3;
const MAX_CHARS = 256;
const LIMIT = 5;
// Session 23, change 2: place, locality and neighborhood beside poi and address. Verified by direct
// query: Mapbox holds no POI and no street addressing in Ghana; Osu comes back as a locality.
const TYPES = "poi,address,place,locality,neighborhood";
const VENUE_TYPES = new Set(["poi", "address"]);
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
  kind: "venue" | "area";
};
export type Suggested = Omit<Place, "lng" | "lat" | "timezone">;
export type Resolved =
  | { state: "one"; place: Place }
  | { state: "several"; places: Suggested[] }
  | { state: "none" }
  | { state: "unavailable" };

const NONE: Resolved = { state: "none" };
const UNAVAILABLE: Resolved = { state: "unavailable" };

type Anchor = "home" | "country" | "none";
type Reason = "status" | "fetch" | "budget" | "no_key" | "unanchored";

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

// ---- country name to ISO 3166-1 alpha-2, through ICU ------------------------------------------
// The fold makes a stored world_countries name and ICU's English name for the same region compare
// equal where they differ only in diacritics, case, "&" against "and", "St." against "Saint", a
// leading "the" or a parenthesised qualifier. Anything ICU names otherwise stays unresolved: those
// members fall to case 3, never to a guess. On Node 22 (ICU 78) 192 of the 195 stored names resolve;
// unresolved are "Cabo Verde" (ICU: Cape Verde), "Congo" (ICU: Congo - Brazzaville) and
// "Democratic Republic of the Congo" (ICU: Congo - Kinshasa).
const CODES: string[] = [];
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) CODES.push(String.fromCharCode(a, b));

function fold(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/\bst\.?\s/g, "saint ")
    .replace(/\bthe\b/g, " ")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

let regionIndex: Map<string, string> | null = null;
function countryCode(name: string): string | null {
  if (!regionIndex) {
    const index = new Map<string, string>();
    try {
      for (const style of ["long", "short"] as const) {
        const dn = new Intl.DisplayNames(["en"], { type: "region", style, fallback: "none" });
        for (const code of CODES) {
          let n: string | undefined;
          try {
            n = dn.of(code);
          } catch {
            n = undefined;
          }
          if (typeof n !== "string" || !n || n === code) continue;
          const key = fold(n);
          if (key && !index.has(key)) index.set(key, code);
        }
      }
    } catch {
      // No Intl.DisplayNames on this runtime: nobody resolves, and every member without a home
      // falls to case 3. The Ghana arm in tests/live-checks.cjs is what shows it either way.
    }
    regionIndex = index;
  }
  const key = fold(name);
  return key ? (regionIndex.get(key) ?? null) : null;
}

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
  const kind = VENUE_TYPES.has(typeof s.feature_type === "string" ? s.feature_type : "")
    ? "venue"
    : "area";
  return { place_id: id, place_name: name, area, city, country, label, kind };
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
    if (res.status === 200) return { ok: true, body: await res.json().catch(() => null) };
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
  if (req.method !== "POST") return json(UNAVAILABLE, 405);
  const started = Date.now();

  // The member's session, verified against Auth. A missing or invalid token is 401, never a state.
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer\s+\S+/i.test(auth)) return json(UNAVAILABLE, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anon) return json(UNAVAILABLE, 500);
  const sb = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: who, error: authError } = await sb.auth.getUser();
  if (authError || !who?.user) return json(UNAVAILABLE, 401);

  let action: "suggest" | "retrieve" = "suggest";
  let q = "";
  let session = "";
  let proximity: { lng: number; lat: number } | null = null;
  let countryName = "";
  let mapboxId = "";
  try {
    const body = await req.json();
    action = body?.action === "retrieve" ? "retrieve" : "suggest";
    q = typeof body?.q === "string" ? body.q.trim().slice(0, MAX_CHARS) : "";
    session = typeof body?.session_token === "string" ? body.session_token.trim() : "";
    mapboxId = typeof body?.mapbox_id === "string" ? body.mapbox_id.trim().slice(0, 200) : "";
    countryName =
      typeof body?.country_name === "string" ? body.country_name.trim().slice(0, 120) : "";
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
    return json(UNAVAILABLE, 400);
  }
  // The session token is the client's; it is what makes suggest and retrieve one billed session.
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(session)) return json(UNAVAILABLE, 400);

  // Home wins; the country is the fallback and never a second filter on top.
  const country = proximity ? null : countryName ? countryCode(countryName) : null;
  const anchor: Anchor = proximity ? "home" : country ? "country" : "none";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  const done = (state: Resolved["state"], detail?: { reason: Reason; status?: number }) => {
    clearTimeout(timer);
    console.log(
      JSON.stringify({
        event: "place_resolve",
        action,
        state,
        anchor,
        latency_ms: Date.now() - started,
        ...(detail ?? {}),
      }),
    );
  };
  const unavailable = (reason: Reason, status?: number, retryAfter?: string | null) => {
    done("unavailable", status === undefined ? { reason } : { reason, status });
    return json(
      UNAVAILABLE,
      200,
      status === 429 && retryAfter ? { "Retry-After": retryAfter } : {},
    );
  };

  const token = Deno.env.get("MAPBOX_TOKEN");
  if (!token) {
    // Names only, never values: tells an operator which secret is missing or misnamed.
    const names = Object.keys(Deno.env.toObject()).filter((k) => /MAPBOX/i.test(k));
    console.log(JSON.stringify({ event: "place_no_key", candidate_env_names: names }));
    return unavailable("no_key");
  }

  try {
    if (action === "retrieve") {
      if (!mapboxId) {
        clearTimeout(timer);
        return json(UNAVAILABLE, 400);
      }
      const r = await mapbox(retrieveUrl(token, session, mapboxId), controller.signal);
      if (!r.ok) return unavailable("status", r.status, r.retryAfter);
      const feature = (r.body as { features?: Feature[] } | null)?.features?.[0];
      const place = feature ? placeOf(feature) : null;
      done(place ? "one" : "none");
      return json(place ? { state: "one", place } : NONE);
    }

    // suggest: under three characters is `none` without a call; the member has not finished typing
    // and nothing has failed.
    if (q.length < MIN_CHARS) {
      done("none");
      return json(NONE);
    }
    // Case 3: no home and no resolvable country. Not called (see the header).
    if (anchor === "none") return unavailable("unanchored");
    const u = new URL(SEARCHBOX + "/suggest");
    u.searchParams.set("q", q);
    u.searchParams.set("access_token", token);
    u.searchParams.set("session_token", session);
    u.searchParams.set("language", LANGUAGE);
    u.searchParams.set("limit", String(LIMIT));
    u.searchParams.set("types", TYPES);
    // 633: a home narrows the lookup and never filters it, which is what proximity does. Without a
    // home the stated country filters, because the alternative is the Edge node's IP.
    if (proximity) u.searchParams.set("proximity", proximity.lng + "," + proximity.lat);
    else if (country) u.searchParams.set("country", country);
    const r = await mapbox(u, controller.signal);
    if (!r.ok) return unavailable("status", r.status, r.retryAfter);
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
    if (!rr.ok) return unavailable("status", rr.status, rr.retryAfter);
    const feature = (rr.body as { features?: Feature[] } | null)?.features?.[0];
    const place = feature ? placeOf(feature) : null;
    if (!place) {
      // Mapbox answered and the name is known but not the point: the words stand in place_text on
      // the client (SPEC 3).
      done("none");
      return json(NONE);
    }
    done("one");
    return json({ state: "one", place });
  } catch (e) {
    // The fetch threw (DNS, TLS, network) or the budget aborted it. Nothing was obtained.
    const aborted = e instanceof Error && e.name === "AbortError";
    return unavailable(aborted ? "budget" : "fetch");
  }
});
