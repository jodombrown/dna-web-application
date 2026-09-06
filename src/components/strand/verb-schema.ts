// VERB_SCHEMA from Strand components/dna/Composer.jsx, split into its own module so the card
// router (src/components/dna/PostCardRouter.tsx) and the Composer share it without a cycle.
import type { C } from "./cmeta";

export type FieldKey =
  | "title"
  | "who"
  | "why"
  | "date"
  | "time"
  | "place"
  | "hybrid"
  | "ticket"
  | "category"
  | "roles"
  | "instrument"
  | "need"
  | "by";

export type VerbField = {
  key: FieldKey;
  label: string;
  icon?: string;
  title?: boolean;
  multiline?: boolean;
  kind?: "toggle" | "segment";
  options?: string[];
};

export type VerbSchema = { kicker: string | null; action: string | null; fields: VerbField[] };

/** Structured fields of the object each verb creates (brief: backing data shape). */
export const VERB_SCHEMA: Record<C, VerbSchema> = {
  connect: {
    kicker: "Intro",
    action: "Accept the intro",
    fields: [
      { key: "who", label: "Who", icon: "user-plus" },
      { key: "why", label: "Why", icon: "message-circle", multiline: true },
    ],
  },
  convene: {
    kicker: "Event",
    action: "Get a ticket",
    fields: [
      { key: "title", label: "Title", title: true },
      { key: "date", label: "Date", icon: "calendar" },
      { key: "time", label: "Time", icon: "clock" },
      { key: "place", label: "Location or link", icon: "map-pin" },
      { key: "hybrid", label: "Hybrid", kind: "toggle" },
      {
        key: "ticket",
        label: "Ticket",
        icon: "ticket",
        kind: "segment",
        options: ["Free", "Paid"],
      },
    ],
  },
  collaborate: {
    kicker: "Space",
    action: "Join the Space",
    fields: [
      { key: "title", label: "Title", title: true },
      { key: "category", label: "Category", icon: "hash" },
      { key: "roles", label: "Roles sought", icon: "users" },
    ],
  },
  contribute: {
    kicker: "Need",
    action: "Offer to help",
    fields: [
      { key: "title", label: "Title", title: true },
      {
        key: "instrument",
        label: "Instrument",
        icon: "briefcase",
        kind: "segment",
        options: ["Time", "Skills", "In-kind"],
      },
      { key: "need", label: "What is needed", icon: "circle-dot", multiline: true },
      { key: "by", label: "By when", icon: "calendar" },
    ],
  },
  convey: {
    kicker: "Story",
    action: "Read the story",
    fields: [{ key: "title", label: "Title", title: true }],
  },
};

/** Untyped member posts fall back to Convey with no kicker, title, or action (ruling 68). */
export const UNTYPED: VerbSchema = { kicker: null, action: null, fields: [] };

export type FieldValue = { value: string | boolean; mine: boolean };
export type FieldValues = Partial<Record<FieldKey, FieldValue>>;

/** Build the PostCard field rows for a verb from keyed values. Title rows are excluded (the card title carries it). */
export function fieldRows(verb: C | null, fv: FieldValues) {
  const schema = verb ? VERB_SCHEMA[verb] : UNTYPED;
  return schema.fields
    .filter((f) => !f.title)
    .map((f) => {
      const v = fv[f.key];
      if (!v || v.value === "" || v.value == null || v.value === false) return null;
      return {
        label: f.label,
        icon: f.icon,
        value: v.value === true ? "Yes" : String(v.value),
        mine: v.mine,
      };
    })
    .filter(
      (r): r is { label: string; icon: string | undefined; value: string; mine: boolean } =>
        r !== null,
    );
}
