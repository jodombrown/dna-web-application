// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.4 and 5.4; rulings 1335, 1341),
// ported from the prototype's `requestCard()`: the sender's avatar, name, `{headline} · {stance}`,
// the one message with every URL rendered as plain text (1335: a link in a request is words), then
// the trust context by name, `Knows A and B. In X with you.`, and the acts: Accept (Connect's
// colour), Decline and Block pending; one act, Recover, once declined. Names up to three then
// `and others` (1317), joined by the caller through src/lib/names.ts.
import type { CSSProperties } from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

export type RequestCardProps = {
  name: string;
  src?: string | undefined;
  headline?: string | null | undefined;
  stance?: string | null | undefined;
  text: string;
  /** Already joined in words: "Kofi Boateng and Nana Adjei". Empty renders no sentence. */
  mutuals?: string | undefined;
  /** Already joined in words: "Accra returnees". Empty renders no sentence. */
  shared?: string | undefined;
  declined?: boolean | undefined;
  onAccept?: (() => void) | undefined;
  onDecline?: (() => void) | undefined;
  onBlock?: (() => void) | undefined;
  onRecover?: (() => void) | undefined;
  /** The acts are inert while a write is in flight. */
  busy?: boolean | undefined;
  style?: CSSProperties | undefined;
};

export function RequestCard({
  name,
  src,
  headline,
  stance,
  text,
  mutuals,
  shared,
  declined = false,
  onAccept,
  onDecline,
  onBlock,
  onRecover,
  busy = false,
  style,
}: RequestCardProps) {
  const sub = [headline, stance].filter(Boolean).join(" · ");
  const ctx = [mutuals ? "Knows " + mutuals : null, shared ? "In " + shared + " with you" : null]
    .filter(Boolean)
    .join(". ");
  return (
    <div
      data-request-card
      data-declined={declined ? "1" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        borderRadius: "var(--radius-l)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <Avatar name={name} src={src} size={44} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: "var(--text-s)",
              fontWeight: "var(--weight-bold)" as unknown as number,
              lineHeight: 1.3,
            }}
          >
            {name}
          </span>
          {sub && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", lineHeight: 1.3 }}>
              {sub}
            </span>
          )}
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "var(--text-s)",
          lineHeight: "var(--text-s-lh)",
          textWrap: "pretty",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </p>
      {ctx && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            lineHeight: "var(--text-xs-lh)",
            color: "var(--ink-3)",
            textWrap: "pretty",
          }}
        >
          {ctx}.
        </p>
      )}
      {declined ? (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button variant="secondary" size="sm" disabled={busy} onClick={onRecover}>
            Recover
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <Button c="connect" size="sm" disabled={busy} onClick={onAccept}>
            Accept
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={onDecline}>
            Decline
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onBlock}>
            Block
          </Button>
        </div>
      )}
    </div>
  );
}
