# Strand correction 30: the held parts from v5 (Part A) and four Pane and MediaBlock gaps (Part B)

**Compile stamped: `v1790401469924397`**, read from the artifact after the readout ran on it (873). Base for every "unchanged" reading: `v1790366257373061` (correction 28), loaded beside the compile in the same page. Session 33, 25 September 2026. Nothing here is canonical until Chat ratifies it.

## 1. What was read, and what was not

- The drawing: `convene/B9-Discovery-Dashboard-v5.dc.html` from the app.diasporanetwork.africa project, delivered as a zip with the three scripts it loads (`uploads/2026-09-25_Strand_C30-v5-drawing/`). Read for layout and proportions only. Its bundle is correction 24 and none of its parts was used, copied or measured as a part. The app project itself was not opened (663).
- The brief: `uploads/STRAND-CORRECTION-30-BRIEF.md`.
- Three attempts to reach the drawing failed before the zip arrived (a placeholder in place of the link, a truncated link, an attachment that did not come through). Nothing of Part A was built on any of them.

## 2. Part A, built from v5

Every value below was read off v5's inline styles and carried to the nearest token (604). Where v5's value had no exact token, the substitution is listed in §4.

**Ask 1, the two media kinds.** `MediaBlock kind="strip"` is the group of four: up to four images in one row of square cells, `repeat(4, minmax(0,1fr))`, gap `--space-2`, cell radius `--radius-m`, a `--border-thin` `--line` edge per cell, no outer frame; fewer than four keep four tracks; none renders nothing. `kind="carousel"`: one to five 16:9 slides at 86% of the row (v5's width), gap `--space-2`, `--radius-l`, a 1px edge, `--bg-sunken` behind, scrollbar hidden, `scroll-snap-type: x mandatory`. The row takes focus (`tabindex 0`, `role="region"`, `aria-roledescription="carousel"`, `aria-label` from `title`, default "Images"); ArrowLeft and ArrowRight move one slide, stop at the ends and mark the event handled, so a Pane around it does not step. v5 draws no position indicator; none is drawn; no digit anywhere. Neither kind reads `ratio`.

**Ask 2, `BodyBlocks`.** One part rendering an ordered array: paragraph, heading, quote, list, image, group, carousel, video. Blocks `--space-4` apart; paragraph `--text-m`/`--text-m-lh`; heading and quote in the display face at `--display-s`; quote attribution and captions `--text-xs` `--ink-3`; list indent `--space-5`, items `--space-1` apart. Image and video go through `MediaBlock` at 16:9 (video through G119's grid cell); group and carousel through the two new kinds; each under a `figure` with an optional caption. A block with no content renders nothing; an array with no content renders nothing at all (read: 0 children, 0 height). `headingLevel` defaults to 2.

**Ask 3, `PersonCard`.** `layout="row"` (People, Partners): 56 Avatar; name in the display face at `--display-s`; role in caps at `--tracking-caps`, medium, `--c-{c}-text`; optional note `--text-xs` `--ink-2`; `--surface`, `--border-thin` `--line` edge going `--line-strong` on hover (pointer only), `--radius-l`, min height 84, padding and gap `--space-3`. `layout="tile"` (Going): 48 Avatar over the name at `--text-xs` medium, centred, min height 112. One control per card: an anchor with `href` (a plain primary click calls `onOpen` and prevents the default; a modified click is the browser's), else a button calling `onOpen`. Accessible name "Open {name}" unless `openLabel`. The caller lays the grid; the part never looks a name up (680).

**Ask 4, `BrowseTile` (1133).** `kind="topic"` (name, next date) and `kind="place"` (name, country). 180 wide, min height 84, padding `--space-3`, `--radius-l`, `--surface` with a `--border-thin` `--line` edge; pressed `--bg-sunken` while the pointer is down; selected `--c-{c}-tint` inside a `--border-card` `--c-{c}` frame with a check before the detail line in `--c-{c}-text`; `aria-pressed`. Name in the display face at `--display-s`, detail `--text-xs` `--ink-3`. One control per tile, the whole face, nested controls none; anchor with `href`, else button; `onSelect` (alias `onClick`). The date is composed by the caller and is the only digit a tile carries.

## 3. Part B

- **G119.** A ratioed video's poster is one declared grid cell (`minmax(0,1fr)` × `minmax(0,1fr)`), as correction 28 made the ratioed image; play and duration stay absolute over it. Read: overhang 0 0 0 0 before and after in every frame (Chrome; the WebKit 2px overrun this closes could not be read here), no property other than the stated grid styles and the overlay's computed min-size differs, box sizes unchanged. Unratioed video is byte-identical to the base.
- **G123.** A bounded Pane list column (one given `height`) pads `--space-2` on all four sides and the follow lands the card below that padding. Read at 1280, 1440 and 1920 under 1123's canvas with a 520 pane: a selected card filling the column has its ring inside the scrollport by 4 on every side that touches; the last card, followed, ends 4.3 above the scrollport's foot; a lane's first card is inside the list's scrollport by 4 and inside the lane's own scrollport by 0 when the lane pads `--space-1` itself. **Pane cannot pad a lane's scroller; a lane clips its own first card unless its caller pads it.** Stated in `Pane.prompt.md`. The unbounded Pane (no `height`) is unchanged.
- **G124.** `role="toolbar"` is kept, with the APG's arrow keys: with focus on any tool, ArrowLeft, ArrowRight, Home and End move focus between the tools and stop at the ends, marked handled, so the section's step handler does not fire; the open event does not change. Read: list→copy→share→share, next+0 at each; ArrowLeft at the first stays; End goes to the last. ArrowRight with focus in the pane body still steps (c2 → c3, onNext +1). Reason for keeping the role: it announces the group to screen-reader users and promises exactly these keys; dropping the role would remove the grouping.
- **G128.** While `listHidden`, the follow does not run and the list's `scrollTop` is never written (read: 0 writes across hide, Next, Previous, with the track at 0px). On Show list the follow runs only if the open item changed while hidden (read: key back where it was hidden, 0 writes, 984 → 984; key moved two steps while hidden, 1 write, 984 → 2020, the selected card's top 7.5 inside the scrollport).

## 4. Substitutions from v5's raw values, for Chat to rule on

v5 draws raw pixel values; 604 forbids carrying them raw. Each is carried to the nearest token; none is a colour or a radius.

- Quote 20/1.35 → `--display-s` (22/1.25). Person name 20/1.2 and Browse tile name 19/1.2 → `--display-s`.
- Person role 12 → `--text-xs` (13). Person note 14/1.4 → `--text-xs`.
- Paragraph line height 1.55 → `--text-m-lh` (1.5).
- Strip gap 6 and caption gap 6 → `--space-2` (8). Person card padding and gap 14 → `--space-3` (12). Browse tile padding 12 14 → `--space-3`. List indent 22 → `--space-5` (20).
- Browse tile selected frame: `--border-card`. In this compile's tokens `--border-card` is 1.5px; the discovery face's frame reads 1px in the readout (the token as the browser rounds it at the tile's edge). The readout compares against the token, not a literal.
- Pane list padding: the brief's `--space-1` (4) is enough for the 4px ring alone; `--space-2` (8) was carried so the ring clears the scrollport by 4 rather than touching it. Chat may prefer 4.

## 5. Readout

`screenshots/correction-30/readout.html`, run on this compile in the user's preview: **130 rows, all pass**, tolerance 0.1px. Six frames (compact 390 touch, medium 820 pointer, expanded 1280 pointer; light and dark, dark identical in value and verdict to light) plus three pane frames (1280×800, 1440×900, 1920×1080). Part A rows: strip geometry and image containment; carousel geometry, keys, and keys inside a Pane; BodyBlocks order, type and gaps, video containment, empty input; PersonCard row, tile, anchor/button and click routing; BrowseTile resting, selected, pressed, text and routing. Part B rows: 14 correction 28 specimens identical to the base in DOM, every computed property and size (136 875 to 146 875 properties per frame); G119; G123 on the reading-width Pane and the three pane frames; G124; G128; styles and tokens equal to the base export (6 files); digits in any specimen 0 (the topic tile's date set aside); bundle `__errors` 0.

Method notes. The readout runs in a background tab where animation frames and smooth scrolling never fire; it waits on timers and asks the carousel for instant scrolling through a flag only the readout sets (`window.__C30_INSTANT_SCROLL`, read by `MediaBlock`; the part scrolls smoothly for users). `proof.html` renders the same frames scaled for the eye.

## 6. Files

`components/dna/BodyBlocks.{jsx,d.ts,prompt.md}`, `PersonCard.{jsx,d.ts,prompt.md}`, `BrowseTile.{jsx,d.ts,prompt.md}` (new); `MediaBlock.{jsx,d.ts,prompt.md}`, `Pane.{jsx,prompt.md}` (changed; no new Pane props, `Pane.d.ts` unchanged); `readme.md` (the three parts named); `screenshots/correction-30/` (`shared.js`, `readout.html`, `proof.html`, `baseline-v1790366257373061.bundle.txt`); `export/_ds/` refreshed at this id (`_ds_bundle.js` with the id header, `_ds_manifest.json`, `styles.css`, `tokens/`, `README-EXPORT.md`); archive `strand-correction-30.zip`.

## 7. Not done

No @dsCard was written for the three new parts (none asked). WebKit was not read. The app project was not opened (663). G numbers for the lane-padding note and the `--space-2` choice are Code's to assign (638).
