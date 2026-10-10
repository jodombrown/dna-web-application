# MemberCard: extraction

Session 44, 4 October 2026. Brief 44-W70, rulings 1469 to 1472. Source changed under `components/dna/`, `tokens/spacing.css`, `tokens/colors.css`, `readme.md`. **No other component's source was touched.** **Ratified by Chat as rulings 1487 to 1496** (129), on the compile exported as `v1791154171250793`. The addendum `MEMBERCARD-EXTRACTION-ADDENDUM.md` corrects it under 1491 and 1497 to 1499 and is **ratified as 1530** (Session 56, 7 October 2026) with three corrections recorded there. Two rulings of that session change what this document describes and are owed to the next correction brief as source: **1534** (`onWithdraw` beside Pending in `sent`) and **1541** (the portrait never stretches). Neither is in the source yet.

One part serves every member list the app has. Connect | Members, Connect | Suggested and all five lists of My Network are the same card under four `context` values; there is no second member card and no fork.

## Rules that bind this part (checked against the source)

- No count, no score, no completion: mutuals render as names and never as a number; `reason` is DIA's sentence and carries no figure; no percentage, ring or meter exists in the part.
- No sector chips (1472): they stay on the profile.
- Nothing is looked up or composed (680 — **this is the wrong ruling number**; Chat noted it in Session 56, 7 October 2026. **1530 governs: field mapping and date formatting happen in the app's lib through `when.ts`, never in the part. Recorded in `STRAND-CORRECTION-56-EXTRACTION.md`, §1.6.** The rule itself stands as written): `name`, `handle`, `location`, `since` all render as passed. The part never formats a date, never derives initials from anything but `name`, never computes "3 days ago".
- Both themes: the part reads tokens only and branches on no `data-theme`. The portrait halo is the one value the dark theme overrides, in `tokens/colors.css`.
- Message appears only where 1336 to 1339 allow it, which the caller passes as `canMessage`.
- `--glow-dia` stays DIA's: the reason line is `DiaLine`, not a styled span.

## 1. Tokens

`tokens/spacing.css`, the MemberCard block:

```
--member-portrait-inset:var(--space-3);
--member-portrait-radius:var(--radius-m);
--member-portrait-shadow:0 0 8px rgba(26,26,24,0.34);
--member-portrait-compact:132px;
--member-portrait-aspect:4 / 5;
--member-portrait-medium:152px;
--member-portrait-expanded:172px;
--member-card-min-height:288px;
--member-name-min-compact:15px;
--member-name-min-wide:18px;
--member-stance-size:12px;
--member-portrait-focus:50% 22%;
```

`tokens/colors.css`, dark theme only:

```
--member-portrait-shadow:0 0 10px rgba(0,0,0,0.55), 0 0 0 1px rgba(242,237,229,0.10);
```

Why the override: on the warm near-black ground an ink shadow has no delta against `--surface`, so the dark theme separates the photograph with a deeper halo and a faint rim of its own light.

`--member-portrait-inset` is one token for the card's whole edge — the name lane, the identity column and the compact context block all pad by the same step, so the name starts on the portrait's own left edge. `--member-stance-size` is parked with the `stance` prop and drawn nowhere; it is kept so the ruling that settles the stance has a value to return to.

## 2. MemberCard (`components/dna/MemberCard.jsx`)

Purpose: one member, read the same way on every surface that lists members.

Props: `name` (required), `handle`, `stance` (not drawn), `headline`, `location`, `src`, `focus`, `context` ("members" | "suggested" | "requests" | "sent"), `connection` ("none" | "pending" | "connected"), `following`, `canMessage`, `mutuals string[]`, `mutualsLead` ("You both know"), `reason`, `since`, `note`, `tier` ("compact" | "medium" | "expanded"), `input`, `href`, `onOpen`, `onConnect`, `onMessage`, `onFollow`, `onAccept`, `onDismiss`, `style`.

Imports: `Button`, `Icon` from `components/core/`, `DiaLine` from `components/dna/`, `assetBase` from `components/dna/cmeta.js`. Assets: `adinkra/nkonsonkonson.svg` (the Connect mark), icons `check`, `x`, `user-plus`, `message-circle`, `map-pin`.

Tokens read: the twelve above, plus `--surface`, `--bg-sunken`, `--line`, `--line-strong`, `--ink` to `--ink-4`, `--c-connect`, `--c-connect-text`, `--c-connect-tint`, `--c-connect-ink`, `--radius-l`, `--radius-m`, `--radius-s`, `--border-thin`, `--space-1` to `--space-4`, `--font-display`, `--font-sans`, `--display-m`, `--display-s` with their `-lh`, `--text-s`, `--text-xs` with their `-lh`, `--weight-medium`, `--target-primary`, `--focus-offset`, `--dur-default`, `--ease`.

### Structure

One structure at every tier: a column holding the name lane (when the name needs one), the portrait row, the context block, and the action band at compact.

- **Compact (360, 390).** The name takes its own lane across the card's head, so it measures against the whole card and not the 138px column beside the portrait. Under it the portrait leads a row carrying `@handle`, the headline and the location, centred against the portrait's height. The context block sits under that row. The actions span the card's foot in their own band under a hairline, each 44px tall, each carrying its mark or icon with its word, sharing the band's width.
- **Medium (768) and expanded (1280).** The portrait leads a content column; the name sits at the head of it, the content packs to the top, the context block sits above the actions, and the actions anchor to the card's foot, right justified. Unless the column cannot hold the name at `--member-name-min-wide` — then the name is promoted to the same head lane the compact card uses, on measurement and not on breakpoint.
- *1541 (Session 56, 7 October 2026) rules that the portrait keeps its 4:5 crop at its tier width and never stretches, the content column growing past it; owed to the next correction brief, not in the source.* **The portrait row carries the 4:5 minimum** (`calc(width * 5 / 4 + 2 * inset)`), so the photograph's height is intrinsic at every tier and never whatever the bands around it leave over: 132&times;165, 152&times;190, 172&times;215, taller when the content asks for it.

### The name fit

The name is never truncated, abbreviated or wrapped: one lane at every tier. `useFitName` measures it against its lane and steps the size down to `--member-name-min-compact` / `--member-name-min-wide`, then past that floor to a hard 10px for a name that needs it. The size gives; the name never does.

Hardened: the first step is proportional, so a long name settles in a couple of passes rather than sixty; both axes are checked; the authored rung is carried as `--member-name-base` on the element and re-asserted each pass, since React diffs against its own props and would never restore a cleared inline value; it refits when the display face finishes loading, since the fallback's metrics measure differently; it refits when the **lane** resizes, observed rather than the element itself, so changing the size cannot feed back into another measurement; and it bails while the lane has no width, as in a card not yet shown.

The settled size is published to the card as `--member-name-fitted`. Every line under the name takes `max(12px, min(<its own rung>, var(--member-name-fitted) * <share>))` — handle 0.85, headline and location 0.8 — so the name stays the largest line in the card however far the fit had to go, and nothing computes illegible. An ordinary name never triggers any of it: at full size the rungs win.

### The context block

When the request arrived, the note its sender wrote, the mutual names and DIA's reason draw **inside** the card, between the identity and the actions, and the card grows to hold them. So the card reads identity, then why, then what you can do about it, at every tier.

- `since` — `--text-xs` in `--ink-3`, rendered as passed.
- `note` — `--ink-2` on a `--bg-sunken` panel at `--radius-m`, wrapping, never truncated.
- `mutuals` — names joined with "and" after `mutualsLead`, ending in a full stop. Drawn **in any context that has them**, not only in suggested: a connection and a follower have mutuals too.
- `reason` — `DiaLine state="done"`, suggested only, since no other surface has a sentence of DIA's to give.

### Actions

| context | connection | actions |
| --- | --- | --- |
| members | none | Connect, Follow |
| members | pending | Pending, Follow |
| members | connected | Connected, Message (where allowed), Follow |
| suggested | any | the members set, plus Dismiss |
| requests | — | Accept, Dismiss |
| sent | — | Pending alone — *1534 adds `onWithdraw`, drawn as the quiet second control beside Pending; owed to the next correction brief, not in the source* |

Labelled `Button`s at medium and expanded; the mark or icon with its word at compact. The Connect action carries the Connect mark (nkonsonkonson): the dock draws that mark bare, and here it is always enclosed in a control whose fill is the request's state — solid `--c-connect` to send, a dashed `--line-strong` edge while the request waits, `--c-connect-tint` once it is granted. So the states read as a request and never as navigation.

**Pending and Connected are states, not controls**: `role="img"` with an accessible name, no hover, pressed or focus. A lone Pending sizes to its words rather than sharing the compact band — stretched across the foot a state reads as a button, which it is not. The three-action compact band steps its words and glyphs a rung down, so Connected, Message and Following never collide at 360. Suggested's Dismiss is labelled "Dismiss this suggestion", not "Dismiss <name>": what is refused is DIA's suggestion, not the member.

`Square` (44px icon-only, tooltipped) is kept in the source and drawn nowhere — 1470 ruled the compact actions icon-only and the founder then asked for the word beside the mark. It stands for the ruling that settles which of the two is right.

### States

With a portrait; without one (the initials tile in the display face, still the card's leading edge); with a portrait that fails to load (the same tile — a 404 often fails before any handler is attached, so the decoded size is checked after each render as well as on `error`, and the fallback re-arms during render only when `src` truly changes, so it cannot clear what the load just reported); with and without a headline, a location, a handle, a context block. Grounded-or-empty throughout: a missing line leaves no gap and no placeholder.

### Pointer, touch, accessibility

Pointer: the card's edge grounds to `--line-strong` on hover and on focus within; the name underlines on focus. Touch: no hover edge, 44px targets. `input` follows `(pointer: coarse)` unless given.

The portrait carries no alt text and its panel is `aria-hidden`, since the name sits beside it, so a screen reader hears the member once. It loads lazily and decodes off the main thread, for a long member list. `href` makes the name and the portrait links to the profile; the portrait's link is `tabIndex={-1}` so it is not a second stop; a plain primary click calls `onOpen` and prevents the default. Every action carries an accessible name that includes the member's.

### Departures, ruled

All four were ruled with this extraction's ratification. Each stands as drawn; none is open. **The "wants a ruling" comments in the source were left exactly as they are** — they are a source edit, and they go to the next correction brief rather than to this records pass.

1. **The portrait's inset, radius and halo** (`--member-portrait-inset`, `--member-portrait-radius`, `--member-portrait-shadow`). The founder's mock sets the photograph into the card; 1469 and guardrail 6 said no inner radius and no gutter. **Ruled 1487: as drawn.** The mock governs; 1469 and guardrail 6 give way on this point.
2. **The stance is not drawn.** The founder: remove it. The brief listed it third, above the headline. Prop and token kept. **Ruled 1488: as drawn.** The stance stays undrawn; `stance` and `--member-stance-size` stay parked where they are.
3. **Compact actions carry their word beside the mark.** 1470 ruled them icon-only. `Square` is kept for the reversal. **Ruled 1489: as drawn.** The word stays beside the mark and 1470's icon-only clause is reversed; `Square` stays in the source, now unused by a settled question rather than an open one.
4. **The headline keeps to two rows and ends in an ellipsis.** Guardrail 4's default grows the card to fit its content. The full text sits on the element's `title`; nothing else in the card is cut. **Ruled 1490: as drawn.** The clamp stands against guardrail 4's default for the headline alone.

Two further questions raised after this extraction are ruled with it: the name floor, **1491** — the fit stops at the floor and the name wraps rather than stepping to a hard 10px (built in the addendum, §3); and one attestation pill open at a time, **1500** — as built (addendum §2).

Recorded and **not** wanting a ruling: the context block moved inside the card, which this part first kept outside so it cost the card no height. The founder reversed it, and the reversal restores guardrail 4's own default — so 1471's record of that answer is superseded rather than contested.

### Parked

A crop or focal-point step at upload, so a member chooses the image that fits the panel. It belongs to the profile or the Composer, not to this part. `focus` is the socket it lands in.

## 3. The five lists of My Network are four contexts

Connections, Following and Followers are all `context="members"`, separated by `connection` and `following` rather than by a context of their own. Requests received is `requests`; Sent is `sent`. One shell, one portrait system, one name fit, one action band: the context chooses which actions draw and whether the block above them has anything to say.

Not built, and not this part's work: the Suggested page and the My Network tab bar, and the four empty states (suggestions exhausted, no requests, nothing sent, no connections yet). The empty states belong to the surfaces; their words are the founder's to write.

## 4. Specimen

`components/dna/member.card.html`, ten states: the card at expanded, medium and both compact frames; Suggested with the reason line and its Dismiss; Requests and Sent with `since`, a note and the lone Pending; My Network's three member lists side by side; the longest name beside the longest `member_stances` label; one row at equal heights; each action at rest, hovered, pressed and focused, with one control really focused for reading against the drawn ring; and the hardening row — no portrait, a broken portrait, no headline, a wrapping location. Both themes, touch and pointer.

## 5. Files

- `components/dna/MemberCard.jsx`
- `components/dna/MemberCard.d.ts`
- `components/dna/MemberCard.prompt.md`
- `components/dna/member.card.html`
- `tokens/spacing.css` (the MemberCard block)
- `tokens/colors.css` (the dark-theme halo)
- `readme.md`

## 6. Export

**Exported.** `export/_ds/_ds_bundle.js` stamped `v1791154171250793`, with `_ds_manifest.json`, `tokens/spacing.css`, `tokens/colors.css`, `readme.md`, this file and the addendum. `MEMBERCARD-CORRECTION-EXPORT.md` carries the compile id as read, the three new compiled sections, and the blank-page `__errors` reading (0). The tree's port is `src/components/dna/MemberCard.tsx`; `MEMBERCARD-CODE-PROMPT.md` is the instruction that carries it there.
