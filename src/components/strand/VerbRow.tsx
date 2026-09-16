// Design pass 01, part of strand-patch/Composer.jsx (rulings 458, 417, 493, 498, W52). The C chip
// row, lifted out of the middle of the fields column so the scroller and its fade are one thing.
// - It sits directly above the text area and is always visible, before anything is typed (458).
// - Four chips in C order. Connect and its schema row have left the composer (417, 498).
// - One horizontal scroller at every tier, never a stack of four on tablet or desktop, with a
//   --surface edge fade that appears only when there is more to scroll, selected or not (W52).
// - A vertical wheel over the row scrolls it sideways (ruling 493). The Sheet's scroll lock leaves
//   a horizontal scroller alone, so the wheel reaches this handler.
// - Convene Pass 1 (correction 7, ruling 672): `disabled` carries a reason per verb; a disabled chip
//   stays in the row, is not selectable and carries the reason as aria-description and pointer
//   title. On touch, a tap anywhere in the row reaches `onRowTap` with the disabled chip's verb, or
//   null when the tap landed elsewhere, so the Composer can write the reason into the DiaLine slot
//   and clear it on the next tap. The chip is read at the row, as Strand's Composer reads it.
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { VerbChip } from "./VerbChip";
import { COMPOSER_VERBS, type ComposerVerb } from "./cmeta";

// The verb list is cmeta's, not a second copy here: ruling 417 removed Connect from the composer
// and cmeta carries that as the ComposerVerb type, so the row cannot drift from the schema.

export function VerbRow({
  value,
  onChoose,
  compact,
  disabled,
  onRowTap,
}: {
  value: ComposerVerb | null;
  onChoose: (c: ComposerVerb) => void;
  compact?: boolean | undefined;
  disabled?: Partial<Record<ComposerVerb, string>> | undefined;
  /** Touch only: every tap in the row, with the disabled verb it landed on, if any. */
  onRowTap?: ((disabledVerb: ComposerVerb | null) => void) | undefined;
}) {
  const rowTap = onRowTap
    ? (e: MouseEvent<HTMLDivElement>) => {
        const t = e.target as HTMLElement | null;
        const el = t && t.closest ? (t.closest("[role=radio]") as HTMLElement | null) : null;
        const v =
          el && el.getAttribute("aria-disabled") === "true"
            ? (el.getAttribute("data-verb") as ComposerVerb | null)
            : null;
        onRowTap(v && disabled?.[v] ? v : null);
      }
    : undefined;
  const row = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: false, end: false });
  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft > 1, end: max > 1 && el.scrollLeft < max - 1 });
  }, []);
  useEffect(() => {
    measure();
    const el = row.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const fade = (side: "left" | "right") => (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 28,
        pointerEvents: "none",
        background:
          "linear-gradient(to " +
          (side === "left" ? "right" : "left") +
          ", var(--surface), transparent)",
      }}
    />
  );
  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <div
        ref={row}
        role="radiogroup"
        aria-label="What kind of post"
        data-verb-row
        onScroll={measure}
        onClick={rowTap}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          padding: "2px 0",
          // The scrolling row must not widen the layout viewport on touch devices.
          contain: "inline-size",
        }}
      >
        {COMPOSER_VERBS.map((v) => (
          <VerbChip
            key={v}
            c={v}
            compact={compact}
            selected={value === v}
            disabled={!!disabled?.[v]}
            reason={disabled?.[v]}
            onClick={() => onChoose(v)}
          />
        ))}
      </div>
      {edge.start && fade("left")}
      {edge.end && fade("right")}
    </div>
  );
}
