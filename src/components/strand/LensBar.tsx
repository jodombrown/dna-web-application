// Ported from Strand components/dna/LensBar.jsx (B2-Shell-Feed-v2). Behavior unchanged.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type Lens<Id extends string = string> = {
  id: Id;
  label: string;
  /** Icon lenses render icon-only; the label stays the accessible name and title. */
  icon?: string | undefined;
};

export type LensBarProps<Id extends string = string> = {
  lenses: Lens<Id>[];
  value: Id;
  onChange?: ((id: Id) => void) | undefined;
  /** The italic line beneath: what the selected lens shows. */
  scope?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Lens Bar: switches corpus on any list surface (rule 5). Segmented pill. Brief 2 adds icon lenses (icon-only, labelled for assistive tech)
 *  and `scope`, the italic line beneath that says what the selected lens shows (rulings 81, 83). Filters remain a separate control (Chip). */
export function LensBar<Id extends string = string>({
  lenses,
  value,
  onChange,
  scope,
  style,
}: LensBarProps<Id>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontFamily: "var(--font-sans)",
        maxWidth: "100%",
        ...style,
      }}
    >
      <div
        role="tablist"
        aria-label="Lens"
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          gap: 2,
          padding: 3,
          background: "var(--bg-sunken)",
          borderRadius: 999,
          border: "1px solid var(--line)",
          maxWidth: "100%",
          overflowX: "auto",
          boxSizing: "border-box",
        }}
      >
        {lenses.map((l) => {
          const on = l.id === value;
          return (
            <button
              key={l.id}
              role="tab"
              aria-selected={on}
              aria-label={l.icon ? l.label : undefined}
              title={l.icon ? l.label : undefined}
              type="button"
              data-lens={l.id}
              onClick={() => onChange && onChange(l.id)}
              style={{
                all: "unset",
                cursor: "pointer",
                minHeight: 38,
                minWidth: l.icon ? 44 : undefined,
                padding: l.icon ? 0 : "0 16px",
                borderRadius: 999,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 500,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: on ? "var(--surface)" : "transparent",
                color: on ? "var(--ink)" : "var(--ink-3)",
                boxShadow: on ? "0 1px 2px rgba(26,26,24,0.08)" : "none",
                transition: "background var(--dur-fast) var(--ease)",
              }}
            >
              {l.icon ? <Icon name={l.icon} size={20} /> : l.label}
            </button>
          );
        })}
      </div>
      {scope && (
        <div
          aria-live="polite"
          data-lens-scope
          style={{
            fontSize: 13,
            fontStyle: "italic",
            lineHeight: 1.4,
            color: "var(--ink-3)",
            padding: "0 4px",
          }}
        >
          {scope}
        </div>
      )}
    </div>
  );
}
