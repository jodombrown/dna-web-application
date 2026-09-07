// Ported from Strand components/dna/EmptyState.jsx (B2-Shell-Feed-v2). Behavior unchanged.
import type { CSSProperties, ReactNode } from "react";
import { CBadge } from "./CBadge";
import { assetBase, type C } from "./cmeta";

export type EmptyStateProps = {
  c?: C | "brand";
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  pattern?: "adinkra" | "kente" | "mudcloth";
  style?: CSSProperties | undefined;
};

/** Grounded-or-empty (rule 6). Names the state and offers one act. Never a zero. */
export function EmptyState({
  c = "brand",
  title,
  body,
  action,
  pattern = "adinkra",
  style,
}: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 24px",
        borderRadius: 14,
        background: "var(--bg) url(" + assetBase() + "patterns/" + pattern + "-pattern.svg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <CBadge c={c} size={48} />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          lineHeight: 1.25,
          color: "var(--ink)",
          maxWidth: 360,
        }}
      >
        {title}
      </div>
      {body && (
        <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink-2)", maxWidth: 360 }}>
          {body}
        </div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
