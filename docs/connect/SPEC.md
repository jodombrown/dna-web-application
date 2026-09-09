# DNA Brief 4 — Connect — Handoff spec (reconciled against the build)

Re-extracted from `connect/B4-Connect-v4.dc.html` (v3 approved at ruling 172; v4 is the founder-directed card cycle, rulings 175 to 181, ratified in Chat). Card, skeleton and tile source: `connect/strand-patch/Connect.jsx` (ruling 169), ported to `src/components/strand/MemberCard.tsx` and `PlaceTile.tsx` (section 14). Rulings governing this surface: 46 to 48, 59, 64, 65, 67, 79, 83, 84, 86, 97, 102, 108, 111, 113, 114, 117 to 121, 141, 153 to 182. The four ruling 182 corrections are applied in this copy. Section 12 names every place the prototype and the component source differ; section 14 names every place the build differs from this text, with the ruling or reason.

Schema, RLS, the Edge Function and the `second_degree` materialisation are in `supabase/migrations/20260908200000_b4_connect_tables.sql`, `20260908200100_b4_connect_rls.sql`, `20260908200200_b4_connect_rpcs.sql` and `supabase/functions/connect-suggest/`; the README's Brief 4 notes summarise them.

Copy rules throughout: sentence case, no em dashes, no emoji, no exclamation marks. Tokens by name only.

---

## 1. Route and URL

- Route: `/connect`. Signed-in only (ruling 156): an anonymous visitor is redirected to sign in; no lens, card, filter or tile renders to them. Public discovery is `/m/:handle` under the member's own opt-in.
- Lens param: `lens=members | suggested | network | where`. Bare `/connect` resolves to `lens=members`.
- Filter params (ruling 84, single value each, ruling 163): `segment` (`returnee | anchor | ally | exploring`), `location` (current location, country name), `origin` (country of origin, country name), `heritage` (`First generation | Second generation | Third generation or later | Continental`), `pathway` (`Already returned | Planning a return | Circular, both places | Not planning a return`), `corridor` (a `corridors.id`, ruling 154, e.g. `accra-london`), `focus` (Focus area vocabulary value), `industry` (Industry vocabulary value), `skill` (Skill vocabulary value), `region` (Regional expertise vocabulary value). Values are URL-encoded vocabulary strings, e.g. `focus=Healthcare%20%26%20Wellness`. An absent key means Any.
- Example: `/connect?lens=members&segment=returnee&focus=Healthcare%20%26%20Wellness`.
- Filters act on Members only. They stay in the URL on every lens (so a shared link keeps them) but only Members reads them.
- Shareable: lens and filters (the URL). Not shareable and not in the URL: an open sheet (filters, intro), the intro draft, the dismissed set, scroll position, toasts. Sheets show the host route.
- Dismissals persist per member (`dismissed_suggestions`, own rows, applied as an anti-join in the projection); the prototype's localStorage key does not ship.

## 2. Layout per tier

Frames are the approved review widths; production is fluid between them. Header, dock and rails are the shell's (`AppHeader`, `PulseDock`, `RailWidget`), mounted once at the root (ruling 69). Connect's `AppHeader` has `homeActive=false` and `cActive="connect"`.

| Tier               | Header       | Dock                                        | Canvas                                                             | Column              | Gutters | Scroll                                                                |
| ------------------ | ------------ | ------------------------------------------- | ------------------------------------------------------------------ | ------------------- | ------- | --------------------------------------------------------------------- |
| Compact 390        | compact, 56  | bottom `PulseDock`, 64 plus safe area       | single column                                                      | full width, max 680 | 16      | page scrolls; bottom padding 120 clears the dock                      |
| Medium 820         | compact, 56  | bottom `PulseDock`, 64, inset 120 each side | single column                                                      | max 680 centred     | 32      | page scrolls; bottom padding 96                                       |
| Expanded 1280      | expanded, 64 | none                                        | grid `260px minmax(680px, 760px)`, gap 24, centred, max 1440       | 680 to 760          | 32      | page does not scroll; left rail and main scroll independently         |
| Expanded-wide 1440 | expanded, 64 | none                                        | grid `260px minmax(680px, 760px) 320px`, gap 24, centred, max 1440 | 680 to 760          | 32      | page does not scroll; each of the three columns scrolls independently |

- The right rail (320) exists only from 1440 (rulings 79, 86, 160). From 1024 to 1439 it is absent and the grid is two columns.
- The 260 left column is always reserved on expanded tiers. When its rail holds nothing (section 6) the column is filled by a bare `div` with no role, no name and no content, so the reading column never shifts on a lens change (ruling 170).
- Rail padding `24px 0 48px`, gap 24 between widgets. Main padding `0 24px 48px` on expanded.
- Ground (ruling 181): the lens column sits on `--bg-sunken` on every tier so `--surface` cards read as raised without a shadow. On compact and medium the whole scroll region is `--bg-sunken`; on expanded and expanded-wide only `main` is, and the rails stay on `--bg`. The sticky lens-bar wrapper is `--bg-sunken` to match. Checked in both themes.

## 3. Lens set and bar

`LensBar` (Strand, shell's v3) with `c="connect"`, `label="Connect lens"`, `labels` true on expanded tiers (icon plus label), icon only on compact and medium.

| id          | Label      | Icon        | Scope line (verbatim)                                      |
| ----------- | ---------- | ----------- | ---------------------------------------------------------- |
| `members`   | Members    | `users`     | Every member you can reach, found by attribute.            |
| `suggested` | Suggested  | `user-plus` | People DIA suggests, each with the reason in words.        |
| `network`   | My Network | `link`      | Requests, what you sent, your connections, who you follow. |
| `where`     | Where      | `globe`     | Where members are, by country. Nobody is plotted.          |

- Order fixed as above. No Messages lens at any tier (ruling 155, 158). No disabled seats.
- The bar wrapper is `position: sticky; top: 0; z-index: 3; background: var(--bg-sunken)` (ruling 182, matching section 2's ground), padding `8px 0` (compact, medium) or `24px 0 8px` (expanded), margin-bottom -8. It never moves on lens change (ruling 108); the lens chip moves inside it.
- Lens change writes `lens=` to the URL and keeps filters.
- Swipe (compact and medium only): horizontal touch travel of 60px or more between `touchstart` and `touchend` on the main column moves one lens left or right, clamped at the ends. No swipe on pointer tiers.

## 4. MemberCard

Source: `Connect.jsx` `MemberCard`. Props:
`member { name, avatar, identified, headline, segmentLabel, place, origin, heritage, corridorLabel, chips, badges, mutuals, reason, message }`, `rel = 'none' | 'sent' | 'received' | 'connected' | 'window'`, `following`, `context = 'members' | 'suggested' | 'requests' | 'sent' | 'connections' | 'following'`, `compact` (true on the compact tier only), `onOpen`, `onConnect`, `onAccept`, `onDecline`, `onFollow`, `onDismiss`, `pointer`, `style`. `MEMBER_REL` exports the relationship set. `MemberCardSkeleton { compact, style }` is the loading shape.

Chassis: `<article aria-label={name}>`, `--surface`, radius 16, 1px `--line`, padding 16, no shadow (ruling 181). It is not a PostCard: never a C frame. Hover (pointer only): border `--line-strong`, 150ms `--ease`. No lift.

Layout is a grid with named areas; the DOM order is always head, body, portrait, actions so keyboard and screen-reader order reaches the name before any action (ruling 180, the 174 principle).

| Tier                            | Portrait   | Grid                                                                                                                | Visual result                                                                                                                                     |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compact (`compact`)             | 96 square  | columns `minmax(0,1fr) auto`; areas `"portrait actions" "head head" "body body"`; column gap 12, row gap 12         | portrait top-left, actions top-right, then name block and body full width beneath: a taller card                                                  |
| Medium, Expanded, Expanded-wide | 120 square | columns `120px minmax(0,1fr) auto`; areas `"portrait head actions" "portrait body body"`; column gap 18, row gap 10 | portrait in column one for the card's height, name block beside it, actions top-right on the name's line, body under the name: a wide, short card |

Portrait: `Avatar` at the tier size (photo when present, initials otherwise; radius from Strand), never stretched or cropped. `IdentityMark` 24 at bottom-right (offset -5, -5) when `identified`.

Head (area `head`, gap 3):

- Name: button (opens `/m/:handle`), `--font-display` 24, line-height 1.1, letter-spacing -0.01em, `text-wrap: balance`, emerald focus ring with 3 offset and 4 radius.
- Headline 15 `--ink-2` when present.
- Two meta lines, 13 `--ink-3`, gap 2: line one "{segmentLabel} · From {origin}, {heritage}" (heritage omitted when Continental; the dot is `aria-hidden`); line two `map-pin` 13, "{place} · {corridorLabel} corridor" (corridor part only when set; the label is a `corridors` row, ruling 154).
- Chips (`context === 'members'` only, ruling 178): up to two `Chip`s, gap 6, margin-top 6. The host orders the member's vocabulary values so any that match the active filters come first; the card shows the attribute that put it in the result set.

Body (area `body`, gap 10; not rendered when nothing applies):

1. `BadgeRow` only when `badges` is non-empty. No empty or greyed badge area (rulings 46 to 48, 143).
2. Mutuals (when not connected and `mutuals` non-empty): an `Avatar` 24 cluster (gap 4) then the names written out in 500 ("A", "A and B", "A, B and C") followed by "is a connection you share" or "are connections you share" in `--ink-3`. Up to three; never a count, never "+N" (ruling 120).
3. Reason (`context === 'suggested'`): DIA's sentence, 15 italic `--ink-2`.
4. Message (`context === 'requests'`): the sender's introduction as a `blockquote`, `--bg-sunken`, radius 10, padding `12px 14px`, 15 `--ink-2`.

Actions (area `actions`, `justify-self: end`): a row, gap 8, right-aligned, wrapping. Compact `received` (ruling 176): Accept and Decline share one row and Follow sits beneath them, right-aligned; nothing shrinks. Dismiss (`context === 'suggested'`) is the last control in the row.

Relationship action matrix (Follow is independent of `rel`; ruling 118):

| rel         | Primary slot                                                                                               | Follow off                              | Follow on                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------- |
| `none`      | Connect (Button `c="connect"` sm) → opens the intro sheet                                                  | Follow (ghost sm, `aria-pressed=false`) | Following (secondary sm, `aria-pressed=true`) |
| `sent`      | "Pending" pill: 36 tall, `--radius-m`, 1px `--line`, `--ink-3` 15/500. Never a declined state (ruling 157) | Follow                                  | Following                                     |
| `received`  | Accept (Button `c="connect"` sm) and Decline (secondary sm)                                                | Follow                                  | Following                                     |
| `connected` | "Connected" pill: `--c-connect-tint` ground, `--c-connect-text`, `check` 14, 36 tall, `--radius-m`         | Follow                                  | Following                                     |
| `window`    | Nothing. No action, no chip, no status text, no explanation (rulings 157, 161, 168)                        | Follow                                  | Following                                     |

- Accept: `rel` becomes `connected`; toast "You and {first name} are connected." Notification to the sender is `connection_accepted` (ruling 144).
- Decline: `rel` returns to `none` for the viewer, the card leaves Requests, the member stays in Members and Where with Connect available (rulings 161, 168). Nothing is written for the sender; their card reads Pending until the 90-day window elapses.
- `window` is the sender-side state after their introduction was declined: for 90 days the target's card carries no Connect. It then returns to `none`. One further request is permitted; a second decline is terminal in that direction (ruling 157). Built reading (rulings 157, 161, 168 as written in the Decisions Register): during the window the Sent section lists the request as Pending and the member's card on Members, Suggested and Where carries `rel = window`; after the window the pair returns to `none` and the Sent row clears; after a second decline the card stays `window` for good. The decliner returns to `none` at once. All of it is computed by `private.relationship_state` and never by the client.
- Follow toggles instantly and silently: no approval, no notification, no count. It changes the Feed's My Network lens only (ruling 83).
- Dismiss removes the card from Suggested permanently.
- No Message action anywhere (ruling 117).

## 5. PlaceTile and the Where lens

Source: `Connect.jsx` `PlaceTile`. Props: `name`, `onPick`, `pointer`, `style`.

- One treatment for every tile (ruling 159): `--c-connect-tint` ground, 1px `--line`, radius 14, min-height 104, padding 14, name bottom-left in `--font-display` 22, line-height 1.15, `--c-connect-text`, `text-wrap: balance`. No band, no fill difference, no count.
- `aria-label`: "{name}. Show members there." Nothing else in the name.
- Hover (pointer): `filter: brightness(0.92)`, 150ms. Focus: emerald ring.
- Pick: sets `lens=members` and `location={name}` in the URL, keeping other filters.
- Grid: `repeat(2, minmax(0,1fr))` on compact, `repeat(4, minmax(0,1fr))` on medium and expanded; gap 12. Groups stack with gap 20.
- Group headings (caps 13, `--ink-3`, 0.06em, as `h2` inside `<section aria-label>`): "On the continent", "In the diaspora". Grouping is by the country's continent; the diaspora group is every country outside Africa.
- Caption below the groups (13 `--ink-3`, verbatim): "Countries by where members are now. Nobody is plotted. A country appears once enough members are there to be shown as a group, and not before. Open one to see its members."
- Floor rule (ruling 111): a country with fewer current-location members than the floor is absent, not greyed, suppressed or listed. The floor value comes with the corridor seed; the prototype shows eight demo countries. Tiles are ordered by name within each group.
- No geographic map, no Mapbox, no pins on Connect (ruling 158). The word "map" does not appear on this surface.
- Empty state (no country above the floor): section 8.

## 6. Rails

DIA appears once per screen (ruling 167). An `aside` renders only when it holds something; the 260 column stays reserved by a bare div otherwise (ruling 170).

| Lens       | Has right rail (1440) | Left rail content                                                                     | Left `aside` renders   | Left accessible name | Right rail content |
| ---------- | --------------------- | ------------------------------------------------------------------------------------- | ---------------------- | -------------------- | ------------------ |
| Members    | no (1280)             | Filters                                                                               | yes                    | Filters              | none               |
| Members    | yes (1440)            | Filters                                                                               | yes                    | Filters              | DIA suggests       |
| Suggested  | no                    | nothing                                                                               | no                     | none                 | none               |
| Suggested  | yes                   | nothing                                                                               | no                     | none                 | DIA suggests       |
| My Network | no                    | DIA suggests, if any suggestion has a grounded reason; otherwise nothing and no aside | when suggestions exist | DIA suggests         | none               |
| My Network | yes                   | nothing                                                                               | no                     | none                 | DIA suggests       |
| Where      | no                    | DIA suggests, if any; otherwise nothing and no aside                                  | when suggestions exist | DIA suggests         | none               |
| Where      | yes                   | nothing                                                                               | no                     | none                 | DIA suggests       |

- Right rail: `aside aria-label="DIA suggests"` holding one `RailWidget title="DIA suggests"`. Populated: up to three rows (`Avatar` 28 and name 15/500, reason 15 italic `--ink-2`, Connect secondary sm `c="connect"` opening the intro sheet), each row `padding 10px 0` with a 1px `--line` top. Empty line (verbatim): "DIA has nothing to suggest yet. It suggests someone when you share an event, a Space, a corridor, or a connection with them."
- Left rail Filters: `RailWidget title="Filters"` holding the ten `Select` controls (section 8 order, each with an "Any" first option) and a "Clear all" link button when any filter is applied.
- Left rail DIA (1280, My Network and Where): the same `RailWidget title="DIA suggests"` rows as the right rail, but rendered only when at least one grounded suggestion exists; no empty line, no aside.
- Rails hold context and DIA, never navigation (ruling 79). Suggestion rows in the rail come from the same rule-ranked set as the Suggested lens (ruling 153), first three, dismissed excluded.

## 7. Sheets

Both mount Strand's `Sheet` (shell v3 form) inside the frame.

| Tier                            | Variant          | Size              |
| ------------------------------- | ---------------- | ----------------- |
| Compact                         | `sheet` (bottom) | height 80 percent |
| Medium, Expanded, Expanded-wide | `drawer` (right) | width 65 percent  |

Both sheets: head row 56 tall with title 17/700 and an `x` IconButton "Close", 1px `--line` beneath; body scrolls; footer over a 1px `--line` with actions right-aligned, padding `12px 20px`, plus 42 bottom padding on compact for the home indicator. Esc, scrim tap and drag-down close.

Intro sheet (`aria-label` "Introduce yourself to {name}"):

- Body: `Avatar` 48, name in `--font-display` 26, headline 15 `--ink-2`; `Input multiline rows=6` labelled "Your message to {first name}", `maxLength=300`, placeholder (verbatim) "Why you, why now. What you noticed on their profile, what you are working on, what you hope comes of it."; hint reads remaining characters as text, "{n} characters left" ("1 character left" at one), never a bar or percentage; note 13 `--ink-3` (verbatim) "One message, sent once. It cannot be edited after sending. {first name} decides in their own time and you will hear when they accept."
- Footer: Cancel (ghost) and "Send introduction" (Button `c="connect"`), disabled while the trimmed message is empty (ruling 119: a request is never sent empty).
- Send: `rel` becomes `sent`, sheet closes, toast "Your introduction is with {first name}." Single-shot; not editable after send.

Filters sheet (`aria-label` "Filters"; compact and medium only, expanded uses the rail):

- Opened by a secondary sm Button "Filters" with `sliders-horizontal` 16 in the Members filter row.
- Head: title "Filters", "Clear all" link when any filter is applied, Close.
- Body: the ten `Select` controls. Footer: "Show members" (Button `c="connect"`) closes the sheet; filters apply as chosen.

Strand amendment requested (ruling 165, in `STRAND-HANDOFF.md` 3b.3): `Sheet` gains `host` so its scroll lock targets the frame rather than the mount wrapper. Until it lands, lock the page scroll from the host on open.

## 8. States

Filter controls, in order at every tier: Segment, Current location, Country of origin, Heritage, Return pathway, Corridor, Focus area, Industry, Skill, Regional expertise. Applied filters render as removable `Chip`s (with `onRemove`) in the Members filter row with a "Clear all" link when any is applied; the row is Members-only.

| Lens                | Populated                           | Empty (verbatim)                                                                                                                                                                                                           | Loading skeleton                                                                                   | Error  |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| Members, no filters | cards, gap 14 (sections 28 apart)   | Title "Nobody here yet." Body "Members appear as they join. Yours is the first profile they will see." Action "Open your profile" → `/m/:me`                                                                               | three card ghosts                                                                                  | shared |
| Members, filtered   | cards                               | Title "Nobody matches these filters." Body "Clear one and try again." Action "Clear filters" → clears all filters (ruling 164)                                                                                             | three card ghosts                                                                                  | shared |
| Suggested           | cards with reason and Dismiss       | Title "No suggestions with a real reason yet." Body "DIA suggests someone when you share an event, a Space, a corridor, or a connection with them. Until then, this stays empty." Action "Browse members" → `lens=members` | three card ghosts                                                                                  | shared |
| My Network          | four sections (below)               | when all four are empty: Title "Your network starts here." Body "Connections you make and members you follow gather here." Action "Browse members" → `lens=members`; the section headers do not render in this case        | three card ghosts                                                                                  | shared |
| Where               | two groups of tiles and the caption | Title "No country has reached the floor yet." Body "Where shows a country once enough members are there to appear as a group, never as individuals." No action                                                             | eight tile ghosts in the tier's tile grid (min-height 104, radius 14, `--bg-sunken`, 1px `--line`) | shared |

- Empty states are Strand `EmptyState` with `c="connect"`, `pattern="kente"`; actions are secondary Buttons in Connect green.
- Suggested is empty whenever no member has a current rule-derived reason (ruling 153). Never a filler, a recently-joined list, or a profile-completion prompt.
- Card ghost: `MemberCardSkeleton` (ruling 164): same chassis as the card (`--surface`, radius 16, 1px `--line`, padding 16), a 96 (compact) or 120 square in `--bg-sunken` with radius 14, and three bars (20 tall at 45 percent, 12 at 80, 12 at 35); stacked on compact, two columns otherwise. Three ghosts under `role="status" aria-label="Loading Connect"`; the Where skeleton is `aria-label="Loading Where"`.
- Members and Suggested render their cards inside one untitled `<section aria-label="{lens label}">`; My Network renders four titled sections. All cards, every lens, are `MemberCard` mounted from `Connect.jsx`, gap 14 inside a section, 28 between sections.
- Error (shared, all lenses): `role="alert"` card, `--surface`, radius 14, 1px `--error`, padding 20: "Connect could not load." 17/700; "Check your connection and try again. Nothing you did was lost." 15 `--ink-2`; "Try again" secondary sm.
- My Network sections, in order, each `<section aria-label>` with an `h2` caps 13 header and no count anywhere: Requests (context `requests`, cards with the message), Sent (context `sent`, Pending), Connections, Following. Section empty lines (15 `--ink-2`, verbatim): Requests "No requests waiting."; Sent "Nothing sent. Introductions you make wait here until they are accepted, or until they quietly expire."; Connections "No connections yet. Start with someone you have met."; Following "Following nobody yet. Follow is one way and quiet; it shapes your Feed."
- Toasts (Strand `Toast`, 2.4s, centred above the dock): "You and {first name} are connected."; "Your introduction is with {first name}."

## 9. Copy

Lens labels: Members; Suggested; My Network; Where.
Scope lines: Every member you can reach, found by attribute. / People DIA suggests, each with the reason in words. / Requests, what you sent, your connections, who you follow. / Where members are, by country. Nobody is plotted.
Bar label: Connect lens.
Filter labels: Segment; Current location; Country of origin; Heritage; Return pathway; Corridor; Focus area; Industry; Skill; Regional expertise. First option: Any. Buttons: Filters; Clear all; Show members.
Card: Connect; Pending; Accept; Decline; Connected; Follow; Following; Dismiss; From {origin}; {corridor} corridor; is a connection you share; are connections you share.
Section headers: Requests; Sent; Connections; Following.
Section empty lines: No requests waiting. / Nothing sent. Introductions you make wait here until they are accepted, or until they quietly expire. / No connections yet. Start with someone you have met. / Following nobody yet. Follow is one way and quiet; it shapes your Feed.
Lens empty states: as section 8, verbatim.
Where: On the continent; In the diaspora; Countries by where members are now. Nobody is plotted. A country appears once enough members are there to be shown as a group, and not before. Open one to see its members. Tile aria: {name}. Show members there.
Rail: DIA suggests; Filters; DIA has nothing to suggest yet. It suggests someone when you share an event, a Space, a corridor, or a connection with them.
Intro sheet: Introduce yourself; Introduce yourself to {name}; Your message to {first name}; Why you, why now. What you noticed on their profile, what you are working on, what you hope comes of it.; {n} characters left; 1 character left; One message, sent once. It cannot be edited after sending. {first name} decides in their own time and you will hear when they accept.; Cancel; Send introduction.
Error: Connect could not load.; Check your connection and try again. Nothing you did was lost.; Try again.
Toasts: You and {first name} are connected.; Your introduction is with {first name}.
Loading labels: Loading Connect; Loading Where.
Vocabularies (verbatim, from `profile/SPEC.md`): Focus areas, Industries, Regional expertise, Skills as listed there; Heritage and Return pathway as in section 1.

## 10. Tokens and motion

Colour: `--bg`, `--bg-sunken`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-strong`, `--error`, `--focus`, `--c-connect`, `--c-connect-text`, `--c-connect-tint`, `--c-connect-ink`. No raw values; no other C colour appears on Connect except inside `BadgeRow` (its own C tints).
Type: `--font-sans` 17 (body), 15 (card secondary, chips, buttons), 13 (meta, caps headers at 0.06em, captions); `--font-display` 24 (card name, ruling 177), 22 (tile name), 26 (intro sheet name). The card name is the member's own line, not a control or metadata; the serif appears nowhere else on the card.
Shape: radius 16 cards and skeletons, 14 tiles and the skeleton portrait, 10 quote block, `--radius-m` pills, 4 name-button focus radius. Borders 1px.
Spacing: card padding 16; card column gap 12 (compact) or 18, row gap 12 or 10; cards 14 apart, sections 28 apart; tile gap 12; rail gap 24; gutters 16 compact and 32 otherwise (24 inside `main` on expanded).
Ground and shadow (ruling 181): lens column on `--bg-sunken`, cards on `--surface`, no shadow on cards, skeletons or tiles. `Sheet` carries `--shadow-stack`; `LensBar`'s active chip carries `--shadow-1` (Strand-owned).
Motion (`--ease` throughout): 150ms card border on hover, tile brightness on hover, `--dur-fast` controls; 300ms sheet enter and exit (Strand `Sheet`); `LensBar` chip travel at `--dur-default`; toast 2.4s dwell. No other durations; nothing at 100ms is Connect's own.
Hover (pointer tiers only): card border `--line-strong`; tile `brightness(0.92)`; filled buttons `brightness(0.92)`; outlined buttons fill `--bg-sunken` (Strand). No hover on compact and medium.
Focus: 2px `--focus` (emerald) outline, 2px offset, on every interactive element (ruling 97).

## 11. Accessibility

- Landmarks: `header` (shell), `main` (the lens column), `aside aria-label="Filters"` or `aside aria-label="DIA suggests"` (left, only when populated), `aside aria-label="DIA suggests"` (right, 1440). A landmark is never announced when it holds nothing (ruling 170): the reserved column is a plain `div`. `nav aria-label="Pulse"` is the dock.
- Lens bar: `role="tablist" aria-label="Connect lens"`, each lens `role="tab" aria-selected`, name "{label}: {scope}"; arrow keys move between tabs (Strand `LensBar`).
- Cards: `article aria-label={name}`; the name is a button to the profile; Follow and Following carry `aria-pressed`; the Pending and Connected pills are text, not controls. DOM order inside every card is name block, body, portrait, actions on both tier branches (ruling 180): a reader hears whose card it is before any action; the visual arrangement comes from grid areas, never source order.
- Sections: `section aria-label` with an `h2` for My Network and Where groups.
- Tiles: buttons named "{name}. Show members there."
- Sheets: `role="dialog" aria-label`; focus moves to the sheet on open and returns to the opener on close; Esc closes.
- Skeletons `role="status"` with the loading label; error `role="alert"`.
- Focus order: header, lens bar, filter row (Members), then each card as name, then its actions left to right, then rails.
- Touch targets: 44 minimum on compact and medium (buttons `sm` at 36 sit in 44 rows; tiles 104; dock slots 44). Pointer tiers keep 36 controls.
- Contrast: all text at AA on its ground; `--c-connect-text` on `--c-connect-tint` for tiles and the Connected pill.

## 12. Divergence list

The page mounts `MemberCard`, `MemberCardSkeleton` and `PlaceTile` from `Connect.jsx` and draws no card or tile of its own, so the v3 divergence class (duplicated inline card, corridor line missing in one block) is closed. Remaining differences, each with the ruling on which wins:

1. Chip ordering: `MemberCard` renders `member.chips` in the order given; the page's logic class puts values matching the active filters first before passing them. The ordering rule lives in the host (section 4), not the component. Spec wins; Code implements it where the card data is assembled.
2. `IdentityMark` and `BadgeRow` are read from `window.StrandPatch` (the profile patch) inside `MemberCard`; in Strand they are `components/dna/` exports. Strand's bundle wins once landed.
3. `PlaceTile` and `MemberCard` each inject a small `<style>` for `:focus-visible`; in Strand the focus ring comes from `styles.css`. Strand wins.

No other differences. Layout, rails, sheets, states and copy exist only in the page and are normative here.

## 13. Out of scope

Code must not build: a Messages lens or thread, any Message action (ruling 117), presence (blocked on User Settings), multi-select filters (ruling 163, logged gap), a geographic map, Mapbox, pins or a choropleth on Connect (ruling 158), density bands or any ordinal country ranking (ruling 159), any count (mutuals, followers, requests, members, "+N", "and others"), any score, affinity, strength or percentage (ruling 153), a declined status, decline timestamp or differentiated empty state visible to a sender (ruling 157), a signed-out Connect (ruling 156), a settings surface, onboarding, a Space or event surface, a second LensBar.

## 14. Built state and divergences from this text

What shipped, and where the build reads differently from sections 1 to 13, each with its reason. Where a value here contradicted the approved page, the page won (ruling 182); where a sentence here contradicted a ruling in the Decisions Register, the register won and the change is named.

1. **Card, skeleton and tile source.** `Connect.jsx` is ported one to one to `src/components/strand/MemberCard.tsx` (`MemberCard`, `MemberCardSkeleton`, `MEMBER_REL`, `joinNames`) and `src/components/strand/PlaceTile.tsx`. The design-system globals are the repo's Strand components; the injected `<style>` blocks are the two rules under "Brief 4" in `src/styles/strand.css`; the name button and the tile reset their chrome property by property instead of `all: unset`, because an inline `all: unset` would beat the stylesheet's `:focus-visible` ring (ruling 97). Section 12 items 2 and 3 are closed by this.
2. **Chip ordering (section 12 item 1)** is done where the card data is assembled: `private.connect_card` orders the member's work and skills values with any that match the active filters first, then by axis and vocabulary position; the component slices to two.
3. **Window semantics** as section 4 now states: `rel = window` on the card during and after the window, Pending in Sent during it. The earlier sentence "their card reads Pending until the window elapses" described the Sent section only.
4. **Mutuals carry an avatar**: the projection returns `{ name, avatar_path }` for up to three mutuals so the 24 cluster can show a real photo; `Connect.jsx` took names only.
5. **Members paging**: the projection pages by a keyset cursor (name, id), twenty cards a page; a secondary "More members" button (Connect green, sm) follows the last card while a next page exists. The prototype's cohort fitted one page. No count is shown.
6. **Suggested arrives through `connect-suggest`** (Edge Function) rather than a direct RPC: it calls `connect_cards('suggested')` with the member's own JWT, hands the structured facts (event titles, Space titles, corridor labels, vocabulary values, mutual names; never a number) to DIA on the Anthropic API, validates each sentence (no digit of its own, no percent sign, no exclamation, under 240 characters) and drops any suggestion whose reason did not arrive. The facts never reach the client. The rail's three rows are the first three of the same set.
7. **DIA rail rows** show their Connect button only while `rel` is `none`; a row whose member is already Pending or Connected shows name and reason alone.
8. **Place line** is "{current_place}, {current_country}" when both are set and the place does not already name the country, otherwise whichever exists. **Corridor label** is "{continental_place} to {diaspora_place}" ("Accra to London corridor"); the seed can revise the wording since corridors ship with zero rows (ruling 154).
9. **Segment labels** come from the new `member_segments` table (Returnee, Anchor, Ally, Still Exploring), read at runtime with the other nine option lists through `connect_filter_options()`.
10. **Intro sheet on compact** is Strand's `Sheet` at 80 percent height (section 7) via the `style` prop; the Strand `host` amendment for the scroll lock (ruling 165) has not landed, so the page scroll is locked from the host as the sheet already does.
11. **LensBar descriptor** (Strand): the collapse cap moved from 40 to 72 so the Connect scope lines, which wrap on compact, are not clipped. Everything else in `LensBar` is unchanged.
12. **Shell**: `main` is built before both rails on every route, with the rails placed in grid columns 1 and 3 (ruling 174, standing). Feed and Profile are visually identical; only their keyboard order changed to content first. A rail slot carries its landmark name with its content; a slot with no content renders a bare `div` (ruling 170). The lens column's ground (`--bg-sunken`, ruling 181) is a shell property Connect switches on while mounted.
13. **Profile follow-through**: `/m/:handle` reads its relationship through the same `private.relationship_state` (so `window` shows Follow only there too) and writes Follow, Accept, Decline and withdraw through Connect's write paths. The sender no longer has any direct read on `connection_requests`; the Feed's Connect posts read who and why through `connection_request_intros(ids)`, a projection with no status column; the Feed's My Network lens reads `member_connections`.
14. **Where floor**: `private.connect_settings.where_floor`, seeded at five (CLAUDE.md: nothing renders below five). The count never leaves the database.
15. **Blocks**: the chassis had no block store, so `member_blocks` ships here (own rows, no surface in this brief). `private.is_blocked` filters every projection, every mutual name and the Where count in both directions.
16. **Compact Suggested actions** follow ruling 176's design for three controls beside a 96 portrait: Connect takes the first row and Follow and Dismiss the second, right aligned. `Connect.jsx` stacked only the `received` case, and its three Suggested controls overflowed the card at 360 and 390 in the port.
17. **Not built, as ruled**: no Messages lens or action, no presence, single-value filters only, no map, no bands, no count anywhere, no embedding call (`member_embeddings` exists and is empty), no declined status on any sender-side payload.
