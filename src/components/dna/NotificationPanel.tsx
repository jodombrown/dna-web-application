// The bell and its list (ruling 82, SPEC section 6). Dot only when a real unread row the list would
// render exists (ruling 547). The
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
import {
  NotificationListItem,
  type NotificationKind,
} from "@/components/strand/NotificationListItem";
import { Sheet } from "@/components/strand/Sheet";
import type { Member } from "@/lib/auth";
import { hasUnread, loadNotifications, markRead } from "@/lib/notifications";
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
    queryFn: () => hasUnread(member.id),
    refetchInterval: 60_000,
  });
  const list = useQuery({
    queryKey: ["notifications", member.id],
    queryFn: () => loadNotifications(member.id),
    enabled: open,
  });
  /**
   * Ruling 462: a row marks read on open and then goes where its line says it goes. Ruling 547
   * leaves the registry holding only the kinds that have somewhere to go — connection_accepted opens
   * the other member's profile, connection_request opens My Network's Requests — so every row this
   * list renders has a destination and this function has no silent branch. The three kinds whose
   * object has no route yet are suppressed upstream in loadNotifications and never reach here
   * (Convene is Brief 6, Collaborate and Contribute follow). Grounded-or-empty applies to a route as
   * much as to a count.
   */
  const go = (n: {
    kind: string;
    actorHandle?: string | undefined;
    eventId?: string | undefined;
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
    }
  };
  const onRow = async (
    id: string,
    read: boolean,
    n: { kind: string; actorHandle?: string | undefined; eventId?: string | undefined },
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
            kind={n.kind as NotificationKind}
            actor={n.actor}
            object={n.object}
            detail={n.detail}
            time={timeLabel(n.created_at)}
            unread={n.read_at === null}
            onClick={() => void onRow(n.id, n.read_at !== null, n)}
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
        <div data-testid="notifications-empty">
          {/* B17 item 4: the same EmptyState component as every other empty state. */}
          <EmptyState
            c="brand"
            title="Nothing yet."
            body="When a member accepts your connection request, attests a contribution, approves your Space role, or an event you joined is near, it appears here."
            style={{ margin: "12px 16px" }}
          />
        </div>
      )}
    </div>
  );
  return (
    <>
      <NotificationBell unread={unread.data === true} active={open} onClick={toggle} />
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
        // Ruling 492: 80 percent tall on compact, a 40 percent side sheet on medium. A full-width
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
