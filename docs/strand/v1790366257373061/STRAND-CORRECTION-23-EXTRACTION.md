# Strand correction 23, ruling 1083: stepping through a lane inside the pane, and the selected card

**23 September 2026, session 31. For Chat to ratify under 129.** Governed by 129, 69, 561, 581, 607, 612, 663, 688, 700, 719, 848, 855, 873, 876, 899, 908, 1023, 1044, 1066, 1083. Source: B31F-EXTRACTION.md §2 (the Strand ask, written to be carried across under 663) and §3's PostCard ask.

Opened on a read. Scope is the two parts of the ask and nothing else. **Everything here about Discovery, Brief 9 and the Hub is relayed data** from B31F; the app project was not opened, read from or cited (663).

**Compile.** **v1790157541616309**, read from the compiled artifact after the pass (873). It supersedes `v1789885868097915` (correction 21, ratified 987), which is the state every "before" below was read from. Corrections 16 through 21 keep their own ids; nothing is re-dated (855).

> **Stamped 23 September 2026**, session 31, against **v1790157541616309**. Readouts at the stamp: `cluster order: Previous event, Next event, Close event`; `first: Previous aria-disabled true / disabled false`; `first: Previous click` and `ArrowLeft` both leave `dinner` open; `mid: ArrowRight` steps `call → breakfast`; `data-selected` count in the list **1**; editable-target guard and defaultPrevented guard both leave `breakfast`; selected card border `1px rgb(184,115,51)` equal to the unselected card's `1px` (source `1.5px`, rounded by the display on both), ring `rgb(250,247,242) 0 0 0 2px, rgb(26,26,24) 0 0 0 4px`; `aria-current: true`; step controls **4, all 44×44**; position text `none`; `__errors: 0`; `ALL_CHECKS: yes`.

---

## 0. Before the fix, read from `v1789885868097915`

| what was checked | reading |
|---|---|
| a cluster prop on Pane other than `onClose` | **none**; the close control is built inside Pane from `onClose` alone |
| keys handled on the pane section | **Escape only** |
| bring-into-view re-runs on a change of open item | **no**; once, on `cold`, against `[data-arrived]` |
| PostCard selected or current state | **none**; the 1.5px frame is identity (rule 2) |
| `data-selected` anywhere in the bundle | **absent** |

B31F §1 read the same five facts off the bound file and stopped. They are confirmed here from the source.

---

## 1. Pane (1083, from B31F §2)

**Props added.** `onPrevious`, `onNext`, `previousLabel` ("Previous"), `nextLabel` ("Next"), `hasPrevious`, `hasNext`, `selectedKey`. Nothing existing moves; with neither handler supplied the part renders byte-for-byte as correction 21 compiled it, which is how `onClose` behaves (700).

**The cluster.** One cluster, ordered **Previous, Next, Close**, each an `IconButton` from Strand's set (`chevron-left`, `chevron-right`, `x`), `gap: var(--space-1)`. At expanded it sits where the close control sat, absolute at the pane's top right (700). On the route form (compact and medium) it sits in the header row after the title, where the close control sat. The route tiers get the cluster only if a caller passes the handlers; 1023 says Discovery will not, and Pane does not decide that for it.

**The edge stops.** `hasPrevious === false` renders Previous with `aria-disabled="true"`, opacity 0.45 (Button's disabled rendering), `cursor: default`, and both its click and its key are inert. It is **not** `disabled`: a disabled button drops focus, and the ask is that the pair stays in place and focus does not jump. It does not wrap and it does not close. `undefined` reads as true when the handler is supplied, so a caller that has not computed the edges yet gets a live control, not a dead one.

**Keys.** `ArrowLeft` and `ArrowRight` fire on the pane section's own `onKeyDown` beside Escape, so only while focus is within the pane (719) and never from the list or the rail. Two guards, both from the ask: not when the target is editable (`input`, `textarea`, `select`, `contenteditable`), and not when `defaultPrevented` is already set. Escape now also honours `defaultPrevented`, which it did not before; a dialog inside the pane that consumes Escape should win, and this is the one change to existing behaviour. Flagged below.

**The list follows.** When `selectedKey` changes, Pane re-runs the bring-into-view against `[data-selected]` in the list column, expanded only. The scroll is the list column's own `scrollTop`; focus is untouched and the page does not move. It is the same routine 607 uses for `[data-arrived]`, extracted so both call one function.

**Loading.** Unchanged: the body reads `Loading` in `--ink-3`; the cluster is chrome, not body, so it stays.

**What the caller owns**, unchanged from the ask: the ordered set, the skip over dismissed items (581, 1044), the route per step, `data-selected` on the open card, `loading`, and both edge flags. Pane is never told an item was skipped; the proof's "after a dismissed one" state shows Next going from Accra to Kumasi with the set already filtered.

**Touch.** The pair is `IconButton` at its default 44, which is `--target-primary` (908; the token is in Strand's `tokens/spacing.css` at 44px and has been since correction 18). B31F §4.4 could not prove this from the bound folder; it is proved here from the source token and the rendered control.

## 2. PostCard `selected` (1083, from B31F §3)

**The decision: a ring outside the frame, in `--ink`.** `boxShadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--ink)`: a 2px gap in the ground colour, then a 2px ring. The identity frame stays 1.5px in the C colour on the selected card and the unselected one, and the proof reads both values off the rendered article.

**Why not the other two, and why not `--line-strong`.** A tinted ground: `--bg-sunken` against `--bg` is one rung of the neutral scale and reads as a hover, which the card already uses for its own controls. A caps line above the card: a word where the ask says no count or position, and a line that says "Selected" is a position by another name. The ask offered `--line-strong` for the ring; it measures under 2:1 against `--bg` in light (#CFC7B9 on #FAF7F2) and fails the 3:1 floor for a non-text indicator. `--ink` is the stroke Strand already uses for a set state (FacetRail's set chip, `var(--border-card) solid var(--ink)`), so the ring is an existing vocabulary and not a new one. **This is the one place the draw departs from the ask's named options**, and it is named rather than slipped through.

**Marks.** `data-selected` on the article (Pane's `selectedKey` follows it) and `aria-current="true"`. Absent, the card is unchanged.

## 3. Not touched

Geometry (612, 688): `--pane-list-width`, the sticky pane, no right rail. Close and Escape (700, 719) except the `defaultPrevented` guard above. Below expanded, the event page is its own route (1023). FacetRail, LensBar, Sheet, IconButton do not move. No position number, no progress mark, no count anywhere (69): the proof greps the rendered page for an "n of m" form and finds none.

## Proof

`screenshots/correction-23/proof.html` (the gallery) and `readout.html` (the measurements, on two unscaled callers and two cards; the gallery at 96 live panes was too heavy for the capture bridge and the readout is split off rather than thinned). Six states (mid-lane, first, last, a lane of one, next loading, after a dismissed one) in four frames each (compact 390 touch, medium 760 pointer, expanded 1280 pointer, expanded 1440 touch), both themes, frame labels in 949's form (tier · input · width · theme) on `data-screen-label`. Route-tier frames are drawn on the mid-lane and first-item states, where they differ; the other four states differ only at expanded and are drawn at 1280 and 1440. Then the selected card beside an unselected one. The readout reads: cluster order; Previous at the first item is `aria-disabled` and not `disabled`; its click and ArrowLeft do nothing; ArrowRight on a mid-lane pane steps; exactly one `data-selected` in the list; the editable-target guard; the `defaultPrevented` guard; the selected card's border stays 1.5px and its ring is a box-shadow; `aria-current`; no position text; `__errors` empty.

## Doctrine flags (129)

1. **Nothing here is canonical until Chat ratifies it.**
2. **The compile id is read and stamped**, above, from the artifact (873).
3. **Escape now yields to `defaultPrevented`.** The ask's guard was written for the arrows; applying it to Escape too is this pass's call, so a dialog inside the pane that consumes Escape closes itself and not the pane. Before, Pane closed regardless. Named here because it is a behaviour change to 719's path.
4. **The ring is `--ink`, not `--line-strong`.** §2. Measured, not preferred.
5. **The disabled edge is `aria-disabled`, not `disabled`.** The ask requires focus not to jump; a native disabled control cannot hold focus.
6. **The route form renders the cluster if handed the handlers.** 1023 says Discovery will not hand them; Pane does not refuse them. If Chat wants the part to refuse below expanded, that is one line.
7. **`selectedKey` is the caller's key, opaque to Pane.** Pane reads only that it changed.
8. **Correction number.** 21 was the last numbered and 22 was folded into it; this is 23. If Chat's record numbers it differently the number moves and the content does not.

## Files

`components/dna/Pane.jsx`, `Pane.d.ts`, `Pane.prompt.md`; `components/dna/PostCard.jsx`, `PostCard.d.ts`, `PostCard.prompt.md`; `components/dna/pane.card.html` (one state added); `screenshots/correction-23/proof.html`; `export/_ds/` (bundle re-marked, manifest, this file, `README-EXPORT.md` header); this file and its export copy (876, 899). The export is delivered as **one archive** (663).
