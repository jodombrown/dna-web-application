// Ported from the B2-Shell-Feed-v3 extraction, shell/strand-patch/AppHeader.jsx (ruling 99, amends
// 78). Expanded: one row centred in the page max width: logo, five labelled Cs (PulseDock inline),
// then at right Home (unlabelled house icon), bell (children), avatar. No second C row. Compact and
// medium: logo, centre slot, bell, avatar. The centre slot is the composer entry (the Lens Bar
// track's shape: --bg-sunken, --radius-m, 44 tall, not a pill) or the compact LensBar once the
// member has scrolled into the Feed (`lensBar`). lensBar.dense (under 640): the bell leaves with the
// composer and the LensBar's active lens shows its name in place of its icon; avatar stays at the far
// right. Bell and composer return at the top. The logo always goes Home (/feed).
// Production additions: homeHref renders the logo and Home item as real links (hover-intent prefetch,
// ruling 84); onIntentC prefetches a C route from the inline dock.
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { LensBar, type Lens } from "./LensBar";
import { PulseDock, type PulseState } from "./PulseDock";
import { assetBase, type C } from "./cmeta";

export type HeaderLensBar<Id extends string = string> = {
  lenses: Lens<Id>[];
  value: Id;
  onChange?: ((id: Id) => void) | undefined;
  dense?: boolean | undefined;
};

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
  /** Expanded only: the five-C slots inside the row. */
  cActive?: C | null | undefined;
  cStates?: Partial<Record<C, PulseState>> | undefined;
  onSelectC?: ((c: C) => void) | undefined;
  onIntentC?: ((c: C) => void) | undefined;
  /** Compact and medium only: the LensBar takes the centre slot while the member is in the list. */
  lensBar?: HeaderLensBar | null | undefined;
  maxWidth?: number;
  children?: ReactNode;
  style?: CSSProperties | undefined;
};

/** App shell header (ruling 69). Mounted once at the app root; no surface composes its own. */
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
  cActive,
  cStates,
  onSelectC,
  onIntentC,
  lensBar,
  maxWidth = 1440,
  children,
  style,
}: AppHeaderProps) {
  const exp = variant === "expanded";
  const logo = assetBase() + "logo.png";
  const [hh, setHh] = useState(false);
  const HomeTag = homeHref ? "a" : "button";
  const homeProps = homeHref ? { href: homeHref } : { type: "button" as const };
  const showLens = !exp && !!lensBar;
  return (
    <header
      data-app-header
      data-centre={showLens ? "lens" : "compose"}
      style={{
        display: "flex",
        height: exp ? 64 : 56,
        padding: exp ? "0 32px" : "0 8px 0 16px",
        background: "var(--bg)",
        borderBottom: "1px solid var(--line)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        boxSizing: "border-box",
        flex: "none",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: exp ? 8 : 6,
          width: "100%",
          maxWidth: exp ? maxWidth : undefined,
          margin: "0 auto",
          minWidth: 0,
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
        {!exp &&
          (showLens && lensBar ? (
            <LensBar
              compact
              dense={lensBar.dense}
              lenses={lensBar.lenses}
              value={lensBar.value}
              onChange={lensBar.onChange}
              style={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <button
              type="button"
              onClick={onCompose}
              aria-label="Open the composer"
              data-testid="compose"
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "text",
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 14px",
                background: "var(--bg-sunken)",
                borderRadius: "var(--radius-m)",
                color: "var(--ink-3)",
                fontSize: 15,
              }}
            >
              <Icon name="pen-line" size={16} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {composePlaceholder}
              </span>
            </button>
          ))}
        {exp && (
          <PulseDock
            inline
            active={cActive ?? undefined}
            states={cStates}
            onSelect={onSelectC}
            onIntent={onIntentC}
            style={{ flex: 1, justifyContent: "space-evenly", minWidth: 0, padding: "0 24px" }}
          />
        )}
        {exp && (
          <HomeTag
            {...homeProps}
            onClick={onHome}
            aria-label="Home"
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
              width: 44,
              height: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              flex: "none",
              color: homeActive ? "var(--ink)" : "var(--ink-3)",
              background: hh ? "var(--bg-sunken)" : "transparent",
              transition:
                "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
            }}
          >
            <Icon name="house" size={22} />
          </HomeTag>
        )}
        {!(showLens && lensBar?.dense) && children}
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
      </div>
    </header>
  );
}
