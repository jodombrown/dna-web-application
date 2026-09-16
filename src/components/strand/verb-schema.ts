// VERB_SCHEMA from Strand components/dna/Composer.jsx, split into its own module so the card
// router (src/components/dna/PostCardRouter.tsx) and the Composer share it without a cycle.
import type { C, ComposerVerb } from "./cmeta";

/** The keys VERB_SCHEMA's own fields use. */
export type SchemaKey =
  "title" | "who" | "why" | "category" | "roles" | "instrument" | "need" | "by";

/**
 * Ruling 664: a verb that supplies its own form (Convene, Pass 1) stores its keys namespaced as
 * `{verb}.{key}`; the form sees them un-prefixed. The store is one map, so the key type is the
 * schema's keys plus that namespaced shape, and a `convene.title` can sit beside a `title`.
 */
export type FormKey = `${ComposerVerb}.${string}`;
export type FieldKey = SchemaKey | FormKey;

export type VerbField = {
  key: SchemaKey;
  label: string;
  icon?: string;
  title?: boolean;
  multiline?: boolean;
  kind?: "toggle" | "segment";
  options?: string[];
};

export type VerbSchema = { kicker: string | null; action: string | null; fields: VerbField[] };

/** Structured fields of the object each composer verb creates (brief: backing data shape). */
export const VERB_SCHEMA: Record<ComposerVerb, VerbSchema> = {
  // Convene Pass 1 (rulings 664, 671, 681): Convene supplies its own form through the Composer's
  // `forms.convene` (src/components/dna/ConveneForm.tsx), so the schema carries no fields for it,
  // and the card's action row is the fixed vocabulary (React, Ask the host, Save, Share): no RSVP
  // (579), so no "Get a ticket". The kicker stays.
  convene: {
    kicker: "Event",
    action: null,
    fields: [],
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
      // Ruling 193: the instrument values are public.contribute_instrument, served by
      // vocabularies() and passed in as fieldOptions. No literal here, and no fallback: an
      // instrument vocabulary that does not load leaves the control with no options (ruling 194).
      { key: "instrument", label: "Instrument", icon: "briefcase", kind: "segment" },
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

/**
 * Untyped member posts fall back to Convey (ruling 68), and ruling 546 (W54) settles what that
 * looks like on the card: the kicker is Convey's own, so a post published with no verb chip reads
 * as labelled rather than sitting in a generic bucket, which is what doctrine forbids. It is read
 * from the Convey row rather than written again here, so the two can never drift. There is still no
 * story object behind an untyped post, so it carries no title, no field rows and no action: "Read
 * the story" would lead nowhere. The composer keeps no required chip (546): a gate on publishing is
 * the one thing the composer may not grow.
 */
export const UNTYPED: VerbSchema = {
  kicker: VERB_SCHEMA.convey.kicker,
  action: null,
  fields: [],
};

/**
 * Ruling 400: the composer no longer offers Connect, so no new connection_request post is created.
 * The ones already published still render on the Feed through connection_request_intros (ruling
 * 157): who and why, never a status, and no act, because a request is answered on Connect. The
 * card schema is the composer's four plus this row.
 */
export const CARD_SCHEMA: Record<C, VerbSchema> = {
  ...VERB_SCHEMA,
  connect: {
    kicker: "Connection request",
    action: null,
    fields: [
      { key: "who", label: "Who", icon: "user-plus" },
      { key: "why", label: "Why", icon: "message-circle", multiline: true },
    ],
  },
};

export type FieldValue = { value: string | boolean; mine: boolean };
export type FieldValues = Partial<Record<FieldKey, FieldValue>>;

/** The un-prefixed view a supplied form receives (ruling 664). */
export type FormFieldValues = Record<string, FieldValue | undefined>;

/** Build the PostCard field rows for a verb from keyed values. Title rows are excluded (the card title carries it). */
export function fieldRows(verb: C | null, fv: FieldValues) {
  const schema = verb ? CARD_SCHEMA[verb] : UNTYPED;
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
