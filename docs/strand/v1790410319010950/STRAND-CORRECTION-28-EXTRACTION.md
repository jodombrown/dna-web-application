# Strand correction 28, with correction 29 asks 1 and 2 folded in (1130)

**Compile `v1790366257373061`**, read from the artifact after the pass (873): the version of `_ds_bundle.js` the readout ran on. The export's `_ds_bundle.js` first line reads `/* @ds-compile-id: v1790366257373061 */`. Compile before this pass: `v1790279130697923` (correction 27, ratified by 1120). Nothing here is canonical until Chat ratifies it (129).

**Readout: 141 rows, every row passes.** `screenshots/correction-28/readout.html`, in two sections: `28 ·` (the seven items against `v1790279130697923`) and `29 ·` (asks 1 and 2 against the intermediate 28a compile `v1790365765677796`, kept as `compile-28a-v1790365765677796.bundle.txt`). Six frames (compact 390 touch, medium 820 pointer, expanded 1280 pointer; light and dark) labelled in 949's form, plus the Pane at 1280, 1440, 1920 and 2560 under 1123's canvas. Dark rows match their light rows in value and verdict.

## Scope

- Correction 28, items 1 to 7: built.
- Correction 29, ask 1 (`going`, `onReport`): built.
- Correction 29, ask 2 (Pane's reading width): proved, not rebuilt; it is correction 28 item 1.
- **Correction 29, asks 3, 4, 5 and 6: held for correction 30. None of them is built.** They are drawn from v5, which has not reached this project (663), and their geometry would otherwise be guessed.
- Not in this pass (28's brief): lane entrance motion (G114), the compact Sheet's stacking (G109).

## Correction 28

1. **Pane at 520 (G110; B9-SPEC line 14).** New props: `paneWidth` draws `minmax(0,1fr) {paneWidth}`, and `height` bounds the grid. With `height`, the list column and the pane body each scroll (`overflow-y: auto`) and the pane is not sticky. `onToggleList`, `onCopyLink` and `onShare` render a toolbar at the pane's top in the order Hide or show the list, Copy link, Share. Correction 23's cluster (Previous event, Next event, close) sits at the right of the same row with the same content, order and keys. `listHidden` draws `0 minmax(0,720px)` centred. The list slot stays the same element, hidden and inert, and keeps its scroll. Without these props the Pane is exactly as before (readout: identical to `v1790279130697923`).
   - Measured pane / list / content: 1280: 520 / 520.1 / 1064. 1440: 520 / 664.1 / 1208.1. 1920: 520 / 1096 / 1640. 2560: 520 / 1672 / 2216. The gap is 24 at every width, and the list = content − 520 − 24.
   - Height = frame − header (64) − 88: 648, 748, 928, 1288.
   - Hide list at 1280: tracks `0px 720px`, pane 720, left offset 172 (centred: 172). Show list returns the pane to 520.
2. **The face is a link (G100; line 26; 1067).** `href` renders the title as `a href`, with a cover spanning the face's inner box (317.6 × 404.2 of a 320 × 406.5 face with its 1.2 edge). A press on the media, title, when, where or reason lands in the link. The ellipsis, presenter and topic stand above the cover and do not open it. A plain primary click calls `onOpen` and prevents the default. Ctrl, meta, shift and middle clicks are not prevented and do not call `onOpen`. No `target`: the member chooses.
3. **Title clamp (G115; 1087).** The two-line clamp is on a `span` inside the link or button (`-webkit-box`, clamp 2). The h3 is 55 and the span 54.1, clamped. With `href`, the ellipsis is named "More: {title}"; without it, "More".
4. **Topics in two columns (G102; line 20).** A `checklist` axis may set `columns: 2`. The second column begins when the checklist is 150.04 wide, which is a rail of 192.4. At 149.94 it is one column. At the 240 rail (checklist 197.6) it is two. Without `columns`, one column as before.
5. **Clear all in the heading row (G111; line 20).** With `clearPlacement="heading"`, Clear all is in the pinned heading row between the title and `headingAction`. After scrolling the rail by 231 it is 17.2 from the top, within the pin, and it fires `onClear`. It is absent when no facet is set. The compact Sheet keeps it at the foot (G109 is not in this pass). Default `foot`, as before.
6. **Card and Menu geometry (G113; lines 26 and 27). Changes every caller:**
   - Face gap 12 → 8.
   - Presenter row on pointer 32 → 36. On touch it stays at 44: the row carries two controls (presenter and topic), and each needs the 44 touch target (498), so the spec's 36 cannot hold on touch. Reported, not forced.
   - Reason row: two lines, no rule → 28 behind a `--line` rule, one line with an ellipsis. The rule reads 1.2 in this browser, the same as the face's 1px edge token here.
   - Menu minimum width 220 → 240. With these items, rendered width 220 → 240. No other computed difference.
7. **Ratioed image (G116; 1115).** The ratioed image is one declared grid cell (`minmax(0,1fr)` by `minmax(0,1fr)`, `min-height: 0`), as the ratioed galleries are. **Before the fix it also overran its bottom edge in Chrome, by 2.3 to 2.4px** (compact 2.4, medium 2.4 and 2.3, expanded 2.3), not only on WebKit. Now the overhang is 0 on all four sides in every frame, and the grid row equals the inner height. Only the stated grid styles and the image's height differ from `v1790279130697923`. This was measured in Chrome; WebKit was not available to the readout.

## Correction 29, folded in

- **Ask 1: `going` and `onReport` on the discovery face.**
  - `going` is the caller's sentence, shown in the last row when `reason` is absent. When both are passed, `reason` wins. An empty `going` holds the 28 row, empty and `aria-hidden`. The part never composes names and never counts.
  - `onReport` ends the Menu with a rule and Report in the danger tone with the `flag` icon. Without it there is neither the rule nor Report.
  - The discovery face with a reason and neither new prop is identical to the 28a compile.
- **Going sentence at 320: cut.** "Ama Owusu, Kofi Boateng and Esi Mensah and others are going" needs 316 and the one-line reason row gives 286 (the face at 320 less padding and edge). It is cut with an ellipsis, in all six frames. To fit it, the caller needs a shorter sentence or the row needs two lines. Neither is decided here.
- **Ask 2: the Pane's reading width.** Proved by correction 28 item 1, not rebuilt: pane 520 with the list taking the rest at 1280, 1440 and 1920; both columns `overflow-y: auto`; toolbar Hide list, Copy link, Share. It is the `paneWidth` prop, not a `--pane-reading-width` token; the brief allowed either.
- **Asks 3, 4, 5 and 6: held for correction 30.** Not built.

## Readout method notes

- **Box-size tolerance is 0.1px (was 0.01px).** In one dark frame, two renders of the same code differed in box size by less than a tenth of a pixel, from sub-pixel layout rounding in this browser. A 0.01px tolerance counts that as a difference. DOM and every computed property are still compared exactly.
- **Two rows fixed in the readout, not in the parts, and re-run on this compile:**
  - The cover row compared against a rounded width; it now compares against the face's measured inner box.
  - The parts-changed row's PostCard check read the compiled source, where the change was not visible as text; it now checks for the rendered cover.

  Both pass.
- Styles and tokens: 6 files equal to the `v1790279130697923` export. No digit in any specimen. Bundle `__errors`: 0.

## Files

- Parts, with their `.jsx`, `.d.ts` and `.prompt.md`: `components/dna/Pane`, `components/dna/PostCard`, `components/dna/FacetRail`, `components/core/Menu`, `components/dna/MediaBlock`.
- New assets: `assets/icons/panel-left-open.svg` (Show list), `assets/icons/flag.svg` (Report). Both are in `export/_ds/assets/icons/`.
- Proof: `screenshots/correction-28/` (readout.html, proof.html, shared.js, `baseline-v1790279130697923.bundle.txt`, `compile-28a-v1790365765677796.bundle.txt`).
- `export/_ds/`: `_ds_bundle.js`, `_ds_manifest.json` and `README-EXPORT.md` at `v1790366257373061`, and this file.
