// Strand components/dna/NotificationListItem.jsx (B2-Shell-Feed-v2). One row of the minimal in-app
// list: the kind's C glyph (KIND_C, five-C ecosystem only, ruling 66), one line of text, time, and
// an unread dot. No counts, no actions beyond opening the row.
import { useState, type CSSProperties } from "react";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

export type NotificationKind =
  "connection_accepted" | "attestation_received" | "space_role_approved" | "event_reminder";

/** Which C each kind belongs to. The glyph on the row is that C's Adinkra badge. */
export const KIND_C: Record<NotificationKind, C> = {
  connection_accepted: "connect",
  attestation_received: "contribute",
  space_role_approved: "collaborate",
  event_reminder: "convene",
};

export const KIND_TEXT: Record<NotificationKind, string> = {
  connection_accepted: "Your connection request was accepted.",
  attestation_received: "You received an attestation.",
  space_role_approved: "Your Space role was approved.",
  event_reminder: "An event you are part of is coming up.",
};

export type NotificationListItemProps = {
  kind: NotificationKind;
  text?: string | undefined;
  meta?: string | undefined;
  unread?: boolean | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function NotificationListItem({
  kind,
  text,
  meta,
  unread,
  onClick,
  style,
}: NotificationListItemProps) {
  const [hover, setHover] = useState(false);
  const c = KIND_C[kind];
  return (
    <li style={{ listStyle: "none", margin: 0 }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        data-kind={kind}
        data-unread={unread ? "1" : undefined}
        style={{
          all: "unset",
          boxSizing: "border-box",
          cursor: onClick ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          minHeight: 64,
          padding: "10px 12px",
          borderRadius: 12,
          background: hover ? "var(--bg-sunken)" : "transparent",
          fontFamily: "var(--font-sans)",
          color: "var(--ink)",
          transition: "background var(--dur-fast) var(--ease)",
          ...style,
        }}
      >
        <CBadge c={c} size={36} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 15,
              lineHeight: 1.4,
              fontWeight: unread ? 700 : 400,
              overflowWrap: "anywhere",
            }}
          >
            {text ?? KIND_TEXT[kind]}
          </span>
          {meta && (
            <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>{meta}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            flex: "none",
            background: unread ? "var(--pulse-for-you)" : "transparent",
          }}
        />
      </button>
    </li>
  );
}
