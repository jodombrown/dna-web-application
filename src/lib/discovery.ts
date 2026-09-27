// Brief 9, Convene Pass 2 (the Discovery Dashboard), as handoff 32-B rebuilds it and the first Discovery
// handoff (34-A) restores its search, Browse, Filling up, learned order and going row: the one module
// the dashboard reads and writes through (rulings 581, 631, 632, 650, 658, 660, 693, 1037 to 1045, 1092,
// 1093, 1095, 1105 to 1107, 1110, 1124, 1128, 1138, 1157 to 1160).
//
// One read projection per surface (CLAUDE.md): `public.convene_discovery` answers which events sit in
// which lane and why, chosen under row policy as the viewer, so nothing here filters an event, a host
// or a going name on the client (680). It takes the search (`p_q`, 1159) and narrows the corpus before
// the lanes form, answers Browse as tiles rather than items, and returns the sections already in the
// member's learned order with `lane_order` naming every lane in it (1160). The cards themselves come
// through the Feed's own hydration by post id (660), so a Discovery card and a Feed card have one
// read; beside it, the member's own save marks through the Feed's `loadMarks`, whether the member is
// going to each shown event from their own `event_registrations` rows (the card's Add to calendar is
// offered only then, 1097), and the going row's first names from `public.event_going_names` (1128,
// 1158), which resolves them as the event page does, beside `event_presenters`: no name is looked up
// here. Place's options are `public.convene_places()` (1095). The writes are `set_subscription`
// (1039), `dismiss_discovery_item` (1044, keyed on a lane since 1105) and `note_lane_act` (1160), the
// one writer of the member's lane activity.
//
// Two id sets, both structural and never labels (194, 1041, 1093, 1105): the five lens ids a member
// switches between, and the eleven lane ids the projection returns sections under. A lens says who the
// events come from and each lens but All shows its one lane. Every name, short word, icon and scope
// line is read from `vocabularies().convene_lenses`, and every lane's name from `convene_lanes`.
//
// No number is computed for display anywhere in this module (guardrail: no number renders). The
// projection never returns a count, a lane's floor stays in the database (632), and nothing here
// measures a lane.
import type { Member } from "./auth";
import type { Database } from "./database.types";
import { loadMarks, loadPostsByIds } from "./feed";
import type { PostView } from "./post-view";
import { getSupabase, type Supabase } from "./supabase";

/** The five lenses (1093): All, then the four who-lenses, each the one lane of the same id. */
export type ConveneLensId = "all" | "follow" | "taste" | "curated" | "network";

/** The eleven lanes (1092, 1105, 1124), in `convene_lanes`' base order. */
export type DiscoveryLaneId =
  | "soon"
  | "weekend"
  | "online"
  | "browse"
  | "filling"
  | "fresh"
  | "curated"
  | "follow"
  | "taste"
  | "near"
  | "network";

export type DiscoveryFormat = "in_person" | "online" | "hybrid";
/** 1095: Free and Paid alone; the projection counts every priced event as paid. */
export type DiscoveryPrice = "free" | "paid";
export type DiscoveryWhen = "two_weeks" | "this_month" | "later";
/** 1110: how far from the chosen home. Absent with a home is `in`; Anywhere is no home at all. */
export type DiscoveryHomeRung = "in" | "around" | "region" | "country";

type EventMode = Database["public"]["Enums"]["event_mode"];

/** A person as `private.member_display` names them. */
export type DiscoveryPerson = { id: string; name: string | null };

/** Why an item sits in its lane, exactly as the projection builds it: one shape per lane. */
export type DiscoveryReason =
  | { kind: "soon"; starts_at: string; mode: EventMode }
  | { kind: "weekend"; starts_at: string; mode: EventMode }
  | { kind: "online"; starts_at: string | null; mode: EventMode }
  | { kind: "filling"; starts_at: string | null; mode: EventMode }
  | { kind: "fresh"; published_at: string }
  | { kind: "curated"; editor: DiscoveryPerson; line: string }
  | { kind: "follow"; host: DiscoveryPerson }
  | { kind: "taste"; family: string; label: string }
  | { kind: "near"; home: { id: string; city: string } }
  | { kind: "near"; place: { city: string } }
  | { kind: "network"; host: DiscoveryPerson }
  | { kind: "network"; going: DiscoveryPerson[] };

export type DiscoveryItem = {
  event_id: string;
  post_id: string;
  reason: DiscoveryReason;
  /** The Feed's card for this item's post (660). */
  post: PostView;
};

/**
 * Browse's tiles (1124, 1133), as 20260926170300 builds them from the narrowed corpus: each topic with
 * the next start in it where one is known, then each place with an event, a city tile carrying its
 * country and a country tile only where the country has no city tile. A place's id is
 * `convene_places()`'s, so a tile applies the Place facet as built (1095). No count on either.
 */
export type BrowseTiles = {
  topics: { family: string; label: string; next_at: string | null }[];
  places: { id: string; kind: "city" | "country"; name: string; country: string | null }[];
};

/** A lane as the projection answers it. Browse carries its tiles and no items. */
export type DiscoverySection = {
  section: DiscoveryLaneId;
  items: DiscoveryItem[];
  tiles?: BrowseTiles | undefined;
};

export type DiscoveryHome = {
  id: string;
  city: string | null;
  place_name: string | null;
  region: string | null;
  country: string | null;
};

export type DiscoveryFollow = {
  id: string;
  name: string | null;
  handle: string | null;
  avatar_path: string | null;
};

/** 650: one host of an upcoming event for DIA's one sentence when the member follows no one. */
export type DiscoverySuggest = {
  host: { id: string; name: string | null; handle: string | null };
  event_id: string;
  title: string;
  city: string | null;
};

export type Discovery = {
  lens: ConveneLensId;
  /** The member's homes in order (1042): the Home facet's ladders (1110). */
  homes: DiscoveryHome[];
  follows: DiscoveryFollow[];
  subscriptions: { family: string; label: string }[];
  suggest: DiscoverySuggest | null;
  /**
   * In the member's learned order, as the projection returns them (1160): the surface never re-sorts.
   * Under All a lane below its internal floor is absent; under any other lens its one lane is always
   * present, empty or not, and its emptiness is 724's EmptyState.
   */
  sections: DiscoverySection[];
  /** Every lane in that learned order, returned or not: where an absent lane would sit (1160). */
  laneOrder: DiscoveryLaneId[];
  /** The member's own save marks for the shown posts (the Feed's `loadMarks`). */
  saved: Set<string>;
  /** The shown events the member is going to, from their own registrations (1097). */
  going: Set<string>;
  /**
   * The going row's first names (1128, 1138, 1158), keyed by event id, for the events in the lanes
   * that carry the row: three names where `event_going_names` answers, and no entry where it omits
   * the event. Empty when that read fails, which leaves every row empty and the surface standing.
   */
  goingNames: Map<string, string[]>;
};

export type DiscoveryFacets = {
  lens?: ConveneLensId;
  format?: DiscoveryFormat[];
  price?: DiscoveryPrice[];
  when?: DiscoveryWhen;
  /** `convene_families` values. */
  families?: string[];
  /** A `member_homes` id of the member's own. */
  home?: string;
  /** Only with `home`. */
  homeRung?: DiscoveryHomeRung;
  /** Ids from `convene_places()` (1095). */
  places?: string[];
  /** The search (1124, 1159): sent only when its trimmed text is non-empty. */
  q?: string;
};

type RawSection = {
  section: DiscoveryLaneId;
  items: { event_id: string; post_id: string; reason: DiscoveryReason }[];
  tiles?: BrowseTiles;
};
type RawDiscovery = Omit<Discovery, "sections" | "laneOrder" | "saved" | "going" | "goingNames"> & {
  sections: RawSection[];
  lane_order?: DiscoveryLaneId[] | null;
};

/** The lanes whose cards carry the going row (1128): every lane but Browse and the four whose row
 *  is the relationship's reason (1096). */
export const GOING_LANES: ReadonlySet<DiscoveryLaneId> = new Set([
  "soon",
  "weekend",
  "online",
  "filling",
  "fresh",
  "near",
]);

type DiscoveryArgs = Database["public"]["Functions"]["convene_discovery"]["Args"];

/**
 * The projection's arguments. An unset facet is omitted so the function's own default applies, and an
 * empty list is no facet: it narrows nothing, so it is not sent. A rung is sent only with its home.
 */
function discoveryArgs(f: DiscoveryFacets): DiscoveryArgs {
  const args: DiscoveryArgs = { p_lens: f.lens ?? "all" };
  if (f.format?.some(() => true)) args.p_format = f.format;
  if (f.price?.some(() => true)) args.p_price = f.price;
  if (f.when) args.p_when = f.when;
  if (f.families?.some(() => true)) args.p_families = f.families;
  if (f.home) {
    args.p_home = f.home;
    if (f.homeRung) args.p_home_rung = f.homeRung;
  }
  if (f.places?.some(() => true)) args.p_places = f.places;
  const q = f.q?.trim();
  if (q) args.p_q = q;
  return args;
}

/** `event_going_names` takes at most 200 ids a call, so the lanes name their events in slices of 200,
 *  as the Feed names its events to `event_presenters`. */
const GOING_PER_CALL = 200;

/**
 * The going row's names for the given events (1128, 1138, 1158): one database read beside
 * `event_presenters`, which counts and orders each event's going rows as the event page does under the
 * viewer's own row policy and answers three first names only at five or more, the viewer never among
 * them. A failed slice answers nothing for its events, and a failed read leaves the map empty: the
 * rows stay empty and the surface stands.
 */
async function eventGoingNames(sb: Supabase, ids: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const slices: string[][] = [];
  for (let i = 0; i < ids.length; i += GOING_PER_CALL)
    slices.push(ids.slice(i, i + GOING_PER_CALL));
  const answers = await Promise.all(
    slices.map((p_events) =>
      sb.rpc("event_going_names", { p_events }).then(
        (r) => r,
        () => ({ data: null }),
      ),
    ),
  );
  for (const { data } of answers) {
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    for (const [id, names] of Object.entries(data as Record<string, unknown>))
      if (Array.isArray(names) && names.length && names.every((n) => typeof n === "string"))
        out.set(id, names as string[]);
  }
  return out;
}

/**
 * The dashboard's one read. Calls the projection once, then hydrates every lane's posts through the
 * Feed's path in one call, with the member's save marks, going state and, for the lanes that carry the
 * going row, its names, all in parallel. An item whose post did not hydrate is dropped from its lane.
 * The sections keep the projection's order. Null when there is no client.
 */
export async function loadDiscovery(
  member: Member,
  facets: DiscoveryFacets = {},
): Promise<Discovery | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("convene_discovery", discoveryArgs(facets));
  if (error) throw error;
  const raw = data as unknown as RawDiscovery | null;
  if (!raw) return null;

  const postIds = [...new Set(raw.sections.flatMap((s) => s.items.map((i) => i.post_id)))];
  const eventIds = [...new Set(raw.sections.flatMap((s) => s.items.map((i) => i.event_id)))];
  const goingIds = [
    ...new Set(
      raw.sections
        .filter((s) => GOING_LANES.has(s.section))
        .flatMap((s) => s.items.map((i) => i.event_id)),
    ),
  ];
  const [views, marks, registrations, goingNames] = await Promise.all([
    loadPostsByIds(member, postIds),
    loadMarks(member.id, postIds),
    eventIds.length
      ? sb
          .from("event_registrations")
          .select("event_id")
          .eq("member_id", member.id)
          .eq("status", "going")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] as { event_id: string }[] }),
    eventGoingNames(sb, goingIds).catch(() => new Map<string, string[]>()),
  ]);
  const byId = new Map(views.map((v) => [v.id, v]));

  return {
    lens: raw.lens,
    homes: raw.homes ?? [],
    follows: raw.follows ?? [],
    subscriptions: raw.subscriptions ?? [],
    suggest: raw.suggest ?? null,
    sections: raw.sections.map((s) => ({
      section: s.section,
      items: s.items.flatMap((i) => {
        const post = byId.get(i.post_id);
        return post ? [{ ...i, post }] : [];
      }),
      ...(s.tiles ? { tiles: s.tiles } : null),
    })),
    laneOrder: Array.isArray(raw.lane_order) ? raw.lane_order : [],
    saved: marks.saved,
    going: new Set((registrations.data ?? []).map((r) => r.event_id)),
    goingNames,
  };
}

/** One of Place's options (1095): a city, a region or a country that has an event the member sees. */
export type ConvenePlace = {
  /** `city|<country>|<city>`, `region|<country>|<region>` or `country|<country>`, lower-cased. */
  id: string;
  kind: "city" | "region" | "country";
  name: string;
  country: string | null;
};

/**
 * Place's typeahead (1095): every city, region and country with an event in the discovery corpus as
 * this member sees it, grounded by construction and never counted. Empty when there is no client.
 */
export async function loadConvenePlaces(): Promise<ConvenePlace[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("convene_places");
  if (error) throw error;
  return Array.isArray(data) ? (data as unknown as ConvenePlace[]) : [];
}

/** 1039: subscribe to or leave one category family. The one write path for a subscription. */
export async function setSubscription(family: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("set_subscription", { p_family: family, p_on: on });
  if (error) throw error;
}

/** A member's act from a lane that orders their lanes (1124, 1160). */
export type LaneAct = "open" | "save" | "follow";

/**
 * 1160: the member opened a card from a lane, or chose Save or Follow in a card's menu there. The one
 * write path to `member_lane_activity`, called from those three acts and never on load, from the pane
 * or from Browse. A failure is logged and never shown: the act itself has already happened.
 */
export async function noteLaneAct(lane: DiscoveryLaneId, act: LaneAct): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.rpc("note_lane_act", { p_lane: lane, p_act: act });
    if (error) console.warn("note_lane_act", lane, act, error.message);
  } catch (e) {
    console.warn("note_lane_act", lane, act, e);
  }
}

/** 1044, 1105: the menu's Not this: take one event out of one lane, for this member only. */
export async function dismissDiscoveryItem(eventId: string, lane: DiscoveryLaneId): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("dismiss_discovery_item", {
    p_event: eventId,
    p_section: lane,
  });
  if (error) throw error;
}
