// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 126). Behavior unchanged.
import type { CSSProperties, ReactNode } from "react";
import type { Audience } from "./AudienceSelect";
import { Button } from "./Button";
import { CBadge } from "./CBadge";
import { IconButton } from "./IconButton";
import { VisibilitySelect } from "./VisibilitySelect";
import type { C } from "./cmeta";

export const CAPS: CSSProperties = {
  margin: 0,
  fontSize: 13,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--ink-3)",
};

export type SectionCardProps = {
  title: string;
  owner?: boolean | undefined;
  editing?: boolean | undefined;
  keepVisibility?: boolean | undefined;
  onEdit?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  visibility?: Audience | undefined;
  onVisibility?: ((value: Audience) => void) | undefined;
  empty?: string | null | undefined;
  emptyAct?: string | null | undefined;
  onEmptyAct?: (() => void) | undefined;
  c?: C | undefined;
  saving?: boolean | undefined;
  children?: ReactNode;
  style?: CSSProperties | undefined;
  testId?: string | undefined;
};

/** Section chassis: caps title, owner controls (audience, edit), body or the owner's empty act; a visitor's empty section never mounts this. */
export function SectionCard({
  title,
  owner,
  editing,
  keepVisibility,
  onEdit,
  onSave,
  onCancel,
  visibility,
  onVisibility,
  empty,
  emptyAct,
  onEmptyAct,
  c,
  saving,
  children,
  style,
  testId,
}: SectionCardProps) {
  const isEmpty = !!empty && !editing;
  return (
    <section
      aria-label={title}
      data-testid={testId}
      data-editing={editing ? "1" : "0"}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <header
        style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36, flexWrap: "wrap" }}
      >
        {c && <CBadge c={c} size={32} />}
        <h2 style={{ ...CAPS, flex: 1, minWidth: 0 }}>{title}</h2>
        {owner && (!editing || keepVisibility) && onVisibility && (
          <VisibilitySelect value={visibility} onChange={onVisibility} />
        )}
        {owner && !editing && onEdit && !isEmpty && (
          <IconButton name="pen-line" label={"Edit " + title} size={36} onClick={onEdit} />
        )}
      </header>
      {isEmpty ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.45,
              color: "var(--ink-2)",
              textWrap: "pretty",
            }}
          >
            {empty}
          </p>
          {emptyAct && (
            <Button variant="secondary" c={c} size="sm" onClick={onEmptyAct}>
              {emptyAct}
            </Button>
          )}
        </div>
      ) : (
        children
      )}
      {editing && (
        <footer
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            paddingTop: 4,
            borderTop: "1px solid var(--line)",
          }}
        >
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            Save
          </Button>
        </footer>
      )}
    </section>
  );
}
