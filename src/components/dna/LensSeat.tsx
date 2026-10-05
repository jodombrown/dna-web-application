// The lens bar's one seat (ruling 1466, W71; Fix PR 08). Feed, Connect and Convene each wrapped
// their own bar, and Connect's wrapper added 8px of top padding, so its bar sat lower than the other
// two. The seat owns the bar's spacing and position on every lens surface, and the bar's packing
// with it: icon and word on every lens at every tier (1465, W72). At medium and expanded the bar is
// justified (1502 as 1504 reads it): each seat starts at its own word's width and the column's
// remaining width is shared equally, so the track spans the column; where the words do not fit,
// LensBar renders the sideways strip instead and this seat scrolls it, never dropping a label. That
// is the default for every surface that takes this seat; only Discovery's lens row (`LensSeatRow`,
// 1170) keeps its `min-content` bar. At compact the bar is the strip, each seat its own word.
//
// Where the seat puts the bar, by tier:
//   - Below expanded, `flow`: in the shell's scroller at the top of the column, so the column's own
//     top padding (12 at compact, 24 at medium) is the bar's distance from the header on every
//     surface. Past 72px the header holds the surface's registered bar (947, 1467) and this one
//     keeps its space hidden. At compact the row scrolls sideways and the page never does; on mount
//     and on every lens change the active lens is scrolled into the row's view.
//   - At expanded, `pinned`: sticky in the column on the column's ground. A seat that opens the
//     column (Connect) carries 24 above the bar; the Feed's seat follows the composer and the
//     greeting, and keeps the 589 clearance under the greeting (`follows="greeting"`).
//   - Discovery at medium and expanded, `LensSeatRow`: the shell's lens row (946) above the lanes,
//     with 24 above the bar, the same 24 the column gives a medium bar and Connect's expanded bar.
//
// A lens change while the header holds the bar sets the shell's scroller to the docking point
// through `holdLensDock` (1468, W74), on all three surfaces; with the bar in the page the scroll
// stays where it is.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { LensBar, type Lens } from "@/components/strand/LensBar";
import type { C } from "@/components/strand/cmeta";
import { holdLensDock, useShellScroll } from "@/lib/shell-scroll";
import { useTier } from "@/lib/tier";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The distance above the bar where the seat opens its column or row (the medium column's 24). */
const SEAT_TOP = 24;
/** Below expanded: tall enough that "just below the bar" is past the 72px header swap. */
const FLOW_MIN = 64;

export type LensSeatBarProps<Id extends string> = {
  lenses: Lens<Id>[];
  value: Id;
  onChange?: ((id: Id) => void) | undefined;
  scope?: string | undefined;
  c?: C | "brand" | undefined;
  label?: string | undefined;
  collapsed?: boolean | undefined;
};

/**
 * The bar as every seat renders it: labels always, icons beside them. `column` is justified across
 * its column (`justify`, 1502, 1504), the seat's default at medium and expanded; `strip` is the
 * compact row's `max-content` root, each seat its own word (`content`, 1145), wider than the column
 * and scrolled sideways by the seat; `row` is Discovery's lens row, `min-content` and centred (1170).
 */
export function LensSeatBar<Id extends string>({
  lenses,
  value,
  onChange,
  scope,
  c,
  label,
  collapsed,
  shape,
}: LensSeatBarProps<Id> & { shape: "strip" | "row" | "column" }) {
  const style: CSSProperties | undefined =
    shape === "strip"
      ? { width: "max-content", maxWidth: "none" }
      : shape === "row"
        ? { width: "min-content", marginInline: "auto" }
        : undefined;
  return (
    <LensBar
      lenses={lenses}
      value={value}
      onChange={onChange}
      scope={scope}
      c={c}
      label={label ?? "Lens"}
      labels="always"
      width={shape === "column" ? "justify" : "content"}
      icons
      collapsed={collapsed}
      style={style}
    />
  );
}

export type LensSeatProps<Id extends string> = LensSeatBarProps<Id> & {
  /** At expanded: the Feed's seat follows its greeting rather than opening the column. */
  follows?: "greeting" | undefined;
  /** At expanded: the sticky offset (the Feed's pinned composer above the seat). */
  pinTop?: number | undefined;
  /** At expanded: the Feed's pinned state, carried as `data-stuck` for its own readers. */
  stuck?: boolean | undefined;
  /** The seat's element, for a surface that measures it (the Feed's 109 placement). */
  seatRef?: RefObject<HTMLDivElement | null> | undefined;
};

export function LensSeat<Id extends string>({
  follows,
  pinTop = 0,
  stuck,
  seatRef,
  collapsed,
  ...bar
}: LensSeatProps<Id>) {
  const tier = useTier();
  const expanded = tier === "expanded";
  const compact = tier === "compact";
  const { scrollerRef, scrolled } = useShellScroll();
  const own = useRef<HTMLDivElement | null>(null);
  const attach = (el: HTMLDivElement | null) => {
    own.current = el;
    if (seatRef) seatRef.current = el;
  };

  // 1465 item 2: the active lens in the sideways row's view, on mount and on every lens change, and
  // again once the document's fonts settle, because the seats' widths are the words' own. Every tier:
  // at medium and expanded the row scrolls only when the justified bar has fallen back to the strip.
  useIsoLayoutEffect(() => {
    const row = own.current;
    if (!row) return;
    const reveal = () => {
      if (row.scrollWidth <= row.clientWidth + 1) return;
      const tab = row.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!tab) return;
      const r = row.getBoundingClientRect();
      const t = tab.getBoundingClientRect();
      if (t.left < r.left) row.scrollLeft -= r.left - t.left;
      else if (t.right > r.right) row.scrollLeft += t.right - r.right;
    };
    reveal();
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) reveal();
    });
    return () => {
      live = false;
    };
  }, [bar.value, expanded]);

  // 1468: a lens change while the header holds the bar keeps it there. The first render is not a
  // change, so the value is compared with the one the seat last placed for.
  const placed = useRef(bar.value);
  const docked = useRef(false);
  docked.current = !expanded && scrolled;
  useIsoLayoutEffect(() => {
    if (placed.current === bar.value) return;
    placed.current = bar.value;
    if (docked.current) holdLensDock(scrollerRef.current, own.current);
  }, [bar.value, scrollerRef]);

  const style: CSSProperties = expanded
    ? {
        position: "sticky",
        top: pinTop,
        zIndex: 5,
        background: "var(--bg)",
        // 1504: the strip a justified bar falls back to scrolls here; otherwise nothing overflows.
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
        ...(follows === "greeting"
          ? // Ruling 589: the 12 above the bar is the greeting's clearance, painted by the shadow.
            { padding: "12px 0", margin: "-12px 0", boxShadow: "0 -12px 0 0 var(--bg)" }
          : { padding: `${SEAT_TOP}px 0 12px`, marginBottom: -12 }),
      }
    : {
        visibility: scrolled ? "hidden" : "visible",
        minHeight: FLOW_MIN,
        minWidth: 0,
        background: "var(--bg)",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "none",
      };
  return (
    <div
      ref={attach}
      data-lens-anchor
      data-lens-seat={expanded ? "pinned" : "flow"}
      data-stuck={stuck === undefined ? undefined : stuck ? "1" : "0"}
      style={style}
    >
      <style>{"[data-lens-seat]::-webkit-scrollbar{display:none}"}</style>
      <LensSeatBar
        {...bar}
        collapsed={collapsed ?? scrolled}
        shape={compact ? "strip" : "column"}
      />
    </div>
  );
}

/** Discovery's seat at medium and expanded: the shell's lens row (946), the bar and the search. */
export function LensSeatRow({ children }: { children: ReactNode }) {
  return (
    <div data-lens-seat="row" style={{ paddingTop: SEAT_TOP, minWidth: 0 }}>
      {children}
    </div>
  );
}
