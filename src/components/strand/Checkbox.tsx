// Ported from Strand components/core/Checkbox.jsx. Behavior unchanged.
import { useId, type CSSProperties, type ReactNode } from "react";

export type CheckboxProps = {
  label?: ReactNode;
  checked?: boolean | undefined;
  onChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  style?: CSSProperties | undefined;
};

/** Checkbox with label. The native input carries the state so the focus ring and the label click
 *  both come from the platform; the box is drawn beside it. */
export function Checkbox({ label, checked, onChange, disabled, id, style }: CheckboxProps) {
  const autoId = useId();
  const uid = id || autoId;
  return (
    <label
      htmlFor={uid}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontSize: 15,
        color: "var(--ink-2)",
        ...style,
      }}
    >
      <input
        id={uid}
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          margin: 0,
          width: 20,
          height: 20,
          flex: "none",
          borderRadius: 5,
          border: "1px solid " + (checked ? "var(--ink)" : "var(--line-strong)"),
          background: checked ? "var(--ink)" : "var(--bg-sunken)",
          backgroundImage: checked
            ? "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 10.5 8.5 14 15 6.5'/%3E%3C/svg%3E\")"
            : "none",
          backgroundSize: "contain",
          cursor: disabled ? "default" : "pointer",
          transition:
            "background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)",
        }}
      />
      {label}
    </label>
  );
}
