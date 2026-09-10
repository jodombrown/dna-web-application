// Block and unblock: the chassis write, not Profile's and not Connect's (ruling 186). Every surface
// that grows a block control calls these two; nothing else writes public.member_blocks from the app.
//
// There is no RPC and there should not be one. member_blocks already carries the whole contract:
// RLS admits only the blocker's own rows (member_blocks_owner_insert and _owner_delete, both on
// blocker_id = auth.uid()), and every consequence of a block is a trigger on the table, not a step
// in a write path. private.on_member_blocked (ruling 198) revokes the connect and follow edges in
// both directions, clears the adjacency and follow projections and rebuilds second degree, so it
// fires on this insert exactly as it fires on an admin's or the API's. A SECURITY DEFINER wrapper
// would add a second place for those semantics to live and drift from, which is what ruling 198's
// own migration says the trigger exists to prevent. B4A section 13 rules out a schema, migration or
// RLS change here, and none is needed.
//
// Ruling 211: unblocking restores nothing. Deleting the row lifts the filters and the scope drop;
// the revoked edges stay revoked and have to be re-made deliberately. Nothing is written to, or
// shown to, the other party in either direction (ruling 198).
import { getSupabase } from "./supabase";

/** Block a member. The trigger on member_blocks revokes the relationship both ways (ruling 198). */
export async function blockMember(viewerId: string, memberId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb
    .from("member_blocks")
    .insert({ blocker_id: viewerId, blocked_id: memberId });
  if (error) throw error;
}

/** Unblock a member. Edges are not restored (ruling 211). */
export async function unblockMember(viewerId: string, memberId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { error } = await sb
    .from("member_blocks")
    .delete()
    .eq("blocker_id", viewerId)
    .eq("blocked_id", memberId);
  if (error) throw error;
}
