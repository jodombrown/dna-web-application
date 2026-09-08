// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 122). Behavior unchanged.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type VocabularyPickerProps = {
  label: string;
  options?: string[];
  value?: string[];
  onChange: (value: string[]) => void;
  max?: number | undefined;
  style?: CSSProperties | undefined;
};

/** Controlled vocabulary: chips toggled from a shared list, never typed. `max` caps selection. */
export function VocabularyPicker({
  label,
  options = [],
  value = [],
  onChange,
  max,
  style,
}: VocabularyPickerProps) {
  const full = !!max && value.length >= max;
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : full ? value : [...value, v]);
  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>
        {label}
        {max ? (
          <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> · up to {max}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = value.includes(o);
          const blocked = !on && full;
          return (
            <button
              key={o}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-disabled={blocked ? true : undefined}
              onClick={() => toggle(o)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: blocked ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 36,
                padding: "0 12px",
                borderRadius: 999,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 500,
                background: on ? "var(--ink)" : "var(--bg-sunken)",
                color: on ? "var(--on-fill)" : blocked ? "var(--ink-4)" : "var(--ink-2)",
                border: "1px solid " + (on ? "var(--ink)" : "transparent"),
                transition: "background var(--dur-fast) var(--ease)",
              }}
            >
              {on && <Icon name="check" size={14} />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
