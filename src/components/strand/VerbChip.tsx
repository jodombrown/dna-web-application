// Ported from Strand components/dna/VerbChip.jsx. Behavior unchanged. Re-synced at compile
// v1789537371639386 (Convene Pass 1, correction 7 and ruling 672): `disabled` and `reason`.
import { useState, type CSSProperties } from "react";
import { CBadge } from "./CBadge";
import { C_LABEL, type ComposerVerb } from "./cmeta";

export const VERB_ACT: Record<ComposerVerb, string> = {
  convene: "Host an Event",
  collaborate: "Start a Space",
  contribute: "Post a Need",
  convey: "Share a Story",
};

export type VerbChipProps = {
  c: ComposerVerb;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
  compact?: boolean | undefined;
  /** Correction 7 (ruling 53, inside an event): the chip stays in the row, not selectable. */
  disabled?: boolean | undefined;
  /** The reason it is disabled, carried as aria-description and the pointer title. */
  reason?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Composer verb override (ruling 53). Always visible, never the required first step. Selected = tint fill, 1.5px C border. 44px tall.
 *  disabled + reason (53, inside an event): the chip stays in the row at Button's disabled opacity (0.45), aria-disabled, and carries
 *  the reason as its title and aria-description. It never leaves the DOM. */
export function VerbChip({
  c,
  selected,
  onClick,
  compact,
  disabled,
  reason,
  style,
}: VerbChipProps) {
  const [hover, setHover] = useState(false);
  const color = "var(--c-" + c + ")";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!selected}
      aria-disabled={disabled || undefined}
      aria-description={disabled ? reason : undefined}
      title={disabled ? reason : undefined}
      aria-label={VERB_ACT[c] + " (" + C_LABEL[c] + ")"}
      data-verb={c}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
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
          : hover && !disabled
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
