// Strand `components/core/Menu.jsx`, ported at compile v1790212533284400 (handoff 32-A, correction
// 25 section 2, rulings 663, 1097, 1102 and 1103). A new part: the compile before this one had no
// menu, and a card's ellipsis handed its caller a press (`onMenu`).
//
// A list of acts summoned from one control, most often an ellipsis. Not for navigation, not for
// choosing a value (Select), not for filters (FacetRail).
// Items are `{ id, label, icon?, tone?, onSelect }` or `{ rule: true }`. An item that does not apply
// is absent: the caller leaves it out or passes a falsy entry, which is dropped. There is no disabled
// item and no `disabled` field; a greyed act is refused (1097). Rules collapse: a rule never leads,
// trails or doubles once the absent items are gone. `tone: "danger"` renders the label and icon in
// the error rung; it exists in the part and Discovery does not use it (1097 refuses Report). The
// compile writes --danger; this reads --error under ruling 425, and --danger is var(--error).
// WAI-ARIA menu: `role="menu"`, `menuitem`, roving focus. ArrowUp and ArrowDown wrap, Home and End,
// Enter and Space select and close (the item is a native button), Escape and Tab close; Escape and
// select return focus to the anchor. Escape calls `preventDefault`, so the Pane and Sheet guards of
// correction 23 do not also close.
// Portal by default: rendered into `document.body` at `position: fixed` from the anchor's rect,
// bottom-end, flipped above when the room below is short, clamped inside the viewport, and
// repositioned on scroll and resize while open. `portal={false}` renders in place, absolutely
// positioned inside the anchor's positioned parent, for frames and specimens that are scaled.
// Items are 44 on touch and 36 on pointer; `input` overrides the detected mode for proofs. Stacking
// is `--z-menu` (1103), 62: above the pane and sticky chrome, below dialog and notification, and
// clear of a sheet the menu opens from. Menu reads `--z-menu` and never `--z-notification`. No count,
// ever.
//
// The input mode comes from `useMode()` in `src/lib/tier.ts`, the app's one watcher of
// `(pointer: coarse)`, rather than a second hook; the prior port record made the same call for
// LensBar's `title` (29-A, item 53). The compile reaches the portal through `window.ReactDOM`; this
// imports `createPortal` from `react-dom`.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useMode, type Mode } from "@/lib/tier";
import { Icon } from "./Icon";

export type MenuItem = {
  id: string;
  label: string;
  /** A name from Strand's icon set, drawn before the label. */
  icon?: string | undefined;
  /** Renders the label and icon in the error rung (--error, 425). Unused on Discovery (1097). */
  tone?: "danger" | undefined;
  onSelect?: (() => void) | undefined;
};
export type MenuRule = { rule: true };
type Entry = MenuItem | MenuRule;
const isRule = (e: Entry): e is MenuRule => "rule" in e && e.rule === true;

export type MenuPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start";

export type MenuProps = {
  open: boolean;
  /** Fires on Escape, Tab, an outside press and after an item is chosen. */
  onClose?: (() => void) | undefined;
  /** The control that summoned the menu. Positions the menu (portal) and takes focus back on
   *  Escape and select. */
  anchorRef?: RefObject<HTMLElement | null> | undefined;
  /** Items and rules in order. An item that does not apply is absent: leave it out or pass a falsy
   *  entry. There is no disabled item (1102). Rules never lead, trail or double. */
  items: (Entry | false | null | undefined)[];
  /** The menu's accessible name. */
  label?: string | undefined;
  /** Default true: rendered into `document.body`, fixed, bottom-end from the anchor, flipped above
   *  when short of room. false: in place, absolute in the anchor's positioned parent. */
  portal?: boolean;
  placement?: MenuPlacement;
  /** Overrides the detected input mode. Items are 44 on touch, 36 on pointer. */
  input?: Mode | undefined;
  style?: CSSProperties | undefined;
};

type Placed = { top: number; left: number; up: boolean };

export function Menu({
  open,
  onClose,
  anchorRef,
  items = [],
  label,
  portal = true,
  placement = "bottom-end",
  input,
  style,
}: MenuProps) {
  const detected = useMode();
  const mode = input || detected;
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Placed | null>(null);
  const focused = useRef(false);
  const list = useMemo(() => {
    const out: Entry[] = [];
    for (const it of items) {
      if (!it) continue;
      if (isRule(it)) {
        const last = out[out.length - 1];
        if (last && !isRule(last)) out.push(it);
      } else out.push(it);
    }
    while (out.length && isRule(out[out.length - 1] as Entry)) out.pop();
    return out;
  }, [items]);
  // Read through a ref so the document listener below, attached once per opening, always closes
  // with the caller's current handler.
  const closeRef = useRef<(restore: boolean) => void>(() => undefined);
  const close = (restore = true) => {
    if (onClose) onClose();
    const t = restore ? anchorRef?.current : null;
    if (t) {
      const f = t.matches("button, a[href], [tabindex]")
        ? t
        : t.querySelector<HTMLElement>("button, a[href], [tabindex]");
      (f || t).focus();
    }
  };
  closeRef.current = close;
  const place = useCallback(() => {
    if (!portal || !anchorRef?.current || !box.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const m = box.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 4;
    const edge = 8;
    const below = vh - a.bottom - gap;
    const above = a.top - gap;
    const up =
      placement.indexOf("top") === 0
        ? above >= m.height || above > below
        : below < m.height && above > below;
    let top = up ? a.top - gap - m.height : a.bottom + gap;
    let left = placement.slice(-3) === "end" ? a.right - m.width : a.left;
    left = Math.max(edge, Math.min(left, vw - edge - m.width));
    top = Math.max(edge, Math.min(top, vh - edge - m.height));
    setPos({ top, left, up });
  }, [portal, anchorRef, placement]);
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      focused.current = false;
      return;
    }
    place();
    if (!portal) return;
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, portal]);
  useLayoutEffect(() => {
    // Focus the first item once the menu is placed: a portal menu is `visibility: hidden` until it
    // has a position, and a hidden element cannot take focus (correction 25 section 7).
    if (!open || focused.current || (portal && !pos) || !box.current) return;
    const f = box.current.querySelector<HTMLElement>('[role="menuitem"]');
    if (f) {
      f.focus({ preventScroll: true });
      focused.current = true;
    }
  }, [open, pos, portal]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (
        box.current &&
        t &&
        !box.current.contains(t) &&
        !(anchorRef?.current && anchorRef.current.contains(t))
      )
        closeRef.current(false);
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [open, anchorRef]);
  if (!open || !list.some((it) => !isRule(it))) return null;
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!box.current) return;
    const els = Array.from(box.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = els.indexOf(document.activeElement as HTMLElement);
    const at = (n: number) => els[n]?.focus();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      at((i + 1) % els.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      at((i - 1 + els.length) % els.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      at(0);
    } else if (e.key === "End") {
      e.preventDefault();
      at(els.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  };
  const h = mode === "touch" ? 44 : 36;
  const pick = (it: MenuItem) => {
    close(true);
    if (it.onSelect) it.onSelect();
  };
  const top = placement.indexOf("top") === 0;
  const end = placement.slice(-3) === "end";
  const geo: CSSProperties = portal
    ? {
        position: "fixed",
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        visibility: pos ? "visible" : "hidden",
      }
    : {
        position: "absolute",
        top: top ? "auto" : "calc(100% + 4px)",
        bottom: top ? "calc(100% + 4px)" : "auto",
        right: end ? 0 : "auto",
        left: end ? "auto" : 0,
      };
  const el = (
    <div
      ref={box}
      role="menu"
      aria-label={label}
      aria-orientation="vertical"
      data-menu=""
      data-input={mode}
      data-placement={pos && pos.up ? "top" : "bottom"}
      onKeyDown={onKey}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...geo,
        zIndex: "var(--z-menu)" as unknown as number,
        minWidth: 220,
        maxWidth: 320,
        boxSizing: "border-box",
        padding: "var(--space-1)",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface)",
        color: "var(--ink)",
        border: "var(--border-thin) solid var(--line)",
        borderRadius: "var(--radius-m)",
        boxShadow: "var(--shadow-3)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {list.map((it, i) =>
        isRule(it) ? (
          <div
            key={"rule-" + i}
            role="separator"
            style={{
              height: 0,
              borderTop: "var(--border-thin) solid var(--line)",
              margin: "var(--space-1) 0",
            }}
          />
        ) : (
          <MenuItemButton key={it.id || it.label} it={it} h={h} onPick={() => pick(it)} />
        ),
      )}
    </div>
  );
  if (portal && typeof document !== "undefined") return createPortal(el, document.body);
  return el;
}

function MenuItemButton({ it, h, onPick }: { it: MenuItem; h: number; onPick: () => void }) {
  const [hot, setHot] = useState(false);
  const danger = it.tone === "danger";
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-item={it.id}
      data-tone={it.tone || undefined}
      onClick={onPick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        minHeight: h,
        padding: "0 var(--space-3)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        borderRadius: "var(--radius-s)",
        fontSize: "var(--text-s)",
        lineHeight: "var(--text-s-lh)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        color: danger ? "var(--error)" : "var(--ink)",
        background: hot ? "var(--bg-sunken)" : "transparent",
        outline: "none",
        boxShadow: hot ? "inset 0 0 0 1px var(--line)" : "none",
        transition: "background var(--dur-default) var(--ease)",
      }}
    >
      {it.icon && (
        <Icon
          name={it.icon}
          size={18}
          style={{ color: danger ? "var(--error)" : "var(--ink-2)" }}
        />
      )}
      <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{it.label}</span>
    </button>
  );
}
