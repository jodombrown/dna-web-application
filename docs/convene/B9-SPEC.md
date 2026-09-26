# B9-SPEC: the Discovery Dashboard (Convene)

Handoff spec for Claude Code. **Revision 4, 25 Sep 2026 (Session 33), written by Chat against the tree** under rulings 1124 to 1140. Revision 4 corrects four places Revision 3 left stale after correction 28 was ratified (1134) and split from 30 (1135): the compile Code reads, the pane note, the going slot and the Strand section; it changes no ruled behaviour. Revision 3 changed five places in Revision 2 (`docs/convene/B9-SPEC.md` at `d23c55f` was its base) and nothing else: the event route (1137), the pane's height (1136), the going sentence (1138), and what Share and Copy link hand over in the pane's toolbar and the card's menu (1140). It replaces the 23 Sep text and Design's 25 Sep rewrite, which is withdrawn (1132). The register governs this spec; a line here overrides a ruling only where the ruling that amends it is named (1126). The repo copy is authoritative on conflict (762, 763). Strand tokens only (604). No count, badge or number anywhere (rule 6).

The drawn reference is `convene/B9-Discovery-Dashboard-v5.dc.html` in the app Design project. Its frames bind Strand correction 24, `v1790160131064912` (262,888 bytes, sha256 `18cc0e4e6701df615602049d117bac5cd34c43f76795a1c0ee6e0dd64cd0f1e3`, read by the app project on 25 Sep), which predates corrections 25 to 27. Every part is read from the tree's compile, `v1790366257373061` (correction 28, 1134), and never measured off the frames (924). The app project rebinds once, after Chat ratifies correction 30.

The event page is Brief 10's; this surface mounts it in the pane (1071) and does not define its content. v5's event page content model and layout (1124) are built in the second handoff, after Brief 10 Revision 4 reconciles them with Brief 10 (1131). Report stays off the card until its table and sheet exist (1129).

## Routes
- `/convene` Discovery; `/convene/{lens}` a lens (1093). Facets in the query: `format, price, when, family, home, rung, place, q` (1095, 1110; `q` restored by 1124).
- `/convene/online` redirects to `format=online` with the rest of the query kept (1122). `/convene/soon` and `/convene/near` redirect as built.
- `/convene/events/{id}` the event page (Brief 10), addressed by the event's id (1137). At expanded, opened from a card, it renders in the pane beside the list (1063); a cold load of the address renders the page (607). The readable address is the public one under `/e/`: slug from the title, editable in the hub with live preview, short suffix only on collision, old slugs redirect permanently; `/e/{alias}` and `/x/{code}` resolve through `resolve_event_link` (1100, 1080, 1081, 1108, 1109).
- OG preview (1100, 1113): cover at 1.91:1, title, one line "Thu 24 Sep · Online · Nubuke Foundation", wordmark. No counts.

## Tiers and layout (583; 1082 as amended by 1094, 1123, 1127)
- Compact under `--tier-medium`: AppHeader compact; lens bar, icon and word, in a row that scrolls sideways (root `width:max-content`), moves into the header after 72px scroll; the search field full width under the lens bar (1124); one row of homes (button to profile homes, 633) and the Filters trigger; applied chips and Clear all only when a facet or a search is set; lanes with 16 gutter and `scroll-padding-inline:16`, snap proximity; PulseDock. Filters open as Sheet (584).
- Medium: lens row with the search field taking the width left beside the bar, 140 to 280 (1124); canvas grid `[rail] minmax(0,1fr)`, rail 240 open or 64 collapsed, gap 24, padding 0 32 64; each column its own vertical scroller; the page does not scroll.
- Expanded: lens row centred with the scope line and the search field (1124); canvas with no maximum width, padding 24 at top and foot and `padding-inline: 5vw`, with the header's content (logo, the five Cs, the right-hand controls) on the same two edges (1123); grid `280px|64px minmax(0,1fr)`. No right rail on Discovery (1094). Rail collapsed by default at every width, remembered per member per band in `member_rail_state`, written only by the member's own toggle (1094, 1111).
- Pane open, expanded only (688, 1063 to 1068, 1083, 1127): grid `minmax(0,1fr) 520px`, the pane 520 at the right and the list taking the rest, gap `--pane-gap`, height = the feed column's own height less the 16 that starts the pane level with the rail (1136); list column and pane body scroll separately; the header row moves into the list column so rail, list and pane start level; FacetRail collapsed to its strip; the list follows `selectedKey` vertically and within the lane. Toolbar: Hide or show the list, Copy link, Share; Copy link and Share hand over the event's public address under `/e/`, as the event page builds it, never `/posts/{id}` (1140). Pane's cluster: Previous event, Next event, Back to Discovery; edge items `aria-disabled` in place; ArrowLeft and ArrowRight while focus is in the pane. Hide list → `0 minmax(0,720px)` centred. The 520 pane, the toolbar and Hide list are Pane's `paneWidth`, `height`, toolbar handlers and `listHidden` from correction 28 (1127, 1134).

## Search (1124, reopening 661)
One Input, `aria-label` "Search events", placeholder "Search events, hosts, places". Enter applies the text as the `q` facet and shows it as an applied chip; Escape clears the draft. Matches title, presenter, host, place, city and topic, case-insensitive, on the server: `convene_discovery` takes the text and narrows the corpus before lanes form, so floors apply to the narrowed corpus. Lanes re-render over the narrowed corpus and a lane below its floor drops. No result count, no suggestion list at launch.

## Lens bar (693, 1093, 1125)
LensBar, `labels="always" icons` at every tier. Lenses from the runtime table: all (All), follow (Communities), taste (For you), curated (Curated), network (My network). A lens says who the events come from; a facet says what the event is. Any lens but All renders that section as a grid of the same card, `repeat(auto-fill, minmax(var(--lane-card-width),1fr))`, gap 12, filling the column (1125). No tile and no second card (578).

## Filters (586, 687, 1060, 1095, 1110)
Heading "Filters"; heading row pinned (title, Clear all when any is set, collapse control in the G72 slot); axes scroll beneath. Axes in order: Format (Segment: Any, In person, Online, Hybrid; single-choice, 1122); Price (Any, Free, Paid); When (Any, Next two weeks, This month, Later); Topics (checklist, two columns at 150 and up); Home (one Select per home: Any distance, In {city}, Around {city}, {region}, {country}, Anywhere; ladders per 1060); Place (field "Anywhere in the world", suggestions only from places with an event, labelled City, Country or Region; chips). Value `{ axis: [ids] }`, resolve and return, no apply button, no count on any option. With a Place city set, Near your homes reads "While you are in {city}" and holds that place's in-person and hybrid events.

## Lanes (631 as amended by 1092 and 1124; 632, 633)
Base order, from `convene_lanes`: Happening soon, This weekend, Join from anywhere, Browse, Filling up, New this week, Curated by Convene, From communities you follow, Because of what you follow, Near your homes, Connected to your network. Browse and Filling up are new rows in the table, not literals (1124).

Floors (a lane renders only at or above): soon 4, weekend 2, online 2, browse 1, filling 2, fresh 2, curated 1, follow 1 (one sentence while following none), taste 2, near 2, network 1.

- **Learned order (1124, reversing 1091).** A lane the member acted in during the last seven days (opened a card from it, saved from it, followed from it) moves up, most recent first; the base order holds beneath. Nothing hides. Stored per member on the server, written by those acts, never on load and never by the pane. Reordering is not animated.
- **Browse (1124, reversing 1089).** Two rows of Strand's Browse tile (1133): topics, each tile carrying the next date in that topic; then places with an event in them, each tile carrying its country. A tap applies the Topics or Place facet; the selected tile takes the Convene frame. No count on a tile. No See all.
- **Filling up (1124, reversing 1090).** Events with five or more going, ranked by RSVP momentum over the last 72 hours (going registrations created in the window); the rank is never shown. The card's last row carries the going names under 1128. No See all.
- **Near your homes** ranks the member's homes in profile order and never filters.
- **See all:** Happening soon applies `when`; relationship lanes switch lens; This weekend (1112), Join from anywhere (1122), Browse and Filling up carry none.
- Each lane: h2 display 22, a row of cards at `--lane-card-width` (320, 1087), gap 12, that scrolls sideways. Dismissals per lane (581) through `dismiss_discovery_item`.

## Card (PostCard presentation="discovery"; 1076 to 1079, 1087, 1096, 1097, 1121, 1124, 1128, 1129)
Width 320; 1.5px `--c-convene` frame, radius 14, padding 16, gap 8; one fixed height. Media 16:9 always; CBadge 48 on `--bg-sunken` when the event has none. Title row: h3 display 22/1.25, two lines clamped (height 55), one IconButton `ellipsis` (44 touch, 36 pointer). Two lines at 22: when, in the member's zone first then the event's local time (1099); where as "In person · Accra", "Online", "Hybrid · Accra and London". Row 36: Avatar 24, presenter from `public.event_presenters` (1121; button to profile), topic Chip (tap narrows to the topic; absent without a topic, row height held). Selected ring `0 0 0 2px --bg, 0 0 0 4px --ink`. The whole face is the link; hover underlines the title in `--line-strong`.

**Last row, 28 behind a rule, height held:**
- On relationship lanes (Communities, For you, Curated, My network): the reason in words, as built (1096).
- Elsewhere: the names going (1124), only when five or more are going, each name within that attendee's own RSVP visibility as `event_page` resolves it (508, 645, 680, 1128): first names only, up to three, then "and others are going" (1138). Below five, or with fewer than three names visible to the viewer, the row is empty. Real names only, never a count. The names come from one server read beside `event_presenters`; no name lookup in TypeScript. The face's `going` slot is correction 28's (1134).

**Menu (1097), portal to the frame root, min 240, radius 10, `--shadow-3`:** Share and Copy link (the event's public address under `/e/`, 1140), Save or Saved, Add to calendar (only once going), rule, Follow or Following {presenter}, Subscribe or Subscribed to {topic} (absent without a topic), rule, Not this with "Fewer like this in your lanes". **No Report until its table and sheet exist (1129).** Items absent when they do not apply, never disabled.

## States
Loading: three card skeletons at 320. Error: alert with Try again. Empty lens: EmptyState, Back to All. Following none: the one sentence in From communities you follow. Search with no match: lanes drop; if every lane drops, EmptyState "Nothing matches that search." with Clear all. Both themes through tokens only.

## Motion
`--dur-default`, `--dur-slow`, `--ease`. Pane per Strand. Lane appear: translateY 8 and fade. Learned reorder: none. No bounces.

## Edge cases
Titles past two lines clamp. Online: no place line beyond "Online". Hybrid in two cities: "Accra and London". Zone conversion across midnight is Code's. My events is not on Discovery; it is the Pulse bar's Convene seat (69).

## Strand (663)
Built and in the tree at `v1790279130697923` (corrections 25 to 27): PostCard's discovery face with the reason row and the Menu; Menu; FacetRail displays (Segment, checklist, Select ladder, Place combobox) with the pinned heading and Sheet at compact; Input combobox; LensBar labels at every tier; MediaBlock's `ratio`.

Built in correction 28 at `v1790366257373061` (1134): the discovery face's link, clamp span, geometry, `going` slot and `onReport` slot; Pane's reading width, height, toolbar and hidden list; FacetRail's two-column checklist and heading-row Clear all; Menu at 240; MediaBlock's one-cell ratioed image; the `flag` and `panel-left-open` icons.

Owed by correction 30 (1135): the Browse tile (1133); for the second handoff, MediaBlock's group-of-four strip and five-slide carousel, BodyBlocks and the Person card.

## Schema (1131)
Each written by Chat, dry-run on the canonical project, committed by Code before the apply (225, 963):
1. `convene_lanes` gains `browse` and `filling` at their positions.
2. `convene_discovery` takes `p_q` and answers the Browse and Filling up lanes and the learned order.
3. A per-member lane-activity table with explicit RLS, the member's own rows only, written by the three acts named above.
4. A batch read of the going names beside `event_presenters`, resolving visibility exactly as `event_page` does, authenticated only.

## Exit check
Deployed URL at 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536; both themes; Safari and Chrome; pane open at 1280, 1440 and 1600; a lens grid at 1280 and 1920; a search with matches and with none; Filling up and the going row read against the database (627).
