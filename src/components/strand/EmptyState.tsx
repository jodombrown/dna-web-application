// Design pass 01, strand-patch/EmptyState.jsx (W38, W48). Adds a fill mode: `fill` centres the
// state in the space the sticky bars leave (`stickyTop`, `stickyBottom`), so it is never clipped
// under the lens bar and never reads as a stub parked at the top of an empty scroller. The glyph
// badge at 48, the textile ground, the copy and the one act are unchanged.
import type { CSSProperties, ReactNode } from "react";
import { CBadge } from "./CBadge";
import { assetBase, type C } from "./cmeta";

export type EmptyStateProps = {
  c?: C | "brand";
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  pattern?: "adinkra" | "kente" | "mudcloth";
  /** Centre the state in the space the sticky bars leave, rather than sitting at the top. */
  fill?: boolean | undefined;
  /** Height of the sticky chrome above the scroller, in px (the lens bar, the app header). */
  stickyTop?: number | undefined;
  /** Height of the sticky chrome below it, in px (the PulseDock). */
  stickyBottom?: number | undefined;
  style?: CSSProperties | undefined;
};

/** Grounded-or-empty (rule 6). Names the state and offers one act. Never a zero. */
export function EmptyState({
  c = "brand",
  title,
  body,
  action,
  pattern = "adinkra",
  fill,
  stickyTop = 0,
  stickyBottom = 0,
  style,
}: EmptyStateProps) {
  return (
    <div
      data-empty-state
      data-fill={fill ? "1" : undefined}
      style={{
        textAlign: "center",
        padding: "40px 24px",
        ...(fill
          ? {
              minHeight: "calc(100dvh - " + (stickyTop + stickyBottom) + "px)",
              justifyContent: "center",
            }
          : null),
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
