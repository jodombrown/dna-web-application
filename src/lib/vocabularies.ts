// The one vocabulary read (rulings 193, 194). Every fixed vocabulary a surface offers comes from
// public.vocabularies() at runtime; no component keeps a list of its own, and nothing here supplies
// a default. A vocabulary that fails to load is absent, and the control that reads it renders empty
// (ruling 194: grounded-or-empty applies to an option list exactly as it applies to a card).
//
// Named for the projection, not for a surface: Profile (Brief 3), the Composer (Brief 1) and the
// Feed (Brief 2) all read this one path.
import type { Segment } from "@/components/strand/SegmentBlock";
import { getSupabase, type Supabase } from "./supabase";

export type Vocabularies = {
  focus: string[];
  industries: string[];
  regions: string[];
  skills: string[];
  languages: string[];
  intent: string[];
  interests: string[];
  countries: string[];
  /** Current location list (ruling 142): the world; countries is the African list. */
  world: string[];
  /** Ruling 187: the segment vocabulary from public.member_segments, in its own position order. */
  segments: { value: Segment; label: string }[];
  heritage: string[];
  pathway: string[];
  timeline: string[];
  /**
   * Ruling 193: the contribute_instrument enum, in enum order. Machine values with the label the
   * projection derives, because unlike the other three enums this one's values are not display text.
   */
  instrument: { value: string; label: string }[];
};

export async function loadVocabularies(): Promise<Vocabularies | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("vocabularies");
  if (error) throw error;
  return (data as unknown as Vocabularies) ?? null;
}

/**
 * The instrument labels the Feed needs to render a Need's row, keyed by enum value. Empty when the
 * vocabulary does not load, which leaves the row absent rather than guessed (ruling 194). Cached for
 * the session because a feed page hydrates many posts and the vocabulary does not move under them.
 */
let instrumentCache: Record<string, string> | null = null;

export async function instrumentLabels(sb: Supabase): Promise<Record<string, string>> {
  if (instrumentCache) return instrumentCache;
  const { data, error } = await sb.rpc("vocabularies");
  if (error || !data || typeof data !== "object") return {};
  const rows = (data as unknown as Partial<Vocabularies>).instrument;
  if (!Array.isArray(rows)) return {};
  const map: Record<string, string> = {};
  for (const r of rows) if (r && r.value && r.label) map[r.value] = r.label;
  instrumentCache = map;
  return map;
}
