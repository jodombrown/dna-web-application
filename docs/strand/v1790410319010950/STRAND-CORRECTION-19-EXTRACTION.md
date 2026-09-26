# Strand correction 19: the seat at 44, how the 52 is composed, the reflow candidates, and the seat's border

**18 September 2026, session 26, handoff 26-F. For Chat to ratify under 129.** Governed by 129, 488, 498, 610, 663, 848, 855, 873, 876, 899, 908, 909, 913, 918, 923, 926. Opened on a read, not on drawing.

**Everything in this correction about the app repo is relayed data**, taken from handoff 26-F and labelled as such at each use. The app project was not opened, read from or cited (663).

**Compile.** `_ds_bundle.js` **v1789777129769061**, read from the compiled artifact after the pass, not written ahead of it (873). It supersedes v1789753250587142. One compile was **read and rejected** on the way here: **v1789753250587142** itself, correction 18's, against which this proof reads `SEAT_COMPILED: "NO · 38"` and `TRACK_COMPILED: "NO · 46"` — the correct signal that an artifact predates this pass, and the same check that catches a stale bundle in a consuming page. The export copy carries the id in its own `@ds-compile-id` header and on `window.__DS_COMPILE_ID` (854, 861). Corrections 16, 17 and 18 keep `v1789619870985180`, `v1789720800167997` and `v1789753250587142` in their own records; nothing is re-dated (855).

> **Stamped 18 September 2026**, session 26, against **v1789777129769061**, with the proof reading yes on every check: `SEAT_COMPILED: "yes · 44"`, `TRACK_COMPILED: "yes · 52"`, `TRACK_COMPOSITION.track_padding: [4]` and `.track_border: [0]`, `RING_ROOM_IN_SCROLLPORT` required 4 / compiled 4 / rejected-composition 3 / `clipped_at_compiled: false`, `BORDER_TERMS.seat: [0]` and `.probe: [0]`, `PADDING_COMPILED: "yes · 14/8"`, `DENSE_ACTIVE_ICON` active 0 and inactive 1 with dense against active 1 and inactive 1 without, `LABELS_MODE_ICON_COUNT: 0`, `REFLOW_TODAY.moves: true` at a 91px largest shift, `REFLOW_CANDIDATES.{r1,r2,r3}.moves: false` at `max_shift: 0`, `ABSOLUTE_CHIPS_IN_CANDIDATES: 0`, `FRAMES_PER_CANDIDATE` 16 each, `INPUT_MODE_BRANCH: "none · geometry identical at touch and pointer"`, `CANDIDATE_CHOSEN: "none · drawn and returned for a ruling (909)"`, `ALL_CHECKS: "yes"`. Confirmed by reading the exported file: `SEAT = 44`, `TRACK_PAD = 4`, `TRACK_BORDER = 0`, `SEAT_BORDER = 0`, `const TRACK = 2 * (TRACK_PAD + TRACK_BORDER)`, and the track's `boxShadow:'inset 0 0 0 1px var(--line)'`.

> **Readouts this stamp required, kept for the next reader.** `SEAT_COMPILED: "yes · 44"`, `TRACK_COMPILED: "yes · 52"`, `TRACK_COMPOSITION.track_padding: [4]` and `.track_border: [0]`, `RING_ROOM_IN_SCROLLPORT.clipped_at_compiled: false`, `BORDER_TERMS.seat: [0]`, `PADDING_COMPILED: "yes · 14/8"`, `LABELS_MODE_ICON_COUNT: 0`, `REFLOW_TODAY.moves: true`, `REFLOW_CANDIDATES.{r1,r2,r3}.moves: false`, `ABSOLUTE_CHIPS_IN_CANDIDATES: 0`, `FRAMES_PER_CANDIDATE` 16 each, `INPUT_MODE_BRANCH: "none"`, `CANDIDATE_CHOSEN: "none"`, `ALL_CHECKS: "yes"`.

---

## 1. Mechanism A is compiled — **918**

The seat goes **38 → 44**, the track **46 → 52**, the 4px inset on every side stays, and everything below the bar moves down **6**. That is the displacement correction 18's own proof measured for A, in both descriptor states, and nothing in this pass changes it.

### The composition of the 52, which is the thing the port needs

**Compiled: `4 + 44 + 4`.** Four pixels of padding on each side and **no border**. Not `3 + 1 + 44 + 1 + 3`. The repo's port matches **one number: 4.**

The reason is the one the inset exists for. `tokens/base.css` draws `:focus-visible{outline:2px solid var(--focus);outline-offset:2px}`, so a focused control needs 4px clear on every side, and the track is a scroll container (`overflowX:'auto'`). **A scroll container clips at its padding box, not its border box.** A border therefore sits *outside* the clipping region and supplies the ring with nothing. The two compositions are the same 52 and they are not the same 4px of clear room:

| | inset | inside the scrollport | the ring |
|---|---|---|---|
| `4 + 44 + 4` | 4 padding, 0 border | **4** | draws whole |
| `3 + 1 + 44 + 1 + 3` | 3 padding, 1 border | **3** | outer pixel clipped on every side |

So correction 18 §8's arithmetic — "the track supplies it as `padding: 3` plus its own `1px solid var(--line)` border", `38 + 4 + 4 = 46` — is right as geometry and wrong as ring room. Only 3 of Strand's 4 was ever usable, which means **the focus ring has been clipped by one pixel on every lens since Brief 2**. That is not introduced by the seat going to 44; it is found by asking what the 4px is for. Compiling `3 + 1 + 44 + 1 + 3` would have reproduced, at 1px, the exact defect mechanism B was refused for.

What the composition change costs and does not cost:

- The **outer 52 is unchanged**, so A's 6px displacement is unchanged.
- The **leading inset is unchanged at 4** (`3 + 1` and `4 + 0` put the first seat's left edge in the same place), so every left/right reading in this document is comparable to the readings taken before it.
- The fit test's track term is unchanged: `TRACK = 2 × (TRACK_PAD + TRACK_BORDER) = 2 × (4 + 0) = 8`, exactly as `2 × (3 + 1)` was. **No fit-test value moves.**
- The `1px solid var(--line)` edge is **kept**, as `box-shadow: inset 0 0 0 1px var(--line)`. With `box-sizing: border-box` and a zero border, an inset shadow of 1px paints the outermost pixel of the same 52px box the border painted — the same pixel of the same box, painted rather than boxed. It is pinned to the padding box and does not scroll with the track's content.

Both implementations now reach 52 by one route. The 2px that separated them at today's seats (38 here, 36 relayed) was entirely the seat and is retired rather than attributed under **923**; nothing in any LensBar record ever named 38, and it is not `Segment`'s 44, `FacetRail`'s 36 or `Chip`'s 32.

## 2. The reflow — **926**, drawn and returned under **909**

**The defect, measured.** The compiled part, at a 300px column — this sheet's own column, chosen to sit under the three-lens set's 312px need so the set is in icon-first, which is where the founder's readings were taken, and labelled as such on the frame. Each seat's left and right, read against the track's own left edge:

| state | All | Communities | Categories |
|---|---|---|---|
| `All` active | 4-77 | 79-123 | 125-169 |
| `Communities` active | 4-48 | 50-185 | 187-231 |
| `Categories` active | 4-48 | 50-94 | 96-214 |

Against the founder's relayed readings — `All` active 4-81 / 83-127 / 129-173, `Categories` active 4-48 / 50-94 / 96-219 — that is the same bar to within the 4px its own type gives the word "All". **Largest single shift: 91px.** The active seat carries its word (up to ~136px here) against 44px for an inactive one, so every selection re-lays the row and the neighbour arrives under the finger.

**The constraint: selecting a lens moves no seat, and 488 stands.** Correction 18's report attributed the guarantee to Brief 2's absolutely positioned chip. **488 removed that mechanism deliberately**, under W34, because the measured chip depended on a layout read and could be missing on the first frame and on every resize. **No candidate here restores it** — the proof counts absolutely positioned elements inside every candidate's track and asserts zero. The active tab is its own indicator in all three.

**This is a chassis defect, not Convene's.** `src/components/strand/LensBar.tsx` renders the same mode (relayed), so it is live on Connect and Home too.

**The mechanism all three share.** A seat's width must depend only on its own label and never on which lens is selected. Two things make it depend on the selection today: the active/inactive padding split (14 against 8, a 12px swing per boundary even with identical content) and icon-first's content split (the active lens draws icon + word, an inactive lens draws an icon alone, the 79-to-91px swing). Every candidate closes both, and each closes the second differently. **Each candidate is one padding value.**

| | what it does | what it costs | the bar at 300, all states |
|---|---|---|---|
| **R1 · the chip alone** | Icon-first drops the active lens's word too: every seat is a 44px icon and the active state is the pill. The word moves to the `scope` line already sitting under the bar. | Eight unlabelled icons at the narrowest tier. A member who only ever uses 820 and 390 never sees an icon beside its word and never learns which is which. | 4-48 / 50-94 / 96-140 — 144px wide |
| **R2 · the reserved seat** | Every seat is always laid out at its **active** width; an inactive seat hides its word but keeps its room. Nothing moves and the active word survives at 390. | The bar is always as wide as the sum of every seat's worded width, so it scrolls much sooner, and an inactive seat shows visible slack around its icon. | 4-76 / 78-214 / 216-334 — 338px, so the 300 column **scrolls** |
| **R3 · words always** | The labels-fit fallback is retired: the bar never switches to icon-first, and the track scrolls when the words do not fit. | It retires 723's fallback and draws no icon anywhere, so `icon` becomes unused and lenses past the fold are reachable only by scrolling. | 4-48 / 50-158 / 160-250 — 250px, fits |

**None is chosen.** Drawn at four tiers (390, 820, 1280, 1440), both themes and both input modes — 16 frames each, 48 in all — plus a before-and-after at compact showing all three selection states of each. Under **909** whatever is chosen applies at every tier and in both input modes; the proof asserts each candidate measures identically at touch and pointer, which it does because nothing in Strand branches on input mode.

**At 820, 1280 and 1440 the three candidates are the same bar.** The labels-mode half of the fix is one padding value in all three, and they diverge only where the fit test falls to icon-first. That is what makes them 909-compatible rather than tier-conditional: the rule is uniform, and the tier only selects which mode the uniform rule lands in.

## 3. Does Strand's seat carry a border? — **913**. **No.**

`TAB` opens with `all:'unset'`, which resets `border-style` to `none`; a `none` border computes to zero width whatever `border-width` says, so the seat's computed `border-top-width` is **0**. Read off the compiled bar, not off the source: `BORDER_TERMS.seat: [0]`. Strand's probe is a bare `<span>` and carries no border either, so `W` is a content width.

Therefore Strand's `need` is **not** understated, its five-lens term stays **`5W + 108`** (458 at Strand's 70px widest Feed label), and the difference against the relayed repo's `5W + 118` is **10px**, not 60 and not 0. The 10px is the repo's probe, not a seat: a 1px transparent border on the probe, returned by `getBoundingClientRect` under border-box sizing, inflates every `W` by 2.

One thing that follows and is not Strand's to settle: whether that 10px is an **over-price or an exact match** depends on whether the repo's *seat* carries the same transparent border as its probe. If it does, the repo's test is exact. If only the probe does, the repo over-prices by 2px a tab — harmless under 868's upper-bound doctrine, but it is 10px of the disagreement 867 opened. Strand cannot read that (663).

**Both formulas gain an explicit border term**, so the next reader does not have to find it by reading a probe:

```
need = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + (W + 2·PAD_ON + 2·SEAT_BORDER) + (n−1)(W + 2·PAD_OFF + 2·SEAT_BORDER)

Strand:         TRACK_PAD 4, TRACK_BORDER 0, SEAT_BORDER 0   →  nW + 36 + 18(n−1)   →  5W + 108
repo (relayed): TRACK_PAD 4, TRACK_BORDER 0, SEAT_BORDER 1   →  nW + 40 + 20(n−1)   →  5W + 118
```

`SEAT_BORDER` and `TRACK_BORDER` are named constants in the part now, at 0, and the seat carries `border: SEAT_BORDER + 'px solid transparent'` so the term is greppable and not only arithmetic. That is three hidden borders in two afternoons — the track's, the repo's probe's, and the one Strand turns out not to have — and no implementation's arithmetic named any of them.

## 4. Not touched

`FacetRail` and `Pane` do not move (906, 851). `dense`, `c`, `label`, `collapsed` and `width` are unchanged. `compact` is still not declared. The padding stays 14/8 and `PAD_ON_DENSE` 10. The fit test's values are unchanged by this pass — only its terms are named.

## Proof

`screenshots/correction-19/proof.html`. Part 1 is the compile: labels mode and icon-first at both themes with the seat, track, track padding, track border and seat border read off the compiled bar, plus the ring drawn in both compositions of the same 52 with the outline forced inline so the clip is visible in the rejected one. Part 2 is the defect, measured at the reflow column in all three selection states. Part 3 is the 48 candidate frames. Part 4 is the before-and-after at compact. The readout fails loudly — red banner, `ALL_CHECKS` listing each failure — if the seat is not 44, the track not 52, the track padding not 4 or its border not 0, the ring's padding-box room under 4, the seat border term not 0, the padding not 14/8, a labels-mode bar draws an icon, the compiled part does *not* reflow at the reflow column (in which case part 2 is not measuring the defect), any candidate moves a seat, any candidate draws an absolutely positioned element inside the track, a candidate measures differently at touch and pointer, or a candidate is not drawn 16 times.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped.** v1789777129769061, from the artifact, with correction 18's v1789753250587142 recorded as read and rejected for predating this pass. The five places correction 19 names now carry it: this document's stamp block, the change list's id line, `export/_ds/_ds_bundle.js` (header and `window.__DS_COMPILE_ID`), `export/_ds/README-EXPORT.md` and the index (848). Nothing in corrections 16, 17 or 18 is re-dated (855).
3. **The 52's composition changes how the track's line is drawn, which 918 did not rule.** 918 ruled the seat, the track and the inset. It did not rule that the `--line` edge stops being a `border` and becomes an `inset` shadow. That is this pass's call, made because the alternative spends the ring's room; the pixel is in the same place and the fit test is unmoved, but it is a chassis change and it is named here rather than buried in a constant.
4. **The focus ring has been clipped since Brief 2, and this pass is the first record of it.** Correction 18 §8 read the inset as `padding: 3` plus a `1px` border and treated the sum as the ring's room. The border is outside the scrollport. §8's numbers stand; its conclusion about what supplies the ring does not, and a dated note is appended to correction 18's records rather than a rewrite.
5. **Whether the repo's 10px is an over-price or exact is unresolved, and unresolvable here** (663). §3 states both readings.
6. **`REFLOW_COL` is this sheet's column, not a ruled width.** The founder's readings imply a column under the set's need; 300 is chosen to sit under 312 and is labelled on every frame that uses it. If Chat holds that compact's real column is wider than the set's need, then the defect at compact is the 12px padding swing rather than the 91px content swing, and only R1's cost changes — the constraint and all three candidates are unaffected.
7. **R3 retires 723.** It is drawn because it is the only candidate that keeps every word at every tier, and it cannot do that without giving up the fallback ruling 723 created. That is a ruling-sized cost and it is on the face of the candidate, not in a footnote.
8. **The index is corrected and its standalone re-bundled in the same turn** (848).

## Files

`components/dna/LensBar.jsx`, `LensBar.d.ts`, `LensBar.prompt.md`; `screenshots/correction-19/proof.html`; `Strand.html` and `Strand index (standalone).html` (848); `guidelines/STRAND-CORRECTION-18-EXTRACTION.md` and `export/_ds/STRAND-CORRECTION-18-EXTRACTION.md` (a dated note appended against §8 only, bodies and ids untouched); `export/_ds/LENSBAR-CHANGES-14-16.md` (extended with items 35 to 39, not replaced); `export/_ds/README-EXPORT.md`; this file and its copy at `export/_ds/STRAND-CORRECTION-19-EXTRACTION.md`, which the export carries as a file and never a folder (876, 899).

`export/_ds/_ds_bundle.js` (re-marked at v1789777129769061, body untouched), `export/_ds/_ds_manifest.json`, `export/_ds/styles.css` and `export/_ds/tokens/` (5 files) are refreshed with the artifact. Correction 19 changes no token and no stylesheet, so those four carry the same values under the new id.

> **Corrected, 18 September 2026, session 26, by correction 20 (ruling 934).** Appended, not rewritten (855). This file keeps **v1789777129769061**.
>
> **§3's relayed line carries the wrong constant.** It reads `repo (relayed): TRACK_PAD 4, TRACK_BORDER 0, SEAT_BORDER 1 → nW + 40 + 20(n−1) → 5W + 118`. That form gives 5W + **120** at n=5, so the line contradicts its own result. The constant is **38**: `nW + 38 + 20(n−1) = nW + 20n + 18`, which is `5W + 118` at n=5. Strand's own line in that block — `SEAT_BORDER 0 → nW + 36 + 18(n−1) → 5W + 108` — is correct and unchanged.
>
> §3's finding is otherwise unaffected and its answer stands: Strand's seat carried no border at this compile. What §3 left open — whether the repo's 2px was an over-price or exact — is **answered at 20 (934)**: the repo's seat carries `1px solid transparent` and its probe the same 1px, so it is exact, and Strand's seat takes the same border at correction 20's compile. The two implementations converge at zero there.
