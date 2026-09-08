// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 123). Behavior unchanged.
import { useState, type CSSProperties } from "react";
import { CBadge } from "./CBadge";
import type { C } from "./cmeta";

export type BadgeC = Extract<C, "convene" | "collaborate" | "contribute">;
export type BadgeItem = {
  object: string;
  attester: string;
  role?: string | null | undefined;
  when: string;
};
export type Badge = { c: BadgeC; items: BadgeItem[] };

const LBL: Record<BadgeC, string> = {
  convene: "Convene",
  collaborate: "Collaborate",
  contribute: "Contribute",
};

export type BadgeRowProps = { badges?: Badge[]; style?: CSSProperties | undefined };

/** One pill per attested context, each opening to its provenance. Never a count; two attestations are two lines. */
export function BadgeRow({ badges = [], style }: BadgeRowProps) {
  const [open, setOpen] = useState<BadgeC | null>(null);
  if (!badges.length) return null;
  const cur = badges.find((b) => b.c === open);
  return (
    <div
      data-testid="badges"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <div
        role="list"
        aria-label="Attested in"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {badges.map((b) => {
          const on = open === b.c;
          return (
            <button
              key={b.c}
              role="listitem"
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : b.c)}
              style={{
                all: "unset",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minHeight: 36,
                padding: "0 12px 0 6px",
                borderRadius: 999,
                background: on ? "var(--c-" + b.c + "-tint)" : "var(--surface)",
                border: "1px solid " + (on ? "var(--c-" + b.c + ")" : "var(--line)"),
                fontSize: 15,
                fontWeight: 500,
                color: "var(--c-" + b.c + "-text)",
                transition: "background var(--dur-fast) var(--ease)",
              }}
            >
              <CBadge c={b.c} size={24} />
              Attested in {LBL[b.c]}
            </button>
          );
        })}
      </div>
      {cur && (
        <div
          role="region"
          aria-label={"Attested in " + LBL[cur.c] + ", provenance"}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 10,
            background: "var(--bg-sunken)",
          }}
        >
          {cur.items.map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{it.object}</span>
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                Attested by {it.attester}
                {it.role ? ", " + it.role : ""} · {it.when}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
