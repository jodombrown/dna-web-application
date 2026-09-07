// Ported from Strand components/dna/NotificationListItem.jsx (B2-Shell-Feed-v2). Behavior unchanged.
import { useState, type CSSProperties, type ReactNode } from "react";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

export type NotificationKind =
  "connection_accepted" | "attestation_received" | "space_role_approved" | "event_reminder";

/** Which engine wrote the row: its C glyph marks the row (ruling 66). */
export const KIND_C: Record<NotificationKind, C> = {
  connection_accepted: "connect",
  attestation_received: "contribute",
  space_role_approved: "collaborate",
  event_reminder: "convene",
};

type Part = string | [string, 1];

function parts({
  kind,
  actor,
  object,
  detail,
}: {
  kind: NotificationKind;
  actor?: string | undefined;
  object?: string | undefined;
  detail?: string | undefined;
}): Part[] {
  switch (kind) {
    case "connection_accepted":
      return [[actor ?? "", 1], " accepted your intro."];
    case "attestation_received":
      return [[actor ?? "", 1], " attested your contribution to ", [object ?? "", 1], "."];
    case "space_role_approved":
      return ["You are now ", detail ?? "", " in ", [object ?? "", 1], "."];
    case "event_reminder":
      return [[object ?? "", 1], " starts ", detail ?? "", "."];
    default:
      return [""];
  }
}

export type NotificationListItemProps = {
  kind: NotificationKind;
  actor?: string | undefined;
  object?: string | undefined;
  detail?: string | undefined;
  time?: string | undefined;
  unread?: boolean | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** One notification row (ruling 82). kind is the closed set; the C glyph marks which engine wrote the row (ruling 66). Unread: dot and 500 weight. */
export function NotificationListItem({
  kind,
  actor,
  object,
  detail,
  time,
  unread,
  onClick,
  style,
}: NotificationListItemProps) {
  const [hover, setHover] = useState(false);
  const text: ReactNode[] = parts({ kind, actor, object, detail }).map((p, i) =>
    Array.isArray(p) ? (
      <b key={i} style={{ fontWeight: 700 }}>
        {p[0]}
      </b>
    ) : (
      p
    ),
  );
  return (
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
        cursor: "pointer",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        minHeight: 56,
        background: hover ? "var(--bg-sunken)" : "transparent",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        textAlign: "left",
        transition: "background var(--dur-fast) var(--ease)",
        ...style,
      }}
    >
      <CBadge c={KIND_C[kind] || "connect"} size={32} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: 15,
            lineHeight: 1.4,
            fontWeight: unread ? 500 : 400,
            textWrap: "pretty",
          }}
        >
          {text}
        </span>
        {time && (
          <span style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.4 }}>{time}</span>
        )}
      </span>
      {unread && (
        <span
          aria-label="Unread"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--pulse-for-you)",
            flex: "none",
            marginTop: 8,
          }}
        />
      )}
    </button>
  );
}
