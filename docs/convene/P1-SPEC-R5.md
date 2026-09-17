**Line count: 110. Convene Pass 1 SPEC Revision 5, 16 September 2026. Changed since Revision 4: storage rewritten under 799 (`event_delivery.country` always holds the chosen country, `place_text` the words alone, no new column) and the read composed at render; country order under 796 and 797 (`world_countries`, stated country first, then `position`, never selected); place copy under 798 (`A venue or an area`, `No place found for that. Searched: {country}. It is kept as you wrote it.`); the resolved row under 784 (a venue replaces the words, an area sits beside them) and `Change` under 785 (editing, never a re-resolve); the unavailable hint under 781; the event object note and three exit checks. Nothing else changed. Also the repo copy for Code.**

# Convene Pass 1 SPEC: compose and card

**Revision 5, 16 September 2026. Rulings 781, 784, 785, 796 to 802 applied to the place section, the event object note and the exit check. EXTRACTION Revision 5 is ratified (802). Revision 4 stands as its own file and is superseded by this one.** Evidence from the deployed build: the place lookup anchored to the member's stated country, so a member in California hosting in Accra typed `Labadi beach` and the lookup resolved it to a place in West Palm Beach with a GMT-4 zone (783). The member now says where they are looking. Section 3, "Place, resolved never typed", is replaced by the paragraph marked Revision 5; the event object table gains one note and no column. No other Convene surface changes. Prototype: `convene/P1-Compose-and-Card-v1.dc.html` with `convene/p1-convene-form.js` and the runtime stand-in `convene/p1-world-countries.js`.

**Revision 2, 15 September 2026. Ships with the pass under 495. Whole: step 3 drawn on Strand's corrected Composer (664 to 670).** Prototype `convene/P1-Compose-and-Card-v1.dc.html` with `convene/p1-convene-form.js` (the form Convene supplies, prototype lookup and parse). Brief: `uploads/CONVENE-PASS-1-COMPOSE-AND-CARD.md` Revision 1 with Brief 6 Revision 4 sections 4A and 5A and `uploads/CONVENE-CANON.md`. Rulings 634, 635, 636, 664 to 670 govern. Nothing from Pass A is carried (628). Status: approved under 62 (ruling 677). Revision 3, 15 September, on Strand compile `v1789514836887586` (681): the preview frame and the disabled-chip touch frame redrawn (671, 672); Format and Tickets rebound to Strand's `Segment` (673). Revision 2a removed the end-time default variant (634).

Base: the composer as rebound under 636 (`composer/B1-Composer-v3.dc.html`, `composer/SPEC.md`) and the Feed card as built (`shell/B2-Shell-Feed-v3.dc.html`, ruling 69 with 105's expanded state). This is a divergence list; everything not named is as built.

## 1. The composer's Convene mode: steps 1 and 2 (drawn)

**Container.** Strand `Composer` on Strand `Sheet`, `tier` from the host, `size="composer"`: 80 percent bottom sheet at compact, side-anchored at `--sheet-composer-ratio` at medium, centred panel at expanded (584, 611, 636). Entry: the Feed's compose card or the Host an Event chip on it, and the header's compose field.

**Step 1, free text.** The same plain field every verb uses. Drawn with no chip and with Host an Event pre-selected from the entry chip. Nothing about the field changes for Convene. With a chip chosen by hand, DIA is quiet for the rest of the compose (53).

**Step 2, DIA has read.** One `DiaLine`: `DIA read this as an Event.` with `Not this?`. The verb is proposed from words alone and never selected (635, 667): the `DiaLine` carries the proposal, the Convene form mounts with DIA's fills tagged, and no chip carries `aria-checked=true`. Publish stays off while the proposal stands alone (668); the member accepts by tapping Host an Event, which keeps DIA's fills (668), or overrides with another chip, or clears with `Not this?`. Fields DIA filled carry the caps `DIA` tag until touched; a touched field is the author's permanently. DIA fills the title, when as the member's own words, the venue name and the doors time. **It never fills the city** (Digital Trust Layer) and never the format. The host namespaces DIA's fills as `convene.{key}` before they reach the Composer (664). Drawn: proposal present; proposal present with the member typing past it (the settle runs from the last keystroke); DIA reading (one quiet line, writing never blocked); silence (no proposal, no error, no spinner, an ordinary composer).

## 2. The Convene Feed card (drawn, all states)

**Anatomy is 69's and is not reopened.** `PostCard feed`: author row (the host, member or Space), the Convene meta line in `--c-convene-text`, overflow, kicker `Event`, title, media, body clamped to four lines with Read more, divider, 88's four icon-only actions (React, Ask the host, Save, Share). No RSVP (579). No count. No resting shadow (97). The title and media are the tap into the event page. Read more expands the same card with Show less (105); the direct URL renders the expanded card as page content.

**The meta line, Convene's content:** `Presented by {presented} · {when} · {where}`.
- `when`: the date in the viewer's timezone, then the event's local time when they differ: `Thu 16 Oct, 21:00 EAT, 19:00 in Accra`. An honest window renders as words: `November, date to be confirmed` (520, 634: no end time is invented). Past: `Happened Thu 16 Oct, 19:00 GMT`.
- `where`: the venue and city for in person; `Online` for online; `{city} and online` for hybrid.

**The created-object rows (`fields`) carry Convene's remaining content.** This is 69's existing body-region slot, so nothing in the anatomy moves:
- **Social proof** (508): label `Going` (`Were there` on past events), users icon, `Adaeze Nwosu, Ngozi Eze and Thandiwe Dube are going, and others`. Up to three names, connections only under the viewer's consent scope, then `and others` when others exist. Below the floor of five, or with no connection going, the row is absent.
- **Sponsor line** (630): label `Sponsor`, `Ecobank Ghana, chosen by the host`. Only with a Relationships record. Never a logo.
- **Hub hooks** (Canon 6), **proposal against 69, drawn once, rendered in the expanded card only**: `Space` (Collaborate teal), `Story` (Convey wine), `Help wanted` (Contribute gold), each a text link in the target C's text colour (rule 3), each only when the linked object exists. Past events add `Were you there · Say so`, the entry to attestation (Pass 2).

**Cancelled, the full treatment inside the anatomy.** Kicker `Event cancelled`. Title struck in `--ink-3`. Meta line in the past tense: `Was set for Thu 16 Oct, 19:00 GMT · Front Room, Osu, Accra`. Body is the fact and the host's reason verbatim: `This event will not happen. {host} cancelled it on {date}. The host wrote: {reason}. If you had said you were going, you were told by email.` Never clamped. No media, no social proof, no sponsor, no hooks, no tap into the event page. Frame stays Convene copper (rule 2); everything else says it will not happen.

**Past.** Kicker `Event`, meta `Happened …`, social proof in the past tense, the `Say so` hook, no Help wanted.

**States drawn:** in the Feed; expanded in place; direct URL; with and without media; with and without social proof; with and without sponsor; in person, online, hybrid; date window; cancelled; past; loading (ghost cards, `role=status`); error (one card fails, `role=alert`, the Feed stays).

## 3. Step 3, the structured form (drawn, on 664 to 670)

**The contract drawn against.** `forms.convene` receives `{ fields, setField, mine, tier, diaTag, proposed, reportValidity }`; keys are un-prefixed inside the form and stored as `convene.{key}` (664). The form calls `reportValidity(boolean)` on first render and on every change; Publish is enabled only when the form has reported true and the member has tapped a chip, and a proposal alone never publishes (664, 668). `onPublish` returns a promise: in flight the fieldset is disabled and `aria-busy` with the draft visible and Publish reads `Publishing`; failure lands the caller's message in Sheet's error slot with the draft intact; on resolution the Composer closes itself through `onClose('published')` and the host navigates in that handler (665, 666). `disabledVerbs.convene` carries the reason string for the inside-an-event case (correction 7). There is no proposed chip state; the `DiaLine` carries the proposal (667). `tier` includes medium (669), so the form lays out per tier. The form is Convene's content inside the locked shell; the Composer renders it in the verb-fields position under the `Host an Event` caps label and does not read its fields.

**What the form is.** Five named sections in order (580), each a caps label in `--ink-3` over its fields, then More options. Fields that do not apply are absent, never disabled (621). Every control is Strand's: `Input`, `Select`, `Chip`, `Button`, `Icon`; the format and tickets choices are Strand's `Segment` (673); the form owns the labels and what each choice means. Above compact, paired fields sit in two columns (`minmax(0, 1fr)`).

**The invitation.** `Title` (DIA may fill; tagged until touched). `Presented by` reads the poster's name and is not editable at launch (674).

**The moment.** `When` is the member's own words; local code parses them and reads them back in one quiet line: `Thu 15 Oct, 19:00 GMT, the time at the place`. Before a place is set the line ends `time zone from the place once it is set`; for an online event it ends `your home time zone`. Timezone is never a choice. **Failed parse:** the words stay in the field, a hint says `That did not read as a date and time. Pick them below.`, and a real date picker and time picker mount beneath, the date prefilled only with what did parse. **Window** (520, 634): `No date yet? Give a window` swaps the pair for one `Window` field (`November`) whose hint reads `The card will say: November, date to be confirmed.`; `I have a date` swaps back. No end time is ever invented. `Ends` is optional and empty by default; no default is set (634).

**The door.** `Format` is the first control and the first structural choice (621): In person, Online, Hybrid. Nothing else in the door renders until it is made. In person shows the place; online shows the meeting link; hybrid shows both as two delivery rows (521), side by side at expanded and stacked at compact and medium (the medium sheet is half the frame). Under the rows one quiet line is the delivery intent the card and page render: `In person at Front Room, Osu, Accra and Online, link to be announced.`

- **Place, resolved never typed (Revision 5).** The member says where they are looking; nothing is inferred from where they live. `Country` is a Strand `Select` reading `public.world_countries` at runtime, first in the place block, **empty until the member chooses**: placeholder option `Choose a country`, the member's stated country first, then the table's `position` (796, 797). Never pre-selected, by any route. `Place` is absent until a country is chosen (580, 621), as the door is before Format. Above compact the two sit in one row, `minmax(0,1fr) minmax(0,2fr)`; at compact they stack. The homes (633) stay as chips under the pair; a home sets the country and the city together and narrows the lookup. Choosing a different country after a place resolved clears the resolution and keeps the words. The lookup anchors to the chosen country only. `Place` takes the member's words with placeholder `A venue or an area` (798). Typing: one unambiguous result settles as resolved after a pause; the pair becomes a row (`map-pin`, the resolved reading, the country in `--ink-3`, `Change`) with `Time zone GMT, from the place.` A venue replaces the member's words (`Front Room, Osu, Accra`); an area resolves beside them, the words kept with the area after them (`Labadi beach, Osu, Accra`) (784). `Change` reopens both controls and does not re-resolve unchanged text: it is an editing state, and the words settle again only once they change (785). Zero results: hint `No place found for that. Searched: {country}. It is kept as you wrote it.` (798); the words stand in `place_text`, the words alone. When the lookup itself is unavailable the hint is its own and never the zero-results one: `Place search is unavailable right now. Your words are kept, and you can publish.` (781); the words stand and Publish is open. Several: hint `Several places match. Pick one, or leave it as you wrote it.` over a listbox of the matches; nothing is chosen for the member. Both fallbacks are publishable; the in-person door is not satisfied without a country. **Storage (799).** `event_delivery.country` always holds the host's chosen country as the `world_countries` name, whether or not a place resolved, with `place_id` null when nothing did. `place_text` holds the member's words only. No new column, no migration. **Read (799, 806).** The intent line and the card compose the words and the country at read: `In person at Kwame's rooftop, Ghana.` Derived every time from `place_text` and `event_delivery.country`, never read back from a stored sentence. `delivery_intent` keeps the country inside the sentence it stores and is rewritten in the same write as `event_delivery.country`; `place_text` never carries the country.
- **Meeting link.** `Meeting link` with hint `Shared with the ticket, never on the card.`, or `Announce the link later`, which makes the row `Link to be announced` with `Add it now` and the line `People who are going get it by email when you add it.` (521's explicit to-be-announced).

**The program.** The member's text is the program; the section says so (`Your words above are the program. Media goes with them.`) and holds `Doors open` (DIA may fill).

**The send-off.** `Tickets`: Free, Paid, Donation as words; Paid and Donation add `Amounts are set with ticketing, after this.` (Pass 4). The submit semantics are stated on the surface: `Posting publishes this event. It goes to the Feed and to Convene.`

**More options** expands in place and does not navigate (580): `Capacity` (hint `Only you see this. It never shows on the event.`, 623), `Sponsor` from the host's relationships (hint `From your relationships. It shows on the card as a fact you chose.`, 630), `Space` (Canon 6). All optional, all empty by default.

**Validity.** True when the title is set, a format is chosen, when parsed or picked or a window is given, and the door is satisfied: for in person a resolved place or at least the typed words; for online a link or to-be-announced; for hybrid both. Nothing on the form says why Publish is off; the button state is the only signal (no nudges).

**Publish.** In flight, failed and resolved as 665 and 666 give them. The host builds the Feed card from `created_object.convene.*`: kicker `Event`, the title, the meta line `Presented by {presented} · {when} · {where}` from section 2, the sponsor row only when a record was chosen, no social proof (no one is going yet). On `onClose('published')` the host navigates to the Feed with the new card first and one toast.

**Chip disabled.** Opened inside an event (`anchor` of kind event), `disabledVerbs.convene` is `You are inside an event. Host a new one from the Feed or from Convene.` The chip stays in the row at disabled opacity, is not selectable, carries the reason as `aria-description` and as the pointer `title`, and DIA never proposes it (53).

**States drawn:** proposal without selection; chip tapped after the read; in person; online; hybrid; place with no country yet; country chosen and place empty with homes; country chosen and place resolved; country chosen and nothing found, words kept; wrong country and nothing found; area beside the words (784); place search unavailable (781); place with several; when parsed; when failed with picker; date window; More options open; publish in flight; publish failed; published; chip disabled. Each on three tiers, both themes, touch under expanded and pointer at expanded.

**Preview and disabled reason (671, 672, landed in Strand under 681).** The form writes `convene.title` (the title field) and `convene.meta`, one string in Convene's words, the card's meta line from section 2 (`Presented by Amara Osei · Thu 15 Oct, 19:00 GMT · Front Room, Osu, Accra`); the preview reads exactly those two keys and its footer is the card's fixed vocabulary, so `Get a ticket` does not appear. Before a format is chosen the meta has no time zone, because none is derived yet. On touch, a tap on the disabled Convene chip changes no selection and writes its reason into the DiaLine slot as a status line; the next tap in the row clears it. Pointer keeps `title` and `aria-description`.

**Reopening items found while drawing (578), ruled 671 and 672 under 677 and landed under 681:**

1. **Preview title and meta (52 against 664).** The Composer's live PostCard preview reads `fv.title` un-prefixed and rows from `VERB_SCHEMA`, and correction 6 says the Composer does not read a supplied form's fields. So in step 3 the preview shows the kicker, body, media and action but never the title, when or where the form holds. The published card is right because the host builds it. Ruled 671: the preview reads `{c}.title` and `{c}.meta` by convention and its action row is the fixed vocabulary.
2. **The preview's action button (579).** The Composer's preview renders `Get a ticket` from `VERB_SCHEMA.convene.action`; the Feed card under this pass has no RSVP. Ruled 671: the action row is the fixed vocabulary.
3. **Disabled reason on touch (correction 7).** The reason is `aria-description` and a pointer `title`; on touch nothing visible carries it. Ruled 672: the reason writes into the `DiaLine` slot on tap.

## 4. The event object the composer produces (Done Means 10)

Listed as fields whether or not the compact form shows them.

| Field | Notes |
|---|---|
| `id` | stable identifier, the calendar UID |
| `presented_by` | the published name; the host is the poster |
| `format` | `in_person` \| `online` \| `hybrid`; first structural choice |
| `place_id`, `place_name`, `city`, `country` | place resolved to one result; DIA may fill `place_name`, never `city` and never the country; free text fallback held in `place_text`, the member's words alone. `event_delivery.country` always holds the chosen country, `place_id` null when nothing resolved (799) |
| `delivery` | rows: physical endpoint, meeting link, or to-be-announced; two rows for hybrid (521) |
| `timezone` | derived from the place; never asked |
| `starts_at`, `ends_at`, `date_window` | in the event's own timezone; `ends_at` null is a window (634); `date_window` is words (520) |
| `body` | the member's text |
| `media` | shared media system, up to four images |
| `attachments` | Files the host attaches from the Hub after publish; rendered in Overview post-event (705). Never a compose-time field; the form does not write it. | Hub (705) |
| `delivery_intent` | the sentence the card and page render; it keeps the country inside the sentence and is rewritten in the same write as `event_delivery.country` (806) |
| `capacity` | host setting; never renders as a number outside the Hub (623) |
| `price_nature` | `free` \| `paid` \| `donation`; amounts are Pass 4 |
| `calendar` | `id`, `starts_at`, `ends_at`, `timezone`, `location_string`, `description`: what Pass 2's add-to-calendar reads |
| `sponsor_relationship_id` | optional (630) |
| `space_id`, `story_id`, `need_id` | optional; the hub hooks render only when set |
| `status` | `draft` \| `published` \| `cancelled` \| `past` |

## 5. Numbers

None render in any state. The only numerals are dates and times.

## 5a. Carried to Pass 4, not this pass

The host-placed pin on a Mapbox map; the event page map; directions through the viewer's own device handler.

## 6. Exit check

Deployed against the prototype at 360, 390, 430, 744, 820, 1024 both orientations, 1280 and 1536, both themes, Safari and Chrome. `scripts/token-check.mjs` passes. On the card: four `IconButton`s in the footer and no RSVP control in the DOM; no numeral that is a count; the cancelled card has no `img` and no hook rows; social proof absent below five. On the composer: no chip carries `aria-checked=true` from DIA alone; `city` is never in a DIA fill; Publish is disabled while a proposal stands without a tap; the door renders no place or link control before a format is chosen; the Country select has no selected option on a fresh in-person form and `Place` is not in the DOM until one is chosen; a lookup request never carries the member's residence; `event_delivery.country` equals the chosen country on every published in-person event; `place_text` never contains the country; `Change` does not re-resolve text the member has not changed; the fieldset is `disabled` and `aria-busy` while `onPublish` is pending; a rejected `onPublish` leaves every field value in place.
