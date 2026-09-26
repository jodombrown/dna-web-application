// Ported from Strand components/core/Icon.jsx. Behavior unchanged. `size` is a number or, as
// BrowseTile passes `var(--icon-inline)` at compile v1790410319010950, a CSS length; the compiled
// part sizes by either, so the type is what widened (handoff 33-D).
import type { CSSProperties, HTMLAttributes } from "react";
import { assetBase } from "./cmeta";

export type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "style"> & {
  name: string;
  size?: number | string;
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
