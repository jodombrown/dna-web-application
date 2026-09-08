// Ported from Strand components/core/Select.jsx (extraction 3654dd17). Behavior unchanged.
import { useId, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "style" | "id"> & {
  label?: ReactNode;
  options?: SelectOption[];
  id?: string;
  style?: CSSProperties | undefined;
};

/** Native select with the system's label and chevron. */
export function Select({ label, options = [], id, style, ...rest }: SelectProps) {
  const autoId = useId();
  const uid = id || autoId;
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
          style={{
            width: "100%",
            appearance: "none",
            WebkitAppearance: "none",
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            color: "var(--ink)",
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-m)",
            padding: "0 40px 0 14px",
            minHeight: 44,
            outline: "none",
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
    </div>
  );
}
