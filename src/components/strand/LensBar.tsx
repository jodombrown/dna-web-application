// Ported from the B2-Shell-Feed-v3 extraction, shell/strand-patch/LensBar.jsx (ruling 102 plus
// shell/LENS_BAR_SPEC.md). Icon-first control that switches the corpus of a list surface.
// Track: --bg-sunken, --radius-m, 4 padding, 44 tall, bounded left and right. The active lens is a
// content-sized --surface chip (--radius-badge, --shadow-1) positioned absolutely and moved by
// transform and width (never reflowing siblings). Inactive lenses are bare icons sharing the
// remaining width (icon only below expanded, icon plus label at expanded via `labels`). Active icon
// carries the surface's C brand rung (`c`); Feed is not a C, so --ink. Descriptor: sans italic,
// --ink-3, 12 below the track; collapses (max-height) when `collapsed` flips true, latched; tapping
// the active lens toggles it back. Disabled lenses keep their seat (dashed hairline). Accessible
// name "{label}: {scope}". Light haptic on accepted taps. `compact`: header slot, no descriptor,
// inactive lenses min 32. `dense`: the active lens shows its name in place of its icon.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
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
  /** Inactive lenses show icon plus label (expanded tier). */
  labels?: boolean | undefined;
  /** Host signal: the member scrolled down; the descriptor collapses, latched. */
  collapsed?: boolean | undefined;
  label?: string;
  style?: CSSProperties | undefined;
};

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

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
  const [chip, setChip] = useState<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [showScope, setShowScope] = useState(true);
  const [hov, setHov] = useState<string | null>(null);
  useEffect(() => {
    if (collapsed) setShowScope(false);
  }, [collapsed]);
  const measure = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const b = t.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!b) {
      setChip(null);
      return;
    }
    setChip({ x: b.offsetLeft, w: b.offsetWidth });
  }, []);
  useIsoLayoutEffect(() => {
    measure();
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [measure, value, lenses.length, compact, dense, labels]);
  useEffect(() => {
    const t = track.current;
    if (!t || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    const b = t.querySelector<HTMLElement>('[aria-selected="true"]');
    if (b) ro.observe(b);
    return () => ro.disconnect();
  }, [measure, value]);
  const rm =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tr = (p: string[]) =>
    rm || !ready ? "none" : p.map((x) => x + " var(--dur-default) var(--ease)").join(", ");
  const hue = c && c !== "brand" ? "var(--c-" + c + ")" : "var(--ink)";
  return (
    <div
      className="strand-lens"
      data-lens-bar={compact ? "compact" : "flow"}
      style={{
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
      <div
        ref={track}
        role="tablist"
        aria-label={label}
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
        {chip && (
          <span
            aria-hidden="true"
            data-lens-chip
            style={{
              position: "absolute",
              top: 4,
              bottom: 4,
              left: 0,
              width: chip.w,
              transform: "translateX(" + chip.x + "px)",
              borderRadius: "var(--radius-badge)",
              background: "var(--surface)",
              boxSizing: "border-box",
              boxShadow: "var(--shadow-1)",
              transition: tr(["transform", "width"]),
              pointerEvents: "none",
            }}
          />
        )}
        {lenses.map((l) => {
          const on = l.id === value;
          const dis = !!l.disabled;
          const txt = on || !!labels;
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
                minWidth: compact ? 32 : 44,
                height: 36,
                padding: on ? (dense ? "0 10px" : "0 14px") : "0 8px",
                borderRadius: "var(--radius-badge)",
                border: dis ? "1px dashed var(--line-strong)" : "1px solid transparent",
                fontSize: 15,
                fontWeight: on ? 700 : 500,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: dis ? "var(--ink-4)" : on || hov === l.id ? "var(--ink)" : "var(--ink-3)",
                transition: tr(["color"]),
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
