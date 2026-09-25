// Strand `components/dna/Pane.jsx`, first ported at compile v1789885868097915 (ruling 851),
// reconciled at compile v1790212533284400 (handoff 32-A, rulings 862 and 844) with corrections 23
// §1 (1083, Escape amended by 1084) and 24 §6 (1064, ratified 1085), dispositions in
// docs/strand-ports/v1790212533284400.md, and carried unchanged through v1790279130697923, whose
// Pane is byte for byte v1790212533284400's. Reconciled at compile v1790366257373061 (handoff 33-A,
// correction 28 item 1, G110, ratified 1134), which adds `paneWidth`, `height`, `listHidden`,
// `hiddenWidth`, the toolbar's three handlers and four labels, and a second expanded branch that
// draws them; the dispositions are in docs/strand-ports/v1790366257373061.md. The .jsx and the
// bundle are identical once both are compiled the same way.
//
// Rulings the compiled part cites in its own doc comment: 561, 607, 612, 79, 588, 589, 700, 719,
// 1083, 69 and 1064; its correction 28 paragraph cites G110 and B9-SPEC's pane line.
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
// markers and the cluster's wrapper v1790212533284400's port record lists in its section 4. Below
// `--tier-expanded` `open` does nothing: the pane is its own route (561). `selected={false}` is
// still a pane open on its own empty state and is not the closed pane.
// Correction 28 (G110; B9-SPEC's pane line, which the compile cites as line 14, its number before
// Revision 2, and which is line 19 in Revision 2). A second expanded branch, placed after the route
// form's return, so below `--tier-expanded` none of the new props does anything. It runs when
// `paneWidth`, `height` or any of `onToggleList`, `onCopyLink`, `onShare` is passed; `listHidden`
// and `hiddenWidth` alone do not enter it. Without them the expanded Pane is correction 24's grid,
// the same DOM and styles as before. `paneWidth` fixes the pane and gives the list the rest,
// `minmax(0,1fr) {paneWidth}`, a number read as px. `height` bounds the grid: the list column and a
// `data-pane-body` wrapper round the pane's content each scroll on their own (`overflow-y: auto`,
// overscroll contained), and the section is `position: relative`, not sticky; with the list column
// a scroller, `selectedKey`'s bring-into-view has something to move. Any tool handler renders
// `data-pane-bar` at the section's top: on the left the `role="toolbar"` group `data-pane-toolbar`,
// Hide or show the list (`panel-left-close`, `panel-left-open`), Copy link (`link`), Share
// (`share`), each marked `data-tool`; on the right correction 23's cluster, unchanged in content,
// order and keys. Without a tool handler the cluster keeps the corner. `listHidden`, while open,
// draws `0px minmax(0,{hiddenWidth})` centred with no gap (default 720): the list slot is still the
// same element, `aria-hidden`, inert and hidden, so its scroll is kept. Closed wins over hidden. In
// this branch the pane's content always sits inside `data-pane-body`, bounded or not.
//
// `DiscoverySurface` (handoff 31-B) is the one caller. It binds `onClose`, `closeLabel`,
// `selectedKey` and the stepping pair, and renders the Pane only while an item is open, so no page
// passes `open`. G110's binding of `paneWidth` 520, `height` and the three tool handlers is handoff
// 33-A's change to that caller, not this part's.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { IconButton } from "./IconButton";

export type PaneProps = {
  tier?: "compact" | "medium" | "expanded";
  /** The list column, expanded only. Below expanded the list is its own page, which the host
   *  renders; this component does not render `list` there. */
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
  /** Correction 28 (G110). Expanded only. Fixes the pane's width and gives the list the rest:
   *  `minmax(0,1fr) {paneWidth}`. A number is px. Absent, the grid is as before. */
  paneWidth?: number | string | undefined;
  /** Correction 28. Expanded only. Bounds the grid's height; the list column and the pane body then
   *  scroll separately and the pane section is not sticky. Absent, the page scrolls as before. */
  height?: number | string | undefined;
  /** Correction 28. While open: `0px minmax(0,{hiddenWidth})` centred, no gap; the list slot stays
   *  the same element, hidden and inert, its scroll kept. Default false. Takes effect only with
   *  `paneWidth`, `height` or a tool handler, which select the branch that reads it. */
  listHidden?: boolean | undefined;
  /** Correction 28. Any of the three renders the toolbar at the pane's top, ordered Hide or show the
   *  list, Copy link, Share, with correction 23's cluster at the right of the same row. Expanded
   *  only. The caller owns the list state, the clipboard and the share. */
  onToggleList?: (() => void) | undefined;
  onCopyLink?: (() => void) | undefined;
  onShare?: (() => void) | undefined;
  /** Defaults "Hide list", "Show list", "Copy link", "Share". Words only (69). */
  hideListLabel?: string | undefined;
  showListLabel?: string | undefined;
  copyLinkLabel?: string | undefined;
  shareLabel?: string | undefined;
  /** The pane's maximum width with the list hidden. Default 720; a number is px. */
  hiddenWidth?: number | string | undefined;
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
  paneWidth,
  height,
  listHidden = false,
  onToggleList,
  hideListLabel = "Hide list",
  showListLabel = "Show list",
  onCopyLink,
  copyLinkLabel = "Copy link",
  onShare,
  shareLabel = "Share",
  hiddenWidth = 720,
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

  const tools = !!(onToggleList || onCopyLink || onShare);
  if (paneWidth != null || tools || height != null) {
    // Correction 28. Same tree as below: list column first, pane section second, in every state.
    // Reached only at expanded, since the route form returned above. `inert` is React 19's boolean
    // where the compile writes React 18's `''`, as in the grid below.
    const w = typeof paneWidth === "number" ? paneWidth + "px" : paneWidth;
    const hideList = open && listHidden;
    const hw = typeof hiddenWidth === "number" ? hiddenWidth + "px" : hiddenWidth;
    const cols = !open
      ? "minmax(0,1fr) 0px"
      : hideList
        ? "0px minmax(0," + hw + ")"
        : w
          ? "minmax(0,1fr) " + w
          : "minmax(0,var(--pane-list-width)) minmax(0,1fr)";
    const bounded = height != null;
    const toolbar = tools ? (
      <div
        data-pane-toolbar
        role="toolbar"
        aria-label={title}
        style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}
      >
        {onToggleList && (
          <IconButton
            name={hideList ? "panel-left-open" : "panel-left-close"}
            label={hideList ? showListLabel : hideListLabel}
            data-tool="list"
            onClick={onToggleList}
          />
        )}
        {onCopyLink && (
          <IconButton name="link" label={copyLinkLabel} data-tool="copy" onClick={onCopyLink} />
        )}
        {onShare && (
          <IconButton name="share" label={shareLabel} data-tool="share" onClick={onShare} />
        )}
      </div>
    ) : null;
    return (
      <div
        data-pane-open={open ? "true" : "false"}
        data-pane-list-hidden={hideList ? "true" : undefined}
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          justifyContent: hideList ? "center" : undefined,
          gap: open && !hideList ? "var(--pane-gap)" : 0,
          alignItems: bounded ? "stretch" : "start",
          height: bounded ? height : undefined,
          minHeight: 0,
          fontFamily: "var(--font-sans)",
          color: "var(--ink)",
          ...style,
        }}
      >
        <div
          data-pane-list
          ref={listCol}
          aria-hidden={hideList ? true : undefined}
          inert={hideList ? true : undefined}
          style={{
            minWidth: 0,
            minHeight: 0,
            overflowY: bounded ? "auto" : undefined,
            overflowX: bounded || hideList ? "hidden" : undefined,
            overscrollBehavior: bounded ? "contain" : undefined,
            visibility: hideList ? "hidden" : undefined,
          }}
        >
          {cold ? listFallback : list}
        </div>
        <section
          aria-label={title}
          aria-live={open ? "polite" : undefined}
          aria-hidden={open ? undefined : true}
          inert={open ? undefined : true}
          onKeyDown={onPaneKey}
          style={{
            position: bounded ? "relative" : "sticky",
            top: bounded ? undefined : "var(--space-4)",
            zIndex: "var(--z-pane)" as unknown as number,
            minWidth: 0,
            minHeight: 0,
            boxSizing: "border-box",
            display: bounded || tools ? "flex" : undefined,
            flexDirection: "column",
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
          {open && tools && (
            <div
              data-pane-bar
              style={{
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                padding: "var(--space-2)",
                borderBottom: "var(--border-thin) solid var(--line)",
                background: "var(--surface)",
              }}
            >
              {toolbar}
              {cluster}
            </div>
          )}
          {open && !tools && cluster && (
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
          {open && (
            <div
              data-pane-body
              style={{
                flex: bounded ? "1 1 auto" : undefined,
                minHeight: 0,
                overflowY: bounded ? "auto" : undefined,
                overscrollBehavior: bounded ? "contain" : undefined,
              }}
            >
              {paneBody}
            </div>
          )}
        </section>
      </div>
    );
  }

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
