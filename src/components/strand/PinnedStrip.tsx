// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4; ruling 1371, one pinned
// message a thread), ported from the prototype's `pinStrip` in `threadNode()`: a full-width button
// under the thread header, the caps word `Pinned`, then `{first name}: {text}` on one line, that
// scrolls the log to the message. Absent when nothing is pinned: the caller renders nothing.
import type { CSSProperties } from "react";

export type PinnedStripProps = {
  /** `You` or the author's first name; the caller decides (1317). */
  from: string;
  text: string;
  onOpen?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function PinnedStrip({ from, text, onOpen, style }: PinnedStripProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-pinned-strip
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        minHeight: "var(--target-primary)",
        padding: "0 var(--space-4)",
        width: "100%",
        background: "var(--bg-sunken)",
        borderBottom: "1px solid var(--line)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          lineHeight: "var(--text-xs-lh)",
          letterSpacing: "var(--tracking-caps)",
          textTransform: "uppercase",
          fontWeight: "var(--weight-medium)" as unknown as number,
          color: "var(--ink-3)",
          flex: "none",
        }}
      >
        Pinned
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: "var(--text-xs)",
          lineHeight: "var(--text-xs-lh)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {from}: {text}
      </span>
    </button>
  );
}
