# Convene Pass 1 extraction for Chat (129), Revision 4

**Revision 3 line, added 15 September 2026 under Brief 10 (ruling owed 3, default taken; not a reopening).** The speakers row is a created-object row on Pass 1's card (69, 642, 645): label `Speakers`, mic icon, the accepted speakers' names; it renders at every tier the card renders and only with at least one accepted party (678). Nothing else on the card changes. Drawn in `convene/B10-Attend-v1.dc.html`.

**Revision 4, 15 September 2026, under 705.** `attachments` is an event-object field attached from the Event Management Hub after publish and never a compose-time field; the form is unchanged. Revision 3 was ratified under 683; Pass 1 is approved whole (677, 683).

**Revision 3, 15 September 2026.** Revision 3 covers only the two frames 677 held and the Segment rebind, on Strand compile `v1789514836887586` (681; 41 exports, `Segment` added). Everything else stands as ratified in Revision 2a and is not restated below the Revision 3 section.

## Revision 3: the held frames and the Segment rebind

**Rebind (Done Means 7 of the 10 to 12 handoff, 663).** `_ds/` re-synced from `v1789514836887586`. `composer/B1-Composer-v3.dc.html` mounts the updated Composer with no new console errors: three composers open, fifteen chips, `Ticket` renders through `Segment` in each. B1 is approved and was not edited.

| Item | Ruling |
|---|---|
| The form writes `convene.meta` as one string, the card's meta line from section 2; the preview reads `convene.title` and `convene.meta` and nothing else of the form | 671, 681 |
| The preview's footer is the card's fixed vocabulary; `Get a ticket` is absent; `Ask the host` is the Respond label | 671, 579, 88 |
| Before a format is chosen the meta carries no time zone, because none is derived; it is not invented | 671, Digital Trust Layer |
| Touch: a tap on the disabled Convene chip changes no selection and writes the reason into the DiaLine slot as `role=status`; the next tap in the row clears it | 672, 681 |
| Pointer (expanded frame) keeps `title` and `aria-description`; nothing writes into the slot | correction 7, 672 |
| Format and Tickets are Strand's `Segment`, the form owning labels and meaning; the redrawn pills are removed | 673, 681, 578 |

**Frames redrawn:** `Step 3, chip tapped` and every step 3 state (preview with title, meta and fixed footer, Segment for Format and Tickets); `Chip disabled, inside an event`; `Disabled chip tapped`; `Reason cleared`. Three tiers, both themes; the disabled-reason states act on the compact and medium frames only, the expanded frame being pointer mode.

**Confirmed content, Revision 3.** Meta line: `Presented by Amara Osei · Thu 15 Oct, 19:00 GMT · Front Room, Osu, Accra`; before a format: `Presented by Amara Osei · Thu 15 Oct, 19:00 · Front Room, Osu, Accra`. Status line: `You are inside an event. Host a new one from the Feed or from Convene.` Segment options: `In person` · `Online` · `Hybrid`; `Free` · `Paid` · `Donation`.

**Tokens (604).** No new token; `Segment` renders on the tokens the pills used.

**Conflicts.** None new. Conflicts 1 to 3 below are closed by 671, 672 and 681.

---

## Revision 2a, as ratified

**15 September 2026.** Revision 2 ratified under 129; Pass 1 approved under 62 (ruling 677) with the preview frame and the disabled-chip touch frame held for Strand corrections 10 to 12; nothing redrawn here. Revision 2a is Revision 2 plus the cleanup 677 ordered: end-time default variant removed (634), hub hooks under 642, rulings 671 to 676 recorded. Supersedes Revision 1 (14 September). Prototype `convene/P1-Compose-and-Card-v1.dc.html` with `convene/p1-convene-form.js`; spec `convene/P1-SPEC.md` Revision 2. Rulings 634, 635, 636, 664 to 670 applied. Nothing from Pass A carried (628). The pass is drawn whole: step 3 and its states are on Strand's corrected Composer. Approved under 62 (677).

## Rebind done first (Done Means 7 of the corrections 6 to 9 handoff)

`_ds/` re-synced from Strand compile `v1789508566603884` (39 components, 194 tokens) on 15 September after 664 to 670. `composer/B1-Composer-v3.dc.html` mounts the updated Composer with no console errors: 40 exports, three frames open, 15 chips, DiaLine reads. B1's review presets seed the verb as chosen, so a checked chip there is the preset and not the read. 605: no prior Done invalidated. B1 is approved and was not edited.

## Mapped to rulings

| Item | Ruling |
|---|---|
| Composer is Strand's on Strand's Sheet; card is the chassis PostCard with 105's expanded state; no local variant of either | 636, 578, 69, 105 |
| Three frames, both themes, touch under expanded and pointer at expanded | 583 |
| Step 1 unchanged for Convene; chip pre-selected silences DIA | 52, 53 |
| DIA proposes the verb from words alone; the DiaLine carries the proposal; no chip is selected by the read | 635, 667 |
| Proposal alone never publishes; a tap on the proposed chip keeps DIA's fills | 668 |
| Convene supplies its form through `forms.convene`; keys namespaced `convene.*`; the form reports validity on first render and every change; Publish gates on the report and a tap | 664 |
| Publish in flight: fieldset disabled and aria-busy, draft visible, `Publishing`, no second fire | 665 |
| Publish failed: caller's message in Sheet's error slot, draft intact; resolved: `onClose('published')`, host navigates | 665, 666 |
| Convene chip disabled inside an event with the caller's reason as accessible text and pointer hint; DIA never proposes a disabled verb | correction 7, 53 |
| Form varies layout by tier, medium included | 669 |
| DIA fills the title, when as the member's words, the venue name, doors; never the city, never the format; touched fields are the author's | Digital Trust Layer, 581 |
| Silence is an ordinary composer | 52 |
| Five named sections; More options in place; fields that do not apply are absent | 580, 621 |
| Format first, shapes the door; choices as consequences, no booleans | 621 |
| Hybrid is two delivery rows; explicit to-be-announced is a state | 521 |
| Place resolved never typed; one result counts; zero and several fall back to the survivable field; homes as default suggestions; timezone derived, never asked | Brief 6 4A, 633 |
| When parsed locally from the member's words; failed parse shows a real picker; window as a state; no end time invented | 52, 520, 634 |
| Capacity never renders as a number outside the Hub | 623 |
| Sponsor only from a relationship record, as a fact the host chose | 630 |
| Space link from the form | Canon 6 |
| Submit semantics stated on the surface: posting publishes | Brief 6 4A |
| Card anatomy exact, four icon-only actions, no RSVP, no count, no shadow | 69, 88, 579, 97 |
| Meta line: presented-by, viewer time with local when they differ, place or format word | Brief 6 4A |
| Social proof three names then `and others`, absent below five | 508 |
| Cancelled and past as full treatments inside the anatomy | Brief 6 4A |
| Read more in place, direct URL as page content | 105 |
| Event object fields including the calendar-ready set | Pass 1 brief, 621 |

## Doctrine conflicts flagged (578), ruled under 677

1. **Preview title and meta, 52 against 664.** The Composer's live preview reads `fv.title` un-prefixed and rows from `VERB_SCHEMA`; correction 6 forbids the Composer reading a supplied form's fields. In step 3 the preview shows kicker, body, media and action and never the title, when or where. The published card is right because the host builds it from `created_object.convene.*`. **Ruled 671:** the preview reads `{c}.title` and `{c}.meta` by convention. Redrawn in Revision 3 (681).
2. **Preview action `Get a ticket`, 579.** Inherited from `VERB_SCHEMA.convene.action` through B1's approved preview; the Feed card here has no RSVP. **Ruled 671:** the preview's action row is the fixed vocabulary.
3. **Disabled reason on touch, correction 7.** The reason is `aria-description` and a pointer `title`. On compact and medium in touch mode nothing visible carries it. **Ruled 672:** the reason writes into the DiaLine slot on tap. Redrawn in Revision 3 (681).

## The hub hooks (642)

Unchanged from Revision 1. Drawn once, in the expanded card only, in 69's created-object rows: `Space`, `Story`, `Help wanted`, each a text link in the target C's text colour (rule 3), each only when the linked object exists; past events add `Were you there · Say so`. Ruling 642: the created-object rows may carry cross-C links.

## New, in the founder's wording, ruled under 677

Items 1 to 5 stand from Revision 1 (cancelled keeps the Convene frame; cancelled never clamped; social proof in the rows as `Going`; `Ask the host` as Respond; `Were you there · Say so`). Added:

6. **The segment radio inside the form is the Composer's own idiom, not a Strand component.** Format and Tickets use the same 44px pill radiogroup the Composer draws for `VERB_SCHEMA` segments. **Ruled 673:** Format and Tickets rebind to Strand's segment part when it lands. Rebound in Revision 3 (681).
7. **`Presented by` is a field in the invitation, prefilled with the poster's name.** **Ruled 674:** it reads the poster's name and is not editable at launch.
8. **The program section is the member's text plus `Doors open`.** The five names are 580's; the body already lives above the form, so the section says so rather than repeating it. **Ruled 675:** confirmed.
9. **The fixture date is 15 October.** The parser computes the weekday from the calendar and 16 October 2026 is a Friday; the fixture moved to Thursday 15 October in the composer text and the card so nothing on a frame contradicts the calendar. Stands (677).
10. **Delivery intent is derived and read back, never typed.** `In person at {place}`, `Online, link with your ticket`, `Online, link to be announced`, joined for hybrid. **Ruled 676:** confirmed.

## Confirmed content (no numbers render)

Copy on the form: `Near one of your homes` · `No place found for that. It is kept as you wrote it.` · `Several places match. Pick one, or leave it as you wrote it.` · `Time zone GMT, from the place.` · `That did not read as a date and time. Pick them below.` · `No date yet? Give a window` · `I have a date` · `The card will say: November, date to be confirmed.` · `Announce the link later` · `Link to be announced` · `Add it now` · `People who are going get it by email when you add it.` · `Shared with the ticket, never on the card.` · `Your words above are the program. Media goes with them.` · `Amounts are set with ticketing, after this.` · `Posting publishes this event. It goes to the Feed and to Convene.` · `Only you see this. It never shows on the event.` · `From your relationships. It shows on the card as a fact you chose.` · `Not linked to a Space` · `No sponsor` · `More options` / `Fewer options`. Disabled reason: `You are inside an event. Host a new one from the Feed or from Convene.` Failure: `Publishing did not go through. Your draft is here. Try again.` Toast: `Published. It is in the Feed and on Convene.` Capacity is empty in every drawn state.

## Tokens (604)

Every colour, radius, duration and easing on the form is a Strand token by name. No state needed a token Strand does not have. The native date and time pickers take `color-scheme: dark` from Strand's dark theme.

## Strand Pass 01 corrections, this pass

None new. 6 to 9 landed under 664 to 670 and are re-synced. Correction 10 above is proposed, not requested, until Chat rules on conflict 1.

## Not drawn

Add-to-calendar (Pass 2). Full create (Pass 3). Amounts (Pass 4). 74's latency measurement is Code's. Production place lookup and date parsing are Code's; the prototype's are stand-ins that only produce the states.
