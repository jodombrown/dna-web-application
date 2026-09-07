// Strand components/dna/AppHeader.jsx (B2-Shell-Feed-v2). The one header, mounted once by the
// shell (ruling 69): wordmark as Home (Feed is Home, neutral, never a C color), the Compose pill
// (the header's composer entry; Compose is not a lens, ruling 81), the bell, and the controls
// slot. Expanded: 64 tall with the five-C bar beneath; compact and medium: 56 tall, glass, sticky.
import { useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";

export type AppHeaderProps = {
  compact?: boolean | undefined;
  /** Home link: rendered by the host so it is a real client-side link. */
  home: ReactNode;
  onCompose?: (() => void) | undefined;
  bell?: ReactNode;
  controls?: ReactNode;
  /** Expanded only: the five-C bar rendered beneath the header row. */
  nav?: ReactNode;
  style?: CSSProperties | undefined;
};

export function ComposePill({
  onClick,
  compact,
}: {
  onClick?: (() => void) | undefined;
  compact?: boolean | undefined;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="compose"
      aria-label="Compose"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: "unset",
        boxSizing: "border-box",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: compact ? "0 12px" : "0 16px 0 12px",
        borderRadius: 999,
        background: "var(--ink)",
        color: "var(--on-fill)",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
        filter: hover ? "brightness(0.92)" : "none",
        transition: "filter var(--dur-fast) var(--ease)",
      }}
    >
      <Icon name="pen-line" size={18} />
      {!compact && <span>Compose</span>}
    </button>
  );
}

export function AppHeader({
  compact,
  home,
  onCompose,
  bell,
  controls,
  nav,
  style,
}: AppHeaderProps) {
  return (
    <header
      data-app-header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: compact ? "var(--surface-glass)" : "var(--bg)",
        backdropFilter: compact ? "blur(12px)" : undefined,
        WebkitBackdropFilter: compact ? "blur(12px)" : undefined,
        borderBottom: "1px solid var(--line)",
        paddingTop: "env(safe-area-inset-top)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: compact ? 56 : 64,
          padding: compact ? "0 8px 0 16px" : "0 12px 0 24px",
          maxWidth: 1440,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {home}
        <span style={{ flex: 1 }} />
        <ComposePill onClick={onCompose} compact={compact} />
        {bell}
        {controls}
      </div>
      {nav}
    </header>
  );
}
