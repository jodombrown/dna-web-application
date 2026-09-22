// Brief 10, Convene Pass 2 (Attend): the event page's one read projection and its write paths
// (rulings 1023, 1025, 1027, 1030, 1032; B10-SPEC sections 1 to 5).
//
// One read projection per surface (CLAUDE.md): `public.event_page(uuid)` is everything the member
// page renders, chosen under row policy as the viewer, so nothing here filters a registration, a
// name or a link on the client (680). The writes are the paths that already exist: `rsvp_event`
// (561, 1030), `respond_to_event_role` (1027) and `set_follow` (Brief 4); no second write path is
// added by this surface. The public page's read lives in ./event-public.ts because it runs on the
// server with the anon key and never through the browser singleton.
//
// No number is computed for display anywhere in this module (guardrail 1): the going names arrive
// only at five or more rows, decided by the projection (508, 645), and the calendar file carries
// dates and times, never a count.
import type { Database } from "./database.types";
import { functionsUrl, getSupabase } from "./supabase";

export type Audience = Database["public"]["Enums"]["audience"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];

export type EventPageEvent = {
  id: string;
  slug: string;
  title: string;
  status: Database["public"]["Enums"]["event_status"];
  cancelled: boolean;
  cancelled_reason: string | null;
  past: boolean;
  starts_at: string | null;
  ends_at: string | null;
  doors_at: string | null;
  timezone: string | null;
  when_text: string;
  date_confirmed: boolean;
  time_confirmed: boolean;
  expected_window_start: string | null;
  expected_window_end: string | null;
  window_basis: string | null;
  mode: Database["public"]["Enums"]["event_mode"];
  ticket_kind: Database["public"]["Enums"]["ticket_kind"];
  delivery_intent: string;
  /** 623: the host's capacity is reached, as a fact and never as a number. */
  full: boolean;
  /** 1028: the event has a public page (published or cancelled, and its post is to everyone). */
  public: boolean;
};

export type EventPresenter =
  | { kind: "member"; id: string; name: string; handle: string; avatar_path: string | null }
  | { kind: "space"; id: string; name: string }
  | null;

export type EventPerson = { id: string; name: string; handle: string; avatar_path: string | null };

export type EventPlace = {
  place_name: string | null;
  place_text: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lng: number | null;
  lat: number | null;
  map_link: string | null;
} | null;

export type EventRegistration = {
  status: RegistrationStatus;
  audience_override: Audience | null;
  contact_consent: boolean;
} | null;

export type EventInvitation = {
  party_id: string;
  role: string;
  label: string;
  verb: string;
  status: Database["public"]["Enums"]["event_party_status"];
};

export type EventSpeaker = {
  party_id: string;
  member_id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  role: string;
  label: string;
};

export type GoingRow = {
  member_id: string;
  name: string;
  handle: string;
  avatar_path: string | null;
  you: boolean;
  connection: boolean;
  shared: boolean;
};

export type EventCalendar = {
  uid: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  location: string | null;
  url: string | null;
  description: string;
};

export type EventPage = {
  event: EventPageEvent;
  post: { id: string; body: string; audience: Audience; published_at: string | null } | null;
  presented_by: EventPresenter;
  media: { position: number; storage_path: string; width: number; height: number }[];
  host: EventPerson | null;
  place: EventPlace;
  /** 1025, 1032: the meeting link, only for the host, a going registrant or an accepted party. */
  meeting_url: string | null;
  /** A link exists that this viewer does not get. */
  door_withheld: boolean;
  viewer: {
    is_host: boolean;
    registration: EventRegistration;
    default_audience: Audience;
    has_default: boolean;
  };
  invitations: EventInvitation[];
  speakers: EventSpeaker[];
  partners: never[];
  /** Null below the floor (508, 645); the rows this viewer's policy returns at five or more. */
  going: GoingRow[] | null;
  calendar: EventCalendar;
};

/** The member page's one read (1023). Null is the not-found state. */
export async function loadEventPage(id: string): Promise<EventPage | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("event_page", { p_event: id });
  if (error) throw error;
  return (data as unknown as EventPage | null) ?? null;
}

/** Whether the member follows the host, under the member's own read of member_follows. */
export async function isFollowing(memberId: string, targetId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || memberId === targetId) return false;
  const { data } = await sb
    .from("member_follows")
    .select("member_id")
    .eq("follower_id", memberId)
    .eq("member_id", targetId)
    .limit(1);
  return (data ?? []).length > 0;
}

/** Brief 4's follow write path; no second one exists for this surface. */
export async function setFollow(targetId: string, on: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("set_follow", { p_target: targetId, p_on: on });
  if (error) throw error;
}

export type RsvpResult = {
  event_id: string;
  status: RegistrationStatus;
  audience_override: Audience | null;
  contact_consent: boolean;
  /** 1030: this answer wrote the member's convene default. */
  default_set: boolean;
  updated_at: string;
};

/** The server's own refusal sentences the sheet reads by name (623). */
export const RSVP_FULL_MESSAGE = "This event is full.";

export class RsvpError extends Error {
  constructor(
    message: string,
    public readonly full: boolean,
  ) {
    super(message);
  }
}

/**
 * The one RSVP write (561, 1030): `public.rsvp_event`. A first going answer carries the chosen
 * scope and the server makes it the member's default; a later answer carries an override or null.
 */
export async function rsvpEvent(
  eventId: string,
  status: RegistrationStatus,
  audienceOverride: Audience | null,
): Promise<RsvpResult> {
  const sb = getSupabase();
  if (!sb) throw new RsvpError("Not signed in.", false);
  const { data, error } = await sb.rpc("rsvp_event", {
    p_event: eventId,
    p_status: status,
    ...(audienceOverride ? { p_audience_override: audienceOverride } : {}),
    p_contact_consent: false,
  });
  if (error) throw new RsvpError(error.message, error.message.includes(RSVP_FULL_MESSAGE));
  return data as unknown as RsvpResult;
}

/** 1027: the named member answers an invitation through the one write path. */
export async function respondToEventRole(partyId: string, accept: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("respond_to_event_role", { p_party: partyId, p_accept: accept });
  if (error) throw error;
}

// ---------------------------------------------------------------------------------------------
// The three scopes (680, 739), in the member's words. The third scope is the `anchored` audience:
// a Space role or an attested event in common.
// ---------------------------------------------------------------------------------------------

export type Scope = { value: Audience; label: string; line: string; visible: string };

export const SCOPES: Scope[] = [
  {
    value: "everyone",
    label: "Anyone on DNA",
    line: "Members who open this event can see you are going.",
    visible: "Visible to anyone on DNA.",
  },
  {
    value: "connections",
    label: "My connections",
    line: "Only members you are connected to can see you are going.",
    visible: "Visible to your connections.",
  },
  {
    value: "anchored",
    label: "People I share a Space or event with",
    line: "Members who hold a Space role with you or attended an attested event with you.",
    visible: "Visible to people you share a Space or event with.",
  },
];

export function scopeOf(audience: Audience): Scope {
  return SCOPES.find((s) => s.value === audience) ?? (SCOPES[1] as Scope);
}

// ---------------------------------------------------------------------------------------------
// Links and images (679, 1028, 1029)
// ---------------------------------------------------------------------------------------------

/** The public page's address, `/e/{slug}` on this deployment's origin (1024). */
export function publicEventPath(slug: string): string {
  return "/e/" + encodeURIComponent(slug);
}

/** The member page's address, inside the shell. */
export function memberEventPath(id: string): string {
  return "/convene/events/" + encodeURIComponent(id);
}

/** An image the public page may show, through the event-media function and never a storage path. */
export function eventMediaUrl(slug: string, key: { position: number } | { party: string }): string {
  const q =
    "position" in key
      ? "m=" + encodeURIComponent(String(key.position))
      : "p=" + encodeURIComponent(key.party);
  return functionsUrl("event-media") + "?e=" + encodeURIComponent(slug) + "&" + q;
}

// ---------------------------------------------------------------------------------------------
// Add to calendar (Pass 1 `calendar`, 742): one .ics from the calendar block, times in UTC.
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

/** The calendar file's text, or null when the event has no start instant (a window in words). */
export function buildIcs(cal: EventCalendar, now = new Date()): string | null {
  if (!cal.starts_at) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DNA//Convene//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + cal.uid,
    "DTSTAMP:" + icsDate(now.toISOString()),
    "DTSTART:" + icsDate(cal.starts_at),
  ];
  if (cal.ends_at) lines.push("DTEND:" + icsDate(cal.ends_at));
  lines.push("SUMMARY:" + icsText(cal.title));
  if (cal.location) lines.push("LOCATION:" + icsText(cal.location));
  if (cal.url) lines.push("URL:" + cal.url);
  if (cal.description) lines.push("DESCRIPTION:" + icsText(cal.description));
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Offer the file to the browser as a download named after the event's slug. */
export function downloadIcs(cal: EventCalendar, slug: string): boolean {
  const text = buildIcs(cal);
  if (!text || typeof document === "undefined") return false;
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = slug + ".ics";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
