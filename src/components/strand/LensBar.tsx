// Strand `components/dna/LensBar.jsx`, re-synced to compile v1789885868097915 (correction 21 with
// rulings 978, 981 and 984). Icon-first control that switches the corpus of a list surface.
//
// Geometry comes from the compile (ruling 844 carrying 618's lesson: where the port and the compile
// disagree about a size, a padding, a track or a floor, the compile wins). The constants below are
// the compile's own, read out of `docs/strand/v1789885868097915/_ds_bundle.js`:
//   GAP 2, SEAT 44, TRACK_PAD 4, TRACK_BORDER 0, SEAT_BORDER 1, PAD 14, ICON 20, ICON_GAP 8.
// The track is 52 and composed 4 + 44 + 4 (ruling 918, change-list item 35): the seat is the 44 and
// the track's own padding is the 4 either side. It was a 44 track holding a 36 seat until this
// commit. Item 36 says a port matches one number, 4, and it does: the compile keeps its hairline as
// `inset 0 0 0 1px var(--line)` where it used to carry a border, and this bar has never had either
// (LENS_BAR_SPEC: "No border, no hairlines"), so TRACK_BORDER is 0 on both sides and no pixel moves.
//
// Reconciled at compile v1790212533284400 (handoff 32-A, rulings 862 and 844), which changes this
// part by correction 25 §4 (1102) alone: `trailing`, one seat at the bar's end on the track's row
// and outside the tablist, a door that is not a lens and never a tab. The fit test prices the column
// less the seat and TRAIL_GAP (8, in the metrics) and re-measures when the seat resizes. Absent, the
// bar renders exactly as before: no row is drawn and the tablist stays the wrapper's own child. The
// differences from the compile that this port keeps are listed in section 2 of
// docs/strand-ports/v1790212533284400.md. No page passes `trailing` in this port; 32-B binds it.
// Every seat carries `minWidth: SEAT` in every mode, `compact` included (rulings 905, 498; items 50
// and 54a): a lens tab is a standalone thumb target wherever it renders, so the header slot's
// `--target-min` 24 is retired. A track that cannot fit its seats at 44 scrolls; it does not shrink
// them.
//
// What a seat renders is `resolveSeat`, ported whole and exported (items 49, 58). R1 (ruling 936,
// item 40): in icon-first every seat is one 44px glyph and the active state is the chip alone — the
// active seat no longer swaps to its word, which is what made it overflow its own equal share. Since
// ruling 978 retired `dense`, nothing about what a seat renders depends on whether it is selected
// (item 56); `on` is accepted by the resolver and deliberately never read. `icons` (item 51) renders
// each seat's glyph beside its word in labels mode: this bar has drawn glyph-plus-word in labels
// mode since Brief 2, so `FeedSurface` and `ConnectSurface` pass it and render exactly as before,
// and the fit test prices the glyph and its gap when it is set.
//
// The fit test prices the packing it decides for (ruling 981, item 57), and the packing is named by
// the caller (`width`, item 24) rather than assumed:
//   seat(w) = max(SEAT, w + 2·PAD + 2·SEAT_BORDER + (icons ? ICON + ICON_GAP : 0))
//   need    = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + body
//   body    = n · seat(widest)   under width="fill"     — every seat is equal, so each holds the widest
//   body    = Σ seat(wᵢ)         under width="content"  — every seat is exactly its own label
// 981 writes the condition in rather than the answer: a packing where seats share takes the widest
// branch, and the test is extended, never assumed. Every caller here passes `fill`, which is what
// ruling 952's equal seats are, so `n · seat(widest)` is the price this app pays today.
// The probe measures the label and nothing else; the seat's own padding, border and glyph are added
// by `seat()` above, so one arithmetic change cannot pass silently through the probe's markup.
// A measurement of zero is not a measurement (item 16): the bar keeps the rendering it has and
// retries on a frame and on a 120ms timer, bounded, because a paused view never delivers a frame.
// A measurement in the wrong space is not one either (item 17): label widths come back in screen
// pixels, so they are divided by the wrapper's own scale (rect width over offsetWidth, both
// border-box, exactly 1 unscaled) before they are priced. The probe sits in a 0×0 `overflow: hidden`
// box (item 54b) so it stops contributing its own width to the scrollable overflow of the container
// it is measuring. It re-measures on resize, when the document's fonts settle and on every later
// font load (item 14), and on unmount every listener is released and the pending frame and timer
// are cancelled; a retry an earlier frame scheduled finds `alive` false and does nothing (item 18).
//
// What this port keeps against the compile, each for a named reason, is recorded in
// `docs/strand-ports/v1789885868097915.md` and, with the differences 29-A did not list, in section 2
// of `docs/strand-ports/v1790212533284400.md`. In short: the active chip is the tab's own background
// (ruling 488) and its label is 15/700 `--ink` with the C brand rung on the icon (LENS_BAR_SPEC);
// the track is `--radius-m` and the seat `--radius-badge`, not pills, because the header's composer
// entry is built to share the track's shape; the disabled seat, the haptic, the hover rung and the
// accessible name folding `scope` are the app's chassis; and the descriptor collapses by max-height
// and is latched for the visit (ruling 405), where the compile re-latches on every `collapsed`, so
// its 12 below the track sits inside the collapsing box where the compile has a 6 gap; its size is
// the compile's 13 (G82).
// Rulings 997 and 999: `Lens.icon` stays optional and `compact` requiring a glyph on every lens is a
// rule its caller keeps. Ruling 1000: `dense` is gone, and `AppHeader`'s bell reads the tier.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMode } from "@/lib/tier";
import { Icon } from "./Icon";
import type { C } from "./cmeta";

/** The compile's own constants, read from `docs/strand/v1789885868097915/_ds_bundle.js`. */
const GAP = 2;
const SEAT = 44;
const TRACK_PAD = 4;
const TRACK_BORDER = 0;
const SEAT_BORDER = 1;
const PAD = 14;
const ICON = 20;
const ICON_GAP = 8;
const TRACK = 2 * (TRACK_PAD + TRACK_BORDER);
/** Correction 25 §4: the gap between the track and a trailing seat, priced by the fit test. */
const TRAIL_GAP = 8;

/** Exported so a reader can price a bar without re-deriving it from the style objects. */
export const LENS_BAR_METRICS = {
  GAP,
  SEAT,
  TRACK_PAD,
  TRACK_BORDER,
  SEAT_BORDER,
  PAD,
  ICON,
  ICON_GAP,
  TRACK,
  TRAIL_GAP,
} as const;

/**
 * What a seat renders (change-list items 49 and 58, ruling 984). Exhaustive by domination in both
 * branches rather than by joint resolution: `iconFirst` sets `ico` unconditionally and never reads
 * `icons`, and `!iconFirst` sets `txt` unconditionally. `on` is accepted and deliberately never
 * read — since ruling 978 retired `dense`, nothing about a seat's content depends on whether it is
 * active, which is what makes the reflow unreachable rather than merely fixed.
 *
 * The final guard is not decoration. Its one live case is `iconFirst` with a lens carrying no glyph,
 * reachable only through `compact`, never through the fit test, because `canSwitch` is false unless
 * every lens has an icon (G36 point 1). That seat falls back to its word rather than rendering
 * nothing. Change-list item 59 carries the open Design question about that state; nothing here
 * decides it.
 */
export function resolveSeat(iconFirst: boolean, on: boolean, icons: boolean, hasIcon: boolean) {
  let ico = iconFirst ? true : !!(icons && hasIcon);
  let txt = !iconFirst;
  if (ico && !hasIcon) ico = false;
  if (!ico && !txt) txt = true;
  return { ico, txt };
}

export type Lens<Id extends string = string> = {
  id: Id;
  label: string;
  icon?: string | undefined;
  /** One line: what this lens shows. Folded into the accessible name and shown as the descriptor. */
  scope?: string | undefined;
  disabled?: boolean | undefined;
};

export type LensBarProps<Id extends string = string> = {
  lenses: Lens<Id>[];
  value: Id;
  onChange?: ((id: Id) => void) | undefined;
  /** The descriptor line beneath the track (the selected lens's scope). */
  scope?: string | undefined;
  /** The surface's C for the active icon. Feed passes nothing. */
  c?: C | "brand" | undefined;
  /**
   * Header slot: forces icon-first regardless of fit, stretches the track, renders no descriptor,
   * at the full 44 seat (change-list item 50). Rulings 997 and 999: the caller keeps the rule that
   * every lens in a `compact` bar carries a glyph.
   */
  compact?: boolean | undefined;
  /** Forces labels on every lens (723's `labels="always"`); otherwise the bar measures. */
  labels?: boolean | "always" | undefined;
  /**
   * The packing this bar renders, and therefore the one its fit test prices (ruling 981, item 24).
   * `fill` stretches the track and divides it into equal seats, which is ruling 952's distribution
   * and what every caller in this app renders. `content` lets each seat hug its own label; it is the
   * compile's default and is named here so the default can never change a page silently.
   */
  width?: "content" | "fill" | undefined;
  /** Renders each seat's glyph beside its word in labels mode (item 51). Priced by the fit test. */
  icons?: boolean | undefined;
  /** Host signal: the member scrolled down; the descriptor collapses, latched. */
  collapsed?: boolean | undefined;
  /**
   * Correction 25 §4 (1102). One seat at the bar's end, on the track's row and outside the tablist:
   * a door that is not a lens (My events). Never a tab. The caller supplies the control at the 44
   * floor. The fit test prices the column less the seat and TRAIL_GAP. Absent, nothing changes.
   */
  trailing?: ReactNode;
  label?: string;
  style?: CSSProperties | undefined;
};

export function LensBar<Id extends string = string>({
  lenses,
  value,
  onChange,
  scope,
  c,
  compact,
  labels,
  width = "content",
  icons,
  collapsed,
  trailing,
  label = "Lens",
  style,
}: LensBarProps<Id>) {
  const wrap = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const [showScope, setShowScope] = useState(true);
  // The compile's own initial state: the bar assumes it fits and corrects on its first measurement,
  // so a zero measurement under the guard below keeps labels rather than latching icon-first.
  const [fit, setFit] = useState(true);
  const [hov, setHov] = useState<string | null>(null);
  // Item 53 (ruling 62): `title` is a pointer affordance — it never opens on touch and it duplicates
  // the accessible name — so it renders for pointer only. `aria-label` is unconditional. Strand's
  // `useInputMode` watches `(pointer: coarse)` and falls back to `pointer`; `useMode` already does
  // exactly that, so there is no second input-mode hook and no render-prop component.
  const pointer = useMode() === "pointer";
  // `compact` forces icon-first, so it never measures (item 50).
  const canSwitch = !compact && !labels && lenses.length > 0 && lenses.every((l) => !!l.icon);
  const key =
    lenses.map((l) => l.label).join("\u0001") +
    "\u0002" +
    (icons ? "1" : "0") +
    "\u0002" +
    width +
    "\u0002" +
    (trailing ? "t" : "");
  useLayoutEffect(() => {
    if (!canSwitch) {
      setFit(true);
      return;
    }
    let alive = true;
    let raf = 0;
    let tid = 0;
    let retries = 0;
    const measure = () => {
      if (!alive || !wrap.current || !probe.current) return;
      // Two spans per lens, in order: the label as the active tab (700) and as an inactive one
      // (500). Either shape can be the rendered one, because any lens can be the selected one, so a
      // seat is priced at whichever answered larger. The compile measures one shape because its
      // seat carries one weight; this bar's active label is 15/700 (LENS_BAR_SPEC), so it measures
      // the two shapes it actually draws.
      const nodes = Array.from(probe.current.querySelectorAll<HTMLElement>("[data-probe]"));
      const per: number[] = [];
      let raw = 0;
      for (let i = 0; i < lenses.length; i++) {
        const a = nodes[2 * i]?.getBoundingClientRect().width ?? 0;
        const b = nodes[2 * i + 1]?.getBoundingClientRect().width ?? 0;
        const w = Math.max(a, b);
        per.push(w);
        raw = Math.max(raw, w);
      }
      // 25 §4: the column less the trailing seat and its gap, when there is one.
      const col =
        wrap.current.clientWidth - (trail.current ? trail.current.offsetWidth + TRAIL_GAP : 0);
      const box = wrap.current.offsetWidth;
      // Screen px per layout px; both terms are border-box, so exactly 1 unscaled (item 17).
      const scale = box > 0 ? wrap.current.getBoundingClientRect().width / box : 1;
      const widest = Math.ceil(raw / scale);
      // Item 16. A hidden or backgrounded view pauses rAF, so the retry also runs on a timer.
      if ((widest <= 0 || col <= 0) && retries < 20) {
        retries++;
        raf = requestAnimationFrame(measure);
        tid = window.setTimeout(measure, 120);
        return;
      }
      if (widest <= 0 || col <= 0) return;
      retries = 0;
      const n = lenses.length;
      const extra = icons ? ICON + ICON_GAP : 0;
      const seatW = (lw: number) => Math.max(SEAT, lw + 2 * PAD + 2 * SEAT_BORDER + extra);
      const body =
        width === "fill"
          ? n * seatW(widest)
          : per.reduce((a, r) => a + seatW(Math.ceil(r / scale)), 0);
      setFit(TRACK + GAP * (n - 1) + body <= col);
    };
    measure();
    raf = requestAnimationFrame(measure);
    const cleanups: (() => void)[] = [];
    if (typeof ResizeObserver !== "undefined" && wrap.current) {
      const ro = new ResizeObserver(measure);
      ro.observe(wrap.current);
      if (trail.current) ro.observe(trail.current);
      cleanups.push(() => ro.disconnect());
    }
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts) {
      fonts.ready.then(() => measure());
      fonts.addEventListener("loadingdone", measure);
      cleanups.push(() => fonts.removeEventListener("loadingdone", measure));
    }
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      if (tid) clearTimeout(tid);
      cleanups.forEach((f) => f());
    };
  }, [canSwitch, key]);
  const iconFirst = !!compact || (canSwitch && !fit);
  const stretch = width === "fill" || !!compact;
  // One value for the whole bar, so every seat's flex base is floored by the same padding (973).
  // `flex-basis: 0` under `box-sizing: border-box` cannot take a border box below its own padding,
  // so a padding that varies by seat divides the track unequally even when the flex does not.
  const barPad = iconFirst ? 0 : PAD;
  // Latched for the visit (405). The host reports the first scroll once; a later report never
  // re-collapses a descriptor the member has brought back by tapping the active lens.
  const latched = useRef(false);
  useEffect(() => {
    if (!collapsed || latched.current) return;
    latched.current = true;
    setShowScope(false);
  }, [collapsed]);
  const rm =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tr = (p: string[]) =>
    rm ? "none" : p.map((x) => x + " var(--dur-default) var(--ease)").join(", ");
  const hue = c && c !== "brand" ? "var(--c-" + c + ")" : "var(--ink)";
  const tablist = (
    <div
      role="tablist"
      aria-label={label}
      data-lensbar={iconFirst ? "icon-first" : "labels"}
      data-lensbar-width={width}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        alignSelf: stretch ? "stretch" : "flex-start",
        // 25 §4: beside a trailing seat a stretched track takes what the seat leaves and a content
        // track can shrink and scroll; without one these are exactly as before.
        width: stretch ? (trailing ? undefined : "100%") : undefined,
        flex: trailing ? (stretch ? "1 1 0" : "0 1 auto") : undefined,
        minWidth: trailing ? 0 : undefined,
        maxWidth: "100%",
        // 4 + 44 + 4 = 52 (918, item 35). The height is the seats' own floor plus this padding;
        // nothing here sets a track height, so the seat is what the track is made of.
        padding: TRACK_PAD,
        gap: GAP,
        background: "var(--bg-sunken)",
        borderRadius: "var(--radius-m)",
        overflowX: "auto",
        boxSizing: "border-box",
      }}
    >
      {lenses.map((l) => {
        const on = l.id === value;
        const dis = !!l.disabled;
        const { ico, txt } = resolveSeat(iconFirst, on, !!icons, !!l.icon);
        const tap = () => {
          if (dis) return;
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
          if (on) {
            setShowScope((v) => !v);
            return;
          }
          onChange?.(l.id);
        };
        return (
          <button
            key={l.id}
            role="tab"
            aria-selected={on}
            aria-disabled={dis || undefined}
            tabIndex={dis ? -1 : undefined}
            aria-label={l.scope ? l.label + ": " + l.scope : l.label}
            title={!txt && pointer ? l.label : undefined}
            type="button"
            data-lens={l.id}
            onClick={tap}
            onMouseEnter={() => setHov(l.id)}
            onMouseLeave={() => setHov(null)}
            style={{
              all: "unset",
              boxSizing: "border-box",
              position: "relative",
              zIndex: 1,
              cursor: dis ? "default" : "pointer",
              // Ruling 952 (G48) and item 46: every seat takes the same share, so selection is not
              // a layout input. Equal flex is what `fill` means; under `content` each seat hugs its
              // own label, which is the compile's own default and no caller here passes it.
              flex: stretch ? "1 1 0" : undefined,
              // Item 54a, rulings 905 and 498: the floor is 44 in every mode, `compact` included.
              // It was `--target-min` (24) in the header slot and unset in labels mode.
              minWidth: SEAT,
              minHeight: SEAT,
              padding: "0 " + barPad + "px",
              borderRadius: "var(--radius-badge)",
              // The active tab is its own indicator (ruling 488): the chip is the tab's own
              // background, painted on the first frame, never measured and never missing.
              background: on ? "var(--surface)" : "transparent",
              boxShadow: on ? "var(--shadow-1)" : "none",
              // Item 42: the placeholder border is load-bearing, because the disabled seat draws a
              // dashed one and the seat must not change width when a flag flips. `box-sizing:
              // border-box` is what keeps it at 44 rather than 46 under `all: unset` (item 43).
              border: dis
                ? SEAT_BORDER + "px dashed var(--line-strong)"
                : SEAT_BORDER + "px solid transparent",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: on ? 700 : 500,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ICON_GAP,
              color: dis ? "var(--ink-4)" : on || hov === l.id ? "var(--ink)" : "var(--ink-3)",
              transition: tr(["color", "background"]),
            }}
          >
            {ico && l.icon && <Icon name={l.icon} size={ICON} style={on ? { color: hue } : {}} />}
            {txt && <span>{l.label}</span>}
          </button>
        );
      })}
    </div>
  );
  return (
    <div
      ref={wrap}
      className="strand-lens"
      data-lens-bar={compact ? "compact" : "flow"}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        maxWidth: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      <style>
        {".strand-lens [role=tab]:focus-visible{outline:2px solid var(--focus);outline-offset:2px}"}
      </style>
      {canSwitch && (
        // Item 54b: the probe sits inside a 0×0 `overflow: hidden` box — clipped for overflow, so it
        // adds nothing to the scrollable width of the container it measures, still laid out, still
        // read through getBoundingClientRect, which is the box's own laid-out width on every engine.
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            ref={probe}
            style={{ position: "absolute", top: 0, left: 0, display: "inline-flex" }}
          >
            {lenses.map((l) =>
              (["active", "inactive"] as const).map((role) => (
                // The label and nothing else. Its seat's padding, border and glyph are added by
                // `seatW` in the measurement, so the price and the markup cannot drift apart.
                <span
                  key={l.id + ":" + role}
                  data-probe={role}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    fontWeight: role === "active" ? 700 : 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.label}
                </span>
              )),
            )}
          </div>
        </div>
      )}
      {trailing ? (
        <div
          data-lensbar-row=""
          style={{ display: "flex", alignItems: "center", gap: TRAIL_GAP, minWidth: 0 }}
        >
          {tablist}
          <div
            ref={trail}
            data-lensbar-trailing=""
            style={{ flex: "none", marginLeft: "auto", display: "flex", alignItems: "center" }}
          >
            {trailing}
          </div>
        </div>
      ) : (
        tablist
      )}
      {scope && !compact && (
        <div
          aria-live="polite"
          data-lens-scope
          data-open={showScope ? "1" : "0"}
          style={{
            // 72 rather than 40: Connect's scope lines wrap to two lines on compact (Brief 4) and a
            // 40 cap clipped the second line. The collapse still animates to 0.
            maxHeight: showScope ? 72 : 0,
            overflow: "hidden",
            transition: rm ? "none" : "max-height var(--dur-default) var(--ease)",
          }}
        >
          <div
            style={{
              // The compile's 13 (G82, closed under 844); 12 below the track rather than the
              // compile's 6 gap, inside the collapsing box, as both app contracts give it (405).
              fontStyle: "italic",
              fontSize: 13,
              lineHeight: 1.4,
              color: "var(--ink-3)",
              padding: "12px 4px 0",
            }}
          >
            {scope}
          </div>
        </div>
      )}
    </div>
  );
}

// The compile exposes both on the part itself, so a state table is a table over the real resolver
// rather than a copy of it (item 49).
LensBar.resolveSeat = resolveSeat;
LensBar.metrics = LENS_BAR_METRICS;
