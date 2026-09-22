# Brief 10 extraction for Chat (129): Convene Pass 2, the rest of Attend

## Revision 3, 15 September 2026

Strand correction 15 ratified under 749, bundle `v1789537371639386` (41 exports), re-synced into `_ds/`; B1 proven on every preset with no console errors. One item, closing the frame held under 748.

| Item | Ruling | Change |
|---|---|---|
| Invitation notice | 736 | The page-row stand-in is removed. The notice is Strand's `NotificationListItem` with `kind="role_invitation"`, the caller's sentence verbatim as `text` (`Kwame Mensah invited you to moderate this event.`), `unread`, and `onRespond` opening the accept-or-decline Sheet. Strand resolves the kind to Convene's badge and renders the one Respond act. After accept (752) the row stays a Convene-badged `NotificationListItem` with the caller's sentence `You accepted. You are listed as moderator.` and no act; no Space kind is reused. Strand's `role_invitation` renders its Respond act unconditionally, so the accepted row hides that act by style until Strand's next batch adds `role_accepted` or lets an absent `onRespond` drop the act. After decline nothing renders. |

Also applied from this compile: the strip beside the pane renders per axis with icons (725) and the pane's list cards take `--lane-card-width` (731); Brief 9's Revision 3 carries those rulings. The row moves to Approved, waiting for Code, no held frames.

## Revision 2, 15 September 2026

## Revision 2, 15 September 2026

**Approved under 62 (748), rulings 735 to 747.** Bound to Brief 10 Revision 3. Three cleanups applied on Strand `v1789527305280371`; nothing else in the prototype changed.

| Item | Ruling | Change |
|---|---|---|
| Medium | 735 | One column at `--content-max`, the Back row, no rail. The frame already drew this; the conflict is closed and the frame's note now cites 735 instead of flagging 86. |
| Third scope | 739 | `Only the host` is replaced by `People I share a Space or event with`, line `Members who hold a Space role with you or attended an attested event with you.` The policy in the data file gains the `shared` scope (a Space role or an attested event in common); the attendee list marks such a row `Shared` in Collaborate's text colour beside `Connection`. Sefa Owusu's fixture row moves to this scope and now renders to the viewer. |
| Past kicker | 746 | Stays `Event`; `Event, happened` is removed. The when line still reads as happened and Going still reads `Went`. |

Confirmed as drawn: the invitation notice as a page row until Strand's role-invitation kind lands (736, one frame held); a pending party as nothing on the signed-in page (737); the pane's reading width at 760 (738); endpoint lines, capacity wording, calendar, attestation copy, the Connect act, guest copy and the public footer (740 to 745, 747). The row moves to Approved, waiting for Code, one frame held for 736.

## Revision 1, 15 September 2026

**15 September 2026.** Prototype `convene/B10-Attend-v1.dc.html` with `convene/b10-attend-data.js` (the event as Pass 1's object, registration rows under 680, named parties under 678, the attestation record) and `convene/b9-discover-data.js` (the lanes beside the pane). Spec `convene/B10-SPEC.md`. Brief 10 Revision 2, released under 733. Bound to Strand compile `v1789527305280371`; no local variant of any part (578). Three labelled frames at 390, 820 and 1280 (583), both projections, both themes, touch below expanded and pointer at expanded. Nothing decided live is canonical until ratified (129). For approval under 62.

## No number renders anywhere (guardrail 1)

Read every frame: the only digits are dates, times and the street in the door line. Going is names then `and others`; the floor is internal; at capacity is `This event is full` and `The host has no more room` (ruling owed 2, default taken).

## Mapped to rulings

| Item | Ruling |
|---|---|
| The event page is a Pane: its own route with a Back row naming Discovery below 1024; Strand's Pane on 612's canvas at 1280 with the FacetRail collapsed, the lanes mounted as the pane's list, no right rail, DIA absent; close is `Back to Discovery` on the pane's control and on Escape | 561, 612, 688, 700, 719, 728 |
| Cold arrival drawn twice: from the list, and on the URL with the default corpus and the arrived-at card marked | 607 |
| Every column at expanded scrolls on its own | 732 |
| Page content and order: cover and title, presented by, when and place or format word, delivery intent, RSVP, body, speakers, partners, Going, attendee list, share and add-to-calendar, then the past block | Layout, 674, 520, 676, 579, 630 |
| The delivery endpoint renders only for a member or guest with an RSVP; the public page carries the intent without it | 676, surface 7 |
| Nine page states: loaded, loading and error against a live list, empty (the pane's own), cancelled as a full treatment (kicker `Event cancelled`, title struck, reason as the body, no media, no RSVP, no rows), past, at capacity in words | 643, 623 |
| The public projection is its own state: no shell, wordmark and footer line, one column at `--content-max`; title, when, place or format word, presenter, body, media, intent without the endpoint, accepted speakers and partners, the RSVP affordance into the guest path; never an attendee's name under any scope, never a count; an unaccepted party is the role alone | 662, 678, 680, 487's shape |
| RSVP is a Sheet holding one decision, the page live beneath; one attendance row; the first RSVP offers the visibility choice once with connections preselected and the three scopes in the member's words; later RSVPs show the default with a one-line override | 561, 584, 518, 532, 680 |
| RSVP states: not yet responded, going, not going, changing, withdrawing, submitting, error, at capacity, closed because past or cancelled, signed out into the guest path | surface 3 |
| Virtual events RSVP the same way; nothing streams | 624 |
| Guest path: one field, magic link by email, return, existing RSVP, conversion offered and declinable, expired link; the guest's name is the host's alone; no install invitation | 653, 571, 572, 626 |
| Going and the attendee list read the rows the policy returns; three names then `and others` at five or more, absent below; drawn on both sides of the floor | 680, 508, 645 |
| Speakers row on the card and on the page: image and name, scrollable, accepted only, absent below one; a pending invitation is nothing on the card and the role alone on the public page; partners as a fact row | 678, 679, 630, 69 |
| The named party's invitation notice and accept-or-decline sheet drawn; the accepted state on the profile is Brief 7's | surface 6 |
| Share opens with the public URL and the page-link code; the code is a distinct object from the admit token and is never drawn to resemble it | 679, 88 |
| Add-to-calendar after RSVP, one file from the calendar-ready set, the endpoint only with an RSVP | Pass 1 `calendar`, ruling owed 1 default |
| Attestation is a Sheet opened from `Were you there · Say so`; seven states; nothing is minted until the host accepts; the unaccepted state is drawn as plainly as the accepted | 647, 511, 582 |
| The outbound edge: after acceptance, one Connect act carrying the shared event; Connect's surface is not drawn | 512 |
| Every part is Strand's: Pane, Sheet, Segment, Input, Button, IconButton, Chip, Avatar, CBadge, MediaBlock, Icon, EmptyState, Toast, FacetRail collapsed; the chassis PostCard, AppHeader and PulseDock from the staged patches | 578 |

## Doctrine conflicts flagged (578), not applied locally

1. **Medium's "shell's left rail".** The Layout section puts the event page beside the shell's left rail at 640 to 1024; 86 renders rails only above 1024, and Brief 9 draws medium with the FacetRail as the left column, which this page does not carry. Drawn as one column at `--content-max` with the Back row and no rail. Needs a ruling on what, if anything, sits left of the page at medium.
2. **The invitation notice has no Strand kind.** `NotificationListItem` carries a closed set (connection accepted, attestation received, Space role approved, event reminder); a role invitation is not in it. Drawn as a framed row at the top of the page with the Convene badge and one Respond act. Needs the kind added in Strand, or a ruling that the notice is a page row.
3. **A pending party on the signed-in page.** The brief rules the card (nothing) and the public page (the role alone) and is silent on the signed-in page. Drawn as nothing, matching the card. Confirm, or rule the role alone on both pages.
4. **The page-link code is drawn as a labelled square with the link icon**, not a rendered code. Code generates it from the URL at runtime; the frame proves its place, its label and its distance from anything admit-like.
5. **The pane's content width.** The page inside the pane is capped at 760 with the cover full width; Brief 9 fixed the pane's geometry and not its reading width. Confirm.

## New, in the founder's wording, for a ruling

1. **The three scopes** read `Anyone on DNA`, `My connections`, `Only the host`, with one line each (`Members who open this event can see you are going.` · `Only members you are connected to can see you are going.` · `Nobody but the host sees your name.`). Ruled 739: the third reads `People I share a Space or event with`; see Revision 2.
2. **The endpoint lines.** Before an RSVP: `The exact door goes to you once you say you are going.` Public: `The exact door goes to people who are going.` Confirm.
3. **At capacity** (ruling owed 2, default): `This event is full` on the page and the sheet, `The host has no more room.` beneath. Confirm the wording.
4. **Add-to-calendar** (ruling owed 1, default): one .ics from the calendar-ready set; provider links are Code's. The button reads `Add to calendar` and appears once going.
5. **Speakers row on the compact card** (ruling owed 3, default): drawn on the card at every tier, scrollable. Folded into P1-EXTRACTION as a Revision 3 line, not a reopening.
6. **Attestation copy.** Block: `Were you there`, `Say so in your own words. The host accepts it before anything is recorded.`; act `Say so`; submitted `Sent to Kwame Mensah. Nothing is recorded until the host accepts.`; accepted `Kwame Mensah accepted. This supper is now a shared attested event between you, and DNA can show you more that touches it.`; declined `Kwame Mensah did not accept this attestation. Nothing was recorded, and nothing here changed.`; expired `The time to say so has passed. Nothing was recorded.`; did not attend `You were not at this event, so there is nothing to attest.` Confirm.
7. **The Connect act** reads `Connect with Kwame, carrying this event` in Connect's colour (rule 3). Confirm.
8. **Guest copy.** `One email address, so the door and the reminder can reach you. Nothing else is asked.` · `Your name is never shown to anyone but the host.` · `Check your email` · `Keep this with an account?` · `Continue as a guest` · `Create an account` · `This link has expired`. Confirm.
9. **The past kicker** reads `Event, happened` and Going reads `Went` with `Who was there`. Confirm.
10. **The public footer line**: `DNA, the Diaspora Network of Africa. Members host and attend across five Cs. Sign in`. Confirm.

## Tokens (604)

No state needed a token Strand does not have. The public column is `--content-max`; the pane list is `--pane-list-width`; sheets take 584's geometry from Strand. Not a stop.

## Done Means, read against the frames

1 nine page states, both projections, three tiers, both themes, cold arrival twice; 2 the public frames beside the signed-in frames carry no name and no count, pending parties as roles; 3 RSVP in ten states, the choice once and the override after; 4 guest path in eight states, one field; 5 Going and the list above and below the floor; 6 speakers on card and page, partners row, notice and sheet; 7 share with URL and code, calendar after RSVP; 8 attestation in seven states, the Connect entry; 9 this document and `B10-SPEC.md`.

## Not drawn

The Discovery Dashboard beyond the lanes the pane needs (Brief 9). The Hub and the host's invitation surfaces (Brief 8). Tickets, checkout, admit, cancel and refunds (Pass 4). Connect's request surface. The accepted role on a profile (Brief 7). Notification transports beyond email. The Open Graph preview itself (server-rendered; its fields are named in the spec).
