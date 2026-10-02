// Strand `components/admin/BarList.jsx` at compile v1790885781186000 (proposals 40, rulings 1306
// and 1308, ratified 1309; handoff 40-D item 1). Behavior unchanged. Dispositions are in
// docs/strand-ports/v1790885781186000.md.
import type { CSSProperties } from "react";

export type BarListRow = {
  id?: string | undefined;
  label: string;
  /** The count. null renders `note` in place of a bar (a source not yet connected). */
  value: number | null;
  /** Scale for this row's bar; default the largest value (or threshold) in the list. */
  max?: number | undefined;
  /** A tick on the track at this value, in --ink-3. Say what it means in a line beside the list. */
  threshold?: number | undefined;
  /** Text in place of the count when value is null. Default "Not yet connected". */
  note?: string | undefined;
};

export type BarListProps = {
  rows: BarListRow[];
  /** Writes the count. Default toLocaleString. */
  format?: ((value: number, row: BarListRow) => string) | undefined;
  /** Track height in px. Default 8. */
  barHeight?: number | undefined;
  style?: CSSProperties | undefined;
};

/** BarList (1306, 1308). A split at one moment: a label, a count and a bar per row, with an optional threshold tick.
 *  Track --bg-sunken, fill --ink, tick --ink-3. A row with value null renders its `note` (e.g. "Not yet connected") in --ink-3 and no bar.
 *  Bars share one scale: `max` per row, else the largest value. `format(value, row)` writes the count; default toLocaleString.
 *  Semantics: a list; each row's text carries label and count, the bar is aria-hidden. A threshold's meaning must be said in a line beside the list (it is company-facing).
 *  Same in both themes. No pointer or touch behaviour. */
export function BarList({ rows = [], format, barHeight = 8, style }: BarListProps) {
  const fmt = format || ((v: number) => (typeof v === "number" ? v.toLocaleString() : String(v)));
  const vals = rows.map((r) => (typeof r.value === "number" ? r.value : 0));
  const autoMax = Math.max(
    1,
    ...vals,
    ...rows.map((r) => (typeof r.threshold === "number" ? r.threshold : 0)),
  );
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      {rows.map((r, i) => {
        const value = r.value;
        const off = value == null;
        const max = typeof r.max === "number" && r.max > 0 ? r.max : autoMax;
        const pct = value == null ? 0 : Math.min(100, (value / max) * 100);
        const tick =
          typeof r.threshold === "number" ? Math.min(100, (r.threshold / max) * 100) : null;
        return (
          <li key={r.id || i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                fontSize: 15,
                lineHeight: 1.45,
              }}
            >
              <span style={{ minWidth: 0, color: off ? "var(--ink-3)" : "var(--ink)" }}>
                {r.label}
              </span>
              <span
                style={{
                  flex: "none",
                  fontVariantNumeric: "tabular-nums",
                  color: off ? "var(--ink-3)" : "var(--ink-2)",
                }}
              >
                {value == null ? r.note || "Not yet connected" : fmt(value, r)}
              </span>
            </div>
            {!off && (
              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  height: barHeight,
                  borderRadius: 999,
                  background: "var(--bg-sunken)",
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    width: pct + "%",
                    height: "100%",
                    borderRadius: 999,
                    background: "var(--ink)",
                  }}
                />
                {tick != null && (
                  <span
                    style={{
                      position: "absolute",
                      top: -3,
                      bottom: -3,
                      left: "calc(" + tick + "% - 1px)",
                      width: 2,
                      background: "var(--ink-3)",
                      borderRadius: 1,
                    }}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
