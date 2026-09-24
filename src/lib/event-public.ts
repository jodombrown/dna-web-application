// Brief 10's public page read (662, 1028): `public.event_public_page(text)` with the anon key.
//
// This runs in the route loader, on the server for the first render and in the browser on a client
// navigation, so it never touches the browser singleton in ./supabase.ts (which returns null during
// SSR and carries a session the public page must not read through). A throwaway client with no
// session, no storage and no URL detection is the whole of what an anonymous read needs. The
// projection is a definer that answers only for a published or cancelled event whose post is to
// everyone, and it carries no registration, no count and no attendee name in any state (680); this
// module adds nothing to it and reads nothing else.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase";
import type { EventPageEvent } from "./event-page";

export type PublicEventPage = {
  event: Omit<EventPageEvent, "id" | "status" | "full" | "public">;
  body: string;
  presented_by: { kind: "member" | "space" | null; name: string | null };
  host: { name: string } | null;
  /** Positions only: the bytes come through event-media (1029), never a storage path. */
  media: { position: number; width: number; height: number }[];
  place: {
    place_name: string | null;
    place_text: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
  } | null;
  speakers: { party_id: string; name: string; role: string; label: string; has_photo: boolean }[];
  /** 678: a pending invitation is the role alone on the public page. */
  pending_roles: { role: string; label: string }[];
  partners: never[];
};

/** A client with no session, no storage and no URL detection: all an anonymous read needs. */
function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function loadPublicEventPage(slug: string): Promise<PublicEventPage | null> {
  const s = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return null;
  const { data, error } = await anonClient().rpc("event_public_page", { p_slug: s });
  if (error) throw error;
  return (data as unknown as PublicEventPage | null) ?? null;
}

/**
 * Handoff 32-B item 9 (1080, 1081, 1100, 1109): the canonical slug behind an event's alias (`e`, the
 * segment of `/e/{alias}`) or its short code (`x`, the segment of `/x/{code}`), through
 * `public.resolve_event_link`. The database answers a slug only when `event_public_page` would answer
 * a page for that slug, so an alias or code for an event without a public page is null, exactly as
 * its slug is. Callable signed out, like the page. An empty or oversized segment is null without a
 * call; the function lower-cases and trims what it is given.
 */
export async function resolveEventLink(kind: "e" | "x", segment: string): Promise<string | null> {
  const s = segment.trim();
  if (!s || s.length > 64) return null;
  const { data, error } = await anonClient().rpc("resolve_event_link", {
    p_kind: kind,
    p_segment: s,
  });
  if (error) throw error;
  return typeof data === "string" && data ? data : null;
}
