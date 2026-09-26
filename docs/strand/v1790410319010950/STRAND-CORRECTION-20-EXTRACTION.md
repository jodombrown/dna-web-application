# Strand correction 20: R1 compiled, the seat's border, the collapsed descriptor, and `dense` left open

**18 September 2026, session 26, handoff 26-G. For Chat to ratify under 129.** Governed by 129, 405, 488, 587, 663, 848, 855, 873, 876, 899, 903, 904, 908, 926, 933, 934, 935, 936. Opened on a read, not on drawing.

**Everything in this correction about the app repo is relayed data**, taken from handoff 26-G and labelled as such at each use. The app project was not opened, read from or cited (663).

**Compile.** `_ds_bundle.js` **v1789787827785362**, read from the compiled artifact after the pass, not written ahead of it (873). It supersedes v1789777129769061. One compile was **read and rejected** on the way here: **v1789777129769061** itself, correction 19's, against which this proof reads `R1_COMPILED: "NO"` and `SEAT_BORDER_COMPILED: "NO · 0"` — the correct signal that an artifact predates the pass. The export copy carries the id in its own `@ds-compile-id` header and on `window.__DS_COMPILE_ID` (854, 861). Corrections 16 through 19 keep `v1789619870985180`, `v1789720800167997`, `v1789753250587142` and `v1789777129769061`; nothing is re-dated (855).

> **Stamped 18 September 2026**, session 26, against **v1789787827785362**, with the proof reading yes on every check: `R1_COMPILED: "yes · the active seat keeps its icon and renders no word"`, `ICON_FIRST_SEATS` active 1 icon / no text / `aria-label` present and inactive the same, `LABELS_MODE_ICON_COUNT: 0`, `SEAT_BORDER_COMPILED: "yes · 1px on every seat, transparent"`, `TRACK_BORDER_COMPILED: "yes · 0 (933)"`, `GEOMETRY_933_HELD` seat [44] / track [52] / track padding [4] — the `box-sizing` guard tested with the border actually compiled — `FIT_TERMS.five_lens_at_W70: 468` with `residual_difference: 0`, `MOVES_ON_SELECTION.icon_first.moves: false` at `max_shift: 0`, `.labels.max_shift: 12` with its cause named, `COLLAPSED_STATE` 8 seats / 8 named / no rendered text / descriptor absent collapsed and present recovered / 4 live frames, `ABSOLUTE_IN_TRACK: 0`, `MODE_CHANGED_BY_20: "none"`, `DENSE_CHOSEN: "none"`, `ALL_CHECKS: "yes"`. Confirmed by reading the exported file: `SEAT_BORDER = 1`, `boxSizing:'border-box'` on the seat, `const iconOnly = iconFirst && !(on && dense)`, and no icon-plus-label rendering anywhere.

> **Readouts this stamp required, kept for the next reader.** `R1_COMPILED: "yes"`, `ICON_FIRST_SEATS.active` 1 icon / no text / an `aria-label`, `LABELS_MODE_ICON_COUNT: 0`, `SEAT_BORDER_COMPILED: "yes · 1px"`, `TRACK_BORDER_COMPILED: "yes · 0"`, `FIT_TERMS.five_lens_at_W70: 468` with `residual_difference: 0`, `MOVES_ON_SELECTION.icon_first.moves: false`, `COLLAPSED_STATE` 8 seats / 8 named / no rendered text / 4 live frames, `ABSOLUTE_IN_TRACK: 0`, `MODE_CHANGED_BY_20`, `DENSE_CHOSEN: "none"`, `ALL_CHECKS: "yes"`.

---

## 1. R1 is compiled — **936**

**In icon-first mode the active seat keeps its icon instead of swapping to its word.** That is the whole of it. Every seat in that mode is one 44px icon, and the active state is the chip alone.

The change is smaller than the candidate's name suggested, and the reason it works is worth keeping in the record: the defect existed only where the active seat's *content* differed from its neighbours'. R1 removes the difference rather than compensating for it. Above compact every seat already carries its word, so no compensation was ever needed there.

Consequences in the part:

- The icon-plus-label rendering no longer exists anywhere. Labels mode is label-only (868); icon-first is icon-only (936). One line carries it: `const iconOnly = iconFirst && !(on && dense)`.
- Every icon-only seat, the active one included, carries its lens label as `aria-label` and `title`. The accessible name is unchanged in both modes, so screen reader users lose nothing; the cost is sighted members at 390.
- The active lens is named by the `scope` descriptor beneath the track.
- **488 stands.** The proof counts absolutely positioned elements inside every track and asserts zero — an assertion about the effect, not about a label. That check is kept.

### What R1 does not close

**Labels mode still moves 12px on selection**, and the handoff's premise that selection changed nothing but the chip above compact does not survive measurement. Read at a 616px column, the three selection states put the seats at:

| state | Everything | My network | Saved |
|---|---|---|---|
| `Everything` active | 4-96 | 98-183 | 185-236 |
| `My network` active | 4-84 | 86-183 | 185-236 |
| `Saved` active | 4-84 | 86-171 | 173-236 |

The cause is the active seat's 14px of side padding against an inactive seat's 8 — **exactly 12px a boundary**, which is `2 × (PAD_ON − PAD_OFF)`. It is not R1's to close and it is not a new defect: it has been true since 903 set those values. Closing it is one value, `PAD_OFF = PAD_ON`, and **903 owns both**, so this pass measures it and leaves it. The proof reports it under `DONE_MEANS_2` rather than burying it in a pass, and fails only if the shift exceeds the 12px the split accounts for — anything beyond that would be an unexplained defect rather than the known residual.

So Done Means 2 is **met in icon-first and not met in labels mode**, stated that way rather than rounded to "met".

## 2. The seat's border is 1px — **934**

`border: 1px solid transparent`, not correction 19's `0px solid transparent`.

Relayed data: `LensBar.tsx` line 278 gives the real seat `1px solid transparent` when enabled and `1px dashed var(--line-strong)` when disabled, under `border-box`, and line 203 gives the probe the same 1px. So the transparent border is **load-bearing** — without the placeholder the seat would change width on disable — and the repo's `5W + 118` is exact rather than an over-price. The question correction 19 left open (§3: over-price or exact, unresolvable across 663) is answered: **exact**.

Strand's terms become active `W + 30`, inactive `W + 18`:

```
need = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + (W + 2·PAD_ON + 2·SEAT_BORDER) + (n−1)(W + 2·PAD_OFF + 2·SEAT_BORDER)
       TRACK_PAD 4, TRACK_BORDER 0, SEAT_BORDER 1, PAD_ON 14, PAD_OFF 8, GAP 2

     = nW + 38 + 20(n−1)        five lenses: 5W + 118
```

**The two implementations converge at zero**, closing a number that ran 60 (902), 50 (913), 10 (19) and 0 now.

**A correction to my own arithmetic, before it propagates.** The first form I wrote for this was `nW + 40 + 20(n−1)`, which is 2px high; the constant is **38**, not 40. `nW + 38 + 20(n−1) = nW + 20n + 18`, and at n=5 that is `5W + 118`. The bad form was caught by the proof asserting the five-lens term rather than restating it, which is the reason that check exists.

**Strand reaches `5W + 118` by the arithmetic, the repo by the probe.** The repo's probe carries the border, so its measured `W` is already 2px wide and no term is added. Strand's probe stays a bare `<span>` measuring a content width and `2 × SEAT_BORDER` is added once per seat in the test. Both land on the same number by different routes. **Giving Strand's probe a border to "match" the repo would double-count it** and put `need` 2px per seat high. The part carries that warning at the probe.

**A trap the seat's border sets, and the line that closes it.** `all: unset` resets `box-sizing` to `content-box`. Under it a 1px border would put the seat at **46** and the track at **54**, silently breaking 933's ruled 52 — a vertical regression produced by a horizontal change. The seat takes `boxSizing: 'border-box'` with the border, under which the height stays 44 and the track 52 while an auto-width seat is still 2px wider, which is exactly the +2 the test adds. The proof asserts the seat at 44 and the track at 52 so this cannot regress quietly.

The track keeps no border (933). Only the seat's term moved.

## 3. The state R1 is hardest in — drawn

R1's stated cost is eight unlabelled icons at the tier most members use. It is worse in one state, and the state is drawn rather than described.

**The descriptor collapses on scroll and latches.** A member who has scrolled at compact sees eight icons they cannot read and no line naming the active one, so the chip marks a **position among icons** rather than a name. Drawn at 390 with eight lenses, both themes, both input modes: the collapsed state, the recovered state beside it, and a live frame where the recovery tap actually runs.

**The recovery.** Tapping the active lens fires `onChange` with its own id. The lens does not change, and that call is the caller's cue to un-latch. No new prop: 405 keeps the latch the caller's state, and the bar already fires on the active tab. The proof's live frame exercises exactly that path — one tap, descriptor back, `value` still `saved`.

Accessible names are unaffected: the proof asserts all eight seats carry both `aria-label` and `title` and that the icon-only track renders no text at all.

## 4. `dense` under R1 — reported, not chosen

904 adopted `dense` as a mode in which the active lens suppresses its icon and reads as its name. **That is exactly the content difference R1 removes**, and `AppHeader` passes it, so under R1 a `dense` bar in icon-first still reflows — in a header slot. Compiled behaviour is unchanged pending a ruling: `dense` behaves as 904 defined it, and the proof measures the conflict rather than hiding it (`DENSE_UNDER_R1`: active 0 icons and its word, inactive 1 icon and none).

Four options, each with its cost. **None is chosen.**

| | what it does | what it costs |
|---|---|---|
| **A** — the name leaves the seat | In a `dense` bar the active lens's name renders **beside** the track in the header slot; every seat stays an icon. | The variable width moves one box outward rather than away — the header slot must hold a name whose width changes with the lens. It no longer moves *seats*, which is the whole of the constraint, but the row is not fixed-width either. |
| **B** — `dense` is retired | One rendering everywhere; the descriptor already names the active lens. | `AppHeader` loses the prop it was given eleven rulings ago, and the descriptor sits *below* the track where a header has no room. Nothing to rule again. |
| **C** — `dense` keeps 904 and accepts the reflow | Zero change. 904 stands untouched. | The defect 926 found stays live wherever `AppHeader` passes `dense` at a narrow column: a chassis defect reintroduced by a prop on one surface, which is the shape of thing 900 ended for `PostCard`. |
| **D** — `dense` reserves the word's width | The R2 candidate applied to the dense seat only: the seat is laid out at its worded width in every state and the word paints only when active. No reflow, and the name stays in the seat. | The dense bar is as wide as the sum of every seat's worded width — in a header slot, the widest thing on the row — and inactive seats show slack around their icons. |

**Against Chat's lean, since it asked to be argued with.** The churn objection to A — that it moves `dense` back toward the caller-side concern 871 deferred and 904 withdrew — is weaker than it looks. 871's return rested on a control that **drops the tablist and so drops the switch**; that is the distinction 904 withdrew it on. Option A keeps the tablist, every lens, `aria-selected` and the switch. Only the location of one string moves, from inside the active seat to beside the track. A is still on the mode side of 904's line, so adopting it is not a reversal of 904 — it is 904 with the name placed where R1 leaves room for it. The real cost of A is the one in the table: the width variability is relocated, not removed.

**D is the option nobody named**, and it is the only one that keeps `dense`'s purpose, keeps the name inside the seat and moves nothing. It pays in width alone.

## 5. The fit test moves twice — and only one of them is a mode boundary

The two moves are different kinds, and collapsing them would mislead the next reader.

**Move 1 — the verdict boundary, +2px per seat.** 934's border raises `need` from `nW + 36 + 18(n−1)` to `nW + 38 + 20(n−1)`, which is `+2n`: +6 at three lenses, +10 at five, +16 at eight. This one *can* flip a bar from labels to icon-first.

**Move 2 — the overflow boundary, −79px at eight seats.** R1 does **not** move the verdict boundary: the test prices the labels hypothesis, and whether labels fit is unchanged by what icon-first renders. What R1 moves is how wide icon-first *is* once chosen. An icon-first bar was `(active worded seat) + (n−1)×44 + gaps + 8`; it is now `n×44 + gaps + 8`. At eight lenses that is roughly 453 → 374, the ~79px the handoff names. A bar that scrolled in icon-first may now fit without scrolling. No bar changes **mode** because of R1.

### Per consumer, per tier

Strand's own consumers are **Feed** (three lenses, laid `flex:1` beside a filter button, so its column is narrower than the tier's) and **Connect** (three lenses, full column). `app.jsx`'s Mobile/Desktop switcher carries **no icons**, so `canSwitch` is false and it can never switch mode — unaffected by both moves. **Convene imports no LensBar** (587). Columns are measured from the rendered frame, not assumed.

| consumer | tier | column | need at 19 | need at 20 | mode | margin at 20 |
|---|---|---|---|---|---|---|
| Feed | 390 | 302 | 282 | 288 | labels | **14** |
| Feed | 820 | 560 | 282 | 288 | labels | 272 |
| Feed | 1280 | 664 | 282 | 288 | labels | 376 |
| Feed | 1440 | 744 | 282 | 288 | labels | 456 |
| Connect | 390 | 358 | 282 | 288 | labels | 70 |
| Connect | 820 | 616 | 282 | 288 | labels | 328 |
| Connect | 1280 | 720 | 282 | 288 | labels | 432 |
| Connect | 1440 | 800 | 282 | 288 | labels | 512 |

**No Strand consumer changes mode.** Feed at 390 is the one to watch: it clears by 14px where it cleared by 20, so it is the bar a longer label or a wider filter control would tip first. The relayed consumers (`AppHeader`, B2, B4) cannot be measured here (663) and the README states the rule rather than their rows: **+2n on `need`, and a bar whose margin was under 2n flips to icon-first.**

## 6. Not touched

`FacetRail` and `Pane` do not move (906, 851). `c`, `label`, `collapsed` and `width` are unchanged. `compact` is still not declared. The track is `4 + 44 + 4` with no border and `--line` as an inset shadow (933), unrevisited. The padding stays 14/8 and `PAD_ON_DENSE` 10. `--target-primary` 44 and `--target-min` 24 stand; `--touch-min` is not reintroduced.

## Proof

`screenshots/correction-20/proof.html`. Part 1 is the compile: labels mode beside icon-first at both themes, with the active seat's icon count, rendered text and accessible name read off the bar, the seat's and track's border widths, and the same bar with `dense` so the conflict is visible. Part 2 measures selection in **both** modes at the same left and right readings that found the defect. Part 3 is the collapsed-descriptor compact state at eight lenses, both themes, both input modes, with a live recovery frame. Part 4 re-measures every mode boundary per consumer and per tier and compares the rendered mode against the arithmetic. The readout fails loudly if the active icon-first seat draws other than one icon or renders any word, if it has no accessible name, if a labels-mode bar draws an icon, if any seat's border is not 1px or the track's not 0, if the five-lens term is not `5W + 118`, if a seat moves in icon-first, if a seat moves in labels mode by **more** than the 12px 903's split accounts for, if an absolutely positioned element appears inside a track, if the collapsed frame renders a descriptor or any text or fewer than eight named seats, if the live recovery frame is not drawn four times, if the arithmetic and the rendered mode disagree, or if the boundary matrix is not eight rows.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped.** v1789787827785362, from the artifact, with correction 19's v1789777129769061 recorded as read and rejected for predating this pass. It is carried in this document's stamp block, the change list's id line, `export/_ds/_ds_bundle.js` (header and `window.__DS_COMPILE_ID`), `export/_ds/README-EXPORT.md` and the index (848). Nothing in corrections 16 through 19 is re-dated (855).
3. **Done Means 2 is met in one mode, not two.** Labels mode still moves 12px, and the handoff's premise that there was never a reflow above compact is measurably false. The fix is one value and **903 owns it**, so this pass measures and reports rather than editing a ruled value. If Chat wants it closed, `PAD_OFF = PAD_ON` is the whole change, and it widens every inactive seat by 12px — which raises `need` by `12(n−1)` and would want the boundary table in §5 re-run.
4. **The two implementations now agree by different routes, and the routes must not be merged.** Strand adds `2 × SEAT_BORDER` in the arithmetic; the repo inflates `W` at the probe. Either alone gives `5W + 118`; both together give `5W + 128`. Whoever ports this next is the person most likely to do both.
5. **`dense` is unresolved and the compiled behaviour is the conflicted one.** Until Chat rules, a `dense` bar in icon-first reflows. That is deliberate — reporting a conflict by leaving it measurable beats reporting it in prose — but it means the defect 926 found is live in `AppHeader`'s slot at this compile.
6. **The recovery tap needs no new prop, and that may be worth ruling anyway.** Strand's recovery rides `onChange` firing with the already-active id. A caller that does not distinguish "same id" from "new id" will treat the tap as a no-op and never un-latch. An explicit `onExpandDescriptor` would be unambiguous; this pass did not add one, because 405 makes the latch the caller's and adding a prop to a bar whose props Chat has ruled on four times in three sessions wants a ruling of its own.
7. **`MODE_CHANGED_BY_20` is "none" for Strand's consumers only.** The relayed consumers cannot be measured across 663, so the README states the rule (`+2n`, flip if the margin was under `2n`) rather than their rows.

## Files

`components/dna/LensBar.jsx`, `LensBar.d.ts`, `LensBar.prompt.md`; `screenshots/correction-20/proof.html`; `Strand.html` and `Strand index (standalone).html` (848); `export/_ds/LENSBAR-CHANGES-14-16.md` (extended, not replaced); `export/_ds/README-EXPORT.md`; `export/_ds/_ds_bundle.js` (re-marked at v1789787827785362, body untouched), `export/_ds/_ds_manifest.json`, `export/_ds/styles.css`, `export/_ds/tokens/` (5 files); `guidelines/STRAND-CORRECTION-19-EXTRACTION.md` and its export copy (a dated note appended against §3's constant only, bodies and ids untouched); this file and its export copy, carried as a file and never a folder (876, 899).
