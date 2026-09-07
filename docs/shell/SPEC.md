<!-- Copy of the approved B2-Shell-Feed-v2 handoff spec (Claude Design extraction, D189). The build on this branch is reconciled against it; the prototype page and Strand bundle are the visual contract, the brief is the behavior contract. -->

# DNA Brief 2 — App Shell, Feed, Minimum Notifications — Handoff spec

Generated from the prototype. Live page: `shell/B2-Shell-Feed-v2.dc.html` in the app project (app.diasporanetwork.africa). Source components and tokens live in Strand and sync here as `_ds/`; the Brief 2 components landed in Strand and are consumed from the bundle. Claude Code builds from this file, the brief, and CLAUDE.md. Rulings referenced are D103 onward (ruling N = D(102+N)).

Status: v2, awaiting founder approval on the prototype (gate 3). v1 review: everything approved as built except the card actions, corrected here; ruling 86 recorded. Sections marked **assumption** are routine calls made in design; overturn by ruling.

## 1. Shell (ruling 69)

Mounted once at the app root. No surface composes its own header or nav. Client-side route transitions only (ruling 84); the shell never remounts between `/feed`, `/posts/:id`, and the five C routes.

Header: `AppHeader`.

- Compact (< 640) and medium (640 to 1024), touch: `variant="compact"`, 56 tall, 1px `--line` beneath. Logo (24 tall, is Home, `aria-current="page"` on Feed), composer pill (flex 1, 44 tall, `--bg-sunken`, pill radius, pen-line 16 plus "What is going on with you?" in `--ink-3`), `NotificationBell`, `Avatar` 32 in a 44 hit area. Gutters 16 left, 8 right.
- Expanded (> 1024), pointer: `variant="expanded"`, 64 tall, no rule (the five-C row carries it). Logo 28, labelled Home item (15/500, `--ink` with 2px ink underline when active, `--ink-3` otherwise, `--bg-sunken` on hover), spacer, composer pill 320 wide, bell, `Avatar` 36. Gutters 32.
- Home is neutral: never a C colour, never a glyph.

Five-C nav: `PulseDock`, one slot per C in fixed order, never collapsed. **Decision**: no `TabBar` or `CRow` component. Both are the existing `PulseDock` (dock variant on compact and medium, `bar` variant on expanded). A second five-C renderer would be a second nav.

- Compact: dock, 64 plus safe area, fixed bottom, glass. Content padding-bottom 112.
- Medium: same dock, 120 horizontal padding so the five slots stay 44 to 120 wide. Content padding-bottom 96. Medium is derived from compact by rule (ruling 58): same header, same dock, content column capped at 680 and centred.
- Expanded: bar, 56 tall, directly under the header, 24 horizontal padding, 1px `--line` beneath.
- `active` is null on Feed and `/posts/:id` (Home is not a C). Pulse states are the dot signals from ruling 4; the prototype seeds `connect: activity`, `convene: for-you` for the demo member and nothing for a fresh account (no row, no dot).
- Tapping a C sets the route. The five engines are unbuilt, so a C route renders `EmptyState c={c}` "{C} is next." with a secondary "Back to Feed" button. Ships with the shell so every route has real chrome (ruling 69).

Hover-intent prefetch (ruling 84): at expanded tier, `mouseenter` held 80ms on a five-C slot, the Home item, a Read more link, or a rail suggestion prefetches the route's data. Not visible; build-time behaviour.

## 2. Expanded canvas (ruling 79)

`max-width: 1440`, centred, `padding: 24px 32px 48px`, CSS grid, 24 gap.

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

Route `/feed`, Home. Content column: `LensBar` then the list, 12 gap.

Query: `posts` where `audience = 'everyone'`, or `connections` and a connection exists, or `anchored` and the viewer is a member of the anchor; `order by created_at desc`. No ranking fields, no relevance scoring.

`LensBar` (Strand; Brief 2 adds `icon` per lens and `scope`):

| id | Label | Render | Predicate | Scope line |
|---|---|---|---|---|
| all | All | text segment, default | none | Everything you can see, newest first. |
| for-you | For You | icon circle-dot | none until a real signal exists | Same as All until DIA has a real signal to work from. |
| network | My Network | icon users | author is a connection | Posts from your connections, newest first. |
| mine | Mine | icon pen-line | author is the viewer | Your own posts. |
| saved | Saved | icon bookmark | saved row exists | Posts you saved. |

Icon lenses are 44 wide, icon 20, `aria-label` and `title` carry the label. Scope line: 13 italic `--ink-3`, `aria-live="polite"`, directly beneath the pill. Selected lens lives in `?lens=` (omitted for `all`) so it survives refresh and back; the prototype mirrors it in the URL bar and localStorage.

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

## 4. Post quick-look (ruling 85)

"Read more", the title, or the body opens `PostOverlay` at `/posts/:id` over the current surface. It is a sibling layer, not a route swap: the Feed scroller keeps its `scrollTop`, so dismiss returns to exactly the same place. Esc, scrim, back arrow, and close all dismiss. History: `pushState` on open, `popState` dismisses (back button returns to Feed at the same scroll).

- Compact and medium (touch): full panel in `--bg`, slides in 24px over `--dur-base`. Row: `IconButton arrow-left` "Back" plus "Post" 15/500, 56 tall under the status bar, 1px `--line`. Content column max 680, padding 12 16 48.
- Expanded (pointer): `--scrim`, centred 680 column, 40 top offset, fades in. A small `--surface` bar (14 radius, 1px `--line`, `--shadow-stack`) carries "Post" and the close `IconButton`; the card sits 8 beneath.
- Inside: the same `PostCard` with `feed` and no `onReadMore`, so the body is unclamped. Nothing else renders (no comments, no related posts; those belong to Convey's brief).

## 5. PostCard, Feed anatomy (ruling 69)

Strand's `PostCard` gains `feed`, `onMenu`, `onReadMore`, `reacted`, `onReact`. Without `feed` the card is byte-identical to Brief 1 (the composer preview keeps rendering it). With `feed`:

1. Author row: `Avatar` 40 (radius 6 when a Space), name 15/700, meta line 13 in the C colour ("Lagos, WAT · Fri 5 Sep, 08:10", "In {anchor}"), `CBadge` 32, overflow `IconButton ellipsis` 36 ("More").
2. Kicker 13 caps in the C colour, title 22 display serif.
3. Body 17/1.5, clamped to 4 lines when `onReadMore` is set, then an explicit "Read more" link (15/500, `--ink`, underline `--line-strong`, 44 hit height).
4. Media (`MediaBlock`), link unfurl, structured fields, the post's own act `Button` in its C (rule 3, "Get a ticket", "Offer to help").
5. Divider 1px `--line`, then four icon-only `IconButton`s, 44: React (heart, a single act with no count, active when the viewer has reacted, ruling 72), Respond (message-circle), spacer, Save (bookmark, active when saved), Share. No counts, no labels, no fifth action, no cross-C conditional logic in the card (v1 review correction). Intro-from-a-post is deferred to Connect's brief.

Untyped posts are general Convey (ruling 68): plum frame, body only, no kicker, no title.

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

## 8. Frames, themes, tiers (ruling 67)

The page shows Compact 390 × 844 (status bar, dock, home indicator, `--safe-top` 47, `--safe-bottom` 34), Medium 820 × 1000 (dock), and Expanded 1280 × 860 (bar and canvas) side by side, labelled "DNA {tier} view · {width} · {scale}x", each with a URL bar showing the real route. The Review row switches theme, demo member or fresh account, expanded width 1280 or 1440 (to show the right-rail collapse rule), opens Quick-look, Notifications, or the Composer in all three frames at once, and toggles Feed loading and unread notifications. Every token is read from Strand; dark is `[data-theme="dark"]` on the frame (ruling 57).

Exit check for the build: the deployed URL against this prototype at 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536, both themes, Safari and Chrome. Specifically: 1024 to 1439 no right rail; 1440 and above three regions with content at 760; dock never wider than the frame; overlay dismiss restores `scrollTop` exactly.

## 9. Motion

Overlay and popover fade or translate 24px over `--dur-base` with `--ease`; dock dot fades over `--dur-base`; lens selection background over `--dur-fast`. No bounces, no scale.

## 10. Not in this brief

Feed ranking beyond reverse-chron, notification delivery channels, rail content for Connect, Convene, Collaborate, Contribute, System Admin, User Settings, comments or related posts inside the quick-look.

## 11. Prototype-only

`composer/dia-mock.js`, localStorage keys `dna.app.shell.{theme,route,lens}`, demo data in the page's logic class, the `contained` prop on Composer and PostOverlay.
