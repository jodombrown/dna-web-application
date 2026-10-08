// The Feed column's own scroll container (rulings 104, 107). The shell owns one scroller per tier:
// the content column on expanded (three independent columns) and the single content scroller under
// the header on compact and medium. The 72px header swap and the floating composer entry are derived
// from this scroller, never from the document, so they hold under momentum scroll, rubber-banding at
// the top (scrollTop < 0 reads as "not scrolled") and a flick that crosses the threshold twice in one
// gesture: every scroll event re-derives the state from scrollTop and only commits a change.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export const SCROLL_SWAP_PX = 72;
export const SCROLL_IDLE_MS = 2500;

export type ShellScroll = {
  /** The element whose scrollTop drives the Feed (the column on expanded, the page scroller otherwise). */
  scrollerRef: RefObject<HTMLElement | null>;
  /** scrollTop > 72: the compact header holds the LensBar, the in-flow LensBar hides. */
  scrolled: boolean;
  /** A scroll event arrived in the last 2.5s while scrolled: the floating composer entry shows. */
  moving: boolean;
  scrollToTop: () => void;
};

const Ctx = createContext<ShellScroll | null>(null);

export function useShellScroll(): ShellScroll {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellScroll outside the shell");
  return v;
}

export const ShellScrollProvider = Ctx.Provider;

/**
 * Ruling 1468 (W74): a lens change never moves the bar. Called on a lens change while the header
 * holds the bar (below expanded, past SCROLL_SWAP_PX): the shell's scroller is set to the docking
 * point, the in-page seat's bottom edge, so the new lens's content starts just under the bar and
 * never above that point, and the header keeps the bar. While the bar is in the page nothing calls
 * this and the scroll stays where it is. The shell's scroller only: the window is 1457's.
 *
 * W87 (Fix PR 09): the docking point stays reachable however short the new lens is and however long
 * it takes to load. Before the scroll is set, `hold` (an invisible box the seat positions from its
 * own top) is given the height that puts its foot at the docking point plus the scroller's height,
 * so the scroller's range cannot end above the docking point and clamp it below 73. The height is
 * measured, never a constant, and re-measured whenever the scroller resizes (the toolbar collapsing
 * on iOS). The returned function releases it; the seat calls it once the bar is back in the page.
 */
export function holdLensDock(
  scroller: HTMLElement | null,
  seat: HTMLElement | null,
  hold?: HTMLElement | null,
): (() => void) | null {
  if (!scroller || !seat) return null;
  const s = scroller.getBoundingClientRect();
  const r = seat.getBoundingClientRect();
  const seatTop = r.top - s.top + scroller.scrollTop;
  const dock = Math.max(SCROLL_SWAP_PX + 1, Math.round(r.bottom - s.top + scroller.scrollTop));
  let release: (() => void) | null = null;
  if (hold) {
    const fit = () => {
      hold.style.height = Math.max(0, Math.ceil(dock + scroller.clientHeight - seatTop)) + "px";
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(scroller);
    release = () => {
      ro?.disconnect();
      hold.style.height = "0px";
    };
  }
  scroller.scrollTop = dock;
  return release;
}

/** Wire a scroller: returns the state and the onScroll handler to attach to it. Idempotent under
 *  repeated events; the idle timer restarts on every event and clears `moving` 2.5s after the last. */
export function useScrollState(scrollerRef: RefObject<HTMLElement | null>) {
  const [scrolled, setScrolled] = useState(false);
  const [moving, setMoving] = useState(false);
  const state = useRef({ scrolled: false, moving: false });
  const idle = useRef<number | null>(null);
  const commit = useCallback((s: boolean, m: boolean) => {
    if (state.current.scrolled !== s) {
      state.current.scrolled = s;
      setScrolled(s);
    }
    if (state.current.moving !== m) {
      state.current.moving = m;
      setMoving(m);
    }
  }, []);
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const on = el.scrollTop > SCROLL_SWAP_PX;
    commit(on, on);
    if (idle.current != null) window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => {
      idle.current = null;
      commit(state.current.scrolled, false);
    }, SCROLL_IDLE_MS);
  }, [scrollerRef, commit]);
  const scrollToTop = useCallback(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = 0;
    if (idle.current != null) window.clearTimeout(idle.current);
    idle.current = null;
    commit(false, false);
  }, [scrollerRef, commit]);
  useEffect(
    () => () => {
      if (idle.current != null) window.clearTimeout(idle.current);
    },
    [],
  );
  return { scrolled, moving, onScroll, scrollToTop };
}
