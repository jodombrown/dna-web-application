// Strand components/dna/LensBar.jsx (B2-Shell-Feed-v2): segmented All plus icon lenses with an
// italic scope line beneath (ruling 81). One filter component for every surface (ruling 83); the
// selected lens lives in the host's URL, never here.
import { useState, type CSSProperties } from "react";
import { Icon } from "./Icon";

export type Lens<Id extends string = string> = {
  id: Id;
  label: string;
  /** Icon name from assets/icons. The first lens (All) is text-only and needs none. */
  icon?: string | undefined;
  /** Italic scope line shown beneath the row while this lens is selected. */
  scope: string;
};

export type LensBarProps<Id extends string = string> = {
  lenses: Lens<Id>[];
  value: Id;
  onChange?: ((id: Id) => void) | undefined;
  /** Compact tier: icon lenses drop their label (the label stays as the accessible name). */
  compact?: boolean | undefined;
  label?: string;
  style?: CSSProperties | undefined;
};

function LensButton<Id extends string>({
  lens,
  on,
  compact,
  onClick,
}: {
  lens: Lens<Id>;
  on: boolean;
  compact: boolean | undefined;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const iconOnly = !!lens.icon && !!compact;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={lens.label}
      title={iconOnly ? lens.label : undefined}
      data-lens={lens.id}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 40,
        minWidth: 44,
        padding: iconOnly ? "0 12px" : lens.icon ? "0 14px 0 12px" : "0 16px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1,
        color: on ? "var(--on-fill)" : "var(--ink)",
        background: on ? "var(--ink)" : hover ? "var(--bg-sunken)" : "transparent",
        border: on ? "1px solid var(--ink)" : "1px solid var(--line)",
        transition:
          "background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
      }}
    >
      {lens.icon && <Icon name={lens.icon} size={18} />}
      {!iconOnly && <span>{lens.label}</span>}
    </button>
  );
}

/** Lens row: `role="radiogroup"`, ink fill for the selected lens (a lens is never a C color). */
export function LensBar<Id extends string = string>({
  lenses,
  value,
  onChange,
  compact,
  label = "Lens",
  style,
}: LensBarProps<Id>) {
  const current = lenses.find((l) => l.id === value) ?? lenses[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <div
        role="radiogroup"
        aria-label={label}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "2px 0",
          margin: "-2px 0",
        }}
      >
        {lenses.map((l) => (
          <LensButton
            key={l.id}
            lens={l}
            on={l.id === value}
            compact={compact}
            onClick={() => onChange && onChange(l.id)}
          />
        ))}
      </div>
      {current && (
        <div
          data-lens-scope
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            lineHeight: 1.4,
            fontStyle: "italic",
            color: "var(--ink-3)",
            paddingLeft: 4,
          }}
        >
          {current.scope}
        </div>
      )}
    </div>
  );
}
