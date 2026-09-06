// Ported from Strand components/core/IconButton.jsx. Behavior unchanged.
import { useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { Icon } from "./Icon";
import type { C } from "./cmeta";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
  name: string;
  label: string;
  c?: C | undefined;
  active?: boolean | undefined;
  size?: number;
  style?: CSSProperties | undefined;
};

/** 44px square icon button. label is required for accessibility. */
export function IconButton({ name, label, c, active, size = 44, style, ...rest }: IconButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-m)",
        border: "1px solid transparent",
        background: hover ? "var(--bg-sunken)" : "transparent",
        color: active ? (c ? "var(--c-" + c + ")" : "var(--ink)") : "var(--ink-2)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "background var(--dur-fast) var(--ease)",
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      <Icon name={name} size={size >= 44 ? 22 : 18} />
    </button>
  );
}
