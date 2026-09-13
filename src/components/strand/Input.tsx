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

/** Text input or textarea with label, hint, error. */
export function Input({ label, hint, error, multiline, rows = 4, id, style, ...rest }: InputProps) {
  const autoId = useId();
  const uid = id || autoId;
  const [focus, setFocus] = useState(false);
  const field: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "var(--font-sans)",
    fontSize: 17,
    lineHeight: 1.5,
    color: "var(--ink)",
    background: focus ? "var(--surface)" : "var(--bg-sunken)",
    border: "1px solid " + (error ? "var(--error)" : focus ? "var(--ink)" : "var(--line)"),
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
    "aria-invalid": !!error,
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
      {(error || hint) && (
        <div
          style={{ fontSize: 13, lineHeight: 1.4, color: error ? "var(--error)" : "var(--ink-3)" }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
