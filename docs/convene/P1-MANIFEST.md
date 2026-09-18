# Convene Pass 1, Compose and card: MANIFEST

**Bundle:** Strand `_ds/dna-design-system-3654dd17-846a-48e2-97ad-3b3fd019859a/_ds_bundle.js` at `v1789537371639386` (41 exports), included in this folder. The page loads it in `<helmet>` and mounts `StrandDNADesignSystem_3654dd.Composer` by its namespace path (756).

**Approval:** Approved under 62 (677); P1-EXTRACTION Revision 3 ratified 683, Revision 4 line under 705; speakers-row line under Brief 10.

**Proof at this compile (755):** every Composer state (twenty-five, from Free text to Published) mounts a populated Strand Composer in all three frames; the card surface renders in its thirteen states; no console errors. Confirmed in the live view after the page's own open gate.

## Strand parts the page uses

- `Avatar`
- `Button`
- `Chip`
- `Composer`
- `Icon`
- `Input`
- `NotificationBell`
- `Segment`
- `Select`
- `Toast`
- `VerbChip`

Plus the tokens (`tokens/*.css`, `styles.css`) and the assets under `assets/`.

## Staged patches and page scripts loaded

- `./support.js`
- `p1-convene-form.js`
- `../composer/dia-mock.js`
- `../shell/strand-patch/AppHeader.jsx`
- `../shell/strand-patch/PostCard.jsx`
- `../shell/strand-patch/PulseDock.jsx`

## Rulings cited in SPEC.md

52, 53, 62, 69, 77, 88, 97, 105, 145, 508, 520, 578, 579, 580, 581, 583, 621, 630, 633 to 636, 641 to 643, 664 to 677, 678, 681, 683, 705, 756

## Frames (`frames/`)

- `card-dark-1280.png`
- `card-dark-390.png`
- `card-dark-820.png`
- `card-light-1280.png`
- `card-light-390.png`
- `card-light-820.png`
- `composer-dark-1280.png`
- `composer-dark-390.png`
- `composer-dark-820.png`
- `composer-light-1280.png`
- `composer-light-390.png`
- `composer-light-820.png`

Composer frames on the In person state (step 3, the form open); card frames on In the Feed. Captured at native size, light and dark, review bar excluded.

## What Code must supply that the prototype stands in for

- **Mapbox place resolution.** `p1-convene-form.js` `lookupPlace` and `PLACES` are a fixture table of a few venues; production resolves a venue name to one place through Mapbox, narrowed by the member's homes, and writes `place_id`, `place_name`, `city` and the derived `timezone`. Only the states matter here (empty with homes, resolved, no result, several).
- **Date parsing.** `parseWhen` and `parseTime` are a prototype parser for a handful of English forms; production parses the member's words in the event's time zone and reads them back in one line, falling back to the picker on failure. The honest window (`date_window` as words, `ends_at` null) is a real object shape, not a parse artefact.
- **DIA inference.** `composer/dia-mock.js` returns canned reads after a delay; production is the inference service behind Strand's Composer contract (`infer`, proposal without selection).
- **Publish.** `onPublish` resolves or fails on a timer; production writes the event object (P1-SPEC section 4) and the host builds the card from `created_object.convene.*`.
- The shell (`AppHeader`, `PulseDock`, `PostCard`) loads from `shell/strand-patch/`, staged patches ahead of the compile; Code builds against Strand's parts.
- The review bar is Design's, not product UI. Frames are fixed widths; production is fluid.
- **Fixtures, all Design's:** Corridor Suppers: Accra, Amara Osei, Front Room in Osu, the homes, the venues in `PLACES`, the going names, the sponsor Ecobank Ghana, the cancelled reason and every date. The one image is Strand's hero placeholder.
