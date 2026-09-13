// Design pass 01, B17 (rulings 462, 480, 490). Two changes on the B2-Shell-Feed row:
// 1. Every row names its destination in words, so the member can read where the tap goes before
//    taking it (490). DESTINATION is the closed map; the row is a link in behaviour and the
//    destination line is part of its accessible name.
// 2. The unread dot carries a hidden "Unread" label in a --target-min hit area (480). The dot is
//    still 8px; what grew is the box around it, which is inside a row that is itself the target.
import { useState, type CSSProperties, type ReactNode } from "react";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

export type NotificationKind =
  | "connection_accepted"
  | "connection_request"
  | "attestation_received"
  | "space_role_approved"
  | "event_reminder";

/** Which engine wrote the row: its C glyph marks the row (ruling 66). */
export const KIND_C: Record<NotificationKind, C> = {
  connection_accepted: "connect",
  connection_request: "connect",
  attestation_received: "contribute",
  space_role_approved: "collaborate",
  event_reminder: "convene",
};

/**
 * Ruling 490: a notification row names its destination in words. Four of these are the handoff's
 * own strings (B17 item 1); event_reminder's is written to the same shape, because the handoff
 * lists destinations for the four kinds it names and this kind also has one.
 */
export const DESTINATION: Record<NotificationKind, string> = {
  connection_accepted: "Opens their profile",
  connection_request: "Opens My Network, Requests",
  attestation_received: "Opens the contribution",
  space_role_approved: "Opens the Space",
  event_reminder: "Opens the event",
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
      // Ruling 461: the intro wording left with the composer's Connect verb (417).
      return [[actor ?? "", 1], " accepted your connection request."];
    case "connection_request":
      return [[actor ?? "", 1], " wants to connect."];
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
      data-destination={DESTINATION[kind]}
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
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-3)",
            lineHeight: 1.4,
          }}
        >
          {/* Ruling 490: the destination, in words, before the tap. */}
          <span data-destination-line>{DESTINATION[kind]}</span>
          {time && (
            <>
              <span aria-hidden="true">·</span>
              <span>{time}</span>
            </>
          )}
        </span>
      </span>
      {unread && (
        // Ruling 480: a hidden label and a --target-min hit area. The dot itself stays 8px.
        <span
          role="img"
          aria-label="Unread"
          data-unread-dot
          style={{
            width: "var(--target-min)",
            height: "var(--target-min)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            marginTop: 2,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--pulse-for-you)",
            }}
          />
        </span>
      )}
    </button>
  );
}
