// Ported from Strand components/core/Switch.jsx. Behavior unchanged.
import type { CSSProperties, ReactNode } from "react";

export type SwitchProps = {
  label?: ReactNode;
  checked?: boolean | undefined;
  onChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Toggle switch with label. */
export function Switch({ label, checked, onChange, disabled, style }: SwitchProps) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 44,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontSize: 17,
        ...style,
      }}
    >
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          background: checked ? "var(--ink)" : "var(--line-strong)",
          position: "relative",
          flex: "none",
          transition: "background var(--dur-base) var(--ease)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "var(--surface)",
            transition: "left var(--dur-base) var(--ease)",
          }}
        />
      </span>
    </label>
  );
}
