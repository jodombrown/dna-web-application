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
