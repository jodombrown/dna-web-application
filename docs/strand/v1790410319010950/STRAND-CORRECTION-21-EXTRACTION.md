# Strand correction 21, with correction 22 folded in, and rulings 978 and 979

**19 September 2026, session 27. For Chat to ratify under 129.** Governed by 129, 62, 405, 488, 498, 555, 638, 663, 723, 732, 848, 855, 873, 876, 899, 903, 904, 905, 908, 926, 933, 934, 936, 939, 942, 947, 950, 953, 969.

Opened on a read. Scope is the correction's eleven items and nothing else.

**Everything here about the app repo is relayed data**, taken from the correction and labelled as such at each use. The app project was not opened, read from or cited (663).

**Compile.** `_ds_bundle.js` **v1789885868097915**, read from the compiled artifact after the pass (873). It carries items 1 to 11, rulings 978 and 981, the G36 citation, and 984's reading of how the resolver is exhaustive. It is the id the export is marked at and the first in this session whose own comments match its records. It supersedes `v1789880372619731`, which carried items 1 to 11 only and is recorded in §5 and §6 as the state those two rulings were measured against.

**Compile (items 1 to 11, superseded by the above).** `v1789880372619731`, read from the artifact after that pass (873). **Two compiles were read and rejected on the way here:** correction 20's `v1789787827785362`, the pre-fix state recorded in §0; and `v1789880167533065`, which carried this pass's first build and failed two of fifteen checks — a dense bar dividing 76/96/76 because the padding was uniform per seat *role* rather than per bar (§3, item 4). The export copy carries the id in its own `@ds-compile-id` header and on `window.__DS_COMPILE_ID` (854, 861). Corrections 16 through 20 keep their own ids; nothing is re-dated (855).

> **Stamped 19 September 2026**, session 27, against **v1789885868097915**, with the proof reading yes on every check. Four compiles were read and rejected on the way: `v1789787827785362` (pre-fix, §0's before side), `v1789880167533065` (the 76/96/76 dense division), `v1789880372619731` (items 1 to 11, before 978 and 981), and `v1789884826893810` (functionally correct, **held under 983** because its own doc comment still cited 794 for the summing defect). The last rejection is the one worth keeping: nothing functional differed, and the artifact was held anyway because the export is the file a consumer reads. Readouts at the stamp: `STATE_TABLE` **8 rows**, 0 empty, 2 rendering glyph and word, with each mode's active and inactive rows **identical**; `DENSE_RETIRED.prop_is_inert: true`; `PACKING_TEST` 8 rows with `mode === predicted` on every one and `FEED_AT_390` `{labels: [64,70,35], need_sum: 271, need_widest: 312, over_price: 41, mode: "labels", would_be_at_widest: "icon-first"}`; `DIVISION_AT_390` `max_move: 0` in labels, icon-first and fill; `SEAT_FLOOR.min_seat_width: 45.4`, `below_floor: []`; `UNLATCH.same: true`; `PROBE.overflow_contributed: 0`; four glyphs at `transform: "none"`; `BUNDLE_ERRORS: "none"`; `ALL_CHECKS: "yes"`.
>
> **Earlier readouts, kept for the record:** `RESOLVER_EXPORTED: true`, `STATE_TABLE.empty_rows: 0` over 16 rows with `icon_plus_word_rows > 0`, `DIVISION_AT_390.{labels,icon,fill,dense}.max_move: 0` with `track_moved: 0`, `SEAT_FLOOR.below_floor: []` and `min_seat_width: 44`, `MODES.compact` icon-first with no descriptor at seat 44, `MODES.dense.active` 1 icon and its word with `equal: true`, `MODES.icons.active` 1 icon and its word, `UNLATCH.same: true` and `.inside_the_part: true`, `PROBE.overflow_contributed: 0`, `GLYPHS` four rows with `transform: "none"`, `BUNDLE_ERRORS: "none"`, `ALL_CHECKS: "yes"`. Read at the stamp: `RESOLVER_EXPORTED: true`; `STATE_TABLE` 16 rows, 0 empty, 6 rendering icon and word; `DIVISION_AT_390` `max_move: 0` and `track_moved: 0` in labels, icon-first, fill and dense; `SEAT_FLOOR.min_seat_width: 45.4` with `below_floor: []` and the compact frames icon-first at 360, 390 and 430; `MODES.compact` icon-first, no descriptor, seat 44, padding [0], equal; `MODES.dense` 1 glyph and its word on the active seat, padding [10], equal, dividing **82.7 / 82.7 / 82.7**; `MODES.icons` 1 glyph and its word on both seats, padding [14]; `UNLATCH.same: true` and `.inside_the_part: true`; `PROBE` six 0x0 clip boxes and 0px contributed; four glyphs at `transform: "none"` resolving to their own files; `BUNDLE_ERRORS: "none"`.

> **Ratified while this pass was open.** Correction 21's three findings against the correction are **971** (item 2's empty seat is the consuming repo's, not Strand's; item 2 stands as reframed), **972** (the bundle is three errors, and the sub-floor seat is labels mode), and **973** (padding is a property of the bar). **974** requires all four `dense` options to be priced on the post-item-4 ground before any is chosen; §2 does that and chooses none.

---

## 0. The check, failing before the fix (485, 539, Done Means line 1)

Run against the loaded pre-fix bundle `v1789787827785362`. **Fifteen checks failed.** The ones the correction is about:

| what was checked | pre-fix reading |
|---|---|
| a combination renders icon plus word | **none does** — 0 rows of 16 |
| seats move on selection, fill packing, 5 lenses at 390 | **22.25 / 17.46 / 13.27 / 8.49px**, track moved **0** |
| seats move on selection, labels mode | **11.99px** on every boundary |
| seats move on selection, dense icon-first | **5.17px** |
| every seat at or above 44 | **34.8px** at four of six frames |
| probe's overflow contribution | **24px** into the container it measures |
| `compact` renders from the part | ignored; descriptor rendered |
| `dense` active seat | 0 icons, word only |
| a caller that does not un-latch | descriptor stays shut — `{obeys: "Posts from people you know", inert: null}` |
| padding values across a bar's seats | `[8, 14]` |
| the bundle's own demo errors | **3** |

I saw it fail. The numbers above are the before side of every measurement in this document.

**On the reflow specifically:** 969 says the track did not move and the division did. Reproduced exactly — `track_x` is identical before and after in all four packings, and only the seats move. Code's relayed numbers at 390 were 12.98 / 17.69 / 22.39 / 27.09; Strand's are 22.25 / 17.46 / 13.27 / 8.49 on Strand's own label set, decreasing where Code's increase because the two sets' label widths distribute the redivision differently. Same mechanism, same magnitude, different words.

---

## 1. Where the correction is wrong about Strand's own parts

555 says a correction names the outcome and the ruling, never a mechanism whoever wrote it has not read. The correction is explicit that it did not read Strand's `LensBar`. Three of its readings do not survive contact with the part. **The outcomes stand in all three; the mechanisms do not, and the fix follows the outcome.**

**(a) Item 2's empty seat is not Strand's.** 939 records R1 and `dense` cancelling to an active seat rendering neither icon nor word. Strand's pre-fix part cannot produce that: it computes one flag, `iconOnly = iconFirst && !(on && dense)`, and renders `iconOnly ? icon : word` — a ternary always renders one side. The empty seat belongs to an implementation that computes `ico` and `txt` separately, which is the consuming one. What Strand has is the *opposite* defect, and it is item 7: no combination renders **both**. So the check that fails on Strand before the fix is item 7's, not item 2's, and that is the one recorded failing in §0.

This does not reduce item 2 to a non-issue. A single boolean is jointly exhaustive by accident — it is exhaustive because a ternary has two arms, not because anything decided it should be. The moment a third rule needs a seat to render both, the ternary has to become two flags, and two flags are what 939 warns about. So the fix is the one item 2 asks for: two flags, resolved in one place, with the empty combination unrepresentable rather than unreached.

**(b) Item 6's sub-floor seat is in labels mode, not icon-first.** Strand's icon-first seat measured **44** at 360 and 390 — `minWidth: 44` was already set on icon-only seats, exactly as the item says it declares. The seat that measures below the floor is the **labels-mode** seat, which had no `minWidth` at all: **34.8px** for the lens labelled "All", at every tier. The item's severity reading is right and its mode is wrong, so the proof measures both modes at all three tiers rather than the one the item names. The fix is the same either way: `minWidth` on every seat in every mode.

**(c) Item 11 is three errors, not five.** `NS.__errors` holds three entries: one React #299 in `ui_kits/dna/app.jsx`, one in `ui_kits/dna/composer/proto.jsx`, and `Can't find variable: IMG` in `ui_kits/dna/connect.jsx`. Not two and two and one. The correction's reading of the count is the only thing that changes; every cause it names is real and all three are fixed.

---

## 2. `dense`: all four options on the same ground (974, 939 item 3)

The correction was right that it does not hold the four options and right not to invent them. **Strand holds them**, in `guidelines/STRAND-CORRECTION-20-EXTRACTION.md` §4, written 18 September under 936 and 934. 974 requires all four to sit on the post-item-4 ground before any is chosen, so all four are re-priced here. **None is chosen.**

### The ground moved, and it moved under every option at once

Item 4 removed movement from the comparison. Before it, the options differed on whether a dense bar reflowed; after it, none does, in any packing. What remains to choose between is narrower and it is worth naming exactly: **where the active lens's name lives, whether it fits, what width the bar demands, and whether `AppHeader` keeps a prop.**

**And item 4 exposed something the four were never priced against.** Equal flex fixes seat *positions*; it does not fix seat *fit*. Measured on the compiled part, a dense bar at a 260px header slot with three lenses:

| | |
|---|---|
| equal share each seat is given | **82.7px** |
| what the active seat needs (glyph 20 + gap 8 + "My network" 69.6 + padding 20 + border 2) | **119.6px** |
| deficit | **36.9px** |
| `scrollWidth > clientWidth` on the active seat | **true — the word is clipped** |
| the track scrolls to compensate | **no** — the overflow is a flex item's content, not the track's layout |

No Done Means line fails on this: no seat moves, every seat holds 44. But the active lens's name — the entire reason `dense` exists — does not fit the seat it is rendered in, at the width `AppHeader` actually uses. That is the axis the four options now differ on.

### A — the name leaves the seat

Renders the active lens's name beside the track; every seat stays a glyph.

**What item 4 gave it: nothing.** A's argument was that it made the bar equal-width and unmoving. Every option is now equal-width and unmoving, so A's distinguishing claim is gone.

**What it still uniquely does:** a name outside the track is never constrained by a seat, so it always fits. It does not remove the variable width, it relocates it one box outward into the header row — but a header row reserves one string's width where a track would reserve it *n* times, so the relocation is cheaper than it sounds.

**A cost A did not have when it was written.** After item 2 the active seat renders glyph *and* word. A splits that pair across two elements: the glyph inside the control, the name outside it. The tab's accessible name and the visible name then live in different nodes, so what a screen reader announces as the control and what a sighted member reads as its label are no longer the same element. Item 2 created that cost and A is the only option that carries it.

### B — `dense` is retired

**This is the option item 4 strengthened most.** Before it, retiring `dense` meant accepting that the reflow persisted wherever `dense` had been suppressing it. There is no reflow to accept. B's cost reduces to exactly one thing: the active lens in a compact header becomes an unlabelled chip among glyphs, with no descriptor, because a header has no room for one.

**And that cost is now priced rather than speculative.** It is the same cost R1 imposed on every 390 surface, which Chat accepted under 936. So B's real question is narrow and answerable: is the header slot different enough from a 390 surface to justify a mode that exists only there? If the answer is no, B is free.

**What B returns:** one rendering everywhere, `dense` and `PAD_DENSE` both retire, the state table halves from 16 rows to 8, and the 36.9px clip measured above cannot occur because nothing worded renders in a header track.

### C — collapses, and is no longer a fourth option

C was "`dense` keeps 904 and accepts the reflow". **There is no reflow.** C's entire content was the acceptance of a defect that no longer exists, so it is not an alternative to the other three — it is the status quo, i.e. `dense` exactly as this correction compiles it. Stated that way it has one cost and it is the measured one: **the active lens's word is clipped by 36.9px at `AppHeader`'s width.** Keeping C is choosing that clip knowingly.

### D — the narrowed claim

**Not** "the only option that moves nothing" — every option moves nothing now.

**D's claim, in the form the measurement leaves it: it is the only option in which the active lens's word is guaranteed to fit the seat it renders in.** Equal flex gives each seat `(track − padding − gaps) / n` whatever its content; D gives each seat at least its own worded width, so the 82.7-against-119.6 deficit cannot arise. That is a smaller claim than D was written with, and it is the only one of the four that addresses the defect item 4 exposed rather than the one it fixed.

D's costs are unchanged: the bar is as wide as the sum of every seat's worded width (~300px against 228 at five lenses, in a slot where it is the widest thing on the row); four of five seats show a 44px glyph in a 60–82px box, which reads as a gap with an icon in it; and it needs per-label measurement rather than widest-only, which is more measurement, and 794 is the standing reminder that a measured layout fails in the direction nobody checked. It does **not** need a measured absolute chip, so 488 is untouched.

### Where that leaves the four

| | distinguishing claim after item 4 | its cost |
|---|---|---|
| **A** | the name always fits, because nothing constrains it | the name leaves the control that owns its accessible name |
| **B** | nothing worded renders in a header, so nothing can clip | the active lens in a header is an unlabelled chip — R1's cost, in a second place |
| **C** | none; it is the status quo | the word clips by 36.9px at `AppHeader`'s width |
| **D** | the word always fits *inside its seat* | the widest bar of the four, and per-label measurement |

A and D both make the name fit and differ on where it lives. B makes the question disappear and pays R1's price twice. C pays the clip. **None is chosen** (974).

---

## 3. What was built

### Item 4 — the reflow (969, reopening 926)

**Converged on the fix the correction states, not a second mechanism:** equal flex on every tab and one padding for every state. `PAD_OFF` is retired; `PAD` is 14 everywhere. The correction's note about why flex alone is not enough is load-bearing and is kept in the part as a comment: `flex-basis: 0` under `box-sizing: border-box` cannot take a border box below its own padding, so a wider active padding floors that tab's base size and only the remainder divides equally.

Equal flex applies wherever the track is stretched: `width="fill"`, `compact`, and **dense icon-first**. The last is this pass's one judgement call, and it is named rather than buried: a dense bar sits in a header slot, which is a fixed box, so stretching it there costs nothing and closes the only packing where a dense active seat's word would still move its neighbours.

**One padding for every state means one padding for every seat, not one per seat role.** The first build of this fix kept icon-only seats at 0 and the dense worded seat at 10, and the proof caught it: a 260px dense bar divided **76 / 96 / 76**. The 20px is exactly `2 × PAD_DENSE`. Each seat's `flex-basis: 0` is floored at its own padding and border under `box-sizing: border-box`, so the bases were 2 / 22 / 2 and only the remaining 222px divided equally — the padding difference survived the equal flex intact. That is the correction's own warning arriving one level down from where it was written, and the fix is to make the padding a property of the bar: `PAD` in labels, 0 in icon-first, `PAD_DENSE` in a dense icon-first bar. Every base is then identical and the division cannot carry a content difference.

869's `content` still hugs its content. What `width` no longer decides is whether one tab may take a different width from the rest.

**488 holds.** The active tab's own background is still the indicator; no absolutely positioned chip returns. The proof counts absolutely positioned elements inside every track.

**This moves G37's boundary, as the correction says it will.** The test now prices the layout it decides for:

```
per seat = W + 2·PAD + 2·SEAT_BORDER + (icons ? ICON + ICON_GAP : 0)
need     = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + n · (per seat)
         = nW + 32n + 6          five lenses: 5W + 166
         = nW + 60n + 6          with icons
```

Correction 20's `5W + 118` is superseded. The 48px is the inactive seats' padding going 8 → 14 — five seats at 14 rather than one at 14 and four at 8. A test that prices a layout the part no longer renders is 794's defect in a different disguise, so the arithmetic follows the layout rather than the other way round. **Consequence, measured rather than expected.** The rise is exactly `12(n − 1)` — the inactive seats' padding going 8 → 14 — so **+24px** at three lenses and **+48px** at five. Strand's own consumers are three-lens sets at `W = 70`, needing **312** where they needed 288, and **one of the eight bars changes mode: Feed at 390**, whose 302px column cleared by 14px at correction 20 and is now 10px short. Three glyphs where three words used to be, at the tier most members use. Every row was read off the rendered part and the arithmetic agrees with all eight.

| | column | need at 20 | need at 21 | mode at 21 | margin |
|---|---|---|---|---|---|
| Feed @ 390 | 302 | 288 | 312 | **icon-first** | −10 |
| Feed @ 820 / 1280 / 1440 | 560 / 664 / 744 | 288 | 312 | labels | 248 / 352 / 432 |
| Connect @ 390 | 358 | 288 | 312 | labels | 46 |
| Connect @ 820 / 1280 / 1440 | 616 / 720 / 800 | 288 | 312 | labels | 304 / 408 / 488 |

### Items 2 and 7 — designed together, as instructed

`resolveSeat(iconFirst, dense, on, icons, hasIcon)` is the single place R1 and `dense` meet, and it is **exported as `LensBar.resolveSeat`** so the state table is a table over the real resolver rather than a copy of its rules.

```js
let ico = iconFirst ? true : !!(icons && hasIcon);   // R1 keeps the glyph; `icons` adds it in labels mode
let txt = iconFirst ? !!(dense && on) : true;        // 904 adds the active word back
if (ico && !hasIcon) ico = false;                    // a lens with no glyph can never render one
if (!ico && !txt) txt = true;                        // the empty seat, unrepresentable
```

**Superseded in character by 978 and 984, and the record says so rather than leaving the claim standing.** What is written below was true when `dense` existed: the icon-first branch read `txt = !!(dense && on)` and genuinely resolved R1 against 904 by union. Retiring `dense` collapsed that term to `false`, so the function is now exhaustive by **domination in both branches** — `iconFirst` sets `ico` unconditionally and never reads `icons`; `!iconFirst` sets `txt` unconditionally — and it mediates nothing. The joint guard survives with one live case: `iconFirst` with an iconless lens, reachable only through `compact`, where the seat falls back to its word. Change list item 58 carries the full reading, including what domination is better and worse at than the guarantee item 2 asked for.

Each rule contributes what it **adds** rather than what it removes. That is what makes the pair exhaustive rather than cancelling, and it is why dense-active in icon-first now renders **icon and word** — which is item 7's outcome arriving through item 2's fix, as the correction predicted it would. The second route is `icons` in labels mode, off by default so no existing caller changes.

868 made labels mode label-only because the fit test priced label plus padding and nothing else. The test now prices the glyph and its gap when `icons` is set, so 868's stated reason no longer applies to the state it forbade. That is a narrowing of 868 and it is flagged below.

### Item 1 — the un-latch moves inside the part (939)

Pressing the already-active lens re-opens a collapsed descriptor in the part. `onChange` still fires with the active lens's id, so a caller that un-latches is unaffected; a caller that does not gets the same rendering. Setting `collapsed` true again clears the override, so the caller keeps the latch (405) and the part owns only the un-latch, which is what 939 asks for.

### Item 5 — the probe stops reporting its own overflow

It sat `position: absolute` with no clip and contributed **24px** of measured overflow to the container it was measuring. It now sits inside a 0×0 `overflow: hidden` box: clipped for overflow, still laid out, still measurable by `getBoundingClientRect`.

### Item 6 — the floor (498, 908)

`minWidth: SEAT` on every seat in every mode. A track that cannot fit its seats at 44 scrolls; it does not shrink them. **Strand does not adopt the consuming implementation's 24** in the compact slot: 498 chose that deliberately for that slot, and 905 holds that a lens tab is a standalone thumb target wherever it renders.

### Item 8 — the collapse glyph (732)

Two named glyphs, both rendering with no transform: **`panel-left-close`**, the semantic collapse control for Brief 9's browse rail, and **`chevron-left`**, which is literally what the 180-degree rotation was faking and which the set did not contain. Adding only the first would leave the next consumer rotating `chevron-right` again for the plain case, which is the workaround 732 refuses.

### Item 9 — `compact` comes from the part

`compact` forces icon-first regardless of fit, stretches the track, and renders no descriptor, at the full 44 seat. 905's refusal was of a **32px seat**, not of a compact rendering, so this does not reverse it. The fork ruling 947 describes — a member crossing between a staged header bar and the bundle's surface bar at 72px of scroll — closes when a chassis can mount one part in both slots.

### Item 10 — the part branches on input mode (62)

`components/core/InputMode.jsx`: `useInputMode()` and a render-prop `InputMode`, watching `(pointer: coarse)` rather than reading it once, because a tablet with a keyboard attached changes mid-session. `LensBar` uses it for `title`, which is a pointer affordance — it never opens on touch and it duplicates the accessible name. `aria-label` stays unconditional.

### Item 11 — the bundle's own errors

All three fixed at cause: both `createRoot` calls mount only when a `#root` exists, and `connect.jsx` defines its own `DEMO_IMG` rather than reading a binding `shell.jsx` assigns to `window` after `connect.jsx` has already been evaluated. No demo is removed. **`feed.jsx` has the same `IMG` pattern and does not error**, because its references are inside function bodies rather than at module scope; it is not one of the three and is left alone.

**This needs a G number and one is not reserved here** (638): Code assigns it by writing the entry into `docs/GAPS.md`.

## 5. `dense` is retired (978, reversing 904)

**Ruled on the deciding fact this correction produced:** equal flex fixed seat *positions* and not seat *fit*, so a dense bar at `AppHeader`'s 260px slot gave its active seat 82.7px for 119.6px of content and clipped the lens's word by 36.9px. Of the four options in §2, retiring the mode is the only one that makes that clip **unreachable**; A relocates it, C keeps it, D pays width to avoid it.

What the retirement removes: the `dense` prop, the `PAD_DENSE` constant, and one axis of the state table, which goes **back to eight rows**. What it leaves: `compact` as the only header-slot rendering, icon-first with the active chip keeping its icon under R1.

**One property is worth naming, because it is what makes the reflow unreachable rather than merely fixed.** With `dense` gone, nothing about what a seat renders depends on whether it is selected. The state table shows it directly — all four mode pairs read the same for the active and the inactive seat:

```
iconFirst=0 icons=0  active / inactive  ->  word
iconFirst=0 icons=1  active / inactive  ->  icon + word
iconFirst=1 icons=0  active / inactive  ->  icon
iconFirst=1 icons=1  active / inactive  ->  icon
```
 `resolveSeat` still accepts `on` and deliberately never reads it, so the state table still varies the seat and demonstrates that both rows of each mode are identical. Item 4 made the *division* independent of content; 978 makes the *content* independent of selection. Either alone would have held; together the defect cannot be expressed.

**904 is reversed, and it is a consuming change too.** `AppHeader` was `dense`'s only caller. No Strand component passes it — checked across the project, not assumed — so nothing in this repo changes, and the consuming implementation has a prop to drop. The proof asserts the prop is inert by rendering the same bar with and without it and comparing.

## 6. 981 (superseding 979): was there an honest 10px at 390? **Yes — and it is 41px, not 10**

The Feed's 302px column against a 312px need. The ten pixels were not in the test to be taken out; **they were never owed.**

975 made the test price the layout it renders. It still priced *one* layout for *two* packings:

- Under **`fill`**, every seat takes an equal share, so each must be able to hold the widest label. `n × seat(widest)` is correct there.
- Under **`content`**, every seat is exactly its own label. Charging the widest label for every seat over-prices any bar whose labels differ — and every real bar's labels differ.

The Feed is content-packed. Its three labels measure **64, 70 and 35**:

| | |
|---|---|
| priced at the widest, 3 × seat(70) | **312** against a 302 column → icon-first |
| priced as the seats it renders, seat(64) + seat(70) + seat(35) | **271** against a 302 column → **labels, with 31px to spare** |
| over-price removed | **41px** |

**The Feed keeps its words**, and so does every other Strand bar. Connect at 390 goes from 46px of margin to 90.

**This is not the defect 975 corrected, and the difference matters.** 975's rule is that the test must price the layout it will use. This makes the test price *more* precisely what it will use, not less: the sum is **exact** for content packing, where the widest-based form was an upper bound. No tolerance is added, no term is dropped, and an exact failure still falls to icon-first.

**G36 point 2 is not contradicted either, and it is the obvious objection.** The summing defect is **G36 point 2** in the repo's `docs/GAPS.md`, not ruling 794 — 794 is a merge decision about PR #45 and says nothing about measurement. I cited it wrongly in the first draft of this section and the correction is recorded here rather than silently swapped, because the failure mode of a wrong citation is specific: the next reader looks up 794, finds a merge decision, and either reopens this or stops trusting the rest of the document.

G36 point 2's defect was summing label widths — and summing is exactly what this restores. The distinction is the packing. G36 summed under a layout where seats **share**, so one long label overflowed its own share while the sum said everything fit; its run 239 read "network" at **86px of content inside a 72px share**. Under content packing there are no shares: each seat is its own width, and the sum is what the row measures. **The sum was applied to the wrong packing, not wrong in itself.** Each branch now prices what its own packing renders, which is the same principle 975 states, applied one level down.

**981 writes the condition in.** If a future packing shares, it takes the widest branch and the test is extended — never assumed.

Each seat is floored at `SEAT` in both branches, because `minWidth` floors the rendered seat in both. Without that floor the sum would under-price a bar with a one-character label.

**What this costs.** The test reads every label's width rather than only the widest. The probe already renders a span per lens and already measures them, so there is no new measurement machinery and no second pass — only `Math.max` over the list becomes a sum over the list. `width` now affects the *verdict* as well as the packing, so it joins the measurement's dependency key.

**Read at the stamp:** `PACKING_TEST` eight rows, `mode === predicted` on all eight; `FEED_AT_390` `need_sum: 271`, `need_widest: 312`, `over_price: 41`, `mode: "labels"`, `would_be_at_widest: "icon-first"`. The last field is the one to keep: it records that the bar would have fallen under the widest-based form and did not under the packing-aware one.

## 4. Not touched

949's theme in the frame labels is the app Design project's (663). G41's ink rungs are a D092 brand change. `FacetRail`, `Pane` and `Sheet` do not move. `--target-primary` 44 and `--target-min` 24 stand. `PAD` stays 14 and the padding stays a property of the bar (973); 979 changes what the test *counts*, not what the part *renders*. The track is still 52, composed 4 + 44 + 4 with the `--line` edge as an inset shadow (933). `SEAT_BORDER` is still 1 with `box-sizing: border-box` (934).

## Proof

`screenshots/correction-21/proof.html`. Part 1 is the state table over `LensBar.resolveSeat`, 16 rows, with any empty row drawn in red. Part 2 presses one real bar per packing and reads every seat's `x` and the track's own `x` before and after. Part 3 measures every seat at 360, 390 and 430 in both modes. Part 4 renders `compact`, `dense` and `icons`. Part 5 puts two callers side by side, one that un-latches and one that never does, presses the active lens in each and compares. Part 6 renders both glyphs and reads their computed `transform`. The readout fails loudly on any of the fifteen conditions listed in §0, plus a track that moves, a bar with more than one padding value across its seats, an icon-only seat with no accessible name, and a non-empty `__errors`.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped.** v1789885868097915, from the artifact, with four recorded as read and rejected — the fourth, `v1789884826893810`, for a wrong citation in a comment rather than any functional fault (983). §0 is the pre-fix run against the first.
3. **Item 3 did not stop, and all four options are now priced on one ground** (974). Correction 20 §4's enumeration is the record; it remains unratified, so if Chat's record of the four differs the pricing moves with it. **C no longer exists as an alternative** — its content was accepting a reflow that no longer occurs — and it is restated as the status quo so that choosing it is a choice about the clip rather than about the reflow.
4. **868 is narrowed, not overturned.** Labels mode is label-only *by default*; `icons` makes a labelled seat carry its glyph, and the fit test prices it. 868's reason was the arithmetic, and the arithmetic now covers the case.
5. **Stretching the track for dense icon-first is this pass's call, not the correction's.** It is the one place the correction's "equal flex on every tab" needed a decision about *where* the track is stretched, and a header slot is a fixed box, so it costs nothing there.
6. **The fit test moved twice and the second move gave the first one's casualty back.** 975 took it from `5W + 118` to `5W + 166` and Feed at 390 fell to icon-first. 979 then found that the widest-based form was over-pricing content-packed bars by 41px on the Feed, and Feed at 390 keeps its words. Both moves are in the same direction — price what is rendered — and the net effect on Strand's own kit is **no bar changes mode**. A consumer reading only the first move would plan for a fall that does not happen.
7. **Item 11's count is wrong in the correction (972) and the G number is still unreserved** (638).
8. **978 reverses 904 and is a consuming change.** `AppHeader` was `dense`'s only caller; no Strand component passes it. The reversal is named in the ruling rather than slipped through, and the prop is left inert rather than throwing, so a consumer that still passes it renders correctly while it is removed.
9. **981 restores summing, which G36 point 2 forbade — under the other packing.** This is the flag most likely to be misread later. G36 was right: summing under a packing where seats share is wrong, and its run 239 measured it at 86px of content inside a 72px share. Summing under a packing where each seat is its own width is exact. **981 writes the condition in:** if a future packing shares, it takes the widest branch and the test is extended, never assumed.
10. **The summing defect is G36 point 2, not ruling 794.** The first draft of §6 cited 794, which is a merge decision about PR #45. The objection-handling survived checking and the citation did not. It is corrected in the part, the types, the prompt, the change list and here, and recorded rather than swapped silently: a wrong number is worse than none, because the next reader looks up 794, finds nothing about measurement, and either reopens this or distrusts the document around it.
11. **Equal flex fixed the movement and exposed a fit.** A dense bar at `AppHeader`'s 260px gives its active seat 82.7px for 119.6px of content and clips the word by 36.9px. No Done Means line fails on it and it is not a regression — the seat was equally unable to hold the word before, while also moving — but it is the axis §2 now prices the four options on, and it is the first record of it.
8. **The index is corrected and its standalone re-bundled in the same turn** (848).

## Files

`components/dna/LensBar.jsx`, `LensBar.d.ts`, `LensBar.prompt.md`; `components/core/InputMode.jsx`; `assets/icons/panel-left-close.svg`, `assets/icons/chevron-left.svg`; `ui_kits/dna/app.jsx`, `ui_kits/dna/composer/proto.jsx`, `ui_kits/dna/connect.jsx`; `screenshots/correction-21/proof.html`; `Strand.html` and `Strand index (standalone).html` (848); `export/_ds/LENSBAR-CHANGES-14-16.md` (extended with items 46 to 54, not replaced); `export/_ds/README-EXPORT.md`; `export/_ds/_ds_bundle.js` (re-marked at v1789880372619731, body untouched), `_ds_manifest.json`, `styles.css`, `tokens/` (5 files) and `assets/icons/` (2 new glyphs); this file and its export copy (876, 899). The export is delivered as **one archive**, not a folder (663).
