// place-resolve: a venue name to one place, through Mapbox Search Box, for the Convene form
// (Convene Pass 1, SPEC section 3 "Place, resolved never typed"; rulings 633, 581; handoff PR 2;
// Session 23 corrections "the unavailable state" and "place anchoring").
//
// Input  { action: 'suggest' | 'retrieve' | 'anchor', q: string, session_token: string,
//          proximity?: { lng: number, lat: number } | null, country_name?: string | null,
//          mapbox_id?: string }
//        'anchor' (Session 24) is the dry run behind the live arm that walks every
//        public.world_countries name: it resolves country_name the way suggest does and answers
//        { state: 'anchored', country: alpha-2, zones: string[] | null, zones_via } or
//        { state: 'unavailable' }, and calls Mapbox never. `zones` are that country's IANA zones
//        from the runtime's own ICU (rulings 813, 817): the form gives a words-only event the zone
//        of the country the host chose, silently where there is one and by asking where there are
//        several (821), and null is "this runtime cannot say", never a guess.
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
// Place    = { place_id, place_name, area, city, region, country, lng, lat, timezone, label, kind }
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
// Anchoring (Session 24, the host-set country; rulings 783, 796, 797, which supersede Session 23's
// order of home then country):
//   1. country_name is the anchor, always. It is the country the host set for the event on the
//      form (a public.world_countries name, chosen by the member, a home chip or nothing else;
//      never the member's residence). Search Box `country=` carries its ISO 3166-1 alpha-2 code,
//      resolved through ICU's English region names (Intl.DisplayNames, long and short styles) under
//      a fixed fold, plus the three stored spellings ICU renders otherwise (below). `country` is a
//      filter: nothing outside it comes back.
//   2. proximity, when given (a chosen home, 633), narrows inside that country: Search Box
//      `proximity={lng},{lat}` beside `country=`. Both travel on the one request; proximity biases
//      the ordering and the country still filters, so a home in Nairobi with Ghana chosen orders
//      Ghana's answers and never adds Kenya's. Proximity alone anchors nothing.
//   3. no resolvable country: the call is not made and the state is `unavailable`, logged
//      `reason: unanchored`, with or without a proximity. Search Box applies the caller's IP as the
//      proximity when none is sent (the reference: "if not provided, the default is IP proximity"),
//      and the caller is an Edge node, not the member; there is no parameter that switches that
//      default off. So an unanchored call cannot be made without IP bias, and under "never bias by
//      IP" (783) it is not made.
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
  /**
   * Mapbox's context region for the place: the admin-1 name, "Ashanti" for a venue in Kumasi
   * (ruling 927). It was already in every response and was dropped, so a surface that wanted to
   * name a region had to issue a second lookup for a value the first one carried. Null where the
   * response has no region, never guessed from the city or the country.
   */
  region: string | null;
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

type Anchor = "country" | "country_home" | "none";
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
// leading "the" or a parenthesised qualifier. On Node 22 (ICU 78) 192 of the 195 stored names
// resolve through ICU alone; the three it renders otherwise are "Cabo Verde" (ICU: Cape Verde),
// "Congo" (ICU: Congo - Brazzaville) and "Democratic Republic of the Congo" (ICU: Congo - Kinshasa),
// and Session 24 registers those three stored spellings against their codes (SPELLINGS), because a
// country the host can choose on the form must anchor the lookup or the control is a trap. This is
// the vocabulary's own spelling mapped to ISO, not a country list: the list is public.world_countries,
// read by the form at runtime. Anything else ICU names otherwise stays unresolved and is
// `unavailable`, never a guess; the live arm that walks every stored name is what shows it.
const SPELLINGS: Record<string, string> = {
  CV: "Cabo Verde",
  CG: "Congo",
  CD: "Democratic Republic of the Congo",
};
// ICU also names the codes ISO 3166-3 retired (BU for Burma, DD for East Germany, CS for Serbia and
// Montenegro, and so on) with the same English name as the current code, and the index keeps the
// first code it meets for a name, so under an A to Z walk Germany resolved to DD, Serbia to CS,
// Vanuatu to NH, Zimbabwe to RH, Vietnam to VD, Yemen to YD and Myanmar to BU, none of which Search
// Box accepts as a country. Found by Session 24's arm that walks every stored name; the retired and
// the exceptionally reserved codes (UK for GB) are skipped, so only a current code can be indexed.
const RETIRED = new Set([
  "AN",
  "BU",
  "CS",
  "DD",
  "DY",
  "FX",
  "HV",
  "NH",
  "RH",
  "SU",
  "TP",
  "UK",
  "VD",
  "YD",
  "YU",
  "ZR",
]);
const CODES: string[] = [];
for (let a = 65; a <= 90; a++)
  for (let b = 65; b <= 90; b++) {
    const c = String.fromCharCode(a, b);
    if (!RETIRED.has(c)) CODES.push(c);
  }

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
      // No Intl.DisplayNames on this runtime: only SPELLINGS resolve, and every other country
      // falls to case 3. The arm that walks every stored name in tests/live-checks.cjs shows it.
    }
    for (const [code, spelling] of Object.entries(SPELLINGS)) {
      const key = fold(spelling);
      if (key && !index.has(key)) index.set(key, code);
    }
    regionIndex = index;
  }
  const key = fold(name);
  return key ? (regionIndex.get(key) ?? null) : null;
}

// ---- a country's IANA zones, from the same runtime ICU (rulings 813, 817, 822) -----------------
// The Intl Locale Info API has shipped in two shapes: the getter `locale.timeZones` on the V8 the
// probe ran on (12.4, ICU 78.2), and the function `locale.getTimeZones()` on newer ones. Read
// whichever exists and answer null where neither does, the way countryCode handles a missing
// Intl.DisplayNames: a runtime that cannot say is never guessed at, and the form keeps its existing
// behaviour on null (case 4). `zonesVia` records which shape answered, because the Node probe could
// not tell us what Deno carries and the live arm reports it.
type ZonesVia = "getTimeZones" | "timeZones" | "none";
let zonesVia: ZonesVia = "none";
function zonesFor(code: string): string[] | null {
  try {
    const locale = new Intl.Locale("und-" + code) as Intl.Locale & {
      getTimeZones?: () => string[] | undefined;
      timeZones?: string[] | undefined;
    };
    let zones: string[] | undefined;
    if (typeof locale.getTimeZones === "function") {
      zones = locale.getTimeZones();
      zonesVia = "getTimeZones";
    } else if (Array.isArray(locale.timeZones)) {
      zones = locale.timeZones;
      zonesVia = "timeZones";
    } else {
      zonesVia = "none";
      return null;
    }
    const list = (zones ?? []).filter((z) => typeof z === "string" && z.length > 0);
    return list.length ? list : null;
  } catch {
    return null;
  }
}

function named(s: Suggestion): Suggested | null {
  const id = typeof s.mapbox_id === "string" ? s.mapbox_id : "";
  const name = typeof s.name === "string" ? s.name.trim() : "";
  if (!id || !name) return null;
  const ctx = s.context ?? {};
  const area = ctx.neighborhood?.name ?? ctx.locality?.name ?? ctx.district?.name ?? null;
  const city = ctx.place?.name ?? ctx.locality?.name ?? ctx.region?.name ?? null;
  // Ruling 927. `city` above may already have fallen back to the region where Mapbox gave no
  // place or locality; that fallback is unchanged and this is not derived from it. This is the
  // region in its own right, and where the two hold the same string that is the response saying
  // so rather than this function copying one into the other.
  const region = ctx.region?.name ?? null;
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
  return { place_id: id, place_name: name, area, city, region, country, label, kind };
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

  let action: "suggest" | "retrieve" | "anchor" = "suggest";
  let q = "";
  let session = "";
  let proximity: { lng: number; lat: number } | null = null;
  let countryName = "";
  let mapboxId = "";
  try {
    const body = await req.json();
    action =
      body?.action === "retrieve" ? "retrieve" : body?.action === "anchor" ? "anchor" : "suggest";
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

  // Session 24: the country is the anchor; a home narrows inside it and anchors nothing alone.
  const country = countryName ? countryCode(countryName) : null;
  const anchor: Anchor = country ? (proximity ? "country_home" : "country") : "none";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUDGET_MS);
  const done = (
    state: Resolved["state"] | "anchored",
    detail?: { reason: Reason; status?: number },
  ) => {
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

  // The dry run (Session 24): does this name anchor? No Mapbox call, no token needed. The live arm
  // walks every public.world_countries name through it, so a stored spelling that resolves to
  // nothing is found there and not by a host.
  //
  // Rulings 813 and 817: it also answers the country's IANA zones, which is what lets the form give
  // a words-only event the zone of the country the host chose rather than the host's own. The form
  // takes the zone silently where there is one, asks where there are several (821), and keeps its
  // existing behaviour where `zones` is null. `zones_via` says which shape of the Intl Locale Info
  // API answered, so the live arm can report what the deployed runtime carries (822).
  if (action === "anchor") {
    if (!country) return unavailable("unanchored");
    const zones = zonesFor(country);
    done("anchored");
    return json({ state: "anchored", country, zones, zones_via: zonesVia });
  }

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
    // Case 3: no resolvable country, with or without a home. Not called (see the header).
    if (anchor === "none") return unavailable("unanchored");
    const u = new URL(SEARCHBOX + "/suggest");
    u.searchParams.set("q", q);
    u.searchParams.set("access_token", token);
    u.searchParams.set("session_token", session);
    u.searchParams.set("language", LANGUAGE);
    u.searchParams.set("limit", String(LIMIT));
    u.searchParams.set("types", TYPES);
    // The host's country filters (783); a chosen home narrows inside it (633). Both on one request.
    u.searchParams.set("country", country as string);
    if (proximity) u.searchParams.set("proximity", proximity.lng + "," + proximity.lat);
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
