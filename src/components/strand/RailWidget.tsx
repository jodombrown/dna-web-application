// Ported from Strand components/dna/RailWidget.jsx (B2-Shell-Feed-v2). Behavior unchanged.
import { Children, type CSSProperties, type ReactNode } from "react";

export type RailWidgetProps = {
  title: string;
  action?: ReactNode;
  empty: string;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** Generic rail block (ruling 79). Context only, never navigation. Caps title, optional action, children or the honest empty line (grounded-or-empty). */
export function RailWidget({ title, action, empty, children, style }: RailWidgetProps) {
  const has = Children.toArray(children).some(Boolean);
  return (
    <section
      aria-label={title}
      data-rail-widget
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 500,
            color: "var(--ink-3)",
          }}
        >
          {title}
        </h2>
        {action}
      </header>
      {has ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{children}</div>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.45,
            color: "var(--ink-2)",
            textWrap: "pretty",
          }}
        >
          {empty}
        </p>
      )}
    </section>
  );
}
