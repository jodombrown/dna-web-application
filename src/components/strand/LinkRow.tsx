// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 128). Behavior unchanged.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type LinkKind = "website" | "linkedin" | "x" | "instagram";
export type Links = Partial<Record<LinkKind, string | null | undefined>>;

/** Website plus three handles, in this order. Brand glyphs are a Strand decision; at-sign stands in. */
export const LINK_KINDS: { k: LinkKind; label: string; icon: string }[] = [
  { k: "website", label: "Website", icon: "globe" },
  { k: "linkedin", label: "LinkedIn", icon: "at-sign" },
  { k: "x", label: "X", icon: "at-sign" },
  { k: "instagram", label: "Instagram", icon: "at-sign" },
];

export type LinkRowProps = { links?: Links; style?: CSSProperties | undefined };

/** Links (ruling 128): icons with labels; handles render with "@"; website opens in a new tab. Never counts. */
export function LinkRow({ links = {}, style }: LinkRowProps) {
  const items = LINK_KINDS.filter((l) => links[l.k]);
  if (!items.length) return null;
  return (
    <div
      data-testid="links"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 20px",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {items.map((l) => {
        const v = links[l.k] as string;
        const href = l.k === "website" ? (v.startsWith("http") ? v : "https://" + v) : "#";
        const text =
          l.k === "website" ? v.replace(/^https?:\/\//, "") : v.startsWith("@") ? v : "@" + v;
        return (
          <a
            key={l.k}
            href={href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--bg-sunken)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-2)",
              }}
            >
              <Icon name={l.icon} size={16} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span>{text}</span>
              <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 400 }}>
                {l.label}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
