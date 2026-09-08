// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 135). Attestations across DNA
// in one C, placed by DIA; only attestations whose owner set Badges to Everyone on DNA and shares
// their profile. Snap row, rotates one card every 4s, pauses on hover or touch, still under reduced
// motion. Renders nothing when empty.
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { CBadge } from "./CBadge";
import { CAPS } from "./SectionCard";
import { C_INFO } from "./cinfo";
import type { C } from "./cmeta";

export type AttestationItem = {
  member: string;
  avatar?: string | undefined;
  object: string;
  attester: string;
  /** Absent when the attester is unnamed on a signed-out surface (ruling 141). */
  role?: string | null | undefined;
  when: string;
  href?: string | undefined;
};

export type AttestationRailProps = {
  c: C;
  items?: AttestationItem[];
  onOpen?: ((item: AttestationItem) => void) | undefined;
};

export function AttestationRail({ c, items = [], onOpen }: AttestationRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pause, setPause] = useState(false);
  useEffect(() => {
    if (
      pause ||
      items.length < 2 ||
      (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const first = el.firstElementChild as HTMLElement | null;
      const w = first ? first.offsetWidth + 12 : 260;
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({ left: end ? 0 : el.scrollLeft + w, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(t);
  }, [pause, items.length]);
  if (!items.length) return null;
  return (
    <div
      data-testid="attestation-rail"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "16px 0 8px",
        borderTop: "1px solid var(--line)",
      }}
    >
      <h3 style={{ ...CAPS, padding: "0 24px" }}>Attested in {C_INFO[c].label} on DNA</h3>
      <div
        ref={ref}
        onMouseEnter={() => setPause(true)}
        onMouseLeave={() => setPause(false)}
        onTouchStart={() => setPause(true)}
        onTouchEnd={() => setPause(false)}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          padding: "0 24px 8px",
          scrollbarWidth: "none",
        }}
      >
        {items.map((it, i) => (
          <a
            key={i}
            href={it.href || "#"}
            onClick={(e) => {
              if (onOpen) {
                e.preventDefault();
                onOpen(it);
              }
            }}
            style={{
              flex: "none",
              width: 248,
              scrollSnapAlign: "start",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-1)",
              textDecoration: "none",
              color: "var(--ink)",
              boxSizing: "border-box",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={it.member} src={it.avatar} size={28} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {it.member}
              </span>
              <span style={{ flex: 1 }} />
              <CBadge c={c} size={24} />
            </span>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35, textWrap: "pretty" }}>
              {it.object}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.4 }}>
              Attested by {it.attester}
              {it.role ? ", " + it.role : ""} · {it.when}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
