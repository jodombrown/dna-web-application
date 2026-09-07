// Ported from Strand components/dna/NotificationBell.jsx (B2-Shell-Feed-v2). Behavior unchanged.
import type { CSSProperties } from "react";
import { IconButton } from "./IconButton";

export type NotificationBellProps = {
  unread: boolean;
  active?: boolean | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** Bell with a dot, never a numeral (ruling 82). unread=false renders no dot: no row, no dot. */
export function NotificationBell({ unread, active, onClick, style }: NotificationBellProps) {
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "none", ...style }}>
      <IconButton
        name="bell"
        label={unread ? "Notifications, unread" : "Notifications"}
        active={active}
        aria-expanded={!!active}
        onClick={onClick}
        data-testid="bell"
        data-unread={unread ? "1" : undefined}
      />
      {unread && (
        <span
          aria-hidden="true"
          data-testid="bell-dot"
          style={{
            position: "absolute",
            top: 9,
            right: 9,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--pulse-for-you)",
            border: "2px solid var(--bg)",
            boxSizing: "content-box",
            pointerEvents: "none",
            transition: "background var(--dur-base) var(--ease)",
          }}
        />
      )}
    </span>
  );
}
