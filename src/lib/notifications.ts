// The minimum notification system (ruling 82): real rows only, recipient-scoped by RLS. Reads the
// member's rows, resolves the names the row copy needs under the caller's RLS, and marks one read.
// Nothing here sends anything. No engine writes rows yet, so the empty list is the launch state.
import type { Tables } from "./database.types";
import { getSupabase } from "./supabase";
import { whenLabel } from "./when";

export type NotificationRow = Tables<"notifications">;

/** A row plus the words its copy needs: "{actor} accepted your intro.", "{object} starts {detail}." */
export type NotificationView = NotificationRow & {
  actor?: string | undefined;
  object?: string | undefined;
  detail?: string | undefined;
};

export async function loadNotifications(memberId: string, limit = 50): Promise<NotificationView[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("recipient_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = (kind: NotificationRow["object_kind"]) =>
    rows.filter((r) => r.object_kind === kind && r.object_id).map((r) => r.object_id as string);
  const spaceIds = [
    ...ids("space"),
    ...rows.filter((r) => r.actor_kind === "space").map((r) => r.actor_id as string),
  ];
  const memberActorIds = rows
    .filter((r) => r.actor_kind === "member" && r.actor_id)
    .map((r) => r.actor_id as string);
  const [spaces, events, opps, actors, roles] = await Promise.all([
    spaceIds.length
      ? sb.from("spaces").select("id,title").in("id", spaceIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ids("event").length
      ? sb.from("events").select("id,title,starts_at").in("id", ids("event"))
      : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string | null }[] }),
    ids("opportunity").length
      ? sb.from("opportunities").select("id,title").in("id", ids("opportunity"))
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    memberActorIds.length
      ? sb.from("members").select("id,name").in("id", memberActorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ids("space").length
      ? sb
          .from("space_roles")
          .select("space_id,role")
          .eq("member_id", memberId)
          .in("space_id", ids("space"))
      : Promise.resolve({ data: [] as { space_id: string; role: "lead" | "member" }[] }),
  ]);
  const space = new Map((spaces.data ?? []).map((s) => [s.id, s.title]));
  const event = new Map((events.data ?? []).map((e) => [e.id, e]));
  const opp = new Map((opps.data ?? []).map((o) => [o.id, o.title]));
  const actorName = new Map((actors.data ?? []).map((a) => [a.id, a.name]));
  const role = new Map((roles.data ?? []).map((r) => [r.space_id, r.role]));

  return rows.map((r): NotificationView => {
    const oid = r.object_id ?? "";
    const objectName =
      r.object_kind === "space"
        ? space.get(oid)
        : r.object_kind === "event"
          ? event.get(oid)?.title
          : r.object_kind === "opportunity"
            ? opp.get(oid)
            : undefined;
    // A Space actor has a title; a member actor is named from the members core row (Brief 3), which
    // every signed-in member may read. The request row itself is never read by the sender (ruling 157).
    const actor =
      r.actor_kind === "space" ? space.get(r.actor_id ?? "") : actorName.get(r.actor_id ?? "");
    let detail: string | undefined;
    if (r.kind === "space_role_approved") {
      const rl = role.get(oid);
      detail = rl === "lead" ? "a lead" : rl === "member" ? "a member" : undefined;
    } else if (r.kind === "event_reminder") {
      detail = whenLabel(event.get(oid)?.starts_at) || undefined;
    }
    return {
      ...r,
      actor: actor || "A member",
      object: objectName || undefined,
      detail,
    };
  });
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
