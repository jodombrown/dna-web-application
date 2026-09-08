// The profile's one read projection and its writes (Brief 3, rulings 122 to 136).
//
// Reads: profile_view(handle, as_public) is SECURITY DEFINER and returns exactly what the caller may
// see (owner, member or anonymous), using the same audience predicate as the table policies, so
// nothing here filters. This module is the only profile read in the app (no second projection).
// Writes: save_profile_section(section, payload), one section per call, under the owner's own RLS.
// Relationship actions write connection_requests and member_follows under their own policies.
import { format } from "date-fns";
import type { Audience } from "@/components/strand/AudienceSelect";
import type { AttestationItem } from "@/components/strand/AttestationRail";
import type { Badge } from "@/components/strand/BadgeRow";
import type { C } from "@/components/strand/cmeta";
import type { MastheadPattern } from "@/components/strand/ProfileHeader";
import type { Segment } from "@/components/strand/SegmentBlock";
import type { Json } from "./database.types";
import { functionsUrl, getSupabase, SUPABASE_PUBLISHABLE_KEY } from "./supabase";

export type SectionKey =
  | "about"
  | "segment"
  | "origin"
  | "where"
  | "work"
  | "skills"
  | "languages"
  | "intent"
  | "links"
  | "convene"
  | "collaborate"
  | "contribute"
  | "convey"
  | "badges";

export type ActivityC = Extract<C, "convene" | "collaborate" | "contribute" | "convey">;

export type ActivityRow = {
  title: string;
  sub: string;
  when?: string | undefined;
  completed?: boolean | undefined;
  post_id?: string | null | undefined;
};

export type SegmentFields = {
  timeline?: string | undefined;
  needs?: string | undefined;
  base?: string | undefined;
  offer?: string | undefined;
  support?: string | undefined;
  interests?: string[] | undefined;
};

export type ProfileSections = {
  about?: { about?: string | undefined };
  segment?: {
    segment?: Segment | undefined;
    fields: SegmentFields;
    variants?: Partial<Record<Segment, SegmentFields>> | undefined;
  };
  origin?: {
    origin_country?: string | undefined;
    heritage?: string | undefined;
    pathway?: string | undefined;
  };
  where?: { current_place?: string | undefined; local_tz?: string | undefined };
  work?: { focus: string[]; industries: string[]; regions: string[] };
  skills?: { skills: string[] };
  languages?: { languages: string[] };
  intent?: { intent: string[]; note?: string | undefined };
  links?: Partial<Record<"website" | "linkedin" | "x" | "instagram", string>>;
  convene?: ActivityRow[];
  collaborate?: ActivityRow[];
  contribute?: ActivityRow[];
  convey?: ActivityRow[];
};

export type ProfileMember = {
  id: string;
  handle: string;
  name: string;
  headline?: string | undefined;
  avatar_path?: string | undefined;
  cover_path?: string | undefined;
  cover_focus: string;
  origin_country?: string | undefined;
  current_place?: string | undefined;
  local_tz?: string | undefined;
  segment?: Segment | undefined;
  pattern: MastheadPattern;
  tier: "account" | "identified" | "attested";
};

export type RelationshipState = "none" | "sent" | "received" | "connected";

export type ProfileView = {
  viewer: "owner" | "member" | "anon";
  member: ProfileMember;
  switches?: { private: boolean; shared: boolean } | undefined;
  private?: boolean | undefined;
  sections: ProfileSections;
  badges: {
    c: Badge["c"];
    items: { object: string; attester: string; role: string; when: string }[];
  }[];
  visibility?: Partial<Record<SectionKey, Audience>> | undefined;
  relationship?: { state: RelationshipState; following: boolean } | undefined;
  mutuals: { name: string; handle: string; avatar_path?: string | undefined }[];
  shared_spaces: string[];
  anchored?: boolean | undefined;
  dia_line?: string | undefined;
  /** Signed URLs resolved client-side from the storage paths (private bucket; storage RLS decides). */
  avatarUrl?: string | undefined;
  coverUrl?: string | undefined;
};

export type Vocabularies = {
  focus: string[];
  industries: string[];
  regions: string[];
  skills: string[];
  languages: string[];
  intent: string[];
  interests: string[];
  countries: string[];
  heritage: string[];
  pathway: string[];
  timeline: string[];
};

const BUCKET = "profile-media";

export async function signedProfileUrl(
  path: string | null | undefined,
): Promise<string | undefined> {
  const sb = getSupabase();
  if (!sb || !path) return undefined;
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? undefined;
}

/** The one profile read. Null when the caller may not open it (anonymous and not shared, or no such handle). */
export async function loadProfile(handle: string, asPublic = false): Promise<ProfileView | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("profile_view", { p_handle: handle, p_as_public: asPublic });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const view = data as unknown as ProfileView;
  view.sections = view.sections ?? {};
  view.badges = view.badges ?? [];
  view.mutuals = view.mutuals ?? [];
  view.shared_spaces = view.shared_spaces ?? [];
  const [avatarUrl, coverUrl] = await Promise.all([
    signedProfileUrl(view.member.avatar_path),
    signedProfileUrl(view.member.cover_path),
  ]);
  view.avatarUrl = avatarUrl;
  view.coverUrl = coverUrl;
  return view;
}

export async function loadVocabularies(): Promise<Vocabularies | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("profile_vocabularies");
  if (error) throw error;
  return (data as unknown as Vocabularies) ?? null;
}

/** One section save; the server validates caps and vocabulary membership and writes under the owner's RLS. */
export async function saveSection(
  section: string,
  payload: Record<string, Json | undefined>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const clean: Record<string, Json> = {};
  for (const [k, v] of Object.entries(payload)) if (v !== undefined) clean[k] = v;
  const { error } = await sb.rpc("save_profile_section", { section, payload: clean });
  if (error) throw new Error(friendlyError(error.message));
}

function friendlyError(message: string): string {
  if (/A name is required/.test(message)) return "A name is required.";
  const cap =
    /(Focus areas|Industries|Regional expertise|Skills|Languages|Intent|Interests): up to (\d+)/.exec(
      message,
    );
  if (cap) return `${cap[1]}: up to ${cap[2]}.`;
  if (/violates foreign key/.test(message)) return "That value is not in the list.";
  return "That did not save. Try again.";
}

/** The composer's media path (Tinify), aimed at the profile bucket: {member}/{slot}/{uuid}.{ext}. */
export async function uploadProfileImage(
  file: File,
  slot: "avatar" | "cover",
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const form = new FormData();
  form.append("file", file);
  form.append("slot", slot);
  try {
    const res = await fetch(functionsUrl("media-upload"), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, apikey: SUPABASE_PUBLISHABLE_KEY },
      body: form,
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { storage_path?: string };
    return out.storage_path ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Relationship (rulings 117 to 120). Follow is independent of the connection state. Withdraw,
// accept and decline update the pending request under connection_requests' two-party policies.
// ---------------------------------------------------------------------------

export async function setFollow(viewerId: string, memberId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (on) {
    const { error } = await sb
      .from("member_follows")
      .insert({ follower_id: viewerId, member_id: memberId });
    if (error && error.code !== "23505") throw error;
  } else {
    const { error } = await sb
      .from("member_follows")
      .delete()
      .eq("follower_id", viewerId)
      .eq("member_id", memberId);
    if (error) throw error;
  }
}

async function pendingRequest(viewerId: string, memberId: string, direction: "sent" | "received") {
  const sb = getSupabase();
  if (!sb) return null;
  const from = direction === "sent" ? viewerId : memberId;
  const to = direction === "sent" ? memberId : viewerId;
  const { data } = await sb
    .from("connection_requests")
    .select("id")
    .eq("from_member_id", from)
    .eq("to_member_id", to)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function withdrawRequest(viewerId: string, memberId: string): Promise<void> {
  const sb = getSupabase();
  const id = await pendingRequest(viewerId, memberId, "sent");
  if (!sb || !id) return;
  const { error } = await sb
    .from("connection_requests")
    .update({ status: "withdrawn" })
    .eq("id", id);
  if (error) throw error;
}

export async function respondRequest(
  viewerId: string,
  memberId: string,
  accept: boolean,
): Promise<void> {
  const sb = getSupabase();
  const id = await pendingRequest(viewerId, memberId, "received");
  if (!sb || !id) return;
  const { error } = await sb
    .from("connection_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// The public close (rulings 130, 135): attestations across DNA per C, placed by DIA.
// ---------------------------------------------------------------------------

type PublicAttestationRow = {
  member: string;
  handle: string;
  avatar_path?: string | null;
  object: string;
  attester: string;
  role: string;
  when: string;
  c: C;
  object_kind: string;
  object_id: string;
};

export async function loadPublicAttestations(): Promise<Partial<Record<C, AttestationItem[]>>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.rpc("public_attestations");
  if (error || !data || typeof data !== "object") return {};
  const out: Partial<Record<C, AttestationItem[]>> = {};
  for (const [c, rows] of Object.entries(data as Record<string, PublicAttestationRow[]>)) {
    out[c as C] = (rows ?? []).map((r) => ({
      member: r.member,
      object: r.object,
      attester: r.attester,
      role: r.role,
      when: whenShort(r.when),
      // The object's own public page arrives with its C's brief; until then the C's route.
      href: "/" + r.c,
    }));
  }
  return out;
}

/** "Sat 23 Aug" for a timestamp; empty when absent. */
export function whenShort(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "EEE d MMM");
}

// ---------------------------------------------------------------------------
// Local time (ruling 131): real, from the member's stored zone and the viewer's device zone; absent
// without a location. "14:32 in Johannesburg" for the owner; "· 2 hours ahead of you" for a viewer.
// ---------------------------------------------------------------------------

function minutesInZone(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function timeLine(
  tz: string | null | undefined,
  place: string | null | undefined,
  owner: boolean,
  now = new Date(),
): string | null {
  if (!tz) return null;
  let t: string;
  try {
    t = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  } catch {
    return null;
  }
  const city = (place ?? "").split(",")[0]?.trim() || tz.split("/").pop()?.replace(/_/g, " ") || "";
  if (owner) return t + " in " + city;
  let diff =
    minutesInZone(tz, now) - minutesInZone(Intl.DateTimeFormat().resolvedOptions().timeZone, now);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  const hrs = Math.abs(diff) / 60;
  const n = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
  const rel =
    diff === 0
      ? "same time as you"
      : n + (n === "1" ? " hour " : " hours ") + (diff > 0 ? "ahead of you" : "behind you");
  return t + " in " + city + " · " + rel;
}
