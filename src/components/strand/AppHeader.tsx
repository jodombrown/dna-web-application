// Ported from Strand components/dna/AppHeader.jsx (B2-Shell-Feed-v2). Behavior unchanged.
// Production addition: `home` lets the host render the logo and Home item as real client-side
// links (hover-intent prefetch, ruling 84); the bundle's onHome callback is kept for parity.
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { assetBase } from "./cmeta";

export type AppHeaderProps = {
  variant?: "compact" | "expanded";
  homeActive?: boolean | undefined;
  onHome?: ((e: MouseEvent<HTMLElement>) => void) | undefined;
  /** Home link target, rendered as an anchor so it prefetches and opens in a new tab. */
  homeHref?: string | undefined;
  onHomeIntent?: (() => void) | undefined;
  member?: { name?: string | undefined; src?: string | undefined };
  onCompose?: (() => void) | undefined;
  composePlaceholder?: string;
  onAvatar?: (() => void) | undefined;
  avatarActive?: boolean | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** App shell header (ruling 69). Mounted once at the app root; no surface composes its own.
 *  variant "compact": touch and medium tiers. Logo is Home. Composer pill, then children (the NotificationBell slot), then avatar.
 *  variant "expanded": logo plus a labelled Home item; the five-C row (PulseDock bar) sits directly beneath. */
export function AppHeader({
  variant = "compact",
  homeActive,
  onHome,
  homeHref,
  onHomeIntent,
  member = {},
  onCompose,
  composePlaceholder = "What is going on with you?",
  onAvatar,
  avatarActive,
  children,
  style,
}: AppHeaderProps) {
  const exp = variant === "expanded";
  const logo = assetBase() + "logo.png";
  const [hh, setHh] = useState(false);
  const HomeTag = homeHref ? "a" : "button";
  const homeProps = homeHref ? { href: homeHref } : { type: "button" as const };
  return (
    <header
      data-app-header
      style={{
        display: "flex",
        alignItems: "center",
        gap: exp ? 16 : 10,
        height: exp ? 64 : 56,
        padding: exp ? "0 32px" : "0 8px 0 16px",
        background: "var(--bg)",
        borderBottom: exp ? "none" : "1px solid var(--line)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        boxSizing: "border-box",
        flex: "none",
        ...style,
      }}
    >
      <HomeTag
        {...homeProps}
        onClick={onHome}
        onMouseEnter={onHomeIntent}
        aria-label="Home"
        aria-current={homeActive && !exp ? "page" : undefined}
        data-testid="home"
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          flex: "none",
        }}
      >
        <img src={logo} alt="DNA" style={{ height: exp ? 28 : 24, display: "block" }} />
      </HomeTag>
      {exp && (
        <HomeTag
          {...homeProps}
          onClick={onHome}
          aria-current={homeActive ? "page" : undefined}
          onMouseEnter={() => {
            setHh(true);
            onHomeIntent?.();
          }}
          onMouseLeave={() => setHh(false)}
          data-testid="home-item"
          style={{
            all: "unset",
            cursor: "pointer",
            minHeight: 44,
            padding: "0 12px",
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 500,
            color: homeActive ? "var(--ink)" : "var(--ink-3)",
            background: hh ? "var(--bg-sunken)" : "transparent",
            transition: "background var(--dur-fast) var(--ease)",
          }}
        >
          <span
            style={{
              lineHeight: 1.2,
              borderBottom: homeActive ? "2px solid var(--ink)" : "2px solid transparent",
            }}
          >
            Home
          </span>
        </HomeTag>
      )}
      {exp && <span style={{ flex: 1 }} />}
      <button
        type="button"
        onClick={onCompose}
        aria-label="Open the composer"
        data-testid="compose"
        style={{
          all: "unset",
          boxSizing: "border-box",
          cursor: "text",
          flex: exp ? "none" : 1,
          width: exp ? 320 : undefined,
          minWidth: 0,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 14px",
          borderRadius: 999,
          background: "var(--bg-sunken)",
          color: "var(--ink-3)",
          fontSize: 15,
        }}
      >
        <Icon name="pen-line" size={16} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {composePlaceholder}
        </span>
      </button>
      {children}
      <button
        type="button"
        onClick={onAvatar}
        aria-label="Your profile"
        aria-expanded={avatarActive === undefined ? undefined : !!avatarActive}
        data-testid="avatar"
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <Avatar name={member.name ?? ""} src={member.src} size={exp ? 36 : 32} />
      </button>
    </header>
  );
}
