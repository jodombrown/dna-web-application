// Left-rail context for the expanded tier (ruling 79): the member's own quick state, grounded or
// empty. Upcoming convenings are events the member can see (RLS) that start from now; active
// Spaces are roles they hold; saved items are their post_saves. No counts, no nudges.
import type { Member } from "./auth";
import { hydratePosts, loadMemberSpaces } from "./feed";
import type { PostView } from "./post-view";
import { getSupabase } from "./supabase";
import { storedLine } from "./when";

export type RailState = {
  /**
   * `when` is the host's own words, echoed; `stored` is the instant those words became, in the
   * event's own zone, named by its IANA identifier (898) and carrying 835's year (P4-SPEC section
   * 2). Two lines because they answer two questions, and because rewriting the first into the
   * second is what the composer's own read-back refuses to do.
   */
  events: { id: string; title: string; when: string; stored: string }[];
  spaces: { id: string; name: string }[];
  saved: PostView[];
};

export async function loadRailState(member: Member): Promise<RailState> {
  const sb = getSupabase();
  if (!sb) return { events: [], spaces: [], saved: [] };
  const nowIso = new Date().toISOString();
  const [events, spaces, saves] = await Promise.all([
    sb
      .from("events")
      .select("id,title,starts_at,timezone,when_text")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(3),
    loadMemberSpaces(member.id),
    sb
      .from("post_saves")
      .select("post_id")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const savedIds = (saves.data ?? []).map((s) => s.post_id);
  let saved: PostView[] = [];
  if (savedIds.length) {
    const { data: posts } = await sb.from("posts").select("*").in("id", savedIds);
    const ordered = savedIds
      .map((id) => (posts ?? []).find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    saved = await hydratePosts(sb, member, ordered);
  }
  return {
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      when: e.when_text.split("\n").filter(Boolean).join(", "),
      // Empty where the event carries no instant or no zone the calendar knows: the echo then
      // stands alone rather than a line guessing at what was stored (ruling 194's shape).
      stored: e.starts_at ? storedLine(e.starts_at, e.timezone ?? "") : "",
    })),
    spaces,
    saved,
  };
}
