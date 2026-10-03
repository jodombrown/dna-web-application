// Strand `components/core/Tabs.jsx` at compile v1790885781186000 (the compile the admin Settings
// prototype loads, extraction 45-12S §7; handoff 45-D). Behavior unchanged; the part was in the
// compile and not in the tree until Settings bound it. Dispositions are in
// docs/strand-ports/v1790885781186000.md section 8.
import type { CSSProperties } from "react";
import type { C } from "./cmeta";

export type TabsItem = { id: string; label: string };

export type TabsProps = {
  items?: TabsItem[] | undefined;
  value?: string | undefined;
  onChange?: ((id: string) => void) | undefined;
  c?: C | undefined;
  style?: CSSProperties | undefined;
};

/** Underline tabs for sections within one page. items: [{id,label}] */
export function Tabs({ items = [], value, onChange, c, style }: TabsProps) {
  const color = c ? "var(--c-" + c + ")" : "var(--ink)";
  const text = c ? "var(--c-" + c + "-text)" : "var(--ink)";
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid var(--line)",
        overflowX: "auto",
        ...style,
      }}
    >
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange && onChange(it.id)}
            style={{
              all: "unset",
              cursor: "pointer",
              minHeight: 44,
              padding: "0 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 500,
              color: on ? text : "var(--ink-3)",
              boxShadow: on ? "inset 0 -2px 0 " + color : "none",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
