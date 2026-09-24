# Strand correction 27, ruling 1118: the gallery's rows without a ratio

**24 September 2026, session 32. For Chat to ratify under 129.** Governed by 129, 604, 663, 855, 873, 876, 899, 1077, 1115, 1117, 1118. Source: STRAND-CORRECTION-27-BRIEF with Chat's correction to its two-image clause (1118's wording corrected to match).

Scope is the gallery branch without `ratio` and nothing else.

**Compile.** **v1790279130697923**, read from the compiled artifact after the pass (873). It supersedes `v1790276435314618` (correction 26, ratified as 1117), which every "before" below was read from and every specimen was compared against. **No other compile was read.** Corrections 23 to 26 keep their ids; nothing is re-dated (855).

> **Stamped 24 September 2026**, session 32, against **v1790279130697923**. 29 readout rows, all pass, in six frames (compact 390 touch, medium 820 pointer, expanded 1280 pointer; light and dark).

**Compiled sections changed against `v1790276435314618`:** `components/dna/MediaBlock.jsx` (248 → 250 lines) and `screenshots/correction-27/shared.js` (new; the proof fixture, compiled as corrections 24 to 26's fixtures are). The other 50 sections are byte-identical; the header differs only in those two source hashes and the fixture's entry.

---

## 0. Before, read from `v1790276435314618` (correction 26 §2 and §3)

| gallery without `ratio` | tile area against the 16/10 frame |
|---|---|
| three images | 159.4 to 159.8%; lower row clipped |
| four images | 105.5 to 106.3%; lower row clipped |
| two images | not measured at a declared-row build |

## 1. The change (1118)

In the gallery branch without `ratio`, the rows are declared exactly as correction 26 declares them in the ratio branch: `gridTemplateRows: 'minmax(0,1fr)'` for two images, `'minmax(0,1fr) minmax(0,1fr)'` for three or four, and `minHeight: 0` on each image. The frame stays `aspectRatio: '16/10'`; three images still span the first tile across both columns. No other kind, no ratio-set specimen, no token and no prop changes. `MediaBlock.d.ts` and `MediaBlock.prompt.md` are unchanged; neither described the overflow.

## 2. Readout at the stamp

Method: `screenshots/correction-27/readout.html`. The ratified bundle (a byte copy of `export/_ds/_ds_bundle.js` at `v1790276435314618`, kept as `baseline-v1790276435314618.bundle.txt` so the compiler does not read it) is loaded beside the current compile; every specimen renders from both and the two are walked in parallel: serialised DOM, every computed property of every element, every box size.

| row | reading |
|---|---|
| baseline loaded, first line | `/* @ds-compile-id: v1790276435314618 */` |
| gallery branches declaring rows, current / baseline | 2 / 1; distinct parts |
| **expected to differ:** g3 without ratio, tile area was → now (2px gutter) | compact 159.4 → 98.8% (0.9%); medium 159.7 → 99.5% (0.4%); expanded 159.8 → 99.7% (0.3%); three spans the first tile |
| **expected to differ:** g4 without ratio, tile area was → now (2px gutter) | compact 105.5 → 98.5% (1.5%); medium 106.1 → 99.3% (0.7%); expanded 106.3 → 99.6% (0.4%) |
| g3 g4 frame inside the 1px edge | 1.6 1.6 at 356, 786, 1246 |
| **measured:** g2 without ratio | stated style difference only; box sizes equal (frame and both tiles); tile area 99.4% (compact), 99.7% (medium), 99.8% (expanded) |
| g2 differences, as measured | inline style of the frame and both images; computed: `min-height` and its logical alias `min-block-size` `auto → 0px` on each image; `grid-template-rows` on the frame resolves to the same track, so no computed difference |
| identical to `v1790276435314618` (DOM, every computed property, size) | image, video, link, audio without ratio; image, g2, g3, g4, video, link, audio with `ratio="16/9"`: 11 specimens, 31150 properties per frame |
| styles and tokens against the `v1790276435314618` export | 6 files equal |
| digits in any specimen | 0 |
| bundle `__errors` | 0 |

Rows are the same in light and dark at each width.

## 3. Found in the readout cycle

- **Readout filter.** The first run failed the two-image row because the filter allowed only `min-height` on the images; the browser also reports the logical alias `min-block-size`, which is the same declaration. The filter now allows exactly `min-height` and `min-block-size` `auto → 0px` on images and `grid-template-rows` on the frame; box sizes remain required equal. The part did not change between runs.
- **Brief correction (Chat, before the run).** The brief's two-image clause asked for identical-in-every-respect; Chat corrected it to a stated style difference with identical box sizes. The readout follows the corrected clause.

## 4. Files

`components/dna/MediaBlock.jsx`; `screenshots/correction-27/` (`proof.html`, `readout.html`, `shared.js`, `baseline-v1790276435314618.bundle.txt`); `export/_ds/` with this extraction.
