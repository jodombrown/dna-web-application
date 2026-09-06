// Ported from Strand components/dna/CBadge.jsx. Behavior unchanged.
import type { CSSProperties } from "react";
import { assetBase, C_GLYPH, C_LABEL, type C } from "./cmeta";

export type CBadgeProps = {
  c?: C | "brand";
  size?: number;
  label?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** Adinkra glyph in a rounded-square badge on the C tint. The only place C identity is drawn as an icon. */
export function CBadge({ c = "connect", size = 32, label, style }: CBadgeProps) {
  const url = assetBase() + "adinkra/" + (C_GLYPH[c] || C_GLYPH.brand) + ".svg";
  const m = "url(" + url + ") center / contain no-repeat";
  const isBrand = c === "brand";
  const bg = isBrand ? "var(--bg-sunken)" : "var(--c-" + c + "-tint)";
  const fg = isBrand ? "var(--ink)" : "var(--c-" + c + ")";
  const badgeStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size >= 48 ? 10 : 8,
    background: bg,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "none",
  };
  const badge = (extra?: CSSProperties) => (
    <span role="img" aria-label={isBrand ? "DNA" : C_LABEL[c]} style={{ ...badgeStyle, ...extra }}>
      <span
        aria-hidden="true"
        style={{
          width: Math.round(size * 0.56),
          height: Math.round(size * 0.56),
          background: fg,
          WebkitMask: m,
          mask: m,
        }}
      />
    </span>
  );
  if (!label) return badge(style);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}>
      {badge()}
      <span
        style={{
          fontSize: size >= 48 ? 17 : 13,
          fontWeight: 500,
          letterSpacing: size >= 48 ? 0 : "0.06em",
          textTransform: size >= 48 ? "none" : "uppercase",
          color: fg,
        }}
      >
        {isBrand ? "DNA" : C_LABEL[c]}
      </span>
    </span>
  );
}
