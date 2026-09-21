// Strand `components/dna/Pane.jsx`, ported at compile v1789885868097915 (ruling 851 names it as
// scope). The compiled function is byte-identical between the correction 17 and correction 21
// bundles, so this is a first port rather than a re-sync.
//
// Rulings the compiled part cites in its own doc comment: 561, 607, 612, 588, 589, 700 and 719.
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
// Absent, nothing renders and the pane is as before. Escape is handled on the pane section itself,
// so it fires only while focus is within the pane; there is no document listener.
//
// Nothing in `src/` binds this part yet, so ruling 755's page proof and ruling 627's proof by a
// person performing the act fall to the first brief that binds it (7, 9 or 10).
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
  style?: CSSProperties | undefined;
};

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
  style,
}: PaneProps) {
  const listCol = useRef<HTMLDivElement>(null);
  // 719: Escape is handled on the pane section itself, so it fires only while focus is within the
  // pane. No document listener.
  const onPaneKey = onClose
    ? (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape" && !e.defaultPrevented) {
          e.preventDefault();
          onClose();
        }
      }
    : undefined;
  const closeBtn = onClose ? <IconButton name="x" label={closeLabel} onClick={onClose} /> : null;
  useEffect(() => {
    // 607: bring the arrived-at item into view without moving focus or the page.
    if (!cold || tier !== "expanded" || !listCol.current) return;
    const el = listCol.current.querySelector("[data-arrived]");
    if (!el) return;
    const box = el.getBoundingClientRect();
    const col = listCol.current.getBoundingClientRect();
    listCol.current.scrollTop += box.top - col.top;
  }, [cold, tier]);
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
          {closeBtn}
        </div>
        <div aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {paneBody}
        </div>
      </section>
    );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,var(--pane-list-width)) minmax(0,1fr)",
        gap: "var(--pane-gap)",
        alignItems: "start",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <div ref={listCol} style={{ minWidth: 0 }}>
        {cold ? listFallback : list}
      </div>
      <section
        aria-label={title}
        aria-live="polite"
        onKeyDown={onPaneKey}
        style={{
          position: "sticky",
          top: "var(--space-4)",
          zIndex: "var(--z-pane)" as unknown as number,
          minWidth: 0,
          background: "var(--surface)",
          border: "var(--border-thin) solid var(--line)",
          borderRadius: "var(--radius-l)",
          overflow: "hidden",
          animation: "strand-pane-in var(--dur-slow) var(--ease)",
        }}
      >
        <style>{"@keyframes strand-pane-in{from{opacity:0}to{opacity:1}}"}</style>
        {closeBtn && (
          <div
            style={{
              position: "absolute",
              top: "var(--space-2)",
              right: "var(--space-2)",
              zIndex: 1,
            }}
          >
            {closeBtn}
          </div>
        )}
        {paneBody}
      </section>
    </div>
  );
}
