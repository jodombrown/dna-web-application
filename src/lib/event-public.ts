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

export async function loadPublicEventPage(slug: string): Promise<PublicEventPage | null> {
  const s = slug.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return null;
  const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.rpc("event_public_page", { p_slug: s });
  if (error) throw error;
  return (data as unknown as PublicEventPage | null) ?? null;
}
