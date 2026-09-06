// Ported from Strand components/core/Icon.jsx. Behavior unchanged.
import type { CSSProperties, HTMLAttributes } from "react";
import { assetBase } from "./cmeta";

export type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "style"> & {
  name: string;
  size?: number;
  style?: CSSProperties;
};

/** Lucide-style UI icon (1.5px stroke) from assets/icons, rendered as a currentColor mask. */
export function Icon({ name, size = 20, style, ...rest }: IconProps) {
  const m = "url(" + assetBase() + "icons/" + name + ".svg) center / contain no-repeat";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flex: "none",
        background: "currentColor",
        WebkitMask: m,
        mask: m,
        ...style,
      }}
      {...rest}
    />
  );
}
