// Strand `components/admin/DataTable.jsx` at compile v1790885781186000 (proposals 40, rulings 1306
// and 1308, ratified 1309; handoff 40-D item 1). Dispositions are in
// docs/strand-ports/v1790885781186000.md.
//
// Divergence carried from the other ports (Tooltip, PostCard, Menu, LensBar; handoff 40-D item 1 of
// "Where the source and the tree meet"): the input mode comes from `useMode` in src/lib/tier.ts, the
// app's one input-mode source, where the compile reads its own `useInputMode`. Both answer
// "touch" | "pointer" from `(pointer: coarse)` and follow its changes, so nothing is mapped at the
// call site; `useMode` reads "pointer" until its effect runs, so the server-rendered table is the
// pointer form and a touch device's rows grow to 48 on hydration unless `input` is given.
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useMode, type Mode } from "@/lib/tier";

export type DataTableColumn = {
  key: string;
  label: string;
  /** Right-aligned, tabular, sorted numerically, default high to low. */
  numeric?: boolean | undefined;
  align?: "left" | "right" | "center" | undefined;
  /** false removes the sort control from this heading. Default true. */
  sortable?: boolean | undefined;
  /** Direction when this heading is first chosen. Default desc for numeric, asc otherwise. */
  defaultDir?: "asc" | "desc" | undefined;
  render?: ((value: unknown, row: Record<string, unknown>) => ReactNode) | undefined;
};
export type DataTableSort = { key: string; dir: "asc" | "desc" };
export type DataTableProps = {
  columns: DataTableColumn[];
  /** Plain objects keyed by column key; `id` keys the row. Never a person's name or photo as a measure. */
  rows: Record<string, unknown>[];
  /** Controlled sort; the caller sorts rows. Uncontrolled when absent. */
  sort?: DataTableSort | undefined;
  onSort?: ((sort: DataTableSort) => void) | undefined;
  /** Initial sort when uncontrolled. Default: the first column. */
  defaultSort?: DataTableSort | undefined;
  /** pointer: 40px rows, 24px heading targets. touch: 48px rows, 44px heading targets. Follows the device when absent. */
  input?: Mode | undefined;
  /** Visually hidden caption and the scroll region's label. */
  caption?: string | undefined;
  /** One line under the table. Default the sort hint ("Click" or "Tap a column heading to sort."). */
  footer?: ReactNode;
  /** Table minimum width before it scrolls sideways inside its container. Default 520. */
  minWidth?: number | undefined;
  style?: CSSProperties | undefined;
};

/** DataTable (1306, 1308). Sortable column headings with aria-sort; pointer rows 40px and touch rows 48px; heading targets 24px (pointer, --target-min) and 44px (touch, --target-primary).
 *  Under 640px (--tier-medium) the table scrolls sideways inside its container: the wrapper is overflow-x auto with a min width, and is a focusable region so a keyboard can scroll it.
 *  Sorting: clicking an active heading reverses; a new heading sorts by its `defaultDir` (desc for numbers, asc otherwise). The active heading says "high to low" or "low to high" in words beside its label; no arrow glyph (732: no rotated glyph, and the words already carry the direction).
 *  Pointer: row hover --bg-sunken, heading hover underline. Touch: no hover; taller rows and headings. `input` follows the device unless given.
 *  Footer: one line under the table for the count outside the table and the sort hint ("Click a column heading to sort." pointer; "Tap" touch) unless footer is given.
 *  Both themes from tokens. The table is a real <table> with scope="col" headings; the sort control is a button inside the th. Rows never carry a person's name or photo in a measure. */
export function DataTable({
  columns = [],
  rows = [],
  sort,
  onSort,
  defaultSort,
  input,
  caption,
  footer,
  minWidth = 520,
  style,
}: DataTableProps) {
  const device = useMode();
  const mode = input || device,
    touch = mode === "touch";
  const first = columns[0];
  const [local, setLocal] = useState<DataTableSort | null>(
    defaultSort || (first ? { key: first.key, dir: first.numeric ? "desc" : "asc" } : null),
  );
  const cur = sort || local;
  const setSort = (s: DataTableSort) => {
    if (onSort) onSort(s);
    if (!sort) setLocal(s);
  };
  const click = (c: DataTableColumn) => {
    if (c.sortable === false) return;
    const dir =
      cur && cur.key === c.key
        ? cur.dir === "asc"
          ? "desc"
          : "asc"
        : c.defaultDir || (c.numeric ? "desc" : "asc");
    setSort({ key: c.key, dir });
  };
  const sorted = useMemo(() => {
    if (!cur || sort) return rows; // a controlled sort means the caller sorted
    const c = columns.find((x) => x.key === cur.key);
    if (!c) return rows;
    return rows.slice().sort((a, b) => {
      const x = a[cur.key],
        y = b[cur.key];
      const r = c.numeric
        ? (Number(x) || 0) - (Number(y) || 0)
        : String(x ?? "").localeCompare(String(y ?? ""));
      return cur.dir === "asc" ? r : -r;
    });
  }, [rows, cur, sort, columns]);
  const rowH = touch ? 48 : 40,
    headTarget = touch ? 44 : 24;
  const cell: CSSProperties = {
    padding: "0 12px",
    fontSize: 15,
    lineHeight: 1.45,
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--line)",
    height: rowH,
    boxSizing: "border-box",
  };
  const [hov, setHov] = useState(-1);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        tabIndex={0}
        role="region"
        aria-label={caption || "Table"}
        style={{
          overflowX: "auto",
          maxWidth: "100%",
          WebkitOverflowScrolling: "touch",
          outlineOffset: 2,
        }}
      >
        <table style={{ width: "100%", minWidth, borderCollapse: "collapse", borderSpacing: 0 }}>
          {caption && (
            <caption
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
              }}
            >
              {caption}
            </caption>
          )}
          <thead>
            <tr>
              {columns.map((c) => {
                const active = cur && cur.key === c.key;
                const sortable = c.sortable !== false;
                const word = active
                  ? cur.dir === "desc"
                    ? c.numeric
                      ? "high to low"
                      : "Z to A"
                    : c.numeric
                      ? "low to high"
                      : "A to Z"
                  : null;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active
                        ? cur.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : sortable
                          ? "none"
                          : undefined
                    }
                    style={{
                      ...cell,
                      height: Math.max(rowH, headTarget + 8),
                      textAlign: c.align || (c.numeric ? "right" : "left"),
                      fontWeight: 500,
                      color: "var(--ink-2)",
                      fontSize: 13,
                      letterSpacing: "var(--tracking-caps)",
                      textTransform: "uppercase",
                      borderBottom: "1px solid var(--line-strong)",
                    }}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => click(c)}
                        aria-label={c.label + (word ? ", " + word : "") + ", sort"}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          minHeight: headTarget,
                          padding: touch ? "0 4px" : 0,
                          margin: touch ? "0 -4px" : 0,
                          borderRadius: "var(--radius-s)",
                          color: active ? "var(--ink)" : "inherit",
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          letterSpacing: "inherit",
                          textTransform: "inherit",
                          fontWeight: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          if (!touch) e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        <span>{c.label}</span>
                        {word && (
                          <span
                            style={{
                              textTransform: "none",
                              letterSpacing: 0,
                              fontWeight: 400,
                              color: "var(--ink-3)",
                            }}
                          >
                            {word}
                          </span>
                        )}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const id = r["id"];
              return (
                <tr
                  key={typeof id === "string" || typeof id === "number" ? id : i}
                  onMouseEnter={() => !touch && setHov(i)}
                  onMouseLeave={() => setHov(-1)}
                  style={{
                    background: hov === i ? "var(--bg-sunken)" : "transparent",
                    transition: "background var(--dur-default) var(--ease)",
                  }}
                >
                  {columns.map((c, k) => {
                    const v = r[c.key];
                    return (
                      <td
                        key={c.key}
                        style={{
                          ...cell,
                          textAlign: c.align || (c.numeric ? "right" : "left"),
                          fontVariantNumeric: c.numeric ? "tabular-nums" : undefined,
                          color: k === 0 ? "var(--ink)" : "var(--ink-2)",
                          fontWeight: k === 0 ? 500 : 400,
                        }}
                      >
                        {c.render
                          ? c.render(v, r)
                          : c.numeric && typeof v === "number"
                            ? v.toLocaleString()
                            : (v as ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--ink-3)",
          textWrap: "pretty",
        }}
      >
        {footer != null
          ? footer
          : touch
            ? "Tap a column heading to sort."
            : "Click a column heading to sort."}
      </p>
    </div>
  );
}
