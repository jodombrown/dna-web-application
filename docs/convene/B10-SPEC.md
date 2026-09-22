# Brief 10 SPEC: Convene Pass 2, the rest of Attend

**15 September 2026. Convene Pass 2 under 622, released under 733. Ships with the pass (495).** Prototype `convene/B10-Attend-v1.dc.html` with `convene/b10-attend-data.js`; the lanes beside the pane come from `convene/b9-discover-data.js`. Brief: `uploads/BRIEF-10-CONVENE-PASS-2-ATTEND.md` Revision 3. Strand compile `v1789527305280371`. The event is Pass 1's object (`convene/P1-SPEC.md` section 4); the card is Pass 1's (677). Rulings 508, 511, 512, 520, 561, 571, 572, 579, 582, 584, 607, 612, 623, 624, 626, 645, 647, 650, 653, 660, 662, 674, 676, 678, 679, 680, 685, 688, 700, 719, 728, 732 govern. Status: approved under 62 (748), rulings 735 to 747; `B10-EXTRACTION.md` Revision 3 on Strand `v1789619870985180` (correction 15). No held frames.

## 1. Routes and projections

Member: `/convene/events/{id}`. Public: `/e/{slug}`, signed out, its own render (662). Open Graph on the public URL: cover, title, when, place or format word, presenter. Facets and lens state of the dashboard survive the pane at expanded (the pane is a layer on Brief 9's route).

## 2. Layout

**Expanded (over 1024).** Brief 9's canvas with the pane open: grid `64px minmax(0,1fr)`, the FacetRail in `mode="collapsed"` (expand reads `Back to Discovery and show browse`), Strand's `Pane` `tier="expanded"` with the lanes as `list` (cards at 320, the arrived-at card outlined in Convene and `data-arrived` on cold arrival), `onClose` and `closeLabel` `Back to Discovery`, `backLabel` `Discovery`. The pane grid is pinned to the column height (`gridTemplateRows: minmax(0,1fr)`) so the list and the body scroll on their own (732). Page body padding 56 24 48, max 760. `loading`, `error` and `empty` are the Pane's own props; the empty body is Strand's `EmptyState` (`Open an event to read it here.` · `The lanes stay where they are.`). Sheets open over the pane at 584's expanded geometry.

**Medium (640 to 1024).** One column at `--content-max`, padding 16 32 96, Back row (arrow-left `IconButton` labelled `Back to Discovery` and the word `Discovery`), then the page. No FacetRail, no rail (735). Sheets side-anchored at 584.

**Compact (under 640).** One column, padding 8 16 130, the shell's header and dock inherited, Back row, the page in the order below. Sheets are bottom sheets at 80 percent.

**Public, every tier.** No shell. A top bar: wordmark (`assets/logo.png` at 24) left, `Sign in` secondary small right, hairline beneath. One column at `--content-max`, padding 16 at compact and 32 above. Footer line centred, sans 13 `--ink-3`: `DNA, the Diaspora Network of Africa. Members host and attend across five Cs. Sign in`.

## 3. The page, in order

1. Invitation notice (named party only, 736): Strand's `NotificationListItem` `kind="role_invitation"`, `text` `Kwame Mensah invited you to moderate this event.`, `unread`, `onRespond` opening the invitation Sheet; in a surface card at 14 radius. After accept (752) the row keeps the Convene badge with `text` `You accepted. You are listed as moderator.` and no act (the kind's Respond hidden until Strand adds `role_accepted`); after decline nothing renders.
2. Cover: `MediaBlock` image. Absent when cancelled.
3. Kicker caps 13 in `--c-convene-text`: `Event` at rest and past (746); cancelled `Event cancelled` in `--ink-3`. Title display 32 (26 compact); struck and `--ink-3` when cancelled.
4. Presented by: `Avatar` 40, `Presented by {presented_by}` 15/700, `Hosted by {host}` 13 `--ink-3`; `Follow` secondary sm at right (member only).
5. Cancelled stops here: the host's reason as body 17, then one quiet line on what survives.
6. Facts, hairlines above and below, rows of icon 18 + main 15 + sub 13: calendar (when; sub `Doors 18:30, the time at the place`; past reads `Happened Thu 15 Oct, ended 22:10 GMT`), map-pin (place or format word; sub the time zone line), info (delivery intent; sub the endpoint when the viewer has an RSVP, else `The exact door goes to you once you say you are going.`, public `The exact door goes to people who are going.`).
7. RSVP: not yet responded, `I am going` (Convene) and `Not going` (secondary) with `Free.`; going, a Convene-tint pill `You are going` with check and `Change`; not going, `You said not going.` and `Change`; past, `This event has happened.`; at capacity, `This event is full` 17/500 over `The host has no more room.`; public, `I am going` into the guest path with `Free. You will be asked for an email so the door can reach you.`; public with a guest RSVP, `You are going.` and `Change`.
8. Body 17, pre-wrap.
9. Speakers: caps label, horizontal scroll of pills (`Avatar` 32, name 15/500, role 13); accepted only; public adds unaccepted roles as a dashed empty avatar with the role and `to be confirmed`. Absent below one.
10. Partners: caps label, rows of briefcase 16 + `{name}, {role}`; the sponsor adds `, chosen by the host`.
11. Going (member, at five or more visible): caps `Going` (`Went` past), `{three names} are going, and others`.
12. Who is going (same condition): caps, the line `Names appear only as each member chose to be seen.`, rows of `Avatar` 32 + name, `, you` for the viewer, `Connection` in `--c-connect-text` where connected, `Shared` in `--c-collaborate-text` where a Space role or an attested event is shared (739).
13. Share row, hairline above: `Share` secondary sm; `Add to calendar` secondary sm once going (member) or with a guest RSVP; else the quiet line `Add to calendar appears once you are going.`
14. Past block (member): surface card 14 radius: `Were you there` 17/500 and the state's line; `Say so` (Convene sm) when available or written (`Draft saved` beneath); `Waiting for the host` when submitted; the Connect act when accepted.

## 4. Sheets (Strand `Sheet`, `contained`, tier per frame)

**RSVP.** Title `Are you going?` (`Change your answer` when changing). `Segment` `Going` | `Not going`. Going and first RSVP: caps `Who can see you are going`, `Segment` of the three scopes (`Anyone on DNA`, `My connections`, `People I share a Space or event with`, 739) with connections preselected, the scope's line plus `You choose this once; it becomes your default and you can change it on any event.` Later: `Visible to your connections.` and `Change for this event`, which reveals the Segment. Not going: `Only the host sees a not going.` Footer: `Not yet` and `Confirm`; changing swaps `Not yet` for `Withdraw` (danger), which shows an inline confirm (`Withdraw your answer?`, `Keep it`, `Withdraw`). Submitting: Sheet `loading`, the button reads `Saving`. Error: Sheet `error` `Could not save your answer. Check your connection and try again.` At capacity: `This event is full` and one line, footer `Close`. Past or cancelled: one line, footer `Close`. Toasts: `You are going. The door is on the page and in your email.` · `Saved. You are not going.` · `Withdrawn. Your name is off the list.`

**Guest.** Email: `I am going`, one `Input` type email, `Send me a link`. Sent: `Check your email`, the address, `it signs you in for this event only`, `Done`. Returned: `You are going`, `Continue`. Conversion: `Keep this with an account?`, `Continue as a guest` | `Create an account`. Existing: `You already said you are going`, `Keep it` | `Withdraw` (danger). Expired: `This link has expired`, the email field, `Send a new link`.

**Share.** `Share this event`: one quiet line, the URL in a sunken row with `Copy`, the page-link code as a 120 square with the link icon labelled `Page link, as a code` and `Scans to the public page. It is not a ticket and admits nobody.`, then `Share via` (Convene). `Done`.

**Attestation.** `Were you there`: one body line naming the host's acceptance, a multiline `Input` `What you took from it`, `An unaccepted attestation creates nothing.`; footer `Keep the draft` | `Send to the host` (disabled until written). Submitting and error through the Sheet.

**Invitation.** `Moderate Corridor Suppers: Accra?`: one body line, the when and place rows, `Your profile lists the role once you accept (Brief 7).`; footer `Decline` | `Accept`.

## 5. Data and policy

Registration rows carry `scope` (everyone | connections | shared, 739); the server returns the rows the viewer may see and the client never filters (680). The floor is internal (`FLOOR` in the data file, five). The public projection receives no rows. Speakers and partners carry `state`; only `accepted` renders a name (678).

## 6. Tokens (604)

Every colour, radius, duration, easing and z-index is a Strand token. `--content-max`, `--pane-list-width`, `--pane-gap`, the sheet geometry and the z scale are read from Strand. No state needed a token Strand does not have.

## 7. Exit check

Deployed against the prototype at 360, 390, 430, 744, 820, 1024 both orientations, 1280 and 1536, both themes, Safari and Chrome, signed in and signed out. No digit outside a date, a time or the door line. The public page has no element carrying an attendee's name in any state. `dialog` for RSVP carries two `radiogroup`s on a first RSVP and one thereafter. The pane's close is reachable by pointer and by Escape with focus inside. Each column at 1280 scrolls independently. The cancelled page has no `img`, no RSVP control and no Going row.
