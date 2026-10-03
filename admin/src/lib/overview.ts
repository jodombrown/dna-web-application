// The Overview's reads and its words (Brief 12 12B, handoff 45-B Part C; SPEC-40-12B Parts B and
// C; EXTRACTION-40-12B R2 §5 and §6). Five projections, read in parallel once per grain and
// comparison change, each rendered from its own result; and every sentence the page shows, written
// here from the projections' structured values exactly as the extractions record it, because no
// projection returns a sentence. Weeks run Monday to Sunday and every period is the current one so
// far against its comparison to the same point (1304); whether a comparison exists is read from the
// projection, never assumed (1310).
//
// Zones (handoff 45-D, rulings 1394 and 1411). Every projection and DIA's note are read in the
// company reporting zone, so days and weeks are the company's for every staff member; a staff
// member's own reading zone moves only the clock times the page writes. So the words below take the
// window's own zone (the company's) for days and dates, and a separate clock zone for times. The
// grain and comparison options are vocabulary (1392), read through src/lib/vocabularies.ts; the
// values the switch below branches on are the projections' own.
import type { Supabase } from "@/lib/supabase";
import { functionsUrl, SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase";

export type Grain = "now" | "hour" | "day" | "week" | "month" | "quarter" | "year";
export type Compare = "previous" | "last_year";

/**
 * Standard abbreviations from the reporting_zones vocabulary, by IANA identifier, for the zones the
 * runtime names only by an offset (WAT, SAST, EAT). Filled once the vocabulary loads.
 */
const zoneAbbreviations = new Map<string, string>();

export function registerZones(rows: { value: string; abbreviation: string }[]): void {
  for (const r of rows)
    if (r && r.value && r.abbreviation) zoneAbbreviations.set(r.value, r.abbreviation);
}

// ---------------------------------------------------------------------------------------------------
// The projections' shapes, as the migration builds them.
// ---------------------------------------------------------------------------------------------------

export type Point = { start: string; value: number };
export type Measure = { value: number; comparison: number | null; series?: Point[] };
export type NotConnected = { value: null; status: "not_connected" };
type WindowPart = {
  grain: Grain;
  compare: Compare;
  tz: string;
  now: string;
  period: { start: string; end: string };
  comparison: { start: string; end: string } | null;
  comparison_reason: "before_first_record" | null;
  first_record: string | null;
  bucket: string;
};
export type WindowRead = WindowPart & {
  definition_version: number;
  rollups_refreshed_at: string | null;
  ledger_derived_at: string | null;
  refreshed_at: string | null;
};
export type MobilizationRead = WindowPart & {
  definition_version: number;
  mobilized: Measure;
  bridging: Measure;
  depth: {
    points: {
      start: string;
      engaging: number;
      leading: number;
      collaborating: null;
      contributing: null;
    }[];
    not_measurable: string[];
  };
  direction: { key: string; value: number }[];
  source: { key: string; status: "connected" | "not_connected"; value: number | null }[];
  corridors: {
    id: string;
    label: string;
    status: string;
    acts: number;
    mobilized: number;
    bridging: number;
  }[];
  outside_corridor: number;
  acts: number;
};
export type LeversRead = WindowPart & {
  definition_version: number;
  invites: NotConnected;
  onboarding: { completed: Measure; started: NotConnected; drop_off: NotConnected };
  time_to_first_act: {
    status: "connected";
    value: number | null;
    comparison: number | null;
    members_counted: number;
    members_onboarded: number;
  };
  introductions: {
    sent: Measure;
    accepted: Measure;
    answer_days: { value: number | null; comparison: number | null };
  };
  rsvp_going: Measure;
  events: { held: Measure; filled: { value: number } };
  attestations: Measure & {
    by_context: { event_attendance: number; hosting: number; other: number };
    other_kinds: string[];
  };
  posts: Measure & { by_c: Record<string, number>; system: number };
  story_led: NotConnected;
};
export type NetworkRead = {
  tz: string;
  as_of: string;
  registered: number;
  admitted: NotConnected;
  joined: number;
  by_side: { side: "diaspora" | "continent"; value: number }[];
  by_stance: { stance: string; label: string; value: number }[];
  corridors: {
    id: string;
    label: string;
    status: string;
    joined_members: number;
    connections: number;
    density: number | null;
    threshold: number | null;
  }[];
};
export type CompanyRead = Record<
  "partnerships" | "newsletter" | "revenue" | "chapters",
  { status: "not_connected" }
>;

export type Read<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "failed"; code: string | null };

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };

async function readOne<T>(call: PromiseLike<RpcResult>, fn: string): Promise<Read<T>> {
  try {
    const { data, error } = await call;
    if (error) {
      console.warn(
        JSON.stringify({ event: "admin_overview_read_failed", fn, code: error.code ?? null }),
      );
      return { status: "failed", code: error.code ?? null };
    }
    if (!data || typeof data !== "object") return { status: "failed", code: null };
    return { status: "ready", data: data as T };
  } catch {
    return { status: "failed", code: null };
  }
}

export type Reads = {
  window: Read<WindowRead>;
  mobilization: Read<MobilizationRead>;
  levers: Read<LeversRead>;
  network: Read<NetworkRead>;
  company: Read<CompanyRead>;
};
export type ReadKey = keyof Reads;

/** One projection, by its key, typed against the regenerated `database.types.ts`: the page's initial read runs all five in parallel; Try again runs one. */
export function readProjection<K extends ReadKey>(
  sb: Supabase,
  key: K,
  grain: Grain,
  compare: Compare,
  tz: string,
): Promise<Reads[K]> {
  const period = { p_grain: grain, p_compare: compare, p_tz: tz };
  switch (key) {
    case "window":
      return readOne<WindowRead>(
        sb.rpc("admin_overview_window", period),
        "admin_overview_window",
      ) as Promise<Reads[K]>;
    case "mobilization":
      return readOne<MobilizationRead>(
        sb.rpc("admin_overview_mobilization", period),
        "admin_overview_mobilization",
      ) as Promise<Reads[K]>;
    case "levers":
      return readOne<LeversRead>(
        sb.rpc("admin_overview_levers", period),
        "admin_overview_levers",
      ) as Promise<Reads[K]>;
    case "network":
      return readOne<NetworkRead>(
        sb.rpc("admin_overview_network", { p_tz: tz }),
        "admin_overview_network",
      ) as Promise<Reads[K]>;
    default:
      return readOne<CompanyRead>(
        sb.rpc("admin_overview_company"),
        "admin_overview_company",
      ) as Promise<Reads[K]>;
  }
}

// ---------------------------------------------------------------------------------------------------
// DIA's note (Part D): the Edge Function with the caller's JWT. Null on any failure; the page never
// waits on it and DiaNote renders its empty sentence.
// ---------------------------------------------------------------------------------------------------

export type DiaStatementWire = { text: string; block: string };

export async function readDiaNote(
  sb: Supabase,
  grain: Grain,
  compare: Compare,
  tz: string,
  signal?: AbortSignal,
): Promise<DiaStatementWire[]> {
  try {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return [];
    const res = await fetch(functionsUrl("admin-dia-note"), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grain, compare, tz }),
      ...(signal ? { signal } : {}),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { statements?: unknown };
    if (!Array.isArray(json.statements)) return [];
    return json.statements.filter(
      (s): s is DiaStatementWire =>
        !!s &&
        typeof s === "object" &&
        typeof (s as DiaStatementWire).text === "string" &&
        typeof (s as DiaStatementWire).block === "string",
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------------
// Time in the viewer's zone, labelled (1305).
// ---------------------------------------------------------------------------------------------------

function parts(d: Date, tz: string, opts: Intl.DateTimeFormatOptions, locale = "en-GB") {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts }).formatToParts(d))
    if (p.type !== "literal") out[p.type] = p.value;
  // en-GB abbreviates September as "Sept"; the extraction's dates read "Sep" (R2 §5).
  if (out["month"] === "Sept") out["month"] = "Sep";
  return out;
}

/**
 * The zone's abbreviation as the viewer would say it: PDT, GMT, BST from the runtime, which follows
 * daylight time; WAT, SAST, EAT from the reporting_zones vocabulary where the runtime has only an
 * offset; a numeric offset only when neither names it.
 */
export function zoneLabel(d: Date, tz: string): string {
  const us = parts(d, tz, { timeZoneName: "short" }, "en-US")["timeZoneName"] ?? "";
  if (us && !/^GMT[+-−]/.test(us)) return us;
  const gb = parts(d, tz, { timeZoneName: "short" }, "en-GB")["timeZoneName"] ?? "";
  if (gb && !/^GMT[+-−]/.test(gb)) return gb;
  const named = zoneAbbreviations.get(tz);
  if (named) return named;
  return us || gb || tz;
}

/** "11:04" */
export function clock(d: Date, tz: string): string {
  const p = parts(d, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p["hour"]}:${p["minute"]}`;
}
/** "11:04 PDT" */
export function clockZ(d: Date, tz: string): string {
  return `${clock(d, tz)} ${zoneLabel(d, tz)}`;
}
/** "Thu 1 Oct" */
export function dayShort(d: Date, tz: string): string {
  const p = parts(d, tz, { weekday: "short", day: "numeric", month: "short" });
  return `${p["weekday"]} ${p["day"]} ${p["month"]}`;
}
/** "Thu 1 Oct 2026" */
export function dayLong(d: Date, tz: string): string {
  const p = parts(d, tz, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return `${p["weekday"]} ${p["day"]} ${p["month"]} ${p["year"]}`;
}
/** "Thu 1" when the month is said elsewhere */
function dayOnly(d: Date, tz: string): string {
  const p = parts(d, tz, { weekday: "short", day: "numeric" });
  return `${p["weekday"]} ${p["day"]}`;
}
/** "1 Jul 2026" */
export function dateNumeric(d: Date, tz: string): string {
  const p = parts(d, tz, { day: "numeric", month: "short", year: "numeric" });
  return `${p["day"]} ${p["month"]} ${p["year"]}`;
}
/** "September" */
export function monthName(d: Date, tz: string): string {
  return parts(d, tz, { month: "long" })["month"] ?? "";
}
/** "Sep" */
function monthShort(d: Date, tz: string): string {
  return parts(d, tz, { month: "short" })["month"] ?? "";
}
export function yearOf(d: Date, tz: string): string {
  return parts(d, tz, { year: "numeric" })["year"] ?? "";
}
function quarterOf(d: Date, tz: string): number {
  const m = Number(parts(d, tz, { month: "numeric" })["month"] ?? "1");
  return Math.floor((m - 1) / 3) + 1;
}
/** "Thu 1 Oct, 11:00 PDT" */
export function moment(d: Date, tz: string): string {
  return `${dayShort(d, tz)}, ${clockZ(d, tz)}`;
}
function sameDay(a: Date, b: Date, tz: string): boolean {
  return dayLong(a, tz) === dayLong(b, tz);
}

// ---------------------------------------------------------------------------------------------------
// The window's words (R2 §5 and §6).
// ---------------------------------------------------------------------------------------------------

export type WindowWords = {
  /** The period in full, in 500 weight: "This week so far, Mon 28 Sep to Thu 1 Oct 2026". */
  periodLong: string;
  /** The rest of the line: "against last week, Mon 21 to Sun 27 Sep, at the same point in the week." or the reason there is none. */
  cmpLong: string;
  /** On every card: "This week so far, to Thu 1 Oct, vs last week at the same point". */
  short: string;
  /** Whether a comparison exists (1310). */
  hasComparison: boolean;
  /** The trend's two end labels. */
  trendLabels: [string, string];
  /** Labels for each bucket start, for a series of the window's length. */
  bucketLabel: (iso: string) => string;
};

/**
 * The window's words. Days, dates and periods are written in the window's own zone, the company's;
 * clock times in `clockTz`, the staff member's reading zone, which is the company's when they read
 * in it (1411).
 */
export function windowWords(w: WindowPart, clockTz: string = w.tz): WindowWords {
  const tz = w.tz;
  const ct = clockTz;
  const start = new Date(w.period.start);
  const end = new Date(w.period.end);
  const has = !!w.comparison;
  const cs = w.comparison ? new Date(w.comparison.start) : null;
  const ce = w.comparison ? new Date(w.comparison.end) : null;
  const first = w.first_record ? new Date(w.first_record) : null;

  const reason = (() => {
    if (has) return "";
    if (!first) return "DNA has no record yet, so there is nothing to compare.";
    if (w.compare === "last_year")
      return `DNA opened in ${monthName(first, tz)} ${yearOf(first, tz)}, so there is no same period in ${
        Number(yearOf(end, tz)) - 1
      } to compare.`;
    if (w.grain === "year")
      return `DNA opened in ${monthName(first, tz)} ${yearOf(first, tz)}, so there is no previous year to compare.`;
    if (w.grain === "quarter")
      return `DNA opened on ${dateNumeric(first, tz)}, so the previous quarter has nothing at this point to compare.`;
    const unit =
      w.grain === "now"
        ? "the 60 minutes before"
        : w.grain === "hour"
          ? "the hour before"
          : `the previous ${w.grain}`;
    return `DNA opened on ${dateNumeric(first, tz)}, so ${unit} has nothing at this point to compare.`;
  })();

  let periodLong: string;
  let cmpLong: string;
  let short: string;
  let trendLabels: [string, string];
  let bucketLabel: (iso: string) => string = (iso) => clock(new Date(iso), ct);

  switch (w.grain) {
    case "now": {
      periodLong = `Right now, the trailing 60 minutes to ${clockZ(end, ct)}, read live`;
      cmpLong = has ? "against the 60 minutes before." : reason;
      short = `Trailing 60 minutes, ${has ? "vs the 60 minutes before" : "no comparison"}`;
      trendLabels = [clock(start, ct), clock(end, ct)];
      break;
    }
    case "hour": {
      periodLong = `The hour to ${clockZ(end, ct)}, ${dayShort(end, tz)}`;
      cmpLong =
        has && cs && ce ? `against the hour before, ${clock(cs, ct)} to ${clock(ce, ct)}.` : reason;
      short = `Hour to ${clockZ(end, ct)}, ${has ? "vs the hour before" : "no comparison"}`;
      trendLabels = [clock(start, ct), clock(end, ct)];
      break;
    }
    case "day": {
      periodLong = `Today so far, ${dayLong(end, tz)}, to ${clockZ(end, ct)}`;
      cmpLong = has && cs ? `against ${dayShort(cs, tz)} at the same point in the day.` : reason;
      short = `Today so far, to ${clockZ(end, ct)}, ${
        has && cs ? `vs ${dayShort(cs, tz)} at the same point` : "no comparison"
      }`;
      trendLabels = [clock(start, ct), clock(end, ct)];
      break;
    }
    case "week": {
      periodLong = sameDay(start, end, tz)
        ? `This week so far, ${dayLong(end, tz)}`
        : `This week so far, ${dayShort(start, tz)} to ${dayLong(end, tz)}`;
      if (has && cs) {
        const cEnd = new Date(cs.getTime() + 6 * 86400000);
        const span =
          monthShort(cs, tz) === monthShort(cEnd, tz)
            ? `${dayOnly(cs, tz)} to ${dayShort(cEnd, tz)}`
            : `${dayShort(cs, tz)} to ${dayShort(cEnd, tz)}`;
        cmpLong = `against last week, ${span}, at the same point in the week.`;
      } else cmpLong = reason;
      short = `This week so far, to ${dayShort(end, tz)}, ${
        has ? "vs last week at the same point" : "no comparison"
      }`;
      trendLabels = [dayShort(start, tz), dayShort(end, tz)];
      bucketLabel = (iso) => dayShort(new Date(iso), tz);
      break;
    }
    case "month": {
      periodLong = sameDay(start, end, tz)
        ? `This month so far, ${dayLong(end, tz)}`
        : `This month so far, ${dayOnly(start, tz)} to ${dayLong(end, tz)}`;
      cmpLong =
        has && cs && ce
          ? `against ${monthName(cs, tz)} at the same point, ${dayShort(ce, tz)}.`
          : reason;
      short = `${monthName(end, tz)} so far, ${
        has && cs ? `vs ${monthName(cs, tz)} at the same point` : "no comparison"
      }`;
      trendLabels = [dayShort(start, tz), dayShort(end, tz)];
      bucketLabel = (iso) => dayShort(new Date(iso), tz);
      break;
    }
    case "quarter": {
      periodLong = sameDay(start, end, tz)
        ? `This quarter so far, ${dayLong(end, tz)}`
        : `This quarter so far, ${dayShort(start, tz)} to ${dayLong(end, tz)}`;
      cmpLong =
        has && cs && ce
          ? `against Q${quarterOf(cs, tz)} ${yearOf(cs, tz)} at the same point, ${dayShort(ce, tz)}.`
          : reason;
      short = `Q${quarterOf(end, tz)} ${yearOf(end, tz)} so far, ${
        has && cs ? `vs Q${quarterOf(cs, tz)} at the same point` : "no comparison"
      }`;
      trendLabels = [dayShort(start, tz), dayShort(end, tz)];
      bucketLabel = (iso) => dayShort(new Date(iso), tz);
      break;
    }
    default: {
      const from = first && first > start ? first : start;
      periodLong = `${yearOf(end, tz)} so far, ${monthName(from, tz)} to ${dayShort(end, tz)}`;
      cmpLong =
        has && cs && ce
          ? `against ${yearOf(cs, tz)} at the same point, ${dayShort(ce, tz)}.`
          : reason;
      short = `${yearOf(end, tz)} so far, ${
        has && cs ? `vs ${yearOf(cs, tz)} at the same point` : "no comparison"
      }`;
      trendLabels = [monthShort(start, tz), monthShort(end, tz)];
      bucketLabel = (iso) => monthShort(new Date(iso), tz);
    }
  }
  return { periodLong, cmpLong, short, hasComparison: has, trendLabels, bucketLabel };
}

/**
 * "Mobilization Definition v1. Last refreshed Thu 1 Oct, 11:00 PDT." (at Now: "Reading live; rollups
 * last refreshed …"). A moment, written whole in the clock zone (extraction 45-12S §2f).
 */
export function refreshLine(w: WindowRead, clockTz: string = w.tz): string {
  const when = w.refreshed_at ? moment(new Date(w.refreshed_at), clockTz) : null;
  const head = `Mobilization Definition v${w.definition_version}.`;
  if (w.grain === "now")
    return when
      ? `${head} Reading live; rollups last refreshed ${when}.`
      : `${head} Reading live; no refresh recorded yet.`;
  return when ? `${head} Last refreshed ${when}.` : `${head} No refresh recorded yet.`;
}

// ---------------------------------------------------------------------------------------------------
// Figures and changes in words (decision 2: never coloured; guardrail 5: always against the named
// comparison).
// ---------------------------------------------------------------------------------------------------

export function fmt(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString("en-GB")
    : n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
}

/** "Up 18 from 94", "Down 0.6 from 2.4", "No change from 112", "No comparison". */
export function changeWords(
  cur: number | null,
  prev: number | null,
  hasComparison: boolean,
): string {
  if (!hasComparison || prev == null || cur == null) return "No comparison";
  const d = Math.round((cur - prev) * 10) / 10;
  if (d > 0) return `Up ${fmt(d)} from ${fmt(prev)}`;
  if (d < 0) return `Down ${fmt(-d)} from ${fmt(prev)}`;
  return `No change from ${fmt(prev)}`;
}

/** The series' values, or undefined when it is flat (the part omits itself anyway; this keeps the prop honest). */
export function trendOf(series: Point[] | undefined): number[] | undefined {
  if (!series || series.length < 2) return undefined;
  const v = series.map((p) => p.value);
  return v.some((x) => x !== v[0]) ? v : undefined;
}

export const DIRECTION_LABELS: Record<string, string> = {
  diaspora_to_continent: "Diaspora to continent",
  continent_to_diaspora: "Continent to diaspora",
  diaspora_to_diaspora: "Diaspora to diaspora",
  continent_to_continent: "Continent to continent",
};
export const SOURCE_LABELS: Record<string, string> = {
  counterparty: "Confirmed by the other party on the platform",
  partner: "Confirmed by a partner",
  dna_system: "Confirmed by a DNA system",
};
export const SIDE_LABELS: Record<string, string> = {
  diaspora: "Diaspora side",
  continent: "Continent side",
};
