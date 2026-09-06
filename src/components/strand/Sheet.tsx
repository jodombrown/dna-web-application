// Ported from Strand components/core/Sheet.jsx. Behavior unchanged.
// Production addition: keyboardHeight (px, from visualViewport) insets the scrim above the software
// keyboard so the sheet sits above it, and marks the sheet with data-kb="1" while tracking is active.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

export type SheetProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  variant?: "sheet" | "drawer";
  label?: string;
  width?: number;
  contained?: boolean | undefined;
  keyboardHeight?: number | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** Stacked surface for compose and tray flows. variant "sheet": full-height bottom sheet with drag handle and safe-area inset (touch).
 *  variant "drawer": right-side panel (pointer). Scrim closes; Esc closes; drag handle down 120px closes.
 *  contained=true positions inside a position:relative parent (prototype frames) instead of the viewport. */
export function Sheet({
  open,
  onClose,
  variant = "sheet",
  label,
  width = 960,
  contained,
  keyboardHeight = 0,
  children,
  style,
}: SheetProps) {
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  const sheet = variant === "sheet";
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current == null) return;
    setDy(Math.max(0, e.clientY - start.current));
  };
  const onUp = () => {
    if (dy > 120) onClose?.();
    start.current = null;
    setDy(0);
  };
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        background: "var(--scrim)",
        display: "flex",
        alignItems: sheet ? "flex-end" : "stretch",
        justifyContent: sheet ? "center" : "flex-end",
        zIndex: 50,
        animation: "strand-fade var(--dur-base) var(--ease)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-kb={keyboardHeight > 0 ? "1" : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-stack)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          width: sheet ? "100%" : "min(" + width + "px, 100%)",
          height: sheet
            ? "calc(100% - env(safe-area-inset-top, var(--safe-top, 0px)) - 8px)"
            : "100%",
          borderRadius: sheet ? "14px 14px 0 0" : 0,
          borderLeft: sheet ? "none" : "1px solid var(--line)",
          paddingBottom:
            sheet && keyboardHeight === 0
              ? "env(safe-area-inset-bottom, var(--safe-bottom, 0px))"
              : 0,
          transform: dy ? "translateY(" + dy + "px)" : "none",
          transition: dy ? "none" : "transform var(--dur-base) var(--ease)",
          animation: (sheet ? "strand-rise" : "strand-slide") + " var(--dur-base) var(--ease)",
          ...style,
        }}
      >
        {sheet && (
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            aria-hidden="true"
            style={{
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              touchAction: "none",
              flex: "none",
            }}
          >
            <span style={{ width: 36, height: 4, borderRadius: 2, background: "var(--ink-4)" }} />
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
