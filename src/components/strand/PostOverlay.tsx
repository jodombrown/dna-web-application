// Ported from Strand components/dna/PostOverlay.jsx (B2-Shell-Feed-v2). Behavior unchanged
// (keyframes live in styles.css). The host owns history and the Feed's scroll position.
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { IconButton } from "./IconButton";

export type PostOverlayProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  tier?: "compact" | "expanded";
  contained?: boolean | undefined;
  title?: string;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** Quick-look shell (ruling 85). Opens over the host surface at /posts/:id; the host keeps its scroll position because this is a sibling layer, not a route swap.
 *  tier "expanded": scrim plus a centred 680 column (pointer). Otherwise a full panel with a back row (touch). contained=true positions inside a relative parent (prototype frames). */
export function PostOverlay({
  open,
  onClose,
  tier = "compact",
  contained,
  title = "Post",
  children,
  style,
}: PostOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  const pos = contained ? "absolute" : "fixed";
  if (tier === "expanded")
    return (
      <div
        role="presentation"
        data-post-overlay
        onClick={onClose}
        style={{
          position: pos,
          inset: 0,
          background: "var(--scrim)",
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "40px 16px",
          overflowY: "auto",
          animation: "strand-fade var(--dur-base) var(--ease)",
          ...style,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 680,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontFamily: "var(--font-sans)",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 4px 4px 16px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              boxShadow: "var(--shadow-stack)",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
            <IconButton name="x" label="Close" onClick={onClose} data-testid="overlay-close" />
          </div>
          {children}
        </div>
      </div>
    );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-post-overlay
      style={{
        position: pos,
        inset: 0,
        background: "var(--bg)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        animation: "strand-slide var(--dur-base) var(--ease)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: 56,
          padding: "0 8px",
          marginTop: "env(safe-area-inset-top, var(--safe-top, 0px))",
          borderBottom: "1px solid var(--line)",
          flex: "none",
        }}
      >
        <IconButton name="arrow-left" label="Back" onClick={onClose} data-testid="overlay-close" />
        <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px 48px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>{children}</div>
      </div>
    </div>
  );
}
