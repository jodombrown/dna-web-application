// Strand `components/dna/FacetRail.jsx`, ported at compile v1789885868097915 (ruling 851 names it
// as scope). The compiled function is byte-identical between the correction 17 and correction 21
// bundles, so this is a first port rather than a re-sync.
//
// Rulings the compiled part cites in its own doc comment: 561, 586, 589, 102, 79, 687, 688 and 725.
// Filters for a list surface. At expanded it is a sticky rail in its own column; at medium the same
// rail; at compact it is a trigger plus the same body inside a Sheet, which is a rendering and not a
// mode. `mode="single"` is one selection across the rail, exposed through `onChange` as
// `{ [axisId]: [optionId] }`; the caller owns the route and the rail never navigates.
// `mode="collapsed"` is a 64px icon strip (612 as amended by 725): one 48px square per axis, named
// from the axis label, tinted when any option in that axis is set. A square is not a control over an
// option — it expands the rail through `onExpand`.
// Arrow keys move focus only; Enter, Space or a click selects (688).
//
// Two things the app's own tree decides rather than the compile:
//   - The compact rendering goes through this repository's `Sheet` as `variant="sheet"` (ruling 618:
//     Strand's Sheet replaced `variant` and `width` with `tier` and `size`, and a caller passing
//     `variant="sheet"` wants `tier="compact"`). Ruling 605's repo-side Sheet migration is
//     unstarted, logged as G30.
//   - The compiled call passes `title`, which Strand's Sheet renders as a visible heading. This
//     repository's `Sheet` has no heading prop at all — it focuses `[data-sheet-heading]` when a
//     caller supplies one but renders none itself — so `title` lands on `label`, the dialog's
//     accessible name, and the rail's heading is drawn by this part instead, which is what every
//     other Sheet caller in this tree does. Recorded against G30 rather than given a number of its
//     own, because G30 is ruling 605's Sheet migration.
//
// Nothing in `src/` binds this part yet, so ruling 755's page proof and ruling 627's proof by a
// person performing the act fall to the first brief that binds it (7, 9 or 10).
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

export type FacetOption = {
  id: string;
  label: string;
  /** Rendered, disabled and dimmed: an option the corpus cannot serve yet. */
  parked?: boolean | undefined;
};

export type FacetAxis = {
  id: string;
  label: string;
  /** Strand glyph name, used by the collapsed strip (725). */
  icon?: string | undefined;
  options?: FacetOption[] | undefined;
};

/** Selected option ids per axis. An axis with nothing selected carries no key. */
export type FacetValue = Record<string, string[]>;

export type FacetRailProps = {
  axes?: FacetAxis[];
  value?: FacetValue;
  onChange?: ((next: FacetValue) => void) | undefined;
  onClear?: (() => void) | undefined;
  tier?: "compact" | "medium" | "expanded";
  label?: string;
  /** Compact only: whether the sheet is open. The caller owns the state. */
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  style?: CSSProperties | undefined;
  mode?: "facets" | "single" | "collapsed";
  /** 718 addendum: a collapsed strip declares the selection model of the rail it stands for. */
  select?: "single" | undefined;
  /** Compact only: the caller's own pill in place of the default trigger button. */
  trigger?: ((p: { open: boolean; onOpen: () => void; label: string }) => ReactNode) | undefined;
  onExpand?: (() => void) | undefined;
  expandLabel?: string;
};

export function FacetRail({
  axes = [],
  value = {},
  onChange,
  onClear,
  tier = "expanded",
  label = "Filters",
  open,
  onOpenChange,
  style,
  mode = "facets",
  select,
  trigger,
  onExpand,
  expandLabel = "Show " + label.toLowerCase(),
}: FacetRailProps) {
  // 718 addendum: a collapsed strip declares the selection model of the rail it stands for;
  // `select="single"` is the Hub's strip.
  const single = mode === "single" || (mode === "collapsed" && select === "single");
  const set = (axisId: string, optionId: string) => {
    if (single) {
      onChange?.({ [axisId]: [optionId] });
      return;
    }
    const cur = value[axisId] || [];
    const next: FacetValue = {
      ...value,
      [axisId]:
        cur.indexOf(optionId) > -1 ? cur.filter((o) => o !== optionId) : cur.concat(optionId),
    };
    if (!next[axisId]?.length) delete next[axisId];
    onChange?.(next);
  };
  const isOn = (axisId: string, optionId: string) => (value[axisId] || []).indexOf(optionId) > -1;
  const any = Object.keys(value).some((k) => (value[k] || []).length > 0);
  const onAxisKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const fwd = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!fwd && !back) return;
    const opts = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    );
    const i = opts.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    // 718: arrows move focus only; Enter, Space or click selects.
    opts[(i + (fwd ? 1 : opts.length - 1)) % opts.length]?.focus();
  };
  const chip = (on: boolean, parked?: boolean): CSSProperties => ({
    all: "unset",
    boxSizing: "border-box",
    cursor: parked ? "default" : "pointer",
    minHeight: 36,
    padding: "0 var(--space-4)",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-sans)",
    fontSize: "var(--text-s)",
    fontWeight: "var(--weight-medium)" as unknown as number,
    whiteSpace: "nowrap",
    color: parked ? "var(--ink-4)" : on ? "var(--ink)" : "var(--ink-2)",
    background: on ? "var(--bg-sunken)" : "transparent",
    border: on ? "var(--border-card) solid var(--ink)" : "var(--border-thin) solid var(--line)",
    opacity: parked ? 0.6 : 1,
    transition:
      "background var(--dur-default) var(--ease), border-color var(--dur-default) var(--ease)",
  });

  if (mode === "collapsed") {
    // 612, as amended by 725: an icon strip at expanded when the pane is open. One 48px square per
    // axis, named from the axis label, icon caller-supplied from Strand's set, tinted when any
    // option in the axis is set. A square is not a control over an option; it expands the rail.
    return (
      <nav
        aria-label={label}
        style={{
          position: "sticky",
          top: "var(--space-4)",
          zIndex: "var(--z-rail)" as unknown as number,
          alignSelf: "flex-start",
          width: 64,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2)",
          background: "var(--surface)",
          border: "var(--border-thin) solid var(--line)",
          borderRadius: "var(--radius-l)",
          boxShadow: "var(--shadow-0)",
          ...style,
        }}
      >
        <button
          type="button"
          aria-label={expandLabel}
          title={expandLabel}
          onClick={() => onExpand?.()}
          style={{
            all: "unset",
            boxSizing: "border-box",
            cursor: "pointer",
            width: 48,
            height: 48,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-m)",
            color: "var(--ink-2)",
          }}
        >
          <Icon name="chevron-right" size={20} />
        </button>
        <div
          role="list"
          aria-label={label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            paddingTop: "var(--space-2)",
            borderTop: "var(--border-thin) solid var(--line)",
          }}
        >
          {axes.map((axis) => {
            const on = (value[axis.id] || []).length > 0;
            return (
              <div key={axis.id} role="listitem">
                <button
                  type="button"
                  aria-label={axis.label}
                  title={axis.label}
                  aria-pressed={on}
                  data-axis={axis.id}
                  onClick={() => onExpand?.()}
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    width: 48,
                    height: 48,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-m)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)" as unknown as number,
                    letterSpacing: "var(--tracking-caps)",
                    textTransform: "uppercase",
                    color: on ? "var(--ink)" : "var(--ink-2)",
                    background: on ? "var(--bg-sunken)" : "transparent",
                    border: on
                      ? "var(--border-card) solid var(--ink)"
                      : "var(--border-thin) solid transparent",
                    transition:
                      "background var(--dur-default) var(--ease), border-color var(--dur-default) var(--ease)",
                  }}
                >
                  {axis.icon ? <Icon name={axis.icon} size={20} /> : axis.label.slice(0, 2)}
                </button>
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  const body = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {axes.map((axis) => (
        <div
          key={axis.id}
          role={single ? "radiogroup" : "group"}
          aria-labelledby={"facet-" + axis.id}
          onKeyDown={onAxisKey}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <div
            id={"facet-" + axis.id}
            style={{
              fontSize: "var(--text-xs)",
              letterSpacing: "var(--tracking-caps)",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            {axis.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {(axis.options || []).map((o) => {
              const on = isOn(axis.id, o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  role={single ? "radio" : undefined}
                  aria-checked={single ? on : undefined}
                  aria-pressed={single ? undefined : on}
                  tabIndex={
                    single
                      ? on || (!any && axis === axes[0] && o === (axis.options || [])[0])
                        ? 0
                        : -1
                      : undefined
                  }
                  disabled={o.parked}
                  aria-disabled={o.parked || undefined}
                  onClick={() => set(axis.id, o.id)}
                  style={chip(on, o.parked)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!single && (
        <div aria-live="polite" role="status" style={{ minHeight: 0 }}>
          {any && (
            <Button variant="ghost" size="sm" onClick={() => onClear?.()}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (tier === "compact") {
    const openIt = () => onOpenChange?.(true);
    return (
      <>
        {trigger ? (
          trigger({ open: !!open, onOpen: openIt, label })
        ) : (
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={!!open}
            onClick={openIt}
            style={style}
          >
            {label}
          </Button>
        )}
        {open && (
          // Ruling 618: the compiled call is `tier="compact"`, which this repository's Sheet spells
          // `variant="sheet"`. Its `title` is the dialog's accessible name here, because this Sheet
          // renders no heading of its own (G53), so the heading below stands in.
          <Sheet open onClose={() => onOpenChange?.(false)} variant="sheet" label={label} contained>
            <div style={{ padding: "var(--space-5)" }}>
              <h2
                data-sheet-heading
                tabIndex={-1}
                style={{
                  margin: "0 0 var(--space-5)",
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--display-s)",
                  lineHeight: "var(--display-s-lh)",
                  fontWeight: "var(--weight-regular)" as unknown as number,
                }}
              >
                {label}
              </h2>
              {body}
            </div>
          </Sheet>
        )}
      </>
    );
  }

  return (
    <nav
      aria-label={label}
      style={{
        position: "sticky",
        top: "var(--space-4)",
        zIndex: "var(--z-rail)" as unknown as number,
        alignSelf: "flex-start",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
        padding: "var(--space-5)",
        background: "var(--surface)",
        border: "var(--border-thin) solid var(--line)",
        borderRadius: "var(--radius-l)",
        boxShadow: "var(--shadow-0)",
        ...style,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--display-s)",
          lineHeight: "var(--display-s-lh)",
          fontWeight: "var(--weight-regular)" as unknown as number,
        }}
      >
        {label}
      </h2>
      {body}
    </nav>
  );
}
