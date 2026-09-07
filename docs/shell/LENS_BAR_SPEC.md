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
- Distribution: the active lens is content-sized (`flex: none`) and never stretches; inactive lenses share the remaining width equally (`flex: 1 1 0`), min 44 wide, 36 tall.
- Active chip: one absolutely positioned `--surface` rounded rectangle (`--radius-badge`, 8) with `--shadow-1`, behind the active button, measured from its `offsetLeft`/`offsetWidth` in a layout effect (before paint) and re-measured when the track or the active button resizes. Moves by transform and width over `--dur-default` with `--ease`; no transition on first placement; instant under reduced motion. No border, no gradient, no ring.
- Active content: icon 20 plus label 15/700 `--ink`, at every breakpoint except the compact-tier header slot (icon only, the chip alone marks it). Icon colour is the surface's C brand rung (`--c-{c}`); on Feed, which is not a C, `--ink`.
- Inactive lenses: bare icon 20 in `--ink-3`, `--ink` on hover; no background, no scale, no translate. Icon only below expanded (1024); icon plus label 15/500 at expanded and above. `title` carries the label when it is not shown.
- Disabled lens: keeps its position, 1px dashed `--line-strong` outline, `--ink-4`, no fill, `aria-disabled`, `tabIndex -1`.
- Focus: 2px `--focus` (emerald) outline, 2px offset, on every lens, both themes, never the C hue.
- Descriptor: one line, sans italic 15, `--ink-3`, left aligned to the track, 12 below it. The same string is the accessible name's description. Collapses by max-height over `--dur-default` when the member scrolls down, latched; only tapping the active lens brings it back. Instant under reduced motion.
- Compact variant (header slot on compact and medium tiers once the member has scrolled into the list): same track, no descriptor, inactive lenses min 32. Under 640 it is also `dense`: the active lens shows its name in place of its icon (the chip plus the word is the indicator), so logo and avatar keep their places.
- Selecting a lens never moves the bar. The host swaps the list and sets its scroller so the new content starts directly beneath the bar.

## Composer entry, same language

The composer entry shares the track's shape, not a pill: `--bg-sunken`, `--radius-m`, 44 tall, pen-line 16 plus "What is going on with you?" in `--ink-3`, 14 side padding. Same in the Feed column and the compact header. Once the Lens Bar takes the header slot, the composer is a tab on the right wall at mid height (32 by 56, `--c-connect`, left corners `--radius-m`, pen-line 18 in `--c-connect-ink`, `--shadow-2`); tap or a short leftward drag opens the composer.

## Tokens

`--bg-sunken`, `--surface`, `--line-strong`, `--ink`, `--ink-3`, `--ink-4`, `--c-{c}` (active icon only), `--focus`, `--font-sans`, `--radius-m`, `--radius-badge`, `--shadow-1`, `--dur-default`, `--ease`. No raw colour literals. No coloured track, no accent stripe, no per-C background.
