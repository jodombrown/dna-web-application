// Ported from Strand components/core/Segment.jsx at compile v1789537371639386 (ruling 673, Convene
// Pass 1). The 44px pill radiogroup, extracted from the Composer's VERB_SCHEMA segment fields,
// which were its first caller; renders identically. Not SegmentBlock: that is the Profile's stance
// block (ruling 122), a different part with a similar name.
// Selected = --ink fill, --on-fill text; rest = 1px --line border, transparent. Disabled follows
// Button (0.45, aria-disabled, not-allowed); no tokens added. Options are strings or
// { value, label }. Nothing caller-specific: the caller owns labels, copy and what the choice means.
import type { CSSProperties } from "react";

export type SegmentOption = string | { value: string; label: string };

export type SegmentProps = {
  options?: SegmentOption[] | undefined;
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  /** The radiogroup's accessible name. */
  label?: string | undefined;
  disabled?: boolean | undefined;
  style?: CSSProperties | undefined;
};

export function Segment({ options = [], value, onChange, label, disabled, style }: SegmentProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      style={{ display: "flex", gap: 8, flexWrap: "wrap", opacity: disabled ? 0.45 : 1, ...style }}
    >
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lab = typeof o === "string" ? o : o.label;
        const on = value === val;
        return (
          <button
            key={val}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : () => onChange && onChange(val)}
            style={{
              all: "unset",
              boxSizing: "border-box",
              cursor: disabled ? "not-allowed" : "pointer",
              height: 44,
              padding: "0 16px",
              borderRadius: 999,
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 500,
              color: on ? "var(--on-fill)" : "var(--ink)",
              background: on ? "var(--ink)" : "transparent",
              border: "1px solid " + (on ? "var(--ink)" : "var(--line)"),
            }}
          >
            {lab}
          </button>
        );
      })}
    </div>
  );
}
