// Handoff 41-B (rulings 1346, 1374; 346, 347; 1343, 1352, 1353): the server half of Messenger media,
// shared by the two routes in src/routes/api/messages/. Server only: this directory is denied to the
// client build by the import protection in vite.config.ts, and the route files that import it carry
// only a `server` property, so TanStack Start prunes them from the client route tree entirely.
//
// Three things live here and nowhere else. The member: a Supabase client built from the request's
// bearer and the same URL and publishable key the browser uses (src/lib/supabase.ts), never a
// service-role key, so every database question the routes ask is answered inside the member's own
// policy scope. The binding: `env.MESSAGE_MEDIA`, read in every shape the runtime ships it in with a
// null fallback (825). The sniff: the leading bytes of an upload against the seven mimes Messenger
// admits, so a declared type never stands alone.
//
// Every refusal is a JSON body `{ "error": "<word>" }` with its status, the words being the 41-A
// vocabulary so the client renders them with the one map it already holds.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../supabase";

/** The eight mimes a Messenger media row may carry (media_mime_check, 20261003130400, 1396). */
export const MESSAGE_MEDIA_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/webm",
  "audio/mp4",
] as const;
export type MessageMediaMime = (typeof MESSAGE_MEDIA_MIMES)[number];

/** 100 MB, the byte ceiling for every mime; also the Pages request-body ceiling on Free and Pro. */
export const MESSAGE_MEDIA_MAX_BYTES = 104857600;
/** Ten minutes: the bound on a voice note, enforced from the container's declared duration. */
export const MESSAGE_AUDIO_MAX_MS = 600000;
/** The sweep's batch on every delete call (F4). */
export const MESSAGE_MEDIA_SWEEP = 20;
export const MESSAGE_MEDIA_BUCKET = "r2:message-media";

export type RefusalWord =
  | "not_signed_in"
  | "not_a_member"
  | "bad_media"
  | "too_large"
  | "rate_limited"
  | "not_found"
  | "unavailable";

const STATUS: Record<RefusalWord, number> = {
  not_signed_in: 401,
  not_a_member: 403,
  bad_media: 400,
  too_large: 413,
  rate_limited: 429,
  not_found: 404,
  unavailable: 503,
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...headers } });
}

/** One refusal, one word, one status. `status` overrides the word's own only where the HTTP meaning differs. */
export function refuse(
  word: RefusalWord,
  status?: number,
  headers?: Record<string, string>,
): Response {
  return json({ error: word }, status ?? STATUS[word], headers);
}

/**
 * A Postgres refusal from one of the 41-A or 41-B functions, as PostgREST relays it: the word is the
 * exception's message and the status follows its errcode (42501 who may not, 22023 what is
 * malformed, P0001 what is refused for now). An unknown word is `bad_media` so the client always has
 * a word it knows; the original is kept in `detail` for the log, never for a surface.
 */
export function refusalFromPostgres(err: {
  code?: string | null;
  message?: string | null;
}): Response {
  const word = (err.message ?? "").trim();
  // PostgREST's own code for a function the project does not hold: the migration is not applied
  // yet, which is the server's state and not the member's fault, so 503 and a detail the arm reads.
  if (err.code === "PGRST202")
    return json({ error: "unavailable", detail: "function_missing" }, 503);
  if (word === "not_signed_in") return refuse("not_signed_in");
  if (word === "rate_limited") return refuse("rate_limited");
  if (word === "too_large") return refuse("too_large");
  if (word === "not_a_member" || word === "blocked") return refuse("not_a_member");
  if (word === "bad_media") return refuse("bad_media");
  if (err.code === "42501") return refuse("not_a_member");
  if (err.code === "P0001") return json({ error: "bad_media", detail: word }, 409);
  return json({ error: "bad_media", detail: word }, 400);
}

export type MemberClient = { sb: SupabaseClient; uid: string; token: string };

/**
 * The member behind the request: the `Authorization: Bearer` header becomes the session of a client
 * built on the same URL and publishable key the browser uses, and the token is verified against Auth
 * before anything is read. Returns the client or a 401. No cookie, no service-role key.
 */
export async function memberFromRequest(request: Request): Promise<MemberClient | Response> {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = m?.[1]?.trim();
  if (!token) return refuse("not_signed_in");
  const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return refuse("not_signed_in");
  return { sb, uid: data.user.id, token };
}

export type EnvSource =
  "cloudflare:workers" | "request.runtime.cloudflare.env" | "globalThis.__env__" | "none";

type RuntimeRequest = Request & { runtime?: { cloudflare?: { env?: MessengerMediaEnv } } };

/**
 * Ruling 825: the binding in every shape it ships in, first answer wins, null where none does.
 *   1. `import("cloudflare:workers").env`, the runtime module Cloudflare documents, imported at call
 *      time with a non-literal specifier so `vite dev`, which has no such module, still serves.
 *   2. `request.runtime.cloudflare.env`, which nitro's cloudflare-pages runtime stamps on the incoming
 *      Request in `augmentReq` before handing it to the app.
 *   3. `globalThis.__env__`, which nitro's cloudflare-module handler sets and the Pages one does not.
 * The source that answered is reported on every response as `x-dna-env-source`, so the deployed URL
 * says which shape it is rather than a reading saying so.
 */
export async function messageMediaBucket(
  request: Request,
): Promise<{ bucket: R2Bucket | null; source: EnvSource }> {
  const specifier = "cloudflare:workers";
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { env?: MessengerMediaEnv };
    if (mod?.env?.MESSAGE_MEDIA)
      return { bucket: mod.env.MESSAGE_MEDIA, source: "cloudflare:workers" };
  } catch {
    /* not the Workers runtime, or the module is not importable here */
  }
  const fromRequest = (request as RuntimeRequest).runtime?.cloudflare?.env?.MESSAGE_MEDIA;
  if (fromRequest) return { bucket: fromRequest, source: "request.runtime.cloudflare.env" };
  const fromGlobal = (globalThis as { __env__?: MessengerMediaEnv }).__env__?.MESSAGE_MEDIA;
  if (fromGlobal) return { bucket: fromGlobal, source: "globalThis.__env__" };
  return { bucket: null, source: "none" };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isMessageMediaMime(value: string): value is MessageMediaMime {
  return (MESSAGE_MEDIA_MIMES as readonly string[]).includes(value);
}

/** A positive integer from a query value, or null. */
export function positiveInt(value: string | null): number | null {
  if (value == null || !/^\d{1,9}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

function ascii(bytes: Uint8Array, from: number, to: number): string {
  let s = "";
  for (let i = from; i < to && i < bytes.length; i++) s += String.fromCharCode(bytes[i] ?? 0);
  return s;
}

/**
 * The leading bytes against the seven mimes. JPEG FF D8 FF; PNG 89 50 4E 47; WebP RIFF....WEBP; MP4
 * and M4A `ftyp` at offset 4; WebM 1A 45 DF A3. The two containers that serve both a video and an
 * audio mime (WebM, ISO BMFF) are told apart by the declared type, since the bytes cannot. Answers the
 * mime the bytes and the declaration agree on, or null.
 */
export function sniff(bytes: Uint8Array, declared: string): MessageMediaMime | null {
  if (bytes.length < 12) return null;
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff)
    return declared === "image/jpeg" ? "image/jpeg" : null;
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47)
    return declared === "image/png" ? "image/png" : null;
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP")
    return declared === "image/webp" ? "image/webp" : null;
  if (ascii(bytes, 4, 8) === "ftyp") {
    if (declared === "video/mp4") return "video/mp4";
    if (declared === "video/quicktime") return "video/quicktime";
    if (declared === "audio/mp4") return "audio/mp4";
    return null;
  }
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) {
    if (declared === "video/webm") return "video/webm";
    if (declared === "audio/webm") return "audio/webm";
    return null;
  }
  return null;
}

export const SNIFF_BYTES = 16;

/**
 * Read at least `SNIFF_BYTES` from the body without consuming the rest: the chunks read are handed
 * back so the caller can replay them ahead of the remainder. `have` may be short when the body is.
 */
export async function readHead(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ chunks: Uint8Array[]; head: Uint8Array; done: boolean }> {
  const chunks: Uint8Array[] = [];
  let have = 0;
  let done = false;
  while (have < SNIFF_BYTES) {
    const r = await reader.read();
    if (r.done) {
      done = true;
      break;
    }
    if (r.value && r.value.byteLength) {
      chunks.push(r.value);
      have += r.value.byteLength;
    }
  }
  const head = new Uint8Array(Math.min(have, SNIFF_BYTES));
  let at = 0;
  for (const c of chunks) {
    if (at >= head.length) break;
    const take = Math.min(c.byteLength, head.length - at);
    head.set(c.subarray(0, take), at);
    at += take;
  }
  return { chunks, head, done };
}

export type ByteRange = { offset: number; length: number };

/**
 * One `Range: bytes=a-b` (or `a-`, or `-n`) against an object of `size` bytes. Returns null for no
 * header, the satisfiable range as offset and length, or "unsatisfiable" for one past the end or
 * malformed (RFC 9110 14.1.2: a malformed Range is ignored, which is what null also yields; a range
 * the object cannot satisfy is 416).
 */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | "unsatisfiable" {
  if (!header) return null;
  const m = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header);
  if (!m) return null;
  const [, a, b] = m;
  if (a === "" && b === "") return null;
  if (a === "") {
    const suffix = Number(b);
    if (!Number.isFinite(suffix) || suffix <= 0) return "unsatisfiable";
    const length = Math.min(suffix, size);
    return length > 0 ? { offset: size - length, length } : "unsatisfiable";
  }
  const start = Number(a);
  if (!Number.isFinite(start) || start >= size) return "unsatisfiable";
  const end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  if (!Number.isFinite(end) || end < start) return "unsatisfiable";
  return { offset: start, length: end - start + 1 };
}

/** The shape `messenger_media_locate` answers, one row or none. */
export type Located = {
  allowed: boolean;
  storage_path: string | null;
  mime: string | null;
  byte_size: number | null;
};

export function asLocated(data: unknown): Located | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    allowed: r["allowed"] === true,
    storage_path: typeof r["storage_path"] === "string" ? r["storage_path"] : null,
    mime: typeof r["mime"] === "string" ? r["mime"] : null,
    byte_size: typeof r["byte_size"] === "number" ? r["byte_size"] : null,
  };
}

/** The columns of the `public.media` row `messenger_media_record` returns that the route answers. */
export type RecordedMedia = {
  id: string;
  mime: string;
  width: number | null;
  height: number | null;
  byte_size: number;
};

export function asRecorded(data: unknown): RecordedMedia | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (
    typeof r["id"] !== "string" ||
    typeof r["mime"] !== "string" ||
    typeof r["byte_size"] !== "number"
  )
    return null;
  return {
    id: r["id"],
    mime: r["mime"],
    width: typeof r["width"] === "number" ? r["width"] : null,
    height: typeof r["height"] === "number" ? r["height"] : null,
    byte_size: r["byte_size"],
  };
}
