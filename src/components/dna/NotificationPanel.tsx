// The bell and its list (ruling 82, SPEC section 6). The dot is notifications_dot(): an unseen row
// of a kind the vocabulary renders (1318, 1322), and opening the list marks every row seen, which
// clears it; each row keeps its unread weight until it is opened (1521). The
// list has no route: pointer keeps the 380 popover under the bell; touch gets the standard Sheet at
// 80 percent, not the full-screen inset B2 built (B17 item 3, ruling 492), so it carries the same
// focus trap and restore as every other sheet (480). Every row is a link that names its destination
// before the tap and marks itself read on open (rulings 462, 490). Empty is the launch state, and
// it is the same EmptyState component as every other empty state (B17 item 4).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/strand/EmptyState";
import { IconButton } from "@/components/strand/IconButton";
import { NotificationBell } from "@/components/strand/NotificationBell";
import { NotificationListItem } from "@/components/strand/NotificationListItem";
import { Sheet } from "@/components/strand/Sheet";
import type { Member } from "@/lib/auth";
import { loadNotifications, markRead, markSeen, notificationsDot } from "@/lib/notifications";
import { loadVocabularies } from "@/lib/vocabularies";
import { useEmptyStateSeen } from "@/lib/record-hooks";
import type { Tier } from "@/lib/tier";
import { timeLabel } from "@/lib/when";
import { POPOVER_STYLE } from "./AppShell";

export function NotificationPanel({
  member,
  tier,
  onOpen,
  onChange,
  closeKey,
}: {
  member: Member;
  tier: Tier;
  onOpen?: (() => void) | undefined;
  /** Mirrors the list's open state to the shell (the floating composer entry hides while open). */
  onChange?: ((open: boolean) => void) | undefined;
  /** Changes when the route changes or the composer opens; the list closes (prototype behaviour). */
  closeKey?: string | undefined;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [closeKey]);
  useEffect(() => {
    onChange?.(open);
  }, [open, onChange]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const unread = useQuery({
    queryKey: ["unread", member.id],
    queryFn: notificationsDot,
    refetchInterval: 60_000,
  });
  // 1318, 194: the kind vocabulary is what the list renders by. While it has not loaded, or when it
  // fails, the list is empty and the bell shows no dot, so the dot never points at an empty list.
  const vocab = useQuery({ queryKey: ["vocabularies"], queryFn: loadVocabularies });
  const kindsLoaded = (vocab.data?.notification_kinds?.length ?? 0) > 0;
  // 1322, 1521: opening the list marks the member's rows seen and the dot is read again.
  useEffect(() => {
    if (!open) return;
    void markSeen()
      .catch(() => undefined)
      .then(() => qc.invalidateQueries({ queryKey: ["unread", member.id] }));
  }, [open, qc, member.id]);
  const list = useQuery({
    queryKey: ["notifications", member.id],
    queryFn: () => loadNotifications(member.id),
    enabled: open,
  });
  // 12C part 2: the panel's empty state, once per appearance (it closes and reopens as new ones).
  useEmptyStateSeen("notifications.none", open && list.isSuccess && list.data.length === 0);
  /**
   * Ruling 462: a row marks read on open and then goes where its line says it goes. The vocabulary
   * renders only the kinds that have somewhere to go (1318) — connection_accepted opens the other
   * member's profile, connection_request opens My Network, whose first section is Requests (1482),
   * role_invitation opens the event — so every row this list renders has a destination. A kind
   * whose object has no route keeps renders false and never reaches here. Grounded-or-empty applies
   * to a route as much as to a count.
   */
  const go = (n: {
    kind: string;
    actorHandle?: string | undefined;
    eventId?: string | undefined;
    objectId?: string | undefined;
  }) => {
    if (n.kind === "connection_accepted" && n.actorHandle) {
      setOpen(false);
      void navigate({ to: "/m/$handle", params: { handle: n.actorHandle }, search: {} });
      return;
    }
    if (n.kind === "connection_request") {
      setOpen(false);
      void navigate({ to: "/$c", params: { c: "connect" }, search: { lens: "network" } });
      return;
    }
    // Brief 10 (736, 1027): the invitation opens the event page, where the same notice renders at
    // the top with its Respond act into the accept-or-decline sheet (B10-SPEC 3.1).
    if (n.kind === "role_invitation" && n.eventId) {
      setOpen(false);
      void navigate({ to: "/convene/events/$id", params: { id: n.eventId } });
      return;
    }
    // Fix PR 10 item 8 (1623): the invitation opens the group, where Accept and Decline sit.
    if (n.kind === "thread_invitation" && n.objectId) {
      setOpen(false);
      void navigate({ to: "/messages/$thread", params: { thread: n.objectId } });
    }
  };
  const onRow = async (
    id: string,
    read: boolean,
    n: {
      kind: string;
      actorHandle?: string | undefined;
      eventId?: string | undefined;
      objectId?: string | undefined;
    },
  ) => {
    go(n);
    if (read) return;
    await markRead(id);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["notifications", member.id] }),
      qc.invalidateQueries({ queryKey: ["unread", member.id] }),
    ]);
  };
  const toggle = () => {
    setOpen((v) => {
      if (!v) onOpen?.();
      return !v;
    });
  };
  const pointer = tier === "expanded";
  const head = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        height: 56,
        padding: "0 8px 0 16px",
        borderBottom: "1px solid var(--line)",
        flex: "none",
      }}
    >
      <h2 data-sheet-heading style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 500 }}>
        Notifications
      </h2>
      <IconButton name="x" label="Close" onClick={() => setOpen(false)} />
    </div>
  );
  const rows: ReactNode = (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0 24px" }}>
      {list.data && list.data.length > 0 ? (
        list.data.map((n) => (
          <NotificationListItem
            key={n.id}
            kind={n.kind}
            c={n.c}
            destination={n.destination}
            actor={n.actor}
            object={n.object}
            detail={n.detail}
            text={n.text}
            time={timeLabel(n.created_at)}
            unread={n.read_at === null}
            onClick={() =>
              void onRow(n.id, n.read_at !== null, { ...n, objectId: n.object_id ?? undefined })
            }
            onRespond={
              n.kind === "role_invitation"
                ? () => void onRow(n.id, n.read_at !== null, n)
                : undefined
            }
          />
        ))
      ) : list.isPending ? (
        <p role="status" style={{ margin: 0, padding: "16px", color: "var(--ink-3)" }}>
          Loading
        </p>
      ) : (
        <div
          data-testid="notifications-empty"
          // 1147 (handoff 33-D item 3): the list is the column. Where the panel bounds it (the
          // Sheet), the empty state fills it; the pointer popover sizes to its content. No inset.
          style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}
        >
          {/* B17 item 4: the same EmptyState component as every other empty state. */}
          <EmptyState
            c="brand"
            title="Nothing yet."
            body="When a member accepts your connection request, attests a contribution, approves your Space role, or an event you joined is near, it appears here."
          />
        </div>
      )}
    </div>
  );
  return (
    <>
      <NotificationBell
        unread={unread.data === true && kindsLoaded}
        active={open}
        onClick={toggle}
      />
      {/* Pointer keeps B2's 380 popover under the bell. Touch takes the standard Sheet at 80
          percent, not the full-screen inset B2 built (B17 item 3, rulings 492, 480). */}
      {pointer ? (
        open && (
          <>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={toggle}
              style={{ all: "unset", position: "fixed", inset: 0, zIndex: 40, cursor: "default" }}
            />
            <div role="dialog" aria-label="Notifications" style={POPOVER_STYLE}>
              {head}
              {rows}
            </div>
          </>
        )
      ) : (
        // Ruling 492: 80 percent tall on compact, a side sheet of --sheet-expanded-width on medium and expanded (1219, 1220). A full-width
        // bottom sheet at 820 is the tablet full screen the ruling forbids.
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          variant={tier === "compact" ? "sheet" : "drawer"}
          label="Notifications"
        >
          {head}
          {rows}
        </Sheet>
      )}
    </>
  );
}
