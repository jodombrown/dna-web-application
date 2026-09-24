// Brief 9, Convene Pass 2 (the Discovery Dashboard), as handoff 32-B rebuilds it: the one module the
// dashboard reads and writes through (rulings 581, 631, 632, 650, 658, 660, 693, 1037 to 1045, 1092,
// 1093, 1095, 1105 to 1107, 1110).
//
// One read projection per surface (CLAUDE.md): `public.convene_discovery` answers which events sit in
// which lane and why, chosen under row policy as the viewer, so nothing here filters an event, a host
// or a going name on the client (680). The cards themselves come through the Feed's own hydration by
// post id (660), so a Discovery card and a Feed card have one read; beside it, the member's own save
// marks through the Feed's `loadMarks`, and whether the member is going to each shown event from their
// own `event_registrations` rows (the card's Add to calendar is offered only then, 1097). Place's
// options are `public.convene_places()` (1095). The writes are `set_subscription` (1039) and
// `dismiss_discovery_item` (1044, keyed on a lane since 1105).
//
// Two id sets, both structural and never labels (194, 1041, 1093, 1105): the five lens ids a member
// switches between, and the nine lane ids the projection returns sections under. A lens says who the
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
import { getSupabase } from "./supabase";

/** The five lenses (1093): All, then the four who-lenses, each the one lane of the same id. */
export type ConveneLensId = "all" | "follow" | "taste" | "curated" | "network";

/** The nine lanes (1092, 1105), in `convene_lanes` order. */
export type DiscoveryLaneId =
  "soon" | "weekend" | "online" | "fresh" | "curated" | "follow" | "taste" | "near" | "network";

export type DiscoveryFormat = "in_person" | "online" | "hybrid";
/** 1095: Donation is gone; the projection counts a donation event as paid. */
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

export type DiscoverySection = { section: DiscoveryLaneId; items: DiscoveryItem[] };

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
   * In lane order. Under All a lane below its internal floor is absent; under any other lens its one
   * lane is always present, empty or not, and its emptiness is 724's EmptyState.
   */
  sections: DiscoverySection[];
  /** The member's own save marks for the shown posts (the Feed's `loadMarks`). */
  saved: Set<string>;
  /** The shown events the member is going to, from their own registrations (1097). */
  going: Set<string>;
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
};

type RawSection = {
  section: DiscoveryLaneId;
  items: { event_id: string; post_id: string; reason: DiscoveryReason }[];
};
type RawDiscovery = Omit<Discovery, "sections" | "saved" | "going"> & { sections: RawSection[] };

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
  return args;
}

/**
 * The dashboard's one read. Calls the projection once, then hydrates every lane's posts through the
 * Feed's path in one call, with the member's save marks and going state for what it shows. An item
 * whose post did not hydrate is dropped from its lane. Null when there is no client.
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
  const [views, marks, registrations] = await Promise.all([
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
    })),
    saved: marks.saved,
    going: new Set((registrations.data ?? []).map((r) => r.event_id)),
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
