// Ported from the B2-Shell-Feed-v3 extraction, shell/strand-patch/PulseDock.jsx (ruling 100).
// No chip behind the glyph: the Adinkra glyph floats in the bar as a currentColor mask. Active:
// glyph in the C's brand rung, label in the C's text rung. Hover (pointer): lift to --ink-2 with a
// 1px translate, no fill. Inactive: --ink-3. `inline` renders the five slots with no bar chrome for
// the consolidated AppHeader row (ruling 99). Dock ground is solid --bg (ruling 107).
// Production addition (B2, ruling 84): onIntent fires after an 80ms mouseenter hold on a slot so the
// host can prefetch that C's route at the pointer tier. Touch never fires it.
import { useRef, useState, type CSSProperties } from "react";
import { C_GLYPH, C_LABEL, C_ORDER, assetBase, type C } from "./cmeta";

export type PulseState = "none" | "activity" | "for-you" | "urgent";
const DOT: Record<PulseState, string> = {
  none: "transparent",
  activity: "var(--pulse-activity)",
  "for-you": "var(--pulse-for-you)",
  urgent: "var(--pulse-urgent)",
};

export type PulseDockProps = {
  active?: C | undefined;
  states?: Partial<Record<C, PulseState>> | undefined;
  onSelect?: ((c: C) => void) | undefined;
  onIntent?: ((c: C) => void) | undefined;
  /** Standalone horizontal bar (no longer mounted by the shell; kept for parity with Strand). */
  bar?: boolean | undefined;
  /** Five slots with no bar chrome, inside the AppHeader row at the expanded tier. */
  inline?: boolean | undefined;
  fixed?: boolean | undefined;
  style?: CSSProperties | undefined;
};

function Glyph({ c, size, color }: { c: C; size: number; color: string }) {
  const m = "url(" + assetBase() + "adinkra/" + C_GLYPH[c] + ".svg) center / contain no-repeat";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        background: color,
        WebkitMask: m,
        mask: m,
        transition: "background var(--dur-fast) var(--ease)",
      }}
    />
  );
}

/** Pulse family. Mobile bottom dock (default), inline header slots (inline), or the standalone bar. State is the signal, not C color (rule 4). */
export const INTENT_HOLD_MS = 80;

export function PulseDock({
  active,
  states = {},
  onSelect,
  onIntent,
  bar,
  inline,
  fixed,
  style,
}: PulseDockProps) {
  const [hov, setHov] = useState<C | null>(null);
  const hold = useRef<number | null>(null);
  const clearHold = () => {
    if (hold.current != null) window.clearTimeout(hold.current);
    hold.current = null;
  };
  const row = !!bar || !!inline;
  const items = C_ORDER.map((c) => {
    const on = c === active;
    const st: PulseState = states[c] || "none";
    const h = hov === c && !on;
    const glyph = on ? "var(--c-" + c + ")" : h ? "var(--ink-2)" : "var(--ink-3)";
    const label = on ? "var(--c-" + c + "-text)" : h ? "var(--ink-2)" : "var(--ink-3)";
    return (
      <button
        key={c}
        type="button"
        aria-current={on ? "page" : undefined}
        aria-label={C_LABEL[c] + (st !== "none" ? ", " + st.replace("-", " ") : "")}
        data-c={c}
        onClick={() => onSelect && onSelect(c)}
        onMouseEnter={() => {
          setHov(c);
          if (onIntent) {
            clearHold();
            hold.current = window.setTimeout(() => onIntent(c), INTENT_HOLD_MS);
          }
        }}
        onMouseLeave={() => {
          setHov(null);
          clearHold();
        }}
        style={{
          all: "unset",
          cursor: "pointer",
          position: "relative",
          flex: row ? "none" : 1,
          minWidth: 44,
          minHeight: 44,
          display: "flex",
          flexDirection: row ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: row ? 8 : 3,
          padding: row ? "0 12px" : "6px 0",
          fontFamily: "var(--font-sans)",
          fontSize: row ? 15 : 12,
          fontWeight: 500,
          color: label,
          transform: h ? "translateY(-1px)" : "none",
          transition: "color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease)",
        }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Glyph c={c} size={row ? 20 : 26} color={glyph} />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -3,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 999,
              background: DOT[st],
              border: st === "none" ? "none" : "2px solid var(--bg)",
              boxSizing: "content-box",
              transition: "background var(--dur-base) var(--ease)",
            }}
          />
        </span>
        <span
          style={{
            lineHeight: 1.2,
            borderBottom: row && on ? "2px solid var(--c-" + c + ")" : "2px solid transparent",
          }}
        >
          {C_LABEL[c]}
        </span>
      </button>
    );
  });
  if (inline)
    return (
      <nav
        aria-label="Pulse"
        data-pulse="inline"
        style={{ display: "flex", alignItems: "center", gap: 8, height: 44, ...style }}
      >
        {items}
      </nav>
    );
  if (bar)
    return (
      <nav
        aria-label="Pulse"
        data-pulse="bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: 56,
          padding: "0 12px",
          background: "var(--bg)",
          borderBottom: "1px solid var(--line)",
          position: fixed ? "sticky" : "static",
          top: 0,
          zIndex: 20,
          ...style,
        }}
      >
        {items}
      </nav>
    );
  return (
    <nav
      aria-label="Pulse"
      data-pulse="dock"
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 64,
        // Ruling 344: the dock carries its own safe-area insets, all three edges it touches, so a
        // notched phone in landscape keeps the first and last C clear of the notch.
        paddingTop: 0,
        paddingLeft: "calc(8px + env(safe-area-inset-left))",
        paddingRight: "calc(8px + env(safe-area-inset-right))",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--bg)",
        borderTop: "1px solid var(--line)",
        position: fixed ? "fixed" : "static",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        boxSizing: "content-box",
        ...style,
      }}
    >
      {items}
    </nav>
  );
}
