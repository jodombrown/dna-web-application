// The profile's one read projection and its writes (Brief 3, rulings 122 to 136).
//
// Reads: profile_view(handle, as_public) is SECURITY DEFINER and returns exactly what the caller may
// see (owner, member or anonymous), using the same audience predicate as the table policies, so
// nothing here filters. This module is the only profile read in the app (no second projection).
// Writes: save_profile_section(section, payload), one section per call, under the owner's own RLS.
// Relationship actions go through Connect's write paths (Brief 4): set_follow, withdraw_request,
// respond_to_request. Block and unblock are chassis, not Profile's and not Connect's (ruling 186);
// they live in lib/blocks.ts.
//
// Ruling 275, under 212: the place-derived local time line left the core row on every surface, so
// the helper that composed it left with the ProfileHeader props that carried it.
import { format } from "date-fns";
import type { Audience } from "@/components/strand/AudienceSelect";
import type { AttestationItem } from "@/components/strand/AttestationRail";
import type { Badge } from "@/components/strand/BadgeRow";
import type { C } from "@/components/strand/cmeta";
import type { MastheadPattern } from "@/components/strand/ProfileHeader";
import type { Stance } from "@/components/strand/SegmentBlock";
import type { Json } from "./database.types";
import { uploadImage, type ImageSlot, type ImageUpload } from "./media";
import { getSupabase } from "./supabase";

export type SectionKey =
  | "about"
  | "stance"
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
  stance?: {
    stance?: Stance | undefined;
    fields: SegmentFields;
    variants?: Partial<Record<Stance, SegmentFields>> | undefined;
  };
  origin?: {
    origin_country?: string | undefined;
    heritage?: string | undefined;
    pathway?: string | undefined;
  };
  where?: {
    current_place?: string | undefined;
    current_country?: string | undefined;
    local_tz?: string | undefined;
  };
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
  current_country?: string | undefined;
  local_tz?: string | undefined;
  stance?: Stance | undefined;
  /**
   * Ruling 187: the stance's display label, resolved by profile_view from public.member_stances,
   * the one label source. It rides on the member object so the Public (signed-out) view has it too,
   * where public.vocabularies is revoked from anon. The client keeps no map of its own.
   */
  stance_label?: string | undefined;
  pattern: MastheadPattern;
  tier: "account" | "identified" | "attested";
};

/**
 * Ruling 214, amending 168: the window is server-side only. A decline inside the window arrives as
 * "sent" from every projection, so no surface can render it as anything else and no sender can
 * construct a probe that separates the two states.
 */
export type RelationshipState = "none" | "sent" | "received" | "connected";

export type ProfileView = {
  viewer: "owner" | "member" | "anon";
  member: ProfileMember;
  switches?: { private: boolean; shared: boolean } | undefined;
  private?: boolean | undefined;
  sections: ProfileSections;
  badges: {
    c: Badge["c"];
    /** role is absent when the attester is rendered as a role only (ruling 141). */
    items: { object: string; attester: string; role?: string | null | undefined; when: string }[];
  }[];
  visibility?: Partial<Record<SectionKey, Audience>> | undefined;
  relationship?: { state: RelationshipState; following: boolean } | undefined;
  /**
   * B4A section 4: has the viewer blocked this member. The viewer's own `member_blocks` row, which
   * they may already read, so telling them discloses nothing. The converse is deliberately absent
   * from the projection: nothing that reaches a blocked member may separate a block from a stranger
   * (B4A section 7). It is false for a blocked viewer exactly as it is for every other viewer.
   */
  viewer_blocked?: boolean | undefined;
  mutuals: { name: string; handle: string; avatar_path?: string | undefined }[];
  shared_spaces: string[];
  anchored?: boolean | undefined;
  dia_line?: string | undefined;
  /** Signed URLs resolved client-side from the storage paths (private bucket; storage RLS decides). */
  avatarUrl?: string | undefined;
  coverUrl?: string | undefined;
};

// Ruling 193: the vocabulary projection is no longer Profile's. Its type and its one read moved to
// src/lib/vocabularies.ts, which the Composer and the Feed read through the same path.

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

/**
 * Ruling 424 (W30): the profile's avatar and cover go through the same client half of the pipeline
 * as onboarding's photo (lib/media.ts uploadImage: conversion, mime acceptance, the thirty-second
 * bound), then the section save records the path. media-upload stores every master at
 * {member}/{mediaId}.{ext} and registers it in public.media; save_profile_section checks that
 * registry, not a path shape (the ruling 374 shape that W30 turned out to be).
 */
export async function uploadProfileImage(file: File, slot: ImageSlot): Promise<ImageUpload> {
  return uploadImage(file, slot);
}

// ---------------------------------------------------------------------------
// Relationship (rulings 117 to 120, 157). Follow is independent of the connection state. Since
// Brief 4 every relationship write goes through Connect's SECURITY DEFINER write paths (set_follow,
// withdraw_request, respond_to_request): the sender has no direct read or write on
// connection_requests, so a declined status can never reach them (ruling 157).
// ---------------------------------------------------------------------------

export async function setFollow(_viewerId: string, memberId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("set_follow", { p_target: memberId, p_on: on });
  if (error) throw error;
}

export async function withdrawRequest(_viewerId: string, memberId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("withdraw_request", { p_recipient: memberId });
  if (error) throw error;
}

export async function respondRequest(
  _viewerId: string,
  memberId: string,
  accept: boolean,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("respond_to_request", { p_sender: memberId, p_accept: accept });
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
  role?: string | null;
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
      role: r.role ?? null,
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
