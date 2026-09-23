// Brief 9, Convene Pass 2 (the Discovery Dashboard): the one module the dashboard reads and writes
// through (rulings 581, 631, 632, 650, 658, 660, 693, 1037 to 1045).
//
// One read projection per surface (CLAUDE.md): `public.convene_discovery` answers which events sit
// in which section and why, chosen under row policy as the viewer, so nothing here filters an event,
// a host or a going name on the client (680). The cards themselves come through the Feed's own
// hydration by post id (660), so a Discovery card and a Feed card have one read. The writes are the
// projection's two member paths, `set_subscription` (1039) and `dismiss_discovery_item` (1044).
//
// The eight lens ids are structural (194, 1041): each is a branch in the projection, so the union
// lives in code and never carries a label. Every name, short word, icon and scope line is read from
// `vocabularies().convene_lenses` at runtime.
//
// No number is computed for display anywhere in this module (guardrail: no number renders). The
// projection never returns a count, a section's density floor stays in the database (632, 1045), and
// nothing here measures a section.
import type { Member } from "./auth";
import type { Database } from "./database.types";
import { loadPostsByIds } from "./feed";
import type { PostView } from "./post-view";
import { getSupabase } from "./supabase";

export type ConveneLensId =
  "all" | "follow" | "taste" | "soon" | "online" | "curated" | "near" | "network";

/** A section is every lens but All (631). */
export type DiscoverySectionId = Exclude<ConveneLensId, "all">;

export type DiscoveryFormat = "in_person" | "online" | "hybrid";
export type DiscoveryPrice = "free" | "paid" | "donation";
export type DiscoveryWhen = "two_weeks" | "this_month" | "later";

type EventMode = Database["public"]["Enums"]["event_mode"];

/** A person as `private.member_display` names them. */
export type DiscoveryPerson = { id: string; name: string | null };

/** The words DIA's line is built from, one shape per section, exactly as the projection builds them. */
export type DiscoveryReason =
  | { kind: "follow"; host: DiscoveryPerson }
  | { kind: "taste"; family: string; label: string }
  | { kind: "soon"; starts_at: string; mode: EventMode }
  | { kind: "online"; starts_at: string | null; mode: EventMode }
  | { kind: "curated"; editor: DiscoveryPerson; line: string }
  | { kind: "near"; home: { id: string; city: string } }
  | { kind: "network"; host: DiscoveryPerson }
  | { kind: "network"; going: DiscoveryPerson[] };

export type DiscoveryItem = {
  event_id: string;
  post_id: string;
  reason: DiscoveryReason;
  /** The Feed's card for this item's post (660). */
  post: PostView;
};

export type DiscoverySection = { section: DiscoverySectionId; items: DiscoveryItem[] };

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
  /** The member's homes in order (1042): the homes line and the Home facet's options. */
  homes: DiscoveryHome[];
  follows: DiscoveryFollow[];
  subscriptions: { family: string; label: string }[];
  suggest: DiscoverySuggest | null;
  /**
   * In lens order. Under All a section below its internal floor is absent; under any other lens the
   * one section is always present, empty or not, and its emptiness is 724's EmptyState.
   */
  sections: DiscoverySection[];
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
};

type RawSection = {
  section: DiscoverySectionId;
  items: { event_id: string; post_id: string; reason: DiscoveryReason }[];
};
type RawDiscovery = Omit<Discovery, "sections"> & { sections: RawSection[] };

type DiscoveryArgs = Database["public"]["Functions"]["convene_discovery"]["Args"];

/**
 * The projection's arguments. An unset facet is omitted so the function's own default applies, and an
 * empty list is no facet: it narrows nothing, so it is not sent.
 */
function discoveryArgs(f: DiscoveryFacets): DiscoveryArgs {
  const args: DiscoveryArgs = { p_lens: f.lens ?? "all" };
  if (f.format?.some(() => true)) args.p_format = f.format;
  if (f.price?.some(() => true)) args.p_price = f.price;
  if (f.when) args.p_when = f.when;
  if (f.families?.some(() => true)) args.p_families = f.families;
  if (f.home) args.p_home = f.home;
  return args;
}

/**
 * The dashboard's one read. Calls the projection once, then hydrates every section's posts through
 * the Feed's path in one call. An item whose post did not hydrate is dropped from its section.
 * Null when there is no client.
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

  const postIds = raw.sections.flatMap((s) => s.items.map((i) => i.post_id));
  const views = await loadPostsByIds(member, postIds);
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
  };
}

/** 1039: subscribe to or leave one category family. The one write path for a subscription. */
export async function setSubscription(family: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("set_subscription", { p_family: family, p_on: on });
  if (error) throw error;
}

/** 1044: DIA's "Not this?": take one event out of one section, for this member only. */
export async function dismissDiscoveryItem(
  eventId: string,
  section: DiscoverySectionId,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("dismiss_discovery_item", {
    p_event: eventId,
    p_section: section,
  });
  if (error) throw error;
}
