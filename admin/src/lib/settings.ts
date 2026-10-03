// Settings' reads, writes and words (handoff 45-D Part B; EXTRACTION-45-12S, approved as 1413). The
// database is the gate: every call below is a definer that refuses without a live platform role at
// aal2 (1265), acts on the caller's own row or on the company's one row, and the company write is
// refused to every role but admin (1391). Nothing here decides what the account may do; the page's
// read-only state for a non-admin is decoration over that refusal.
import type { Supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import type { Vocabularies } from "@/lib/vocabularies";
import { clock, dayShort, zoneLabel } from "./overview";

export type StaffSettings = {
  appearance: string;
  /** Null: the staff member reads in the company reporting zone (1411). */
  reading_zone: string | null;
  default_grain: string;
  default_compare: string;
};
export type OrgSettings = { reporting_zone: string; dia_note: boolean };
export type Zone = Vocabularies["reporting_zones"][number];

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function staffOf(v: unknown): StaffSettings {
  if (
    !isObject(v) ||
    typeof v["appearance"] !== "string" ||
    typeof v["default_grain"] !== "string" ||
    typeof v["default_compare"] !== "string" ||
    !(v["reading_zone"] === null || typeof v["reading_zone"] === "string")
  )
    throw new Error("admin_staff_settings answered no settings");
  return {
    appearance: v["appearance"],
    reading_zone: v["reading_zone"],
    default_grain: v["default_grain"],
    default_compare: v["default_compare"],
  };
}

function orgOf(v: unknown): OrgSettings {
  if (!isObject(v) || typeof v["reporting_zone"] !== "string" || typeof v["dia_note"] !== "boolean")
    throw new Error("admin_org_settings answered no settings");
  return { reporting_zone: v["reporting_zone"], dia_note: v["dia_note"] };
}

export async function readStaffSettings(sb: Supabase): Promise<StaffSettings> {
  const { data, error } = await sb.rpc("admin_staff_settings_read");
  if (error) throw error;
  return staffOf(data);
}

/** Only the keys given change; `reading_zone: null` returns the caller to the company zone. */
export async function saveStaffSettings(
  sb: Supabase,
  patch: Partial<StaffSettings>,
): Promise<StaffSettings> {
  const { data, error } = await sb.rpc("admin_staff_settings_save", { p_patch: patch as Json });
  if (error) throw error;
  return staffOf(data);
}

export async function readOrgSettings(sb: Supabase): Promise<OrgSettings> {
  const { data, error } = await sb.rpc("admin_org_settings_read");
  if (error) throw error;
  return orgOf(data);
}

export async function saveOrgSettings(
  sb: Supabase,
  patch: Partial<OrgSettings>,
): Promise<OrgSettings> {
  const { data, error } = await sb.rpc("admin_org_settings_save", { p_patch: patch as Json });
  if (error) throw error;
  return orgOf(data);
}

export type ReadEntry = {
  id: number;
  at: string;
  projection: string;
  page: string | null;
  block: string | null;
};
export type HistoryEntry = {
  id: number;
  at: string;
  setting: string;
  before: unknown;
  after: unknown;
  by: string | null;
};
export type SessionRow = {
  id: string;
  user_agent: string | null;
  last_active_at: string;
  current: boolean;
};

function entriesOf(v: unknown): unknown[] {
  return isObject(v) && Array.isArray(v["entries"]) ? v["entries"] : [];
}

/** The caller's own read log, newest first; the call is itself logged (1178). */
export async function readReadLog(sb: Supabase): Promise<ReadEntry[]> {
  const { data, error } = await sb.rpc("admin_read_log", { p_limit: 200 });
  if (error) throw error;
  return entriesOf(data).filter(
    (e): e is ReadEntry =>
      isObject(e) &&
      typeof e["id"] === "number" &&
      typeof e["at"] === "string" &&
      typeof e["projection"] === "string",
  );
}

/** Every Organization change, newest first; the call is itself logged (1178). */
export async function readChangeHistory(sb: Supabase): Promise<HistoryEntry[]> {
  const { data, error } = await sb.rpc("admin_change_history", { p_limit: 200 });
  if (error) throw error;
  return entriesOf(data).filter(
    (e): e is HistoryEntry =>
      isObject(e) &&
      typeof e["id"] === "number" &&
      typeof e["at"] === "string" &&
      typeof e["setting"] === "string",
  );
}

/** The caller's own active sessions; no IP address is returned (Part A item 5). */
export async function readSessions(sb: Supabase): Promise<SessionRow[]> {
  const { data, error } = await sb.rpc("admin_my_sessions");
  if (error) throw error;
  return (Array.isArray(data) ? (data as unknown[]) : []).filter(
    (s): s is SessionRow =>
      isObject(s) &&
      typeof s["id"] === "string" &&
      typeof s["last_active_at"] === "string" &&
      typeof s["current"] === "boolean",
  );
}

// ---------------------------------------------------------------------------------------------------
// Zones in words (extraction §4 new item 3): "{name}, {city}, {abbreviation}" and "{city},
// {abbreviation}". The abbreviation is the one in force at `at`, so it moves with daylight time.
// ---------------------------------------------------------------------------------------------------

export function zoneLong(z: Zone, at: Date = new Date()): string {
  return `${z.name}, ${z.city}, ${zoneLabel(at, z.value)}`;
}
export function zoneShort(z: Zone, at: Date = new Date()): string {
  return `${z.city}, ${zoneLabel(at, z.value)}`;
}
/** The zone's own words, or its identifier when the vocabulary has no row for it. */
export function zoneLongById(zones: Zone[], id: string, at?: Date): string {
  const z = zones.find((r) => r.value === id);
  return z ? zoneLong(z, at) : id;
}
export function zoneShortById(zones: Zone[], id: string, at?: Date): string {
  const z = zones.find((r) => r.value === id);
  return z ? zoneShort(z, at) : id;
}

/** "Thu 1 Oct, 08:12" in the reading zone. */
export function stamp(iso: string, tz: string): string {
  const d = new Date(iso);
  return `${dayShort(d, tz)}, ${clock(d, tz)}`;
}

// ---------------------------------------------------------------------------------------------------
// A session's device, from its user agent, as the extraction writes it: "Chrome on macOS".
// ---------------------------------------------------------------------------------------------------

export function deviceOf(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser\//.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS\//.test(ua)
          ? "Firefox"
          : /CriOS\/|Chrome\/|Chromium\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua) && /Version\//.test(ua)
              ? "Safari"
              : null;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Mac OS X|Macintosh/.test(ua)
            ? "macOS"
            : /Windows/.test(ua)
              ? "Windows"
              : /Linux/.test(ua)
                ? "Linux"
                : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}
