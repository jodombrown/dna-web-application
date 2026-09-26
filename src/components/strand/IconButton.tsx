// Ported from Strand components/core/IconButton.jsx; at compile v1790410319010950 (correction 31
// item 3, ruling 1146; ratified with correction 30 under 1153) it wraps itself in Tooltip, drops
// `title=`, and takes `input`. The label is the aria-label and the Tooltip's text, so the button's
// accessible name is unchanged and nothing is announced twice. Without `input` the Tooltip follows
// the device: one on a fine pointer, none on touch. Every other line is the compile's.
//
// The Tooltip's host span is now the element a caller's container lays out, and `style` still
// reaches the button. A caller that positions an IconButton absolutely puts the placement on a
// wrapper around it instead (G136).
import { useState, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import type { C } from "./cmeta";
import type { Mode } from "@/lib/tier";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "title"> & {
  name: string;
  label: string;
  c?: C | undefined;
  active?: boolean | undefined;
  size?: number;
  /** Overrides the detected input mode for the built-in Tooltip (touch renders none). */
  input?: Mode | undefined;
  style?: CSSProperties | undefined;
};

/** 44px square icon button. label is required for accessibility: it is the aria-label and, since correction 31 (1146), the Tooltip's text in place of title=. */
export function IconButton({
  name,
  label,
  c,
  active,
  size = 44,
  input,
  style,
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  return (
    <Tooltip label={label} input={input}>
      <button
        type="button"
        aria-label={label}
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
          transition: "background var(--dur-default) var(--ease)",
          ...style,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...rest}
      >
        <Icon name={name} size={size >= 44 ? 22 : 18} />
      </button>
    </Tooltip>
  );
}
