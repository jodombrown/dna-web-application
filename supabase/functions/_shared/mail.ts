// Convene's outbound mail (handoff 30-D item 2; rulings 387 and 1035, on 1025 and 1032).
//
// Three things, shared by guest-rsvp and event-mail so the guest's going email and the member's are
// the same email:
//
//   sendMail   posts one plain-text message to Resend from NOTIFICATION_SENDER, notifications@ with
//              Reply-To support@ (387). It reads RESEND_API_KEY from the environment and never
//              prints it. It logs an outcome and a status code, never a recipient, a body or a link.
//   eventIcs   one VEVENT with the same fields as the client's calendar file in src/lib/event-page.ts
//              (`buildIcs`): UID the event id, DTSTART and DTEND in UTC, SUMMARY the title, LOCATION
//              the place line or, failing that, the meeting link, and URL the meeting link. An Edge
//              Function cannot import from src/, so this mirrors that builder line for line, folding
//              included; edit both together. The client's file also carries a DESCRIPTION naming the
//              presenter, which the mail facts do not carry, so the mailed file has none.
//   whenLine   the host's own words (`when_text`) when they wrote some, otherwise the start read in
//              the event's own zone as src/lib/when.ts `localLine` reads it: `Thu 16 Oct, 19:00
//              Africa/Accra`, the year only outside the year it is read in (835), the zone by its
//              IANA identifier and never an abbreviation (898).
//
// The facts are what private.guest_mail_facts returns (20260922120000) and what event-mail builds
// from event_page: the same shape, so one email text serves both. The meeting link arrives only for a
// going row (1025, 1032), and nothing here decides that.
import { NOTIFICATION_SENDER, fromHeader } from "./contact.ts";

const RESEND_URL = "https://api.resend.com/emails";

export type MailPlace = {
  place_name: string | null;
  place_text: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
} | null;

export type MailFacts = {
  event_id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  doors_at: string | null;
  timezone: string | null;
  when_text: string | null;
  mode: "in_person" | "virtual" | "hybrid";
  place: MailPlace;
  meeting_url: string | null;
};

export type MailAttachment = {
  filename: string;
  /** Base64 of the file's bytes, which is what Resend's API takes. */
  content: string;
  content_type?: string;
};

export type SendResult = { ok: boolean; status: number };

/** Read the facts out of a jsonb answer; null when the shape is not the one the migration writes. */
export function readFacts(value: unknown): MailFacts | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : null);
  const eventId = str("event_id");
  const slug = str("slug");
  const title = str("title");
  const mode = str("mode");
  if (!eventId || !slug || title === null) return null;
  if (mode !== "in_person" && mode !== "virtual" && mode !== "hybrid") return null;
  let place: MailPlace = null;
  if (v.place && typeof v.place === "object") {
    const p = v.place as Record<string, unknown>;
    const ps = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : null);
    place = {
      place_name: ps("place_name"),
      place_text: ps("place_text"),
      city: ps("city"),
      region: ps("region"),
      country: ps("country"),
    };
  }
  return {
    event_id: eventId,
    slug,
    title,
    starts_at: str("starts_at"),
    ends_at: str("ends_at"),
    doors_at: str("doors_at"),
    timezone: str("timezone"),
    when_text: str("when_text"),
    mode,
    place,
    meeting_url: str("meeting_url"),
  };
}

/**
 * One message through Resend. The From and Reply-To come from the contact module's sender pairing
 * (387); no address is written here. A missing key is a misconfiguration, reported as status 0 and
 * never as a thrown error, so a caller's own answer to its client stands whatever the mail did.
 */
export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}): Promise<SendResult> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.log(JSON.stringify({ event: "mail_misconfigured" }));
    return { ok: false, status: 0 };
  }
  const body: Record<string, unknown> = {
    from: fromHeader(NOTIFICATION_SENDER),
    reply_to: NOTIFICATION_SENDER.replyTo,
    to: [input.to],
    subject: input.subject,
    text: input.text,
  };
  if (input.attachments && input.attachments.length) body.attachments = input.attachments;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // The response body is never read into a log: on a failure it can echo the recipient.
    if (!res.ok) console.log(JSON.stringify({ event: "mail_send_failed", status: res.status }));
    return { ok: res.ok, status: res.status };
  } catch {
    console.log(JSON.stringify({ event: "mail_send_failed", status: 0 }));
    return { ok: false, status: 0 };
  }
}

// ---------------------------------------------------------------------------------------------
// The when line (src/lib/when.ts, mirrored)
// ---------------------------------------------------------------------------------------------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function knownZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
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

function dateInZone(instant: Date, tz: string): string {
  const p = partsIn(instant, tz);
  const wd = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return WEEKDAYS[wd] + " " + p.day + " " + MONTHS[p.month - 1];
}

function timeInZone(instant: Date, tz: string): string {
  const p = partsIn(instant, tz);
  return pad(p.hour) + ":" + pad(p.minute);
}

function outsideThisYear(instant: Date, tz: string, now: Date): boolean {
  return partsIn(instant, tz).year !== partsIn(now, tz).year;
}

function dateLine(instant: Date, tz: string, now: Date): string {
  const base = dateInZone(instant, tz);
  return outsideThisYear(instant, tz, now) ? base + " " + partsIn(instant, tz).year : base;
}

/** `localLine` mirrored: "Thu 16 Sep 2027, 19:00 Africa/Accra". Empty for no instant. */
function localLine(iso: string, tz: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dateLine(d, tz, now) + ", " + timeInZone(d, tz) + " " + tz;
}

/** The host's own words when they wrote some, otherwise the start in the event's own zone. */
export function whenLine(facts: MailFacts, now = new Date()): string {
  const words = facts.when_text?.trim() ?? "";
  if (words) return words;
  if (!facts.starts_at) return "";
  const tz = knownZone(facts.timezone) ? facts.timezone : "UTC";
  return localLine(facts.starts_at, tz, now);
}

// ---------------------------------------------------------------------------------------------
// The place line (src/lib/place.ts and EventParts.tsx `placeWord`, mirrored)
// ---------------------------------------------------------------------------------------------

const foldPart = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function placeParts(...parts: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of parts) {
    const part = typeof raw === "string" ? raw.trim() : "";
    if (!part) continue;
    const key = foldPart(part);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(part);
  }
  return kept;
}

/** The page's map-pin line: the place, or the format word (B10-SPEC 3.6). */
export function placeWord(facts: MailFacts): string {
  const place = facts.place;
  const wordsOnly = !!place && !place.place_name && !place.city;
  const words = place
    ? placeParts(
        place.place_text,
        place.place_name,
        place.city,
        wordsOnly ? place.country : null,
      ).join(", ")
    : "";
  if (facts.mode === "virtual") return "Online";
  if (facts.mode === "hybrid") return words ? words + " and online" : "Online";
  return words;
}

// ---------------------------------------------------------------------------------------------
// The calendar file (src/lib/event-page.ts `buildIcs`, mirrored)
// ---------------------------------------------------------------------------------------------

function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function icsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding: 75 octets, continuation lines begin with one space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (curBytes + n > limit) {
      out.push(cur);
      cur = "";
      curBytes = 0;
    }
    cur += ch;
    curBytes += n;
  }
  if (cur) out.push(cur);
  return out.join("\r\n ");
}

/** event_page's `calendar.location`: place name or text, city, country; else the meeting link. */
function calendarLocation(facts: MailFacts): string | null {
  const p = facts.place;
  const named = p ? (p.place_name || p.place_text || "").trim() : "";
  const joined = [named, p?.city?.trim() ?? "", p?.country?.trim() ?? ""]
    .filter(Boolean)
    .join(", ");
  return joined || facts.meeting_url || null;
}

/** The calendar file's text, or null when the event has no start instant (a window in words). */
export function eventIcs(facts: MailFacts, now = new Date()): string | null {
  if (!facts.starts_at || Number.isNaN(new Date(facts.starts_at).getTime())) return null;
  const location = calendarLocation(facts);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DNA//Convene//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + facts.event_id,
    "DTSTAMP:" + icsDate(now.toISOString()),
    "DTSTART:" + icsDate(facts.starts_at),
  ];
  if (facts.ends_at && !Number.isNaN(new Date(facts.ends_at).getTime()))
    lines.push("DTEND:" + icsDate(facts.ends_at));
  lines.push("SUMMARY:" + icsText(facts.title));
  if (location) lines.push("LOCATION:" + icsText(location));
  if (facts.meeting_url) lines.push("URL:" + facts.meeting_url);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The `.ics` as a Resend attachment named after the event's slug, or null with no instant. */
export function icsAttachment(facts: MailFacts, now = new Date()): MailAttachment | null {
  const text = eventIcs(facts, now);
  if (!text) return null;
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return { filename: facts.slug + ".ics", content: btoa(bin), content_type: "text/calendar" };
}

// ---------------------------------------------------------------------------------------------
// The two texts (1035): plain text from the SPEC's approved lines, until Design draws a template.
// ---------------------------------------------------------------------------------------------

const SIGNOFF = "DNA, the Diaspora Network of Africa.";

/** The link email: the guest's one way in for this event (1026). */
export function linkEmail(facts: MailFacts, link: string, now = new Date()) {
  const lines = [
    facts.title,
    whenLine(facts, now) || null,
    "",
    "I am going:",
    link,
    "",
    "It signs you in for this event only.",
    "Your name is never shown to anyone but the host.",
    "",
    SIGNOFF,
  ];
  return { subject: facts.title, text: joinLines(lines) };
}

/** The going confirmation, the same for a guest and a member, with the door only when there is one. */
export function goingEmail(facts: MailFacts, changeLink: string, now = new Date()) {
  const lines = [
    "You are going.",
    "",
    facts.title,
    whenLine(facts, now) || null,
    placeWord(facts) || null,
    facts.meeting_url,
    "",
    "Change:",
    changeLink,
    "",
    SIGNOFF,
  ];
  const attachment = icsAttachment(facts, now);
  return {
    subject: "You are going. " + facts.title,
    text: joinLines(lines),
    attachments: attachment ? [attachment] : [],
  };
}

/** A fact line the event has no value for is null and is dropped; the copy's blank separators stay. */
function joinLines(lines: (string | null)[]): string {
  return lines.filter((l): l is string => l !== null).join("\n") + "\n";
}
