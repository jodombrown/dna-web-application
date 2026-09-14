// Design pass 01, B17 (rulings 462, 480, 490), with ruling 547's registry. Two changes on the
// B2-Shell-Feed row:
// 1. Every row names its destination in words, so the member can read where the tap goes before
//    taking it (490). DESTINATION is the closed map; the row is a link in behaviour and the
//    destination line is part of its accessible name.
// 2. The unread dot carries a hidden "Unread" label in a --target-min hit area (480). The dot is
//    still 8px; what grew is the box around it, which is inside a row that is itself the target.
import { useState, type CSSProperties, type ReactNode } from "react";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

/**
 * The registry (rulings 462, 490, 547): the notification kinds this app renders, each with the
 * engine whose C glyph marks the row (ruling 66) and the destination its line names in words.
 *
 * Ruling 547: a kind is in the registry only while its destination has a surface. G19's three
 * destination-less kinds are not here — `attestation_received`, `space_role_approved` and
 * `event_reminder` name the contribution, the Space and the event, and none of those objects has a
 * route yet, because Convene is Brief 6 and Collaborate and Contribute follow it. They are
 * suppressed rather than exempted: an exemption list would be a second place where this contract
 * lives and it would outlive the reason it was written. Their ruling 490 words are not reinvented
 * when they come back; they are recorded in docs/GAPS.md under G19.
 *
 * Grounded-or-empty applies directly: a row whose kind is not in this registry cannot go anywhere,
 * so it does not render and it does not raise the bell's dot (src/lib/notifications.ts).
 *
 * This object is the only source for both maps below, so a kind can never carry a glyph without a
 * destination; tests/notifications.cjs is the check that says so in the harness.
 */
export const NOTIFICATION_REGISTRY = {
  connection_accepted: { c: "connect", destination: "Opens their profile" },
  connection_request: { c: "connect", destination: "Opens My Network, Requests" },
} as const satisfies Record<string, { c: C; destination: string }>;

export type NotificationKind = keyof typeof NOTIFICATION_REGISTRY;

/** Whether a `notifications.kind` value from the database is one this app renders (ruling 547). */
export function isRenderedKind(kind: string): kind is NotificationKind {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_REGISTRY, kind);
}

/** Which engine wrote the row: its C glyph marks the row (ruling 66). Derived from the registry. */
export const KIND_C: Record<NotificationKind, C> = Object.fromEntries(
  Object.entries(NOTIFICATION_REGISTRY).map(([kind, row]) => [kind, row.c]),
) as Record<NotificationKind, C>;

/** Ruling 490: a notification row names its destination in words. Derived from the registry. */
export const DESTINATION: Record<NotificationKind, string> = Object.fromEntries(
  Object.entries(NOTIFICATION_REGISTRY).map(([kind, row]) => [kind, row.destination]),
) as Record<NotificationKind, string>;

type Part = string | [string, 1];

function parts(row: {
  kind: NotificationKind;
  actor?: string | undefined;
  /** The object's name and its qualifier. The registry's two kinds name neither; the kinds ruling
   *  547 suppressed read them when their surface ships and they rejoin the registry. */
  object?: string | undefined;
  detail?: string | undefined;
}): Part[] {
  switch (row.kind) {
    case "connection_accepted":
      // Ruling 461: the intro wording left with the composer's Connect verb (417).
      return [[row.actor ?? "", 1], " accepted your connection request."];
    case "connection_request":
      return [[row.actor ?? "", 1], " wants to connect."];
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
