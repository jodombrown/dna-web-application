// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3). Behavior unchanged.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type IdentityMarkProps = {
  size?: number;
  title?: string;
  style?: CSSProperties | undefined;
};

/** Identified tier mark (ruling 123): a small ink check on the avatar corner. Never a ring, never a percentage. */
export function IdentityMark({ size = 22, title = "Identified", style }: IdentityMarkProps) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "var(--ink)",
        color: "var(--on-fill)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid var(--bg)",
        boxSizing: "content-box",
        ...style,
      }}
    >
      <Icon name="check" size={Math.round(size * 0.6)} />
    </span>
  );
}
