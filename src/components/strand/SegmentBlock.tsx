// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 122). Behavior unchanged.
// One component, five variants; the host keeps the other variants' data when the stance changes.
import type { CSSProperties } from "react";
import { Chip } from "./Chip";
import { Input } from "./Input";
import { Select } from "./Select";
import { VocabularyPicker } from "./VocabularyPicker";

// Brief 5 (ruling 300): the axis is stance, five values in the register's order. kin carries no
// per-variant fields; a Kin member's block renders their label alone.
export type Stance = "returnee" | "kin" | "anchor" | "ally" | "exploring";

export type SegmentField =
  | { k: "timeline"; label: string; kind: "select" }
  | { k: "needs" | "offer" | "support"; label: string; kind: "text"; short?: false }
  | { k: "base"; label: string; kind: "text"; short: true }
  | { k: "interests"; label: string; kind: "vocab" };

// Ruling 187: the labels are not here. public.member_stances is the one label source, reaching
// this component as vocabularies().stances (the chooser) and profile_view's member.stance_label
// (the heading). Ruling 194: nor are the return_timeline values, which come in as timelineOptions
// from the same projection; the literal that used to sit beside them as a fallback is gone, and a
// vocabulary that does not load renders an empty control rather than a stale one. SEG carries only
// the per-variant field sets, which are structure, not vocabulary.
export const SEG: Record<Stance, { fields: SegmentField[] }> = {
  returnee: {
    fields: [
      { k: "timeline", label: "Return timeline", kind: "select" },
      { k: "needs", label: "What I need on the ground", kind: "text" },
    ],
  },
  kin: { fields: [] },
  anchor: {
    fields: [
      { k: "base", label: "Continental base", kind: "text", short: true },
      { k: "offer", label: "What I can host or offer", kind: "text" },
    ],
  },
  ally: { fields: [{ k: "support", label: "How I support", kind: "text" }] },
  exploring: {
    fields: [{ k: "interests", label: "Interests", kind: "vocab" }],
  },
};

export type SegmentData = {
  stance?: Stance | undefined;
  timeline?: string | undefined;
  needs?: string | undefined;
  base?: string | undefined;
  offer?: string | undefined;
  support?: string | undefined;
  interests?: string[] | undefined;
};

export type SegmentBlockProps = {
  stance?: Stance;
  data?: SegmentData;
  editing?: boolean | undefined;
  onChange?: ((data: SegmentData) => void) | undefined;
  interestOptions?: string[];
  timelineOptions?: string[] | undefined;
  /** Ruling 187: the chooser's values and labels, from vocabularies().stances. */
  stanceOptions?: { value: Stance; label: string }[] | undefined;
  style?: CSSProperties | undefined;
};

export function SegmentBlock({
  stance = "exploring",
  data = {},
  editing,
  onChange,
  interestOptions = [],
  timelineOptions,
  stanceOptions = [],
  style,
}: SegmentBlockProps) {
  const def = SEG[stance] || SEG.exploring;
  const set = (k: keyof SegmentData, v: string | string[]) =>
    onChange && onChange({ ...data, [k]: v });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: editing ? 16 : 12,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {editing && (
        <Select
          label="Segment"
          value={stance}
          options={stanceOptions}
          onChange={(e) => onChange && onChange({ ...data, stance: e.target.value as Stance })}
        />
      )}
      {def.fields.map((f) => {
        const v = data[f.k];
        if (editing) {
          if (f.kind === "select")
            return (
              <Select
                key={f.k}
                label={f.label}
                value={(v as string | undefined) || ""}
                options={[
                  { value: "", label: "Choose" },
                  ...(timelineOptions ?? []).map((o) => ({ value: o, label: o })),
                ]}
                onChange={(e) => set(f.k, e.target.value)}
              />
            );
          if (f.kind === "vocab")
            return (
              <VocabularyPicker
                key={f.k}
                label={f.label}
                options={interestOptions}
                value={(v as string[] | undefined) || []}
                onChange={(x) => set(f.k, x)}
                max={5}
              />
            );
          return (
            <Input
              key={f.k}
              label={f.label}
              multiline={!("short" in f && f.short)}
              rows={3}
              value={(v as string | undefined) || ""}
              onChange={(e) => set(f.k, (e.target as HTMLInputElement).value)}
            />
          );
        }
        const has = Array.isArray(v) ? v.length > 0 : !!v;
        if (!has) return null;
        return (
          <div key={f.k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{f.label}</div>
            {Array.isArray(v) ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {v.map((x) => (
                  <Chip key={x}>{x}</Chip>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 17, lineHeight: 1.5, textWrap: "pretty" }}>{v}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
