# DNA Brief 2 — App Shell, Feed, Minimum Notifications — Handoff spec

Generated from the prototype. Live page: `shell/B2-Shell-Feed-v3.dc.html` in the app project (app.diasporanetwork.africa). Source components and tokens live in Strand and sync here as `_ds/`; the Brief 2 components landed in Strand and are consumed from the bundle. Claude Code builds from this file, the brief, and CLAUDE.md. Rulings referenced are D103 onward (ruling N = D(102+N)).

Status: v3, refinement pass (rulings 99, 100, 102, 104, 105), awaiting founder approval (gate 3). v2 was approved; v3 changes only the header row, dock treatment, LensBar accessible name, Feed desktop scroll, and Read more. Components changed for v3 are staged in `shell/strand-patch/` (AppHeader, PulseDock, PostCard, LensBar) plus `assets/icons/house.svg`; they land in Strand next, then the page switches back to the bundle. Sections marked **assumption** are routine calls made in design; overturn by ruling.

## 1. Shell (ruling 69)

Mounted once at the app root. No surface composes its own header or nav. Client-side route transitions only (ruling 84); the shell never remounts between `/feed`, `/posts/:id`, and the five C routes.

Header: `AppHeader`.

- Compact (< 640) and medium (640 to 1024), touch (ruling 99): `variant="compact"`, 56 tall, 1px `--line` beneath. Order: logo (24 tall, an `<a href="/feed">`, always Home: it routes to `/feed` and scrolls the Feed to the top, which also restores the composer row), centre slot (flex 1), `NotificationBell`, `Avatar` 32 in a 44 hit area. No Home icon on compact or medium. Gutters 16 left, 8 right, gap 6.
  - Centre slot at the top of Feed: composer entry (44 tall, `--bg-sunken`, `--radius-m`, pen-line 16 plus "What is going on with you?" in `--ink-3`).
  - Centre slot once the member has scrolled past 72px into Feed: `LensBar compact` (36 tall, no border, no scope line) replaces the pill and the in-flow LensBar hides (`visibility: hidden`, keeps its height so nothing jumps). Under 640 the bell leaves with the composer (avatar stays at the far right for uniformity) and the lens bar is `dense`: the active lens shows its name in place of its icon (label only, 15/700 on the chip), inactive lenses are icons at 32 min. Bell and composer return together at the top. Medium keeps the bell and shows icon plus label on the active lens.

Selecting a lens from the header slot never moves the bar: the list re-renders and the scroller is set to the point just below the hidden in-flow bar, so the new content starts at the top of the Feed and the header stays in lens mode. The content column has a minimum height of the viewport plus 40 so a short list can still hold that position. While the LensBar holds the slot, the composer is a tab in `--c-connect` at 92% opacity with pen-line 18 in `--c-connect-ink` and `--shadow-2`. Compact (< 640): a handle 64 wide, 30 tall, top corners `--radius-m`, centred (above Collaborate) and flush with the dock's top edge, layered behind the dock (dock z 20, handle z 15, no shadow). It is always mounted and rests hidden behind the dock (`translateY(30px)`); while the member is scrolling (past 72px) it slides up from behind the dock over `--dur-base`; 2.5s after the last scroll event it slides back behind the dock, and reappears on the next scroll. Returning to the top hides it and restores the header composer row. Tap or a 24px upward drag opens the composer sheet. The medium wall tab slides in from the right edge the same way. Medium: a tab on the right wall at mid height, 32 wide, 56 tall, left corners `--radius-m`, flush with the frame; tap or a 24px leftward drag opens it. It hides while the composer or notifications are open and goes when the composer row returns at the top. Scrolling back to the top swaps the pill back and the floating button goes. The header never grows: one row, 56 tall.
- Expanded (> 1024), pointer (ruling 99): `variant="expanded"`, one row, 64 tall, 1px `--line` beneath, inner row centred at max width 1440 with 32 gutters. Order: logo 28 (`<a href="/feed">`, always Home: routes to `/feed` and scrolls the content column to the top), the five Cs (`PulseDock inline`, labelled, fixed order) filling the space between logo and the right cluster with `justify-content: space-evenly` and 24 side padding, Home icon (house 22 in a 44 square, unlabelled, `aria-label="Home"`, `--ink` active, `--ink-3` otherwise, `--bg-sunken` on hover) directly left of the bell, bell, `Avatar` 36. No composer pill in the header and no second row: the pill lives in the Feed column (section 3.0).
- Home is neutral: never a C colour, never a glyph.

Five-C nav: `PulseDock`, one slot per C in fixed order, never collapsed. **Decision**: no `TabBar` or `CRow` component. Both are the existing `PulseDock` (dock variant on compact and medium, `inline` variant inside the header row on expanded; the standalone `bar` variant is no longer mounted). A second five-C renderer would be a second nav.

Inline slots are spread evenly across the header's middle. Slot treatment (ruling 100): no chip or circle behind the glyph. The Adinkra glyph is a `currentColor` mask (26 in the dock, 20 inline) floating in the bar, label 12/500 beneath (15/500 beside, inline). Active: glyph in the C's brand rung `--c-{c}`, label in `--c-{c}-text`, inline adds a 2px underline in the brand rung. Hover (pointer only): glyph and label lift to `--ink-2` with a 1px upward translate over `--dur-fast`; no background fill. Inactive: `--ink-3`. Pulse dot 8px at the glyph's top right, unchanged.

- Compact: dock, 64 plus safe area, fixed bottom, glass. Content padding-bottom 112.
- Medium: same dock, 120 horizontal padding so the five slots stay 44 to 120 wide. Content padding-bottom 96. Medium is derived from compact by rule (ruling 58): same header, same dock, content column capped at 680 and centred.
- Expanded: inline in the header row (section 1), 44 tall slots, 12 horizontal padding per slot.
- `active` is null on Feed and `/posts/:id` (Home is not a C). Pulse states are the dot signals from ruling 4; the prototype seeds `connect: activity`, `convene: for-you` for the demo member and nothing for a fresh account (no row, no dot).
- Tapping a C sets the route. The five engines are unbuilt, so a C route renders `EmptyState c={c}` "{C} is next." with a secondary "Back to Feed" button. Ships with the shell so every route has real chrome (ruling 69).

Hover-intent prefetch (ruling 84): at expanded tier, `mouseenter` held 80ms on a five-C slot, the Home item, a Read more link, or a rail suggestion prefetches the route's data. Not visible; build-time behaviour.

## 2. Expanded canvas (ruling 79)

`max-width: 1440`, centred, `padding: 0 32px`, CSS grid, 24 gap, height = viewport minus the 64 header, `align-items: stretch`.

Independent scroll (ruling 104): the canvas itself does not scroll. Each region (left rail, content, right rail) is its own scroll container (`overflow-y: auto; min-height: 0`) with `padding: 24px 0 48px`; scrolling one never moves another. Scrollbars sit at each column's edge inside the 24 gap.

- Three regions: left rail 260, content `minmax(680px, 760px)`, right rail 320.
- Collapse order: at 1024 to 1439 the right rail is not rendered and content may grow to 760 (the prototype's 1280 frame shows this: 260 + 24 + 760 = 1044, centred). At 1440 and above all three render, content grows to 760 (the max of ruling 79's 680–760) and neither rail grows; above 1440 the canvas is centred and nothing changes. Rails exist only above 1024; medium tier has no rail, per ruling 58 (ruling 86 strikes the icon-only left rail clause from ruling 79).
- Both rails are context, never navigation: nothing in them changes the route except a deliberate open (section 2.2).

### 2.1 Left rail: the member's quick state

Three `RailWidget`s, 24 apart, in order: Coming up, Your Spaces, Saved. Each is a caps 13 title in `--ink-3` and rows separated by 1px `--line`; row text 15/500 with a 13 `--ink-3` second line (time and place; C name in the C colour for Saved).

Empty (what a real member sees at launch, no engine writes these rows yet): every widget renders its one honest line in `--ink-2` 15: "Nothing coming up. Events you join appear here." / "No Spaces yet. Start one or join one." / "Nothing saved. Use the bookmark on any post." No zeros, no ghosts.

Populated (prototype demo): one upcoming event, two Spaces (`Avatar` 28, radius 6), saved posts (title or first line of body; click opens the quick-look).

### 2.2 Right rail: DIA suggests

One `RailWidget` "DIA suggests", scoped to the current surface (Feed here). Row: `CBadge` 32 in the suggestion's C, title 15/500, one-line why in `--ink-3`. Click previews inline: the row expands a 10-radius `--surface` panel with the body and one secondary `Button` in the C ("Open in Convene"). Only that button navigates (ruling 84). Click again collapses.

Empty: "DIA has nothing to suggest yet. Suggestions start once there is activity in your Feed." DIA never fabricates a suggestion (grounded-or-empty).

## 3. Feed (rulings 80, 81, 83)

Route `/feed`, Home. Content column, 12 gap: on expanded, composer pill, daily greeting, then `LensBar` and the list; on compact and medium, `LensBar` then the list (the pill is in the header).

### 3.0 Composer pill and greeting, expanded only (ruling 104)

Composer entry: the Lens Bar track's shape, not a pill (44 tall, `--bg-sunken`, `--radius-m`, pen-line 16, "What is going on with you?" in `--ink-3`, 14 side padding), full column width, opens the composer. The header entry on compact and medium is the same row. Greeting beneath: display serif 26 "Good {morning|afternoon|evening}, {first name}." and a 13 `--ink-3` date line ("Sat 6 Sep"), both real (clock and member record), padding 8 0 4.

Sticky rule: the LensBar is always `position: sticky; top: 0` on `--bg` (12 bottom padding, -12 margin) so the list scrolls under it and is never seen above it. The content column has no top padding of its own; the pill wrapper carries the 24 top padding so that when pinned its ground covers the column top edge to edge (nothing shows above or beside the pill). The pill scrolls with the column until the greeting has fully left the column's own viewport (IntersectionObserver, root = the content column, threshold 0); from then on the pill wrapper is `position: sticky; top: 0` with 24 top and 12 bottom padding (80 tall) and the LensBar wrapper (12 padding top and bottom, -12 margins, plus a 12px solid `--bg` cap above it via `box-shadow: 0 -12px 0 var(--bg)`) pins at top 80, so the two meet into one solid block with no seam: the list can never show through between or beside them. The descriptor collapses at the same moment. When the greeting re-enters, the pill returns to flow and the LensBar's top returns to 0.

Query: `posts` where `audience = 'everyone'`, or `connections` and a connection exists, or `anchored` and the viewer is a member of the anchor; `order by created_at desc`. No ranking fields, no relevance scoring.

`LensBar` (Strand; Brief 2 adds `icon` per lens and `scope`):

| id | Label | Render | Predicate | Scope line |
|---|---|---|---|---|
| all | All | icon globe, default | none | Everything you can see, newest first. |
| for-you | For You | icon circle-dot | none until a real signal exists | Same as All until DIA has a real signal to work from. |
| network | My Network | icon users | author is a connection | Posts from your connections, newest first. |
| mine | Mine | icon pen-line | author is the viewer | Your own posts. |
| saved | Saved | icon bookmark | saved row exists | Posts you saved. |

Full component spec: `shell/LENS_BAR_SPEC.md`. In short: a bounded `--bg-sunken` track, `--radius-m`, 44 tall; the active lens is a content-sized `--surface` chip (`--radius-badge`, `--shadow-1`) moved by transform and width; inactive lenses are bare icons sharing the remaining width (icon plus label at expanded). Descriptor sans italic 12 below the track; collapses on scroll down, latched, and the active lens tap brings it back. Disabled lenses keep their seat (dashed). Light haptic on accepted taps. `title` carries the label. Accessible name (ruling 102) folds label and descriptor for every lens: `aria-label="My Network: Posts from your connections, newest first."`. Scope line: 13 italic `--ink-3`, `aria-live="polite"`, directly beneath the pill. Selecting a lens never moves the bar; the list changes beneath it and starts at the top (the scroller is set to the bar's anchor when the bar is pinned or in the header). Selected lens lives in `?lens=` (omitted for `all`); each selection is a `pushState` so it is a real history entry and survives refresh and back; the prototype mirrors it in the URL bar and localStorage.

Ruling 102 check on the shipped LensBar: icons are unique (circle-dot, users, pen-line, bookmark; All is the text default); every lens has a real empty state (states list below); no vertical, labelled, or count-carrying variant exists or is added.

Card: the one `PostCard` with `feed` (section 5). Reverse chronological. Gap 12.

States:

- Populated: cards.
- Loading: three ghost cards (`--surface`, 1px `--line`, 14 radius, `--bg-sunken` blocks), `role="status"` "Loading Feed". No shimmer, no spinner.
- Empty, fresh account, All or For You: `EmptyState c="brand"` "Welcome to DNA, Amara." body "Feed fills as members post and as you connect. Start with what is going on with you." action `Button c="convey"` "Share a Story" (opens the composer on Convey; untyped posts are general Convey, ruling 68).
- Empty, My Network: `EmptyState c="connect"` "Nobody in your network yet." action "Make an Intro" in Connect.
- Empty, Mine: `EmptyState c="convey"` "You have not posted yet." action "Share a Story".
- Empty, Saved: `EmptyState c="brand"` "Nothing saved yet." no action.
- No fabricated cards, counts, or "be the first" copy anywhere.

Publishing from the composer prepends the post, returns to `/feed?lens=all`, and shows the Toast "Published. It is in the Feed." for 2.6s.

## 4. Read more, in place (ruling 105, amends 85)

`PostOverlay` is removed. "Read more", the title, or the body expands that same card in the list: `PostCard` gets `expanded` and `onCollapse`; the body unclamps (height grows, no animation beyond the height change), the link becomes "Show less" (`aria-expanded`), and collapsing returns the card to the 4-line clamp. Same component, same instance; no second card renders and nothing else in the list moves except to make room.

Route: opening sets `/posts/:id` with `pushState`; "Show less" or the back button pops it and returns to `/feed` (with the lens param) at the same `scrollTop`. One card expanded at a time; opening another collapses the first.

Direct link: arriving at `/posts/:id` with no Feed in history renders the same `PostCard` (`feed`, `expanded`, no `onCollapse`) as ordinary page content in the content column, under a 44 row of `IconButton arrow-left` plus "Back to Feed" 15/500. Rails render as usual on expanded. No scrim, no dialog. Nothing else renders (no comments, no related posts).

## 5. PostCard, Feed anatomy (ruling 69)

Strand's `PostCard` gains `feed`, `onMenu`, `onReadMore`, `reacted`, `onReact`. Without `feed` the card is byte-identical to Brief 1 (the composer preview keeps rendering it). With `feed`:

1. Author row: `Avatar` 40 (radius 6 when a Space), name 15/700, meta line 13 in the C colour ("Lagos, WAT · Fri 5 Sep, 08:10", "In {anchor}"), `CBadge` 32, overflow `IconButton ellipsis` 36 ("More").
2. Kicker 13 caps in the C colour, title 22 display serif.
3. Body 17/1.5, clamped to 4 lines when `onReadMore` is set, then an explicit "Read more" link (15/500, `--ink`, underline `--line-strong`, 44 hit height).
4. Media (`MediaBlock`), link unfurl, structured fields, the post's own act `Button` in its C (rule 3, "Get a ticket", "Offer to help").
5. Divider 1px `--line`, then four icon-only `IconButton`s, 44: React (heart, a single act with no count, active when the viewer has reacted, ruling 72), Respond (message-circle), spacer, Save (bookmark, active when saved), Share. No counts, no labels, no fifth action, no cross-C conditional logic in the card (v1 review correction). Intro-from-a-post is deferred to Connect's brief.

Untyped posts are general Convey (ruling 68): plum frame, body only, no kicker, no title.

v3 props: `expanded` (unclamps the body), `onCollapse` (renders "Show less"). See section 4.

## 6. Notifications (ruling 82)

Table `notifications` per the brief: `id, recipient_member_id, kind enum(connection_accepted, attestation_received, space_role_approved, event_reminder), actor_kind, actor_id, object_kind, object_id, read_at nullable, created_at`. In-app record only; no email or push.

`NotificationBell`: `IconButton bell` 44 with an 8px `--pulse-for-you` dot (2px `--bg` ring) at top right when any row has `read_at is null`. Never a numeral. No row, no dot: a fresh account has no dot regardless of settings. `aria-label` "Notifications, unread" or "Notifications"; `aria-expanded` mirrors the list.

List (no route of its own; the URL bar keeps the host route):

- Compact and medium: full panel in `--bg` under the status bar, header "Notifications" 17/500 with a close `IconButton`, rows beneath.
- Expanded: popover 380 wide, max 560 tall, top 60 right 32, `--surface`, 1px `--line`, 14 radius, `--shadow-stack`; an invisible full-frame button behind it closes on outside click. Esc closes.

`NotificationListItem`: `CBadge` 32 in the writing engine's C (connection_accepted Connect, attestation_received Contribute, space_role_approved Collaborate, event_reminder Convene; this is inside the five-C ecosystem, ruling 66), text 15 (names 700; 500 weight while unread), time 13 `--ink-3`, 8px `--pulse-for-you` dot at right while unread. Row min 56, padding 12 16, `--bg-sunken` on hover. Tap marks read (`read_at = now()`); navigation to the object belongs to the engine that wrote the row.

Copy by kind: "{actor} accepted your intro." / "{actor} attested your contribution to {object}." / "You are now {role} in {space}." / "{event} starts {Thu 16 Oct, 19:00}."

Empty: `EmptyState c="brand"` "Nothing yet." body "When a member accepts your intro, attests a contribution, approves your Space role, or an event you joined is near, it appears here." This is the launch state; the populated list is prototype demonstration only.

## 7. Composer mount

One mount point, the shell. The header pill and every empty-state act open the Brief 1 `Composer` with the frame's tier and mode (`contained` in the prototype only). No second composer entry anywhere in Feed.

### 7.1 Drawer geometry (ruling 106, locks the AppDrawer brief)

One drawer, mounted once at the app root; the composer is only content and renders no chrome of its own (no header, close, scrim or sliding container). The drawer owns anchor edge, handedness mirror, slide and easing, scrim (`--scrim`, translucent), swipe to dismiss, header row, back button, focus trap and restore, Escape, Android back, safe areas, the single scroll region, scroll memory and reduced motion. Open state is a URL (`?drawer=composer`), never a boolean; browser back closes it.

- Compact (< 640): bottom anchor, 80% of the viewport height (`80dvh`), top corners 14, drag handle; the top 20% of the page stays visible behind the translucent scrim.
- Medium (640 to 1024): right anchor, 65% of the viewport width, full height, 1px `--line` on the left edge, translucent scrim over the rest. Left-handed members get the same panel mirrored to the left edge.
- Expanded (> 1024): right anchor as shipped, capped at 860 (`drawer-wide`; a 448 column is not a composing surface).

Inside, in fixed order: verb rail, textarea (first, autofocused), DIA line, link preview, verb fields, then the sticky action bar with safe-area padding. The surface never declares its own overflow.

## 8. Frames, themes, tiers (ruling 67)

The page shows Compact 390 × 844 (status bar, dock, home indicator, `--safe-top` 47, `--safe-bottom` 34), Medium 820 × 1000 (dock), and Expanded 1280 × 860 (bar and canvas) side by side, labelled "DNA {tier} view · {width} · {scale}x", each with a URL bar showing the real route. The Review row switches theme, demo member or fresh account, expanded width 1280 or 1440 (to show the right-rail collapse rule), opens an expanded post, the direct-link view, Notifications, or the Composer in all three frames at once, and toggles Feed loading and unread notifications. Every token is read from Strand; dark is `[data-theme="dark"]` on the frame (ruling 57).

Exit check for the build: the deployed URL against this prototype at 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536, both themes, Safari and Chrome. Specifically: 1024 to 1439 no right rail; 1440 and above three regions with content at 760; dock never wider than the frame; collapsing a card restores `scrollTop` exactly; the three expanded columns scroll independently; the pill pins only after the greeting has left the column; a lens change from the pinned bar keeps the bar in place and starts the new list directly beneath it.

## 9. Motion

Popover fades or translates 24px over `--dur-base` with `--ease`; dock dot fades over `--dur-base`; dock hover colour and 1px lift, lens selection background, and Home hover fill over `--dur-fast`. Card expansion is an immediate height change. No bounces, no scale.

## 10. Not in this brief

Feed ranking beyond reverse-chron, notification delivery channels, rail content for Connect, Convene, Collaborate, Contribute, System Admin, User Settings, comments or related posts inside the quick-look.

## 11. Prototype-only

`composer/dia-mock.js`, localStorage keys `dna.app.shell.{theme,route,lens}`, demo data in the page's logic class, the `contained` prop on Composer, the Review row's "Direct link" state, and the staged components in `shell/strand-patch/` until Strand lands them.
