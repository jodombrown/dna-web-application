// Design pass 01, strand-patch/SectionCard.jsx (ruling 398; supersedes the SectionCard inside the
// B3-Profile-v3 patch). One change: autosave. The Save and Cancel footer is removed. Text, chips
// and selections write as the member leaves them, and the only feedback is one quiet word in the
// section head, Saving then Saved then nothing, announced once through a polite live region.
// Audience is unchanged and still acts on the tap, because an audience change is a privacy action
// (ruling 499 gives it its own words rather than the quiet Saved; the host supplies them).
// Everything else, including the caps title, the glyph badge, the edit affordance and the owner's
// empty act, is Brief 3 as built.
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
  /** A field inside the card lost focus while editing: the host writes what it holds (ruling 398). */
  onCommit?: (() => void) | undefined;
  /** Focus left the card entirely: the host flushes the write and closes the editor (ruling 398). */
  onLeave?: (() => void) | undefined;
  visibility?: Audience | undefined;
  onVisibility?: ((value: Audience) => void) | undefined;
  empty?: string | null | undefined;
  emptyAct?: string | null | undefined;
  onEmptyAct?: (() => void) | undefined;
  c?: C | undefined;
  /** The one quiet word in the head. "saving" then "saved" then null. */
  save?: "saving" | "saved" | null | undefined;
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
  onCommit,
  onLeave,
  visibility,
  onVisibility,
  empty,
  emptyAct,
  onEmptyAct,
  c,
  save,
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
      onBlur={(e) => {
        if (!editing) return;
        // Text, chips and selections write as the member leaves them (ruling 398). Leaving one
        // field for the next inside the same card is still a leave; leaving the card is both.
        onCommit?.();
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;
        onLeave?.();
      }}
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
        {/* Ruling 398: the only trace of a section write. One word, announced once. */}
        <span
          role="status"
          aria-live="polite"
          data-save-word={save ?? undefined}
          style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 400 }}
        >
          {save === "saving" ? "Saving" : save === "saved" ? "Saved" : ""}
        </span>
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
    </section>
  );
}
