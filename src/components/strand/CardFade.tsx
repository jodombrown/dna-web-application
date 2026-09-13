// Design pass 01, strand-patch/CardFade.jsx plus two tokens (W37, ruling 489). A card loses opacity
// across --fade-under-distance, measured up from the sticky bar's bottom edge, on --fade-under-ease.
// Nothing translates and nothing scales, so the list does not appear to move under the reader.
// Reduced motion holds opacity at 1, because the fade is decoration. Applied on Connect and on Feed.
//
// The fade is scroll-driven, so it cannot be a CSS transition: one shared rAF loop per scroller
// writes opacity straight onto each registered element. No React state, no per-card listener.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Kept in sync with --fade-under-distance and --fade-under-ease in tokens/spacing.css. */
export const FADE_UNDER_DISTANCE = 96;

/** cubic-bezier(0.2, 0, 0, 1), sampled. Newton is overkill for one decoration curve. */
function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const bez = (u: number, a: number, b: number) =>
    3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (bez(mid, 0.2, 0) < t) lo = mid;
    else hi = mid;
  }
  return bez((lo + hi) / 2, 0, 1);
}

type Entry = { el: HTMLElement; top: () => number };
type Group = { entries: Set<Entry>; run: () => void; detach: () => void };

const groups = new WeakMap<EventTarget, Group>();

function groupFor(scroller: HTMLElement | null): Group {
  const target: EventTarget = scroller ?? window;
  const existing = groups.get(target);
  if (existing) return existing;
  const entries = new Set<Entry>();
  let queued = false;
  const paint = () => {
    queued = false;
    for (const e of entries) {
      const bar = e.top();
      const y = e.el.getBoundingClientRect().top;
      const d = y - bar;
      const p = d >= 0 ? 1 : d <= -FADE_UNDER_DISTANCE ? 0 : 1 + d / FADE_UNDER_DISTANCE;
      e.el.style.opacity = String(ease(p));
    }
  };
  const run = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  target.addEventListener("scroll", run, { passive: true });
  window.addEventListener("resize", run, { passive: true });
  const group: Group = {
    entries,
    run,
    detach: () => {
      target.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
      groups.delete(target);
    },
  };
  groups.set(target, group);
  return group;
}

export type CardFadeProps = {
  /**
   * The sticky bar the card passes under. A selector is resolved live on each frame, so a bar that
   * swaps between the column and the header (the Feed past 72px) needs no re-registration.
   * Falls back to `stickyBottom` when nothing matches.
   */
  stickySelector?: string | undefined;
  /** Viewport-relative y of the sticky bar's bottom edge, in px, when there is no element. */
  stickyBottom: number;
  /** The element the card scrolls inside. Omitted means the page. */
  scroller?: HTMLElement | null | undefined;
  children: ReactNode;
  style?: CSSProperties | undefined;
};

export function CardFade({
  stickySelector,
  stickyBottom,
  scroller,
  children,
  style,
}: CardFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const bar = useRef<() => number>(() => stickyBottom);
  bar.current = () => {
    if (stickySelector) {
      const el = document.querySelector(stickySelector);
      if (el) return el.getBoundingClientRect().bottom;
    }
    return stickyBottom;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.style.opacity = "1";
      return;
    }
    const g = groupFor(scroller ?? null);
    const entry: Entry = { el, top: () => bar.current() };
    g.entries.add(entry);
    g.run();
    return () => {
      g.entries.delete(entry);
      el.style.opacity = "1";
      if (g.entries.size === 0) g.detach();
    };
  }, [scroller]);
  return (
    <div ref={ref} data-card-fade style={style}>
      {children}
    </div>
  );
}
