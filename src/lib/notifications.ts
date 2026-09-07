// The minimum notification system (ruling 82): real rows only, recipient-scoped by RLS. Reads the
// member's rows and marks one read; nothing here sends anything. No engine writes rows yet, so the
// list's empty state is the true launch state.
import type { Tables } from "./database.types";
import { getSupabase } from "./supabase";

export type NotificationRow = Tables<"notifications">;

export async function loadNotifications(memberId: string, limit = 50): Promise<NotificationRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("recipient_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Whether at least one unread row exists. Existence only: the bell shows a dot, never a numeral. */
export async function hasUnread(memberId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from("notifications")
    .select("id")
    .eq("recipient_member_id", memberId)
    .is("read_at", null)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function markRead(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}
