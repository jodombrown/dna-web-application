// Dates the way the system writes them (Strand content fundamentals): "Thu 16 Oct, 19:00".
// Notification times shorten to "Today, 10:12" and "Yesterday, 18:40" inside the last two days.
//
// Convene Pass 1 (SPEC section 3 "The moment", section 2 "The meta line"; rulings 520, 634, 676):
// the one date module. The member's words are parsed here in the event's own time zone and read
// back in one quiet line; a parse that yields no time is the picker's cue, never a guess. Every
// zone name and abbreviation is derived through Intl from an IANA zone: nothing here holds a table
// of zones. Parser: chrono-node (confidence High on the SPEC's English forms). No second date
// module exists in this tree, by the handoff's instruction.
import { format, isToday, isYesterday } from "date-fns";
import * as chrono from "chrono-node";

export function whenLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "EEE d MMM, HH:mm");
}

export function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today, " + format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday, " + format(d, "HH:mm");
  return format(d, "EEE d MMM");
}

// ---------------------------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------------------------

/** Whether Intl knows this zone; an unknown zone renders nothing rather than a wrong offset. */
export function knownZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The browser's zone (ruling owed 7: an online-only event takes the host's own zone at publish). */
export function browserZone(): string {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return knownZone(z) ? z : "UTC";
  } catch {
    return "UTC";
  }
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function partsIn(instant: Date, tz: string): Parts {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const get = (type: string) =>
    Number(f.formatToParts(instant).find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
}

/** The zone's offset from UTC at an instant, in minutes. */
export function zoneOffsetMinutes(tz: string, instant: Date): number {
  const p = partsIn(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0);
  const truncated = Math.floor(instant.getTime() / 60000) * 60000;
  return Math.round((asUtc - truncated) / 60000);
}

/** The instant a wall-clock time in a zone names. Two passes settle a DST edge. */
export function zonedInstant(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
  tz: string,
): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, 0, 0);
  const off1 = zoneOffsetMinutes(tz, new Date(guess));
  let instant = guess - off1 * 60000;
  const off2 = zoneOffsetMinutes(tz, new Date(instant));
  if (off2 !== off1) instant = guess - off2 * 60000;
  return new Date(instant);
}

/** The zone's short name at an instant, as Intl gives it ("GMT", "BST", "GMT+3"). */
export function zoneAbbr(tz: string, instant: Date): string {
  try {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "short" });
    return f.formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "Thu 15 Oct" for an instant read in a zone. */
export function dateInZone(instant: Date, tz: string): string {
  const p = partsIn(instant, tz);
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return WEEKDAYS[wd] + " " + p.day + " " + MONTHS[p.month - 1];
}

/** "19:00" for an instant read in a zone. */
export function timeInZone(instant: Date, tz: string): string {
  const p = partsIn(instant, tz);
  return pad(p.hour) + ":" + pad(p.minute);
}

/** "Thu 15 Oct, 19:00 GMT": the event's own reading of its start (SPEC 2, 3). */
export function localLine(iso: string, tz: string, withZone = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || !knownZone(tz)) return "";
  return dateInZone(d, tz) + ", " + timeInZone(d, tz) + (withZone ? " " + zoneAbbr(tz, d) : "");
}

// ---------------------------------------------------------------------------------------------
// The member's words
// ---------------------------------------------------------------------------------------------

export type ParsedWhen = {
  /** yyyy-mm-dd the words named; present whenever a date was read. */
  date: string | null;
  /** HH:mm the words named; null when the words carried no time (the picker's cue). */
  time: string | null;
};

/**
 * Read the member's words for the moment. `now` anchors a year-less date to the next occurrence.
 * A time is reported only when the words state one: "15 October at 19:00" carries 19:00, "next
 * Thursday evening" does not, and the SPEC treats the second as a failed parse for the instant.
 */
export function parseWhen(words: string, now = new Date()): ParsedWhen | null {
  const t = words.trim();
  if (!t) return null;
  const results = chrono.en.GB.parse(t, now, { forwardDate: true });
  const r = results[0];
  if (!r) return null;
  const s = r.start;
  if (!s.isCertain("day") && !s.isCertain("weekday")) return null;
  const date = s.get("year") + "-" + pad(s.get("month") ?? 1) + "-" + pad(s.get("day") ?? 1);
  const time = s.isCertain("hour")
    ? pad(s.get("hour") ?? 0) + ":" + pad(s.get("minute") ?? 0)
    : null;
  return { date, time };
}

/** A time alone ("22:00", "7pm", "18:30"), as HH:mm; null when the words carry none. */
export function parseTimeWords(words: string, now = new Date()): string | null {
  const t = words.trim();
  if (!t) return null;
  const r = chrono.en.GB.parse(t, now)[0];
  if (!r || !r.start.isCertain("hour")) return null;
  return pad(r.start.get("hour") ?? 0) + ":" + pad(r.start.get("minute") ?? 0);
}

/** yyyy-mm-dd plus HH:mm in a zone, as an ISO instant. Null on anything malformed. */
export function instantFor(date: string, time: string, tz: string): string | null {
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = time.match(/^(\d{2}):(\d{2})$/);
  if (!dm || !tm || !knownZone(tz)) return null;
  const d = zonedInstant(+dm[1]!, +dm[2]!, +dm[3]!, +tm[1]!, +tm[2]!, tz);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type Window = { start: string; end: string };

/**
 * Ruling 520: an honest window in words. When the words name a month ("November", "Nov 2027") the
 * expected window is that month's first and last day; any other words stand as the basis alone.
 */
export function windowFor(words: string, now = new Date()): Window | null {
  const t = words.trim();
  if (!t) return null;
  const m = t.match(/^([A-Za-z]{3,9})(?:\s+(\d{4}))?$/);
  if (!m) return null;
  const idx = MONTHS.findIndex((mo) => m[1]!.toLowerCase().startsWith(mo.toLowerCase()));
  if (idx < 0) return null;
  let year = m[2] ? +m[2] : now.getFullYear();
  if (!m[2] && idx < now.getMonth()) year += 1;
  const last = new Date(Date.UTC(year, idx + 1, 0)).getUTCDate();
  return {
    start: year + "-" + pad(idx + 1) + "-01",
    end: year + "-" + pad(idx + 1) + "-" + pad(last),
  };
}

// ---------------------------------------------------------------------------------------------
// The card's meta line (SPEC section 2)
// ---------------------------------------------------------------------------------------------

export type EventTiming = {
  starts_at: string | null;
  timezone: string | null;
  window_basis: string | null;
  expected_window_end: string | null;
  city: string | null;
};

/** Ruling owed 5: past is derived at read from the start, or the window's end, never stored. */
export function isPast(
  t: Pick<EventTiming, "starts_at" | "expected_window_end">,
  now = new Date(),
): boolean {
  if (t.starts_at) return new Date(t.starts_at).getTime() < now.getTime();
  if (t.expected_window_end) {
    const end = new Date(t.expected_window_end + "T23:59:59Z");
    return end.getTime() < now.getTime();
  }
  return false;
}

/**
 * `when` for the meta line: the date in the viewer's zone, then the event's local time when they
 * differ (`Thu 16 Oct, 21:00 EAT, 19:00 in Accra`); a window as words (`November, date to be
 * confirmed`); past as `Happened Thu 16 Oct, 19:00 GMT`.
 */
export function whenLine(t: EventTiming, viewerTz: string, now = new Date()): string {
  if (!t.starts_at) return t.window_basis ? t.window_basis + ", date to be confirmed" : "";
  const d = new Date(t.starts_at);
  if (Number.isNaN(d.getTime())) return "";
  const eventTz = knownZone(t.timezone) ? t.timezone : null;
  if (isPast(t, now)) {
    const tz = eventTz ?? (knownZone(viewerTz) ? viewerTz : "UTC");
    return "Happened " + localLine(t.starts_at, tz);
  }
  const vtz = knownZone(viewerTz) ? viewerTz : (eventTz ?? "UTC");
  let line = dateInZone(d, vtz) + ", " + timeInZone(d, vtz) + " " + zoneAbbr(vtz, d);
  if (eventTz && zoneOffsetMinutes(eventTz, d) !== zoneOffsetMinutes(vtz, d)) {
    line += ", " + timeInZone(d, eventTz) + (t.city ? " in " + t.city : " " + zoneAbbr(eventTz, d));
  }
  return line;
}
