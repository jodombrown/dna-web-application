// The bell and its list (ruling 82). Dot only when a real unread row exists; the list is real rows
// with an honest empty state. Opening a row marks it read. Compact: bottom sheet; wider: drawer.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IconButton } from "@/components/strand/IconButton";
import { NotificationBell } from "@/components/strand/NotificationBell";
import { NotificationListItem } from "@/components/strand/NotificationListItem";
import { Sheet } from "@/components/strand/Sheet";
import type { Member } from "@/lib/auth";
import { timeAgo } from "@/lib/feed";
import { hasUnread, loadNotifications, markRead } from "@/lib/notifications";
import type { Tier } from "@/lib/tier";

export function NotificationPanel({ member, tier }: { member: Member; tier: Tier }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
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
  const compact = tier === "compact";
  return (
    <>
      <NotificationBell unread={unread.data === true} open={open} onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant={compact ? "sheet" : "drawer"}
        width={420}
        label="Notifications"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: compact ? "0 8px 8px 20px" : "8px 8px 8px 20px",
            borderBottom: "1px solid var(--line)",
            flex: "none",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.2,
            }}
          >
            Notifications
          </h2>
          <span style={{ flex: 1 }} />
          <IconButton name="x" label="Close" onClick={() => setOpen(false)} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 8px 16px" }}>
          {list.data && list.data.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {list.data.map((n) => (
                <NotificationListItem
                  key={n.id}
                  kind={n.kind}
                  meta={timeAgo(n.created_at)}
                  unread={n.read_at === null}
                  onClick={() => void onRow(n.id, n.read_at !== null)}
                />
              ))}
            </ul>
          ) : list.isPending ? (
            <p role="status" style={{ margin: 0, padding: "16px 12px", color: "var(--ink-3)" }}>
              Loading
            </p>
          ) : (
            <p
              data-testid="notifications-empty"
              style={{
                margin: 0,
                padding: "24px 12px",
                fontSize: 15,
                lineHeight: 1.45,
                color: "var(--ink-3)",
              }}
            >
              Nothing yet. When a connection is accepted, a Space role is approved, an attestation
              lands, or an event is near, it appears here.
            </p>
          )}
        </div>
      </Sheet>
    </>
  );
}
