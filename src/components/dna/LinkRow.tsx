// Ported from the app project's profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 128); not a
// Strand part, so it lives here and not in src/components/strand/ (handoff 37-E item 5, 1232).
// Handoff 37-E item 4 (1232): one address rule for every link the profile and the event page draw,
// `linkHref`. A full http(s) URL of any kind is an anchor to it in a new tab; a bare website is
// prefixed https:// and links (Chat's reading of 1232, so today's only website row stays a link);
// a bare handle is plain text, never `href="#"`. PresenterLinks in EventParts.tsx reads the same
// function and keeps no address logic of its own.
import type { CSSProperties } from "react";
import { Icon } from "@/components/strand/Icon";

export type LinkKind = "website" | "linkedin" | "x" | "instagram";
export type Links = Partial<Record<LinkKind, string | null | undefined>>;

/** Website plus three handles, in this order. Brand glyphs are a Strand decision; at-sign stands in. */
export const LINK_KINDS: { k: LinkKind; label: string; icon: string }[] = [
  { k: "website", label: "Website", icon: "globe" },
  { k: "linkedin", label: "LinkedIn", icon: "at-sign" },
  { k: "x", label: "X", icon: "at-sign" },
  { k: "instagram", label: "Instagram", icon: "at-sign" },
];

const FULL_URL = /^https?:\/\//i;

/**
 * The one link-address rule (1232). A value that is a full URL (`^https?://`, case-insensitive) is
 * the address for any kind. A bare value links only as a website, with https:// prefixed. Any other
 * value has no address: the caller renders it as text and never as an anchor.
 */
export function linkHref(kind: LinkKind, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (FULL_URL.test(v)) return v;
  if (kind === "website") return "https://" + v;
  return null;
}

/** What a link reads as: a URL without its scheme, else a handle with its at-sign. */
export function linkText(kind: LinkKind, value: string): string {
  const v = value.trim();
  if (FULL_URL.test(v) || kind === "website") return v.replace(FULL_URL, "");
  return v.startsWith("@") ? v : "@" + v;
}

export type LinkRowProps = { links?: Links; style?: CSSProperties | undefined };

/** Links (ruling 128): icons with labels. A value with an address opens in a new tab; a bare handle is plain text. Never counts. */
export function LinkRow({ links = {}, style }: LinkRowProps) {
  const items = LINK_KINDS.filter((l) => links[l.k]);
  if (!items.length) return null;
  const item: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    fontSize: 15,
    fontWeight: 500,
    color: "var(--ink)",
    textDecoration: "none",
  };
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
        const href = linkHref(l.k, v);
        const body = (
          <>
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
              <span data-link-text="">{linkText(l.k, v)}</span>
              <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 400 }}>
                {l.label}
              </span>
            </span>
          </>
        );
        return href ? (
          <a
            key={l.k}
            data-link={l.k}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={item}
          >
            {body}
          </a>
        ) : (
          <span key={l.k} data-link={l.k} style={item}>
            {body}
          </span>
        );
      })}
    </div>
  );
}
