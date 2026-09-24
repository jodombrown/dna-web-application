// Handoff 32-B, Addendum 1 (rulings 1082, 1094, 1111): whether a member left a surface's filter rail
// open or collapsed, per width band, in `public.member_rail_state` under the member's own row policy.
// No row means collapsed, so a member who never touched the rail sees it collapsed at every width
// (1094). The row is written only when the member toggles the rail, never on load.
//
// The bands are the app's width keys in slug form, as Chat accepted them: `medium` (640 to 1024),
// `expanded` (1025 to 1439) and `wide` (1440 and up, `WIDE_MIN`). Compact is never written: below 640
// the rail is a Sheet the member opens and closes, and a Sheet is never restored open on load.
import { getSupabase } from "./supabase";
import type { Tier } from "./tier";

export type RailBand = "medium" | "expanded" | "wide";

/** The band a width falls in, from the shell's own tier and 1440 check; null at compact. */
export function railBand(tier: Tier, wide: boolean): RailBand | null {
  if (tier === "compact") return null;
  if (tier === "medium") return "medium";
  return wide ? "wide" : "expanded";
}

/** Whether the rail is collapsed at this band: the member's row, else collapsed. */
export async function readRailCollapsed(
  memberId: string,
  surface: string,
  band: RailBand,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { data, error } = await sb
    .from("member_rail_state")
    .select("collapsed")
    .eq("member_id", memberId)
    .eq("surface", surface)
    .eq("width_band", band)
    .maybeSingle();
  if (error) throw error;
  return data ? data.collapsed : true;
}

/** The member's toggle, written as their own row for this surface and band. */
export async function writeRailCollapsed(
  memberId: string,
  surface: string,
  band: RailBand,
  collapsed: boolean,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("member_rail_state").upsert(
    {
      member_id: memberId,
      surface,
      width_band: band,
      collapsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id,surface,width_band" },
  );
  if (error) throw error;
}
