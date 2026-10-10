# Strand correction 56: extraction

Session 56, 8 October 2026. Brief 56-S (`uploads/DESIGN-BRIEF-56-STRAND-CORRECTION.md`, `v1791493461141972`). Rulings: 1232, 1366, 1367, 1380, 1404, 1410, 1412, 1487 to 1491, 1500, 1530, 1533, 1534, 1540, 1541, 1568, 1576, 1577, 1578, 1583, 1590, 1593. Path 1. Items 1 to 7 are in source; item 8, the lens bar, is held as the brief holds it.

**Approved by the founder and ratified by Chat as 1599 (D1701), Session 56, 8 October 2026**, at compile `v1791495246160097`; the three new strings approved as written; 1600, 1601 and 1602 recorded in §12. The ratified records (`MEMBERCARD-EXTRACTION.md`, its addendum, `EXTRACTION-44-W62-W63.md`) are not amended (663); this pass has this file.

## 0. Compile, as read (873)

- **Built on:** `v1791154171250793`, read off the project `_ds_bundle.js` as its artifact version before any source was touched this pass (the brief's base; the MemberCard correction and the W62 media parts). The export note's header still describes `v1790880472850000`, the proposals-40 export; the MemberCard correction's export note (`export/_ds/MEMBERCARD-CORRECTION-EXPORT.md`) carries `v1791154171250793`.
- **The compile that carries this correction: `v1791495246160097`**, read off the project `_ds_bundle.js` as its artifact version at the moment of the copy (873), the turn after the source was written. Its header names all twelve changed or new sections (`Popover`, `MessageBubble`, `MessageComposer`, `ReactionGlyph`, `LinkRow` new; `MemberCard`, `BadgeRow`, `ConsoleShell`, `MeasureCard`, `StackedBars`, `Select`, `Sheet` changed), each closing with its `Object.assign(__ds_scope, …)`. One compile: no source changed between the write and the read.
- Pre-compile check: every changed or new part's source transpiled in the page and rendered once against the current bundle (`screenshots/correction-56/precheck.html`, a reading instrument): 12 files, 13 renders, no error. `check_design_system`: no issues; 66 components on disk against 57 compiled, 38 cards against 36 — the nine new exports and two new cards, waiting on the compile.

## 1. MemberCard and BadgeRow (1530, 1534, 1540, 1541, 1487 to 1491, 1500)

| # | Change | Ruling | Where |
|---|---|---|---|
| 1.1 | "who vouches for them" reads "who attested to them" | 1530 | `MemberCard.jsx` doc comment, `MemberCard.prompt.md`, `member.card.html` state 7. Three occurrences, all prose about reading order; none was UI copy |
| 1.2 | `onWithdraw` in context `sent`: Withdraw, the quiet second control beside Pending, drawn only when passed | 1534 | `MemberCard.jsx` (`acts`, `draw.withdraw`), `MemberCard.d.ts`, `.prompt.md`; specimen state 4 |
| 1.3 | The attestation pill carries its C's Adinkra glyph, masked to the pill's C text rung, in place of `shield-check`; all five Cs from `cmeta.C_GLYPH` (ruling 66's assignment) | 1540 | `BadgeRow.jsx`, `BadgeRow.prompt.md`; specimen state 7 |
| 1.4 | The portrait keeps its 4:5 crop at its tier width and never stretches; the content column grows past it | 1541 | `MemberCard.jsx`: the panel is `height: calc(width * 5 / 4)` and `align-self: flex-start`; the row keeps its 4:5-plus-inset minimum. `MemberCardSkeleton` the same. `.d.ts`, `.prompt.md`; specimen state 15 (new) |
| 1.5 | Every "wants a ruling" comment replaced with the ruling that answered it | 1487 inset, radius, halo; 1488 stance not drawn; 1489 compact actions with words; 1490 headline clamp; 1491 name floor; 1500 one pill open | `MemberCard.jsx`, `MemberCard.d.ts`, `MemberCard.prompt.md`, `BadgeRow.jsx`, `BadgeRow.prompt.md`, `member.card.html` notes |
| 1.6 | The 680 citation | 1530 | `MemberCard.d.ts` (`name`): 680 replaced by 1530. The ratified `MEMBERCARD-EXTRACTION.md` is not amended; its existing marker now points here (root and export copy, the marker's own sentence only) |

**1.6, recorded:** `MEMBERCARD-EXTRACTION.md` cites 680 for "nothing is looked up or composed; `name`, `handle`, `location`, `since` all render as passed". **680 is RSVP visibility and is the wrong number.** Chat searched the register and Notion for an earlier ruling stating that rule and found none. **1530 governs it:** field mapping and date formatting happen in the app's lib through `when.ts`, never in the part. The rule itself stands as written.

**Also in 1.5:** the unused `Square` function (the icon-only compact action 1470 first ruled) is removed from `MemberCard.jsx`. It was dead code kept "for the ruling that settles which stands"; 1489 settled it, and it referenced `Tooltip` without importing it. One comment marks where it stood.

**Drawing decisions, 1.2:** Connect v5 P1 was not shared with Strand, so Withdraw is drawn from the brief's words. Medium and expanded: `Button variant="ghost"` beside the Pending pill. Compact: `Wide` ghost with the `x` icon and its word, at its words; with Withdraw beside it the lone-Pending rule extends to both, so the band holds two word-sized items and neither stretches (a stretched state reads as a button; a stretched ghost reads as the primary act). Accessible name "Withdraw the request to {name}". If P1 draws it otherwise, this is one line to change.

## 2. Messenger parts (1533; SPEC-41-E: 1404, 1576 to 1578, 1583, 1590, 1593)

**What was read for this item, and nothing else from the app project:**

- `messages/B14-Messenger-v3.dc.html`, stamp **`v1791487330148240`**, through the founder's link (`claude.ai/design/p/71fc8555-90c4-400c-a558-382054acd743`). Read whole: `glyph()`, `emojiNode()`, `quickBar()`, `emojiPanel()`, `videoNode()`, `bubble()`, `composerNode()`, `sheetNode()`, `reactWith()`, `rich()`, `alertStrip()`, the review chrome.
- `messages/b14-messenger-data-v3.js`, stamp **`v1791487334087470`**, the page's fixture, for `QUICK`, `TONES`, `HANDS`, `RECENT`, `EMOJI_GROUPS` and the joiner (`names`, `upToThree`). It is what the page draws from; the records read nothing else in it.
- `SPEC-41-E.md` as uploaded (`uploads/SPEC-41-E-2.md`, `v1791493508906842`; the SPEC states its own page stamp `v1791487330148240` and fixture stamp `v1791487334087470`, which match), for item 2 only.

Not read: `strand-patch/AppHeader.jsx`, `../shell/strand-patch/PulseDock.jsx`, `support.js`, any other page.

| # | Part | What it carries | Ruling |
|---|---|---|---|
| 2.1 | **`MessageBubble`** (`components/dna/`, new) | The bubble as `bubble()` draws it: own on the thread's `--c-{c}-tint`, another member's on `--surface`; the sender's name in a group; meta line with edited, pinned, the time and the ticks (1336); the quote and the deleted form as v2 drew them; `reactions[] { emoji, names, own }` as one pill per distinct emoji string with the glyph at 18 and the names through the one joiner, up to three then "and others" (1317), never a count; the quick bar of eight plus More (44 on touch, 36 on pointer, one row scrolling at 390); the `video` kind as a native player with aspect from `width` and `height`, 16 / 9 only when either is missing, `object-fit: contain`, 320 wide at most, no duration label, failed state M1 and M2 with Try again remounting the player; the link card rule (card alone for a bare URL); `actions` slot for the pointer cluster, shown on hover or focus within; the pressed glyph pops once over `--dur-slow` | 1533, 1397, 1398, 1402 to 1406, 1574, 1576, 1577, 1583, 1586, 1593 |
| 2.2 | **`MessageComposer`** (`components/dna/`, new) | As v2 and v3 draw it: the strips (Replying to, Editing, Image or Video attached with a 72 thumbnail, the first-send notice, the voice note, the link preview, an act's refusal alert, the not-sent strip with Retry, a status line, the mention listbox); attach (IconButton opening a Menu of Image and Video); the field growing from 44 to 120; send in the thread's C or the mic (hold on touch, press on pointer); the recording line with the breathing dot and Cancel. Every line a strip reads is passed by the surface | 1533, 1390, 1409, 1530 |
| 2.3 | **`ReactionGlyph { id, size, fill }`** (`components/dna/`, new; proposed by 41-E) | The eight quick glyphs as the page's `glyph()` draws them, path for path, in Strand's palette; a hand with no modifier in `--ink-4` with the `--ink` outline; the five tones as Unicode's modifiers carried with the glyph set (`SKIN_TONES`, with the hex each names), not palette values and not tokens. Beside it: `ReactionEmoji { emoji, size }` (the drawn glyph for a stored quick reaction in the tone its own modifier names, the native character otherwise), `QUICK_REACTIONS` (1403's order, the stored characters and E9 names), `HAND_EMOJI`, and the helpers `stripTone`, `toneOf`, `withTone`, `quickFor` (module-internal; not on the namespace) | 1403, 1404, 1576, 1577 |
| 2.4 | **`Popover`** (`components/core/`, new; 1578) | The pointer container the picker opens in: anchored under its trigger (bottom-start, flipped when short, clamped), in Menu's chrome (`--surface`, `--line`, `--radius-l`, `--shadow-3`, `--z-menu`), width `min(100%, 360px)`, a title row with a Close IconButton, Escape closes, a press outside closes, a Tab that leaves closes, focus returns to the trigger. Strand styles the container only; Frimousse is a library. Pointer only by rule; the part renders on either mode and leaves the branch to the surface, as Menu does | 1578 |

**Specimen:** `components/dna/messenger.card.html` (new): the eight glyphs and the hands in six tones; the bubble in every form; the pills; the quick bar with no tone and with medium-dark; the video at 1280 by 720, at 720 by 900 contained, at 16 / 9 with no dimensions, and failed on either bubble; the link card rule; the pointer cluster held on hover; the picker as a Popover on pointer and a Sheet on touch with a stand-in body (Frimousse is not drawn); the composer's fourteen states. Both themes, touch and pointer, 390 and 768.

**Decisions inside item 2, none a departure:**

- `names` arrive as an array and the part joins them through the one joiner (1317). The names themselves render as passed; the joiner is the message's own grammar, and the SPEC (2.3) puts it on the pill. If Chat reads 1530 as forbidding even this composition in the part, the surface can pass the joined string instead; one line changes.
- `MessageBubble` takes `status` as the surface allows it (never "read" with receipts off) rather than a `receipts` flag, so the part cannot leak a read it was told not to show.
- The voice note player is not a Strand part (as built); it enters the bubble through `children`.
- `MessageComposer` words only the strips the page itself worded (Replying to, Editing, Image attached, Video attached, Remove the preview, Retry, OK, Cancel, the mic's four names, Attach an image or video, Image, Video, Message, Send, Save). Durations, recording labels, refusal lines and the first-send notice are passed in.
- `Popover` focuses the first control in its body on open (the picker's search), not Close, so a pointer member can type at once; Close is reachable by Tab.

## 3. Icons (1568)

`mail` added to `assets/icons/` from Lucide (1.5 stroke, 24 box), and copied to `export/_ds/assets/icons/`. With it `at-sign`, which item 6 needs (below). Both are plain SVGs with no metadata.

## 4. Admin parts (1366, 1367, 1380, 1410, 1412)

| # | Change | Ruling | Where |
|---|---|---|---|
| 4.1 | `ConsoleMenu` captures `document.activeElement` in the layout effect before it moves focus into the drawer, and restores it when `open` falls, so Escape, Close, the scrim and a chosen destination return focus to the opener. The effect that captured after the move is gone | 1366 | `ConsoleShell.jsx` |
| 4.2 | The loading ghost is `calc(figure size * figure line-height)` from the rung's tokens: 36.8 at m, 42 at l, 56 at xl. `parseInt('var(--display-l)')` was NaN and fell to 32 | 1367 | `MeasureCard.jsx`; `admin.card.html` draws the ghost beside its figure at each rung |
| 4.3 | A bar is never wider than one bar of a seven-point series (`(100 - 6 gap) / 7` of the axis), so a one-point series is a bar at the left of the axis, not a slab | 1380 | `StackedBars.jsx`; `admin.card.html` draws a one-point and a three-point series |
| 4.4 | `foot`: one destination set apart under a hairline at the foot of the left navigation and of the drawer, for Settings. `personal`: the id of the destination the staff name in the bar opens, for Personal; the name becomes a control with `aria-current` when it is the page | 1410 | `ConsoleShell.jsx`, `.d.ts`, `.prompt.md`; `admin.card.html` at expanded, at compact with the drawer opened for real, and with Personal current |
| 4.5 | `disabled`: the native attribute (not focusable for change, read as disabled), drawn as Button, Switch and Checkbox draw disabled: 0.45 opacity on the control and its label, cursor default, no hover or focus change | 1412 | `Select.jsx`, `.d.ts`, `.prompt.md`; `core.card.html` (which gains a theme switch) |

**4.2, noted:** the brief names rungs s, m, l and xl. Strand's `MeasureCard` has m, l and xl (`--display-l`, `--figure-l`, `--figure-xl`); there is no `s` in the part or its `.d.ts`, and none is added. If the tree's MeasureCard carries an `s`, that is a divergence for a brief to name.

## 5. Sheet's heading (#98 divergence)

Adopted from the tree's `Sheet.tsx` lines 174 to 183 at `2d81408`, as the brief quotes them: on open, when nothing carries `data-autofocus`, focus goes to the heading; the heading carries `tabindex="-1"` and `outline: none` (WebKit draws a ring on a programmatically focused element); Tab never reaches it (`FOCUSABLE` already excludes tabindex -1); shift-Tab from it wraps to the last control (the contained trap now handles an active element outside its list). A node title keeps the first-control focus. `Sheet.jsx`, `.d.ts`, `.prompt.md`; `sheet.card.html` gains a row with one sheet opened with `autoFocus` on and a readout of `document.activeElement`, and checks every sheet heading on the page for `tabindex -1`.

## 6. LinkRow (1232, gap S54-7)

`components/dna/LinkRow.jsx` (new), with `linkHref` exported beside it: a full `http(s)` URL is an anchor opening in a new tab; a bare website is prefixed `https://` and links; a bare handle is plain text, never `href="#"`. Items website, LinkedIn, X, Instagram in that order, whichever are set; each a 32 icon tile on `--bg-sunken` with the label at `--text-xs` and the text at `--text-s`, in rows at least `--target-primary` tall; a row that links is one anchor the whole row wide. No counts. Grounded or empty.

**Glyphs:** `globe` for the website and **`at-sign` for the three handles, as the tree draws them.** Strand would not draw brand marks: the icon set is Lucide-style UI glyphs and never a third party's identity, and a C-coloured system has no rung for another brand's colour. This does not depart from the tree's `at-sign`, so **nothing here wants a ruling.** `at-sign` joins the icon set (§3).

Specimen: `components/dna/linkrow.card.html` (new), both themes; the input switch is present and changes nothing, since the part has no hover state and no tooltip.

## 7. The export's byte record (S54-7, 995)

Read after the copy, off the files as they sit in `export/_ds/`:

| file | bytes | SHA-256 |
|---|---|---|
| `export/_ds/_ds_bundle.js`, as shipped (the id header and the body) | **540,110** | **`134e9f5d9a67ce03a8a9bdf058191f0a01290fdbf8611d40d76300e4ef930004`** |
| project `_ds_bundle.js`, the body alone | 539,782 | `21f2eccc94b5d644c25f0ea008b87a88de572714ddd31dc5f862bdab698e8cc7` |

The difference is the 328-byte three-line header (`/* @ds-compile-id … */`, the one-line export note, `window.__DS_COMPILE_ID = …`). The app binds the shipped file, so the shipped figures are the ones to check. Both are stated in `export/_ds/README-EXPORT.md`'s header for this id.

## 8. Held: the lens bar

Not touched: `LensBar.jsx`, its `.d.ts`, `.prompt.md` and `dna.card.html`'s lens bar frames. #98's two divergences, 1515's corners and 1575's end fades wait for Chat's addendum after Fix PR 09 merges.

## 9. Compile, export and the blank check

| check | reading |
|---|---|
| compile id, read off the project `_ds_bundle.js` (873) | `v1791495246160097` |
| copied to `export/_ds/` | `_ds_bundle.js` (with the id header), `_ds_manifest.json`, `styles.css`, `tokens/` (5 files, unchanged this pass), `assets/icons/mail.svg`, `assets/icons/at-sign.svg` |
| manifest | 66 components, 38 cards, 241 tokens |
| blank page `export-blank-check.html`, loading `export/_ds/styles.css` and `export/_ds/_ds_bundle.js`, rendering nothing | `window.__DS_COMPILE_ID` `v1791495246160097`; **`__errors` 0**; 66 exports on the namespace |
| the nine new exports on that page | `MessageBubble`, `MessageComposer`, `ReactionGlyph`, `ReactionEmoji`, `Popover`, `LinkRow` functions; `QUICK_REACTIONS` 8 items, `SKIN_TONES` 6 items, `HAND_EMOJI` 9 items |
| byte count and SHA-256 | §7 |

`export/_ds/` carries artifacts and documents only (no source), as the MemberCard export settled. This file is copied there beside `README-EXPORT.md`.

## 10. Every new string, for the founder's approval

Strings a ruling here does not supply (guardrail 4). Everything else the parts word is carried from the page as built or from SPEC-41-E §10.

| String | Where | Why |
|---|---|---|
| **"Withdraw"** | `MemberCard`, the sent control (1534) | 1534 names `onWithdraw` and the control beside Pending; the word itself is the brief's and the SPEC's (Manage lists invited members with Withdraw), not a ruled string. **New.** |
| **"Withdraw the request to {name}"** | `MemberCard`, the control's accessible name | Follows "Connect with {name}", "Message {name}", "Follow {name}". **New.** |
| **"Attach"** | `MessageComposer`, the attach Menu's `aria-label` | The page's menus are all named "Actions"; this one holds Image and Video. Aria only. **New.** |

Carried, not new: "This message was deleted", "edited", "pinned", "Sent", "Delivered", "Read", "Video" (the player's name when no alt), "React", "More", "This video could not load.", "Try again", "and others"; the composer's strip words listed in §2; "Website", "LinkedIn", "X", "Instagram" (the tree's LinkRow); "Close"; "Not yet"; "Open navigation".

## 11. Tokens

**None added or changed.** Every value is a token by name. Two notes:

- Strand has no named disabled token; Button, Switch, Checkbox and now Select share the literal 0.45 opacity. **Proposal, not made here:** a `--disabled-opacity` token in `tokens/base.css` the four would read. Named for a later pass.
- The five skin tone hex values live in `ReactionGlyph.jsx`'s `SKIN_TONES`, with the glyph set, by 1404's own instruction: they are emoji's modifier tones, not Strand palette values, and are deliberately not tokens.

## 12. Wants a ruling — settled, Session 56, 8 October 2026

1. **StackedBars' cap (1380).** The ruling caps a single bar's width and does not fix the cap. Drawn here: never wider than one bar of a seven-point series, placed at the left of the axis. **Settled by 1600: the cap stands as drawn.**
2. **Withdraw's drawing (1534).** Connect v5 P1 was not shared; the control is drawn from the brief's words (§1, decisions). **Settled by 1601: Withdraw stands as drawn and is checked against Connect v5 P1 at the app's port.**
3. **The reaction names (§2, decisions; 1317).** Drawn here: `names` arrive as an array and `MessageBubble` joins them through the one joiner. **Ruled 1602: `MessageBubble` renders the reaction names as passed and does not join them.** One line changes in `MessageBubble.jsx` (the pill's text and its accessible name take the string the surface passes; the `.d.ts` and `.prompt.md` follow). **By 1602 the change goes in the lens bar addendum's compile, not now;** at `v1791495246160097` the part still joins.

**Strings (§10):** "Withdraw", "Withdraw the request to {name}" and "Attach" are approved as written (1599).

## 12a. Known defect at this compile, not fixed, for the founder's decision

**`Popover`'s focus return (1578) is wrong when the trigger did not hold focus at open.** Found by the verifier after the compile. `close()` prefers the element that had focus when the panel opened over the trigger; when that element was `document.body` (Safari does not focus a button on click; a programmatic open, as in the specimen), it then queries body's first focusable element and focuses that, which is the page's first control and not the trigger. 1578 says focus returns to the trigger. The fix is one line in `components/core/Popover.jsx`'s `close()`: restore to `anchorRef.current`'s focusable first (as `Menu` does), fall back to the captured element only when no anchor is given, and never query descendants of `document.body`.

**Not applied here, deliberately.** The brief's Done Means 2 is one compile, and this compile (`v1791495246160097`) had run when the defect was read. Applying the fix recompiles. **Ratified at this compile with the defect recorded (1599); the fix travels with 1602's one-line change to the lens bar addendum's compile.** `MessageBubble`, the quick bar, the Sheet path on touch and everything else in item 2 are unaffected; the pointer picker opens, places, closes on Escape and outside press, and the panel's own focus move is right. Only where focus returns is wrong, and only when the trigger was not focused when the panel opened.

Everything else in this pass is either ruled by the numbers above or a decision inside a ruling, recorded where it was made (§2 decisions, §4.2, §5, §6).

## 13. Parts changed, in one list

Changed: `MemberCard` (+ `MemberCardSkeleton`), `BadgeRow`, `ConsoleShell`, `MeasureCard`, `StackedBars`, `Select`, `Sheet`. New: `MessageBubble`, `MessageComposer`, `ReactionGlyph` (+ `ReactionEmoji`, `QUICK_REACTIONS`, `SKIN_TONES`, `HAND_EMOJI`), `Popover`, `LinkRow` (+ `linkHref`). Icons: `mail`, `at-sign`. Specimens: `member.card.html`, `admin.card.html`, `core.card.html`, `sheet.card.html` changed; `messenger.card.html`, `linkrow.card.html` new. `readme.md` indexes the five new parts. No surface, no page, no app-project file (guardrail 1).
