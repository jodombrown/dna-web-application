// Strand components/dna/NotificationBell.jsx (B2-Shell-Feed-v2). The bell with a plain unread dot,
// never a numeral (ruling 82). The dot renders only when the host says a real unread row exists.
import type { CSSProperties } from "react";
import { IconButton } from "./IconButton";

export type NotificationBellProps = {
  unread: boolean;
  open?: boolean | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function NotificationBell({ unread, open, onClick, style }: NotificationBellProps) {
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}>
      <IconButton
        name="bell"
        label={unread ? "Notifications, unread" : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={!!open}
        active={open}
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
          }}
        />
      )}
    </span>
  );
}
