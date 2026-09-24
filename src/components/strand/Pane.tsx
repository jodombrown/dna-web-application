// Strand `components/dna/Pane.jsx`, first ported at compile v1789885868097915 (ruling 851) and
// reconciled at compile v1790212533284400 (handoff 32-A, rulings 862 and 844) with corrections 23
// §1 (1083, Escape amended by 1084) and 24 §6 (1064, ratified 1085). The .jsx and the bundle are
// identical once both are compiled the same way; the dispositions are in
// docs/strand-ports/v1790212533284400.md.
//
// Rulings the compiled part cites in its own doc comment: 561, 607, 612, 79, 588, 589, 700, 719,
// 1083, 69 and 1064.
// A pane (561) is a second surface consulted alongside the first. It is navigated into, never
// summoned. Above `--tier-expanded` it is a pane beside the list; below it the pane is its own
// route, full width, with its own back affordance — medium taking the pane was the counter-case 561
// ruled against, so medium gets the route. A pane never collapses to a sheet at any tier. Its
// content is independently addressable at every tier, which is router work the host owns: the host
// supplies the back handler, this component does not navigate.
// Cold arrival above `--tier-expanded` renders `listFallback`, the default corpus with the
// arrived-at item marked `data-arrived` and scrolled to (607): a stranger arriving at one item from
// a shared link needs to find the others.
// 612: a surface carrying a pane does not render ruling 79's right rail. The pane occupies and
// extends through that region and DIA is absent while it is open. Below `--tier-expanded` the pane
// is its own route, so the list surface is a separate page and DIA is present there.
// Motion per 589: `--dur-slow`. Stacking per 588: `--z-pane`, below all chrome, because a pane is
// page content.
// 700 (correction 13): `onClose`, when supplied, renders one close control at the pane's top right
// named by `closeLabel`, and fires on activation and on Escape while focus is within the pane (719).
// Absent, nothing renders and the pane is as before.
// 1083 (correction 23): `onPrevious` / `onNext` render a stepping pair in the same cluster, ordered
// Previous, Next, Close. `hasPrevious` / `hasNext` false render the control disabled in place:
// `aria-disabled`, still focusable so focus does not jump, inert on activation and on its key. The
// edge stops; it never wraps and never closes. ArrowLeft and ArrowRight fire the pair on the pane
// section's own onKeyDown beside Escape, so only while focus is within the pane (or within a portal
// the pane's content renders, since React's keydown follows the React tree); guarded by an
// editable target and by `defaultPrevented`, so a gallery or lens inside the page that takes arrows
// wins. Escape yields to `defaultPrevented` too (1084); this port already did, as correction 21's
// bundle did. `selectedKey` re-runs the bring-into-view against `[data-selected]` in the list
// column when it changes: list scroll only, focus untouched. Loading keeps the cluster, so the
// member can step again before the item arrives. No position, no count (69).
// 1064 (correction 24, brief 31-E, ratified 1085): `open`. The list slot is the same element in the
// same position whether or not an item is open: one grid, the list column its first child always,
// the pane section its second. `open={false}` sets the pane track to 0 and the gap to 0, so the list
// takes the full content width, and the section is inert and aria-hidden with its cluster not
// rendered; nothing is a different element tree, so React never rebuilds the list and a lane
// scrolled sideways keeps its position across open and close. The track snaps; the section's opacity
// moves at `--dur-slow` (589). Default open, so an existing caller renders as it did, with the
// markers and the cluster's wrapper the port record's section 4 lists. Below
// `--tier-expanded` `open` does nothing: the pane is its own route (561). `selected={false}` is
// still a pane open on its own empty state and is not the closed pane.
//
// Bound by `DiscoverySurface` (handoff 31-B) with `onClose` only. The stepping pair, `selectedKey`
// and `open` are 32-B's to bind; no page passes them in this port.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { IconButton } from "./IconButton";

export type PaneProps = {
  tier?: "compact" | "medium" | "expanded";
  /** The list column, rendered beside the pane at expanded and as the route's own page below it. */
  list?: ReactNode;
  /** 607: the default corpus, with the arrived-at item marked `data-arrived`. */
  listFallback?: ReactNode;
  /** The member arrived at one item directly rather than from the list. */
  cold?: boolean | undefined;
  children?: ReactNode;
  /** False renders `empty`; anything else renders `children`. */
  selected?: boolean | undefined;
  title?: string | undefined;
  empty?: ReactNode;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  onBack?: (() => void) | undefined;
  backLabel?: string;
  onClose?: (() => void) | undefined;
  closeLabel?: string;
  /** 1083. Either renders the stepping pair before the close control. */
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  /** Accessible names; the caller supplies the noun ("Previous event"). Words only (69). */
  previousLabel?: string;
  nextLabel?: string;
  /** The edge stops: false renders that control `aria-disabled` in place, inert on activation and
   *  on its key. Undefined reads as true when the handler is supplied. */
  hasPrevious?: boolean | undefined;
  hasNext?: boolean | undefined;
  /** When it changes, the list column brings `[data-selected]` into view (expanded only). Opaque
   *  to Pane, which reads only that it changed. */
  selectedKey?: string | undefined;
  /** 1064. Expanded only. False is the closed pane; default true. */
  open?: boolean;
  style?: CSSProperties | undefined;
};

const EDITABLE = /^(input|textarea|select)$/i;
const isEditable = (t: EventTarget | null) =>
  !!t && (EDITABLE.test((t as HTMLElement).tagName) || !!(t as HTMLElement).isContentEditable);
function bringIntoView(col: HTMLElement | null, sel: string) {
  if (!col) return;
  const el = col.querySelector(sel);
  if (!el) return;
  const box = el.getBoundingClientRect();
  const c = col.getBoundingClientRect();
  col.scrollTop += box.top - c.top;
}

export function Pane({
  tier = "expanded",
  list,
  listFallback,
  cold,
  children,
  selected,
  title,
  empty,
  loading,
  error,
  onBack,
  backLabel = "Back",
  onClose,
  closeLabel = "Close",
  onPrevious,
  onNext,
  previousLabel = "Previous",
  nextLabel = "Next",
  hasPrevious,
  hasNext,
  selectedKey,
  open = true,
  style,
}: PaneProps) {
  const listCol = useRef<HTMLDivElement>(null);
  const stepping = !!(onPrevious || onNext);
  const canPrev = !!onPrevious && hasPrevious !== false;
  const canNext = !!onNext && hasNext !== false;
  const prev = () => {
    if (canPrev && onPrevious) onPrevious();
  };
  const next = () => {
    if (canNext && onNext) onNext();
  };
  // 719: keys are handled on the pane section itself, so they fire only while focus is within the
  // pane, or within a portal its content renders (React's keydown follows the React tree). No
  // document listener.
  const onPaneKey =
    onClose || stepping
      ? (e: KeyboardEvent<HTMLElement>) => {
          if (e.defaultPrevented) return;
          if (e.key === "Escape" && onClose) {
            e.preventDefault();
            onClose();
            return;
          }
          if (!stepping || isEditable(e.target)) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          }
        }
      : undefined;
  const stepBtn = (name: string, label: string, on: boolean, go: () => void, key: string) => (
    <IconButton
      key={key}
      name={name}
      label={label}
      aria-disabled={on ? undefined : true}
      data-step={key}
      onClick={go}
      style={on ? undefined : { opacity: 0.45, cursor: "default" }}
    />
  );
  const cluster =
    onClose || stepping ? (
      <div
        data-pane-cluster
        style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
      >
        {stepping && stepBtn("chevron-left", previousLabel, canPrev, prev, "previous")}
        {stepping && stepBtn("chevron-right", nextLabel, canNext, next, "next")}
        {onClose && <IconButton name="x" label={closeLabel} onClick={onClose} />}
      </div>
    ) : null;
  useEffect(() => {
    // 607: bring the arrived-at item into view without moving focus or the page.
    if (cold && tier === "expanded") bringIntoView(listCol.current, "[data-arrived]");
  }, [cold, tier]);
  useEffect(() => {
    // 1083: the list follows the open item as the member steps. List scroll only.
    if (selectedKey != null && tier === "expanded")
      bringIntoView(listCol.current, "[data-selected]");
  }, [selectedKey, tier]);
  const paneBody = loading ? (
    <p
      style={{
        margin: 0,
        padding: "var(--space-6)",
        color: "var(--ink-3)",
        fontSize: "var(--text-m)",
      }}
    >
      Loading
    </p>
  ) : error ? (
    <div
      role="alert"
      style={{
        margin: "var(--space-5)",
        padding: "var(--space-4) var(--space-5)",
        background: "var(--error-tint)",
        color: "var(--error)",
        borderRadius: "var(--radius-m)",
        fontSize: "var(--text-s)",
        lineHeight: 1.45,
      }}
    >
      {error}
    </div>
  ) : selected === false ? (
    empty
  ) : (
    children
  );

  if (tier !== "expanded")
    return (
      <section
        aria-label={title}
        onKeyDown={onPaneKey}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "var(--bg)",
          fontFamily: "var(--font-sans)",
          color: "var(--ink)",
          animation: "strand-pane-in var(--dur-slow) var(--ease)",
          ...style,
        }}
      >
        <style>{"@keyframes strand-pane-in{from{opacity:0}to{opacity:1}}"}</style>
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            borderBottom: "var(--border-thin) solid var(--line)",
            background: "var(--surface-glass)",
            position: "sticky",
            top: 0,
            zIndex: "var(--z-sticky)" as unknown as number,
          }}
        >
          <IconButton name="arrow-left" label={backLabel} onClick={onBack} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: "var(--text-m)",
              fontWeight: "var(--weight-medium)" as unknown as number,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cold ? backLabel : title}
          </span>
          {cluster}
        </div>
        <div aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {paneBody}
        </div>
      </section>
    );

  // 1064: one grid, one tree. The track SNAPS between its two states and only the pane section's
  // opacity moves, over --dur-slow. Three builds that animated the track's width were read and
  // rejected in correction 24; a part's motion should not depend on a measurement or a paint. Open:
  // minmax(0,--pane-list-width) minmax(0,1fr) with --pane-gap. Closed: minmax(0,1fr) 0 with no gap,
  // section inert and hidden. The compile writes `inert: ''`, React 18's idiom; React 19 takes a
  // boolean and renders the same empty attribute from `true`.
  return (
    <div
      data-pane-open={open ? "true" : "false"}
      style={{
        display: "grid",
        gridTemplateColumns: open
          ? "minmax(0,var(--pane-list-width)) minmax(0,1fr)"
          : "minmax(0,1fr) 0px",
        gap: open ? "var(--pane-gap)" : 0,
        alignItems: "start",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <div data-pane-list ref={listCol} style={{ minWidth: 0 }}>
        {cold ? listFallback : list}
      </div>
      <section
        aria-label={title}
        aria-live={open ? "polite" : undefined}
        aria-hidden={open ? undefined : true}
        inert={open ? undefined : true}
        onKeyDown={onPaneKey}
        style={{
          position: "sticky",
          top: "var(--space-4)",
          zIndex: "var(--z-pane)" as unknown as number,
          minWidth: 0,
          boxSizing: "border-box",
          background: "var(--surface)",
          border: "var(--border-thin) solid var(--line)",
          borderRadius: "var(--radius-l)",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition:
            "opacity var(--dur-slow) var(--ease), visibility 0s linear " +
            (open ? "0s" : "var(--dur-slow)"),
          animation: open ? "strand-pane-in var(--dur-slow) var(--ease)" : "none",
        }}
      >
        <style>{"@keyframes strand-pane-in{from{opacity:0}to{opacity:1}}"}</style>
        {open && cluster && (
          <div
            style={{
              position: "absolute",
              top: "var(--space-2)",
              right: "var(--space-2)",
              zIndex: 1,
            }}
          >
            {cluster}
          </div>
        )}
        {open && paneBody}
      </section>
    </div>
  );
}
