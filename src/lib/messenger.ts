// Brief 14, handoff 41-C, SPEC 41-14 Part B: what the Messenger surfaces read and write, and nothing
// else reads or writes a thread from a surface (Guardrail 1). Every read is one of the three 41-A
// projections, `messenger_search`, `messenger_dia_signals` or `messenger_settings`; every write is a
// `public.messenger_*` wrapper (41-A section G) or a 41-B route through src/lib/media.ts. Every
// refusal word a wrapper raises maps to a line through REFUSAL_LINES, so no word reaches a member
// surface raw. Transport (1351) is two private Broadcast channels through the one Supabase client:
// `inbox:{member_id}` for the life of the session and `thread:{thread_id}` while a thread is open;
// on reconnect the open thread is refetched from the last seq held, never reloaded whole. Cursor
// writes are debounced to one per two seconds per thread. Nothing here touches localStorage,
// sessionStorage or IndexedDB (1351): the unsent message lives in component state for this tab.
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Database, Json, Views } from "./database.types";
import { getSupabase, type Supabase } from "./supabase";
import { firstName, joinNames, nameList } from "./names";

export type ThreadView = Views<"messenger_threads_view">;
export type MessageView = Views<"messenger_messages_view">;
export type RequestView = Views<"messenger_requests_view">;
export type MessageKind = Database["public"]["Enums"]["message_kind"];
export type MessagingSettings = Database["public"]["Tables"]["member_messaging_settings"]["Row"];
export type DiaSignal = Database["public"]["Functions"]["messenger_dia_signals"]["Returns"][number];
export type SearchHit = Database["public"]["Functions"]["messenger_search"]["Returns"][number];

/** The refusal words 41-A's wrappers and 41-B's routes raise (SPEC 41-14 Part B). */
export type RefusalWord =
  | "not_signed_in"
  | "not_a_member"
  | "blocked"
  | "request_first"
  | "not_reachable"
  | "request_exists"
  | "too_many_pending"
  | "rate_limited"
  | "too_long"
  | "empty"
  | "bad_media"
  | "too_large"
  | "edit_window_closed"
  | "delete_window_closed"
  | "pins_full"
  | "group_full"
  | "not_a_lead"
  | "already_member"
  | "not_your_connection";

/**
 * One map (SPEC 41-14 Part B). Four lines are the extraction's own: the not-sent line (1.6), the
 * upload refusal (1.6), the rate-limit line (1.6) and the pin cap as ratified in override 1 (1371).
 * The extraction draws no line for the other fifteen words, so each carries a plain sentence here
 * rather than its word; they are named in the closing report as copy the extraction does not hold.
 */
export const REFUSAL_LINES: Record<RefusalWord, string> = {
  not_signed_in: "Sign in to send messages.",
  not_a_member: "You are not in this conversation.",
  blocked: "This conversation is not open.",
  request_first: "Send a request first.",
  not_reachable: "This member is not taking requests.",
  request_exists: "Your request is already with them.",
  too_many_pending: "You have enough requests waiting. Try again tomorrow.",
  rate_limited: "You are sending quickly. Wait a moment before the next message.",
  too_long: "That message is too long to send.",
  empty: "Write something to send.",
  bad_media: "This file could not be sent. Images and video only.",
  too_large: "This file could not be sent. Images and video only.",
  edit_window_closed: "This message can no longer be edited.",
  delete_window_closed: "This message can no longer be deleted for everyone.",
  pins_full: "Unpin a conversation to pin this one.",
  group_full: "This group is full.",
  not_a_lead: "Only a lead can do that.",
  already_member: "They are already in this group.",
  not_your_connection: "You can only invite your connections.",
};

/** The one line every other failure reads as (extraction 1.6, the not-sent state). */
export const NOT_SENT_LINE = "Not sent. Your message is still here.";

export class MessengerError extends Error {
  readonly word: RefusalWord | null;
  readonly line: string;
  constructor(word: RefusalWord | null, line: string) {
    super(line);
    this.word = word;
    this.line = line;
  }
}

function isRefusalWord(w: string): w is RefusalWord {
  return Object.prototype.hasOwnProperty.call(REFUSAL_LINES, w);
}

/** A wrapper's error (PostgREST carries the raise's message as `message`) into one MessengerError. */
export function refusalOf(err: unknown, fallback = NOT_SENT_LINE): MessengerError {
  const message =
    err && typeof err === "object" && "message" in err ? String((err as Error).message) : "";
  const word = message.trim().split(/\s/)[0] ?? "";
  if (isRefusalWord(word)) return new MessengerError(word, REFUSAL_LINES[word]);
  return new MessengerError(null, fallback);
}

function sb(): Supabase {
  const c = getSupabase();
  if (!c) throw new MessengerError("not_signed_in", REFUSAL_LINES.not_signed_in);
  return c;
}

// ---------------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------------

/** The list: every thread the member is active or invited in, pinned first then by last activity. */
export async function loadThreads(): Promise<ThreadView[]> {
  const { data, error } = await sb()
    .from("messenger_threads_view")
    .select("*")
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("last_activity_at", { ascending: false, nullsFirst: false });
  if (error) throw refusalOf(error);
  return data ?? [];
}

export async function loadThread(threadId: string): Promise<ThreadView | null> {
  const { data, error } = await sb()
    .from("messenger_threads_view")
    .select("*")
    .eq("thread_id", threadId)
    .maybeSingle();
  if (error) throw refusalOf(error);
  return data;
}

export async function loadRequests(): Promise<RequestView[]> {
  const { data, error } = await sb()
    .from("messenger_requests_view")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw refusalOf(error);
  return data ?? [];
}

export const MESSAGE_PAGE = 60;

/**
 * The thread's messages, ordered by seq, a cursor on seq and never an offset. `after` reads what
 * arrived past the last seq held (reconnect, the live event); `before` reads the page above the
 * oldest row held.
 */
export async function loadMessages(
  threadId: string,
  opts: {
    after?: number | undefined;
    before?: number | undefined;
    limit?: number | undefined;
  } = {},
): Promise<MessageView[]> {
  const limit = opts.limit ?? MESSAGE_PAGE;
  let q = sb().from("messenger_messages_view").select("*").eq("thread_id", threadId);
  if (opts.after !== undefined) q = q.gt("seq", opts.after).order("seq", { ascending: true });
  else if (opts.before !== undefined)
    q = q.lt("seq", opts.before).order("seq", { ascending: false });
  else q = q.order("seq", { ascending: false });
  const { data, error } = await q.limit(limit);
  if (error) throw refusalOf(error);
  const rows = data ?? [];
  return opts.after !== undefined ? rows : rows.reverse();
}

/** One row by seq, the projection's own reading of a message the thread channel named. */
export async function loadMessageAt(threadId: string, seq: number): Promise<MessageView | null> {
  const { data, error } = await sb()
    .from("messenger_messages_view")
    .select("*")
    .eq("thread_id", threadId)
    .eq("seq", seq)
    .maybeSingle();
  if (error) throw refusalOf(error);
  return data;
}

export type SearchFilters = {
  member?: string | undefined;
  thread?: string | undefined;
  /** ISO instants. `during` a day is `after` its start and `before` the next day's start. */
  before?: string | undefined;
  after?: string | undefined;
};

export async function searchMessages(query: string, f: SearchFilters = {}): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];
  const args: Database["public"]["Functions"]["messenger_search"]["Args"] = { p_query: q };
  if (f.member) args.p_member = f.member;
  if (f.thread) args.p_thread = f.thread;
  if (f.before) args.p_before = f.before;
  if (f.after) args.p_after = f.after;
  const { data, error } = await sb().rpc("messenger_search", args);
  if (error) throw refusalOf(error);
  return data ?? [];
}

export async function loadDiaSignals(): Promise<DiaSignal[]> {
  const { data, error } = await sb().rpc("messenger_dia_signals");
  if (error) throw refusalOf(error);
  return (data ?? []).slice(0, 2);
}

export async function loadSettings(): Promise<MessagingSettings | null> {
  const { data, error } = await sb().rpc("messenger_settings");
  if (error) throw refusalOf(error);
  return data ?? null;
}

// ---------------------------------------------------------------------------------------------------
// Writes: every one a public.messenger_* wrapper.
// ---------------------------------------------------------------------------------------------------

async function call<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw refusalOf(error);
  return data;
}

/** A wrapper that answers a uuid; a null answer is a failure the caller reads as not sent. */
async function callId(p: PromiseLike<{ data: string | null; error: unknown }>): Promise<string> {
  const id = await call(p);
  if (!id) throw new MessengerError(null, NOT_SENT_LINE);
  return id;
}

export type SendArgs = {
  thread: string;
  clientId: string;
  body?: string | null | undefined;
  kind?: MessageKind | undefined;
  replyTo?: string | null | undefined;
  media?: string | null | undefined;
  mentions?: string[] | undefined;
  linkPreview?: Json | null | undefined;
};

export async function send(a: SendArgs) {
  const args: Database["public"]["Functions"]["messenger_send"]["Args"] = {
    p_thread: a.thread,
    p_client_id: a.clientId,
    p_kind: a.kind ?? "text",
  };
  if (a.body != null) args.p_body = a.body;
  if (a.replyTo) args.p_reply_to = a.replyTo;
  if (a.media) args.p_media = a.media;
  if (a.mentions && a.mentions.length) args.p_mentions = a.mentions;
  if (a.linkPreview != null) args.p_link_preview = a.linkPreview;
  return call(sb().rpc("messenger_send", args));
}

export const edit = (message: string, body: string) =>
  call(sb().rpc("messenger_edit", { p_message: message, p_body: body }));

/** Delete for everyone; the answer carries `storage_path` when the row had media (41-B's DELETE follows). */
export async function deleteForEveryone(
  message: string,
): Promise<{ message_id: string; storage_path: string | null }> {
  const out = (await call(sb().rpc("messenger_delete", { p_message: message }))) as {
    message_id?: string;
    storage_path?: string | null;
  } | null;
  return { message_id: out?.message_id ?? message, storage_path: out?.storage_path ?? null };
}

export const react = (message: string, word: string) =>
  call(sb().rpc("messenger_react", { p_message: message, p_reaction: word }));
export const unreact = (message: string, word: string) =>
  call(sb().rpc("messenger_unreact", { p_message: message, p_reaction: word }));
export const pinMessage = (message: string) =>
  call(sb().rpc("messenger_pin_message", { p_message: message }));
export const unpinMessage = (message: string) =>
  call(sb().rpc("messenger_unpin_message", { p_message: message }));
export const markUnread = (thread: string) =>
  call(sb().rpc("messenger_mark_unread", { p_thread: thread }));
/** `duration` is a message_mute_durations value; null unmutes. */
export const mute = (thread: string, duration: string | null) =>
  call(
    sb().rpc(
      "messenger_mute",
      duration ? { p_thread: thread, p_duration: duration } : { p_thread: thread },
    ),
  );
export const archive = (thread: string) =>
  call(sb().rpc("messenger_archive", { p_thread: thread }));
export const unarchive = (thread: string) =>
  call(sb().rpc("messenger_unarchive", { p_thread: thread }));
export const pinThread = (thread: string) =>
  call(sb().rpc("messenger_pin_thread", { p_thread: thread }));
export const unpinThread = (thread: string) =>
  call(sb().rpc("messenger_unpin_thread", { p_thread: thread }));
export const requestSend = (recipient: string, body: string) =>
  call(sb().rpc("messenger_request_send", { p_recipient: recipient, p_body: body }));
/** Returns the thread the accept opened. */
export const requestAccept = (request: string) =>
  callId(sb().rpc("messenger_request_accept", { p_request: request }));
export const requestDecline = (request: string) =>
  call(sb().rpc("messenger_request_decline", { p_request: request }));
/** Returns a declined request to pending (1341); the sender is not told (157). */
export const requestRecover = (request: string) =>
  call(sb().rpc("messenger_request_recover", { p_request: request }));
export const requestBlock = (request: string) =>
  call(sb().rpc("messenger_request_block", { p_request: request }));
export const createGroup = (name: string, memberIds: string[]) =>
  callId(sb().rpc("messenger_thread_create_group", { p_name: name, p_member_ids: memberIds }));
export const invite = (thread: string, member: string) =>
  call(sb().rpc("messenger_thread_invite", { p_thread: thread, p_member: member }));
export const inviteAccept = (thread: string) =>
  call(sb().rpc("messenger_thread_invite_accept", { p_thread: thread }));
export const inviteDecline = (thread: string) =>
  call(sb().rpc("messenger_thread_invite_decline", { p_thread: thread }));
export const leave = (thread: string) =>
  call(sb().rpc("messenger_thread_leave", { p_thread: thread }));
export const remove = (thread: string, member: string) =>
  call(sb().rpc("messenger_thread_remove", { p_thread: thread, p_member: member }));
export const setHistory = (thread: string, visible: boolean) =>
  call(sb().rpc("messenger_thread_set_history", { p_thread: thread, p_visible: visible }));
export const setRole = (
  thread: string,
  member: string,
  role: Database["public"]["Enums"]["thread_member_role"],
) =>
  call(sb().rpc("messenger_thread_set_role", { p_thread: thread, p_member: member, p_role: role }));
export const spaceThreadSync = (space: string) =>
  callId(sb().rpc("messenger_space_thread_sync", { p_space: space }));
export const eventThreadOpen = (event: string) =>
  callId(sb().rpc("messenger_event_thread_open", { p_event: event }));
/** An eligible attendee joins the host's event thread (1384); returns the thread. */
export const eventThreadJoin = (event: string) =>
  callId(sb().rpc("messenger_event_thread_join", { p_event: event }));
/** Whether the event thread exists and the viewer is in it or may join it (1384). */
export const eventThreadAvailable = async (event: string): Promise<boolean> =>
  (await call(sb().rpc("messenger_event_thread_available", { p_event: event }))) === true;
export const openOneToOne = (other: string) =>
  callId(sb().rpc("messenger_open_one_to_one", { p_other: other }));
export const report = (message: string, reason: string, note: string | null) =>
  call(
    sb().rpc(
      "messenger_report",
      note
        ? { p_message: message, p_reason: reason, p_note: note }
        : { p_message: message, p_reason: reason },
    ),
  );
export const settingsSet = (patch: {
  receipts?: boolean | undefined;
  linkPreviews?: boolean | undefined;
  mediaNoticeSeen?: boolean | undefined;
}) => {
  const args: Database["public"]["Functions"]["messenger_settings_set"]["Args"] = {};
  if (patch.receipts !== undefined) args.p_receipts = patch.receipts;
  if (patch.linkPreviews !== undefined) args.p_link_previews = patch.linkPreviews;
  if (patch.mediaNoticeSeen !== undefined) args.p_media_notice_seen = patch.mediaNoticeSeen;
  return call(sb().rpc("messenger_settings_set", args));
};
export const diaDismiss = (key: string) => call(sb().rpc("messenger_dia_dismiss", { p_key: key }));

/** The lead or a co-lead renames a group (1387); 1 to 80 characters after trimming. */
export const threadRename = (thread: string, name: string) =>
  call(sb().rpc("messenger_thread_rename", { p_thread: thread, p_name: name }));

// ---------------------------------------------------------------------------------------------------
// Cursors, debounced to one write per two seconds per thread (1351; the trigger keeps a write that
// moved nothing silent). Two cursors a thread, delivered and read; each keeps the highest seq asked.
// ---------------------------------------------------------------------------------------------------

export const CURSOR_DEBOUNCE_MS = 2000;

type Pending = { delivered: number; read: number; timer: number | null };
const pending = new Map<string, Pending>();

function flush(thread: string) {
  const p = pending.get(thread);
  if (!p) return;
  pending.delete(thread);
  const c = getSupabase();
  if (!c) return;
  if (p.delivered > 0)
    void c.rpc("messenger_delivered_to", { p_thread: thread, p_seq: p.delivered }).then(
      () => undefined,
      () => undefined,
    );
  if (p.read > 0)
    void c.rpc("messenger_read_to", { p_thread: thread, p_seq: p.read }).then(
      () => undefined,
      () => undefined,
    );
}

function cursor(thread: string, kind: "delivered" | "read", seq: number) {
  if (!(seq > 0)) return;
  const p = pending.get(thread) ?? { delivered: 0, read: 0, timer: null };
  p[kind] = Math.max(p[kind], seq);
  if (kind === "read") p.delivered = Math.max(p.delivered, seq);
  if (p.timer === null) p.timer = window.setTimeout(() => flush(thread), CURSOR_DEBOUNCE_MS);
  pending.set(thread, p);
}

export const deliveredTo = (thread: string, seq: number) => cursor(thread, "delivered", seq);
export const readTo = (thread: string, seq: number) => cursor(thread, "read", seq);
/** Writes what is pending now; the thread route calls it as it closes. */
export function flushCursors(thread?: string) {
  if (thread) {
    const p = pending.get(thread);
    if (p?.timer !== null && p?.timer !== undefined) window.clearTimeout(p.timer);
    flush(thread);
    return;
  }
  for (const [t, p] of pending) {
    if (p.timer !== null) window.clearTimeout(p.timer);
    flush(t);
  }
}

// ---------------------------------------------------------------------------------------------------
// Realtime (1351): two private channels.
// ---------------------------------------------------------------------------------------------------

export type InboxHandlers = {
  /** `thread_touch`: a message landed in a thread; the list refetches that row. */
  onThreadTouch?: ((threadId: string, seq: number | null) => void) | undefined;
  /** `request`: a request changed state; the requests projection refetches. */
  onRequest?:
    ((payload: { id: string; state: string; thread_id: string | null }) => void) | undefined;
  /** `invitation`: the member was invited to a thread; the list refetches that row. */
  onInvitation?: ((threadId: string) => void) | undefined;
};

export type ThreadHandlers = {
  /** `message`: a row landed or changed; the surface refetches that one row by seq. */
  onMessage?: ((seq: number, messageId: string | null, operation: string) => void) | undefined;
  /** `cursor`: another member's cursors moved; ticks and read-by update locally. */
  onCursor?:
    ((p: { member_id: string; delivered_seq: number; read_seq: number }) => void) | undefined;
  /** The channel rejoined after a drop: refetch from the last seq held. */
  onReconnect?: (() => void) | undefined;
  onStatus?: ((status: string) => void) | undefined;
};

type Payload = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

async function openChannel(
  topic: string,
  bind: (ch: RealtimeChannel) => void,
  onStatus: (status: string, rejoined: boolean) => void,
): Promise<() => void> {
  const c = sb();
  // The private topic is read under realtime.messages' policy as the member, so the socket carries
  // the session's token before the join; supabase-js keeps it current on refresh from here.
  const { data } = await c.auth.getSession();
  if (data.session?.access_token) await c.realtime.setAuth(data.session.access_token);
  const ch = c.channel(topic, { config: { private: true } });
  bind(ch);
  let joined = false;
  let dropped = false;
  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      const rejoined = joined && dropped;
      joined = true;
      dropped = false;
      onStatus(status, rejoined);
    } else {
      if (joined) dropped = true;
      onStatus(status, false);
    }
  });
  return () => {
    void c.removeChannel(ch);
  };
}

/** `inbox:{member_id}` for the life of the session. Returns the unsubscribe. */
export function subscribeInbox(memberId: string, h: InboxHandlers): () => void {
  let off: (() => void) | null = null;
  let closed = false;
  void openChannel(
    "inbox:" + memberId,
    (ch) => {
      ch.on("broadcast", { event: "thread_touch" }, ({ payload }) => {
        const p = (payload ?? {}) as Payload;
        const t = str(p["thread_id"]);
        if (t) h.onThreadTouch?.(t, num(p["seq"]));
      });
      ch.on("broadcast", { event: "request" }, ({ payload }) => {
        const p = (payload ?? {}) as Payload;
        const id = str(p["id"]);
        if (id) h.onRequest?.({ id, state: str(p["state"]) ?? "", thread_id: str(p["thread_id"]) });
      });
      ch.on("broadcast", { event: "invitation" }, ({ payload }) => {
        const p = (payload ?? {}) as Payload;
        const t = str(p["thread_id"]);
        if (t) h.onInvitation?.(t);
      });
    },
    () => undefined,
  ).then(
    (fn) => {
      if (closed) fn();
      else off = fn;
    },
    () => undefined,
  );
  return () => {
    closed = true;
    off?.();
  };
}

/** `thread:{thread_id}` while the thread is open. Returns the unsubscribe. */
export function subscribeThread(threadId: string, h: ThreadHandlers): () => void {
  let off: (() => void) | null = null;
  let closed = false;
  void openChannel(
    "thread:" + threadId,
    (ch) => {
      ch.on("broadcast", { event: "message" }, ({ payload }) => {
        const p = (payload ?? {}) as Payload;
        const record = (p["record"] ?? {}) as Payload;
        const seq = num(record["seq"]);
        if (seq !== null) h.onMessage?.(seq, str(record["id"]), str(p["operation"]) ?? "");
      });
      ch.on("broadcast", { event: "cursor" }, ({ payload }) => {
        const p = (payload ?? {}) as Payload;
        const m = str(p["member_id"]);
        if (m)
          h.onCursor?.({
            member_id: m,
            delivered_seq: num(p["delivered_seq"]) ?? 0,
            read_seq: num(p["read_seq"]) ?? 0,
          });
      });
    },
    (status, rejoined) => {
      h.onStatus?.(status);
      if (rejoined) h.onReconnect?.();
    },
  ).then(
    (fn) => {
      if (closed) fn();
      else off = fn;
    },
    () => undefined,
  );
  return () => {
    closed = true;
    off?.();
  };
}

// ---------------------------------------------------------------------------------------------------
// Words for the surfaces: the list's time in words, the log's day labels, the row's last line.
// ---------------------------------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** The list row's time in words (extraction 1.3): Just now, Earlier today, Yesterday, a weekday, Last week, Last month, else the month and year. */
export function timeWords(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);
  if (days <= 0) return "Earlier today";
  if (days === 1) return "Yesterday";
  if (days < 7) return WEEKDAYS[d.getDay()] as string;
  if (days < 28) return "Last week";
  if (days < 60) return "Last month";
  return MONTHS[d.getMonth()] + " " + d.getFullYear();
}

/** The log's day separator (extraction 1.5): Today, Yesterday, else `Monday 29 September`. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return WEEKDAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
}

/** The day a message belongs to, for grouping: the local calendar date. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

/** `08:31`. */
export function clockLabel(iso: string): string {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/** ISO date `YYYY-MM-DD` of the local day, for the search's native date inputs. */
export function localDayStart(day: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toISOString();
}
export function localNextDayStart(day: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 1).toISOString();
}

/** The row's last line (extraction 1.3): `You: …`, `{first name}: …` in a group, `Nobody has written yet`, `Voice note`, `Image` / `Video` as the projection words it, `This message was deleted`. */
export function lastLineOf(t: ThreadView, me: string): string {
  if (!t.last_seq) return "Nobody has written yet";
  const authorFirst =
    t.last_author_id !== me && t.kind !== "one_to_one" ? firstName(t.last_author_name) : "";
  const who = t.last_author_id === me ? "You: " : authorFirst ? authorFirst + ": " : "";
  if (t.last_line === "") return who + "This message was deleted";
  if (t.last_kind === "voice") return who + "Voice note";
  if (t.last_kind === "media") return who + (t.last_line || "Media");
  return who + (t.last_line ?? "");
}

/** The thread header's subtitle for a group (1317): `A, B, C and others`, through the one joiner. */
export function membersLine(t: ThreadView): string {
  return joinNames(nameList(t.member_names), !!t.others);
}

/** The ThreadRow kind for a projection row. */
export function rowKind(kind: string | null): "one" | "group" | "space" | "event" {
  if (kind === "one_to_one") return "one";
  if (kind === "space_thread" || kind === "space_topic") return "space";
  if (kind === "event_thread") return "event";
  return "group";
}

/** The C a thread's own controls take (extraction 2.7): Collaborate for a Space, Convene for an event, Connect otherwise. */
export function threadC(kind: string | null): "connect" | "convene" | "collaborate" {
  if (kind === "space_thread" || kind === "space_topic") return "collaborate";
  if (kind === "event_thread") return "convene";
  return "connect";
}

/** Any row that is unread, not muted and not archived lights the header's dot (SPEC Part C item 3). */
export function anyUnread(threads: readonly ThreadView[]): boolean {
  return threads.some((t) => !!t.unread && !t.muted && !t.archived);
}

declare module "@tanstack/history" {
  interface HistoryState {
    /** Brief 14: a search result or the pinned strip opening the thread at one message (1338, 1371). */
    focusSeq?: number;
  }
}
