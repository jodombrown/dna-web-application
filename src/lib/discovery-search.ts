// Brief 9's route contract as handoff 32-B rebuilds it (items 1 and 2; rulings 586, 693, 1042, 1093,
// 1095, 1110): the lens is the path (`/convene` for All, `/convene/{lens}` for one of the four
// who-lenses) and the facets are the query. `format`, `price`, `family` and `place` are
// comma-separated lists; `when`, `home` and `rung` single values, and `rung` is only ever kept beside
// a `home`. An unknown value is dropped from the query and never sent to the projection, which refuses
// one with 22023.
//
// Three axes are the projection's own structural values (its `p_format`, `p_price` and `p_when`
// branches) and are checked here; Donation is gone (1095). The rung is structural too (1110). A family
// is a `convene_families` row (1037), a home one of the member's own `member_homes` (1042) and a place
// one of `convene_places()`'s ids (1095): those are only knowable at runtime, so this module keeps a
// well-formed token and the surface checks it against what the reads have answered before sending it.
//
// A place id is `city|<country>|<city>`, `region|<country>|<region>` or `country|<country>`,
// lower-cased and trimmed. A name may hold a comma, so inside the comma-separated `place` list a comma
// or a percent sign in an id is written as `%2C` or `%25`, and read back.
//
// The lens ids and the lane ids are structural (194, 1041, 1105): each is a branch in the projection,
// so both sets live in code as keys and never carry a word.
import type {
  ConveneLensId,
  DiscoveryFacets,
  DiscoveryFormat,
  DiscoveryHome,
  DiscoveryHomeRung,
  DiscoveryLaneId,
  DiscoveryPrice,
  DiscoveryWhen,
} from "./discovery";

/** The four lenses `/convene/{lens}` accepts. All is /convene itself, never /convene/all. */
const LENS_IDS: Record<Exclude<ConveneLensId, "all">, true> = {
  follow: true,
  taste: true,
  curated: true,
  network: true,
};

export function isLensId(v: unknown): v is Exclude<ConveneLensId, "all"> {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(LENS_IDS, v);
}

/** Every lane the projection returns a section under. A Record so the compiler proves the set whole. */
const LANE_IDS: Record<DiscoveryLaneId, true> = {
  soon: true,
  weekend: true,
  online: true,
  fresh: true,
  curated: true,
  follow: true,
  taste: true,
  near: true,
  network: true,
};

export function isLaneId(v: unknown): v is DiscoveryLaneId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(LANE_IDS, v);
}

const FORMATS: Record<DiscoveryFormat, true> = { in_person: true, online: true, hybrid: true };
const PRICES: Record<DiscoveryPrice, true> = { free: true, paid: true };
const WHENS: Record<DiscoveryWhen, true> = { two_weeks: true, this_month: true, later: true };
const RUNGS: Record<DiscoveryHomeRung, true> = {
  in: true,
  around: true,
  region: true,
  country: true,
};

const has = <K extends string>(set: Record<K, true>, v: string): v is K =>
  Object.prototype.hasOwnProperty.call(set, v);

/** As the URL carries it. Every key is optional; an empty value is no key. */
export type DiscoverySearch = {
  format?: string;
  price?: string;
  family?: string;
  when?: DiscoveryWhen;
  home?: string;
  rung?: DiscoveryHomeRung;
  place?: string;
};

const FAMILY_TOKEN = /^[a-z][a-z0-9_]{0,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A place id in the shape `convene_places()` writes and the projection accepts (1095). */
export function isPlaceId(v: string): boolean {
  if (v !== v.toLowerCase() || v.length > 300) return false;
  const parts = v.split("|");
  if (parts[0] === "city" || parts[0] === "region") return parts.length === 3 && parts[2] !== "";
  if (parts[0] === "country") return parts.length === 2 && parts[1] !== "";
  return false;
}

const escapeId = (id: string) => id.replace(/%/g, "%25").replace(/,/g, "%2C");
const unescapeId = (id: string) => id.replace(/%2C/gi, ",").replace(/%25/g, "%");

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(list);
  if (typeof v !== "string") return [];
  return [
    ...new Set(
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function placeList(v: unknown): string[] {
  return [...new Set(list(v).map(unescapeId))];
}

function joined(values: string[]): string | undefined {
  return values.length ? values.join(",") : undefined;
}

/** validateSearch for `/convene` and everything under it. Only well-formed values survive. */
export function validateDiscoverySearch(search: Record<string, unknown>): DiscoverySearch {
  const out: DiscoverySearch = {};
  const format = joined(list(search["format"]).filter((f) => has(FORMATS, f)));
  const price = joined(list(search["price"]).filter((p) => has(PRICES, p)));
  const family = joined(list(search["family"]).filter((f) => FAMILY_TOKEN.test(f)));
  const when = list(search["when"]).find((w) => has(WHENS, w));
  const home = list(search["home"]).find((h) => UUID.test(h));
  const rung = list(search["rung"]).find((r) => has(RUNGS, r));
  const place = joined(placeList(search["place"]).filter(isPlaceId).map(escapeId));
  if (format) out.format = format;
  if (price) out.price = price;
  if (family) out.family = family;
  if (when && has(WHENS, when)) out.when = when;
  if (home) {
    out.home = home.toLowerCase();
    if (rung && has(RUNGS, rung)) out.rung = rung;
  }
  if (place) out.place = place;
  return out;
}

/** The facets as the rail holds them: one list per axis, single-value axes as one-item lists. */
export type FacetLists = {
  format: DiscoveryFormat[];
  price: DiscoveryPrice[];
  when: DiscoveryWhen[];
  family: string[];
  home: string[];
  /** Only meaningful beside a home; `in` when a home is set and no rung is. */
  rung: DiscoveryHomeRung[];
  place: string[];
};

export function facetLists(search: DiscoverySearch): FacetLists {
  return {
    format: list(search.format).filter((f): f is DiscoveryFormat => has(FORMATS, f)),
    price: list(search.price).filter((p): p is DiscoveryPrice => has(PRICES, p)),
    when: search.when ? [search.when] : [],
    family: list(search.family),
    home: search.home ? [search.home] : [],
    rung: search.home && search.rung ? [search.rung] : [],
    place: placeList(search.place).filter(isPlaceId),
  };
}

/** The search a set of lists writes: an empty axis is no key, so the URL stays clean. */
export function searchOf(f: FacetLists): DiscoverySearch {
  const out: DiscoverySearch = {};
  const format = joined(f.format);
  const price = joined(f.price);
  const family = joined(f.family);
  const place = joined(f.place.map(escapeId));
  if (format) out.format = format;
  if (price) out.price = price;
  if (family) out.family = family;
  if (f.when[0]) out.when = f.when[0];
  if (f.home[0]) {
    out.home = f.home[0];
    if (f.rung[0] && f.rung[0] !== "in") out.rung = f.rung[0];
  }
  if (place) out.place = place;
  return out;
}

export const NO_FACETS: FacetLists = {
  format: [],
  price: [],
  when: [],
  family: [],
  home: [],
  rung: [],
  place: [],
};

/** What the reads have answered so far; null for a read that has not answered. */
export type Known = {
  families: string[] | null;
  homes: DiscoveryHome[] | null;
  places: string[] | null;
};

/**
 * What may be sent. A family is sent only once the vocabulary names it, a home only once a projection
 * answer has named it as the member's own, and a place only once `convene_places()` has offered it;
 * until then the value is held back rather than guessed. A rung goes with its home and never alone.
 */
export function discoveryFacets(f: FacetLists, known: Known): Omit<DiscoveryFacets, "lens"> {
  const { families, homes, places } = known;
  const out: Omit<DiscoveryFacets, "lens"> = {};
  if (f.format.length) out.format = f.format;
  if (f.price.length) out.price = f.price;
  if (f.when[0]) out.when = f.when[0];
  const fam = families ? f.family.filter((x) => families.includes(x)) : [];
  if (fam.length) out.families = fam;
  const home = homes && f.home[0] && homes.some((h) => h.id === f.home[0]) ? f.home[0] : undefined;
  if (home) {
    out.home = home;
    const rung = f.rung[0];
    const h = homes?.find((x) => x.id === home);
    // A region rung for a home with no stored region matches nothing (1110), and the ladder draws
    // none, so a URL that carries one falls back to the home's city.
    if (rung && rung !== "in" && (rung !== "region" || !!h?.region)) out.homeRung = rung;
  }
  const pl = places ? f.place.filter((x) => places.includes(x)) : [];
  if (pl.length) out.places = pl;
  return out;
}

/**
 * The lists with every value the reads have shown to be unknown taken out, or null when nothing in the
 * URL is known to be unknown yet. A value is only dropped once the read that could name it has
 * answered: a vocabulary that failed to load proves nothing about a family (194).
 */
export function droppedUnknown(f: FacetLists, known: Known): FacetLists | null {
  const { families, homes, places } = known;
  const family = families ? f.family.filter((x) => families.includes(x)) : f.family;
  const home = homes ? f.home.filter((h) => homes.some((x) => x.id === h)) : f.home;
  const h = homes?.find((x) => x.id === home[0]);
  const rung = home.length ? f.rung.filter((r) => r !== "region" || !homes || !!h?.region) : [];
  const place = places ? f.place.filter((x) => places.includes(x)) : f.place;
  if (
    family.length === f.family.length &&
    home.length === f.home.length &&
    rung.length === f.rung.length &&
    place.length === f.place.length
  )
    return null;
  return { ...f, family, home, rung, place };
}
