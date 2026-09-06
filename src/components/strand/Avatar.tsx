// Ported from Strand components/core/Avatar.jsx. Behavior unchanged.
import type { CSSProperties } from "react";

export type AvatarProps = {
  name?: string;
  src?: string | undefined;
  size?: number;
  style?: CSSProperties | undefined;
};

/** Member avatar. Photo when present, initials otherwise. Never a placeholder silhouette, never stacked. */
export function Avatar({ name = "", src, size = 40, style }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => (s[0] ?? "").toUpperCase())
    .join("");
  const r = size >= 64 ? 14 : size >= 40 ? 10 : 8;
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
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
        fontSize: Math.round(size * 0.4),
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
