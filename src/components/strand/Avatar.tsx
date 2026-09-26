// Ported from Strand components/core/Avatar.jsx; at compile v1790410319010950 (correction 31 item 1,
// ratified with correction 30 under 1153) `size` also takes a CSS length, with `radius` and
// `initialSize` optional. A number keeps its radius band and its rounded 40% initials, so every
// numeric-size caller renders as before. Behavior otherwise unchanged.
import type { CSSProperties } from "react";

export type AvatarProps = {
  name?: string;
  src?: string | undefined;
  /** px, or since correction 31 a CSS length ('var(--avatar-card)'). */
  size?: number | string;
  /** With a string size: the radius (default --radius-m). A number size keeps its radius band. */
  radius?: number | string | undefined;
  /** With a string size: the initials' font size (default 40% of the size). */
  initialSize?: number | string | undefined;
  style?: CSSProperties | undefined;
};

/** Member avatar. Photo when present, initials otherwise. Never a placeholder silhouette, never stacked.
 *  size is a number (px) or, since correction 31, a CSS length such as 'var(--avatar-card)'; a length takes the radius band and initial size the caller names
 *  through radius and initialSize, defaulting to --radius-m and 40% of the size rounded to a whole pixel with CSS round(), so a token that resolves to the old number renders the same initials. */
export function Avatar({ name = "", src, size = 40, radius, initialSize, style }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => (s[0] ?? "").toUpperCase())
    .join("");
  const num = typeof size === "number";
  const r =
    radius != null ? radius : num ? (size >= 64 ? 14 : size >= 40 ? 10 : 8) : "var(--radius-m)";
  const fs =
    initialSize != null
      ? initialSize
      : num
        ? Math.round(size * 0.4)
        : "round(calc(" + size + " * 0.4), 1px)";
  return src ? (
    <img
      src={src}
      alt={name}
      width={num ? size : undefined}
      height={num ? size : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        objectFit: "cover",
        flex: "none",
        display: "block",
        ...style,
      }}
    />
  ) : (
    <span
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        flex: "none",
        background: "var(--bg-sunken)",
        color: "var(--ink-2)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: fs,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
