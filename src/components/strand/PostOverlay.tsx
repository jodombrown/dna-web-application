// Strand components/dna/PostOverlay.jsx (B2-Shell-Feed-v2). The quick-look layer for a post: a real
// route rendered on top of Feed, never a route swap (ruling 85). Scrim closes, Esc closes, the
// close button closes. Compact: full height panel; wider tiers: a centered panel capped at 760.
// The host owns history (pushState on open, popState dismisses) and Feed's scroll position.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { IconButton } from "./IconButton";

export type PostOverlayProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  label?: string;
  compact?: boolean | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

export function PostOverlay({
  open,
  onClose,
  label = "Post",
  compact,
  children,
  style,
}: PostOverlayProps) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", k);
    // Body scroll stays where it was; the panel scrolls on its own. Feed keeps its position.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      role="presentation"
      data-post-overlay
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--scrim)",
        display: "flex",
        alignItems: compact ? "stretch" : "flex-start",
        justifyContent: "center",
        padding: compact ? 0 : "24px 16px",
        boxSizing: "border-box",
        zIndex: 40,
        animation: "strand-fade var(--dur-base) var(--ease)",
      }}
    >
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          boxShadow: "var(--shadow-stack)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          width: compact ? "100%" : "min(760px, 100%)",
          maxHeight: compact ? "100%" : "calc(100dvh - 48px)",
          height: compact ? "100%" : undefined,
          borderRadius: compact ? 0 : 14,
          border: compact ? "none" : "1px solid var(--line)",
          paddingTop: compact ? "env(safe-area-inset-top)" : 0,
          outline: "none",
          animation: (compact ? "strand-rise" : "strand-fade") + " var(--dur-base) var(--ease)",
          ...style,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 8px 8px 16px",
            minHeight: 56,
            borderBottom: "1px solid var(--line)",
            flex: "none",
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1 }}>
            {label}
          </span>
          <span style={{ flex: 1 }} />
          <IconButton name="x" label="Close" onClick={onClose} data-testid="overlay-close" />
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: compact
              ? "12px 16px calc(24px + env(safe-area-inset-bottom))"
              : "16px 20px 24px",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
