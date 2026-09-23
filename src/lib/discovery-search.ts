// Brief 9's route contract (handoff 31-B item 2): the lens is the path (`/convene` for All,
// `/convene/{section}` for one section, 693) and the facets are the query, `format`, `price` and
// `family` as comma-separated lists, `when` and `home` single values (586, 1042). An unknown value is
// dropped from the query and never sent to the projection, which refuses one with 22023.
//
// Three axes are the projection's own structural values (its `p_format`, `p_price` and `p_when`
// branches) and are checked here. The other two are only knowable at runtime: a family is a
// `convene_families` row (1037) and a home is one of the member's own `member_homes` (1042), so this
// module keeps a well-formed token and the surface checks it against the vocabulary and the homes
// before it is sent (see `discoveryFacets`).
//
// The section ids are structural too (194, 1041): each is a branch in the projection, so the set lives
// in code as keys and never carries a word. Every name, short word, icon and scope line is read from
// `vocabularies().convene_lenses`.
import type {
  DiscoveryFacets,
  DiscoveryFormat,
  DiscoveryHome,
  DiscoveryPrice,
  DiscoverySectionId,
  DiscoveryWhen,
} from "./discovery";

/** Every section the projection branches on. A Record so the compiler proves the set is whole. */
const SECTION_IDS: Record<DiscoverySectionId, true> = {
  follow: true,
  taste: true,
  soon: true,
  online: true,
  curated: true,
  near: true,
  network: true,
};

export function isSectionId(v: unknown): v is DiscoverySectionId {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(SECTION_IDS, v);
}

const FORMATS: Record<DiscoveryFormat, true> = { in_person: true, online: true, hybrid: true };
const PRICES: Record<DiscoveryPrice, true> = { free: true, paid: true, donation: true };
const WHENS: Record<DiscoveryWhen, true> = { two_weeks: true, this_month: true, later: true };

const has = <K extends string>(set: Record<K, true>, v: string): v is K =>
  Object.prototype.hasOwnProperty.call(set, v);

/** As the URL carries it. Every key is optional; an empty value is no key. */
export type DiscoverySearch = {
  format?: string;
  price?: string;
  family?: string;
  when?: DiscoveryWhen;
  home?: string;
};

const FAMILY_TOKEN = /^[a-z][a-z0-9_]{0,63}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (format) out.format = format;
  if (price) out.price = price;
  if (family) out.family = family;
  if (when && has(WHENS, when)) out.when = when;
  if (home) out.home = home.toLowerCase();
  return out;
}

/** The facets as the rail holds them: one list per axis, single-value axes as one-item lists. */
export type FacetLists = {
  format: DiscoveryFormat[];
  price: DiscoveryPrice[];
  when: DiscoveryWhen[];
  family: string[];
  home: string[];
};

export function facetLists(search: DiscoverySearch): FacetLists {
  return {
    format: list(search.format).filter((f): f is DiscoveryFormat => has(FORMATS, f)),
    price: list(search.price).filter((p): p is DiscoveryPrice => has(PRICES, p)),
    when: search.when ? [search.when] : [],
    family: list(search.family),
    home: search.home ? [search.home] : [],
  };
}

/** The search a set of lists writes: an empty axis is no key, so the URL stays clean. */
export function searchOf(f: FacetLists): DiscoverySearch {
  const out: DiscoverySearch = {};
  const format = joined(f.format);
  const price = joined(f.price);
  const family = joined(f.family);
  if (format) out.format = format;
  if (price) out.price = price;
  if (family) out.family = family;
  if (f.when[0]) out.when = f.when[0];
  if (f.home[0]) out.home = f.home[0];
  return out;
}

/**
 * What may be sent. A family is sent only once the vocabulary has answered and names it, and a home
 * only once a projection answer has named it as the member's own; until then the value is held back
 * rather than guessed. `known` is what the surface has read so far, null for a read not yet answered.
 */
export function discoveryFacets(
  f: FacetLists,
  known: { families: string[] | null; homes: DiscoveryHome[] | null },
): Omit<DiscoveryFacets, "lens"> {
  const families = known.families;
  const homes = known.homes;
  const out: Omit<DiscoveryFacets, "lens"> = {};
  if (f.format.length) out.format = f.format;
  if (f.price.length) out.price = f.price;
  if (f.when[0]) out.when = f.when[0];
  const fam = families ? f.family.filter((x) => families.includes(x)) : [];
  if (fam.length) out.families = fam;
  const home = homes && f.home[0] && homes.some((h) => h.id === f.home[0]) ? f.home[0] : undefined;
  if (home) out.home = home;
  return out;
}

/**
 * The lists with every value the reads have shown to be unknown taken out, or null when nothing in
 * the URL is known to be unknown yet. A value is only dropped once the read that could name it has
 * answered: a vocabulary that failed to load proves nothing about a family (194).
 */
export function droppedUnknown(
  f: FacetLists,
  known: { families: string[] | null; homes: DiscoveryHome[] | null },
): FacetLists | null {
  const families = known.families;
  const homes = known.homes;
  const family = families ? f.family.filter((x) => families.includes(x)) : f.family;
  const home = homes ? f.home.filter((h) => homes.some((x) => x.id === h)) : f.home;
  if (family.length === f.family.length && home.length === f.home.length) return null;
  return { ...f, family, home };
}
