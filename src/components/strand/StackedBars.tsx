// Strand `components/admin/StackedBars.jsx` at compile v1790885781186000 (proposals 40, rulings
// 1306 and 1308, ratified 1309; handoff 40-D item 1). Behavior unchanged. Dispositions are in
// docs/strand-ports/v1790885781186000.md.
import type { CSSProperties } from "react";

export type StackedBarsProps = {
  /** One or two series, each one number per point, oldest first. The first stacks in --ink, the second in --ink-4 on top. */
  series: number[][];
  /** One name per series, in series order; the legend shows each with its total. */
  legend?: string[] | undefined;
  /** Pixel height of the bar area. Default 96. */
  height?: number | undefined;
  /** Pixel gap between bars (in the 100-unit viewBox). Default 4. */
  gap?: number | undefined;
  /** aria-label for the chart; defaults to the legend names joined with "and". */
  label?: string | undefined;
  style?: CSSProperties | undefined;
};

/** StackedBars (1306, 1308). One bar per point, up to two series stacked, --ink then --ink-4 only: no C colour is spent on a chart (readme rule: state and measures are never a C).
 *  Legend under the bars: a swatch, the series name and its total. A series beyond the second is ignored and a console warning says so.
 *  Renders nothing when every point is zero. Decorative SVG under an aria-label that names the series; the legend carries the figures as text.
 *  Same in both themes. No pointer or touch behaviour. */
const INKS = ["var(--ink)", "var(--ink-4)"];
export function StackedBars({
  series = [],
  legend = [],
  height = 96,
  gap = 4,
  label,
  style,
}: StackedBarsProps) {
  const s = series
    .slice(0, 2)
    .map((a) => (a || []).map((n) => (typeof n === "number" && isFinite(n) && n > 0 ? n : 0)));
  if (series.length > 2 && typeof console !== "undefined")
    console.warn("StackedBars: at most two series; the rest are ignored.");
  const n = Math.max(0, ...s.map((a) => a.length));
  if (!n) return null;
  const totals = Array.from({ length: n }, (_, i) => s.reduce((t, a) => t + (a[i] || 0), 0));
  const max = Math.max(...totals);
  if (!max) return null;
  const w = 100,
    bw = (w - gap * (n - 1)) / n;
  const sums = s.map((a) => a.reduce((t, x) => t + x, 0));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <svg
        viewBox={"0 0 " + w + " " + height}
        preserveAspectRatio="none"
        role="img"
        aria-label={label || legend.join(" and ")}
        style={{ display: "block", width: "100%", height }}
      >
        {totals.map((t, i) => {
          let y = height;
          return (
            <g key={i}>
              {s.map((a, k) => {
                const hgt = ((a[i] || 0) / max) * height;
                y -= hgt;
                return hgt > 0 ? (
                  <rect key={k} x={i * (bw + gap)} y={y} width={bw} height={hgt} fill={INKS[k]} />
                ) : null;
              })}
            </g>
          );
        })}
      </svg>
      {legend.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 16px",
            fontSize: 15,
            lineHeight: 1.45,
          }}
        >
          {legend.slice(0, 2).map((name, k) => {
            const sum = sums[k];
            return (
              <li key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: INKS[k],
                    flex: "none",
                  }}
                />
                <span>{name}</span>
                <span style={{ color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                  {sum != null ? sum.toLocaleString() : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
