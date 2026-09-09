// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 122). Behavior unchanged.
// One component, four variants; the host keeps the other variants' data when the segment changes.
import type { CSSProperties } from "react";
import { Chip } from "./Chip";
import { Input } from "./Input";
import { Select } from "./Select";
import { VocabularyPicker } from "./VocabularyPicker";

export type Segment = "returnee" | "anchor" | "ally" | "exploring";

export type SegmentField =
  | { k: "timeline"; label: string; kind: "select" }
  | { k: "needs" | "offer" | "support"; label: string; kind: "text"; short?: false }
  | { k: "base"; label: string; kind: "text"; short: true }
  | { k: "interests"; label: string; kind: "vocab" };

// Ruling 187: the labels are not here. public.member_segments is the one label source, reaching
// this component as vocabularies().segments (the chooser) and profile_view's member.segment_label
// (the heading). Ruling 194: nor are the return_timeline values, which come in as timelineOptions
// from the same projection; the literal that used to sit beside them as a fallback is gone, and a
// vocabulary that does not load renders an empty control rather than a stale one. SEG carries only
// the per-variant field sets, which are structure, not vocabulary.
export const SEG: Record<Segment, { fields: SegmentField[] }> = {
  returnee: {
    fields: [
      { k: "timeline", label: "Return timeline", kind: "select" },
      { k: "needs", label: "What I need on the ground", kind: "text" },
    ],
  },
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
  segment?: Segment | undefined;
  timeline?: string | undefined;
  needs?: string | undefined;
  base?: string | undefined;
  offer?: string | undefined;
  support?: string | undefined;
  interests?: string[] | undefined;
};

export type SegmentBlockProps = {
  segment?: Segment;
  data?: SegmentData;
  editing?: boolean | undefined;
  onChange?: ((data: SegmentData) => void) | undefined;
  interestOptions?: string[];
  timelineOptions?: string[] | undefined;
  /** Ruling 187: the chooser's values and labels, from vocabularies().segments. */
  segmentOptions?: { value: Segment; label: string }[] | undefined;
  style?: CSSProperties | undefined;
};

export function SegmentBlock({
  segment = "exploring",
  data = {},
  editing,
  onChange,
  interestOptions = [],
  timelineOptions,
  segmentOptions = [],
  style,
}: SegmentBlockProps) {
  const def = SEG[segment] || SEG.exploring;
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
          value={segment}
          options={segmentOptions}
          onChange={(e) => onChange && onChange({ ...data, segment: e.target.value as Segment })}
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
