// The one recorder of behaviour (Brief 12 12C part 2, handoff 58-12C2; rulings 1179, 1297, 1298,
// 1314, 1616). This module is the only caller of `rpc('record_event')` in either app: components
// call `record` or one of the hooks below, and no component calls the RPC. The admin app imports it
// through `@/lib` and names itself with `setRecordApp("admin")` at its root.
//
// What it never does. It never blocks: a call is fire and forget, never awaited by a surface, never
// retried, never run during SSR, and a failure produces one `console.warn` per kind per page load
// and nothing the member can see. It never sends a member id (the server stamps auth.uid(), and
// writes none at all for an anonymous kind, 1616), never a member as an object (1297), and never a
// value read from a field the member typed: a filter is recorded as the keys that are set, never
// their values, and a search string is never a prop.
//
// The session id is one random UUID per browser tab, held in sessionStorage and created on first
// use. It is never written to localStorage, a cookie or a URL (1179). Where sessionStorage is not
// available the id lives for the page load only.
//
// The viewport is the tier (src/lib/tier.ts): compact sends `narrow`, medium `medium`, expanded
// `wide`. The surface is the route's own name, read off the pathname with ids stripped, and the
// referrer is the surface the previous row in this tab was recorded on, when it differs.
import type { Database } from "./database.types";
import { getSupabase } from "./supabase";
import { tierFor } from "./tier";

export type RecordApp = "app" | "admin";
/** Only non-person objects (1297): a post, an event or a story. The type cannot name a member. */
export type RecordObject = { kind: "post" | "event" | "story"; id: string };
export type RecordProps = Record<string, string | number | boolean | string[]>;

const SESSION_KEY = "dna.record.session";

let app: RecordApp = "app";
let sessionInMemory: string | null = null;
let lastSurface: string | null = null;
const warned = new Set<string>();

/** The admin app calls this once at its root; the member app sends `app` and calls nothing. */
export function setRecordApp(next: RecordApp): void {
  app = next;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  // A UUID v4 from getRandomValues, for a runtime without randomUUID.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** One id per browser tab, minted on first use. Exported for the matrix's checks only. */
export function recordSessionId(): string {
  if (sessionInMemory) return sessionInMemory;
  try {
    const held = window.sessionStorage.getItem(SESSION_KEY);
    if (held && /^[0-9a-f-]{36}$/.test(held)) {
      sessionInMemory = held;
      return held;
    }
    const minted = randomId();
    window.sessionStorage.setItem(SESSION_KEY, minted);
    sessionInMemory = minted;
    return minted;
  } catch {
    sessionInMemory = randomId();
    return sessionInMemory;
  }
}

function viewport(): "narrow" | "medium" | "wide" {
  const tier = tierFor(document.documentElement.clientWidth);
  return tier === "compact" ? "narrow" : tier === "medium" ? "medium" : "wide";
}

/**
 * The route's name with ids stripped: `/m/{handle}` is `profile`, `/e/{slug}` and `/x/{code}` are
 * `event_public`, `/convene/events/{id}` is `event`, `/messages/{thread}` is `messenger`, and every
 * other route is its first segment (`feed`, `connect`, `convene`, `posts`, `sign-in`, `reset`).
 */
export function surfaceOf(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const head = parts[0] ?? "";
  if (!head) return app === "admin" ? "overview" : "landing";
  if (head === "m") return "profile";
  if (head === "e" || head === "x") return "event_public";
  if (head === "convene" && parts[1] === "events") return "event";
  if (head === "messages") return "messenger";
  if (head === "reset") return parts[1] === "new" ? "reset_new" : "reset";
  return head;
}

/**
 * Records one row. Fire and forget: returns nothing and never throws. `object` is never a member
 * (the type forbids it, and the server refuses it under 1297).
 */
export function record(kind: string, props?: RecordProps, object?: RecordObject): void {
  if (typeof window === "undefined") return;
  const sb = getSupabase();
  if (!sb) return;
  const surface = surfaceOf(window.location.pathname);
  const referrer = lastSurface && lastSurface !== surface ? lastSurface : null;
  lastSurface = surface;
  const args = {
    p_kind: kind,
    p_app: app,
    p_session: recordSessionId(),
    p_surface: surface,
    p_referrer: referrer,
    p_object_kind: object?.kind ?? null,
    p_object_id: object?.id ?? null,
    p_props: props ?? {},
    p_viewport: viewport(),
  } as unknown as Database["public"]["Functions"]["record_event"]["Args"];
  const warn = (code: string | null) => {
    if (warned.has(kind)) return;
    warned.add(kind);
    console.warn(JSON.stringify({ event: "record_event_failed", kind, code }));
  };
  try {
    void Promise.resolve(sb.rpc("record_event", args)).then(
      ({ error }) => {
        if (error) warn(error.code ?? null);
      },
      () => warn(null),
    );
  } catch {
    warn(null);
  }
}

/**
 * The keys of a filter object that carry a value, sorted, for `filter_keys` (never the values).
 */
export function filterKeysOf(filters: Record<string, unknown>): string[] {
  return Object.keys(filters)
    .filter((k) => {
      const v = filters[k];
      return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
    })
    .sort();
}
