# Strand correction 24, ruling 1055 with 1060, 1061 and 1064: the rail's heading slot, wrapping options, per-axis single, the Home ladders, Select's hint and error, and the pane's one-slot list

**23 September 2026, session 31. For Chat to ratify under 129.** Governed by 129, 561, 586, 589, 597, 604, 607, 612, 638, 663, 687, 718, 725, 732, 848, 855, 873, 876, 899, 927, 928, 944, 1038, 1054, 1055, 1060, 1061, 1064. Sources: G72, G75, G76 (verbatim from `docs/GAPS.md` at `1463b5c`, relayed), DESIGN-BRIEF-31-E.md (1064).

Opened on a read. Scope is the six changes and nothing else. **Everything here about Discovery, the shell and `docs/GAPS.md` is relayed data**; the app project was not opened, read from or cited (663). **G78 is not drawn:** the page PR has not landed, and the brief's clause is conditional on it (1054 rides, undrawn).

**Compile.** **v1790160131064912**, read from the compiled artifact after the pass (873). It supersedes `v1790157541616309` (correction 23), which is the state every "before" below was read from. **Three compiles were read and rejected on the way:** `v1790159207460636`, `v1790159613815981` and `v1790159963695509`, each failing 1064's list-width check for the reason §6 records. Correction 23 keeps its id; nothing is re-dated (855).

> **Stamped 23 September 2026**, session 31, against **v1790160131064912**. Readouts at the stamp: `G72: control on the heading line = Collapse browse, textContent ""`; `G72: control shares the h2 row = true`; `G72: empty slot renders nothing = 1` child; `G75: nav border box / content width at 240 = 240 / 198`; `G75: widest chip inside the content box = 198.0 <= 198`; `G75: widest chip right edge vs nav content-box right edge = 811.0 vs 811.0 (0.0px inside)`; `G75: "Cultural, heritage and religious" wraps = 3 lines, nowrap=normal`; `G75: nav scrollWidth equals clientWidth = 238 / 238`; `G76: roles per axis = when:radiogroup home:radiogroup format:group price:group family:group`; `G76: 4 radios / 3 toggles`; `G76: choosing in When replaces = This month`; `G76: toggling in Format adds = In person,Online`; `G76: Clear all clears the single axis too = 0`; `1060: one home, rungs in order = In Accra · Around Accra · Greater Accra · Ghana · Anywhere`; `1060: two homes, two ladders, both labelled = 2, Accra/London`; `1060: digit scan of the two-home ladder text = 0 digits` across eleven labels; `1060: 64 strip, Home square pressed when a rung is set = 64px, aria-pressed=true`; `1061: hint described-by and coloured --ink-3 = rgb(119,115,108)`; `1061: error described-by, aria-invalid, border and line match = true`; `1064: list node is the same element after close = true`; `1064: lane keeps its sideways scroll = 400 → 400`; `1064: list width open → closed (grid width) = 360 → 844 (844)`; `1064: closed pane is inert, hidden, no close control = inert=true aria-hidden=true buttons=0`; `1064: same element after reopen, scroll kept = true, 400`; `1064: motion is opacity on the section at --dur-slow; the track snaps = section transition=opacity, visibility 0.3s, 0s; grid transition=all` (the grid's `transition` is the initial `all 0s`, nothing animates on it); `no count or number in any rail = none`; `bundle __errors = 0`; **`ALL_CHECKS: yes`**.

---

## 0. Before, read from `v1790157541616309`

| what was checked | reading |
|---|---|
| a slot on FacetRail's heading line | **none**; the heading is a bare `h2` (G72) |
| a chip's `white-space` | **`nowrap`** on every option (G75) |
| per-axis selection model | **none**; `single` is rail-wide (`mode`) or the strip's (`select`), and an axis is `group` of `aria-pressed` toggles (G76) |
| named rungs inside an axis | **no field**; options are a flat list |
| `hint` or `error` on Select | **neither**; Input has both |
| a closed Pane | **none**; `selected={false}` still lays the pane column and renders `empty` |

## 1. G72: the heading action slot

`headingAction?: ReactNode` on the rail form. The heading becomes a flex row: `h2` at `flex: 1`, the slot at `flex: none` to its right, `minHeight: 44` so a 44 `IconButton` does not push the label, and the row's top and right margins pull back by `--space-2` so the control's box sits flush with the nav's padding while the label stays where it was. Absent, the row holds the `h2` alone and the heading measures as before. Strand ships no control; the caller passes 944's `IconButton name="panel-left-close" label="Collapse browse"`, with no visible word. The collapse glyph is the one correction 21 added (732).

## 2. G75: an option wraps

`white-space: nowrap` is removed from the chip. It gains `lineHeight: var(--text-s-lh)`, `textAlign: left`, `overflowWrap: anywhere`, `maxWidth: 100%`, and its padding becomes `--space-2 --space-4` so a multi-line chip has the same inset above and below as a one-line chip has at its ends; `minHeight: 36` still holds the one-line height. At the 240 rail the nav's border box is **240** and its padding leaves **198** of content (`--space-5` each side inside a 1px border), which is G75's own number. "Cultural, heritage and religious" wraps to **three** lines at 198 (not two: the 15px medium face fits "Cultural, heritage" and "and religious" only with the pill's 16px end padding taken off each side), the widest chip's right edge sits exactly on the content box's right edge (**0.0px inside**, 811.0 against 811.0 in the readout's frame), and the nav's `scrollWidth` equals its `clientWidth`. **The three-line wrap is at the medium rail only.** 1082 opens the expanded rail at 280, where the label fits on two. Accepted at medium: a wider medium rail takes width from the one column medium has. **A copy option for the founder, not a Strand fix:** the family label could read "Heritage and religious" if three lines offends; that is a change to 1038's nine names and needs a ruling. Strand does not shorten it. G75's other way out, a Design ruling on the rail's width, is not needed and not taken.

## 3. G76: per-axis single

`select?: 'single' | 'multi'` on the `FacetAxis` config type, default multi. A single axis renders `role="radiogroup"` with `role="radio"` and `aria-checked` options and a roving `tabIndex` (the checked option, or the first when none is), and choosing **replaces** the axis's value: `{ ...value, [axis.id]: [optionId] }`. The rail's other axes are untouched `group`s of `aria-pressed` toggles, and Clear all clears the single axes with the rest. The rail-level `select` stays exactly what 718's addendum made it, the collapsed strip's declaration; `mode="single"` stays the Hub's rail-wide control. Arrow keys still move focus only (718).

## 4. 1060: the Home ladders

`ladders?: FacetLadder[]` on `FacetAxis`: `{ id, label?, rungs: FacetOption[] }`. A rung is an option and selects like one, under whatever `select` the axis declares. When `ladders` is present `options` is not rendered. Each ladder is a wrapping row of its rungs in ladder order; with more than one ladder each row is headed by the ladder's label in `--text-xs --ink-3` (the home's city), and with one ladder no sub-label renders because the axis label already says Home. **Never numbered:** the proof scans every rung label and ladder label in the two-home axis for a digit and finds **0 across eleven labels** (Accra, In Accra, Around Accra, Greater Accra, Ghana, Anywhere, London, In London, Around London, Greater London, United Kingdom). Strand ships no rung names; the proof's are relayed from 1060: "In {city}", "Around {city}", "{region}", "{country}", "Anywhere". **One reading is the draw's:** with two homes, "Anywhere" is one rung with one id shared by both ladders, so setting it lights both rows. Anywhere is not Accra's anywhere or London's; a caller that disagrees passes two ids. Four forms drawn: the 260 expanded rail, the 240 medium rail, the compact Sheet, the 64 collapsed strip (927, 928), where the Home square tints when a rung is set, unchanged from 725.

## 5. 1061: Select's hint and error

Copied from Input, not re-derived: `hint` a 13px line in `--ink-3` under the control; `error` the same line in `--danger`, the border `--danger`, `aria-invalid`, error replacing hint. Two things Input has that Select did not and now does, because they were the form Input had: `aria-describedby` tying the line to the control, and the focus rendering (`--surface` ground, `--ink` border). No other change to Select.

## 6. 1064: the pane's one-slot list (brief 31-E)

**The method, since the brief asks for it rather than a prop name.** One grid, always, with the list column its first child and the pane section its second in both states, so React reconciles the same two children and never remounts either. Open: tracks `minmax(0, --pane-list-width) minmax(0, 1fr)`, gap `--pane-gap`. Closed: tracks `minmax(0, 1fr) 0`, gap 0, so the list takes the full content width; the section is `inert`, `aria-hidden`, `opacity: 0`, `visibility: hidden` after the fade, and renders neither its body nor its cluster, so there is no close control and no divider. **The track snaps between the two states and is not animated.** The section's opacity moves at `--dur-slow` (589), both ways, and `visibility` flips at the end of the close and the start of the open so the section is never hittable while fading. **The Pane's close motion does not depend on a measured width, a ResizeObserver, or a paint.** That is a tradeoff and it is stated as one: the list column jumps from 360 to full width in one frame while the pane fades, rather than sliding.

**Three builds that animated the track were read and rejected**, and the record keeps them because the failure is the kind a consumer porting the part would hit again. `v1790159207460636` transitioned `grid-template-columns` between two `minmax()` lists; `v1790159613815981` gave the section a `width: calc(100cqw - …)` and transitioned that; `v1790159963695509` measured the grid with a ResizeObserver and transitioned a px width. In all three the readout, 700ms after close on a 300ms transition, read the list column at **360** where 844 was expected: the interpolated value was held at its start. The first is explained (two track lists with `minmax()` are not interpolable). **Two candidate causes for the second and third were checked before this stamp, per instruction, and both are eliminated.** (1) The list element carries no width of its own: its inline style is `min-width: 0` only and its computed 360 came from the track, so no build was defeated by a self-sized list. (2) The readout samples 700ms after the toggle on a 300ms transition, well past `--dur-slow` plus a frame and not on the toggle's tick; and on the snap build a probe 50ms after the toggle already read the list at 844, so the sampling is not stale. The three failures remain unexplained at the part level; what is known is that the inline styles flipped and the computed track did not settle within 700ms in the readout's environment. Rather than a fourth attempt, the track no longer animates, per instruction; a part whose motion needs a runtime measurement to work is the wrong tool inside a design system anyway. If Chat wants the track to slide, that is a separate ask and it should be priced against this record. One geometry note so the 844 is not misread: the readout's grid is 844 wide, not the fixture's declared 1248, because the fixture sits in a wrapping flex row that shrinks it; 844 is the grid's real width and the list reaches all of it.

**Why this and not a conditional pane.** A conditional section would change the grid's child count, which is a different element tree, which is the bug the brief describes one level up. Zero-width track and inert section is the smallest expression of "closed" that keeps the tree fixed.

**How it is expressed to the caller: `open`, default `true`.** Every existing caller is unchanged. `selected={false}` keeps its meaning, an open pane on its own empty state, and is drawn beside the closed pane so the two are not confused. 607's cold arrival works closed or open, since `listFallback` renders into the same slot. Below `--tier-expanded` `open` does nothing; the pane is its own route (561).

**Proof that the node is the same element:** the readout holds a reference to the lanes node, scrolls a lane 400px sideways, closes, reopens, and asserts identity and `scrollLeft` at each step.

## 7. Not touched

LensBar, Sheet, IconButton, PostCard (23's `selected` is used by the proof and unchanged). Rail geometry: the nav's padding, radius, shadow and sticky position. `mode`, the strip, `trigger`. G78 (1054): undrawn by instruction. `--pane-list-width` 360 and `--pane-gap`. No count, badge or number anywhere: the readout greps every rail for a digit.

## Proof

`screenshots/correction-24/proof.html` (gallery), `readout.html` (measurements), `shared.js` (fixtures). Labels in 949's form on `data-screen-label`: tier · input · width · theme. Frames: G72 filled and empty at 260; G75 at 240; G76 at 260; the ladders in four forms with one home and two; Select and Input side by side at 390 touch and 640 pointer; Pane closed and open at 1280 pointer and 1440 touch, cold arrival and empty selection at 1280. Both themes throughout.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped**, above (873).
3. **1064's expression is `open`, default true.** The brief left the name to Design; `open` is chosen because Sheet and the compact rail already use `open` for the same fact, and the default keeps every caller.
4. **"Anywhere" is one rung across two ladders.** §4. The draw's reading, reversible by the caller passing two ids.
5. **G75 is closed by wrapping, not by widening the rail.** The gap offered either; the rail's width is not reopened.
6. **Select's focus rendering arrived with hint and error** because it was part of "the form Input has". Named so nobody reads it as scope creep.
7. **G78 undrawn** (1054). The brief's clause was conditional and the condition (the page PR) has not been met.
8. **Correction number 24**, following 23 in this session.
9. **Three 1064 builds failed their own readout and were not stamped; the track no longer animates.** §6. **The Pane's close motion does not depend on a measured width, a ResizeObserver, or a paint.** Ratify the tradeoff by number: the list snaps to full width, the pane fades. Both readout-side explanations for the three failures were tested and eliminated before this stamp, so the snap build passes on a readout known to be live.
10. **"Cultural, heritage and religious" wraps to three lines at medium, two at 1082's 280 expanded rail.** §2. Accepted at medium. The copy option ("Heritage and religious") is the founder's and changes 1038; Strand does not shorten it.
11. **Two measurements go into the ratification as read:** the widest Category family chip's right edge at 0.0px inside the nav's content box at the 240 rail; zero digits across the eleven labels of the two-home Home ladder.

## Files

`components/dna/FacetRail.jsx`, `FacetRail.d.ts`, `FacetRail.prompt.md`; `components/core/Select.jsx`, `Select.d.ts`, `Select.prompt.md`; `components/dna/Pane.jsx`, `Pane.d.ts`, `Pane.prompt.md`; `components/dna/pane.card.html` (one state added); `screenshots/correction-24/proof.html`, `readout.html`, `shared.js`; `export/_ds/` (bundle re-marked, manifest, styles, this file, `README-EXPORT.md` header); this file and its export copy (876, 899). The export is delivered as **one archive** (663).
