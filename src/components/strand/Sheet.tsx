// Ported from the B1-Composer-v3 extraction, composer/strand-patch/Sheet.jsx (ruling 107). Changes
// from Strand's core Sheet: (1) real 300ms enter and exit transitions, the element stays mounted
// until the exit finishes; (2) scroll lock while open, enforced at the event level: wheel and
// touchmove reaching the scrim or the host are cancelled, and inside the dialog wheel and touch
// input are consumed by the nearest scrollable ancestor (never bubbling to the page), including over
// the textarea and at that region's scroll edges; (3) `side` for the drawer anchor.
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

export const SHEET_DUR = 300;

export type SheetProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  variant?: "sheet" | "drawer";
  label?: string;
  /** Drawer width: a pixel number or a CSS length ("65%"). */
  width?: number | string;
  contained?: boolean | undefined;
  side?: "right" | "left" | undefined;
  keyboardHeight?: number | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** Stacked surface for compose and tray flows. variant "sheet": bottom sheet with drag handle and safe-area inset (touch).
 *  variant "drawer": side panel (pointer, and the medium tier). Scrim closes; Esc closes; drag handle down 120px closes.
 *  contained=true positions inside a position:relative parent (prototype frames) instead of the viewport. */
export function Sheet({
  open,
  onClose,
  variant = "sheet",
  label,
  width = 960,
  contained,
  side = "right",
  keyboardHeight = 0,
  children,
  style,
}: SheetProps) {
  const [dy, setDy] = useState(0);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(open);
  const start = useRef<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const dlg = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const id = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(id);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), SHEET_DUR);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  // Scroll lock. The host (contained parent or document) never scrolls while the sheet is mounted,
  // and no wheel or touchmove that starts inside the sheet ever reaches the page behind it.
  useEffect(() => {
    if (!mounted) return;
    const scope = root.current;
    if (!scope) return;
    const host = contained ? scope.parentElement : document.documentElement;
    const body = contained ? null : document.body;
    const prev = host ? host.style.overflow : "";
    const prevB = body ? body.style.overflow : "";
    if (host) host.style.overflow = "hidden";
    if (body) body.style.overflow = "hidden";
    const inDlg = (t: EventTarget | null) =>
      !!dlg.current && t instanceof Node && dlg.current.contains(t);
    const scrollable = (t: EventTarget | null): HTMLElement | null => {
      for (
        let n = t instanceof HTMLElement ? t : null;
        n && n !== dlg.current;
        n = n.parentElement
      ) {
        const o = getComputedStyle(n).overflowY;
        if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    };
    const wheel = (e: WheelEvent) => {
      if (!inDlg(e.target)) {
        if (scope.contains(e.target as Node)) e.preventDefault();
        return;
      }
      const sc = scrollable(e.target);
      if (!sc) {
        e.preventDefault();
        return;
      }
      const up = e.deltaY < 0;
      const atTop = sc.scrollTop <= 0;
      const atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1;
      // Consume at the edges so nothing chains to the page.
      if ((up && atTop) || (!up && atEnd)) e.preventDefault();
      e.stopPropagation();
    };
    const touch = (e: TouchEvent) => {
      if (!inDlg(e.target)) {
        if (scope.contains(e.target as Node)) e.preventDefault();
        return;
      }
      if (!scrollable(e.target)) e.preventDefault();
      e.stopPropagation();
    };
    scope.addEventListener("wheel", wheel, { passive: false });
    scope.addEventListener("touchmove", touch, { passive: false });
    return () => {
      if (host) host.style.overflow = prev || "";
      if (body) body.style.overflow = prevB || "";
      scope.removeEventListener("wheel", wheel);
      scope.removeEventListener("touchmove", touch);
    };
  }, [mounted, contained]);

  if (!mounted) return null;
  const sheet = variant === "sheet";
  const left = side === "left";
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
  const rm =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = rm ? "0ms" : SHEET_DUR + "ms var(--ease)";
  const hidden = sheet ? "translateY(100%)" : "translateX(" + (left ? "-" : "") + "100%)";
  const w = typeof width === "number" ? "min(" + width + "px, 100%)" : width;
  return (
    <div
      ref={root}
      role="presentation"
      data-sheet-scrim
      data-shown={shown ? "1" : "0"}
      onClick={onClose}
      aria-hidden={!open || undefined}
      style={{
        position: contained ? "absolute" : "fixed",
        inset: 0,
        bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        background: "var(--scrim)",
        display: "flex",
        alignItems: sheet ? "flex-end" : "stretch",
        justifyContent: sheet ? "center" : left ? "flex-start" : "flex-end",
        zIndex: 50,
        opacity: shown ? 1 : 0,
        transition: "opacity " + ease,
        overscrollBehavior: "contain",
        touchAction: "none",
      }}
    >
      <section
        ref={dlg}
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
          width: sheet ? "100%" : w,
          height: sheet
            ? "calc(100% - env(safe-area-inset-top, var(--safe-top, 0px)) - 8px)"
            : "100%",
          borderRadius: sheet ? "14px 14px 0 0" : 0,
          borderLeft: sheet || left ? "none" : "1px solid var(--line)",
          borderRight: left ? "1px solid var(--line)" : "none",
          paddingBottom:
            sheet && keyboardHeight === 0
              ? "env(safe-area-inset-bottom, var(--safe-bottom, 0px))"
              : 0,
          touchAction: "pan-y",
          overscrollBehavior: "contain",
          ...style,
          transform: dy ? "translateY(" + dy + "px)" : shown ? "none" : hidden,
          transition: dy ? "none" : "transform " + ease,
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
