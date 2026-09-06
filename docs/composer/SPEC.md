<!-- Copy of the approved B1-Composer-v2 handoff spec (Claude Design extraction). Two amendments applied in code review: the ruling 63 citation in section 1 is ruling 68, and the DIA budget in section 4 is 3.5s per ruling 74 (D176). -->

# DNA Brief 1 — Universal Post Composer — Handoff spec

Generated from the prototype. Live composer page: `composer/B1-Composer-v2.dc.html` in the app project (app.diasporanetwork.africa); source components and tokens live in Strand and sync here as `_ds/`. Claude Code builds from this file, the brief, and CLAUDE.md. Rulings referenced are D103 onward.

Status: v2, awaiting founder approval on the prototype (gate 3). v1 review rulings 63 to 67 applied. Sections marked **assumption** are routine calls made in design; overturn by ruling.

## 1. Surface

One composer shell, mounted once per app, opened from any surface. Component: `Composer` (`components/dna/Composer.jsx`). It never navigates the member away (ruling 52). It composes every verb inline: Make an Intro, Host an Event, Start a Space, Post a Need, Share a Story, plus the untyped post, which is general Convey (ruling 68). The system category is reserved for platform-authored items and never appears in the composer.

Container by tier:

- Compact (< 640), touch: `Sheet variant="sheet"`. Full height minus `safe-area-inset-top + 8px`, top radius 14, drag handle (36×4, `--ink-4`, 24px hit row), `padding-bottom: env(safe-area-inset-bottom)`. Preview stacked below the fields. Publish bottom-anchored.
- Expanded (> 1024), pointer: `Sheet variant="drawer"`, right side, `min(1000px, 100%)` wide, full height, 1px `--line` on the left. Two columns: fields `minmax(0,1fr)`, preview 400px on `--bg`. Publish in a footer row with the shortcut hint.
- Medium (640 to 1024): derived from compact by rule inside the composer itself (ruling 58). Same sheet, same stacked order, content column capped at `--content-max` (680) centered. Checked at 820 on the review page.

Scrim `--scrim`. Shadow `--shadow-stack` (the one permitted use besides Dialog). Esc closes; scrim tap closes; drag handle released past 120px closes. Closing with content keeps the draft.

## 2. Layout and order (identical at every tier, ruling 59)

1. Header: author `Avatar` 32 (rounded square 6 when a Space), author name or Space dropdown (`<select>`, 44 tall, when the member holds a role in any Space; ruling 56), "in {anchor}" in `--ink-3` when anchored, spacer, "Draft saved" (13px `--ink-3`, only when a draft exists), Close `IconButton`.
2. Text field. Plain `textarea`, no border or fill, 19px / 1.5 `--font-sans`, `--ink`, placeholder "What is going on with you?" in the browser placeholder color (`--ink-3` equivalent). 4 rows compact, 6 expanded, grows with content. Pointer mode: drop target for images. Autofocus in pointer mode only (touch keeps the keyboard down until the member taps).
3. Verb row: five `VerbChip`s in C order, `role="radiogroup"`. Compact: horizontal scroll bleeding 20px into the gutters. Expanded: wraps to a second line so all five stay visible. Always visible (ruling 53).
4. `DiaLine` directly under the chips. Renders nothing when DIA has nothing.
5. Verb fields (only when a verb is set): a 1px `--line` rule, then a 13px caps label in the C color with the act name, then the fields from `VERB_SCHEMA[c]`:
   - connect: Who (text), Why (2-row text)
   - convene: Title, Date, Time, Location or link, Hybrid (Switch), Ticket (Free | Paid segment)
   - collaborate: Title, Category, Roles sought
   - contribute: Title, Instrument (Time | Skills | In-kind segment), What is needed (2-row), By when
   - convey: Title
   Fields DIA filled carry a caps "DIA" tag (11px, `--ink-3`) right of the label; the tag disappears the moment the member edits, and DIA never writes to that field again.
6. Attach row: `IconButton image` "Add an image", `IconButton link` "Add a link". Touch: the image button opens two secondary Buttons, "Take a photo" (`capture="environment"`) and "Choose from library". Pointer: the image button opens the file picker; the row also says "Drop images on the text". Link opens an inline `Input` "Link" plus an "Add" button; Enter adds. Thumbnails 72×72 radius 10 with a remove button; one link row with a remove button. Cap 4 images (`maxImages`). No video, no audio (ruling 55).
7. `AudienceSelect`: "Who sees this", pills Everyone on DNA, My connections, and the anchor name only when anchored (rulings 56, 27). Ink fill for the selected pill; audience is not a C.
8. Preview (compact): caps label "How it will appear" then the `PostCard`. Expanded: the right column, no label. **Renders only when the member has typed, attached, or filled a field.** Empty composer = no card, no placeholder.
9. Publish `Button` in the post's C color (`c={verb}`), ink when untyped. Full width compact. Disabled until there is content. Label is always "Publish" for every verb (confirmed in v1 review).

Spacing: sheet gutters 20 (compact) and 24 (expanded); section gap 24; field gap 14; chip gap 8. Type: `--text-l` for the text field, `--text-m` body, `--text-s` labels and chips, `--text-xs` caps. All touch targets 44 (chips, pills, icon buttons, "Not this?", remove buttons, select).

## 3. The card preview

The preview is `PostCard preview` with the exact props the Feed will render (ruling 52). Mapping from the backing shape:

| Backing field | PostCard prop |
|---|---|
| author_kind, author | `author`, `authorKind` (Space squares the avatar, appends "· Space") |
| c_category | `c`. Untyped posts carry `convey`: plum frame, Convey `CBadge`, no kicker, no title, body only (ruling 68). `system` is never produced by the composer |
| body | children (`pre-wrap`) |
| anchor | `anchor` → "In {name}" in the meta line |
| created_object | `kicker` (Intro / Event / Space / Need / Story; none when untyped), `title` (the `title` field; none when untyped), `fields` rows with icons: date calendar, time clock, place map-pin, ticket ticket, hybrid → "Yes", roles users, category hash, instrument briefcase, need circle-dot, by calendar, who user-plus, why message-circle |
| audience | `audience` label with icon: globe Everyone on DNA, users My connections, hash the anchor |
| media | 1 image → `MediaBlock image`; 2 to 4 → `gallery` |
| link_unfurl | `link` → `MediaBlock link` (domain, title, optional image). Domain only until the unfurl resolves; nothing invented |
| dia_line | not on the card; it is the `DiaLine` under the chips |
| status | "Draft saved" in the header, nothing else |

Member-written fields show a 14px `pen-line` glyph in `--ink-3` after the value (`mine=true`). The card's action button is the C's primary act (Accept the intro, Get a ticket, Join the Space, Offer to help, Read the story) in the C color; the engagement row is inert in preview.

## 4. States

- Empty: text empty, five chips unselected, no DiaLine, no preview, Publish disabled. Looks like an ordinary composer.
- Thinking: fires 700ms after the last keystroke once trimmed text is 8+ characters and the member has not chosen a verb. `DiaLine state="thinking"`: 8px `--ink-3` dot breathing 0.25→1 opacity over 1.2s, "DIA is reading". Budget 3.5s (`THINK_BUDGET`; ruling 54 set 2.5s, amended to 3.5s by ruling 74, D176, after Sonnet-class latency measured at 2.2 to 2.9s per call); a slower resolve is dropped and the composer stays as it was. Newer keystrokes cancel older inferences (run counter).
- Populated: DIA resolved `{ c, fields, line }`. The chip for `c` selects; fields not already written by the member fill with the DIA tag; the card assembles; `DiaLine state="done"` reads "DIA read this as an Event." (Intro, Space, Need, Story) with "Not this?".
- Error-as-silence: inference null, timed out, threw, or below the confidence floor. Identical to populated-without-DIA: no chip selected unless the member chose one, no DiaLine, the card renders as an untyped Convey post from the text alone (plum frame, body only). No error UI, ever (ruling 54).
- Member override: tapping a chip selects that verb, clears the DiaLine, and stops inference for this draft. "Not this?" clears the verb and DIA's fields (member-written fields stay), returns to an untyped Convey post, and stops inference. Both paths are one tap; nothing asks to confirm.

Six previews (Connect, Convene, Collaborate, Contribute, Convey, Untyped) × light and dark × compact 390, medium 820, and expanded 1280, and the four shell states × themes × tiers, are reachable from the Review row on the composer page ("Jump to"). The three frames are visible at once (ruling 67).

## 5. Tokens used

Color: `--bg`, `--bg-sunken`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--line`, `--line-strong`, `--on-fill`, `--scrim`, `--c-{connect,convene,collaborate,contribute,convey}`, `--c-*-tint`. Dark theme swaps every one of these under `[data-theme="dark"]` (added in `tokens/colors.css`); C colors in dark are lifted to pass AA as text on `--bg`; `--on-fill` becomes near-black so ink on a C fill stays ≥ 4.5:1. No raw palette values anywhere in the composer (ruling 57).
Type: `--font-sans`, `--font-display` (card title only), `--text-l/m/s/xs`, `--weight-medium/bold`, `--tracking-caps`.
Space and shape: `--space-2/3/4/5/6`, `--radius-m`, `--radius-l`, `--radius-pill`, `--border-thin`, `--border-card`, `--touch-min`, `--content-max`.
Motion: `--dur-fast`, `--dur-base`, `--ease`, `--shadow-stack`.

## 6. Components and props

- `Composer` — `open, onClose, onPublish(post), tier, mode, author, spaces, anchor, infer(text) → Promise<Inference|null>, unfurl(url) → Promise<meta|null>, initialVerb, maxImages=4`. Exports `VERB_SCHEMA`.
- `Sheet` (new, core) — `open, onClose, variant sheet|drawer, label, width, contained`.
- `VerbChip` (new) — `c, selected, onClick, compact`. Exports `VERB_ACT`.
- `AudienceSelect` (new) — `value everyone|connections|anchored, onChange, anchor, label`. Exports `AUDIENCE_LABEL`.
- `DiaLine` (new) — `state thinking|done|null, text, onNotThis`.
- `PostCard` (extended) — new props `authorKind, anchor, audience, fields, link, preview`. `c="system"` exists for platform-authored items only; the composer never passes it.
- Existing: `Button` (`c`, `full`, `disabled`), `IconButton`, `Input` (label accepts a node), `Switch`, `Avatar`, `Icon`, `MediaBlock`, `CBadge`.
- Icons added to `assets/icons/`: camera, users, globe, upload, pen-line, hash.

## 7. Interaction modes

Touch (compact): drag handle to dismiss; camera and library attach; horizontal chip scroll; sticky Publish above the safe area. Keyboard-aware (`useKeyboardHeight` in `Composer`): when `window.innerHeight - visualViewport.height` exceeds 80px the sheet height becomes `visualViewport.height - 8` with no bottom safe-area padding, the scroll region nudges the focused field above the Publish row, and the preview scrolls under it. Restores on keyboard dismiss. Not active inside contained prototype frames.
Pointer (expanded): file picker and drag-drop onto the text field; hover states from the system (outlined controls fill `--bg-sunken`); autofocus on open. Shortcuts, additive only (ruling 59): open composer `c` when focus is not in a field (host surface owns this), publish `⌘/Ctrl + Enter`, close `Esc`. The footer prints "⌘ Enter to publish · Esc to close" (render the Ctrl form on non-Mac).
No feature exists in one mode only.

## 8. Breakpoints and test matrix

Review frames (ruling 67): Compact 390, Medium 820, Expanded 1280 side by side, each with its tier header from Strand, the host route under the frame label, and the scale. The composer has no route; frames show the host route it opened from. Tapping a Pulse item in any frame changes the route and active state in all three (`/convene` by default).


- < 640: sheet. 360 and 390: chips scroll, audience pills wrap to two rows, preview stacks. 430: same.
- 640 to 1024 (744, 820, 1024 portrait): sheet, content column 680 centered. 1024 landscape: drawer.
- > 1024 (1280, 1536): drawer at 1000; the preview column is 400 fixed, fields take the rest.
Both themes, Safari and Chrome (ruling 61).

## 9. Edge cases

- Text under 8 characters: no inference; a previous DIA verb and line clear if the member erases to below the threshold and had not chosen a verb.
- Member types after DIA resolved (no override): DIA re-reads on the next pause; it may change the verb and any field it wrote, never a field the member wrote.
- Member changes verb after DIA filled fields: fields are keyed by name, so `title` carries across verbs; DIA-tagged fields that do not exist on the new verb are hidden, not deleted, and return if the member switches back.
- Space authorship: the preview's author switches immediately; anchor and audience are unaffected. The dropdown is absent when the member holds no roles.
- Anchored open: audience defaults to the anchor (the Space or event the composer opened inside). Everyone on DNA remains one tap away (ruling 68).
- Fifth image: the image button disables at four; the picker truncates a multi-select to the free slots.
- Unfurl fails: the link row and card show the domain only. No "could not load" text.
- Publish with only an image or only a link: allowed; the card body is empty and the media carries the post.
- Draft: autosaves 800ms after any change (data-URL images excluded); restored on next open unless the composer was opened from a verb entry; cleared on publish or when the composer is emptied. "Draft saved" is the only trace; no scheduling (ruling 56). `localStorage dna.composer.draft` is prototype-only; production drafts are server-side per member.
- Offline or inference unreachable: silence.
- Very long body: `pre-wrap` and `overflow-wrap: anywhere`; the card grows; no truncation in the composer.

## 10. Motion

Sheet: rise 24px with fade, 200ms `--ease`; drawer: slide 24px from the right with fade, 200ms. Dismiss: reverse. Drag follows the finger with no easing, snaps back at 200ms if released under 120px. DiaLine: thinking dot breathes at 1.2s; the resolved line fades in at 200ms. Chip and pill selection: background and border color at 120ms. Card fields: appear without animation (the card assembles by reflow; no per-field fades). Nothing bounces or scales.

## 11. Not in this spec

DIA prompt design, inference floor logic, routing, data fetching, unfurl service, draft sync across devices, attestation. Claude Code owns them; the prototype mocks inference with keyword rules only to make the states clickable.
