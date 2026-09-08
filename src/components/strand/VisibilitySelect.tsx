// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3). Behavior unchanged.
import type { CSSProperties } from "react";
import type { Audience } from "./AudienceSelect";
import { Icon } from "./Icon";

/** Audience per section (ruling 124). Anchored (ruling 136) admits a visitor who holds a role in a
 *  Space the owner holds a role in, or who shares an attested event with the owner. */
export const AUD: { value: Audience; label: string; icon: string }[] = [
  { value: "everyone", label: "Everyone on DNA", icon: "globe" },
  { value: "connections", label: "My connections", icon: "users" },
  { value: "anchored", label: "Anchored", icon: "map-pin" },
];

export type VisibilitySelectProps = {
  value?: Audience | undefined;
  onChange?: ((value: Audience) => void) | undefined;
  style?: CSSProperties | undefined;
};

/** Compact icon select; label read by the icon plus the select's own text. Owner only, read view only. */
export function VisibilitySelect({ value = "everyone", onChange, style }: VisibilitySelectProps) {
  const cur = AUD.find((a) => a.value === value) || AUD[0]!;
  return (
    <label
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 36,
        padding: "0 30px 0 10px",
        borderRadius: "var(--radius-m)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--ink-2)",
        cursor: "pointer",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Icon name={cur.icon} size={14} />
      <span>{cur.label}</span>
      <Icon
        name="chevron-down"
        size={14}
        style={{ position: "absolute", right: 10, color: "var(--ink-3)", pointerEvents: "none" }}
      />
      <select
        aria-label="Who can see this section"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value as Audience)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
      >
        {AUD.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </label>
  );
}
