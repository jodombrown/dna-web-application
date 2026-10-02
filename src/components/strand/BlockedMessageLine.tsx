// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4; ruling 1349), ported
// from the prototype's `blockedLine()`: in a group, a message from a member the viewer blocks is one
// collapsed line, `Blocked message`, that expands to `{name}, blocked` over the text in a plain
// bubble and collapses again under `Hide blocked message`. The blocked member sees nothing different;
// the caller renders their own bubble for them. The text arrives only when the caller has it: the
// projection answers null body while collapsed-by-policy, so the caller fetches on expand.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type BlockedMessageLineProps = {
  name: string;
  /** The message, once the caller has it; null renders the frame with no text. */
  text?: string | null | undefined;
  time?: string | undefined;
  expanded: boolean;
  onToggle: () => void;
  style?: CSSProperties | undefined;
};

export function BlockedMessageLine({
  name,
  text,
  time,
  expanded,
  onToggle,
  style,
}: BlockedMessageLineProps) {
  return (
    <div
      data-blocked-line
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 4,
        padding: "2px var(--space-4)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minHeight: "var(--target-primary)",
          fontSize: "var(--text-xs)",
          color: "var(--ink-3)",
          fontFamily: "inherit",
        }}
      >
        <Icon name={expanded ? "chevron-down" : "chevron-right"} size={14} />
        {expanded ? "Hide blocked message" : "Blocked message"}
      </button>
      {expanded && (
        <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-medium)" as unknown as number,
              color: "var(--ink-3)",
              padding: "0 var(--space-1)",
            }}
          >
            {name}, blocked
          </span>
          <div
            style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-l)",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              fontSize: "var(--text-s)",
              lineHeight: "var(--text-s-lh)",
              color: "var(--ink-2)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {text}
          </div>
          {time && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>{time}</span>
          )}
        </div>
      )}
    </div>
  );
}
