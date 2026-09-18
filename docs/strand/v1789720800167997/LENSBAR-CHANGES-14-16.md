# LensBar: what changed at correction 14 and at correction 16

**Strand, session 25. Written for 857: four pages import a staged local copy of LensBar, and when those retire and rebind to compile `v1789619870985180` their drawn frames move. Every difference below is observable in a rendered frame, in the DOM, or in a computed style, so each moved frame can be attributed to a named correction instead of discovered.**

Bundle these differences are true of: `export/_ds/_ds_bundle.js`, compile `v1789720800167997` (items 1 to 19 were first true at `v1789619870985180`).

## Correction 14 (ruling 723) — icon-first exists at all

1. **New rendering mode.** Before: every lens rendered its label as text at every width. After: two modes. Labels, unchanged from before. Icon-first: the **active** lens renders icon + label, every **inactive** lens renders its icon alone.
2. **Inactive tabs in icon-first are square-ish, not text-width.** `min-width: 44px`, `padding: 0`, icon at 20px. A five-lens bar collapses from five text pills to one pill plus four icon buttons.
3. **The label survives for assistive tech and hover.** An icon-only tab carries `aria-label` and `title` holding the lens label. Nothing is dropped, only hidden.
4. **New prop `icon` per lens, and it gates the mode.** A set where any one lens lacks an `icon` can never switch: it renders labels at every width, including widths where the labels do not fit. This is the state four staged pages are in if their lens sets have no icons.
5. **New prop `labels`.** `labels="always"` forces labels and disables the switch. Absent means fit-tested.
6. **New DOM child inside the wrapper**: a hidden measuring probe, one `<span>` per lens, `aria-hidden="true"`, `position:absolute`, `visibility:hidden`, `pointer-events:none`. It occupies no layout space but it is in the tree and in snapshots of the DOM.
7. **New observable hook**: the tablist carries `data-lensbar="labels"` or `data-lensbar="icon-first"`. This is the attribute to assert on rather than inferring mode from pixels.
8. **The wrapper gained `position:relative` and `max-width:100%`.** A caller that positioned something absolutely against an ancestor may now position against the bar.
9. **No motion on the mode switch.** The background transition on a tab is unchanged; the labels/icon-first flip is not animated.

Correction 14 also added the `--lane-card-width` token and the `file-text` icon. Neither touches LensBar and neither moves a LensBar frame.

## Correction 16 (rulings 770, 794, ratified 805) — the measurement, the padding, and when it re-runs

**Padding, the one change visible in a frame that is already in labels mode:**

10. **Inactive tab side padding is 15px, was 16px.** Active tab stays 16px. Every inactive tab is 2px narrower; an *n*-lens bar is `2(n−1)` px narrower overall — 8px on five lenses. Computed style on an inactive tab reads `padding-left: 15px`. This is G37's decision and it is the single most likely cause of a small horizontal shift in any frame that keeps labels.

**The fit test, which decides which mode a frame is in:**

11. **The test prices the layout the track actually produces, not the sum of the labels.** Before: every label's width added up against the column, which passes while one long label overflows its own share — the overlap seen at 390. After: the widest label priced as the active tab plus once per inactive tab, with gaps and track padding:
    `need = 8 + 2(n−1) + (W + 32) + (n−1)(W + 30)`, `W` = widest label content width, ceiled.
12. **Two opposite flips follow from 11, and they are not symmetrical.** A narrow set with one long label that used to render labels (overlapping) now renders **icon-first**. A medium-tier set that used to fall to icon-first can now render **labels**, because 15px padding lowers `need`: at the medium tier's 616px column, six lenses with a 68px widest label need 608 and fit, where they needed 618 and did not. Both flips are expected; neither is a defect.
13. **No tolerance.** A set that misses by 1px still falls to icon-first. Proved at scale 1: three lenses needing 341 against a 340px column render icon-first.

**When the test re-runs:**

14. **It re-measures when the document's fonts settle and on every later font load** (`document.fonts.ready`, then the `loadingdone` event) — correction 16's half of 770. Consequence in a frame: on a page that loads Bodoni Moda and Alegreya Sans, the mode can change **after** first paint, once the real face replaces the fallback. Before, the bar measured once in the fallback face and kept that answer. A screenshot taken before fonts settle is not the frame the reader gets.
15. **It still re-measures on resize and on label change**, unchanged from 14.
16. **A zero measurement no longer counts as "fits".** If the widest label or the column measures 0 — the probe not yet laid out, a hidden or backgrounded view — the bar keeps the rendering it has and retries (next frame, plus a 120ms timer for views where frames are paused), bounded. Before, a zero collapsed `need` below any column and the bar rendered labels at every width, which is pre-14 behaviour and the overlap itself.
17. **Label widths are normalised out of screen space.** Measured label widths are divided by the bar's own scale, taken as its wrapper's bounding-rect width over its `offsetWidth`. Consequence: inside a CSS-transform-scaled frame — mock device frames, scaled canvases, scaled proof sheets — the bar no longer reports "fits" when it does not. At scale 1 the ratio is exactly 1, so unscaled pages are unaffected. Browser zoom is **not** a cause of the mismatch; only a CSS transform on an ancestor is.
18. **Listener and timer cleanup on unmount**: the font listener is removed, the pending frame and timer cancelled. A page that mounts and unmounts bars repeatedly no longer accumulates listeners.
19. **Strand's own kit callers now carry an icon on every lens** (Feed: `globe`, `users`, `bookmark`; Connect: `globe`, `users`, `map-pin`), so those bars became switch-capable. A consuming page whose lens sets still lack icons keeps item 4's behaviour: labels at every width, no switch. Giving those sets icons is a caller change, not a bundle change.

## Attribution guide for the four staged pages

| Frame moves like this | Attribute to |
| --- | --- |
| Labels stay, bar is a few px narrower, inactive pills 2px tighter | 16, item 10 (G37) |
| Labels at a narrow width become one label plus icons | 14, items 1–3, triggered by 16's test (item 11) |
| Icon-first at the medium tier becomes labels | 16, item 12 |
| Mode changes a moment after load | 16, item 14 (fonts) |
| A scaled mock frame stops showing overlapping labels | 16, item 17 |
| Bar never switches at any width | 14, item 4 — the lens set has no icons; caller-side |
| Nothing moves | expected wherever the set fits at both paddings, e.g. the 280px-short eight-lens case |

## Correction 17 (868, 865, 869) — the answer, three props, and packing

Extends the list above; items 1 to 19 stand unchanged. These items are true of compile `v1789720800167997`.

**Not a change, the answer to 868:**

20. **Labels mode draws no icon.** It never did. The active lens is a label, every inactive lens is a label, and icons appear only in icon-first. No frame moves on this item; it is here because the fit test's arithmetic depends on it, and a page that renders icons beside labels at any width is not rendering this bundle's LensBar.

**New props. Each is inert unless passed, so a rebind that passes nothing gets items 1 to 19 and nothing else:**

21. **`label`** sets the tablist's accessible name. Default is the string "Lens", exactly as before. Observable in the accessibility tree, not in pixels.
22. **`c`** puts the active lens in that C's text rung: the active tab's computed `color` becomes `--c-<c>-text` instead of `--ink` — for Connect, `#1E5A3C` on the light ground. The pill background stays `--surface`. Inactive tabs are unchanged. Applies in both modes, so the accent does not disappear when the bar falls to icon-first. It is never the brand fill: a 15px label on a C fill fails AA on teal.
23. **`collapsed`** stops the `scope` descriptor from rendering. The bar's total height drops by the descriptor line plus the 6px column gap; the pill itself does not move. The latch under 405 is caller state — the part holds no memory.
24. **`width`** names the packing. `content` is the default and reproduces every frame drawn before 17. `fill` makes the track 100% of its column, gives inactive tabs `flex: 1 1 0` and keeps the active tab at content width. On a 616px column a five-lens bar goes from a roughly 436px row to a 616px row, and each inactive tab from roughly 94px to its share of what the active tab leaves. This is the item that restores a track-wide row to a page that had one.
25. **New observable hook:** the tablist carries `data-lensbar-width="content"` or `"fill"` beside `data-lensbar`.
26. **The track's own display changed from `inline-flex` to `flex`** with `align-self: flex-start` in content mode and `stretch` in fill mode. In content mode the rendered geometry is identical; a page that measured the track's `display` will read a different string.

**Refused and returned, so these frames do not change and the page keeps the work:**

27. A **`compact`** 32px seat size is refused: rule 10's 44px target holds on the compact tier, and icon-first already buys the room at full size. A **header that shows only the active lens's name** is caller-side: it drops the tablist, so it is a different control, not a mode of this bar. Neither appears in this bundle.

### Attribution, extending the table above

| Frame moves like this | Attribute to |
| --- | --- |
| Row goes from track-wide to hugging its labels after rebind | 17, item 24 — pass `width="fill"` to keep today's frame |
| Active lens label turns green, copper, teal, gold or wine | 17, item 22 |
| The italic descriptor line disappears and the bar gets shorter | 17, item 23 |
| Screen reader announces "Connect lens" instead of "Lens" | 17, item 21 |
| Icons appear beside labels at any width | not this bundle — a staged copy (item 20) |
| Seats shrink below 44px | not this bundle — refused (item 27) |
