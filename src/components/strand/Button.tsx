// Ported from Strand components/core/Button.jsx. Behavior unchanged.
import { useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import type { C } from "./cmeta";

const cVar = (c?: C) => (c ? "var(--c-" + c + ")" : "var(--ink)");

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  c?: C | undefined;
  size?: "sm" | "md";
  full?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Button. variant: primary | secondary | ghost | danger. c colors the button in a C (rule 3: target C, not card C). */
export function Button({
  variant = "primary",
  c,
  size = "md",
  disabled,
  full,
  children,
  style,
  ...rest
}: ButtonProps) {
  const color = variant === "danger" ? "var(--danger)" : cVar(c);
  const base: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: size === "sm" ? 15 : 17,
    fontWeight: 500,
    lineHeight: 1,
    minHeight: size === "sm" ? 36 : 44,
    padding: size === "sm" ? "0 14px" : "0 18px",
    borderRadius: "var(--radius-m)",
    border: "1px solid transparent",
    cursor: disabled ? "default" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: full ? "100%" : undefined,
    opacity: disabled ? 0.45 : 1,
    transition: "filter var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
    whiteSpace: "nowrap",
  };
  const v: Record<NonNullable<ButtonProps["variant"]>, CSSProperties> = {
    primary: { background: color, color: "var(--on-fill)" },
    secondary: {
      background: "transparent",
      color,
      borderColor: c || variant === "danger" ? color : "var(--line-strong)",
    },
    ghost: { background: "transparent", color },
    danger: { background: color, color: "var(--on-fill)" },
  };
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const fx: CSSProperties = disabled
    ? {}
    : variant === "primary" || variant === "danger"
      ? { filter: down ? "brightness(0.86)" : hover ? "brightness(0.92)" : "none" }
      : { background: down ? "var(--line)" : hover ? "var(--bg-sunken)" : "transparent" };
  return (
    <button
      type="button"
      disabled={disabled}
      style={{ ...base, ...v[variant], ...fx, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      {...rest}
    >
      {children}
    </button>
  );
}
