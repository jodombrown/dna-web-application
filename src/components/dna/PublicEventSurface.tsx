// Brief 10's public event page (B10-SPEC sections 2 and 3, the public projection; rulings 662, 678,
// 680, 1028, 1029; handoff 30-C item 10). Its own render, outside the shell: a top bar with the
// wordmark and Sign in, one column at --content-max, the footer line. Rendered on the server from
// the loader's data, so a link-preview crawler reads the same markup a browser does.
//
// What it never renders: an attendee, a count, or an RSVP affordance. The affordance is the guest
// path's entry and arrives with handoff 30-D; a button with nowhere to go is not grounded. Every
// image comes through the event-media function by slug and position or party id (1029), never a
// storage path, and a pending party is the role alone (678).
import { Avatar } from "@/components/strand/Avatar";
import { Button } from "@/components/strand/Button";
import { MediaBlock } from "@/components/strand/MediaBlock";
import { assetBase } from "@/components/strand/cmeta";
import { eventMediaUrl } from "@/lib/event-page";
import type { PublicEventPage } from "@/lib/event-public";
import { useTheme, useTier } from "@/lib/tier";
import {
  EventBody,
  EventTitle,
  FactRow,
  Facts,
  Kicker,
  PresentedBy,
  QUIET,
  SpeakersRow,
  eventOwnWhen,
  placeWord,
} from "./EventParts";

/** The quiet line a cancelled page ends on: the card's own sentence (src/lib/feed.ts). */
const CANCELLED_SURVIVES = "If you had said you were going, you were told by email.";

export const PUBLIC_FOOTER =
  "DNA, the Diaspora Network of Africa. Members host and attend across five Cs.";

export function PublicEventSurface({ page, slug }: { page: PublicEventPage; slug: string }) {
  useTheme();
  const tier = useTier();
  const compact = tier === "compact";
  const ev = page.event;
  const when = eventOwnWhen({
    starts_at: ev.starts_at,
    ends_at: ev.ends_at,
    doors_at: ev.doors_at,
    timezone: ev.timezone,
    window_basis: ev.window_basis,
    expected_window_end: ev.expected_window_end,
    past: ev.past,
    city: page.place?.city ?? null,
  });
  const where = placeWord(ev.mode, page.place);
  const cover = !ev.cancelled && page.media[0] ? page.media[0] : null;
  const speakers = [
    ...page.speakers.map((s) => ({
      key: s.party_id,
      name: s.name,
      label: s.label,
      avatarSrc: s.has_photo ? eventMediaUrl(slug, { party: s.party_id }) : undefined,
    })),
    ...page.pending_roles.map((r, i) => ({
      key: "pending-" + r.role + "-" + i,
      name: null,
      label: r.label,
      pending: true,
    })),
  ];

  return (
    <div
      data-public-event={slug}
      data-event-state={ev.cancelled ? "cancelled" : ev.past ? "past" : "loaded"}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--line)",
          padding: compact ? "0 16px" : "0 32px",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minHeight: 56,
            width: "100%",
            maxWidth: 1440,
            margin: "0 auto",
          }}
        >
          <a
            href="/"
            aria-label="DNA"
            style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }}
          >
            <img
              src={assetBase() + "logo.png"}
              alt="DNA"
              style={{ height: 24, display: "block" }}
            />
          </a>
          <a href="/sign-in" style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="sm" tabIndex={-1}>
              Sign in
            </Button>
          </a>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "var(--content-max)",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: compact ? "16px 16px 48px" : "32px 32px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {cover && (
          <MediaBlock kind="image" src={eventMediaUrl(slug, { position: cover.position })} alt="" />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Kicker cancelled={ev.cancelled} />
          <EventTitle title={ev.title} cancelled={ev.cancelled} compact={compact} />
        </div>
        <PresentedBy presenter={page.presented_by.name} host={page.host?.name ?? null} />
        {ev.cancelled ? (
          <>
            {ev.cancelled_reason && <EventBody>{ev.cancelled_reason}</EventBody>}
            <p data-event-cancelled-line style={{ margin: 0, ...QUIET, fontSize: 15 }}>
              {CANCELLED_SURVIVES}
            </p>
          </>
        ) : (
          <>
            <Facts>
              {when && <FactRow icon="calendar" main={when} testId="when" />}
              {where && (
                <FactRow
                  icon="map-pin"
                  main={where}
                  sub={ev.timezone ? "Times at the place are in " + ev.timezone : undefined}
                  testId="where"
                />
              )}
              {ev.delivery_intent.trim() && (
                <FactRow
                  icon="info"
                  main={ev.delivery_intent.trim()}
                  sub="The exact door goes to people who are going."
                  testId="intent"
                />
              )}
            </Facts>
            <EventBody>{page.body}</EventBody>
            <SpeakersRow speakers={speakers} />
          </>
        )}
      </main>
      <footer
        style={{
          padding: "24px 16px calc(24px + env(safe-area-inset-bottom))",
          textAlign: "center",
          fontSize: 13,
          lineHeight: 1.45,
          color: "var(--ink-3)",
          borderTop: "1px solid var(--line)",
        }}
      >
        {PUBLIC_FOOTER}{" "}
        <a href="/sign-in" style={{ color: "var(--ink-2)" }}>
          Sign in
        </a>
      </footer>
    </div>
  );
}
