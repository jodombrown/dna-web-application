// Design pass 01, strand-patch/LensBar.jsx (rulings 405, 488; supersedes the B2-Shell-Feed-v3
// patch). Icon-first control that switches the corpus of a list surface.
// Track: --bg-sunken, --radius-m, 4 padding, 44 tall at every tier, compact included (W35),
// bounded left and right. The active tab carries the --surface chip itself (--radius-badge,
// --shadow-1), so the indicator is painted on the first frame and on every resize and cannot be
// missing (W34, ruling 488); the measured absolute chip that used to be the only indicator is gone,
// and nothing about the indicator depends on a layout read any more. Inactive lenses are bare icons
// sharing the remaining width (icon only below expanded, icon plus label at expanded via `labels`).
// The explainer collapse is latched for the visit (405): the first scroll the host reports collapses
// the descriptor and it stays collapsed; tapping the active lens brings it back, and that tap does
// not unlatch the scroll rule. Tabs resolve to --target-min (ruling 498). Active icon
// carries the surface's C brand rung (`c`); Feed is not a C, so --ink. Descriptor: sans italic,
// --ink-3, 12 below the track; collapses (max-height) when `collapsed` flips true, latched; tapping
// the active lens toggles it back. Disabled lenses keep their seat (dashed hairline). Accessible
// name "{label}: {scope}". Light haptic on accepted taps. `compact`: header slot, no descriptor,
// inactive lenses min 32. `dense`: the active lens shows its name in place of its icon.
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
  dense?: boolean | undefined;
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
  dense,
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
    const measure = () => {
      if (track.current && probe.current)
        setFit(Math.ceil(probe.current.getBoundingClientRect().width) <= track.current.clientWidth);
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
            {lenses.map((l) => (
              <span
                key={l.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 14px",
                  fontSize: 15,
                  fontWeight: 700,
                  border: "1px solid transparent",
                  boxSizing: "border-box",
                }}
              >
                {l.icon && <span style={{ width: 20, height: 20, flex: "none" }} />}
                {l.label}
              </span>
            ))}
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
          const ico = !!l.icon && !(on && dense);
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
                flex: on ? "none" : "1 1 0",
                minWidth: compact ? "var(--target-min)" : 44,
                minHeight: "var(--target-min)",
                height: 36,
                padding: on ? (dense ? "0 10px" : "0 14px") : "0 8px",
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
