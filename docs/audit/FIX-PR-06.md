# Fix PR 06: the card fade's measured edge, the greeting's clearance, and Connect's ground

The closing report for this PR, against `main` at `84e669c` (PR #36's merge). Three scope items under
rulings 588, 589 and 590, all defect and conformance work on already-approved surfaces. No schema, no
new component, no new surface. Written to be read by someone who saw none of the work.

## Outcome

All three items are landed with a measured proof, and each one is paired with its reverted baseline so
that no arm in this PR can pass both ways. Ruling 590 gained a third clause mid-session and it is
landed with the other two.

**Two of the handoff's premises were not true, and both are reported here rather than worked around
(ruling 555).** Neither changes the outcome; both change the mechanism and one changes the number.

1. **The lens anchor's negative top margin does not overlap the greeting.** The handoff reads
   `padding: 12px 0; margin: -12px 0; boxShadow: 0 -12px 0 0 var(--bg)` as 24px of painted ground above
   the anchor's content: 12px of border box pulled up over the greeting, plus 12px of shadow. The
   column those two elements sit in is a flex column with `gap: 12`, and in flexbox the distance
   between two items is the gap plus the second item's top margin. 12 and -12 cancel, so the anchor's
   border box begins exactly on the greeting's bottom edge and overlaps nothing. Measured, not
   reasoned about: `gapToAnchor: 0` on the deployed build, and the same idiom is visible one element
   up, where `[data-compose-wrap]` carries `marginBottom: -12` to cancel the same gap.

   The overlap is therefore the shadow's 12px alone, of which the greeting had 4px of padding to give,
   so **8px** of the date's line box was under the ground rather than 24px. Pixel-counted on the
   rendered date: at `padding-bottom: 4px` the glyph rows at offsets 12, 13 and 14 carry 31 ink pixels
   that the ground paints over; at 8px and above the whole line is present and no larger value adds
   anything. **The clearance shipped is 16px, not the handoff's 28** — 12 to clear the shadow's whole
   band plus the 4px the block already had. 16 rather than 8 because the assertion is on the date's
   _line box_ rather than on its glyphs, so it does not depend on the display font's metrics, which is
   the confidence the handoff correctly flagged as moderate. 28 would have been 12px of dead air above
   the lens bar for no reason anybody could later reconstruct.

2. **`setSurfaceGround` was not only a ground.** The handoff's Edit A says to remove the effect and
   change one background. In the tree, `AppShell` read that one flag for two unrelated things: the
   column's background _and_ Connect's column padding,
   `padding: sunken ? "0 24px 48px" : "0 0 calc(100dvh - 240px)"`. Removing the call as written would
   have silently reverted Connect's column to the Feed's zero-inset padding and its tall bottom pad —
   a layout change nobody asked for, in the same commit as a colour change, with nothing to attribute
   it to. The flag is renamed to `setColumnPad("inset")` instead: the colour half is gone under 590 and
   the padding half, which is Connect SPEC 2 and outlives 181, keeps working. Proved rather than
   asserted: the connect arm at expanded now checks the column still computes `0px 24px 48px`.

**Item 3's stop-and-report clause is answered and nothing was load-bearing elsewhere.** `setSurfaceGround`
had exactly one producer and one consumer in the whole tree. Named in full under item 3 below. The
sunken ground is not under the rails, not under the dock, and not read by any other surface, so the
clause's stop condition was not met and the work proceeded.

## The result: the ten Done Means checks

Every row is measured on the deployed preview across ruling 61's matrix in both themes, by the arms
named in the table under "Ruling 270" below. The tier stops the arms run at are the matrix's own:
390x844, 820x1180, 1280x800 and 1536x960 for the Feed behaviour arm, and all nine viewports in both
themes for Connect.

| #   | Check                                                                                                                                 | Result                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No card below full opacity while any part of it is below the bar; 0 only when wholly above; no blank region                           | Holds on Feed and on Connect, every tier, both themes                                                                                          |
| 2   | The outgoing fade and the next card's arrival overlap rather than sequence                                                            | Holds; evidenced by a sampled position with the tail mid-fade and the next card fully opaque, 12px seam                                        |
| 3   | Under `prefers-reduced-motion: reduce` every card holds opacity 1 on both surfaces                                                    | Holds; `CardFade`'s early return is untouched by 588 and was verified at four viewports in both themes                                         |
| 4   | The greeting's date renders whole at expanded, scroll 0 and mid-scroll; clearance reported                                            | Holds. **Clearance used: `padding: 8px 0 16px`**, leaving 4px between the date's line box and the anchor's painted ground                      |
| 5   | Connect's LensBar track reads as a sunken track against its column, every tier, both themes, indistinguishable from Feed's            | Holds. Connect's column now computes the same value as the Feed's, and the painted ground and track differ by a full token step                |
| 6   | Connect's descriptor collapses on the first scroll, latches, returns on a tap of the active lens                                      | Holds; `1, 0, 0, 1, 1` across the five reads                                                                                                   |
| 7   | `setSurfaceGround`'s other consumers named; any load-bearing one reported rather than worked around                                   | Answered: one producer, one consumer, nothing load-bearing beyond Connect's own column. See item 3                                             |
| 8   | The enforcing matrix green on both engines on the final head; any count change regenerated, declared and explained                    | See "Ruling 292: the declaration" and "The enforcing run" below                                                                                |
| 9   | This report exists at `docs/audit/FIX-PR-06.md` and records any false premise                                                         | This file; two premises corrected above                                                                                                        |
| 10  | `MemberCard` carries the hairline `--line` border after the ground change, in both themes, never a resting shadow (590, third clause) | Holds. Light `rgb(228, 222, 211)` on `--surface` `rgb(255, 255, 255)`; dark `rgb(51, 49, 44)` on `rgb(26, 26, 24)`; `box-shadow: none` in both |

## The three items

### 1. Ruling 588: the fade is measured from the card's bottom edge — landed

`CardFade`'s `paint()` drove opacity from `getBoundingClientRect().top`, so a card reached opacity 0 as
soon as its top edge was 96px above the bar. A Feed card with an image is 600 to 900px tall, so the
remaining 500 to 800px of it painted nothing while holding its full layout box. That is the founder's
blank region: the card had not been removed, it had been made invisible in place.

`paint()` now measures `r.bottom` against the bar and clamps the distance to the card's own height, so
a card shorter than 96px cannot begin fading while it is entirely on screen. `FADE_UNDER_DISTANCE`,
`ease()`, the shared rAF loop, the reduced-motion hold and the live selector resolution are unchanged:
489's distance and curve are untouched and 588 extends it rather than replacing it.

The second edit in the item is `FeedSurface`'s selector. `stickySelector={expandedTier ? "[data-lens-anchor][data-stuck='1']" : "[data-app-header]"}`
failed to resolve at expanded until the greeting had left, so `bar.current()` fell back to
`stickyBottom = 0`, the top of the window rather than the bar. The anchor is `position: sticky` in both
of its expanded states and its live `getBoundingClientRect().bottom` is correct in both, so the
qualifier is dropped. Both changes are cited in the component's doc comment alongside 489, as the
handoff asks.

**A third change belongs to this item and the handoff did not know it was needed.** `ConnectSurface`
mounted `CardFade` with no `scroller`, so the group registered on `window`. The shell owns one scroller
per tier and the document never scrolls inside it (ruling 104), and a scroll event on an element does
not reach `window`. Connect's fade therefore painted once on mount and again only on resize: it had
never run. The reverted baseline shows it plainly — every member card at opacity 1 with the first
card's bottom 48px below the bar, inside 489's window. `ConnectSurface` now passes
`scroller={scrollerRef.current}` from the same `useShellScroll()` call item 3's Edit B needs, so the
handoff's "Connect's member cards will now fade" is true for the first time. Its stated reason, that a
short list made the defect invisible, is not what the tree held.

### 2. Ruling 589: the greeting owns the clearance beneath it — landed, with the number corrected

The anchor's geometry and shadow satisfy 104 and do not change; the greeting pays for the overlap. The
mechanism and the number are corrected under "Outcome" above: the overlap is the shadow's 12px, not
24px, and the clearance shipped is `padding: 8px 0 16px`, measured at 4px of remaining air between the
date's line box and the painted ground at both expanded stops in both themes, at scroll 0 and
mid-scroll.

The arm reads the shadow's y offset off the computed style rather than hardcoding 12, so it follows the
anchor if that offset ever changes, and it reports `gapToAnchor` beside the clearance so the next reader
sees the cancelled gap rather than having to rediscover it.

### 3. Ruling 590: Connect's ground, and its explainer collapse — landed, all three clauses

**Edit A, the ground.** Connect and Feed mount the same `LensBar`, whose track is `--bg-sunken`.
Connect put its column on `--bg-sunken` too, so the track and the column were the same colour and the
track did not read as a track. 590 revokes 181: Connect's column sits on `--bg`, and the sticky
wrapper's background goes from `var(--bg-sunken)` to `var(--bg)` so cards still pass under an opaque
bar. The column paints no ground of its own at all now, which is exactly what the Feed's column does,
so "indistinguishable in treatment from Feed's" is literal rather than approximate.

**The stop-and-report answer: every consumer of `setSurfaceGround`, named.**

| Reference                                        | What it was                                                                                 | After                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/lib/rail-store.ts`                          | the store: type `SurfaceGround`, `setSurfaceGround`, `useSurfaceGround`, state key `ground` | renamed to `ColumnPad` / `setColumnPad` / `useColumnPad` / `pad` |
| `src/components/dna/ConnectSurface.tsx:279`      | the only producer in the tree: `setSurfaceGround("sunken")` on mount, `null` on unmount     | `setColumnPad("inset")`                                          |
| `src/components/dna/AppShell.tsx:89`             | the only consumer: `useSurfaceGround() === "sunken"`                                        | `useColumnPad() === "inset"`                                     |
| `AppShell.tsx:294` (expanded `main`)             | `padding` **and** `background`                                                              | `padding` only; the background line is gone                      |
| `AppShell.tsx:349` (compact and medium scroller) | `background` only                                                                           | the line is gone                                                 |
| `tests/connect.cjs:145`                          | asserted the column was `--bg-sunken` under 181                                             | asserts `--bg`, and that the track reads against it              |

Nothing else in the tree referenced the store's ground. The rails read `useLeftRail` and `useRightRail`,
which are untouched; the dock ground under 107 does not read this store; no other surface produces a
ground. The other 60-odd `--bg-sunken` references in `src/` are components painting their own
chrome — `Input`, `Chip`, `Avatar`, `MediaBlock`, the `LensBar` track itself — and none of them reads
the store or depends on what the column behind them is painted. **So the sunken ground was not
load-bearing anywhere beyond Connect's column, and the clause's stop condition was not met.** The
column padding _was_ load-bearing, which is the second corrected premise above; it is preserved rather
than routed around.

**The two knock-on checks the handoff asks for, both confirmed.** The `Where` lens's loading tiles keep
`background: var(--bg-sunken)` and are now the correct contrast against a `--bg` column rather than an
invisible one — measured equal to the `--bg-sunken` token in both themes. And `MemberCard` on
`--surface` holds its separation on `--bg`, which is check 10 and 590's third clause.

**The third clause, added mid-session: 181's outcome outlives its mechanism.** 181 explained the
separation by the sunken ground making a `--surface` card read as raised. With the ground gone, the
separation is the hairline border the card already carried: `MemberCard` is `1px solid var(--line)`,
going to `--line-strong` on hover, with `box-shadow: none`. Confirmed in both themes, and the existing
connect arm's card-style record now asserts the border alongside the shadow and the radius, so the
clause is enforced where it was previously only true — at no change to any arm's count.

Two corrections to the clause's own wording, for the record and in the same spirit as the premises
above. **`PostCard` does not use `--line`.** Its frame is `1.5px solid` in the C colour, or
`--line-strong` for the system category; `MemberCard`'s own doc comment has always read "Not a
PostCard: 1px --line border, never a C frame". The two cards separate differently on purpose and this
one is the hairline. **And ruling 97 in this tree is the focus ring**, not card separation:
`MemberCard.tsx:8` cites it for the `:focus-visible` ring reaching the name button, and
`docs/connect/SPEC.md:209` states it as "2px `--focus` outline, 2px offset, on every interactive
element". The clause's outcome holds regardless of which ruling number carries it, and it is now
written into `MemberCard`'s doc comment in place of the 181 sentence that 590 falsifies.

**Edit B, the explainer collapse.** `FeedSurface` passes `collapsed` to `LensBar`; `ConnectSurface`
passed nothing, so 405's latched collapse was dead on Connect and the scope line never left. Connect's
bar is sticky at `top: 0` at every tier with no greeting above it, so the first reported scroll is the
signal: `collapsed={scrolled}` from `useShellScroll()`. Behaviour after the edit is 405 and 488
unchanged, and the reverted baseline shows what was wrong more sharply than the description does: with
`collapsed` absent the descriptor never collapsed on scroll _and_ the tap on the active lens closed it
instead of bringing it back, because there was nothing to bring back.

`ConnectSurface`'s header comment no longer says the column sits on `--bg-sunken` under 181; it states
590 and why the track needs it.

## Ruling 270: every arm that proves a fix, with its reverted baseline

Each pair was measured, not reasoned about, on Chromium against the built worker served by
`wrangler pages dev dist`. The per-arm totals include the `ruling 292` accounting check, which is red in
the "with the fix" column wherever that arm's declared count is still the pre-PR one; the substantive
checks are what the detail columns describe.

| Fix                              | Arm                                      | Reverted baseline                                                                                                                                   | With the fix                                                                |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 588, the measured edge (Feed)    | `targeted` 1280x800 item 12              | first card `top -33, bottom 272` against `bar 224`: **opacity 0 with 48px of itself still below the bar**, and `invisibleWhileBelow` names it       | passes; the card is mid-fade and the next is fully opaque                   |
| 588, the measured edge (Connect) | `connect` 1280x800                       | first card `top 18, bottom 221` against `bar 173`: opacity 0, again 48px below the bar                                                              | passes                                                                      |
| 588, the Connect scroller        | `connect` 390x844 and 1280x800           | **every card at opacity 1** with the first card's bottom 48px below the bar: registered on `window`, the fade never repaints on the column's scroll | passes; opacity tracks the bar                                              |
| 589, the clearance               | `targeted` 1280x800 and 1536x960 item 13 | `clearance: -8, padBottom: 4px, gapToAnchor: 0` — the date's line box 8px under the painted ground, and the cancelled gap visible in the same line  | `clearance: 4, padBottom: 16px` at scroll 0 and mid-scroll                  |
| 590, the ground                  | `connect` 390x844 and 1280x800           | painted ground and painted track both `rgb(242, 237, 229)`: **the same colour, so the track cannot read as a track**                                | ground `rgb(250, 247, 242)`, track `rgb(242, 237, 229)`, and the two differ |
| 590, the column padding          | `connect` 1280x800                       | n/a: this is the premise correction, and the check exists so the padding cannot be lost silently later                                              | column computes `0px 24px 48px`                                             |
| 590B, the latched collapse       | `connect` 390x844 and 1280x800           | `1, 1, 1, 0, 0`: never collapses on scroll, and the tap closes it instead of restoring it                                                           | `1, 0, 0, 1, 1`                                                             |
| 590, third clause                | `connect` all arms, both themes          | n/a: the border was already correct, and the check closes the gap that it was true without being asserted                                           | `1px solid` `--line`, `box-shadow: none`, both themes                       |

Two notes on the arms rather than the fixes. The fade arm derives its scroll target from the live
geometry and converges on it over up to four steps, because at expanded the bar itself moves as the
column scrolls: the anchor starts in flow below the composer and the greeting and only then becomes
sticky at the column top, so a target computed from where the bar was is wrong by however far the bar
has since travelled. A first version solved it in one step and reported a false pass at 1280 and 1536
for that reason. And a column too short to bring a card to the bar reports `reachable: false` and is
judged on the invariant alone rather than on a mid-fade that cannot exist: that is the real state at
744x1133 and 820x1180, where the eight seeded cards fit the viewport and the column scrolls 96px in
total. An arm that asserted a mid-fade there would be asserting the fixture.

## Ruling 292: the declaration

Two arm groups changed, both of them groups this PR added checks to. The added `record()` calls in the
diff account for each net exactly, so the numbers explain themselves rather than being asserted:

| Group      | Arms per engine                           | Count                               | Checks behind the change                                                                                                                                                                                 |
| ---------- | ----------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targeted` | 4 (390x844, 820x1180, 1280x800, 1536x960) | 9 -> 10, 8 -> 9, 10 -> 12, 10 -> 12 | added item 12, the 588 fade arm, at every tier; added item 13, the 589 clearance arm, in the expanded branch only, which is why the two expanded stops move by 2 and the others by 1                     |
| `connect`  | 18 (9 viewports x 2 themes)               | 47 -> 49, 53 -> 55                  | added the 405 descriptor latch and the 588 fade arm; the 181 ground record is _retargeted_ to 590 rather than added, and the third clause rides the existing card-style record, so neither moves a count |

44 arms change in total, 22 on each engine. No other group moves and no count falls. The `shell` group
is unchanged at 31 and is named here because an earlier draft put the fade arm in it by mistake; it was
moved to `targeted`, which is where the Feed's scroll and sticky-block behaviour is already asserted.

### The enforcing run, and why its numbers are not in this file

Ruling 556 says the enforcing matrix runs on the final head and nothing is committed to the branch
after it starts, because a commit arriving mid-run does not invalidate the run, it invalidates the
run's subject. Writing this run's own numbers into this file would require a commit after it finished,
which is exactly the sequence 556 was written about — Fix PR 03's closing record was completed in a
commit that landed after the run it cites.

So the verdict is recorded on the pull request, where it can be written without moving the head: the
enforcing dispatch is the last action on this branch, and its per-engine result is posted to the PR
body. What this file commits to in advance is the arithmetic that makes "both engines passed" mean
"every arm emitted exactly its declared count": calibration reports N checks per engine, enforcement
reports N plus one `ruling 292 | <arm>: emitted every check it declares` check per arm, and if the
difference is not exactly the arm count on both engines then something drifted, went incomplete or
went missing, whatever the headline says.

## Guardrails and absolutes

- **Identities on `main`, read through the API rather than the git author string (ruling 379).**
  `origin/main` was `84e669c` at the fetch before branching and at the fetch before the push, so there
  was nothing to rebase onto. The ten most recent commits are `jodombrown` (id 214720153) and `claude`
  (id 81847) only. **Nothing by app id 159125892 (`gpt-engineer-app[bot]`) since `84e669c` or in the ten
  before it**, so there is no Lovable visual change to preserve and no conflict to report.
- **Never force push to `main`.** Not done. Nothing was pushed to `main` at all.
- **No schema.** No file under `supabase/migrations/`, no RLS change, no policy change, no table. Rulings
  225, 466, 553, 563 and 564 have no surface in this PR, and `tests/migration-lint.cjs` and
  `tests/migration-drift.cjs` are untouched.
- **No second framework, auth path or payment rail.** One router, one shell, one `CardFade`, one
  `LensBar`. Item 3 renames a store axis and deletes two lines; it adds no layer.
- **No new component and no new surface**, as the scope requires. Six source files changed and all six
  already existed.
- **No numeric renders.** Nothing added computes or displays a count, score, percentage or progress
  indicator. The opacity the fade writes is a style property, not a rendered number.
- **No secrets, and no company email literal.** Nothing touches `src/lib/contact.ts`, its Deno mirror or
  any sender, so ruling 387's scan is unaffected.
- **Out of scope and not pre-empted.** No profile pane (591, 592), no account panel (593), no
  `?profile=` search param and no pane scaffolding. No brand or logo file touched (ruling 184).
- **Nothing mirrored to Notion.** The register is behind by rulings 571 to 587 and D673 to D689 are
  reserved for that backfill, so no ruling in this PR is written to Notion from Code, and no ruling
  between 571 and 587 is cited anywhere in this work. Rulings 588, 589 and 590 are cited only where they
  were read in the brief.
- **Register bookkeeping, for the founder to apply rather than for Code to write.** Ruling 181 moves to
  superseded, superseded by 590. Ruling 489 gains 588 as an extension rather than a replacement: the
  distance and the curve are still 489's, and only the measured edge changes.

## The CLAUDE.md call

**590 gets a line; 588 and 589 do not.** The handoff asked me to make the call and say which.

590's rule is inherited: "every list surface's content column sits on `--bg`" is what the next surface
would otherwise re-derive from Connect, and the next person reading Connect would find a column on
`--bg` with no record of why it is not sunken. The line carries the third clause with it, because the
reason removing the ground is safe is that the separation was never the ground. It also records why
`setColumnPad` was renamed rather than deleted, which is the generalisable lesson: one flag read for two
unrelated things loses its second meaning the first time somebody removes the first.

588 and 589 are component-local. 588 lives entirely in `CardFade`'s doc comment and `paint()`, where
anyone changing the fade will read it; 589 lives in the two-element relationship it describes, and the
comment sits on the element that pays. A CLAUDE.md line for either would be doctrine nobody needs before
they are already in the file that states it.

## Follow-ups, none of them in this PR

1. **An in-place card expansion at expanded can shift the column's scroll by one card's pitch, and it is
   pre-existing.** Found while attributing a red arm, not by looking for it. On `84e669c` unmodified,
   expanding card 6 in place at 1280x800 moved the scroller from 1614 to 1302, a drop of 312px, which is
   one card plus the column's 12px gap; this branch shows the identical 312px drop from 1626 to 1314.
   Nothing in the app writes it: instrumenting the scroller's `scrollTop` setter and
   `Element.prototype.scrollIntoView` for the whole flow logged neither, so it is the browser's own
   adjustment and not `FeedSurface`'s reveal effect or the router's restoration. It is timing-sensitive
   (it disappears under instrumentation) and it appears only under `vite dev`: against the built worker
   served by `wrangler pages dev dist` the same arm passed on every run, and both
   `chromium-1280x800-shell`'s scroll checks and `targeted` item 7's three are green there. Recorded
   rather than fixed, because ruling 105's contract is "scroll unchanged" and the tree can produce a
   change under one server; worth a ruling on whether the Feed column should set `overflow-anchor: none`.
2. **The greeting's clearance is a number, not a relationship.** 16 is 12 plus 4, and the 12 comes from
   the anchor's shadow offset. The arm reads that offset off the computed style so it will fail if the
   two drift apart, but the surface still hardcodes the sum. A future pass could derive it from one
   token, which would also remove the temptation to "tidy" the 16 back to something rounder.
3. **`CardFade` still takes `stickyBottom` as a fallback and every caller passes 0.** With the selector
   resolving correctly at expanded, the fallback is now only reachable when the bar is absent
   altogether, where 0 is the top of the window and wrong. Either the prop should go or the fallback
   should hold opacity at 1, and neither belongs in a defect PR.
