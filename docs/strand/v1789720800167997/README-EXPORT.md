# Strand `_ds/` export — compile `v1789720800167997`

Swap this folder in whole. It is Strand at the correction 17 compile.

**This id is new.** `v1789720800167997` supersedes `v1789619870985180`, which the app project's literals currently name. Correction 17 added three props to LensBar and named the packing default (`label`, `c`, `collapsed`, `width`), so the literals move to this id with the swap. Correction 16's decisions are unchanged inside it: G37's 15px and the `document.fonts` re-measure are both still true here.

## Check the folder before you trust the prose (854)

- **Static:** first line of `_ds_bundle.js` reads `/* @ds-compile-id: v1789720800167997 */`.
- **Runtime:** `window.__DS_COMPILE_ID === 'v1789720800167997'` after the bundle loads (`window.__DS_NAMESPACE` is `StrandDNADesignSystem_3654dd`).
- If either disagrees with a literal in a page, the folder and the prose disagree. That is the check that was impossible before this export.

## What is in here

- `_ds_bundle.js` — the compiled bundle, byte for byte, with a two-block comment header and one `__DS_COMPILE_ID` assignment prepended (+871 bytes). Nothing in the compiled code was edited.
- `_ds_manifest.json`, `styles.css`, `tokens/` (5 files), `assets/` (50 files: `adinkra/`, `icons/`, `patterns/`, `imagery/`, `logo.png`).
- `LENSBAR-CHANGES-14-16.md` — the observable change list for 857, items 1 to 19 (corrections 14 and 16) and 20 to 27 (correction 17), extended in place.

## Confirmed by reading this exported file, not its source

`LensBar` contains the `document.fonts` re-measure (`fonts.ready` plus the `loadingdone` listener) and `PAD_OFF = 15` with `PAD_ON = 16`, so inactive tab padding is 15px. It also carries correction 16's zero-measurement guard and the `offsetWidth` scale normalisation, and correction 17's `label = 'Lens'` default, `c`, `collapsed`, `width = 'content'` and the `data-lensbar-width` hook. The whole file parses.

## What Strand did not do

A compile ran, as 129 guardrail 3 allows for correction 17, and its id is above. The id literal exists in **this export copy only** — the compiler owns the root bundle's header, so Strand cannot put the id there without a new compile, which guardrail 1 forbids. The app project was not opened (663), and this export is handed to the founder, not delivered across.
