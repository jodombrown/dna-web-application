// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 122). Behavior unchanged.
// One component, four variants; the host keeps the other variants' data when the segment changes.
import type { CSSProperties } from "react";
import { Chip } from "./Chip";
import { Input } from "./Input";
import { Select } from "./Select";
import { VocabularyPicker } from "./VocabularyPicker";

export type Segment = "returnee" | "anchor" | "ally" | "exploring";

export type SegmentField =
  | { k: "timeline"; label: string; kind: "select"; options: string[] }
  | { k: "needs" | "offer" | "support"; label: string; kind: "text"; short?: false }
  | { k: "base"; label: string; kind: "text"; short: true }
  | { k: "interests"; label: string; kind: "vocab" };

export const SEG: Record<Segment, { label: string; fields: SegmentField[] }> = {
  returnee: {
    label: "Returnee",
    fields: [
      {
        k: "timeline",
        label: "Return timeline",
        kind: "select",
        options: ["Already back", "Within a year", "One to three years", "Someday, not fixed"],
      },
      { k: "needs", label: "What I need on the ground", kind: "text" },
    ],
  },
  anchor: {
    label: "Anchor",
    fields: [
      { k: "base", label: "Continental base", kind: "text", short: true },
      { k: "offer", label: "What I can host or offer", kind: "text" },
    ],
  },
  ally: { label: "Ally", fields: [{ k: "support", label: "How I support", kind: "text" }] },
  exploring: {
    label: "Still Exploring",
    fields: [{ k: "interests", label: "Interests", kind: "vocab" }],
  },
};

export const SEGMENT_LABEL: Record<Segment, string> = {
  returnee: "Returnee",
  anchor: "Anchor",
  ally: "Ally",
  exploring: "Still Exploring",
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
  style?: CSSProperties | undefined;
};

export function SegmentBlock({
  segment = "exploring",
  data = {},
  editing,
  onChange,
  interestOptions = [],
  timelineOptions,
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
          options={(Object.keys(SEG) as Segment[]).map((k) => ({ value: k, label: SEG[k].label }))}
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
                  ...(timelineOptions ?? f.options).map((o) => ({ value: o, label: o })),
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
