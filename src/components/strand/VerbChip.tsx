// Ported from Strand components/dna/VerbChip.jsx. Behavior unchanged.
import { useState, type CSSProperties } from "react";
import { CBadge } from "./CBadge";
import { C_LABEL, type C } from "./cmeta";

export const VERB_ACT: Record<C, string> = {
  connect: "Make an Intro",
  convene: "Host an Event",
  collaborate: "Start a Space",
  contribute: "Post a Need",
  convey: "Share a Story",
};

export type VerbChipProps = {
  c: C;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
  compact?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Composer verb override (ruling 53). Always visible, never the required first step. Selected = tint fill, 1.5px C border. 44px tall. */
export function VerbChip({ c, selected, onClick, compact, style }: VerbChipProps) {
  const [hover, setHover] = useState(false);
  const color = "var(--c-" + c + ")";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      aria-label={VERB_ACT[c] + " (" + C_LABEL[c] + ")"}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 44,
        padding: compact ? "0 12px 0 8px" : "0 14px 0 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1,
        color: selected ? color : "var(--ink)",
        background: selected
          ? "var(--c-" + c + "-tint)"
          : hover
            ? "var(--bg-sunken)"
            : "transparent",
        border: selected ? "1.5px solid " + color : "1px solid var(--line)",
        transition:
          "background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
        ...style,
      }}
    >
      <CBadge c={c} size={28} />
      <span>{VERB_ACT[c]}</span>
    </button>
  );
}
