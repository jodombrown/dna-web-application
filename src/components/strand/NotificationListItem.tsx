// Design pass 01, B17 (rulings 462, 480, 490), on handoff 55-A's vocabulary (1318). Two changes on
// the B2-Shell-Feed row:
// 1. Every row names its destination in words, so the member can read where the tap goes before
//    taking it (490). The words are the kind's `destination` in public.notification_kinds, passed in
//    by the caller; the row is a link in behaviour and the destination line is part of its
//    accessible name.
// 2. The unread dot carries a hidden "Unread" label in a --target-min hit area (480). The dot is
//    still 8px; what grew is the box around it, which is inside a row that is itself the target.
//
// No kind map lives here (1318, N4). The kind's C (ruling 66) and its destination come from the
// vocabulary row through `c` and `destination`; whether a kind renders is the row's `renders` and
// `hasSentence` below together. What stays is the per-kind sentence in `parts()`: that is the Strand
// row part, the words a row of each kind reads, and a kind with no sentence here does not render.
import { useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "./Button";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

type Part = string | [string, 1];

function parts(row: {
  kind: string;
  actor?: string | undefined;
  /** The object's name and its qualifier. The Connect kinds name neither; a kind that reads them
   *  gains its sentence here when its row part ships (G242). */
  object?: string | undefined;
  detail?: string | undefined;
  /** Strand correction 15 (736): the caller's sentence, verbatim, where a kind takes one. */
  text?: string | undefined;
}): Part[] {
  switch (row.kind) {
    case "connection_accepted":
      // Ruling 461: the intro wording left with the composer's Connect verb (417).
      return [[row.actor ?? "", 1], " accepted your connection request."];
    case "connection_request":
      return [[row.actor ?? "", 1], " wants to connect."];
    case "role_invitation":
      // 736: the caller's sentence verbatim; Strand ships no invitation copy. The app composes it
      // as `{actor} invited you to {verb} this event.` with the verb from the event_roles
      // vocabulary (handoff 30-C item 11), and passes it as `text`; `detail` is that verb.
      return row.text
        ? [row.text]
        : [[row.actor ?? "", 1], " invited you to " + (row.detail ?? "") + " this event."];
    default:
      return [""];
  }
}

/**
 * Whether the row part has a sentence for a kind (handoff 55-A). A kind renders only where its
 * vocabulary row says `renders` and this is true, so a kind the database renders before its Strand
 * part ships reads nothing rather than a blank line.
 */
export function hasSentence(kind: string): boolean {
  return parts({ kind }).some((p) => (Array.isArray(p) ? true : p !== ""));
}

export type NotificationListItemProps = {
  kind: string;
  /** The engine whose glyph marks the row (ruling 66), from the kind's vocabulary row or, for a
   *  context-derived kind, the row's own C (1325). Absent, no glyph renders (194). */
  c?: C | undefined;
  /** The kind's destination in words (490), from its vocabulary row. Absent, no line renders. */
  destination?: string | undefined;
  actor?: string | undefined;
  object?: string | undefined;
  detail?: string | undefined;
  /** 736: the sentence verbatim, for a kind whose copy the caller owns (`role_invitation`). */
  text?: string | undefined;
  time?: string | undefined;
  unread?: boolean | undefined;
  onClick?: (() => void) | undefined;
  /** 736: `role_invitation` carries one Respond act beside the row; absent, no act renders. */
  onRespond?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** One notification row (ruling 82). The C glyph marks which engine wrote the row (ruling 66). Unread: dot and 500 weight. */
export function NotificationListItem({
  kind,
  c,
  destination,
  actor,
  object,
  detail,
  text: sentence,
  time,
  unread,
  onClick,
  onRespond,
  style,
}: NotificationListItemProps) {
  const [hover, setHover] = useState(false);
  const text: ReactNode[] = parts({ kind, actor, object, detail, text: sentence }).map((p, i) =>
    Array.isArray(p) ? (
      <b key={i} style={{ fontWeight: 700 }}>
        {p[0]}
      </b>
    ) : (
      p
    ),
  );
  const rowStyle: CSSProperties = {
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
    transition: "background var(--dur-default) var(--ease)",
    ...style,
  };
  const body = (
    <>
      {c && <CBadge c={c} size={32} />}
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
          {destination && <span data-destination-line>{destination}</span>}
          {time && destination && <span aria-hidden="true">·</span>}
          {time && <span>{time}</span>}
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
    </>
  );
  if (kind === "role_invitation" && onRespond) {
    // Correction 15 (736): the row and its act are two controls, so the row is a div and not a
    // button here; the sentence is the row's hit target and Respond is the act, whose accessible
    // name is "Respond" followed by the sentence.
    const plain = parts({ kind, actor, object, detail, text: sentence })
      .map((p) => (Array.isArray(p) ? p[0] : p))
      .join("");
    return (
      <div
        data-kind={kind}
        data-unread={unread ? "1" : undefined}
        data-destination={destination}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ ...rowStyle, cursor: "default", alignItems: "center" }}
      >
        <button
          type="button"
          onClick={onClick}
          style={{
            all: "unset",
            boxSizing: "border-box",
            cursor: "pointer",
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            textAlign: "left",
            color: "inherit",
            fontFamily: "inherit",
          }}
        >
          {body}
        </button>
        <Button
          variant="secondary"
          size="sm"
          c="convene"
          aria-label={"Respond" + (plain ? ": " + plain : "")}
          onClick={onRespond}
          style={{ flex: "none" }}
          data-testid="notification-respond"
        >
          Respond
        </Button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-kind={kind}
      data-unread={unread ? "1" : undefined}
      data-destination={destination}
      style={rowStyle}
    >
      {body}
    </button>
  );
}
