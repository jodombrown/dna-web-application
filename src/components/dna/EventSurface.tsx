// Brief 10, Convene Pass 2 (Attend): the member's event page (B10-SPEC sections 2 and 3; rulings
// 1023, 1025, 1027, 1030, 1032; handoff 30-C items 6, 7, 9 and 11).
//
// One read: `public.event_page(id)` through src/lib/event-page.ts, and nothing else for the page's
// content. Null is the not-found state. The page renders SPEC section 3 in order with the handoff's
// exceptions, each from a ruling: the invitation notice from `invitations` rows still invited (736,
// 1027); the endpoint line as the link, or the withheld line, or nothing (1025, 1032); partners
// absent until Brief 8's record (1019); Going and the list from `going`, null meaning both are
// absent (508, 645); the past block not built, so a past event renders the past when line and
// `This event has happened.` and no attestation block.
//
// Below expanded this is SPEC's medium layout at both tiers: one column at --content-max inside the
// shell's own scroller, and a Back row that names the page the member arrived from (1065, handoff
// 31-D): the origin record in history state (src/lib/origin.ts), and Discovery when there is none,
// because the page lives under Discovery's route (1047) and Discovery is Convene's front door (628).
// Arrived from that origin in this history, the row goes back, so the router restores the column and
// the lanes; otherwise it navigates to the origin's route and search. At expanded the page is the
// content of Brief 9's Pane on Discovery (1047, handoff 31-B) and scrolls in the pane's body. The
// pane's own `Back to Discovery` replaces the Back row, and the column carries no --content-max cap:
// it is the pane body's width, the cover spans it edge to edge and everything else sits --space-5
// inside it on both sides (1143).
//
// Guardrail 1: no number renders. The going names arrive only at five or more rows, chosen by the
// projection; nothing here counts anything for display.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { Avatar } from "@/components/strand/Avatar";
import { BackRow } from "@/components/strand/BackRow";
import { Button } from "@/components/strand/Button";
import { EmptyState } from "@/components/strand/EmptyState";
import { Icon } from "@/components/strand/Icon";
import { MediaBlock } from "@/components/strand/MediaBlock";
import { NotificationListItem } from "@/components/strand/NotificationListItem";
import { Toast } from "@/components/strand/Toast";
import type { Member } from "@/lib/auth";
import {
  downloadIcs,
  eventShareUrl,
  isFollowing,
  loadEventPage,
  setFollow,
  type EventInvitation,
  type EventPage,
  type RegistrationStatus,
} from "@/lib/event-page";
import { deliverImageUrl } from "@/lib/media";
import { useBackToOrigin } from "@/lib/origin";
import { useTier } from "@/lib/tier";
import { browserZone } from "@/lib/when";
import {
  CapsLabel,
  EventBody,
  EventTitle,
  FactRow,
  Facts,
  Kicker,
  PresentedBy,
  QUIET,
  SpeakersRow,
  placeWord,
  whenLines,
} from "./EventParts";
import { EventShareSheet } from "./EventShareSheet";
import { toastStyle } from "./FeedSurface";
import { RoleInvitationSheet } from "./RoleInvitationSheet";
import { RsvpSheet } from "./RsvpSheet";

export const EVENT_PAGE_KEY = "event-page";

/** The quiet line a cancelled page ends on: the card's own sentence (src/lib/feed.ts), not a new one. */
const CANCELLED_SURVIVES = "If you had said you were going, you were told by email.";

/**
 * 1143: the cover in Discovery's Pane. It runs back out through the frame's --space-5 sides to the
 * pane body's edges, and it is squared: the pane's rounded corners hold the toolbar row above the
 * body, so the cover's edges meet only straight ones, the bar's hairline above and the pane's
 * border at each side. Its own side borders go, so no side reads as a doubled rule; the top and
 * bottom hairlines stay against the surface.
 */
const PANE_COVER: CSSProperties = {
  marginInline: "calc(-1 * var(--space-5))",
  borderRadius: 0,
  borderLeft: "none",
  borderRight: "none",
};

type Images = { cover?: string | undefined; avatars: Record<string, string> };

async function resolveImages(page: EventPage): Promise<Images> {
  const avatars: Record<string, string> = {};
  const people = [
    ...(page.host ? [page.host] : []),
    ...(page.presented_by?.kind === "member" ? [page.presented_by] : []),
    ...page.speakers.map((s) => ({ id: s.member_id, avatar_path: s.avatar_path })),
    ...(page.going ?? []).map((g) => ({ id: g.member_id, avatar_path: g.avatar_path })),
  ];
  for (const p of people) {
    if (!p.avatar_path || avatars[p.id]) continue;
    const url = await deliverImageUrl("profile-media", p.avatar_path, {
      width: 80,
      height: 80,
      resize: "cover",
    });
    if (url) avatars[p.id] = url;
  }
  const first = page.event.cancelled ? undefined : page.media[0];
  const cover = first
    ? await deliverImageUrl("post-media", first.storage_path, { width: 1440, quality: 80 })
    : undefined;
  return { cover, avatars };
}

export function EventSurface({
  member,
  id,
  inPane,
}: {
  member: Member;
  id: string;
  /**
   * Handoff 31-B item 12: rendered as the content of Discovery's Pane at expanded (688, 1047), where
   * the pane's own close control (`Back to Discovery`, 700) is the way back, so the page's Back row
   * is omitted. The pane body is unpadded, so the page also carries its own inset there (1143):
   * the cover edge to edge, everything else --space-5 in from each side, and no --content-max cap,
   * since the pane is the bound. Nothing else about the page changes inside the pane.
   */
  inPane?: boolean | undefined;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const tier = useTier();
  const compact = tier === "compact";
  const [toast, setToast] = useState<string | null>(null);
  const [rsvp, setRsvp] = useState<{ open: boolean; initial: RegistrationStatus }>({
    open: false,
    initial: "going",
  });
  const [share, setShare] = useState(false);
  const [invitation, setInvitation] = useState<EventInvitation | null>(null);

  const pageQ = useQuery({
    queryKey: [EVENT_PAGE_KEY, member.id, id],
    queryFn: () => loadEventPage(id),
  });
  const page = pageQ.data ?? null;
  const hostId = page?.host?.id ?? null;
  const images = useQuery({
    queryKey: [EVENT_PAGE_KEY, "images", member.id, id, page?.event.status ?? ""],
    queryFn: () => resolveImages(page as EventPage),
    enabled: !!page,
    staleTime: 30 * 60_000,
  });
  const following = useQuery({
    queryKey: ["event-follow", member.id, hostId ?? ""],
    queryFn: () => isFollowing(member.id, hostId ?? ""),
    enabled: !!hostId && hostId !== member.id,
  });
  const follow = useMutation({
    mutationFn: (on: boolean) => setFollow(hostId ?? "", on),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["event-follow", member.id] }),
  });

  const say = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };
  const reread = () => qc.invalidateQueries({ queryKey: [EVENT_PAGE_KEY, member.id, id] });
  const { origin: back, go: goBack } = useBackToOrigin();

  const frame = (state: string, children: React.ReactNode) => (
    <div
      data-event-page={id}
      data-event-state={state}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        // 1143: in the pane the pane is the bound (520, or 720 with the list hidden), so the cover
        // can reach its edges; the standalone page keeps --content-max.
        maxWidth: inPane ? "none" : "var(--content-max)",
        margin: "0 auto",
        boxSizing: "border-box",
        // G78: inside Discovery's Pane the close control no longer floats over the page. Correction
        // 28 gives the pane a top row of its own, the toolbar and the cluster, above the body this
        // page scrolls in, so the page keeps its own top and bottom and reserves nothing (1134).
        // The pane body is unpadded, so in the pane the page carries its own sides, --space-5, and
        // every state inherits them; the cover alone runs back out to the pane's edges (1143).
        padding: compact ? "8px 0 130px" : inPane ? "16px var(--space-5) 96px" : "16px 0 96px",
      }}
    >
      {!inPane && <BackRow label={back.label} onClick={goBack} />}
      {children}
      {toast && (
        <div style={toastStyle(tier)}>
          <Toast>{toast}</Toast>
        </div>
      )}
    </div>
  );

  if (pageQ.isPending)
    return frame(
      "loading",
      <p role="status" style={{ margin: "8px 4px", color: "var(--ink-3)", fontSize: 15 }}>
        Loading
      </p>,
    );
  if (pageQ.isError)
    return frame(
      "error",
      <EmptyState
        c="convene"
        title="This event did not load."
        body="Check your connection and try again."
        action={
          <Button variant="secondary" onClick={() => void pageQ.refetch()}>
            Try again
          </Button>
        }
      />,
    );
  if (!page)
    return frame(
      "not-found",
      <EmptyState
        c="convene"
        title="This event is not available."
        body="It may have been removed, or it is not one you can see."
        action={
          <Button variant="secondary" onClick={goBack}>
            {"Back to " + back.label}
          </Button>
        }
      />,
    );

  const ev = page.event;
  const presenterName = page.presented_by?.name ?? page.host?.name ?? null;
  const presenterAvatar =
    page.presented_by?.kind === "member"
      ? images.data?.avatars[page.presented_by.id]
      : page.host
        ? images.data?.avatars[page.host.id]
        : undefined;
  const hostName = page.host?.name ?? "The host";
  const reg = page.viewer.registration;
  const going = reg?.status === "going";
  const viewerTz = browserZone();
  const when = whenLines(
    {
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      doors_at: ev.doors_at,
      timezone: ev.timezone,
      window_basis: ev.window_basis,
      expected_window_end: ev.expected_window_end,
      past: ev.past,
      city: page.place?.city ?? null,
    },
    viewerTz,
  );
  const where = placeWord(ev.mode, page.place);
  const invited = page.invitations.filter((i) => i.status === "invited");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = eventShareUrl(origin, ev);

  const state = ev.cancelled
    ? "cancelled"
    : ev.past
      ? "past"
      : ev.full && !going
        ? "full"
        : "loaded";

  return frame(
    state,
    <>
      {/* 1. The invitation notice (736, 1027): the member's own invited rows, and nothing else's. */}
      {!ev.cancelled &&
        invited.map((inv) => (
          <div
            key={inv.party_id}
            data-event-invitation={inv.party_id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <NotificationListItem
              kind="role_invitation"
              actor={hostName}
              detail={inv.verb}
              unread
              onClick={() => setInvitation(inv)}
              onRespond={() => setInvitation(inv)}
            />
          </div>
        ))}

      {/* 2. Cover: absent when cancelled. In the pane it spans the pane body edge to edge (1143). */}
      {!ev.cancelled && images.data?.cover && (
        <MediaBlock
          // Keyed on the place, so a page that settles into the pane after its first render mounts
          // a fresh frame rather than patching MediaBlock's `border` shorthand with side longhands.
          key={inPane ? "pane" : "page"}
          kind="image"
          src={images.data.cover}
          alt=""
          style={inPane ? PANE_COVER : undefined}
        />
      )}

      {/* 3. Kicker and title. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Kicker cancelled={ev.cancelled} />
        <EventTitle title={ev.title} cancelled={ev.cancelled} compact={compact} />
      </div>

      {/* 4. Presented by, with Follow for a member who is not the host. */}
      <PresentedBy
        presenter={presenterName}
        host={page.host?.name ?? null}
        avatarSrc={presenterAvatar}
        action={
          hostId && hostId !== member.id ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={follow.isPending || following.isPending}
              onClick={() => follow.mutate(!following.data)}
              data-testid="event-follow"
              aria-pressed={!!following.data}
            >
              {following.data ? "Following" : "Follow"}
            </Button>
          ) : undefined
        }
      />

      {/* 5. Cancelled stops here: the host's reason as body, then one quiet line on what survives. */}
      {ev.cancelled ? (
        <>
          {ev.cancelled_reason && <EventBody>{ev.cancelled_reason}</EventBody>}
          <p data-event-cancelled-line style={{ margin: 0, ...QUIET, fontSize: 15 }}>
            {CANCELLED_SURVIVES}
          </p>
        </>
      ) : (
        <>
          {/* 6. Facts. */}
          <Facts>
            {when.main && (
              <FactRow icon="calendar" main={when.main} sub={when.sub || undefined} testId="when" />
            )}
            {where && (
              <FactRow
                icon="map-pin"
                main={where}
                sub={ev.timezone ? "Times at the place are in " + ev.timezone : undefined}
                testId="where"
              />
            )}
            {(ev.delivery_intent.trim() || page.meeting_url || page.door_withheld) && (
              <FactRow
                icon="info"
                main={ev.delivery_intent.trim() || "How to get in"}
                sub={
                  page.meeting_url ? (
                    <a
                      href={page.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      data-event-door
                      style={{
                        color: "var(--c-convene-text)",
                        textDecoration: "underline",
                        textDecorationColor: "var(--line-strong)",
                        textUnderlineOffset: 2,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {page.meeting_url}
                    </a>
                  ) : page.door_withheld ? (
                    <span data-event-door-withheld>
                      The exact door goes to you once you say you are going.
                    </span>
                  ) : undefined
                }
                testId="intent"
              />
            )}
          </Facts>

          {/* 7. RSVP. */}
          <div
            data-event-rsvp
            data-rsvp-state={
              ev.past ? "past" : going ? "going" : reg ? "not-going" : ev.full ? "full" : "open"
            }
          >
            {ev.past ? (
              <p style={{ margin: 0, fontSize: 15, color: "var(--ink-2)" }}>
                This event has happened.
              </p>
            ) : going ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span
                  data-rsvp-pill
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 44,
                    padding: "0 16px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--c-convene-tint)",
                    color: "var(--c-convene-text)",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  <Icon name="check" size={18} />
                  You are going
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRsvp({ open: true, initial: "going" })}
                  data-testid="rsvp-change"
                >
                  Change
                </Button>
              </div>
            ) : reg ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, color: "var(--ink-2)" }}>You said not going.</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRsvp({ open: true, initial: "not_going" })}
                  data-testid="rsvp-change"
                >
                  Change
                </Button>
              </div>
            ) : ev.full ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 17, fontWeight: 500 }}>This event is full</span>
                <span style={{ fontSize: 15, color: "var(--ink-2)" }}>
                  The host has no more room.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    c="convene"
                    onClick={() => setRsvp({ open: true, initial: "going" })}
                    data-testid="rsvp-going"
                  >
                    I am going
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setRsvp({ open: true, initial: "not_going" })}
                    data-testid="rsvp-not-going"
                  >
                    Not going
                  </Button>
                </div>
                {ev.ticket_kind === "free" && <span style={QUIET}>Free.</span>}
              </div>
            )}
          </div>

          {/* 8. Body. */}
          {page.post && <EventBody>{page.post.body}</EventBody>}

          {/* 9. Speakers, accepted only (678). 10. Partners: absent under 1019. */}
          <SpeakersRow
            speakers={page.speakers.map((s) => ({
              key: s.party_id,
              name: s.name,
              label: s.label,
              avatarSrc: images.data?.avatars[s.member_id],
            }))}
          />

          {/* 11 and 12. Going and who is going, only when the projection returned rows (508, 645). */}
          {page.going && page.going.length > 0 && (
            <>
              <div data-event-going style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <CapsLabel>{ev.past ? "Went" : "Going"}</CapsLabel>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>
                  {page.going
                    .slice(0, 3)
                    .map((g) => g.name)
                    .join(", ")}
                  {ev.past ? " were there, and others" : " are going, and others"}
                </p>
              </div>
              <div
                data-event-going-list
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <CapsLabel>{ev.past ? "Who was there" : "Who is going"}</CapsLabel>
                <p style={{ margin: 0, ...QUIET }}>
                  Names appear only as each member chose to be seen.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {page.going.map((g) => (
                    <div
                      key={g.member_id}
                      data-going-row={
                        g.you ? "you" : g.connection ? "connection" : g.shared ? "shared" : "member"
                      }
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Avatar name={g.name} src={images.data?.avatars[g.member_id]} size={32} />
                      <span style={{ fontSize: 15, minWidth: 0, flex: 1 }}>
                        {g.name}
                        {g.you && <span style={{ color: "var(--ink-3)" }}>, you</span>}
                      </span>
                      {g.connection && (
                        <span
                          style={{ fontSize: 13, fontWeight: 500, color: "var(--c-connect-text)" }}
                        >
                          Connection
                        </span>
                      )}
                      {g.shared && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--c-collaborate-text)",
                          }}
                        >
                          Shared
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 13. Share and add to calendar. */}
          <div
            data-event-share-row
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              paddingTop: 16,
              borderTop: "1px solid var(--line)",
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShare(true)}
              data-testid="event-share"
            >
              Share
            </Button>
            {going && page.calendar.starts_at ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!downloadIcs(page.calendar, ev.slug))
                    say("The calendar file could not be made.");
                }}
                data-testid="event-calendar"
              >
                Add to calendar
              </Button>
            ) : !ev.past && !going ? (
              <span style={QUIET}>Add to calendar appears once you are going.</span>
            ) : null}
          </div>
        </>
      )}

      <RsvpSheet
        open={rsvp.open}
        onClose={() => setRsvp((r) => ({ ...r, open: false }))}
        page={page}
        compact={compact}
        initial={rsvp.initial}
        onSaved={(text) => {
          setRsvp((r) => ({ ...r, open: false }));
          say(text);
          void reread();
        }}
      />
      <EventShareSheet
        open={share}
        onClose={() => setShare(false)}
        title={ev.title}
        url={shareUrl}
        isPublic={ev.public}
        compact={compact}
        onToast={say}
      />
      <RoleInvitationSheet
        open={!!invitation}
        onClose={() => setInvitation(null)}
        invitation={invitation}
        eventTitle={ev.title}
        hostName={hostName}
        whenLine={when.main}
        placeLine={where}
        compact={compact}
        onAnswered={() => {
          setInvitation(null);
          void reread();
          void qc.invalidateQueries({ queryKey: ["notifications", member.id] });
          void qc.invalidateQueries({ queryKey: ["unread", member.id] });
        }}
      />
    </>,
  );
}
