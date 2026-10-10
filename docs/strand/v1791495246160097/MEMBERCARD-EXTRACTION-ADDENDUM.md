# MemberCard: extraction addendum

Session 44, 4 October 2026. Brief 44-MC-CORRECTION, rulings 1491, 1497, 1498, 1499 (D1593, D1599, D1600, D1601). Read with `MEMBERCARD-EXTRACTION.md`, which stands except where this says otherwise. **Ratified by Chat as ruling 1530** (Session 56, 7 October 2026; 129), **with three corrections**, none of them yet in the source:

1. The reading-order sentence in §2 says "who vouches for them"; it reads **"who attested to them"** (1530). The same sentence stands in `MemberCard.jsx` line 28 and `MemberCard.prompt.md` line 23 and is corrected there by the next correction brief, not by this records pass. This document keeps the sentence as it was written, marked at the spot.
2. **The app's port replaces its own `IdentityMark` and `BadgeRow` with Strand's** (1530). The app is not to keep a local pair.
3. **Badge dates are formatted by the app before they reach the part** (1530). `when` arrives as a string the card renders as passed; the part never formats a date.

Ruled in the same session and **owed to the next correction brief as source changes, not made here**: **1534**, MemberCard gains `onWithdraw` in `context="sent"`, drawn as the quiet second control beside Pending; **1540**, the BadgeRow pill draws its C's Adinkra glyph, masked to the pill's C text rung, in place of `shield-check`; **1541**, the portrait keeps its 4:5 crop at its tier width and never stretches, the content column growing past it. **1533** proposes `MessageBubble` and `MessageComposer` as parts, to be specified in that brief.

Five changes. Two new parts, one behaviour reversed, one new part of the card's own family, one frame added.

## 1. IdentityMark (1497, 123) — new

`components/dna/IdentityMark.jsx`, `.d.ts`, `.prompt.md`.

One fact, drawn once: this member's identity was verified. 22px, `role="img"`, accessible name "Identified". **No ring, no arc, no percentage, no second degree** — a member is identified and the mark draws, or they are not and nothing draws. Doctrine 123 allows the fact and no figure attached to it.

The disc is `--ink` and the check `--surface`, so the pair inverts with the theme on its own and reads on a photograph, on the initials tile and on a sunken panel with no per-theme branch. The 1px `--surface` rim is separation, not a ring around a value: against a dark photograph an ink disc dissolves into it.

Props: `size` (default 22), `label` (default "Identified"), `style`. Placement is the caller's.

**In MemberCard**: the portrait's bottom-right corner, inset by `--member-mark-offset`, 22px at every tier so it holds at 360.

**The portrait was restructured to carry it.** The panel — photograph or initials tile, radius, halo, `overflow:hidden` — is now `position:absolute; inset:0` inside a new positioned wrapper that takes the `--member-portrait-inset` margin and the tier width. The mark sits on that wrapper, **outside** the panel's `aria-hidden` and outside the portrait's `href` link. Both of those are deliberate: a mark inside an `aria-hidden` subtree is silent, and a mark inside the link is a second route to the same profile. A screen reader now hears the member's name once and the mark once, and the mark is not a tab stop. Everything else about the portrait is unchanged: same width per tier, same 4:5 row minimum, same focal point, same halo (the halo is not clipped, since the wrapper sets no `overflow`).

## 2. BadgeRow (1497, 123) — new

`components/dna/BadgeRow.jsx`, `.d.ts`, `.prompt.md`.

One pill per C that a counterparty attested. **The pill is not the attestation; it is the door to it.** It opens, inside the card, to the provenance: what was done, who attested it, the role they attested from, and when. A badge that cannot show its work is a score, which 123 does not allow.

`attestations: { c, items: [{ what, who, role?, when? }] }[]`. Guardrail 1 held: **two attestations are two lines**, never "2", never a count on the pill, never "+1 more". Guardrail 2 held: the pill takes the attested C's tint ground and text rung, and the open block takes that C's `--c-stroke` accent — ruled for this part, no precedent elsewhere. `when` is rendered as passed; the part never formats a date (680).

Pills are ordered by `C_ORDER`, not by arrival order, so the same member reads the same way on every surface. Guardrail 3 held: no attestations returns `null` — no row, no heading, no gap, and the caller does not test for it.

**One decision this part made, which is not in the brief: one pill is open at a time. Ruled 1500: as built.** An independent toggle per pill can treble one card's height while its neighbours in the grid stand still. Opening a second closes the first, so a card grows by one provenance block at most.

**In MemberCard**: `attestations` draws in the context block, after the mutual names and before DIA's reason, so the card reads **who, then who vouches for them, then why DIA raised them** — *1530 corrects this to "who attested to them"; the source still carries "vouches" until the next correction brief*. `hasContext` now counts attestations, so a member with badges and nothing else still gets the block.

## 3. The name floor (1491) — reversed

`--member-name-min-compact` is 15px and `--member-name-min-wide` is 18px, as before. What changed is what happens at the floor.

**Before:** the fit stepped past the floor to a hard 10px, because one lane was the rule and the size gave before the name ever did.

**Now:** the fit stops at the floor. `HARD_MIN` is gone. At the floor the order of giving is:

1. **the lane** — a name the column beside the portrait cannot hold at 18px is promoted to a lane across the card's head, and the fit runs again there (unchanged, but it is now the *first* concession rather than a side effect);
2. **the line count** — in the head lane at the floor, the name wraps to a second line.

So a name that once needed 10px to stay on one line now sits at 15px on two. The name is still never truncated and never abbreviated. `--member-name-fitted` is still published and the handle, headline and location still take their share of it, which means those lines no longer compute from a sub-legible base.

`useFitName` gained a `head` argument, since the hook now has to know whether the lane has already given before it allows the wrap. The breach report moved out of the published-size step into the overflow branch, where it belongs: previously it fired on `s < floor`, which the new ladder never produces.

## 4. MemberCardSkeleton (1499) — new, in `MemberCard.jsx`

Exported from `components/dna/MemberCard.jsx` and declared in `MemberCard.d.ts`, not given its own file: the skeleton is the card's shell, and a shell in another file drifts from the card the first time the card moves.

It draws the name lane, the portrait panel at its 4:5 minimum, two content lines, and the action band at compact — from the same tokens and the same tier widths, so a list does not reflow when the data lands. Props: `tier`, `style`.

**Static `--bg-sunken` blocks, no shimmer and no pulse.** Strand has no skeleton part that animates, so there was nothing to follow; and a moving card in a long list reads as activity the member does not have.

`aria-hidden` with no text: the list that draws it owns `aria-busy`, so a screen reader is told the list is loading once rather than once per card.

## 5. The 820 frame (1499, 67)

The specimen's frames are now 360, 390, 768, **820**, 1280. 820 reads as the `medium` tier: the card at its widest before the grid takes a second column. The tier rule in the specimen is `w <= 390 ? compact : w <= 820 ? medium : expanded`.

## Confirmed, not changed

**The origin, heritage and corridor line is not drawn (1498).** The ratified extraction already omitted it; nothing in this pass added it. Noted in `MemberCard.prompt.md` so a later pass does not reintroduce it.

## Tokens

`tokens/spacing.css`, one added and one comment corrected:

```
--member-mark-offset:6px;   /* the Identified mark's inset from the portrait's bottom-right corner */
```

`--member-name-min-compact`'s comment no longer says "before the hard minimum"; it records the 1491 ladder.

`IdentityMark` and `BadgeRow` take no tokens of their own — they read `--ink`, `--surface`, `--bg-sunken`, the C rungs, `--c-stroke`, the radii, the type rungs and `--focus-offset`. Their sizes belong to them, not to MemberCard's token block.

## Specimen

`components/dna/member.card.html`, now fourteen states across five frames. Added, in reading order:

- **6, Identified** — with a portrait, over the initials tile, on a connected member, and a fourth card that is not identified and draws nothing in its place.
- **7, The attestation badges, closed and open** — one badge; three badges; three with the Contribute badge open for real, holding two attestations as two lines; and one on a suggested card, so the badge row and DIA's reason are read in the same card. The open state is the part's own: a helper clicks the pill rather than drawing an open state by hand.
- **8, The name at its floor, wrapping** — a 49-character name that wraps at 360, beside the longest name in the data for comparison.
- **9, The skeleton** — two shells beside the real card at the same tier.

States 6 to 10 of the ratified specimen are now 10 to 14, and the two cross-references between the action-state rows were renumbered with them.

## Departures: all ruled

The four departures in the ratified extraction stand unchanged and are now ruled, each as drawn: the portrait's inset and halo **1487** (over 1469 and guardrail 6), the stance not drawn **1488**, the compact actions carrying their word **1489** (reversing 1470's icon-only clause), and the headline's two-row clamp **1490** (over guardrail 4's default).

1491 settles the fifth. The name floor was a departure under the old ladder — the size went past the floor to 10px — and the ruling has now reversed it; it is no longer open.

The decision this pass made on its own, **one attestation pill open at a time** (§2 above), is ruled **1500: as built**.

Nothing in this part is now waiting on a ruling. The addendum is **ratified as 1530** (Session 56, 7 October 2026). What is outstanding is source work, all of it owed to the next correction brief: the 1530 wording, `onWithdraw` (1534), the Adinkra pill glyph (1540) and the portrait's fixed 4:5 crop (1541). **The "wants a ruling" comments in `MemberCard.jsx`, `BadgeRow.jsx` and the prompt files were deliberately left as written** — they are source edits and belong to the next correction brief, not to a records pass.

## Files

- `components/dna/IdentityMark.jsx`, `.d.ts`, `.prompt.md` (new)
- `components/dna/BadgeRow.jsx`, `.d.ts`, `.prompt.md` (new)
- `components/dna/MemberCard.jsx` (the mark, the badges, the floor, the skeleton)
- `components/dna/MemberCard.d.ts` (`identified`, `attestations`, `MemberCardSkeleton`)
- `components/dna/MemberCard.prompt.md`
- `components/dna/member.card.html`
- `tokens/spacing.css`
- `readme.md`
