// The minimum notification system (ruling 82): real rows only, recipient-scoped by RLS. Reads the
// member's rows, resolves the names the row copy needs under the caller's RLS, and marks one read.
// Nothing here sends anything. No engine writes rows yet, so the empty list is the launch state.
import { isRenderedKind } from "@/components/strand/NotificationListItem";
import type { Tables } from "./database.types";
import { getSupabase } from "./supabase";
import { loadVocabularies } from "./vocabularies";
import { whenLabel } from "./when";

export type NotificationRow = Tables<"notifications">;

/** A row plus the words its copy needs: "{actor} accepted your connection request.", "{object} starts {detail}." */
export type NotificationView = NotificationRow & {
  actor?: string | undefined;
  /** The actor's handle, when the actor is a member. Ruling 462: the row's destination needs it. */
  actorHandle?: string | undefined;
  object?: string | undefined;
  detail?: string | undefined;
  /** Brief 10 (1027): the event an `event_party` row belongs to, so the row can open its page. */
  eventId?: string | undefined;
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
  // Ruling 547: a kind whose destination has no surface is suppressed from the registry, and
  // grounded-or-empty then applies to the row itself: it cannot go anywhere, so it does not render.
  // Filtered here rather than in the query because the registry is the client's contract and a kind
  // it holds need not yet exist in the database's own enum; sending one to `in` would be an error
  // rather than an empty result. The name resolution below sees only the rows that survive.
  const rows = (data ?? []).filter((r) => isRenderedKind(r.kind));
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
  // Brief 10 (736, 1027): an event_party object is the member's own event_parties row, readable
  // under its policy, and its event's title; the verb comes from the event_roles vocabulary (1018),
  // never from a literal here (ruling 194: a read that fails leaves the row's verb absent).
  const partyIds = ids("event_party");
  const [spaces, events, opps, actors, roles, parties, vocab] = await Promise.all([
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
      ? sb.from("members").select("id,name,handle").in("id", memberActorIds)
      : Promise.resolve({ data: [] as { id: string; name: string; handle: string }[] }),
    ids("space").length
      ? sb
          .from("space_roles")
          .select("space_id,role")
          .eq("member_id", memberId)
          .in("space_id", ids("space"))
      : Promise.resolve({ data: [] as { space_id: string; role: "lead" | "member" }[] }),
    partyIds.length
      ? sb.from("event_parties").select("id,event_id,role").in("id", partyIds)
      : Promise.resolve({ data: [] as { id: string; event_id: string; role: string }[] }),
    partyIds.length ? loadVocabularies().catch(() => null) : Promise.resolve(null),
  ]);
  const party = new Map((parties.data ?? []).map((p) => [p.id, p]));
  const partyEventIds = [...new Set((parties.data ?? []).map((p) => p.event_id))].filter(
    (eid) => !ids("event").includes(eid),
  );
  const partyEvents = partyEventIds.length
    ? await sb.from("events").select("id,title,starts_at").in("id", partyEventIds)
    : { data: [] as { id: string; title: string; starts_at: string | null }[] };
  const roleVerb = new Map((vocab?.event_roles ?? []).map((r) => [r.value, r.verb]));
  const space = new Map((spaces.data ?? []).map((s) => [s.id, s.title]));
  const event = new Map(
    [...(events.data ?? []), ...(partyEvents.data ?? [])].map((e) => [e.id, e]),
  );
  const opp = new Map((opps.data ?? []).map((o) => [o.id, o.title]));
  const actorName = new Map((actors.data ?? []).map((a) => [a.id, a.name]));
  const actorHandle = new Map((actors.data ?? []).map((a) => [a.id, a.handle]));
  const role = new Map((roles.data ?? []).map((r) => [r.space_id, r.role]));

  return rows.map((r): NotificationView => {
    const oid = r.object_id ?? "";
    const partyRow = r.object_kind === "event_party" ? party.get(oid) : undefined;
    const objectName =
      r.object_kind === "space"
        ? space.get(oid)
        : r.object_kind === "event"
          ? event.get(oid)?.title
          : r.object_kind === "opportunity"
            ? opp.get(oid)
            : partyRow
              ? event.get(partyRow.event_id)?.title
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
    } else if (r.kind === "role_invitation" && partyRow) {
      detail = roleVerb.get(partyRow.role);
    }
    return {
      ...r,
      actor: actor || "A member",
      actorHandle:
        r.actor_kind === "member" ? (actorHandle.get(r.actor_id ?? "") ?? undefined) : undefined,
      object: objectName || undefined,
      detail,
      eventId: partyRow?.event_id,
    };
  });
}

/**
 * Whether at least one unread row the panel would render exists. Existence only: the bell shows a
 * dot, never a numeral. Ruling 547: a suppressed kind does not raise the dot either, or the bell
 * would send a member to a list with nothing in it. The kind comes back with the row and is
 * filtered here, for the same reason loadNotifications does not filter in the query.
 */
export async function hasUnread(memberId: string, limit = 50): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb
    .from("notifications")
    .select("id,kind")
    .eq("recipient_member_id", memberId)
    .is("read_at", null)
    // Newest first, like the list, so the dot and the list read the same window: the kind cannot be
    // filtered in the query (see above), and an unordered page of 50 could hold only suppressed rows
    // while the list's own newest 50 holds one that renders.
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).some((r) => isRenderedKind(r.kind));
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
