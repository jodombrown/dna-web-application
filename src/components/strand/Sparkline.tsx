// Strand `components/admin/Sparkline.jsx` at compile v1790885781186000 (proposals 40, rulings 1306
// and 1308, ratified 1309; handoff 40-D item 1). Behavior unchanged. Dispositions are in
// docs/strand-ports/v1790885781186000.md.
import type { CSSProperties } from "react";

export type SparklineProps = {
  /** The series, oldest first. Fewer than two finite values, or no variation, renders nothing. */
  values: number[];
  /** Pixel width. Default 120. */
  width?: number | undefined;
  /** Pixel height. Default 32. */
  height?: number | undefined;
  /** Fill under the line in --bg-sunken. Default false. */
  area?: boolean | undefined;
  /** Label under the line's start, e.g. "Fri 25 Sep". */
  startLabel?: string | undefined;
  /** Label under the line's end, e.g. "Thu 1 Oct". */
  endLabel?: string | undefined;
  /** default strokes --ink; small strokes --ink-3 for a lever card's corner. */
  variant?: "default" | "small" | undefined;
  /** When given the SVG is role img with this label; otherwise decorative (aria-hidden). */
  label?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Sparkline (1306, 1308). A plain line, no axis, no gauge or dial. Optional sunken area fill and start and end labels.
 *  Omits itself (renders null) when the values have no variation or fewer than two points: a flat line says nothing the figure does not.
 *  variant "small" strokes in --ink-3 for a lever card's corner; default strokes in --ink. Decorative: aria-hidden unless `label` is given, then role img.
 *  Same in both themes (ink tokens only). No pointer or touch behaviour. */
export function Sparkline({
  values = [],
  width = 120,
  height = 32,
  area = false,
  startLabel,
  endLabel,
  variant = "default",
  label,
  style,
}: SparklineProps) {
  const v = values.filter((n) => typeof n === "number" && isFinite(n));
  if (v.length < 2) return null;
  const min = Math.min(...v),
    max = Math.max(...v);
  if (max === min) return null;
  const pad = 1.5,
    w = width,
    h = height;
  const pts = v.map((n, i): [number, number] => [
    pad + (i * (w - 2 * pad)) / (v.length - 1),
    pad + (h - 2 * pad) * (1 - (n - min) / (max - min)),
  ]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" ");
  // The first point's x is `pad` and the last point's is `pad + (w - 2 * pad)` by construction
  // above, which is what the compile reads back out of `pts[0]` and `pts[pts.length - 1]`.
  const xFirst = pad,
    xLast = pad + (w - 2 * pad);
  const areaD = d + " L" + xLast.toFixed(2) + " " + h + " L" + xFirst.toFixed(2) + " " + h + " Z";
  const stroke = variant === "small" ? "var(--ink-3)" : "var(--ink)";
  const hasLabels = startLabel || endLabel;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        width: w,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox={"0 0 " + w + " " + h}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : "true"}
        style={{ display: "block", overflow: "visible" }}
      >
        {area && <path d={areaD} fill="var(--bg-sunken)" stroke="none" />}
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {hasLabels && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            fontSize: 13,
            lineHeight: 1.4,
            color: "var(--ink-3)",
          }}
        >
          <span>{startLabel}</span>
          <span>{endLabel}</span>
        </div>
      )}
    </div>
  );
}
