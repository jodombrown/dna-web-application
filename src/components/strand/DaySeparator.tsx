// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4), ported from the
// prototype `B14-Messenger-v1.dc.html`'s separator in `threadNode()`: a centred pill naming the day,
// `Monday 29 September`, `Yesterday`, `Today`. A date, never a count (section 4). Proposed for
// Strand; built here from the prototype's own source with Strand's tokens, both themes.
import type { CSSProperties } from "react";

export type DaySeparatorProps = {
  label: string;
  style?: CSSProperties | undefined;
};

export function DaySeparator({ label, style }: DaySeparatorProps) {
  return (
    <div
      role="separator"
      aria-label={label}
      data-day-separator
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "var(--space-3) 0 var(--space-1)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: "var(--text-xs)",
          lineHeight: "var(--text-xs-lh)",
          color: "var(--ink-3)",
          padding: "2px var(--space-3)",
          borderRadius: 999,
          background: "var(--bg-sunken)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
