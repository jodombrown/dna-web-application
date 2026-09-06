// Ported from Strand components/dna/AudienceSelect.jsx. Behavior unchanged.
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type Audience = "everyone" | "connections" | "anchored";

export type AudienceSelectProps = {
  value?: Audience;
  onChange?: ((value: Audience) => void) | undefined;
  anchor?: string | undefined;
  label?: string;
  style?: CSSProperties | undefined;
};

/** Exactly three audiences (rulings 56, 27): everyone, connections, and the anchor when the post is anchored. No public web. */
export function AudienceSelect({
  value = "everyone",
  onChange,
  anchor,
  label = "Who sees this",
  style,
}: AudienceSelectProps) {
  const opts: { id: Audience; icon: string; text: string }[] = [
    { id: "everyone", icon: "globe", text: "Everyone on DNA" },
    { id: "connections", icon: "users", text: "My connections" },
  ];
  if (anchor) opts.push({ id: "anchored", icon: "hash", text: anchor });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>{label}</div>
      <div
        role="radiogroup"
        aria-label={label}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {opts.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange && onChange(o.id)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 44,
                padding: "0 14px",
                borderRadius: 999,
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 500,
                color: on ? "var(--on-fill)" : "var(--ink)",
                background: on ? "var(--ink)" : "transparent",
                border: on ? "1px solid var(--ink)" : "1px solid var(--line)",
                transition: "background var(--dur-fast) var(--ease)",
              }}
            >
              <Icon name={o.icon} size={18} />
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AUDIENCE_LABEL = (value: Audience, anchor?: string | undefined): string =>
  value === "connections"
    ? "My connections"
    : value === "anchored" && anchor
      ? anchor
      : "Everyone on DNA";
