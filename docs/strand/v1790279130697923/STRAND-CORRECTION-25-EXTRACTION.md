# Strand correction 25, rulings 663 and 1102 with 1103: PostCard discovery, Menu, FacetRail displays, LensBar trailing, Input combobox

**23 September 2026, session 31. For Chat to ratify under 129.** Governed by 129, 498, 578, 581, 589, 603, 604, 663, 718, 855, 873, 876, 899, 1060, 1076 to 1079, 1085, 1087, 1096, 1097, 1099, 1102, 1103. Source: B9-EXTRACTION Revision 9 §3 as ruled (relayed data; the app project was not opened, read from or cited, 663).

Scope is the five ruled items and nothing else. **Held or refused, not drawn:** BodyBlocks, HostCard, Person card, MediaBlock strip and carousel, the `flag` icon.

**Compile.** **v1790212533284400**, read from the compiled artifact after the pass (873). It supersedes `v1790160131064912` (correction 24), which is the state every "before" below was read from. **One compile was read and not stamped:** `v1790212178003783`, which predates the 1103 token, the Home reading and the four part fixes in §7. Corrections 23 and 24 keep their ids; nothing is re-dated (855).

> **Stamped 23 September 2026**, session 31, against **v1790212533284400**. Readouts at the stamp (58 rows): `compact Sheet renders every display = segment segment segment checklist ladders combobox`; `discovery faces in the lane, heights = 434.6 × 6`; `media ratio, with and without an image = 1.768 × 6` (the 1px media edge sits outside the 16:9 box); `no media renders the C glyph = 2 faces, glyph=true`; `title row height (two lines held) / rendered title = 55 × 6 / 27.5 55 27.5 55 27.5 27.5`; `the forum title clamps at two lines = scrollHeight 85 > clientHeight 55, clamp=2`; `reason row holds its height, with and without a reason = 36.4 × 6`; `no topic, no chip (Swahili) = 1 control in the row`; `one ellipsis control per face; touch / pointer size = 111111; 44 / 36`; `presenter row touch / pointer = 44 / 32`; `no going row, no Report, no footer = going=false footer=false`; `digits outside the when row = 0`; `a press on the body opens, a press on a control does not = 1 then 1`; `pointer hover underlines the title; frame colour unchanged = underline, rgb(184,115,51)`; `onPreload fires once = 1`; `selected ring (23) on the discovery face = true`; `feed presentation untouched = 4 footer acts, no data-presentation`; `going, menu items in order = Share · Copy link · Save · Add to calendar · Follow Ama Owusu · Subscribe to Arts and culture · Not this`; `z-index is --z-menu (1103), between sticky and dialog = 62`; `portal into body, fixed = body, fixed`; `no disabled item = 0`; `first item has focus on open = Share`; `ArrowUp wraps to the last = Not this`; `touch item height = 44`; `Escape closes, prevents default, focus back on the ellipsis = menu=false prevented=true focus=More`; `not going, Add to calendar absent, rules close up = … [iii|ii|i]`; `outside press closes = closed`; `pointer item height = 36`; `danger tone reads --danger = rgb(204,51,51) = rgb(204,51,51)`; `Format is a Segment led by Any, Any checked when unset = Any* In person Online Hybrid`; `choosing Online, then Any clears the axis = Online → Any`; `Segment seat height = 44`; `Topics checklist, nine rows at 44, toggle = 9 rows, 44, second checked=true`; `Home is correction 24's ladders (1060, 1085), radiogroup, two ladders = ladders, radiogroup, 2`; `Place combobox, "acc" suggests by word prefix = Accra · Greater Accra; expanded=true`; `the list lays inline in the rail scroller = static`; `ArrowDown sets aria-activedescendant = :r0:-list-1`; `Enter chooses; chosen as a removable chip; field clears = Remove Greater Accra; field=""`; `no match renders the caller's line, not an option = No event in a place by that name, options=0`; `Escape closes the list and prevents default = expanded=false prevented=true`; `rail scrolls; heading pinned at the scroller top = scrollTop 300, heading top −265.1 vs scrollport top −265.1, hairline=true`; `collapse control stays on the pinned heading = true`; `no horizontal overflow in the rail = 278 / 278`; `after Clear all = 3 checked (the Any seats), chosen 0`; `no count in the rail or the sheet = none`; `LensBar trailing, compact 390 / medium 820 / expanded 1280 = icon-first / labels / labels, outside the tablist, gap 8`; `five tabs, trailing seat not a tab = 5`; `the fit test prices the column less the seat = icon-first at 780 beside the door, labels at 780 alone`; `combobox role and ARIA at rest = combobox, list, expanded=false, controls=true`; `options and their height (floor 44; a detail line adds one) = 55.9`; `overlay list = absolute`; `Enter chooses = Nairobi`; `no digit in any list = none`; `bundle __errors = 0`; **`ALL_CHECKS: yes`**.

---

## 0. Before, read from `v1790160131064912`

| what was checked | reading |
|---|---|
| PostCard `presentation` | **no prop**; one face (feed or Brief 1) |
| a menu part | **none**; `onMenu` hands the caller a press |
| FacetRail displays | **chips only**; ladders as chips (24) |
| FacetRail heading in a scroller | **not sticky**; the nav does not scroll |
| LensBar seat outside the tablist | **none** |
| Input combobox | **none** |
| a menu rung in 603 | **none** |

## 1. PostCard `presentation="discovery"` (1076 to 1079, 1087, 1096, 1097)

`presentation: 'feed' | 'discovery'`, default feed. `PostCard` now dispatches to two faces; the feed face is the previous function body unchanged. The discovery face is **fixed size**: every region holds its height whatever the record carries, so a lane is one height (434.6 × 6 at touch) and nothing jumps as data arrives. It never shrinks in a flex lane (`flex: none`) at `--lane-card-width`. In order and nothing else: media at 16:9 (`object-fit: cover`), the C glyph on `--bg-sunken` when there is none; title in the display face clamped to two lines and holding two lines' height (1087); when; where; presenter (24 Avatar, `onPresenter`) and topic (a C Chip, `onTopic`, absent when null) on one row; the reason row (1096), DIA's words in two held lines, empty and `aria-hidden` when there is no reason. **One control:** the ellipsis on the media's top right, `--surface` ground, 1px `--line`, 44 touch / 36 pointer, opening Menu with the caller's items. No going row (1096), no Report (1097), no price, badge, count or number. The whole face opens (`onOpen`); a control does not. `onPreload` fires once on pointer enter or focus. Pointer hover underlines the title in `--line-strong`; the frame stays the C colour (rule 2). Correction 23's `selected` ring applies unchanged.

**Accepted at this stamp (not new rulings):** `input` overrides the detected input mode (proofs), and the presenter row is 44 touch / 32 pointer.

## 2. Menu (1102)

New part, `components/core/Menu.jsx`. `items` of `{ id, label, icon?, tone?, onSelect }` and `{ rule: true }`. **An item that does not apply is absent**: the caller leaves it out or passes a falsy entry, which is dropped; there is no disabled item and no `disabled` field. Rules never lead, trail or double once absent items are gone (read: `[iii|ii|i]` with Add to calendar absent). `tone: 'danger'` renders in `--danger`; it exists in the part and Discovery does not use it (1097). WAI-ARIA menu: roving focus, ArrowUp/Down wrap, Home/End, Enter/Space select, Escape and Tab close; Escape and select return focus to the anchor; Escape calls `preventDefault` so 23's Pane and Sheet guards do not also fire. Portal into `document.body` by default at `position: fixed`, bottom-end from the anchor, flipped above when short, clamped to the viewport, repositioned on scroll and resize; `portal={false}` renders in place for scaled frames. Items 44 touch, 36 pointer; `input` overrides.

**Stacking (1103).** `--z-menu: 62` joins 603's order between `--z-sheet` 60 and `--z-dialog` 65: above pane and sticky chrome, below dialog and notification, as ruled. **62 is the draw's value within those bounds**, chosen so a menu clears the sheet it opens from. Menu reads `--z-menu` and never `--z-notification`.

## 3. FacetRail displays (1102)

`display` on `FacetAxis`, facets rendering only (`single` mode and the strip ignore it): `chips` (default); `segment`, a `select:'single'` axis as Strand's `Segment` led by an Any seat that clears the axis (`anyLabel`, default "Any"; ignored on a multi axis); `checklist`, one 44 row per option, `role="checkbox"`, drawn in Strand tokens (`--ink` fill, `--on-fill` check) rather than through `Checkbox`, whose check is a hex literal; `combobox`, a typeahead over the axis's options through Input's combobox (§5), the list laid inline so the rail's scroller never clips it, chosen options as removable chips under the field (Place). Strand matches by prefix on each word of an option's label and `detail`, and never says how many matched.

**Home.** An axis with `ladders` is correction 24's ladder part (1060, ratified 1085) whatever `display` says, and renders `data-display="ladders"` as a radiogroup. B9 Revision 9's "Select ladder" names that part, not a new display.

**Heading sticky in its scroller.** The rail form is its own scroller (`overflow-y: auto`, `overscroll-behavior: contain`); bound its height through `style`. The heading, with `headingAction`, is sticky at the scroller's top on `--surface` and takes a `--line` hairline once the axes have scrolled under it (read: heading top equals scrollport top at scrollTop 300; the collapse control stays on it). Net geometry unchanged at rest: the pin's negative margins equal its padding.

**Sheet at compact.** Unchanged part; the Sheet already pins its title outside its scrolling body, and every display renders in it (read: `segment segment segment checklist ladders combobox`).

## 4. LensBar `trailing` (1102)

One seat at the bar's end, on the track's row, outside the tablist: a door that is not a lens (My events). Never a tab. The fit test prices the column **less the seat and an 8px gap** (`TRAIL_GAP`, exported in `metrics`) and re-measures when the seat resizes (read: icon-first at 780 beside the door, labels at 780 alone). Stretched tracks take what the seat leaves; `content` tracks leave the seat at the row's far end. The caller supplies the control at the 44 floor. Absent, the bar renders exactly as before.

## 5. Input combobox (1102)

Passing `suggestions` (an array, possibly empty) makes the single-line field a WAI-ARIA 1.2 combobox: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`. The caller owns the query and the matching. ArrowDown opens and moves, ArrowUp moves, Enter chooses, Escape closes with `preventDefault`; a press on an option does not blur the field. `noMatch` is the list's only line when nothing matches, not an option; Strand ships no copy. `listbox: 'overlay' | 'inline'`. Options floor at 44 on every input mode (498); a `detail` line adds one line (55.9). `icon` puts a leading glyph in the field (accepted at this stamp). Hint, error, focus rendering and every non-combobox call are unchanged; the hint or error line is now tied by `aria-describedby`.

## 6. Not touched

MediaBlock, Checkbox, Segment, Select, Sheet, Pane, AppHeader, every token but `--z-menu`. BodyBlocks, HostCard, Person card, MediaBlock strip and carousel, `flag`: held or refused. No count, badge or number anywhere: the readout scans every card row but the when row, every rail, sheet, menu and list.

## 7. What the readout caught before the stamp (873)

Four part defects, fixed and re-read: discovery faces shrank in a flex lane (heights 381 to 404; now `flex: none`, 434.6 × 6); a portal menu could not take focus while `visibility: hidden` before it had a position (focus now moves once placed); pointer items read 37.8 against 36 (padding moved to the sides); a shorthand and longhand `textDecoration` mix warned on re-render. Two readout fixes: the compact Sheet autofocuses and the readout's own Escape closed it, so the Sheet is read first; the digit scan read Sheet's `<style>` keyframes and now reads `innerText`.

## Proof

`screenshots/correction-25/proof.html` (gallery), `readout.html` (58 measurements), `shared.js` (fixtures relayed from B9 Revisions 6 and 8). Labels in 949's form: tier · width · input · theme. **Three frames**, compact 390, medium 820, expanded 1280, each in both themes and both input modes: five lenses with My events trailing, Filters (the compact pill), two lanes of the discovery face, a menu open. Then every card state, Menu at touch and pointer with the danger specimen, the rail at rest, scrolled and in the compact Sheet, the LensBar trailing at three widths, the combobox empty, open, no match and error.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped**, above (873). `v1790212178003783` was read and not stamped.
3. **`--z-menu` is 62**, the draw's value inside 1103's bounds, so a menu clears the sheet it opens from. Recorded here, not a new ruling.
4. **Home is correction 24's ladders** (1060, 1085); no Select display was added.
5. **The checklist draws its box in tokens** rather than through Checkbox, whose check colour is a literal; Checkbox is untouched.
6. **`input` and `icon` props and the 44/32 presenter row** accepted, per the instruction.
7. **Correction number 25**, following 24 in this session.

## Files

`components/dna/PostCard.jsx`, `PostCard.d.ts`, `PostCard.prompt.md`; `components/core/Menu.jsx`, `Menu.d.ts`, `Menu.prompt.md` (new); `components/dna/FacetRail.jsx`, `FacetRail.d.ts`, `FacetRail.prompt.md`; `components/dna/LensBar.jsx`, `LensBar.d.ts`, `LensBar.prompt.md`; `components/core/Input.jsx`, `Input.d.ts`, `Input.prompt.md`; `tokens/spacing.css` (`--z-menu`); `readme.md` (Menu listed); `screenshots/correction-25/proof.html`, `readout.html`, `shared.js`; `export/_ds/` (bundle re-marked, manifest, styles, tokens, this file, `README-EXPORT.md` header); this file and its export copy (876, 899). The export is delivered as **one archive** (663).
