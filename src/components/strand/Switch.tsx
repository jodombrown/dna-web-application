// Ported from Strand components/core/Switch.jsx. Behavior unchanged. Re-synced at compile
// v1789537371639386 (correction 13, ruling 703): the label is a block beside the control, so it
// wraps in a narrow host and no caller needs white-space: nowrap. Callers that already fit render
// unchanged.
import type { CSSProperties, ReactNode } from "react";

export type SwitchProps = {
  label?: ReactNode;
  checked?: boolean | undefined;
  onChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Toggle switch with label. 703 (correction 13): the label is a block beside the control, so it wraps in a narrow host
 *  and no caller needs white-space: nowrap. */
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
      <span style={{ display: "block", flex: "1 1 auto", minWidth: 0, lineHeight: 1.3 }}>
        {label}
      </span>
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
          transition: "background var(--dur-default) var(--ease)",
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
            transition: "left var(--dur-default) var(--ease)",
          }}
        />
      </span>
    </label>
  );
}
