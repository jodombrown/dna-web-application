# Strand `_ds/` export — compile `v1790366257373061`

Swap this folder in whole. It is Strand at the correction 27 compile (1118; session 32), on top of correction 26 (1117), correction 25 (663 and 1102 with 1103), correction 24 (1055), correction 23 (1083) and correction 21 (ratified 987).

> **New at v1790366257373061** (correction 28 with correction 29 asks 1 and 2 folded in, 1130). `Pane`: `paneWidth`, `height`, `listHidden`, toolbar (`onToggleList`, `onCopyLink`, `onShare`). `PostCard` discovery: `href` (the face is a link), clamp on a span, gap 8, presenter row 36 pointer / 44 touch, reason row 28 behind a rule, one line; `going`, `onReport`. `FacetRail`: checklist `columns: 2`, `clearPlacement="heading"`. `Menu`: min width 240. `MediaBlock`: ratioed image as one grid cell. New icons `panel-left-open.svg`, `flag.svg`. See `STRAND-CORRECTION-28-EXTRACTION.md`.
>
> Previously at v1790279130697923: `MediaBlock` gallery without `ratio`: rows declared as correction 26 declares them with a ratio, so three and four images fill the 16/10 frame instead of clipping the lower row. Two images: a stated style difference, box sizes unchanged. Everything else identical to `v1790276435314618`. `STRAND-CORRECTION-27-EXTRACTION.md` has the record and the 29 readings.

> **Static check for this id:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1790366257373061 */`; runtime `window.__DS_COMPILE_ID === 'v1790366257373061'`.

---

## Correction 26 (v1790276435314618), carried

It is Strand at the correction 26 compile (1115 carrying 1077; session 32), on top of correction 25 (663 and 1102 with 1103), correction 24 (1055), correction 23 (1083) and correction 21 (ratified 987).

> **New at v1790276435314618.** `MediaBlock ratio` (CSS aspect-ratio form): `image` fills a frame at that ratio with cover and no 420 cap; `gallery` takes it in place of 16/10 with the tiles filling it; `video` takes it in place of 16/9; `link` and `audio` ignore it. Absent, every kind renders as at `v1790212533284400`. No token changes. `STRAND-CORRECTION-26-EXTRACTION.md` has the record and the 53 readings.

> **Static check for this id:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1790276435314618 */`; runtime `window.__DS_COMPILE_ID === 'v1790276435314618'`.

---

## Correction 25 (v1790212533284400), carried

It is Strand at the correction 25 compile (663 and 1102 with 1103; session 31), on top of correction 24 (1055), correction 23 (1083) and correction 21 (ratified 987).

> **New at v1790212533284400.** `PostCard presentation="discovery"`: the fixed-size Convene face, 16:9 media (C glyph when none), two-line title clamp, when, where, presenter and topic, the reason row, one ellipsis control; `feed` unchanged. `Menu` (new): items and rules, danger tone, portal; an item that does not apply is absent, never disabled. `FacetRail` `display` on an axis: `segment` with Any, `checklist`, `combobox` (Place); ladders stay correction 24's part; the heading is sticky in the rail's own scroller. `LensBar trailing`: one seat outside the tablist, priced out of the fit test. `Input` combobox via `suggestions`. Token `--z-menu: 62` (1103). `STRAND-CORRECTION-25-EXTRACTION.md` has the record and the 58 readings.

> **Static check for this id:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1790212533284400 */`; runtime `window.__DS_COMPILE_ID === 'v1790212533284400'`.

---

## Correction 24 (v1790160131064912), carried

Swap this folder in whole. It is Strand at the correction 24 compile (1055 with 1060, 1061, 1064; G72, G75, G76; session 31), on top of correction 23 (1083) and correction 21 (ratified 987).

> **New at v1790160131064912.** `FacetRail`: `headingAction` slot on the heading line (G72); options wrap, no chip is nowrap (G75); per-axis `select: 'single'` on the `FacetAxis` config renders that axis as a radiogroup and choosing replaces (G76), the rail-level `select` unchanged; `ladders` on an axis, named rungs one ladder per home, never numbered (1060). `Select`: `hint`, `error`, `aria-describedby`, Input's focus rendering (1061). `Pane`: `open` (default true); closed, the list takes the full width in the same slot of one tree, the pane section inert and faded over `--dur-slow`, the track snapping and depending on no measurement (1064). G78 undrawn. Three compiles were read and rejected on the way (`v1790159207460636`, `v1790159613815981`, `v1790159963695509`), all on 1064's list-width check; `STRAND-CORRECTION-24-EXTRACTION.md` §6 has the record.

> **Static check for this id:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1790160131064912 */`; runtime `window.__DS_COMPILE_ID === 'v1790160131064912'`.

---

## Correction 23 (v1790157541616309), carried

Strand at the correction 23 compile (ruling 1083, session 31), on top of correction 21 (ratified 987).

> **New at v1790157541616309: Pane steps, PostCard selects.** `Pane` gains `onPrevious`, `onNext`, `previousLabel`, `nextLabel`, `hasPrevious`, `hasNext`, `selectedKey`: one cluster ordered Previous, Next, Close; an edge renders `aria-disabled` in place and never wraps or closes; ArrowLeft and ArrowRight fire on the pane section beside Escape, guarded by an editable target and by `defaultPrevented` (Escape now honours `defaultPrevented` too); `selectedKey` re-runs the bring-into-view against `[data-selected]`, list scroll only. `PostCard` gains `selected`: a 2px `--ink` ring 2px outside the identity frame, `data-selected`, `aria-current`. Nothing else in the bundle changed. `STRAND-CORRECTION-23-EXTRACTION.md` is in this folder.

> The body below is the correction 21 prose, still true.

---

## Correction 21 (v1789885868097915), carried

> **The bundle's own comments and this folder's prose agree.** The previous compile, `v1789884826893810`, was functionally identical and was **held** because its doc comment cited ruling 794 for the summing defect — a merge decision about PR #45 that says nothing about measurement. The defect is **G36 point 2** in `docs/GAPS.md`, whose run 239 read "network" at 86px of content inside a 72px share. Both now say G36.

> **`dense` is retired (978).** The prop is gone and `PAD_DENSE` with it. The header slot keeps `compact`, which renders icon-first with the active chip keeping its icon under R1. **`AppHeader` was `dense`'s only caller**, so this is a change on your side too; the prop is inert rather than throwing, so a page still passing it renders correctly while you remove it.
>
> The deciding fact was measured here: equal flex fixed seat *positions* and not seat *fit*, so a dense bar at a 260px header gave its active seat 82.7px for 119.6px of content and clipped the lens's word by 36.9px. Retiring the mode is the only one of the four options that makes that unreachable rather than managing it.
>
> **The one change that touches every bar: selecting a lens no longer re-lays the row.**
>
> The active tab took `flex: none` at its content width while every other tab took `flex: 1 1 0`, so a selection re-divided the whole track. Measured here at 390 on five lenses, before the fix: seats moved **22.25 / 17.46 / 13.27 / 8.49px** under fill packing and **11.99px** in labels mode, while the track itself moved **0**. After: **0 in every packing**. The fix is equal flex on every tab and one padding for every state — the same one the consuming implementation landed, converged on rather than reinvented.
>
> **`PAD_OFF` is retired, and the padding is a property of the bar, not of a seat's role:** 14 in labels, 0 in icon-first, 10 in a dense icon-first bar. One padding per *role* is not enough. A bar whose glyph-only seats carried 0 and whose worded seat carried 10 divided **76 / 96 / 76** at a 260px track, because `flex-basis: 0` under `box-sizing: border-box` floors each base at that seat's own padding and only the remainder divides equally. If you port this, port the bar-level value, not a per-seat one.
>
> **The fit test moved twice and the net effect is nothing.** It got stricter (it prices the layout it renders) and then more precise (it prices the *packing* it renders). Between them, **no bar in Strand's own kit changes mode.** If you read only the first move you will plan for a fall that does not happen — see **"Which bars change mode"**.

**This id is new.** `v1789885868097915` supersedes `v1789884826893810`. Four compiles were read and rejected on the way: `v1789787827785362`, the pre-fix state; `v1789880167533065`, which divided a dense bar 76/96/76; `v1789880372619731`, which predated 978 and 981; and `v1789884826893810`, for the citation above. Everything from corrections 16 through 20 is still true here: the `document.fonts` re-measure, the zero guard, the scale normalisation, `label`, `c`, `collapsed`, `width`, the 44 seat in a 52 track composed 4 + 44 + 4, `SEAT_BORDER = 1` with `box-sizing: border-box`, and R1's icon-keeping active seat.

## Check the folder before you trust the prose (854)

- **Static:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1789885868097915 */`.
- **Runtime:** `window.__DS_COMPILE_ID === 'v1789885868097915'` after the bundle loads (`window.__DS_NAMESPACE` is `StrandDNADesignSystem_3654dd`).
- If either disagrees with a literal in a page, the folder and the prose disagree.

## One breaking rename, carried from correction 18 (908)

Still the one silent-failure risk in this folder, and still worth the grep if you are coming from `v1789720800167997` or earlier. `--touch-min` is now **`--target-primary`**, value unchanged at 44px. `--target-min` is **not** renamed; ruling 606 locks that name. `var(--touch-min)` resolves to nothing, paints no error, and collapses whatever it sized. Grep for the old name before the swap.

## Which bars change mode

**None of Strand's own.** That is the headline, and it corrects anything you read about the previous compile.

The test moved twice in one session. **975** made it price the layout it renders rather than the old split-padding layout, taking a five-lens bar from `5W + 118` to `5W + 166` and dropping the Feed at 390 into icon-first. **981** then found that form was still pricing one layout for two packings, and the Feed came back.

```
seat(w) = max(SEAT, w + 2·PAD + 2·SEAT_BORDER + (icons ? ICON + ICON_GAP : 0))
need    = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + body

body    = n · seat(widest)     under width="fill"      — every seat is equal, so each must hold the widest label
body    = Σ seat(wᵢ)           under width="content"   — every seat is exactly its own label
```

Charging the widest label for every seat over-prices any content-packed bar whose labels differ, and every real bar's labels differ. Measured per consumer and per column, with the rendered mode read off the part:

| consumer | tier | column | Σ seat(wᵢ) | n · seat(widest) | mode | would be, priced at the widest |
| --- | --- | --- | --- | --- | --- | --- |
| Feed (labels 64 / 70 / 35) | 390 | 302 | **271** | 312 | **labels** | icon-first |
| Feed | 820 | 560 | 271 | 312 | labels | labels |
| Feed | 1280 | 664 | 271 | 312 | labels | labels |
| Feed | 1440 | 744 | 271 | 312 | labels | labels |
| Connect (labels 54 / 70 / 42) | 390 | 358 | **268** | 312 | labels | labels |
| Connect | 820 | 616 | 268 | 312 | labels | labels |
| Connect | 1280 | 720 | 268 | 312 | labels | labels |
| Connect | 1440 | 800 | 268 | 312 | labels | labels |

The Feed at 390 is the row to keep: **41px of over-price removed**, and it keeps its words with 31px to spare. The arithmetic and the rendered mode agree on all eight rows.

**No tolerance was added and nothing was dropped.** The sum is *exact* for content packing, where the widest-based form was an upper bound; an exact failure still falls to icon-first.

**If you port the test, port both branches.** Summing is wrong under a packing where seats share — that is **G36 point 2**, whose run 239 read "network" at 86px of content inside a 72px share. It is right under a packing where each seat is its own width. **981 writes the condition in: a future packing that shares takes the widest branch, and the test is extended, never assumed.**

Your own consumers are not in this table — Strand does not open the app project (663). `AppHeader`, B2 and B4 are the three named in relayed data and none of their columns is known here. `app.jsx`'s Mobile/Desktop switcher carries no icons and can never switch mode. Convene imports no LensBar (587).

## New in this bundle

- **`compact`** renders from the part: icon-first regardless of fit, stretched track, no descriptor, seat still **44**. 905 refused a 32px seat, not a compact rendering, and Strand does **not** adopt `--target-min` 24 for this slot. A chassis no longer needs to mount a staged part beside the bundle's.
- **`icons`** renders each seat's glyph beside its word in labels mode. Off by default. The fit test prices the glyph and its gap when it is set.
- **A seat can render glyph and word** through `icons` in labels mode. `LensBar.resolveSeat(iconFirst, on, icons, hasIcon)` is exported and exhaustive by construction — **sixteen** combinations, all reachable, none rendering nothing, and each mode's active and inactive rows **identical**. It is exhaustive by **domination**, not by joint resolution: `iconFirst` sets `ico` unconditionally and never reads `icons`, and `!iconFirst` sets `txt` unconditionally. The joint guard has one live case — `iconFirst` with a lens carrying no glyph, reachable only through `compact` — where the seat falls back to its word. Change list item 58 has the full reading. `on` is accepted and deliberately never read: since 978 nothing about what a seat renders depends on whether it is selected. Item 46 made the division independent of content; 978 makes the content independent of selection. Either alone holds the reflow closed; together it cannot be expressed.
- **The un-latch is inside the part.** Pressing the already-active lens re-opens a collapsed descriptor. `onChange` still fires with the active id, so a caller that un-latches is unaffected; a caller that does not now renders identically. Setting `collapsed` true again clears the override.
- **`InputMode`** — `useInputMode()` and a render-prop `InputMode`, watching `(pointer: coarse)`. `LensBar` uses it for `title`, which renders for pointer only; `aria-label` is unconditional.
- **Two glyphs:** `panel-left-close` and `chevron-left`. A rail collapse control renders from a named glyph with **no transform** (732).

## Fixed, with no visible change unless you relied on the defect

- **Every seat carries `minWidth: 44` in every mode.** The labels-mode seat had none and measured **34.8px** against the floor. That is where the sub-floor seat was — not in icon-first, which was already floored.
- **The measuring probe sits in a 0×0 `overflow: hidden` box** and stops contributing **24px** of its own overflow to the container it measures.
- **The bundle's `__errors` array is empty.** It held **three** entries — one React #299 in `app.jsx`, one in `composer/proto.jsx`, one `Can't find variable: IMG` in `connect.jsx`. Both mounts now check for `#root`; `connect.jsx` defines its own asset constant instead of reading one `shell.jsx` assigns after it has already been evaluated. No demo was removed.

## What is in here

- `_ds_bundle.js` — the compiled bundle, byte for byte, with a two-block comment header and one `__DS_COMPILE_ID` assignment prepended. Nothing in the compiled code was edited.
- `_ds_manifest.json`, `styles.css`, `tokens/` (5 files), `assets/` (`adinkra/`, `icons/`, `patterns/`, `imagery/`, `logo.png`) — `icons/` now carries `panel-left-close.svg` and `chevron-left.svg`.
- `LENSBAR-CHANGES-14-16.md` — the observable change list for 857, items 1 to 19 (corrections 14 and 16), 20 to 27 (17), 28 to 34 (18), 35 to 39 (19), 40 to 45 (20), 46 to 54 (21), 55 to 57 (rulings 978 and 981), 58 (984) and 59 (open), extended in place.
- `STRAND-CORRECTION-18-EXTRACTION.md`, `-19-`, `-20-`, `-21-`, `-23-` and `-24-` — carried here as files (876). 18 has 19's note appended against its §8; 19 has 20's note appended against its §3.

## Confirmed by reading this exported file, not its source

`LensBar` contains `SEAT = 44`, `TRACK_PAD = 4`, `TRACK_BORDER = 0`, `SEAT_BORDER = 1`, `PAD = 14`, `ICON = 20`, `ICON_GAP = 8` and `const TRACK = 2 * (TRACK_PAD + TRACK_BORDER)`. **Neither `PAD_OFF` nor `PAD_DENSE` appears**, and `dense` survives only in the doc comment recording its retirement. The render reads `const barPad = iconFirst ? 0 : PAD`, the measurement branches on `width === 'fill'` between `n * seatW(w)` and a reduce over the measured labels, every seat carries `minWidth: SEAT` and `boxSizing: 'border-box'`, `LensBar.resolveSeat = resolveSeat` is present with four parameters, and `__protoRoot` and `__root` guard the two demo mounts. The `document.fonts` re-measure, the zero guard and the `offsetWidth` scale normalisation are all still there. `--target-primary` appears and `--touch-min` does not. The whole file parses.

## What is still open in this bundle

**The clip is gone with the mode.** A dense bar can no longer be expressed, so the 36.9px clip 978 was ruled on cannot occur. What remains is on the consuming side: `AppHeader` passes a prop that no longer does anything, and the header's active lens becomes an unlabelled chip among glyphs — R1's cost, accepted at 936 for 390 surfaces and now accepted in the header slot too. That was 978's priced cost, not a defect.

**`compact` reaches a state `canSwitch` forbids, and it is open.** G36 point 1 makes the fit test refuse icon-first unless every lens carries a glyph; `compact` forces icon-first without consulting it. A `compact` bar with an iconless lens renders two glyph seats and one worded seat in one track — coherent, caught by the joint guard, and not what either rule intended. **Not resolved in this compile:** it is a real disagreement, it needs Design, and folding it in here would bury it. Change list item 59 has the two measured renderings and the three ways out.

**Item 11's gap still needs a G number**, which Code assigns by writing the entry into `docs/GAPS.md` (638). Not reserved here.

## What Strand did not do

A compile ran and its id is above, read from the artifact and then written down (873). The id literal exists in **this export copy only** — the compiler owns the root bundle's header, and the archive-root `_ds_bundle.js` is byte-identical in body but carries no `@ds-compile-id` and no `window.__DS_COMPILE_ID`; it is never the export and never bound (899). The app project was not opened (663). Item 11's gap still needs a G number, which Code assigns by writing the entry into `docs/GAPS.md` (638); it is not reserved here.
