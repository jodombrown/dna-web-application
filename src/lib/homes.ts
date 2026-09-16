// Convene Pass 1 (rulings 633, 690): the member's homes, read from public.member_homes under the
// owner's own row policy. Empty until Profile's editor lands; with no rows the Convene form shows
// no home chips and offers no proximity (grounded-or-empty), never fixture names.
import type { Tables } from "./database.types";
import { getSupabase } from "./supabase";

export type Home = Pick<
  Tables<"member_homes">,
  "id" | "position" | "place_id" | "place_name" | "city" | "country" | "lng" | "lat" | "timezone"
>;

export async function loadMemberHomes(memberId: string): Promise<Home[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("member_homes")
    .select("id, position, place_id, place_name, city, country, lng, lat, timezone")
    .eq("member_id", memberId)
    .order("position");
  if (error || !data) return [];
  return data;
}
