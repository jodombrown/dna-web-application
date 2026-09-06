// Ported from Strand components/dna/DiaLine.jsx. Behavior unchanged (keyframes live in styles.css).
import type { CSSProperties } from "react";

export type DiaLineState = "thinking" | "done" | null;

export type DiaLineProps = {
  state: DiaLineState;
  text?: string | undefined;
  onNotThis?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

/** DIA's one quiet line (ruling 52). state "thinking": pending dot, resolves within 2.5s. state "done": what DIA did + "Not this?" escape.
 *  Render nothing when DIA has nothing to say (grounded-or-empty). Never a banner, modal, or prompt. */
export function DiaLine({ state, text, onNotThis, style }: DiaLineProps) {
  if (!state) return null;
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 24,
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    lineHeight: 1.4,
    color: "var(--ink-3)",
    ...style,
  };
  if (state === "thinking")
    return (
      <div role="status" aria-live="polite" data-dia="thinking" style={base}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "var(--ink-3)",
            animation: "strand-breathe 1.2s var(--ease) infinite",
          }}
        />
        <span>DIA is reading</span>
      </div>
    );
  return (
    <div
      role="status"
      aria-live="polite"
      data-dia="done"
      style={{ ...base, animation: "strand-fade var(--dur-base) var(--ease)" }}
    >
      <span
        aria-hidden="true"
        style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ink-3)" }}
      />
      <span>{text}</span>
      {onNotThis && (
        <button
          type="button"
          onClick={onNotThis}
          style={{
            all: "unset",
            cursor: "pointer",
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 6px",
            margin: "-10px 0",
            fontSize: 15,
            fontWeight: 500,
            color: "var(--ink)",
            textDecoration: "underline",
            textDecorationColor: "var(--line-strong)",
            textUnderlineOffset: 2,
          }}
        >
          Not this?
        </button>
      )}
    </div>
  );
}
