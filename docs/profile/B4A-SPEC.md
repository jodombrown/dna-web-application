# DNA Brief 4A — Block — Handoff spec

Extracted from `profile/B4A-Block-v1.dc.html` (approved, rulings 198, 207 to 211, 219 to 222; ruling 212 applied after the brief). Shape follows `B4-CONNECT-EXTRACTION.md`: thirteen sections, each present even where it does not apply. Code reads this file and the staged Profile components (`profile/strand-patch/Profile.jsx`, `profile/SPEC.md`); it never reads the page markup. Governing without restatement: 50, 62, 65, 67, 97, 107, 130 to 145, 156, 160, 170, 176, 180, 181.

The surface is an addition to Profile's merged Visitor view: one overflow item, one confirm sheet in two variants, and the blocked party's rendering of a profile at the lowest audience scope. Nothing in Profile v3 changes.

Not in this spec (Code stage): the writer for `member_blocks` and how the page calls it. Brief 4A gives block a control, not a writer; `member_blocks`, its trigger and `profile_view`'s audience drop already exist.

Copy rules throughout: sentence case, no em dashes, no emoji, no exclamation marks, no numerals on either sheet. Tokens by name only.

---

## 1. Route and URL

- Route: `/m/:handle`, Profile's own. Block adds no route, no query param, no hash. The sheet shows the host route.
- Signed-in Visitor view only. The control is absent on the Owner view (a member cannot block themself) and on the Public signed-out view (no identity to block with).
- Ruling 198 keeps `/m/:handle` loading for both parties after a block. That is what makes unblock possible from the same place: there is no other surface.
- Not in the URL and not shareable: the open menu, the open sheet, the block state itself (it is a `member_blocks` row, read by `profile_view`).

## 2. Layout per tier

Profile's layout, unchanged (`profile/SPEC.md` section 0). Three frames: Profile's rail is a left context rail, so ruling 160's fourth frame does not apply (ruling 219).

| Tier | Header | Dock | Column | Rail | Sheet variant |
| --- | --- | --- | --- | --- | --- |
| Compact 390 | compact, 56 | bottom `PulseDock`, 64 plus safe area | full width, max 680, gutters 16, bottom padding 120 | none; mutuals line under the actions | `sheet` (bottom) |
| Medium 820 | compact, 56 | bottom `PulseDock`, inset 120 | max 680 centred, gutters 32, banner bleeds to the frame | none; mutuals line under the actions | `drawer`, 560 |
| Expanded 1280 | expanded, 64 | none | grid `260px minmax(680px, 760px)`, gap 24, max 1440 | left `aside aria-label="Context"` with "In common" | `drawer`, 560 |

The only layout change Block introduces is one control appended to the Visitor action row (section 4). Cover 150 / 200 / 220, portrait 80 / 96 / 104, condensing banner, back row on compact and medium: all Profile's, as merged.

## 3. Masthead (ruling 212 as applied here)

`ProfileHeader` from `Profile.jsx`, `owner=false`, `hero`, `lock`. Ruling 212 was applied to this page after the brief was written and is not in the brief: the core row carries no origin, no current place, no segment label and no place-derived local time line at any scope and for any viewer. The page passes `originCountry` and `currentPlace` empty, `segmentLabel` null and `timeLine` null. Origin, place and segment render only as sections (section 6) under their own visibility settings. Name, headline, portrait, `IdentityMark` and the cover remain.

## 4. Relationship actions and the overflow

The action row follows the banner (Profile's Visitor order: actions, mutuals line, badges). Row: flex, gap 8, wrapping, every control 44 tall. Contents by state, left to right:

| Viewer state | Primary slot | Follow slot | Overflow |
| --- | --- | --- | --- |
| Connected, not blocked either way | "Connected" pill: `--c-connect-tint` ground, `--c-connect-text`, `check` 16, 15/500, `--radius-m`, padding 0 14 | Following (secondary, `aria-pressed=true`) | ellipsis, item "Block {first name}" |
| Not connected, not blocked either way | "Connect with {first name}" (Button `c="connect"`) | Follow (secondary, `aria-pressed=false`) | ellipsis, item "Block {first name}" |
| Viewer has blocked this member (own block) | nothing | nothing | ellipsis, item "Unblock {first name}" |
| Viewer is blocked by this member (dropped scope) | nothing | nothing | ellipsis, item "Block {first name}" |

The blocked party keeps the overflow because blocking is symmetric in availability: they may block back. Their overflow reads Block, never anything that reveals the other party's block.

Overflow trigger: Strand `IconButton name="ellipsis" label="More"`, with a 1px `--line` border and `--radius-m` so it sits with the secondary button, `aria-haspopup="menu"`, `aria-expanded`. It is the last control in the row.

Overflow panel (page-local, proposed, ruling 221): `role="menu" aria-label="More"`, anchored below the trigger (top 50, left 0), min-width 240, `--surface`, 1px `--line`, radius 14, `--shadow-stack`, padding 6 0. One `role="menuitem"` button, 44 tall, padding 0 16, 15/500 `--ink`. Never a second item: no Report (ruling 207), no divider, no icon. Esc closes; pointer down outside closes; the trigger toggles; selecting the item closes the menu and opens the sheet. Every close returns focus to the trigger.

This overflow is built on the page from Strand parts because Profile v3 has no masthead overflow. It is not staged in `Profile.jsx`. It becomes Strand's `Menu` under ruling 221 (request recorded in `STRAND-HANDOFF.md` 3c.1); until that lands, Code builds it as specified here and swaps to `Menu` when it ships.

## 5. Confirm sheets (ruling 211)

Strand `Sheet`, `contained`, variant per tier (section 2), `label` as below. Body padding `24px 24px 32px`, gap 24. Content order (ruling 180): heading, consequences, note, then actions. Heading `h2` in `--font-display` 26/400, line-height 1.2, `tabIndex=-1`, `outline: none`. Consequences: paragraphs 17/1.5, gap 14. Note: 15/1.45 `--ink-3`. Actions: row, gap 8, padding-top 8, Cancel first (secondary), then the confirm. Esc, scrim and drag-down cancel. Cancel and every dismissal return to the profile unchanged. `{first}` is the member's first name; `{name}` the full name. No numerals anywhere on either sheet.

Block sheet. `label` "Block {first}". Heading "Block {name}". Consequences, verbatim, in order:
1. {first} will not find you or reach you on DNA.
2. {first} will see only what a signed-out visitor sees of your profile.
3. Your connection and any follow between you end.
Note, verbatim: "{first} is not told. You can undo this from {first}’s profile."
Actions: Cancel; "Block {first}" (Button `variant="danger"`).

Unblock sheet. `label` "Unblock {first}". Heading "Unblock {name}". Consequences, verbatim, in order:
1. {first} can find you and reach you on DNA again, and sees your profile as any member does.
2. Your connection and follow do not come back. They must be re-made.
Note, verbatim: "{first} is not told."
Actions: Cancel; "Unblock {first}" (Button `variant="primary"`).

Confirm: the sheet closes, the profile re-renders in the new state (section 4 and 6). No toast, no banner, no inline confirmation line. Nothing is written to or shown to the other party (ruling 198).

## 6. Sections and the scope predicate

Sections are Profile's `SectionCard` set in Profile's order (About, segment block, Origin and heritage, Where I am, What I work on, Skills, Languages, What I am here for, Links, then the four activity sections Convenings attested, Spaces and roles, Contributions fulfilled, Stories authored), each rendered only when the viewer's scope admits it and it has content. `BadgeRow` follows the same predicate under its own `badges` audience.

Scope predicate, both branches, from the page's `canSee(member, sectionId, ctx)`:
- Dropped-scope viewer (the viewer is blocked by this member, ruling 198): a section renders only when its audience is Everyone. Connections and Anchored sections do not render.
- Every other viewer: Everyone renders; Connections renders only while the connection edge exists (any block in either direction has revoked it, so after a block neither party sees the other's Connections sections); Anchored renders regardless of edges, because ruling 220 says a block does not end an anchor.

Code implements this in `profile_view`'s audience resolution, not in the client; the page's predicate is the acceptance test.

## 7. The blocked party's view (ruling 198, Done Means 4)

Signed in, on `/m/:handle` of the member who blocked them. Enumerated:

Renders:
- Shell as normal: `AppHeader`, `PulseDock` on compact and medium, back row to Connect on compact and medium.
- Masthead per section 3: cover, portrait, `IdentityMark`, name, headline.
- Action row holding only the ellipsis overflow, whose single item reads "Block {first}".
- `BadgeRow` only if the badges audience is Everyone.
- Every section whose audience is Everyone and which has content, exactly as a signed-out visitor would see it.
- Expanded: the left rail with `RailWidget title="In common"` at its empty state, verbatim: "Nothing in common yet. Connections and Spaces you share appear here."

Does not render:
- Connect, Connected, Follow, Following.
- The mutuals line (compact and medium) and any mutual or shared Space rows in the rail.
- The DIA line under the sections.
- Any Connections-scoped or Anchored-scoped section.
- Any banner, notice, chip, tooltip, empty-state variant, disabled control, or copy that names a block, a restriction, or a reason. The page is indistinguishable from the profile of a member with whom the viewer shares nothing and who has opened only their Everyone sections.

The blocker's own view of the blocked member (Done Means 5): the profile loads; the action row holds only the overflow, reading "Unblock {first}"; mutuals line, rail rows and DIA line render as the data allows (a block does not remove them for the blocker); Connections-scoped sections are gone because the edge is gone; Anchored sections remain (ruling 220).

Open question carried to Convene, recorded and not resolved here: a shared Space stays visible to the blocker after blocking, since 198 revokes connection and follow only.

## 8. States

| State | Trigger | Overflow item | Action row | Sheet |
| --- | --- | --- | --- | --- |
| Not blocked | default | Block {first} | Connect or Connected, Follow or Following, overflow | none |
| Menu open | ellipsis | Block or Unblock per state | as above, `aria-expanded=true` | none |
| Block sheet open | menu item | closed | unchanged beneath the scrim | Block sheet |
| Own block | confirm Block | Unblock {first} | overflow only | none |
| Unblock sheet open | menu item | closed | unchanged | Unblock sheet |
| Unblocked | confirm Unblock | Block {first} | Connect with {first}, Follow, overflow (edges are not restored, ruling 211) | none |
| Dropped scope | other party blocked the viewer | Block {first} | overflow only | none |

Loading, empty and error states are Profile's, unchanged. Block adds none: there is nothing to load and nothing to be empty. A failed write is Code's to surface at Code time; the page designs no error state because the write is not designed here.

## 9. Copy

Menu: More (trigger label and menu label); Block {first}; Unblock {first}.
Block sheet: Block {name}; {first} will not find you or reach you on DNA.; {first} will see only what a signed-out visitor sees of your profile.; Your connection and any follow between you end.; {first} is not told. You can undo this from {first}’s profile.; Cancel; Block {first}.
Unblock sheet: Unblock {name}; {first} can find you and reach you on DNA again, and sees your profile as any member does.; Your connection and follow do not come back. They must be re-made.; {first} is not told.; Cancel; Unblock {first}.
Rail empty: Nothing in common yet. Connections and Spaces you share appear here.
Action row (Profile's): Connect with {first}; Connected; Follow; Following.
Nothing else. No toast, no notification copy, no "blocked" label anywhere.

## 10. Tokens and motion

Colour: `--bg`, `--bg-sunken`, `--surface`, `--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-strong`, `--focus`, `--c-connect`, `--c-connect-text`, `--c-connect-tint`, `--error` through Button `danger`. No raw values.
Type: `--font-sans` 17 (sheet body), 15 (menu item, note, controls); `--font-display` 26 (sheet heading). The serif appears nowhere else in Block.
Shape: menu radius 14, `--radius-m` on the trigger and pills, Strand's Sheet radius.
Shadow: `--shadow-stack` on the menu and the Sheet (both stacked layers, guide 4.2); nothing else.
Motion: menu appears with no transition on the page (Strand `Menu` will fade at `--dur-fast`); Sheet enter and exit are Strand's. No other motion.
Focus: 2px `--focus` outline, 2px offset, on the trigger, the menu item and both buttons; the sheet heading takes focus with `outline: none` since it is not an interactive control.

## 11. Accessibility and focus (rulings 180, 222)

- Trigger: `IconButton` named "More", `aria-haspopup="menu"`, `aria-expanded`.
- Menu: `role="menu" aria-label="More"`, one `role="menuitem"`. Esc closes and returns focus to the trigger. (Arrow-key movement is moot with one item; Strand's `Menu` specifies it.)
- Sheet: Strand `Sheet` provides `role="dialog"` and `aria-label`. Content precedes controls in the DOM: heading, consequences, note, Cancel, confirm.
- Focus on open moves to the sheet heading (`h2`, `tabIndex=-1`), so the first thing read is what will happen, and the destructive button is never the default target (ruling 222). Focus on close, whether by Cancel, confirm, Esc, scrim or drag, returns to the ellipsis trigger.
- Strand's `Sheet` does not manage focus today. The page does it (a ref that focuses the heading on mount, an `opener` reference restored on close). The Strand amendment (`STRAND-HANDOFF.md` 3c.2, rulings 211 and 222: `initialFocus`, `returnFocus`, Tab trap, never a danger default) has not landed. Code must implement and verify this behaviour on the built page rather than inherit it from the component, and re-verify when the amendment lands.
- Touch targets 44 on compact and medium for the trigger, the menu item and both sheet buttons.
- Contrast: AA throughout; the danger button is Strand's.

## 12. Divergence list

The page mounts `ProfileHeader`, `BadgeRow`, `SectionCard`, `SegmentBlock` and `LinkRow` from `profile/strand-patch/Profile.jsx`, and `AppHeader`, `PulseDock` from `shell/strand-patch/`, and `Sheet`, `Button`, `IconButton`, `Avatar`, `Icon`, `RailWidget`, `Chip`, `NotificationBell` from Strand. Differences, each with what wins:

1. The overflow menu exists only on the page (section 4). Strand `Menu` (ruling 221) wins once landed; until then this spec is normative.
2. Sheet focus management exists only on the page (section 11). The Strand `Sheet` amendment wins once landed; until then this spec is normative and Code verifies it.
3. Ruling 212: `ProfileHeader` in `Profile.jsx` still accepts and renders `originCountry`, `currentPlace`, `segmentLabel` and `timeLine` when given; the page passes them empty. `profile/SPEC.md` section 1 still describes the meta line and local time line. Ruling 212 wins; Code passes nothing for those props on every view, and `profile/SPEC.md` should be corrected under a ruling, not here.
4. The page's `canSee` treats the Connections edge as revoked when a block exists in either direction; `Profile.jsx` has no scope logic. Spec section 6 wins; it lives in `profile_view`.

No other differences.

## 13. Out of scope

Code must not build: a report item, a combined block-and-report affordance, or any report placeholder (ruling 207); a blocked list, a settings surface, or any dependency on User Settings (ruling 208); a moderation view; a notification, toast, email or any signal to the blocked party (ruling 198); a "blocked" label, banner or restricted-state copy on either party's view; any change to the Owner or Public views; any count or numeral on either sheet; any schema, migration or RLS change; and anything touching `/dna/affirm`, which ruling 259 struck entirely.
