# LensBar: what changed at correction 14 and at correction 16

**Strand, session 25. Written for 857: four pages import a staged local copy of LensBar, and when those retire and rebind to compile `v1789619870985180` their drawn frames move. Every difference below is observable in a rendered frame, in the DOM, or in a computed style, so each moved frame can be attributed to a named correction instead of discovered.**

Bundle these differences are true of: `export/_ds/_ds_bundle.js`, compile `v1789885868097915` (items 1 to 19 were first true at `v1789619870985180`, items 20 to 27 at `v1789720800167997`, items 28 to 34 at `v1789753250587142`, items 35 to 39 at `v1789777129769061`, items 40 to 45 at `v1789787827785362`, items 46 to 54 at `v1789880372619731`).

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

## Correction 18 (903, 904, 905) — the padding, `dense`, and the seat

Extends the list above; items 1 to 26 stand, and item 10's value and item 27's citation are superseded here. These items are true of compile `v1789753250587142`.

**The padding, which moves every labels-mode frame:**

28. **Tab side padding is 14px active and 8px inactive** (was 16 and 15, item 10). Superseding G37's value under 903: these are the values the consuming implementation renders and measures at, and has since before correction 16. Computed style on an active tab reads `padding-left: 14px`, on an inactive tab `8px`. The active tab is 4px narrower and each inactive tab 14px narrower, so an *n*-lens bar narrows by `4 + 14(n−1)` px — **60px on five lenses**. This is now the most likely cause of a horizontal shift in any frame that keeps labels, and it is a larger shift than item 10's was.
29. **The fit test's terms follow.** `need = 8 + 2(n−1) + (W + 28) + (n−1)(W + 16)`, which reduces to `need = nW + 36 + 18(n−1)`. A five-lens set with a 70px widest label needs **458**, where it needed 518. Consequence: more sets render labels, so a frame that fell to icon-first at a given column may now render labels. Both flips remain expected; neither is a defect.
30. **No tolerance, still.** An exact failure still falls to icon-first.

**One new prop, inert unless passed:**

31. **`dense`** suppresses the **active** lens's icon so the active lens reads as its name, and tightens the active tab's side padding to 10px. Inactive lenses keep their icons. The tablist, every lens, `aria-selected` and the switch are unchanged, which is why it is a mode of this bar and not a different control (904, reversing 871's deferral). Observable: in icon-first the active tab draws 0 icons while each inactive tab draws 1. In labels mode it is invisible except for the active tab's 4px, because labels mode draws no icon at all (item 20).

**Refused and not drawn, so these frames do not change:**

32. **`compact` is not in this bundle and is declared nowhere.** The refusal stands under 905 on 498's split: `--target-primary` 44px for anything a thumb aims at on its own, `--target-min` 24px only as the floor for a control inside a line of text or a row that is itself the target. A lens tab is a standalone thumb target, so it owes 44. Its caller `AppHeader` loses its narrow-seat answer; the replacement is the one the refusal named — icon-first buys a narrow column its room at full seat size. `AppHeader` keeps `dense`.
33. **The seat is unchanged at 38 and the track at 46 in this bundle.** Ruling 905 takes the lens seat to 44 but does not choose the mechanism, so both are drawn beside today's seat at `screenshots/correction-18/proof.html` and returned for a ruling. No frame's height moves at this compile. (Mechanism A: track 52, 4px inset kept, everything below moves down 6px here. Mechanism B: track stays 46 with padding 0, nothing below moves, the pill goes flush.)
34. **The token `--touch-min` is renamed `--target-primary`** (908), value unchanged at 44px. `--target-min` is not renamed; 606 locks that name. This is the one item in this list that can break a page silently rather than move a frame: `var(--touch-min)` resolves to nothing, paints no error, and collapses whatever it sized. A rebinding page greps for the old name and takes the new one. Strand's own live call sites were `ui_kits/dna/convene/rsvp-guest.html` and the token file.

### Attribution, extending the tables above

| Frame moves like this | Attribute to |
| --- | --- |
| Labels stay, the bar is noticeably narrower — active pill 4px tighter, each inactive pill 14px | 18, item 28 |
| Icon-first at some column becomes labels after rebind | 18, item 29 |
| The active lens loses its icon and reads as its name | 18, item 31 (`dense` is being passed) |
| Inactive pills 2px tighter and nothing else | 16, item 10 — a bundle between 16 and 18, not this one |
| Seats grow to 44, or the bar gets 6px taller | not this bundle — drawn and returned (item 33) |
| Seats shrink below 44 | not this bundle — refused (items 27, 32) |

## Correction 19 (918, 913, 926, 923) — the seat compiles, the track's composition, and the border terms

Extends the list above; items 1 to 32 and 34 stand, and **item 33 is superseded**: the seat is no longer unchanged. These items are true of compile `v1789777129769061`.

**The one change that moves every frame vertically:**

35. **The seat is 44 and the track 52** (918, mechanism A; item 33 said the seat was unchanged at 38 and the track 46, and it no longer is). Computed height on any tab reads 44 and on the track 52. **Everything below the bar moves down 6px**, in both descriptor states. Every frame containing a LensBar gets 6px taller. This is the largest single move in this list.
36. **The 52 is composed `4 + 44 + 4`, not `3 + 1 + 44 + 1 + 3`.** The track's padding goes 3 → **4** and its `1px solid var(--line)` border goes to **0**, with the line kept as `box-shadow: inset 0 0 0 1px var(--line)`. Under `box-sizing: border-box` that paints the outermost pixel of the same 52px box the border painted, so **nothing moves horizontally**: the leading inset stays 4, the trailing inset stays 4, and the outer width of the track is unchanged. A port matches **one number: 4**. The reason it is padding and not a border: the track is a scroll container, a scroll container clips at its **padding box**, and `:focus-visible` needs 4px clear (2px offset + 2px stroke) — so a border contributes nothing to the ring and 3px of padding clips the ring's outer pixel. It has been clipping since Brief 2; at 4px of padding it stops.
37. **Observable difference in computed style, if a page asserts on it**: the track reads `padding: 4px`, `border-width: 0px` and a `box-shadow` that now includes `inset 0px 0px 0px 1px` alongside nothing else. A page that measured the track's `border-top-width` as 1 will read 0. No rendered pixel of the track's edge moves.

**Named, not changed:**

38. **The fit test's border terms are explicit and both are 0.** `need = 2(TRACK_PAD + TRACK_BORDER) + 2(n−1) + (W + 2·PAD_ON + 2·SEAT_BORDER) + (n−1)(W + 2·PAD_OFF + 2·SEAT_BORDER)`, with `TRACK_PAD 4`, `TRACK_BORDER 0`, `SEAT_BORDER 0`. `TRACK` is still 8 and every value the test produces is **unchanged** — `nW + 36 + 18(n−1)`, a five-lens bar at `5W + 108`. **No frame changes mode because of this item.** Strand's seat carries no border (`all: unset` resets `border-style` to `none`) and the seat now carries `border: 0px solid transparent` so the term is greppable. The relayed repo's probe carries a 1px transparent border and prices `5W + 118`; the residual difference between the two implementations is **10px**, not 60 and not 0 (913).

**Drawn and not compiled, so these frames do not change:**

39. **Selecting a lens still moves every other seat.** Measured at a 300px column: `All` active 4-77 / 79-123 / 125-169, `Communities` active 4-48 / 50-185 / 187-231, `Categories` active 4-48 / 50-94 / 96-214 — a **91px** largest shift, matching the founder's relayed reading to within the width of the word "All". Three candidates are drawn at `screenshots/correction-19/proof.html` and **none is chosen** (909). All three keep 488: no absolutely positioned chip returns. Nothing in this bundle fixes it.

### Attribution, extending the tables above

| Frame moves like this | Attribute to |
| --- | --- |
| Every LensBar frame is 6px taller and the seats are 44 | 19, item 35 |
| The track's edge line is unmoved but `border-top-width` reads 0 | 19, item 36 |
| The bar's width, the fit test's verdict, or any mode flip | **not** 19 — no value in the test changed (item 38) |
| Selecting a lens re-lays the row | still open — drawn and returned (item 39) |

## Correction 20 (936, 934) — R1, and the seat's border

Extends the list above; items 1 to 38 stand, and **item 39 is closed in icon-first**. These items are true of compile `v1789787827785362`.

**The change that moves every icon-first frame:**

40. **R1: in icon-first the active seat keeps its icon instead of swapping to its word** (936). Every seat in that mode is one 44px icon and the active state is the chip alone. The icon-plus-label rendering no longer exists anywhere — labels mode is label-only (item 20), icon-first is icon-only. Observable: an icon-first bar's active seat draws 1 icon and renders no text, and its width drops from `W + 30` to 44. An eight-lens icon-first bar goes from roughly 453px to **374px**. **Labels-mode frames are untouched by this item.**
41. **Selecting a lens moves no seat in icon-first** (item 39 closed there). Measured at a 280px column, the three selection states put every seat at the same left and right. **Not closed in labels mode:** the active seat's 14px of side padding against an inactive seat's 8 still shifts neighbours by exactly 12px a boundary. That is 903's split, it is unchanged by this bundle, and closing it is one value Chat owns.

**The change that moves every frame, both modes:**

42. **The seat takes `border: 1px solid transparent`** (934), where correction 19 compiled `0px`. Relayed: the repo's seat is `1px solid transparent` enabled and `1px dashed var(--line-strong)` disabled, so the placeholder is load-bearing — without it the seat changes width on disable. **Every seat is 2px wider**, so an *n*-lens bar grows by `2n` px. Computed style on a tab reads `border-top-width: 1px` where it read 0.
43. **The seat also takes `box-sizing: border-box`**, which is not cosmetic: `all: unset` resets box-sizing to `content-box`, under which the 1px border would put the seat at 46 and the track at 54 and break 933's ruled 52. With border-box the seat stays **44** and the track **52**. A page asserting on either is unaffected; a page that reimplemented the seat locally and added the border without the box-sizing will be 2px tall per seat out.
44. **The fit test's verdict boundary moves `+2n`.** `need = nW + 38 + 20(n−1)`, active `W + 30`, inactive `W + 18`, five lenses **`5W + 118`** — the same number the relayed implementation prices, so the two converge at **zero**. A bar whose margin was under `2n` flips from labels to icon-first. **None of Strand's own consumers flips:** Feed and Connect are three-lens sets needing 288 against columns of 302/560/664/744 and 358/616/720/800; Feed at 390 is the tightest at 14px of margin. `app.jsx`'s switcher carries no icons and can never switch. Convene imports no LensBar (587).

**Reported and not changed:**

45. **`dense` conflicts with R1 and is unresolved.** `dense` puts the active seat back to its word, which is the content difference R1 removed, so a `dense` bar in icon-first still reflows. Compiled behaviour is unchanged (904). Four options and their costs are in correction 20's extraction; none is chosen.

### Attribution, extending the tables above

| Frame moves like this | Attribute to |
| --- | --- |
| An icon-first bar's active seat loses its word and becomes a 44px icon | 20, item 40 |
| An icon-first bar is dramatically narrower, or stops scrolling | 20, item 40 |
| Every seat is 2px wider and an *n*-lens bar `2n` px wider | 20, item 42 |
| A labels bar at a tight column flips to icon-first | 20, item 44 — its margin was under `2n` |
| Seats measure 46 tall and the track 54 | **a local reimplementation** — the border without `box-sizing: border-box` (item 43) |
| Selecting a lens shifts seats 12px in labels mode | 903's padding split — unchanged by this bundle (item 41) |
| Selecting a lens shifts seats in icon-first | not this bundle — closed (item 41) |

## Correction 21 (939, 969, 950, 971, 972, 973) — the division, the resolver, the floor, and two glyphs

Extends the list above; items 1 to 45 stand except where named. These items are true of compile `v1789880372619731`.

**The change that moves every frame:**

46. **Equal flex on every tab and one padding for every state** (969, reopening 926). The active tab took `flex: none` at its content width while every other tab took `flex: 1 1 0`, so selecting a lens re-divided the whole track. Measured on this part at 390, five lenses, before the fix: seats moved **22.25 / 17.46 / 13.27 / 8.49px** under fill packing and **11.99px** in labels mode, while the track itself moved **0**. After: **0 in every packing**. `PAD_OFF` is retired.
47. **The padding is a property of the bar, not of a seat's role** (973). `PAD` 14 in labels, 0 in icon-first, `PAD_DENSE` 10 in a dense icon-first bar. One padding per *role* is not enough: a bar whose glyph-only seats carried 0 and whose worded seat carried 10 divided **76 / 96 / 76** at a 260px track, because `flex-basis: 0` under `box-sizing: border-box` floors each base at that seat's own padding and only the remainder divides equally. Observable: every seat in a stretched bar now reports the same computed `padding-left`.
48. **The fit test prices the layout it decides for**, so the verdict boundary moves and **G37's boundary moves with it**. `need = nW + 32n + 6`, and `nW + 60n + 6` with `icons`. A five-lens bar needs **`5W + 166`** where correction 20 priced `5W + 118`; the 48px is the inactive seats' padding going 8 → 14. **A bar whose margin was under that difference flips to icon-first.** At `W = 70` a three-lens bar needs 306 where it needed 228.

**New renderings, all off by default except where noted:**

49. **A seat can render glyph and word** (Brief 9 conflict 6). Reachable two ways: a `dense` active seat in icon-first, and the new `icons` prop in labels mode. `resolveSeat` is exported as `LensBar.resolveSeat` and is jointly exhaustive by construction — 16 combinations, none rendering nothing. **Strand never had the empty seat 939 records** (971): it computed one boolean and rendered `iconOnly ? glyph : word`, so the empty seat is the consuming implementation's, where the two flags are computed separately.
50. **`compact` renders from the part** (Brief 9 conflict 8). Forces icon-first regardless of fit, stretches the track, renders no descriptor, seat stays **44**. 905 refused a 32px seat, not a compact rendering, and Strand does **not** adopt the consuming implementation's `--target-min` 24 for this slot.
51. **`icons`** renders each seat's glyph beside its word in labels mode, narrowing 868. Off by default, so no existing caller changes.
52. **The un-latch is inside the part** (939). Pressing the already-active lens re-opens a collapsed descriptor. `onChange` still fires with the active id, so a caller that un-latches is unaffected and a caller that does not now renders identically. Setting `collapsed` true again clears the override.
53. **`title` renders for pointer only** (62); `aria-label` is unconditional. First part in the set to branch on input mode, via the new `InputMode` export (`useInputMode()` and a render-prop `InputMode`).

**Fixes with no visible change unless you were relying on the defect:**

54. **Three things stop being wrong.** (a) Every seat carries `minWidth: 44` in **every** mode — the labels-mode seat had none and measured **34.8px** against the floor, which is where the sub-floor seat actually was (972), not in icon-first as reported. (b) The measuring probe sits in a 0×0 `overflow: hidden` box and stops contributing **24px** of its own overflow to the container it measures. (c) The bundle's `__errors` array is **empty**; it held **three** entries, not five (972) — one React #299 in `app.jsx`, one in `composer/proto.jsx`, one `Can't find variable: IMG` in `connect.jsx`. No demo was removed.

**Two new glyphs:** `panel-left-close` (the semantic collapse control) and `chevron-left` (what a 180-degree rotation of `chevron-right` was faking, and absent from the set). 732: a rail collapse control renders from a named glyph with no transform.

**Still open, and measured:** a `dense` bar at a 260px header slot gives its active seat **82.7px** for **119.6px** of content, so the active lens's word clips by 36.9px. Equal flex fixed the movement, not the fit. The four `dense` options are priced against that in correction 21's extraction §2 and **none is chosen** (974).

### Attribution, extending the tables above

| Frame moves like this | Attribute to |
| --- | --- |
| Selecting a lens no longer re-lays the row, in any packing | 21, item 46 |
| A stretched bar's seats are all the same width | 21, items 46, 47 |
| A labels bar at a tight column flips to icon-first | 21, item 48 — the test got stricter by `n` seats' worth of padding |
| A labels-mode seat that was narrower than 44 is now 44 | 21, item 54a |
| An active seat shows a glyph *and* a word | 21, item 49 — `dense` in icon-first, or `icons` in labels |
| A header bar renders from the bundle rather than a staged copy | 21, item 50 |
| A dense active lens's word is cut off at a narrow header | **not fixed** — measured and open, see above |

## Rulings 978 and 981 — `dense` retired, and the test prices the packing

True of compile `v1789885868097915`, the fourth in this session. Items 46 to 54 stand except where named. 981 supersedes 979.

55. **`dense` is retired** (978, reversing 904). The prop is gone, `PAD_DENSE` is gone, and the state table is back to **eight rows**. The deciding fact: equal flex fixed seat positions and not seat fit, so a dense bar at a 260px header gave its active seat 82.7px for 119.6px of content and clipped the word by 36.9px — retiring the mode is the only one of the four options that makes that unreachable rather than managing it. **The header slot keeps `compact`**, which renders icon-first with the active chip keeping its icon under R1. **`AppHeader` was `dense`'s only caller**, so this is a consuming change; the prop is inert rather than throwing, so a page still passing it renders correctly while it is removed.
56. **Nothing about what a seat renders now depends on whether it is selected.** Item 46 made the division independent of content; 55 makes the content independent of selection. `LensBar.resolveSeat(iconFirst, on, icons, hasIcon)` still accepts `on` and never reads it, so a state table still varies the seat and shows both rows identical. Either change alone would have held the reflow closed; together the defect cannot be expressed.
57. **The fit test prices the packing, not only the layout** (981, superseding 979), and this **gives back item 48's mode change**. Item 48 charged the widest label for every seat; that is right under `fill`, where every seat is equal and each must hold the widest, and it over-prices `content`, where every seat is exactly its own label.

    ```
    seat(w) = max(SEAT, w + 2·PAD + 2·SEAT_BORDER + (icons ? ICON + ICON_GAP : 0))
    need    = 2(TRACK_PAD + TRACK_BORDER) + GAP(n−1) + body
    body    = n · seat(widest)     under width="fill"
    body    = Σ seat(wᵢ)           under width="content"
    ```

    On the Feed's three lenses (64, 70, 35) the widest-based form asks **312** against a 302px column and the sum asks **271**. **Feed at 390 keeps its words**, and item 48's "one bar changes mode" is withdrawn: **no bar in Strand's own kit changes mode across corrections 20 and 21 together.** No tolerance is added and an exact failure still falls to icon-first. **G36 point 2** is not contradicted — its defect was summing under a packing where seats *share*, so one long label overflowed its own share, and its run 239 read "network" at **86px of content inside a 72px share**. The sum was applied to the wrong packing, not wrong in itself. **981 writes the condition in: if a future packing shares, it takes the widest branch and the test is extended, never assumed.**

    *(An earlier draft of this item cited ruling 794 for the summing defect. 794 is a merge decision about PR #45 and says nothing about measurement; the defect is G36 point 2 in `docs/GAPS.md`. Corrected here rather than swapped silently, because a reader who looks up 794 and finds a merge decision has no way to tell whether the reasoning or only the citation was wrong.)*

### Attribution, superseding two rows above

| Frame moves like this | Attribute to |
| --- | --- |
| A labels bar at a tight column flips to icon-first | **re-check before attributing** — item 48 made this likelier and item 57 made it rarer; price it with the packing-aware form |
| An active seat shows a glyph *and* a word | 21, item 49 — `icons` in labels mode only; the `dense` route is gone (item 55) |
| A header bar's active lens shows its name | **not this bundle** — `dense` is retired (item 55); the header renders icon-first |
| A dense active lens's word is cut off at a narrow header | **cannot occur** — item 55 |

### 58. How `resolveSeat` is exhaustive: by domination, not by joint resolution (984)

**The question:** the state table reads `icon` for `iconFirst=1` at both `icons=0` and `icons=1`. Is `icons` dominated, or is the state unreachable?

**Dominated.** Both rows are reachable and neither should be marked otherwise. `icons` gates nothing: it is an independent prop, it does not enter `canSwitch`, and it *raises* `need` by `ICON + ICON_GAP` per seat, so setting it makes icon-first **more** likely, not less. `iconFirst=1, icons=1` is reached by passing `icons` to a bar that then falls back, or by `compact`. Measured: `compact` with `icons` renders three glyph-only seats and no word.

**And the guarantee is not the one 939 item 2 asked for.** Item 2 asked for two flags jointly resolved so that neither can leave a seat empty. What ships is two branches, each with one rule that always wins:

```
ico = iconFirst ? true : !!(icons && hasIcon)     // iconFirst wins; icons is never read
txt = !iconFirst                                  // labels always carries the word
if (ico && !hasIcon) ico = false
if (!ico && !txt)    txt = true                   // the joint guard
```

Domination in **both** directions, not only under `iconFirst`. The function mediates nothing.

**978 is why.** Before it the icon-first branch read `txt = !!(dense && on)` — genuine resolution of R1 against 904 by union, exactly what item 2 described. Retiring `dense` collapsed that term to `false` and turned the resolution into a domination. The guarantee changed character when the mode was retired, and nothing said so until now.

**The trade, both ways.** Domination is harder to break: there is no combination to get wrong, and a future rule touching only `icons` cannot reach the icon-first branch at all. It also means a third rule will need the branch structure reopened rather than a term added — and a reader who trusts the word "resolver" would expect mediation and not find it.

**The joint guard is still load-bearing, with exactly one live case.** `iconFirst` with a lens carrying no glyph: `ico` is cleared by the `hasIcon` check and `txt` is already false, so the guard fires and the seat falls back to its word. It is reached **only through `compact`** — the fit test cannot reach it, because `canSwitch` is false unless every lens has an icon (G36 point 1). Measured: a `compact` bar with one iconless lens renders two glyphs and one word, never an empty seat.

**The table is sixteen rows**, over `iconFirst`, `icons`, `hasIcon` and the seat's state, each carrying the route that reaches it. All sixteen are reachable, so it states nothing the part cannot do.

### 59. Open, not resolved here: `compact` reaches a state `canSwitch` forbids (G36 point 1)

**Carried as open on purpose.** It is a real disagreement between two rules, it needs Design, and folding it into this archive — already held once for a citation — would bury it.

G36 point 1 makes the labels-fit switch conditional on every lens carrying an icon: `canSwitch` is false otherwise, so the fit test can never render a glyph that does not exist. **`compact` does not consult `canSwitch`.** It forces icon-first directly, so a `compact` bar with an iconless lens reaches a state the fit test is specifically written to prevent.

Nothing renders empty — the joint guard catches it and that seat falls back to its word (item 58). The two measured renderings, so the disagreement can be judged rather than described:

| | rendering |
| --- | --- |
| `compact`, every lens has a glyph | three 44px glyph seats, no words |
| `compact`, one lens has no glyph | two 44px glyph seats and one worded seat, mixed in one track |

The second is coherent and legible, and it is not what either rule intended: G36 point 1 would refuse the mode, and `compact` renders it. **Which yields is a Design question**, and it is the question, not the fallback, that is open:

- `compact` could consult `canSwitch`, and refuse to force icon-first for a set that cannot supply glyphs — consistent with G36 point 1, but a caller passing `compact` would silently get labels in a header slot with no room for them.
- `compact` could keep forcing, and the mixed track becomes the declared rendering for that case — coherent, but it makes G36 point 1 a rule about the fit test rather than about the part.
- `compact` could require glyphs on every lens and say so in the type, moving the failure to the caller.

Not chosen here. The current behaviour is the second option **by default rather than by decision**, which is precisely why it is written down.
