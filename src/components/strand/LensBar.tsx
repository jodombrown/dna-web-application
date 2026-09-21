// Design pass 01, strand-patch/LensBar.jsx (rulings 405, 488; supersedes the B2-Shell-Feed-v3
// patch). Icon-first control that switches the corpus of a list surface.
// Track: --bg-sunken, --radius-m, 4 padding, 44 tall at every tier, compact included (W35),
// bounded left and right. The 44 is the track's own height and not the seat's: each tab inside it
// is height 36 with minHeight --target-min, which `src/styles/strand.css` sets to 24px. The active
// tab carries the --surface chip itself (--radius-badge, --shadow-1), so the indicator is painted
// on the first frame and on every resize and cannot be missing (W34, ruling 488); the measured
// absolute chip that used to be the only indicator is gone, and nothing about the indicator depends
// on a layout read any more. Every lens takes an equal share of the track (ruling 952): the active
// tab used to be content-sized, which made selecting one re-divide the track and move every seat
// under the finger that chose it, logged as G48. Inactive lenses are bare icons (icon only below
// expanded, icon plus label at expanded via `labels`). The explainer collapse is latched for
// the visit (405): the first scroll the host reports collapses the descriptor and it stays
// collapsed; tapping the active lens brings it back, and that tap does not unlatch the scroll rule.
// Tabs resolve to --target-min (ruling 498): minHeight always, and minWidth only under `compact`,
// which is 44 otherwise. Active icon carries the surface's C brand rung (`c`); Feed is not a C, so
// --ink, and the active label is --ink on the --surface chip rather than any C rung. Descriptor:
// sans italic, --ink-3, 12 below the track; collapses (max-height) when `collapsed` flips true,
// latched; tapping the active lens toggles it back. Disabled lenses keep their seat (dashed
// hairline). Accessible name "{label}: {scope}". Light haptic on accepted taps. `compact`: header
// slot, no descriptor, inactive lenses minWidth --target-min, which is 24 and not 32. `dense` is
// gone with ruling 1000: it suppressed the active lens's icon, so the one lens the member had just
// chosen was the one lens that stopped showing what it was, and the active tab is the only tab that
// already renders its label. The active lens now renders its icon at every tier, like every other
// lens. Its only caller was `AppHeader`, whose bell condition read the same flag for an unrelated
// question and now reads the tier instead (see `AppHeader`). Its own active-tab padding step is gone
// with ruling 952: one padding for every state, because a padding that varies by selection varies
// the seat (see the tab's style below). Ruling 905 takes the seat to 44; the mechanism is pending
// Design, which chooses between a 52px track and a zero-padding 44px track, and nothing here
// implements it.
// Correction 14 (ruling 723, re-synced at compile v1789537371639386): labels-fit. The bar measures
// whether every lens label fits the track at once; when it does, every lens renders its label; when
// it does not, the bar renders icon-first: the active lens its icon and label, every other lens its
// icon with an accessible name. The switch is a rendering decision inside the part, not a caller
// prop; `labels` forces labels for sets that always fit. No motion on the switch. A set without
// icons on every lens never switches, because it has nothing to fall back to.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "./Icon";
import type { C } from "./cmeta";

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
  compact?: boolean | undefined;
  /** Forces labels on every lens (723's `labels="always"`); otherwise the bar measures. */
  labels?: boolean | "always" | undefined;
  /** Host signal: the member scrolled down; the descriptor collapses, latched. */
  collapsed?: boolean | undefined;
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
  collapsed,
  label = "Lens",
  style,
}: LensBarProps<Id>) {
  const track = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [showScope, setShowScope] = useState(true);
  // 723: does every label fit the track at once? Measured on a hidden probe laid out as labels.
  const [fit, setFit] = useState(false);
  const canSwitch = !labels && lenses.length > 0 && lenses.every((l) => !!l.icon);
  const key = lenses.map((l) => l.label).join("\u0001");
  // Session 23 (the founder's iPhone at 390 against the deployed bar): labels rendered over their
  // neighbours' icons because the measurement had answered "fits" for labels that did not. Two
  // things in the first version could do that and both are gone. The probe sat inside a zero-size
  // clipped box and was read through scrollWidth, a value a clipped ancestor is allowed to change
  // (iOS Safari is the suspect; unproven here, Moderate); it now sits off-screen to the left,
  // unclipped and unconstrained, and is read through getBoundingClientRect, which is the box's own
  // laid-out width on every engine. And the measurement ran once at mount and again only when the
  // track resized, so a web font arriving after hydration (font-display: swap on a phone link)
  // widened every label with no re-measure; it now re-measures when the document's fonts settle
  // and on every later font load. Off-screen to the left adds no scrollable overflow in a
  // left-to-right document, which is what the clipped box was for.
  useLayoutEffect(() => {
    if (!canSwitch) {
      setFit(true);
      return;
    }
    // The fit test matches the layout it decides for. That rule is why run 239 caught the founder's
    // screenshot — the sum test passed while "network" sat at 86px of content inside a 72px share —
    // and it is why this arithmetic changed when ruling 952 changed the distribution. The track now
    // divides equally: every tab takes flex: 1 1 0 and a seat is the same width whichever lens is
    // active. So the test is one seat against the widest label in either shape it can be rendered
    // in, times the number of seats, with the gaps and the track's padding; otherwise icon-first.
    // Equal seats are the stricter test of the two, because the widest label has to fit one seat
    // rather than the whole track minus the others' shares. That moves G37's boundary and G48
    // records it.
    //
    // Ruling 981 names why: the fit price is packing-specific, not a property of the labels. Under
    // fill packing — every tab `flex: 1 1 0`, which is what this track does since 952 — the price is
    // `n × seat(widest)`, because the widest label sets a floor every seat must clear. Under content
    // packing, where each tab sizes to its own label, the price is the exact sum of the labels. Both
    // are correct arithmetic for the layout they price, and the sum test that run 239 caught was the
    // content price applied to a track that fills. So the one thing that must never drift is the
    // pairing: change the packing and this expression changes with it, in the same commit. This
    // component has no packing prop and always fills, so `n × seat` is its price and the only price
    // it has.
    const measure = () => {
      if (!track.current || !probe.current) return;
      let activeMax = 0;
      let inactiveMax = 0;
      probe.current.querySelectorAll<HTMLElement>("[data-probe]").forEach((el) => {
        const w = el.getBoundingClientRect().width;
        if (el.getAttribute("data-probe") === "active") activeMax = Math.max(activeMax, w);
        else inactiveMax = Math.max(inactiveMax, w);
      });
      const n = lenses.length;
      const others = Math.max(0, n - 1);
      // A seat has to hold its label as the active tab (bold, 14px sides) and as an inactive one
      // (medium, 8px sides), because any lens can be the selected one. Both shapes are measured
      // rather than the wider one assumed: the probe renders each label twice and the seat takes
      // whichever answered larger.
      const seat = Math.max(activeMax, inactiveMax);
      const need = 8 + others * 2 + n * seat;
      setFit(Math.ceil(need) <= track.current.clientWidth);
    };
    measure();
    const cleanups: (() => void)[] = [];
    if (typeof ResizeObserver !== "undefined" && track.current) {
      const ro = new ResizeObserver(measure);
      ro.observe(track.current);
      cleanups.push(() => ro.disconnect());
    }
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (fonts) {
      let live = true;
      fonts.ready.then(() => {
        if (live) measure();
      });
      const onDone = () => measure();
      fonts.addEventListener("loadingdone", onDone);
      cleanups.push(() => {
        live = false;
        fonts.removeEventListener("loadingdone", onDone);
      });
    }
    return () => cleanups.forEach((c) => c());
  }, [canSwitch, key]);
  const iconFirst = canSwitch && !fit;
  const [hov, setHov] = useState<string | null>(null);
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
  return (
    <div
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
        // The probe: the labels laid out as the track lays them out, hidden and off-screen to the
        // left, where it adds no scrollable overflow and nothing clips it, so its own laid-out width
        // is the labels' natural width (see the measurement above).
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: -10000,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            ref={probe}
            style={{
              display: "inline-flex",
              width: "max-content",
              gap: 2,
              padding: 4,
              boxSizing: "border-box",
              whiteSpace: "nowrap",
            }}
          >
            {lenses.map((l) =>
              (["active", "inactive"] as const).map((role) => (
                // Each label twice: as the active tab (bold) and as an inactive one (medium), the
                // two shapes the track renders. The side padding is the track's own single value
                // (952), so weight is the only thing that separates the two measurements.
                <span
                  key={l.id + ":" + role}
                  data-probe={role}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 8px",
                    fontSize: 15,
                    fontWeight: role === "active" ? 700 : 500,
                    border: "1px solid transparent",
                    boxSizing: "border-box",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.icon && <span style={{ width: 20, height: 20, flex: "none" }} />}
                  {l.label}
                </span>
              )),
            )}
          </div>
        </div>
      )}
      <div
        ref={track}
        role="tablist"
        aria-label={label}
        data-lensbar={iconFirst ? "icon-first" : "labels"}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: 44,
          padding: 4,
          gap: 2,
          background: "var(--bg-sunken)",
          borderRadius: "var(--radius-m)",
          overflowX: "auto",
          boxSizing: "border-box",
        }}
      >
        {lenses.map((l) => {
          const on = l.id === value;
          const dis = !!l.disabled;
          const txt = on || !iconFirst;
          const ico = !!l.icon;
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
              title={!txt ? l.label : undefined}
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
                // Ruling 952 (G48): every seat takes the same share, so selection is not a layout
                // input. The active tab used to take `none` and size to its content, which made a
                // tap re-divide the track and slide every other seat under the finger — measured at
                // 390 on the Feed's five lenses as up to 27px of shift on one selection. Nothing
                // about the indicator changes: it is still this tab's own background (488).
                flex: "1 1 0",
                minWidth: compact ? "var(--target-min)" : 44,
                minHeight: "var(--target-min)",
                height: 36,
                // One padding for every state, and this is part of 952 rather than a tidy-up.
                // `flex-basis: 0` under `box-sizing: border-box` cannot take a border box below its
                // own padding, so the padding is a floor on the base size and only what is left
                // over is divided equally: with the active tab at 14px sides and the others at 8,
                // the seats came out 78 and 66 at 390 and the tap still moved them. Under equal
                // seats the side padding has no visual role — the chip is the seat and the content
                // is centred in it — so it is uniform, and the smaller value leaves the label the
                // most room before it overflows its seat.
                padding: "0 8px",
                borderRadius: "var(--radius-badge)",
                // The active tab is its own indicator (ruling 488): the chip is the tab's own
                // background, painted on the first frame, never measured and never missing.
                background: on ? "var(--surface)" : "transparent",
                boxShadow: on ? "var(--shadow-1)" : "none",
                border: dis ? "1px dashed var(--line-strong)" : "1px solid transparent",
                fontSize: 15,
                fontWeight: on ? 700 : 500,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: dis ? "var(--ink-4)" : on || hov === l.id ? "var(--ink)" : "var(--ink-3)",
                transition: tr(["color", "background"]),
              }}
            >
              {ico && l.icon && <Icon name={l.icon} size={20} style={on ? { color: hue } : {}} />}
              {txt && <span>{l.label}</span>}
            </button>
          );
        })}
      </div>
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
              fontStyle: "italic",
              fontSize: 15,
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
