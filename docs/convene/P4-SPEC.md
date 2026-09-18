# P4-SPEC — Convene Pass 4, the place section

**For `docs/convene/P4-SPEC.md`. Session 26, 18 September 2026 (Pacific). Built from `P4-EXTRACTION.md`, ratified as ruling 897 with one line held under 898.**

This is a surgical extension of `src/components/dna/ConveneForm.tsx`, which is 943 lines and already carries the country control, the zone list, the place resolution, the area handling and 807's dedupe. Nothing here replaces that file. Every section below names the line or the marker it edits.

It also closes **G40**, whose own entry parked the fix in these words: Pass 4 redraws the block with the zone control in it, and inventing a replacement sentence in a code session is what 62's visual contract exists to prevent. Pass 4 has drawn it. Section 2 is the sentence.

---

## 1. The corrected `whenSuffix` (copy line 3, G40)

`ConveneForm.tsx` lines 267 to 275 compose `whenSuffix` from `tzFromPlace` in three branches, two of which are the same string. Replace the whole expression with the four ratified cases.

| State                                 | Line, verbatim                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Resolved place, any resolved state    | `Time zone Africa/Accra, from the place.`                                                          |
| Country chosen, place empty, one zone | `Time zone Africa/Accra, from the country.`                                                        |
| Host chose a zone (821)               | `Time zone America/New_York, the zone you chose.`                                                  |
| Online event (824)                    | `Time zone America/Los_Angeles, from your device. An online event has no country to take it from.` |

Two further readings of the same line:

- Two zones, none chosen (821): `The time zone comes from the country, and this country has more than one.`
- No country yet: `The time zone comes from the place, or from the country when no place resolves.`

The zone names above are the examples as drawn. The rendered value is the event's own zone. Every one is an IANA identifier; see section 2.

The string `, time zone from the place once it is set` is deleted. It describes a state the form has not been in since 813 and 821.

## 2. The zone is named by its identifier everywhere (898)

Lines 703 to 708 render `Time zone {zoneAbbr(placeTz, …)}, from the place.` `zoneAbbr` is `src/lib/when.ts:103` and returns a display abbreviation.

**Replace the `zoneAbbr` call in both branches with the IANA identifier.** Ruling 821 required options to read as IANA identifiers with no invented display name and no computed offset, and 898 extends that to every member-facing Convene surface rather than compose alone. `GMT` is a display name, and for any zone observing daylight saving it is a computed offset that moves twice a year. It reads clean in the drawn frames only because Africa/Accra is GMT all year; the same line for a New York host would read `EDT` on one surface and `America/New_York` on another, for one stored instant.

Line 736's `Time zone {zoneFromCountry}, from the country.` already carries the identifier and does not change.

**The same change applies to the Convene card and rail.** `PostCardRouter.tsx` builds the Convene card; its derived label and the rail's stored-instant line both carry the zone. Locate the call sites and give them the identifier. Copy line 11's drawn form, with `GMT` corrected:

- Outside this year: echo `Wed 16 september, 7pm`, then `Stored as Thu 16 Sep 2027, 19:00 Africa/Accra`.
- Inside this year: echo `Thu 16 oct, 7pm`, then `Stored as Thu 16 Oct, 19:00 Africa/Accra`.
- The card's own derived label in the same states: `Convene · Thu 16 Sep 2027, 19:00 Africa/Accra · Osu, Accra` and `Convene · Thu 16 Oct, 19:00 Africa/Accra · Osu, Accra`.

The year appears on the derived label outside this year and not inside it, which is 835 and is unchanged.

`zoneAbbr` itself is not deleted. Report any other caller you find rather than removing it.

## 3. The info affordance and its panel (814, 901, G35)

Under `data-convene="country"` when a country is chosen and the place field is empty, render a control:

- Control name: `Why is my venue not here?`

Activating it opens Strand's `Sheet`, `contained`, with `tier` passed per frame. **It is a Sheet at all four tiers** — 390 bottom-anchored, 820 side-anchored, 1280 and 1440 centred, which is 584's geometry, one part, no variant. Ruling 901 settled this: Strand carries no popover part, verified by eight name searches returning zero in the correction 17 bundle, and `Tooltip` opens on hover and focus only, which 814 forbids as the sole path.

Panel contents, verbatim:

- Title: `Venues in Ghana`
- Body: `The map holds no venue records for Ghana, so searching will not find your venue. This is the map's gap, not a mistake in what you typed.`
- Second line: `Type the venue as you say it, then place the pin where it is. Both travel with the event.`

The country name in the title and body is the country the host chose. The claim is about that country's coverage and renders only where it is true.

## 4. The rewritten zero-results hint (814)

The nothing-found state's hint reads, verbatim:

`The map has no venue records in Ghana. Your words are kept, and you can place the pin yourself.`

## 5. The pin and the map plate (790, 792)

A map plate renders inside `data-convene="place-block"` in the states the extraction lists. It is a drawn plate: a hairline grid on `--bg-sunken` with the matched area named in a chip. **It renders no tiles and no invented geography.** Its own line, in the unplaced state: `No point yet. Map tiles come from the provider in the built surface.`

A pin renders only where the state has a point behind it.

**Two pin kinds, and they never read the same.** A host-placed point is a copper dot inside a dashed `--c-convene` ring. A resolver-derived point is an ink dot, no ring, `--line` hairline.

The instruction beside the plate, by state and input mode:

| State                   | Touch                                                    | Pointer                                              |
| ----------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| Map shown, pin unplaced | `Press the map where the venue is, then drag to adjust.` | `Click the map where the venue is, or drag the pin.` |
| Pin being dragged       | `Keep dragging. Lift your finger to place it.`           | `Release to place it.`                               |

Input mode changes the words in these two states only. Everywhere else it changes hit behaviour and not copy.

The remaining instruction lines, which do not vary by input mode:

- Pin placed by the host, and both map-link states: `You placed this point. People see it as your own, not as the map's.`
- Host-placed beside resolver-derived: `Ink is the point the map holds. Copper, ringed, is the point you placed.`
- Nothing found, rewritten: `The map has no record here, so the point is yours to place.`
- Single suggestion, pin makes it moot: `This point is the map's. If it is not your venue, place your own.`
- Area beside the words: `This point is the area the map matched, not the venue.`

The pin's act, by state: `Place the pin` in the unplaced and nothing-found states; `Move the pin` in pin-placed, host-placed-beside-derived and both map-link states; `Place it yourself` in single-suggestion-moot.

## 6. The host-placed chip, four readings (copy section 4)

One visual in every case: Convene copper on `--surface`, `--c-convene` hairline, `--c-convene-text` ink, inside a dashed `--c-convene` ring around a copper dot. Only the words change, and they change by who is reading.

| Viewer and state                           | Words                    |
| ------------------------------------------ | ------------------------ |
| The host, own composer, point at rest      | `Placed by you`          |
| The host, own composer, mid-drag           | `Moving your point`      |
| The attendee, on the event page            | `Placed by the host`     |
| Any viewer, a point the host did not place | `From the map's records` |

The fourth is the resolver-derived pin and carries the ink-dot treatment, not the copper ring.

## 7. The map link field (815, 816)

Inside the place block, after the plate:

- Label: `Map link`
- Placeholder: `Paste a link to a map`
- Hint: `Optional. It opens in the app you took it from. DNA keeps it as a link and never reads it.`

**That hint is a promise the code keeps.** The value is stored as an opaque string and is never parsed, geocoded, plotted, or used to derive a point, a place or a zone. 816 is explicit that member content is never parsed or plotted. If a future need arises to read it, that is a ruling and not an implementation detail.

Removing the field removes no information about where the venue is, because the pin carries that. Ruling 897 ratified that reading from the drawn frames, which is why the field is the host's own addition and never a second source of truth.

On the event page, the attendee's rendering:

- Link: `Open the host's map link`
- Note: `The host pasted this. It opens in the app they took it from, and DNA does not read it.`

It renders as a bordered row under the directions affordance, so the attendee has two ways to the same point: their own handler, and the host's link.

## 8. The zone control and the door (821, unchanged behaviour, stated for completeness)

- Placeholder option: `Choose a time zone`
- Door line, two zones and none chosen: `Choose the time zone first.`
- Door line, no country yet: `Choose the country first.`
- Door line everywhere else, including the unplaced-pin and nothing-found states: `Posting publishes the event.`

The control is absent rather than disabled where it does not apply, is never preselected, and its options read as IANA identifiers.

## 9. The weekday contradiction (836)

Where the host's typed weekday disagrees with the date they typed, render beneath the when-line at `data-convene="when-line"`:

`You wrote Wed. The date you wrote falls on a Thursday in 2027. Your words are kept; the event will be stored for Thu 16 Sep 2027.`

The field above it still shows the host's own words, `Wed 16 september, 7pm`. **The host's words are never rewritten.** The contradiction is stated and the stored value is named; nothing is silently corrected.

## 10. Directions (791, event page)

`Get directions`, through the viewer's own handler, three states:

- Resting: `It opens in the app you use for maps.`
- Pressed: `Opening your maps app.`
- Unavailable: `This device has no app to open directions in.`

---

## Not in this build

Ticket amounts, checkout, payout, refunds and the scanner's states. Pass 4's extraction lists them as outside its scope and Brief 11 does not name them.

No backfill of the seven published events (823). Online events keep the browser zone (824). No confirmation step on a single suggestion (808 B), whose drawn answer is the pin rather than a question.

## Guardrails

- Surgical edits to `ConveneForm.tsx`. Do not rewrite the file. Every section above names its line or its `data-convene` marker.
- No numeric score anywhere. No count. No distance, no match quality, no confidence. Pass 4 draws none and none is added.
- The map plate renders no tiles and no invented geography in this build.
- Fixed vocabularies are database tables read at runtime, never hardcoded arrays.
- Fetch and rebase on `origin/main` before branching and again before pushing. Classify `main`'s recent commits by how they landed, not by who authored them (920).
- 759 as amended by 915 governs the `live` window, not the count of open PRs.

## Done Means

1. `whenSuffix`'s three branches are replaced by the four cases and the two further readings, and the deleted string appears nowhere in the tree.
2. No member-facing Convene surface renders a zone abbreviation. `zoneAbbr`'s remaining callers, if any, are named in the closing report.
3. The info control opens a `Sheet` at all four tiers with the three verbatim strings.
4. Both pin kinds render distinctly and the four chip readings render by viewer, not by a note.
5. The map link is stored opaquely and is provably never parsed, plotted or read. Say in the report what proves it.
6. The weekday contradiction renders without rewriting the host's words.
7. `docs/GAPS.md` records G40 as closed, citing this build, and corrects its own closing paragraph, which calls the `Time zone GMT, from the place.` line ratified and correct as built; 898 has since overturned that abbreviation.
8. Green on the PR's enforcing run, named by head SHA (894).
9. 627 stands: the founder composes a real in-person event and a real hybrid event on the deployed URL and reads the rows back. That reading is the founder's or CI's, never Code's (916).
