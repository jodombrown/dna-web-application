// The bell and its list (ruling 82, SPEC section 6). Dot only when a real unread row exists. The
// list has no route: compact and medium get a full panel under the status bar; expanded gets a
// 380 popover with an invisible full-frame close button behind it. Esc closes. Opening a row marks
// it read. Empty is the launch state.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/strand/EmptyState";
import { IconButton } from "@/components/strand/IconButton";
import { NotificationBell } from "@/components/strand/NotificationBell";
import { NotificationListItem } from "@/components/strand/NotificationListItem";
import type { Member } from "@/lib/auth";
import { hasUnread, loadNotifications, markRead } from "@/lib/notifications";
import type { Tier } from "@/lib/tier";
import { timeLabel } from "@/lib/when";
import { POPOVER_STYLE } from "./AppShell";

export function NotificationPanel({
  member,
  tier,
  onOpen,
  closeKey,
}: {
  member: Member;
  tier: Tier;
  onOpen?: (() => void) | undefined;
  /** Changes when the route changes or the composer opens; the list closes (prototype behaviour). */
  closeKey?: string | undefined;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [closeKey]);
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
  const onRow = async (id: string, read: boolean) => {
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
  return (
    <>
      <NotificationBell unread={unread.data === true} active={open} onClick={toggle} />
      {open && (
        <>
          {pointer && (
            <button
              type="button"
              aria-label="Close notifications"
              onClick={toggle}
              style={{ all: "unset", position: "fixed", inset: 0, zIndex: 40, cursor: "default" }}
            />
          )}
          <div
            role="dialog"
            aria-label="Notifications"
            style={
              pointer
                ? POPOVER_STYLE
                : {
                    position: "fixed",
                    inset: 0,
                    paddingTop: "env(safe-area-inset-top)",
                    zIndex: 50,
                    background: "var(--bg)",
                    display: "flex",
                    flexDirection: "column",
                    boxSizing: "border-box",
                    animation: "strand-slide var(--dur-base) var(--ease)",
                  }
            }
          >
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
              <span style={{ flex: 1, fontSize: 17, fontWeight: 500 }}>Notifications</span>
              <IconButton name="x" label="Close" onClick={toggle} />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 0 24px" }}>
              {list.data && list.data.length > 0 ? (
                list.data.map((n) => (
                  <NotificationListItem
                    key={n.id}
                    kind={n.kind}
                    actor={n.actor}
                    object={n.object}
                    detail={n.detail}
                    time={timeLabel(n.created_at)}
                    unread={n.read_at === null}
                    onClick={() => void onRow(n.id, n.read_at !== null)}
                  />
                ))
              ) : list.isPending ? (
                <p role="status" style={{ margin: 0, padding: "16px", color: "var(--ink-3)" }}>
                  Loading
                </p>
              ) : (
                <div data-testid="notifications-empty">
                  <EmptyState
                    c="brand"
                    title="Nothing yet."
                    body="When a member accepts your intro, attests a contribution, approves your Space role, or an event you joined is near, it appears here."
                    style={{ margin: "12px 16px" }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
