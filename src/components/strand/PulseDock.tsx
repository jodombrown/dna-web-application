// Ported from Strand components/dna/PulseDock.jsx. Behavior unchanged.
// Production addition (B2, ruling 84): onIntent fires after an 80ms mouseenter hold on a slot so the
// host can prefetch that C's route at the pointer tier. Touch never fires it.
import { useRef, type CSSProperties } from "react";
import { CBadge } from "./CBadge";
import { C_LABEL, C_ORDER, type C } from "./cmeta";

export type PulseState = "none" | "activity" | "for-you" | "urgent";
const DOT: Record<PulseState, string> = {
  none: "transparent",
  activity: "var(--pulse-activity)",
  "for-you": "var(--pulse-for-you)",
  urgent: "var(--pulse-urgent)",
};

export type PulseDockProps = {
  active?: C | undefined;
  states?: Partial<Record<C, PulseState>>;
  onSelect?: ((c: C) => void) | undefined;
  onIntent?: ((c: C) => void) | undefined;
  bar?: boolean | undefined;
  fixed?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Pulse family. Mobile bottom dock (default) or desktop horizontal bar (bar). states: {connect:'none'|'activity'|'for-you'|'urgent', ...}. State is the signal, not C color (rule 4). */
export const INTENT_HOLD_MS = 80;

export function PulseDock({
  active,
  states = {},
  onSelect,
  onIntent,
  bar,
  fixed,
  style,
}: PulseDockProps) {
  const hold = useRef<number | null>(null);
  const clearHold = () => {
    if (hold.current != null) window.clearTimeout(hold.current);
    hold.current = null;
  };
  const items = C_ORDER.map((c) => {
    const on = c === active;
    const st: PulseState = states[c] || "none";
    return (
      <button
        key={c}
        type="button"
        aria-current={on ? "page" : undefined}
        aria-label={C_LABEL[c] + (st !== "none" ? ", " + st.replace("-", " ") : "")}
        onClick={() => onSelect && onSelect(c)}
        onMouseEnter={
          onIntent
            ? () => {
                clearHold();
                hold.current = window.setTimeout(() => onIntent(c), INTENT_HOLD_MS);
              }
            : undefined
        }
        onMouseLeave={onIntent ? clearHold : undefined}
        style={{
          all: "unset",
          cursor: "pointer",
          position: "relative",
          flex: bar ? "none" : 1,
          minWidth: 44,
          minHeight: 44,
          display: "flex",
          flexDirection: bar ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: bar ? 8 : 2,
          padding: bar ? "0 14px" : "6px 0",
          borderRadius: 10,
          fontFamily: "var(--font-sans)",
          fontSize: bar ? 15 : 12,
          fontWeight: 500,
          color: on ? "var(--ink)" : "var(--ink-3)",
        }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <CBadge
            c={c}
            size={bar ? 24 : 32}
            style={{ opacity: on ? 1 : 0.6, filter: on ? "none" : "grayscale(1)" }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: 999,
              background: DOT[st],
              border: st === "none" ? "none" : "2px solid var(--bg)",
              boxSizing: "content-box",
              transition: "background var(--dur-base) var(--ease)",
            }}
          />
        </span>
        <span
          style={{ lineHeight: 1.2, borderBottom: bar && on ? "2px solid var(--ink)" : "none" }}
        >
          {C_LABEL[c]}
        </span>
      </button>
    );
  });
  if (bar)
    return (
      <nav
        aria-label="Pulse"
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
      style={{
        display: "flex",
        alignItems: "stretch",
        height: 64,
        padding: "0 8px",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--surface-glass)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--line)",
        position: fixed ? "fixed" : "static",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        ...style,
      }}
    >
      {items}
    </nav>
  );
}
