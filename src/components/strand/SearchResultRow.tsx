// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.3 and 5.4; rulings 1338, 1347),
// ported from the prototype's `resultsNode()`: one result, the sender's avatar, the line
// `{thread} · {sender} · {day}, {time}`, then the message text, as a button that opens the thread at
// the message. The text is a node so the caller can render the projection's headline as it marks it.
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "./Avatar";

export type SearchResultRowProps = {
  thread: string;
  from: string;
  src?: string | undefined;
  day: string;
  time: string;
  text: ReactNode;
  onOpen?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function SearchResultRow({
  thread,
  from,
  src,
  day,
  time,
  text,
  onOpen,
  style,
}: SearchResultRowProps) {
  return (
    <button
      type="button"
      role="listitem"
      onClick={onOpen}
      data-search-result
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        minHeight: 56,
        width: "100%",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <Avatar name={from} src={src} size={32} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>
          {thread} · {from} · {day}, {time}
        </span>
        <span
          style={{
            fontSize: "var(--text-s)",
            lineHeight: "var(--text-s-lh)",
            overflowWrap: "anywhere",
          }}
        >
          {text}
        </span>
      </span>
    </button>
  );
}
