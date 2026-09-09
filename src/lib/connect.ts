// Connect's one read projection and its write paths (Brief 4, rulings 111 to 121, 153 to 182).
//
// Reads: connect_cards(lens, filters, cursor, limit) is SECURITY DEFINER and returns exactly the card
// shape the viewer may see; connect_where() returns country names above the floor; the Suggested
// lens and the DIA rail go through the connect-suggest Edge Function, which calls the same
// projection with the member's JWT and has DIA write each reason before anything renders. Nothing
// here filters, counts, scores or computes eligibility: the client renders what arrives.
// Writes: send_introduction, respond_to_request, withdraw_request, set_follow, dismiss_suggestion.
import type { Lens } from "@/components/strand/LensBar";
import type { Badge } from "@/components/strand/BadgeRow";
import type {
  MemberCardContext,
  MemberCardMember,
  MemberRel,
} from "@/components/strand/MemberCard";
import { functionsUrl, getSupabase, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

// ---------------------------------------------------------------------------
// URL contract (SPEC section 1, rulings 84, 155, 158, 163)
// ---------------------------------------------------------------------------

export type ConnectLens = "members" | "suggested" | "network" | "where";
export const CONNECT_LENS_IDS: ConnectLens[] = ["members", "suggested", "network", "where"];

export const CONNECT_LENSES: (Lens<ConnectLens> & { scope: string })[] = [
  {
    id: "members",
    label: "Members",
    icon: "users",
    scope: "Every member you can reach, found by attribute.",
  },
  {
    id: "suggested",
    label: "Suggested",
    icon: "user-plus",
    scope: "People DIA suggests, each with the reason in words.",
  },
  {
    id: "network",
    label: "My Network",
    icon: "link",
    scope: "Requests, what you sent, your connections, who you follow.",
  },
  {
    id: "where",
    label: "Where",
    icon: "globe",
    scope: "Where members are, by country. Nobody is plotted.",
  },
];

export type FilterKey =
  | "segment"
  | "location"
  | "origin"
  | "heritage"
  | "pathway"
  | "corridor"
  | "focus"
  | "industry"
  | "skill"
  | "region";

/** The ten axes in their fixed order (SPEC section 8). Labels are copy; the option values come from tables. */
export const FILTER_AXES: { key: FilterKey; label: string }[] = [
  { key: "segment", label: "Segment" },
  { key: "location", label: "Current location" },
  { key: "origin", label: "Country of origin" },
  { key: "heritage", label: "Heritage" },
  { key: "pathway", label: "Return pathway" },
  { key: "corridor", label: "Corridor" },
  { key: "focus", label: "Focus area" },
  { key: "industry", label: "Industry" },
  { key: "skill", label: "Skill" },
  { key: "region", label: "Regional expertise" },
];

export type ConnectFilters = Partial<Record<FilterKey, string>>;
export type ConnectSearch = { lens?: ConnectLens } & ConnectFilters;

export function parseConnectLens(v: unknown): ConnectLens {
  return typeof v === "string" && (CONNECT_LENS_IDS as string[]).includes(v)
    ? (v as ConnectLens)
    : "members";
}

/** validateSearch for /connect: a known lens (members omitted) and single-value filters only. */
export function validateConnectSearch(search: Record<string, unknown>): ConnectSearch {
  const out: ConnectSearch = {};
  const lens = search["lens"];
  if (
    typeof lens === "string" &&
    (CONNECT_LENS_IDS as string[]).includes(lens) &&
    lens !== "members"
  )
    out.lens = lens as ConnectLens;
  for (const { key } of FILTER_AXES) {
    const v = search[key];
    if (typeof v === "string" && v.trim()) out[key] = v.slice(0, 120);
  }
  return out;
}

export function filtersOf(search: ConnectSearch): ConnectFilters {
  const f: ConnectFilters = {};
  for (const { key } of FILTER_AXES) {
    const v = search[key];
    if (v) f[key] = v;
  }
  return f;
}

export function hasFilters(f: ConnectFilters): boolean {
  return Object.values(f).some(Boolean);
}

// ---------------------------------------------------------------------------
// Card shape from the projection
// ---------------------------------------------------------------------------

export type CardRow = {
  id: string;
  handle: string;
  name: string;
  avatar_path?: string | undefined;
  identified?: boolean | undefined;
  headline?: string | undefined;
  segment_label?: string | undefined;
  place?: string | undefined;
  origin?: string | undefined;
  heritage?: string | undefined;
  corridor_label?: string | undefined;
  chips?: string[] | undefined;
  badges?: Badge[] | undefined;
  mutuals?: { name: string; avatar_path?: string | undefined }[] | undefined;
  rel: MemberRel;
  following: boolean;
  /** Requests only: the sender's introduction. */
  message?: string | undefined;
  /** Suggested only: DIA's sentence, written by connect-suggest. */
  reason?: string | undefined;
};

/** A card with its storage paths resolved to signed URLs (profile-media is private; storage RLS decides). */
export type ConnectCard = CardRow & {
  avatarUrl?: string | undefined;
  mutualUrls?: (string | undefined)[] | undefined;
};

export type MembersPage = { items: ConnectCard[]; next_cursor: string | null };
export type NetworkView = {
  requests: ConnectCard[];
  sent: ConnectCard[];
  connections: ConnectCard[];
  following: ConnectCard[];
};
export type WhereView = { continent: string[]; diaspora: string[] };
export type FilterOptions = {
  segments: { value: string; label: string }[];
  locations: string[];
  origins: string[];
  heritage: string[];
  pathway: string[];
  corridors: { id: string; label: string }[];
  focus: string[];
  industries: string[];
  skills: string[];
  regions: string[];
};

const BUCKET = "profile-media";

/** Sign every avatar path in one call; paths the caller may not read come back undefined. */
async function signAll(cards: CardRow[]): Promise<ConnectCard[]> {
  const sb = getSupabase();
  const paths = new Set<string>();
  for (const c of cards) {
    if (c.avatar_path) paths.add(c.avatar_path);
    for (const m of c.mutuals ?? []) if (m.avatar_path) paths.add(m.avatar_path);
  }
  const urls = new Map<string, string>();
  if (sb && paths.size) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrls([...paths], 60 * 60);
    for (const d of data ?? [])
      if (d.path && d.signedUrl && !d.error) urls.set(d.path, d.signedUrl);
  }
  return cards.map((c) => ({
    ...c,
    avatarUrl: c.avatar_path ? urls.get(c.avatar_path) : undefined,
    mutualUrls: (c.mutuals ?? []).map((m) => (m.avatar_path ? urls.get(m.avatar_path) : undefined)),
  }));
}

/** The MemberCard props for a card row: the projection's fields under the component's names. */
export function toMember(c: ConnectCard): MemberCardMember {
  return {
    name: c.name,
    avatar: c.avatarUrl,
    identified: c.identified,
    headline: c.headline,
    segmentLabel: c.segment_label,
    place: c.place,
    origin: c.origin,
    heritage: c.heritage,
    corridorLabel: c.corridor_label,
    chips: c.chips,
    badges: c.badges,
    mutuals: (c.mutuals ?? []).map((m, i) => ({ name: m.name, avatar: c.mutualUrls?.[i] })),
    reason: c.reason,
    message: c.message,
  };
}

function rows(v: unknown): CardRow[] {
  return Array.isArray(v) ? (v as CardRow[]) : [];
}

/** Members lens: one page of cards under the filters, keyset cursor, twenty at a time. */
export async function loadMembers(
  filters: ConnectFilters,
  cursor: string | null = null,
): Promise<MembersPage> {
  const sb = getSupabase();
  if (!sb) return { items: [], next_cursor: null };
  const { data, error } = await sb.rpc("connect_cards", {
    p_lens: "members",
    p_filters: filters,
    ...(cursor ? { p_cursor: cursor } : {}),
    p_limit: 20,
  });
  if (error) throw error;
  const d = (data ?? {}) as { items?: unknown; next_cursor?: string | null };
  return {
    items: await signAll(rows(d.items)),
    next_cursor: typeof d.next_cursor === "string" ? d.next_cursor : null,
  };
}

/** My Network: the four sections in one read. */
export async function loadNetwork(): Promise<NetworkView> {
  const sb = getSupabase();
  const empty: NetworkView = { requests: [], sent: [], connections: [], following: [] };
  if (!sb) return empty;
  const { data, error } = await sb.rpc("connect_cards", { p_lens: "network" });
  if (error) throw error;
  const d = (data ?? {}) as Record<keyof NetworkView, unknown>;
  const [requests, sent, connections, following] = await Promise.all([
    signAll(rows(d.requests)),
    signAll(rows(d.sent)),
    signAll(rows(d.connections)),
    signAll(rows(d.following)),
  ]);
  return { requests, sent, connections, following };
}

/** Where: country names above the floor, grouped. Never a count. */
export async function loadWhere(): Promise<WhereView> {
  const sb = getSupabase();
  if (!sb) return { continent: [], diaspora: [] };
  const { data, error } = await sb.rpc("connect_where");
  if (error) throw error;
  const d = (data ?? {}) as Partial<WhereView>;
  return {
    continent: Array.isArray(d.continent) ? d.continent : [],
    diaspora: Array.isArray(d.diaspora) ? d.diaspora : [],
  };
}

export async function loadFilterOptions(): Promise<FilterOptions | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("connect_filter_options");
  if (error) throw error;
  return (data as unknown as FilterOptions) ?? null;
}

/**
 * Suggested: the rules-ranked set with DIA's reason on every card (connect-suggest). A suggestion
 * whose reason did not arrive is not in the list; a failure is an empty list, never a filler.
 */
export async function loadSuggestions(limit = 12): Promise<ConnectCard[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(functionsUrl("connect-suggest"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit }),
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const out = (await res.json()) as { items?: unknown };
    return await signAll(rows(out.items).filter((c) => typeof c.reason === "string" && c.reason));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Writes. The server enforces the whole state machine; a refusal surfaces as an error.
// ---------------------------------------------------------------------------

export async function sendIntroduction(recipientId: string, message: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb.rpc("send_introduction", {
    p_recipient: recipientId,
    p_message: message.trim(),
  });
  if (error) throw new Error(friendly(error.message));
}

export async function respondToRequest(senderId: string, accept: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb.rpc("respond_to_request", { p_sender: senderId, p_accept: accept });
  if (error) throw new Error(friendly(error.message));
}

export async function withdrawIntroduction(recipientId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb.rpc("withdraw_request", { p_recipient: recipientId });
  if (error) throw new Error(friendly(error.message));
}

export async function setFollowing(targetId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb.rpc("set_follow", { p_target: targetId, p_on: on });
  if (error) throw new Error(friendly(error.message));
}

export async function dismissSuggestion(targetId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb.rpc("dismiss_suggestion", { p_target: targetId });
  if (error) throw new Error(friendly(error.message));
}

function friendly(message: string): string {
  if (/needs a message/.test(message)) return "An introduction needs a message.";
  if (/no request waiting/.test(message)) return "That request is no longer waiting.";
  return "That did not go through. Try again.";
}

/** The context a card takes inside My Network's four sections. */
export const NETWORK_SECTIONS: {
  key: keyof NetworkView;
  label: string;
  context: MemberCardContext;
  empty: string;
}[] = [
  { key: "requests", label: "Requests", context: "requests", empty: "No requests waiting." },
  {
    key: "sent",
    label: "Sent",
    context: "sent",
    empty:
      "Nothing sent. Introductions you make wait here until they are accepted, or until they quietly expire.",
  },
  {
    key: "connections",
    label: "Connections",
    context: "connections",
    empty: "No connections yet. Start with someone you have met.",
  },
  {
    key: "following",
    label: "Following",
    context: "following",
    empty: "Following nobody yet. Follow is one way and quiet; it shapes your Feed.",
  },
];
