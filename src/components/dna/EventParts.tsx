// Brief 10, Convene Pass 2 (Attend): the parts the member page and the public page share
// (B10-SPEC section 3, items 2 to 10). One drawing per part, so the two projections cannot drift
// in how a fact row, the presenter row or the speakers strip reads (662). Nothing here is fetched:
// every prop is a value the page's projection already chose.
//
// Guardrail 1: no number renders anywhere. The only digits on this surface are dates, times and
// whatever the host wrote into the door line, and every one of them arrives through src/lib/when.ts
// or the host's own words.
import type { CSSProperties, ReactNode } from "react";
import { Avatar } from "@/components/strand/Avatar";
import { Icon } from "@/components/strand/Icon";
import { placeLine } from "@/lib/place";
import { dateLine, knownZone, localLine, timeInZone, whenLine } from "@/lib/when";

export const CAPS: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

export const QUIET: CSSProperties = { fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" };

export function CapsLabel({ children }: { children: ReactNode }) {
  return <div style={CAPS}>{children}</div>;
}

export type EventTiming = {
  starts_at: string | null;
  ends_at: string | null;
  doors_at: string | null;
  timezone: string | null;
  window_basis: string | null;
  expected_window_end: string | null;
  past: boolean;
  city?: string | null | undefined;
};

/**
 * The calendar row's two lines (SPEC 3.6). The main line is the card's own `when` (P1-SPEC
 * section 2): the viewer's zone, then the event's local time when they differ; a window as words;
 * past as `Happened …`. The sub line is the doors time at the place, or on a past event the end.
 * Every zone is its IANA identifier (898) and the year follows 835.
 */
export function whenLines(t: EventTiming, viewerTz: string, now = new Date()) {
  const main = whenLine(
    {
      starts_at: t.starts_at,
      timezone: t.timezone,
      window_basis: t.window_basis,
      expected_window_end: t.expected_window_end,
      city: t.city ?? null,
    },
    viewerTz,
    now,
  );
  const tz = knownZone(t.timezone) ? t.timezone : knownZone(viewerTz) ? viewerTz : "UTC";
  let sub = "";
  if (t.past && t.ends_at) {
    const end = new Date(t.ends_at);
    sub = "Ended " + dateLine(end, tz, now) + ", " + timeInZone(end, tz) + " " + tz;
  } else if (!t.past && t.doors_at) {
    sub = "Doors " + timeInZone(new Date(t.doors_at), tz) + ", the time at the place";
  }
  return { main, sub };
}

/** The map-pin row's main line: the place, or the format word (SPEC 3.6). */
export function placeWord(
  mode: "in_person" | "virtual" | "hybrid",
  place: {
    place_name: string | null;
    place_text: string | null;
    city: string | null;
    country: string | null;
  } | null,
): string {
  const wordsOnly = !!place && !place.place_name && !place.city;
  const words = place
    ? placeLine(place.place_text, place.place_name, place.city, wordsOnly ? place.country : null)
    : "";
  if (mode === "virtual") return "Online";
  if (mode === "hybrid") return words ? words + " and online" : "Online";
  return words;
}

/** The event's own moment, for a surface with no viewer zone (the public page's server render). */
export function eventOwnWhen(t: EventTiming, now = new Date()): string {
  if (t.starts_at && knownZone(t.timezone)) {
    const line = localLine(t.starts_at, t.timezone, true, now);
    return t.past ? "Happened " + line : line;
  }
  return whenLine(
    {
      starts_at: t.starts_at,
      timezone: t.timezone,
      window_basis: t.window_basis,
      expected_window_end: t.expected_window_end,
      city: t.city ?? null,
    },
    "UTC",
    now,
  );
}

export function FactRow({
  icon,
  main,
  sub,
  testId,
}: {
  icon: string;
  main: ReactNode;
  sub?: ReactNode;
  testId?: string | undefined;
}) {
  return (
    <div
      data-fact={testId}
      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0" }}
    >
      <Icon name={icon} size={18} style={{ marginTop: 2, color: "var(--ink-2)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink)" }}>{main}</div>
        {sub && <div style={QUIET}>{sub}</div>}
      </div>
    </div>
  );
}

export function Facts({ children }: { children: ReactNode }) {
  return (
    <div
      data-event-facts
      style={{
        display: "flex",
        flexDirection: "column",
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line)",
        padding: "4px 0",
      }}
    >
      {children}
    </div>
  );
}

export function Kicker({ cancelled }: { cancelled: boolean }) {
  return (
    <div
      data-event-kicker
      style={{ ...CAPS, color: cancelled ? "var(--ink-3)" : "var(--c-convene-text)" }}
    >
      {cancelled ? "Event cancelled" : "Event"}
    </div>
  );
}

export function EventTitle({
  title,
  cancelled,
  compact,
}: {
  title: string;
  cancelled: boolean;
  compact: boolean;
}) {
  return (
    <h1
      data-event-title
      style={{
        margin: 0,
        fontFamily: "var(--font-display)",
        fontWeight: 400,
        fontSize: compact ? 26 : 32,
        lineHeight: 1.15,
        color: cancelled ? "var(--ink-3)" : "var(--ink)",
        textDecoration: cancelled ? "line-through" : "none",
        textDecorationColor: "var(--line-strong)",
        textWrap: "pretty",
      }}
    >
      {title}
    </h1>
  );
}

export function PresentedBy({
  presenter,
  host,
  avatarSrc,
  action,
}: {
  presenter: string | null;
  host: string | null;
  avatarSrc?: string | undefined;
  action?: ReactNode;
}) {
  const name = presenter ?? host ?? "";
  return (
    <div data-event-presenter style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Avatar name={name} src={avatarSrc} size={40} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
          Presented by {name}
        </span>
        {host && host !== presenter && <span style={QUIET}>Hosted by {host}</span>}
      </div>
      {action}
    </div>
  );
}

export type SpeakerPill = {
  key: string;
  name: string | null;
  label: string;
  avatarSrc?: string | undefined;
  /** 678: a pending party on the public page, drawn as a dashed empty avatar and the role alone. */
  pending?: boolean | undefined;
};

/** The speakers strip (SPEC 3.9): horizontal scroll of pills; absent below one. */
export function SpeakersRow({
  speakers,
  label = true,
}: {
  speakers: SpeakerPill[];
  label?: boolean;
}) {
  if (speakers.length === 0) return null;
  return (
    <div data-event-speakers style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && <CapsLabel>Speakers</CapsLabel>}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
          // Contained, so the strip scrolls inside the column rather than widening it (344).
          minWidth: 0,
          contain: "inline-size",
        }}
      >
        {speakers.map((s) => (
          <span
            key={s.key}
            data-speaker={s.pending ? "pending" : "accepted"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              flex: "none",
              padding: "4px 12px 4px 4px",
              borderRadius: "var(--radius-pill)",
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            {s.pending ? (
              <span
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px dashed var(--line-strong)",
                  flex: "none",
                }}
              />
            ) : (
              <Avatar name={s.name ?? ""} src={s.avatarSrc} size={32} />
            )}
            <span
              style={{ display: "flex", flexDirection: "column", gap: 0, whiteSpace: "nowrap" }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>
                {s.pending ? s.label : s.name}
              </span>
              <span style={QUIET}>{s.pending ? "to be confirmed" : s.label}</span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** The body (SPEC 3.8): 17, pre-wrap, the host's words as written. */
export function EventBody({ children }: { children: string }) {
  if (!children.trim()) return null;
  return (
    <p
      data-event-body
      style={{
        margin: 0,
        fontSize: 17,
        lineHeight: 1.5,
        color: "var(--ink)",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </p>
  );
}
