// Builds the publish_post payload from composer state and calls the RPC: object creation, post
// insert, media, link, DIA record and draft deletion happen in one transaction server-side.
import { parse, isValid, setYear, getYear, addYears, isBefore, startOfDay } from "date-fns";
import type { ComposerState } from "@/components/strand/Composer";
import type { FieldKey } from "@/components/strand/verb-schema";
import type { ComposerAnchor } from "./composer-store";
import type { Json } from "./database.types";
import { getSupabase } from "./supabase";

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "d MMM yyyy",
  "d MMMM yyyy",
  "MMM d yyyy",
  "MMMM d yyyy",
  "EEE d MMM yyyy",
  "EEEE d MMMM yyyy",
  "d MMM",
  "d MMMM",
  "MMM d",
  "MMMM d",
  "EEE d MMM",
  "EEEE d MMM",
  "EEE d MMMM",
  "EEEE d MMMM",
  "EEE MMM d",
  "d/M/yyyy",
  "d/M",
];
function clean(s: string): string {
  return s
    .replace(/,/g, " ")
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse the member's raw date text. Year-less dates resolve to the next occurrence. Null when unparseable. */
export function parseDateText(text: string, now = new Date()): Date | null {
  const t = clean(text);
  if (!t) return null;
  for (const f of DATE_FORMATS) {
    const d = parse(t, f, now);
    if (!isValid(d)) continue;
    if (!/y/.test(f)) {
      let d2 = setYear(d, getYear(now));
      if (isBefore(d2, startOfDay(now))) d2 = addYears(d2, 1);
      return d2;
    }
    return d;
  }
  return null;
}

// Convene Pass 1 (rulings 664, 681): parseStartsAt, the chassis stand-in that combined the
// convene `date` and `time` fields in the browser's zone, is retired. The Convene form parses the
// member's words in the event's own time zone (src/lib/when.ts) and hands the instants over as
// namespaced `convene.starts_at`, `convene.ends_at` and `convene.doors_at`; publish_post validates
// them and never parses. Only Contribute's by-date still parses here.

export function parseByDate(text: string | undefined, now = new Date()): string | null {
  const d = text ? parseDateText(text, now) : null;
  if (!d) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export type PublishContext = {
  postId: string;
  memberId: string;
  hostContext: string;
  anchor?: ComposerAnchor | undefined;
};

export function buildPayload(state: ComposerState, ctx: PublishContext): Record<string, Json> {
  const fields: Partial<Record<FieldKey, string | boolean>> = {};
  (
    Object.entries(state.fields) as [
      FieldKey,
      { value: string | boolean; mine: boolean } | undefined,
    ][]
  ).forEach(([k, v]) => {
    if (v && v.value !== "" && v.value != null && v.value !== false) fields[k] = v.value;
  });
  const asStr = (k: FieldKey) =>
    typeof fields[k] === "string" ? (fields[k] as string) : undefined;
  const media = state.images
    .filter((i) => i.storage_path && i.width && i.height)
    .map((i, position) => ({
      storage_path: i.storage_path as string,
      width: i.width as number,
      height: i.height as number,
      position,
    }));
  const payload: Record<string, Json> = {
    id: ctx.postId,
    verb: state.verb,
    body: state.text,
    author_kind: state.asSpace ? "space" : "member",
    author_id: state.asSpace || ctx.memberId,
    anchor: ctx.anchor ? { kind: ctx.anchor.kind, id: ctx.anchor.id } : null,
    audience: state.audience,
    host_context: ctx.hostContext,
    fields: fields as Json,
    // Convene's instants travel inside `fields` as `convene.starts_at` etc. (681); nothing here
    // parses them.
    starts_at: null,
    by_date: state.verb === "contribute" ? parseByDate(asStr("by")) : null,
    media,
    link: state.link
      ? {
          url: state.link.url,
          title: state.link.title ?? null,
          description: state.link.description ?? null,
          image_url: state.link.image ?? null,
        }
      : null,
    dia: state.diaRecord
      ? {
          verb: state.diaRecord.verb,
          confidence: state.diaRecord.confidence,
          proposed_fields: state.diaRecord.proposed_fields as Json,
          accepted: state.diaRecord.accepted && state.diaRecord.verb === state.verb,
          member_overrode: state.diaRecord.member_overrode || state.diaRecord.verb !== state.verb,
          latency_ms: state.diaRecord.latency_ms,
        }
      : null,
  };
  return payload;
}

export async function publishPost(state: ComposerState, ctx: PublishContext): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("not in browser");
  const { data, error } = await sb.rpc("publish_post", { payload: buildPayload(state, ctx) });
  if (error) throw error;
  return data;
}
