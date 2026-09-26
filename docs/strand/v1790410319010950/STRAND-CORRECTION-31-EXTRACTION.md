# Strand correction 31: correction 30's raw sizes as tokens, no readout switch in a part, a Tooltip, and EmptyState filling its column

**Compile stamped: `v1790410319010950`**, read from the artifact after the readout ran on it (873). Base: `v1790401469924397` (correction 30 as stamped), loaded beside the compile in the same page. Session 33, 26 September 2026. Chat ratifies 30 and 31 together at this id (1152); nothing is canonical until it does (129).

## 1. Rulings carried

1149: correction 30's nearest-token substitutions stand as listed; none changed. 1150: the bounded Pane list pads `--space-2`, as built. 1151: a lane pads its own scroller; the app's to do.

## 2. Item 1, raw sizes as tokens (604)

Tokens added to `tokens/spacing.css`, values unchanged from correction 30's readings off v5:

- `--browse-tile-width` 180px, `--browse-tile-min-height` 84px: BrowseTile.
- `--person-card-min-height` 84px (row), `--person-tile-min-height` 112px (tile), `--avatar-card` 56px, `--avatar-tile` 48px: PersonCard.
- `--carousel-slide` 86%: MediaBlock carousel, a slide's share of the row.
- `--icon-inline` 14px: BrowseTile's check before the detail line.
- `--focus-offset` 2px: BrowseTile, PersonCard, MediaBlock carousel (outline offset).

BodyBlocks carried no raw size. The readout greps the four files (comment lines set aside; 0, 1 and 100% not sizes): none left. `Avatar` now accepts a CSS-length `size` (`radius` and `initialSize` optional; the initials default to 40% of the size rounded to a whole pixel with CSS `round()`), so PersonCard passes the token. Every numeric-size Avatar specimen (32, 40, 48, 56, 64, and a photo at 48) reads identical to the base in DOM, every computed property and box. PersonCard's avatars read identical too: no font-size line differs (the rounding restored 22px and 19px exactly). Every tokenised part's boxes equal the base's at every frame (people 17, going 16, tiles 19, carousel 11, blocks 40 boxes); the only serialised-DOM difference is the token name in place of the literal in inline style.

## 3. Item 2, no readout switch

`window.__C30_INSTANT_SCROLL` is gone from `MediaBlock` and the bundle (grep: 0). The carousel scrolls smoothly, and instantly when `matchMedia('(prefers-reduced-motion: reduce)')` matches; the bundle carries that query. **How the readout gets its reading without a seam:** the readout reads the browser's own preference and states which reading it made. This browser reports no reduced-motion preference, so every frame's row reads **the handled key only** (`defaultPrevented` true, one slide step of 318 / 595 / 595 computed) and says so; a run with the OS preference on reads the exact step. Nothing in the part knows the readout exists.

## 4. Item 3, Tooltip (1146)

`Tooltip` rebuilt. Shows `--tooltip-delay` (300ms) after the pointer rests or focus arrives; once one has hidden, a neighbour's shows at once within `--tooltip-grace` (300ms). Hides on Escape (a showing tooltip hides, a pending one is cancelled), blur, and pointer leave; the pointer may move from the control onto the tooltip and it stays (WCAG 1.4.13). `aria-hidden`; the control's `aria-label` is the accessible name and nothing is announced twice (no `aria-describedby`). No tooltip on touch. Below by default, flipping above at the viewport's foot, shifted to stay inside; `position: fixed` at `--z-tooltip` (90) so no scroller clips it; `--shadow-2`, `--radius-m`, `--text-xs`, `--tooltip-gap` 6px, `--tooltip-max-width` 240px. It listens to the browser's own `pointerover`/`pointerout` on its host rather than React's synthesised enter/leave. `IconButton` wraps itself in it and drops `title=` (bundle grep for the former pair: none). Pane's toolbar and cluster read it with no change of their own (read: "Hide list", "Previous event").

`input` on Tooltip and IconButton (the founder's condition): with `input` absent both follow the device itself, no tooltip on a touch or coarse pointer, a tooltip on a fine pointer; read on this device (`pointer: coarse` false): present. `input="touch"` draws the touch specimen on a pointer device: read none after pointer rest and after focus. Stated in `IconButton.prompt.md`.

Readings, pointer frames: scheduled delay 300 of 300, first paint 310 to 319ms wall time; neighbour within grace scheduled 0, shown after 6ms; onto the tooltip stays, leaving it closes; Escape gone in 0 to 22ms and nothing pending re-shows; focus shows "Close", blur hides it; accessible name unchanged, no `title`, no `aria-describedby`. Placement read **above** in the readout (gap 6): the specimens sit below the readout viewport's foot, so the flip is exercised; below is the default when there is room. The discovery PostCard's ellipsis is an IconButton, so it gains the wrapper and loses `title=`; stripping both, its DOM equals the base's and its boxes are equal (320×406.3 / 398.3). IconButton's button stays 44×44.

A gap the readout found and the part closed: Escape hid a showing tooltip but did not cancel a pending one, so a tooltip whose delay had not elapsed appeared after Escape. It now cancels either.

## 5. Item 4, EmptyState (1147)

Fills the column it sits in: `flex: 1 1 auto; align-self: stretch; width: 100%; min-height: 100%`, no radius, no inset; the wallpaper runs to the column's edges and the badge, title, body and action sit centred in the column's visible area (`data-empty-block`). Read in a bounded column (358 / 520 × 360) and a page column at 358 / 788 / 1248 × 520: wallpaper box equals the column's content box on all four sides (0 0 0 0), block centre within 0 of the column centre, radius 0px; the base read 358–1248 × 287 / 201 with radius 14px. The part never sizes to the viewport: a bounded column gives it the height by itself; a scrolling page puts `minHeight: calc(100dvh - …)` on the column. `--empty-badge` 48px and `--empty-measure` 360px so the rewrite carries no raw size. `fill`, `stickyTop` and `stickyBottom` were never props of Strand's part and are not added; unknown props are ignored, so the app's callers (`ConnectSurface.tsx`, `routes/_shell/$c.tsx`, since 13 September) compile and render today. `EmptyState.prompt.md` states how each gives its column the height at the re-sync (fill → the column's `min-height: calc(100dvh - header - dock)`; sticky offsets → subtracted in that calc, or `flex:1; min-height:0` between the sticky bars; inside a bounded Pane, nothing).

## 6. Readout

`screenshots/correction-31/readout.html`, run on this compile with the tab **visible** (its first row records `visible, hasFocus false`): **97 rows, all pass**, tolerance 0.1px. Six frames (compact 390 touch, medium 820 pointer, expanded 1280 pointer; light and dark). Identical to the base in DOM, every computed property and size: nine specimens per frame (56 408 properties), including correction 30's strip, ratioed video and the rail. Styles and tokens: five files equal to the base export; `spacing.css` gains exactly the sixteen lines listed. Digits in any specimen: 0 (the topic tiles' date set aside). Bundle `__errors`: 0.

Method notes. In a background tab the browser holds every timer to about a second, and after five minutes hidden to about a minute, so the tooltip's timing rows cannot be read there; the readout records the tab's visibility in its first row, reads the delay the part scheduled (`data-tooltip-waited`) beside the wall time, and waits on the part's state rather than the clock for hide. A document without focus fires no focus events, so the readout dispatches `focusin`/`focusout` after moving focus. `proof.html` renders the frames scaled for the eye.

## 7. Files

`components/core/Tooltip.{jsx,d.ts,prompt.md}`, `IconButton.{jsx,d.ts,prompt.md}`, `Avatar.{jsx,d.ts}`; `components/dna/EmptyState.{jsx,d.ts,prompt.md}`, `BrowseTile.jsx`, `PersonCard.jsx`, `MediaBlock.jsx`; `tokens/spacing.css`; `screenshots/correction-31/` (`shared.js`, `readout.html`, `proof.html`, `baseline-v1790401469924397.bundle.txt`); `export/_ds/` refreshed at this id with `STRAND-CORRECTION-30-EXTRACTION.md` and this file; archive `strand-correction-31.zip`.

## 8. Not done

No @dsCard for Tooltip's new states. WebKit not read. The app project was not opened (663). Reduced motion read as the handled key on this device (§3).
