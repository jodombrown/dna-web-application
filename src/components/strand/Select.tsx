// Ported from Strand components/core/Select.jsx (extraction 3654dd17). Reconciled at compile
// v1790212533284400 (handoff 32-A, rulings 862 and 844) with correction 24 §5 (1061): `hint` and
// `error` in the form Input has, copied from it rather than re-derived. Error colours the border
// and the line below, sets aria-invalid, and replaces the hint; the line is tied to the control by
// aria-describedby. The compile writes --danger; this reads --error, as Input does under ruling 425
// ("the four --danger citations read --error"), and --danger is var(--error), so nothing computes
// differently. `error` is words, as the compile's own types have it: ruling 548's boolean is
// Input's, and no Select ever carried one, so the compile's rendering is taken as drawn. The focus
// rendering (--surface ground, --ink border) arrived with them because it is part of that form (24,
// doctrine flag 6), and Chat ratified it on every Select (1085). The compile reads `id ||
// React.useId()`, a conditional hook; this keeps the unconditional call. Dispositions:
// docs/strand-ports/v1790212533284400.md.
import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Icon } from "./Icon";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "style" | "id"> & {
  label?: ReactNode;
  /** 1061. A line under the control in --ink-3, as Input's. Replaced by `error` when both are set. */
  hint?: ReactNode;
  /** 1061. Words: colours the border and the line --error (425), sets aria-invalid, replaces the
   *  hint and ties the line by aria-describedby. As Input's. */
  error?: string | undefined;
  options?: SelectOption[];
  id?: string;
  style?: CSSProperties | undefined;
};

/** Native select styled to match Input, with the system's label and chevron. */
export function Select({ label, hint, error, options = [], id, style, ...rest }: SelectProps) {
  const autoId = useId();
  const uid = id || autoId;
  const descId = uid + "-desc";
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={uid} style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        <select
          id={uid}
          aria-invalid={!!error}
          aria-describedby={error || hint ? descId : undefined}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: "100%",
            appearance: "none",
            WebkitAppearance: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            color: "var(--ink)",
            background: focus ? "var(--surface)" : "var(--bg-sunken)",
            border: "1px solid " + (error ? "var(--error)" : focus ? "var(--ink)" : "var(--line)"),
            borderRadius: "var(--radius-m)",
            padding: "0 40px 0 14px",
            minHeight: 44,
            outline: "none",
            transition: "border-color var(--dur-default) var(--ease)",
          }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          style={{
            position: "absolute",
            right: 12,
            top: 13,
            color: "var(--ink-3)",
            pointerEvents: "none",
          }}
        />
      </div>
      {(error || hint) && (
        <div
          id={descId}
          style={{
            fontSize: 13,
            lineHeight: 1.4,
            color: error ? "var(--error)" : "var(--ink-3)",
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
