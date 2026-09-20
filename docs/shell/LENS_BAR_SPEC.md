# DNA Lens Bar spec

Self-contained. Reproduces the Lens Bar's look, behaviour and constraints. Prototype reference: `shell/B2-Shell-Feed-v3.dc.html` (staged component `shell/strand-patch/LensBar.jsx`, landing in Strand as `components/dna/LensBar.jsx`). Consuming app: `src/components/shell/LensBar.tsx`.

## What it is

One primitive, used by every hub. A horizontal, icon-first segmented control that switches which slice of a surface is shown (rule 5). It is not navigation between pages and it is not a filter set: filters live in the Rail or the Narrow sheet.

Lens sets, canonical order:

- Feed: All, For You, My Network, Mine, Saved (no C colour)
- Connect: Members, Network, Map, Messages (Messages present but disabled)
- Convene: All, Near Me, This Week, Online, Network, Curated by DNA
- Collaborate: Discover, Mine, Completed
- Contribute: Needs, Mine, Fulfilled
- Convey: Pulse, Curated, My Circle, My Voice, Saved

## Behaviour

- State lives in the URL as `?lens=<id>`. No component state for selection, no context. A link can land on a lens; the back button moves between lenses rather than off the surface (`replace: false`, every selection is a history entry).
- Unknown or absent `?lens=` selects the first lens and does not rewrite the URL.
- Tapping the active lens does not re-navigate: it toggles the descriptor line.
- A disabled lens keeps its seat: `aria-disabled`, `tabIndex -1`, 1px dashed `--line-strong` border, `--ink-4` foreground, no click. Sets never renumber when a flag flips.
- Light haptic (`navigator.vibrate(8)`) on every accepted tap.
- Every lens has a real empty state. No counts on or near the bar; no vertical or labelled variant.

## Structure

- Track: `--bg-sunken` fill, `--radius-m` (10), 4 padding, 2 gap, 44 tall at every breakpoint, bounded left and right so the row's start and end are visible. No border, no hairlines. Horizontal scroll only when the set cannot fit; nothing truncates or compresses.
- Distribution (ruling 952, superseding the content-sized active lens): every lens takes an equal share of the track (`flex: 1 1 0`), min 44 wide, 36 tall. Selection is not a layout input — no seat changes width or position when the selection moves. The active lens was content-sized (`flex: none`) until 952; that made a tap re-divide the track and slide every other seat under the finger, measured at 390 on the Feed's five lenses as up to 27px of shift, and it is logged as G48.
- Active chip (ruling 488, Design pass 01 item 6, closing W34): the active tab **is** the chip. It
  carries the `--surface` ground (`--radius-badge`, 8) and `--shadow-1` as its own background, so the
  indicator is painted on the first frame and on every resize and cannot be missing. The absolutely
  positioned rectangle measured from `offsetLeft`/`offsetWidth` in a layout effect is gone, and
  nothing about the indicator depends on a layout read any more. The ground transitions with the
  colour over `--dur-default` with `--ease`; nothing moves under reduced motion. No border, no
  gradient, no ring.
- Active content: icon 20 plus label 15/700 `--ink`, at every breakpoint except the compact-tier header slot (icon only, the chip alone marks it). Icon colour is the surface's C brand rung (`--c-{c}`); on Feed, which is not a C, `--ink`.
- Inactive lenses: bare icon 20 in `--ink-3`, `--ink` on hover; no background, no scale, no translate. Icon only below expanded (1024); icon plus label 15/500 at expanded and above. `title` carries the label when it is not shown.
- Disabled lens: keeps its position, 1px dashed `--line-strong` outline, `--ink-4`, no fill, `aria-disabled`, `tabIndex -1`.
- Focus: 2px `--focus` (emerald) outline, 2px offset, on every lens, both themes, never the C hue.
- Descriptor: one line, sans italic 15, `--ink-3`, left aligned to the track, 12 below it. The same string is the accessible name's description. Collapses by max-height over `--dur-default` when the member scrolls down, latched for the visit (ruling 405, 488): the first scroll the host reports collapses it and it stays collapsed; tapping the active lens brings it back, and that tap does not unlatch the scroll rule, so a later scroll never takes it away again. Instant under reduced motion.
- Compact variant (header slot on compact and medium tiers once the member has scrolled into the list): the same sunken track at 44, at every tier (W35), no descriptor, inactive lenses min `--target-min` (ruling 498). Under 640 it is also `dense`: the active lens shows its name in place of its icon (the chip plus the word is the indicator), so logo and avatar keep their places.
- Selecting a lens never moves the bar. The host swaps the list and sets its scroller so the new content starts directly beneath the bar.

## Composer entry, same language

The composer entry shares the track's shape, not a pill: `--bg-sunken`, `--radius-m`, 44 tall, pen-line 16 plus "What is going on with you?" in `--ink-3`, 14 side padding. Same in the Feed column and the compact header. Once the Lens Bar takes the header slot, the composer is a tab on the right wall at mid height (32 by 56, `--c-connect`, left corners `--radius-m`, pen-line 18 in `--c-connect-ink`, `--shadow-2`); tap or a short leftward drag opens the composer.

## Tokens

`--bg-sunken`, `--surface`, `--line-strong`, `--ink`, `--ink-3`, `--ink-4`, `--c-{c}` (active icon only), `--focus`, `--font-sans`, `--radius-m`, `--radius-badge`, `--shadow-1`, `--dur-default`, `--ease`. No raw colour literals. No coloured track, no accent stripe, no per-C background.
