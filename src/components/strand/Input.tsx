// Ported from Strand components/core/Input.jsx. Behavior unchanged. label accepts a node.
import {
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

type Shared = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  multiline?: boolean | undefined;
  rows?: number;
  id?: string;
  style?: CSSProperties | undefined;
};
export type InputProps = Shared &
  Omit<InputHTMLAttributes<HTMLInputElement>, "style" | "id"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "style" | "id">;

/**
 * Text input or textarea with label, hint, error.
 *
 * Ruling 548: `error` carries two jobs, the invalid state and the words that explain it, and a
 * caller may pass either. `error={taken || refusals.length > 0}` marks the field invalid without
 * supplying words, because the reason lives in the caller's own block (ruling 434's per-line
 * refusals on OnboardingSurface). Before this, a boolean took the hint's place and rendered as
 * nothing, so the field lost its hint and put no text where it had been; harmless where a block
 * carried the reason, a silent loss anywhere else. A boolean now paints the border and sets
 * aria-invalid, and the hint stays exactly where it was.
 */
export function Input({ label, hint, error, multiline, rows = 4, id, style, ...rest }: InputProps) {
  const autoId = useId();
  const uid = id || autoId;
  const [focus, setFocus] = useState(false);
  // The two jobs, separated: invalid is the state, message is the words, and only words render.
  const invalid = !!error;
  const message = typeof error === "boolean" ? null : error;
  const field: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "var(--font-sans)",
    fontSize: 17,
    lineHeight: 1.5,
    color: "var(--ink)",
    background: focus ? "var(--surface)" : "var(--bg-sunken)",
    border: "1px solid " + (invalid ? "var(--error)" : focus ? "var(--ink)" : "var(--line)"),
    borderRadius: "var(--radius-m)",
    padding: multiline ? "10px 14px" : "0 14px",
    minHeight: 44,
    outline: "none",
    resize: "vertical",
    transition: "border-color var(--dur-fast) var(--ease)",
  };
  const common = {
    id: uid,
    style: field,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    "aria-invalid": invalid,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={uid} style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          rows={rows}
          {...common}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input {...common} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {(message || hint) && (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: message ? "var(--error)" : "var(--ink-3)",
          }}
        >
          {message || hint}
        </div>
      )}
    </div>
  );
}
