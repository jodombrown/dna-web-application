// Strand components/dna/RailWidget.jsx (B2-Shell-Feed-v2). A rail card: caps title, then real
// rows or the honest empty line. Rails hold context and DIA suggestions only, never navigation
// (ruling 71), and exist only at the expanded tier (ruling 86).
import type { CSSProperties, ReactNode } from "react";

export type RailWidgetProps = {
  title: string;
  /** Rows to show. When absent or empty, `empty` renders instead; nothing is invented. */
  children?: ReactNode;
  empty: string;
  style?: CSSProperties | undefined;
};

export function RailWidget({ title, children, empty, style }: RailWidgetProps) {
  const hasRows =
    children != null &&
    children !== false &&
    !(Array.isArray(children) && children.filter(Boolean).length === 0);
  return (
    <section
      aria-label={title}
      data-rail-widget
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        {title}
      </h2>
      {hasRows ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      ) : (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-3)" }}>{empty}</p>
      )}
    </section>
  );
}

/** One rail row: optional leading node, a title line, an optional meta line. */
export function RailRow({
  lead,
  title,
  meta,
  onClick,
}: {
  lead?: ReactNode;
  title: string;
  meta?: string | undefined;
  onClick?: (() => void) | undefined;
}) {
  const inner = (
    <>
      {lead}
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            lineHeight: 1.35,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        {meta && (
          <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }}>{meta}</span>
        )}
      </span>
    </>
  );
  const base: CSSProperties = { display: "flex", alignItems: "center", gap: 10, minHeight: 36 };
  if (!onClick) return <div style={base}>{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ all: "unset", ...base, cursor: "pointer", width: "100%", boxSizing: "border-box" }}
    >
      {inner}
    </button>
  );
}
