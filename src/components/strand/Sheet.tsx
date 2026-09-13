// Design pass 01, strand-patch/Sheet.jsx (rulings 480, 492, 493, 499). Supersedes the composer
// patch's Sheet: every sheet on the platform mounts this one (block, unblock, intro, request,
// composer, filters) and none keeps a local implementation.
// - The surface is a native `dialog` opened with showModal(), so the browser owns the top layer,
//   the inert background and the Escape key (ruling 499). `contained` opens the same dialog with
//   the `open` attribute for a scaled device frame, where the top layer escapes the frame's
//   clipping; this component supplies the trap either way.
// - Focus lands on [data-sheet-heading] if present, otherwise on the first focusable control that
//   does not carry data-destructive. A destructive action is never the default target (222).
// - Focus is trapped while open and returns to the element that opened the sheet on close (423).
// - The action row is a `footer` in the dialog's flex column, never an overlay: a sticky bar that
//   cannot overlap cannot obscure the focused control when the body scrolls (WCAG 2.4.11, 480).
//   Pass it as `actions`.
// - Scroll lock cancels the scrim only (ruling 493). Inside the dialog a vertical scroller is
//   consumed at its edges, a horizontal scroller keeps its wheel, and touch is left to the browser.
// - One size on every sheet (ruling 492): a bottom sheet 80 percent tall on compact, a side sheet
//   40 percent wide on medium and expanded. Never full screen. The composer alone takes 50 percent.
// Production addition: keyboardHeight (px, from visualViewport) insets the dialog above the
// software keyboard so the sheet sits above it, and marks the panel with data-kb="1".
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";

export const SHEET_DUR = 300;

/** Ruling 492, canonical and not overridable per surface. */
export const SHEET_HEIGHT = "80%";
export const SHEET_WIDTH = "40%";
export const COMPOSER_SHEET_WIDTH = "50%";

export type SheetProps = {
  open: boolean;
  onClose?: (() => void) | undefined;
  variant?: "sheet" | "drawer";
  label?: string;
  /** Side-sheet width. Defaults to the canonical 40%; the composer alone passes 50%. */
  width?: number | string | undefined;
  /** Bottom-sheet height. Defaults to the canonical 80%. */
  height?: number | string | undefined;
  contained?: boolean | undefined;
  side?: "right" | "left" | undefined;
  keyboardHeight?: number | undefined;
  /** The action row. Rendered as a footer in the dialog's flex column, never as an overlay. */
  actions?: ReactNode;
  /** Overrides the default focus target. Never point it at a destructive control. */
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  /** Overrides where focus returns on close. Defaults to whatever was focused when it opened. */
  returnFocus?: RefObject<HTMLElement | null> | HTMLElement | null | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/** Stacked surface for compose and tray flows. variant "sheet": bottom sheet with drag handle and
 *  safe-area inset (touch). variant "drawer": side panel (pointer, and the medium tier). The scrim
 *  closes; Esc closes; the drag handle released past 120px closes. */
export function Sheet({
  open,
  onClose,
  variant = "sheet",
  label,
  width,
  height,
  contained,
  side = "right",
  keyboardHeight = 0,
  actions,
  initialFocus,
  returnFocus,
  children,
  style,
}: SheetProps) {
  const [dy, setDy] = useState(0);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(open);
  const start = useRef<number | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Mount, then the top layer, then the enter transition. The element stays mounted until the exit
  // finishes so the 300ms out is real rather than an unmount.
  useEffect(() => {
    if (open) {
      opener.current = (document.activeElement as HTMLElement | null) ?? null;
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

  // showModal() in production (ruling 499); the `open` attribute inside a scaled frame, where the
  // top layer escapes the frame's clipping.
  useEffect(() => {
    const d = dlg.current;
    if (!d || !mounted) return;
    if (contained) {
      if (!d.open) d.setAttribute("open", "");
      return;
    }
    if (!d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    }
    return () => {
      if (d.open) d.close();
    };
  }, [mounted, contained]);

  // Focus in on open: the heading first, so the first thing read is the content; otherwise the
  // first focusable control that is not destructive (222). Focus out on close, to the opener (423).
  const restore = useCallback(() => {
    const target =
      returnFocus && "current" in returnFocus
        ? returnFocus.current
        : (returnFocus ?? opener.current);
    target?.focus?.();
  }, [returnFocus]);
  useEffect(() => {
    if (!open || !mounted) return;
    const p = panel.current;
    if (!p) return;
    const id = requestAnimationFrame(() => {
      const explicit = initialFocus?.current;
      const heading = p.querySelector<HTMLElement>("[data-sheet-heading]");
      const safe = focusables(p).find((el) => !el.hasAttribute("data-destructive"));
      const target = explicit ?? heading ?? safe ?? p;
      if (target === heading && heading && !heading.hasAttribute("tabindex"))
        heading.setAttribute("tabindex", "-1");
      target.focus?.();
    });
    return () => cancelAnimationFrame(id);
  }, [open, mounted, initialFocus]);
  useEffect(() => {
    if (open || !mounted) return;
    restore();
  }, [open, mounted, restore]);

  // Esc, and the Tab trap. showModal() already traps, but `contained` does not, and the explicit
  // trap keeps one behaviour on both paths.
  useEffect(() => {
    if (!open) return;
    const d = dlg.current;
    const cancel = (e: Event) => {
      e.preventDefault();
      onClose?.();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && contained) {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const p = panel.current;
      if (!p) return;
      const list = focusables(p);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0] as HTMLElement;
      const last = list[list.length - 1] as HTMLElement;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !p.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    d?.addEventListener("cancel", cancel);
    window.addEventListener("keydown", key, true);
    return () => {
      d?.removeEventListener("cancel", cancel);
      window.removeEventListener("keydown", key, true);
    };
  }, [open, contained, onClose]);

  // Scroll lock, narrowed (ruling 493). The host does not scroll while the sheet is mounted and a
  // wheel that lands on the scrim is cancelled; inside the dialog a vertical scroller is consumed
  // at its edges so nothing chains to the page, and a horizontal scroller keeps its wheel. Touch is
  // left to the browser.
  useEffect(() => {
    if (!mounted) return;
    const d = dlg.current;
    if (!d) return;
    const host = contained ? d.parentElement : document.documentElement;
    const body = contained ? null : document.body;
    const prev = host ? host.style.overflow : "";
    const prevB = body ? body.style.overflow : "";
    if (host) host.style.overflow = "hidden";
    if (body) body.style.overflow = "hidden";
    const scroller = (t: EventTarget | null): { el: HTMLElement; axis: "x" | "y" } | null => {
      for (let n = t instanceof HTMLElement ? t : null; n && n !== d; n = n.parentElement) {
        const s = getComputedStyle(n);
        if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth)
          return { el: n, axis: "x" };
        if ((s.overflowY === "auto" || s.overflowY === "scroll") && n.scrollHeight > n.clientHeight)
          return { el: n, axis: "y" };
      }
      return null;
    };
    const wheel = (e: WheelEvent) => {
      const inPanel =
        !!panel.current && e.target instanceof Node && panel.current.contains(e.target);
      if (!inPanel) {
        // The scrim. With showModal() a wheel over the backdrop targets the dialog itself.
        e.preventDefault();
        return;
      }
      const sc = scroller(e.target);
      if (!sc) {
        e.preventDefault();
        return;
      }
      if (sc.axis === "x") return; // the chip row keeps its wheel
      const up = e.deltaY < 0;
      const atTop = sc.el.scrollTop <= 0;
      const atEnd = sc.el.scrollTop + sc.el.clientHeight >= sc.el.scrollHeight - 1;
      if ((up && atTop) || (!up && atEnd)) e.preventDefault();
      e.stopPropagation();
    };
    d.addEventListener("wheel", wheel, { passive: false });
    return () => {
      if (host) host.style.overflow = prev || "";
      if (body) body.style.overflow = prevB || "";
      d.removeEventListener("wheel", wheel);
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
  const len = (v: number | string) => (typeof v === "number" ? v + "px" : v);
  const w = sheet ? "100%" : len(width ?? SHEET_WIDTH);
  const h = sheet
    ? keyboardHeight > 0
      ? "calc(100% - 8px)"
      : len(height ?? SHEET_HEIGHT)
    : "100%";
  return (
    <dialog
      ref={dlg}
      className="strand-sheet"
      aria-label={label}
      data-sheet-scrim
      data-shown={shown ? "1" : "0"}
      onClick={(e) => {
        if (e.target === dlg.current) onClose?.();
      }}
      style={{
        position: contained ? "absolute" : "fixed",
        bottom: keyboardHeight > 0 ? keyboardHeight : 0,
        height: keyboardHeight > 0 ? "calc(100% - " + keyboardHeight + "px)" : "100%",
        display: "flex",
        alignItems: sheet ? "flex-end" : "stretch",
        justifyContent: sheet ? "center" : left ? "flex-start" : "flex-end",
        // The contained path draws its own scrim; showModal() paints ::backdrop instead.
        background: contained ? "var(--scrim)" : "transparent",
        opacity: contained ? (shown ? 1 : 0) : 1,
        transition: contained ? "opacity " + ease : undefined,
        overscrollBehavior: "contain",
      }}
    >
      <section
        ref={panel}
        role="document"
        data-kb={keyboardHeight > 0 ? "1" : undefined}
        style={{
          background: "var(--surface)",
          boxShadow: "var(--shadow-stack)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          width: w,
          maxWidth: "100%",
          height: h,
          maxHeight: "100%",
          borderRadius: sheet ? "14px 14px 0 0" : 0,
          borderLeft: sheet || left ? "none" : "1px solid var(--line)",
          borderRight: left ? "1px solid var(--line)" : "none",
          paddingBottom:
            sheet && keyboardHeight === 0
              ? "env(safe-area-inset-bottom, var(--safe-bottom, 0px))"
              : 0,
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
        {actions && (
          <footer
            data-sheet-actions
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              padding: "12px 20px",
              borderTop: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            {actions}
          </footer>
        )}
      </section>
    </dialog>
  );
}
