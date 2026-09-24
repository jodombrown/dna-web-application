# Strand correction 18: the padding, `dense`, rule 10's citation, and the seat drawn both ways

**18 September 2026, session 26, handoff 26-B. For Chat to ratify under 129.** Governed by 129, 498, 610, 663, 855, 873, 876, 899, 903, 904, 905, 906. Opened on a parts read, not on drawing.

**Everything in this correction about the app repo is relayed data**, taken from handoff 26-B and labelled as such at each use. The app project was not opened, read from or cited (663). That boundary is unchanged by this pass: three of correction 17's positions moved because Chat could read the repo, and the answer was to carry the corrected data across the boundary, not to lower it.

**Compile.** `_ds_bundle.js` **v1789753250587142**, read from the compiled artifact after the pass, not written ahead of it (873). It supersedes v1789720800167997. One compile was **rejected** on the way here: **v1789752465001748**, which carries correction 18's component code but predates ruling 908's token rename by one compile — its `LensBar` header still cited the old token name, and 910 puts the rename before the compile. The export copy carries the id in its own `@ds-compile-id` header and on `window.__DS_COMPILE_ID` (854, 861). Correction 16's **v1789619870985180** and correction 17's **v1789720800167997** keep their own ids in their own records; nothing is re-dated (855).

> **Stamped 18 September 2026**, session 26, against **v1789753250587142**, with the proof reading yes on every check: `PADDING_COMPILED: "yes · 14/8"`, `DENSE_ACTIVE_ICON` active 0 and inactive 1 with dense against active 1 and inactive 1 without, `LABELS_MODE_ICON_COUNT: 0`, mechanism A seat 44 / track 52 moving what sits below down exactly 6 in both descriptor states, mechanism B seat 44 / track 46 / padding 0 moving nothing, 32 mechanism frames each, `INPUT_MODE_BRANCH: "none · geometry identical at touch and pointer"`, `MECHANISM_CHOSEN: "none · drawn and returned for a ruling (905)"`, `ALL_CHECKS: "yes"`. Confirmed by reading the exported file: `PAD_ON = 14`, `PAD_OFF = 8`, `PAD_ON_DENSE = 10`, `dense` in the signature, `--target-primary` present and `--touch-min` absent.

> **Stamp block (to be filled from the artifact, not from prose).** Compile: *pending*. Readouts required to read yes: `PADDING_COMPILED: "yes · 14/8"`, `DENSE_ACTIVE_ICON` active 0 / inactive 1, `LABELS_MODE_ICON_COUNT: 0`, `INPUT_MODE_BRANCH: "none"`, `MECHANISM_CHOSEN: "none"`, `ALL_CHECKS: "yes"`.

## 1. The padding takes the relayed values — **903**

`PAD_ON` 16 → **14**. `PAD_OFF` 15 → **8**. `PAD_ON_DENSE` is **10**, new with `dense`.

The fit test's terms follow from the constants, which were already parameterised: active `W + 28`, inactive `W + 16`, leading track padding 8 and the 2px gaps unchanged.

`need = 8 + 2(n−1) + (W + 28) + (n−1)(W + 16)`, which reduces to **`need = nW + 36 + 18(n−1)`**.

Why, in the record and not only as a number: relayed data — the app repo renders and measures at 14 and 8, and has since before correction 16. Pricing a tab at 16 and 15 made Strand's `need` 60px higher on a five-lens bar than that implementation's (4px on the active tab, 14px on each of four inactive tabs), which is two thirds of the 91px disagreement ruling 867 opened. G37's 15px was option 2 of four against a 16px baseline the implementation never had; porting 15 and 16 into it would have widened every inactive tab by 14px and spent the medium tier's margin that ruling 805 was buying.

In Strand's own type the flip this produces is the opposite of scarcity: a five-lens set with a 70px widest label needs **458** where it needed 518, against a 616px medium column. The medium tier no longer clears by 8px; it clears by 158.

Correction 16's ratified record and its extraction are **not rewritten**. A dated supersession note is appended to each, as correction 17 did under its guardrail 5, and the ratified bodies stand with their own compile ids.

## 2. `dense` is adopted — **904**

871's deferral is withdrawn. `dense` is a mode of this bar.

```ts
/** Suppresses the active lens's icon so the active lens reads as its name. Inactive lenses are unchanged and keep their icons; the tablist, every
 *  lens and the switch are unchanged. The active tab's side padding tightens to 10px. Visible only in icon-first, since labels mode draws no icon
 *  at all (17, 868). Adopted at 18 under 904, reversing 871's deferral; its caller is AppHeader. */
dense?: boolean;
```

In the part: `const ico = iconFirst && !!l.icon && !(on && dense)`. The active tab renders its label alone under `dense`; every inactive tab renders its icon as before; `role="tablist"`, every `role="tab"`, `aria-selected` and `onChange` are untouched.

**871's deferral rested on a description of a control the repo does not have.** Relayed data: `src/components/strand/LensBar.tsx` line 238 reads `const ico = !!l.icon && !(on && dense)`, so the suppression is the active lens's icon only, and the prop's other effect is the active tab's padding, `0 10px` against `0 14px`. Correction 17 returned it as a different control because a header showing only the active lens's name drops the tablist and so drops the switch. That reasoning is sound about the control 17 was describing. It is not what `dense` is. **Its only caller is `AppHeader`** (relayed).

One consequence worth stating: `dense` is invisible in labels mode, because labels mode draws no icon at all (17, 868). A caller that passes it at a wide column sees only the active tab's 4px of padding.

## 3. Rule 10's text is corrected, and `compact`'s refusal stands — **905**, **498**

`readme.md`'s tenth rule read, as written:

> WCAG 2.2 AA (ruling 610, per 480: one conformance target) contrast on every C color against off-white; 44px touch targets; PulseDock reachable one-handed.

It now reads:

> WCAG 2.2 AA (ruling 610, per 480: one conformance target) contrast on every C color against off-white; target size split under 498: `--target-primary` 44px for anything a thumb aims at on its own, `--target-min` 24px as the floor for a control inside a line of text or a row that is itself the target; PulseDock reachable one-handed.

The tokens were already right and already cited: `tokens/spacing.css` carries `--target-primary:44px` and `--target-min:24px /* WCAG 2.2 AA 2.5.8 floor; primary actions stay at --target-primary */`, ratified under 606 at Design pass 01 and read the same way by `Sheet` ("targets are `--target-min`; the primary action is `--target-primary`"). Only the readme's prose was stale — it stated the primary value as though it were the only one. Relayed data: the repo carries the same split as `--target-min: 24px` and `--target-primary: 44px` with 498 cited above them; Strand's names for those two values are `--target-min` and `--target-primary`, and this pass does not rename either.

**`compact`'s refusal stands, on the corrected citation.** Rewritten in `LensBar.jsx`, `LensBar.prompt.md`: a lens tab is a standalone thumb target, because a member aims at one specific lens, so it owes `--target-primary` and not the floor (905). The floor is for a control inside a line of text or a row that is itself the target, which a lens tab is not. The space a 32px seat buys is already bought by icon-first at full seat size, and if the need is a shorter bar rather than a narrower one that is a token question for the spacing card, not a per-caller prop. Strand refused the right thing; it had stated the reason as a flat 44.

## 4. The seat mechanisms, drawn and returned — **905**

Ruling 905 takes the lens seat to 44 and does not choose the mechanism. **This pass does not choose either.** The seat is unchanged in the component at this compile; both mechanisms are drawn at `screenshots/correction-18/proof.html` and returned for a ruling.

**A discrepancy to settle before the mechanism is picked.** The handoff's read of today's geometry is the repo's, relayed: track `height: 44, padding: 4, gap: 2`, seat `height: 36`. Strand's own part is not those numbers. Its track carries `padding: 3` plus a `1px` border — a 4px inset, as described — and its seat is `minHeight: 38`, so the track's outer height is **46**, not 44, and the seat is **38**, not 36. The 2px difference runs through both mechanisms, so each is drawn in Strand's own geometry with the relayed repo equivalent named beside it:

| | Strand, as drawn | Relayed repo equivalent |
|---|---|---|
| Today | seat 38, track 46, 4px inset | seat 36, track 44, 4px inset |
| **A** — track grows, inset kept | seat 44, track **52**, inset 4. Everything below the bar moves down **6px** | track 52, everything below moves down 8px |
| **B** — inset dropped, track height held | seat 44, track **46**, padding **0**. Nothing below the bar moves; the active pill goes flush to the track edge | track 44, padding 0, same consequence |

A keeps the inset look the pill has had since Brief 2 and moves the descriptor and everything beneath it. B holds the layout and changes the look of the chip. Neither is picked here.

Drawn: four tiers (390, 820, 1280, 1440), both themes, both input modes, descriptor present and collapsed — 32 frames, each carrying today's seat, A and B in that order at the same tier, with a rule beneath each bar so what moves is readable. The columns inside each tier frame (358, 616, 720, 800) are this sheet's own columns, not ruled widths, and are labelled as such on every frame. At 390 the set is in icon-first and at the three wider tiers it is in labels, so both mechanisms are shown in both modes.

**A finding that belongs with the return: the part has no input-mode branch.** 583 labels every frame with its input mode, and the proof does. But there is no `pointer:` or `hover:` media query and no input-mode attribute anywhere in Strand, so the geometry at touch and at pointer is identical by construction, and the readout asserts that rather than implying a difference (`INPUT_MODE_BRANCH: "none · geometry identical at touch and pointer"`). A mechanism therefore cannot be chosen per input mode without first ruling that the bar may branch on input mode at all, which nothing does today.

## 5. `compact` leaves the bar

It was never declared in Strand. Correction 17 refused it, so it exists in no signature, no `.d.ts` entry and no compiled line here — the staged copy that declares it is the repo's (relayed). What this pass removed is the stale rationale, not a prop. Recorded in the change list: its caller `AppHeader` loses its narrow-seat answer, and the replacement is the one Strand's own refusal named — icon-first buys a narrow column its room at full seat size. `AppHeader` keeps `dense`.

## 6. Not touched

`FacetRail` and `Pane` do not move. Ruling 906 found (relayed) that neither exists in the app repo, so 851's carry is recorded rather than ported and the port waits for a brief that puts one on a surface. Correction 13's state for both stands, as set out at 687, 700, 703, 718, 719, 720, 725 and carried in this session's 851 extraction.

## Proof

`screenshots/correction-18/proof.html`. Part 1 is the compile: labels mode and icon-first at both themes, with the computed padding read off an active and an inactive tab, and an icon-first pair with and without `dense`. Part 2 is the return: the 32 mechanism frames. The readout fails loudly — red banner, `ALL_CHECKS` listing each failure — if the compiled padding is not 14/8 (which is also how a bundle older than this correction is caught), if a labels-mode bar draws any icon, if `dense` fails to suppress the active icon or suppresses an inactive one, if A's seat or track is not 44/52, if B's is not 44/46 at padding 0, if A and B measure differently at touch and pointer, or if the mechanism matrix is not 32 frames deep.

## 7. `--touch-min` is renamed `--target-primary` — **908**

Done before the compile, as 910 orders. `tokens/spacing.css` now reads `--target-primary:44px`, value unchanged, and the comment on the line below reads "primary actions stay at `--target-primary`". **`--target-min` is untouched**: 606 ratified that name and locks it.

Relayed data under 663: the app repo has carried `--target-primary: 44px` since Design pass 01, under a comment citing 498, and its components consume that name. Two names for one value is a silent-failure surface — `var(--touch-min)` in a consuming page resolves to nothing and paints no error — and this project has already paid for one of those at the four staged pages, where five dropped props threw nothing.

Renamed in: `tokens/spacing.css`, `readme.md` (rule 10), `components/dna/LensBar.jsx` and `LensBar.prompt.md`, `components/core/Sheet.prompt.md`, `components/core/sheet.card.html`, `ui_kits/dna/convene/rsvp-guest.html` (the one live `var()` call outside the token file), `ui_kits/dna/composer/SPEC.md`, this file, and the change list. Appended rather than rewritten: `guidelines/STRAND-PASS-01-EXTRACTION.md`, whose ratified body names the old token — a dated note carries 908, and `STRAND-PASS-01-SPEC.md` is left as it shipped with that pass. The compiler owns `_ds_manifest.json` and `_adherence.oxlintrc.json` and re-derives the name list at the compile.

## 8. What the 46px track is for — answered, not acted on

Asked alongside 910 and answered here because it decides a ruling rather than a merge (866: pass 01's W35 is ruled and never synced). Nothing is changed by this section; both numbers stand.

The track is the seat plus a **4px inset on each side**, and the inset is exactly the focus ring's footprint. `tokens/base.css` draws `:focus-visible{outline:2px solid var(--focus);outline-offset:2px}` — 2px of offset plus a 2px stroke, so a focused control needs 4px clear on every side. The track supplies it as `padding: 3` plus its own `1px solid var(--line)` border. So `38 + 4 + 4 = 46`, and the relayed repo's `36 + 4 + 4 = 44` has the same inset with the 4px taken as padding alone and no border.

Two consequences worth a ruling:

1. **The 2px between 46 and 44 is entirely the seat, not the inset.** Strand's seat is `minHeight: 38`; the relayed seat is 36. Nothing in any LensBar record names 38 — it is not `Segment`'s 44 (673, the standalone pill radiogroup, which has no track), not `FacetRail`'s 36 chip, not `Chip`'s 32. It is an unattributed value of the same kind content-width packing was before 869.
2. **Mechanism B spends the focus ring's room.** The track is a scroll container (`overflowX: 'auto'`, which computes `overflow-y` to `auto` as well), so an outline on a seat flush to the track's content edge is clipped. B sets the track's padding to 0 and the seat to 44, which leaves the ring nowhere to draw. A keeps the 4px inset and does not. Under 909 — one mechanism at every tier and in both input modes — that is not a tier-by-tier trade; it is the same clipped ring everywhere. Recorded for the ruling; the mechanisms stay drawn and unchosen.

> **Corrected in part, 18 September 2026, session 26, by correction 19 (ruling 918).** Appended, not rewritten. This file keeps **v1789753250587142**.
>
> **§8's numbers stand; what the border supplies does not.** §8 reads the 4px inset as `padding: 3` plus the track's `1px solid var(--line)` border and treats the sum as the focus ring's clear room. A scroll container clips at its **padding box**, so the border sits outside the clipping region and gives the ring nothing: only 3 of the 4 was ever usable, and the ring's outer pixel has been clipped on every lens since Brief 2. §8's geometry (`38 + 4 + 4 = 46`) and its consequence 2 (mechanism B spends the ring's room) are unaffected — B spends all 4 rather than 1.
>
> Correction 19 therefore compiles mechanism A's 52 as **`4 + 44 + 4`**, 4px of padding and no border, keeping the `--line` edge as `inset 0 0 0 1px` on the same pixel of the same box. The outer 52, the leading 4px inset and the fit test's 8px track term are all unchanged.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped.** v1789753250587142, from the artifact, with v1789752465001748 recorded as rejected for predating 908's rename. The four places correction 18 names now carry it: this document's stamp block, the change list's id line, `export/_ds/_ds_bundle.js` (header and `window.__DS_COMPILE_ID`) and `export/_ds/README-EXPORT.md`. The index carries it too (848). Nothing in corrections 16 or 17 is re-dated (855).
3. **Today's seat is 38 in Strand and 36 in the relayed read.** Section 4 draws both mechanisms in Strand's geometry and names the repo equivalents. If 905 intends the repo's 44/36 as the literal target, mechanism A's displacement is 6px here and 8px there, and the two projects' bars are 2px apart before either mechanism is applied. That gap wants a ruling of its own; this pass does not close it.
4. **The fit test over-prices the active tab under `dense`.** It prices `PAD_ON` (14) where `dense` renders 10, so `need` is 8px high on a dense bar. That is deliberate: correction 17's position is that the test must never price a tab narrower than it renders, and an over-price keeps it an upper bound. If Chat would rather the test be exact under `dense`, it is one term.
5. **The C-accent contrast read still carries no G number.** A 15px label on Collaborate teal is 3.9:1 and fails AA, which is why `c` is the text rung and never the fill. G numbers are assigned by the repo entry under 638, which Strand does not hold, so this read is recorded without one rather than given an invented one. Unchanged by this pass; restated because 905 touched the accessibility rule it sits under.
6. **The index is corrected and its standalone re-bundled in the same turn** (848, 910 item 4). `Strand.html` now stamps v1789753250587142, reads current to session 26, and carries rows and proof cards for corrections 17 and 18. It was two compiles stale.

## Files

`components/dna/LensBar.jsx`, `LensBar.d.ts`, `LensBar.prompt.md`; `readme.md` (rule 10 and 908's rename); `tokens/spacing.css` (908); `components/core/Sheet.prompt.md`, `components/core/sheet.card.html`, `ui_kits/dna/convene/rsvp-guest.html`, `ui_kits/dna/composer/SPEC.md` (908); `screenshots/correction-18/proof.html`; `Strand.html` and `Strand index (standalone).html` (the index and its re-bundle, 848); `guidelines/STRAND-CORRECTION-16-EXTRACTION.md`, `guidelines/STRAND-CORRECTION-17-EXTRACTION.md`, `guidelines/STRAND-PASS-01-EXTRACTION.md` (appended supersession notes only, bodies and ids untouched); `CORRECTION-16-EXTRACTION.md` and `CORRECTION-17-EXTRACTION.md` (the same notes appended); `export/_ds/LENSBAR-CHANGES-14-16.md` (extended with items 28 to 34, not replaced); `export/_ds/_ds_bundle.js`, `export/_ds/README-EXPORT.md`, `export/_ds/_ds_manifest.json`, `export/_ds/styles.css`, `export/_ds/tokens/` (5 files); this file, which the export carries as a file and never a folder (876, 899).
