// Ported from Strand components/dna/IdentityMark.jsx at compile v1791495246160097 (correction 56,
// ratified 1599; the part itself 1497 under doctrine 123; the port 1530, handoff 44-MC-R3).
// Behavior unchanged. Translations: the import path and TypeScript types; `size` is a number here,
// as every caller passes one, so the check is always `Math.round(size * 0.6)`. The previous app part
// of this name in src/components/dna/ (B3-Profile-v3's, a 2px --bg rim on --on-fill) is deleted; this
// is the one implementation (1530). Record: docs/strand-ports/v1791495246160097.md.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type IdentityMarkProps = {
  size?: number;
  label?: string;
  style?: CSSProperties | undefined;
};

/** IdentityMark (ruling 1497, doctrine 123).
 *  One fact, drawn once: this member's identity was verified. It is not a score, a tier, a stance or a completion.
 *  So there is no ring, no arc, no percentage and no second degree — a member is identified or the mark is absent (grounded or empty).
 *  Ink on the card's own surface, which is why it reads on a photograph, on the initials tile and in both themes without a per-theme branch:
 *  the disc is --ink and the check is --surface, so the pair inverts with the theme on its own.
 *  The 1px --surface rim is separation, not a ring around a value: against a dark photograph an ink disc would otherwise dissolve.
 *  role="img" with a fixed accessible name, since the mark says one thing and takes no interaction. Where it sits is the caller's business:
 *  MemberCard places it on the portrait's corner, outside the portrait's aria-hidden panel, so a screen reader hears the name once and the mark once. */
export function IdentityMark({ size = 22, label = "Identified", style }: IdentityMarkProps) {
  return (
    <span
      role="img"
      aria-label={label}
      style={{
        boxSizing: "border-box",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--ink)",
        color: "var(--surface)",
        border: "1px solid var(--surface)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        ...style,
      }}
    >
      <Icon name="check" size={Math.round(size * 0.6)} />
    </span>
  );
}
