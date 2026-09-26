# Strand correction 26, ruling 1115 carrying 1077: MediaBlock `ratio`

**24 September 2026, session 32. For Chat to ratify under 129.** Governed by 129, 604, 663, 855, 873, 876, 899, 1077, 1115. Source: STRAND-CORRECTION-26-BRIEF (relayed data; the app project was not opened, read from or cited, 663).

Scope is one prop on MediaBlock and nothing else.

**Compile.** **v1790276435314618**, read from the compiled artifact after the pass (873). It supersedes `v1790212533284400` (correction 25), which is the state every "before" below was read from and the baseline every `ratio`-absent specimen was compared against. **One compile was read and not stamped:** the first compile of the prop, on which the readout found three- and four-image galleries overflowing a 16:9 frame (§3); its id was not read. Corrections 23, 24 and 25 keep their ids; nothing is re-dated (855).

> **Stamped 24 September 2026**, session 32, against **v1790276435314618**. 53 readout rows, all pass, in six frames (compact 390 touch, medium 820 pointer, expanded 1280 pointer; light and dark).

---

## 0. Before, read from `v1790212533284400`

| what was checked | reading |
|---|---|
| `image` | the image at its own ratio, `max-height: 420`; a ratio through `style` sizes the frame, not the image |
| `gallery` | `aspectRatio: '16/10'` set after the caller's `style`; not reachable from outside |
| `video` | `aspectRatio: '16/9'` |
| a ratio prop | **none** |

## 1. The prop (1115)

`ratio?: string`, CSS `aspect-ratio` form (`'16/9'`).

- **Absent:** every kind runs the code path it ran at `v1790212533284400`. The image and gallery branches with a ratio are separate branches; video reads `ratio || '16/9'`, which is the old literal when absent.
- **`image`:** the frame takes the ratio; the image is `width: 100%; height: 100%; object-fit: cover`; no 420 cap.
- **`gallery`:** the frame takes the ratio in place of 16/10. Rows are declared (`minmax(0,1fr)`, one row for two images, two equal rows for three or four) so the tiles fill the frame; three images still span the first tile across both columns.
- **`video`:** the frame takes the ratio (no visible change at 16:9).
- **`link` and `audio`:** ignore `ratio`; said in `MediaBlock.d.ts` and `MediaBlock.prompt.md`.
- No token changes. No count, badge or number.

Convene card media passes `ratio="16/9"` for one image or several (1077); the prompt carries the example.

## 2. Readout at the stamp

Method: `screenshots/correction-26/readout.html`. The ratified bundle (a byte copy of `export/_ds/_ds_bundle.js` at `v1790212533284400`, kept as `baseline-v1790212533284400.bundle.txt` so the compiler does not read it) is loaded beside the current compile; each `ratio`-absent specimen renders twice, once from each, and the two are walked in parallel: serialised DOM equal, every computed property of every element equal, every box size equal.

| row | reading (same in all six frames unless shown) |
|---|---|
| baseline loaded, first line | `/* @ds-compile-id: v1790212533284400 */` |
| current reads `ratio`, baseline does not, distinct parts | true, true, true |
| 16/9 media box inside the 1px edge, width ÷ height (image, g2, g3, g4, video) | 1.778 × 5 at 356, 786, 1246 |
| the same with the edge | 1.77 (compact), 1.774 (medium), 1.776 (expanded) |
| image box equals its frame | 356×200.3 in 356×200.3 · 786×442.1 in 786×442.1 · 1246×700.9 in 1246×700.9; fit=cover, max=none |
| gallery tiles fill the 16/9 frame (tile area; the rest is the 2px gutter) | compact 99.4 / 98.7 / 98.4%; medium 99.7 / 99.4 / 99.3%; expanded 99.8 / 99.6 / 99.6%; three spans the first tile |
| `ratio` absent identical to `v1790212533284400` | image 2 el / 1246 props; g2 3 / 1869; g3 4 / 2492; g4 5 / 3115; video 5 / 3115 |
| `ratio` absent, ratios as before (image, g2–g4, video) | 1.496 1.595 × 3 1.77 · 1.867 1.598 × 3 1.774 · 2.957 1.598 × 3 1.776 |
| `ratio` absent, g3 g4 tile area against the 16/10 frame | 159.4–159.8% / 105.5–106.3% (reported, see §3) |
| video at 16/9 against video absent | identical, 5 el |
| link and audio with `ratio="16/9"` against absent | identical, identical |
| styles and tokens against the `v1790212533284400` export | 6 files equal |
| digits in any specimen | 0 |
| bundle `__errors` | 0 |

## 3. Found in the readout cycle

- **Gallery rows at a set ratio.** On the first compile, three- and four-image galleries at 16:9 drew implicit rows at each image's intrinsic height: tile area 177% and 117% of the frame, the lower row clipped. Fixed by declaring the rows in the ratio branch (§1). Two images filled on the first compile.
- **Carried, not changed:** with `ratio` absent the same overflow exists at `v1790212533284400` under 16/10 (159% and 106%). 1115 requires the absent case to stay byte for byte, so it is reported, not fixed. Chat may rule on it separately.
- **Readout method:** the first width ÷ height row used integer frame heights (1.780); it now reads fractional sizes inside the 1px edge, as correction 25 did.

## 4. Files

`components/dna/MediaBlock.jsx`, `MediaBlock.d.ts`, `MediaBlock.prompt.md`; `screenshots/correction-26/` (`proof.html`, `readout.html`, `shared.js`, `baseline-v1790212533284400.bundle.txt`); `export/_ds/` with this extraction.
