# B9-SPEC: the Discovery Dashboard (Convene)

Handoff spec for Claude Code from `convene/B9-Discovery-Dashboard-v5.dc.html`, written 23 Sep 2026 from the ruled set only (Revision 6 ratified; rulings 1087 to 1102). Build after Strand correction 25 lands the parts named at the end; until then `b9-postcard-discovery.js` and `b9-filters.js` are Strand's reference, not Code's. Strand tokens only (604). No count, badge or number anywhere (rule 6). The event page is Brief 10's; this surface mounts it in the pane (1071) and does not define its content.

## Routes
- `/convene` Discovery; `/convene/{lens}` a lens (1093). Facets in the query: `format, price, window, family, home, place` (1095). No `q` (1088).
- `/convene/events/{slug}` the event page (Brief 10). At expanded, opened from a card, it renders in the pane beside the list (1063); a cold load of the address renders the page (607). Slug: from the title, editable in the hub with live preview, short suffix only on collision, old slugs redirect permanently; short form `/e/{slug}` (1100, 1080, 1081).
- OG preview (1100): cover at 1.91:1, title, one line "Thu 24 Sep · Online · Nubuke Foundation", wordmark. No counts.

## Tiers and layout (583; 1082 as amended by 1094)
- Compact under `--tier-medium`: AppHeader compact; lens bar, icon and word, in a row that scrolls sideways (root `width:max-content`), moves into the header after 72px scroll; one row of homes (button to profile homes, 633) and the Filters trigger; applied chips and Clear all only when a facet is set; lanes with 16 gutter and `scroll-padding-inline:16`, snap proximity; PulseDock. Filters open as Sheet (584).
- Medium: lens row; canvas grid `[rail] minmax(0,1fr)`, rail 240 open or 64 collapsed, gap 24, padding 0 32 64; each column its own vertical scroller; the page does not scroll.
- Expanded: lens row centred with the scope line; canvas max 1600, padding 24 32, grid `280px|64px minmax(0,1fr)`. No right rail on Discovery (1094). Rail collapsed by default at every width, remembered per member per width under `rail.l.{width}` (1094).
- Pane open, expanded only (688, 1063 to 1068, 1083): grid `minmax(0,1fr) 520px`, gap `--pane-gap`, height = frame − header − 88; list column and pane body scroll separately; the header row moves into the list column so rail, list and pane start level; FacetRail collapsed to its strip; the list follows `selectedKey` vertically and within the lane. Toolbar: Hide or show the list, Copy link, Share. Pane's cluster: Previous event, Next event, Back to Discovery; edge items `aria-disabled` in place; ArrowLeft and ArrowRight while focus is in the pane. Hide list → `0 minmax(0,720px)` centred.

## Lens bar (693, 1093)
LensBar, `labels="always" icons` at every tier. Lenses from the runtime table: all (All), follow (Communities), taste (For you), curated (Curated), network (My network). A lens says who the events come from. Any lens but All renders that section as a vertical list of the same card at 680.

## Filters (586, 687, 1060, 1095; FacetRail after correction 25)
Heading "Filters"; heading row pinned (title, Clear all when any is set, collapse control in the G72 slot); axes scroll beneath. Axes in order: Format (Segment: Any, In person, Online, Hybrid); Price (Any, Free, Paid); When (Any, Next two weeks, This month, Later); Topics (checklist, two columns at 150 and up); Home (one Select per home: Any distance, In {city}, Around {city}, {region}, {country}, Anywhere; ladders per 1060); Place (field "Anywhere in the world", suggestions only from places with an event, labelled City, Country or Region; chips). Value `{ axis: [ids] }`, resolve and return, no apply button, no count on any option. With a Place city set, Near your homes reads "While you are in {city}" and holds that place's in-person and hybrid events.

## Lanes (631 as amended by 1092; 632, 633)
Order, fixed: Happening soon, This weekend, Join from anywhere, New this week, Curated by Convene, From communities you follow, Because of what you follow, Near your homes, Connected to your network. Floors (a lane renders only at or above): soon 4, weekend 2, online 2, fresh 2, curated 1, follow 1 (one sentence while following none), taste 2, near 2, network 1. Near your homes ranks the member's homes in profile order and never filters. Each lane: h2 display 22, See all (soon, weekend, online apply the matching facet; relationship lanes switch lens), a row of cards at `--lane-card-width` (320, 1087) gap 12 that scrolls sideways. Dismissals per lane (581) under `dna.app.b9discover.dismissed.v2`.

## Card (PostCard presentation="discovery"; 1076 to 1079, 1087, 1096, 1097)
Width 320; 1.5px `--c-convene` frame, radius 14, padding 16, gap 8; one fixed height. Media 16:9 always; CBadge 48 on `--bg-sunken` when the event has none. Title row: h3 display 22/1.25, two lines clamped (height 55), one IconButton `ellipsis` (44 touch, 36 pointer). Two lines at 22: when, in the member's zone first then the event's local time (1099); where as "In person · Accra", "Online", "Hybrid · Accra and London". Row 36: Avatar 24, presenter (button → profile, Brief 3), topic Chip (tap narrows to the topic; absent without a topic, row height held). Last row 28 behind a rule: the reason text on relationship lanes ("Because you follow Kwame Mensah", "Curated by Amara Osei"); empty elsewhere, height held (1096; no going row). Selected ring `0 0 0 2px --bg, 0 0 0 4px --ink`. The whole face is the link; hover underlines the title in `--line-strong`.
Menu (1097), portal to the frame root, min 240, radius 10, `--shadow-3`: Share, Copy link, Save or Saved, Add to calendar (only once going), rule, Follow or Following {presenter}, Subscribe or Subscribed to {topic} (absent without a topic), rule, Not this with "Fewer like this in your lanes". No Report. Items absent when they do not apply, never disabled.

## States
Loading: three card skeletons at 320. Error: alert with Try again. Empty lens: EmptyState, Back to All. Following none: the one sentence in From communities you follow. Both themes through tokens only.

## Motion
`--dur-default`, `--dur-slow`, `--ease`. Pane per Strand. Lane appear: translateY 8 and fade. No bounces.

## Edge cases
Titles past two lines clamp (one fixture does at 320). Online: no place line beyond "Online". Hybrid in two cities: "Accra and London". Zone conversion across midnight is Code's. My events is not on Discovery; it is the Pulse bar's Convene seat (69).

## Strand correction 25, the parts Code reads from the system (663)
PostCard `presentation="discovery"` with the reason row and the menu; Menu part; FacetRail displays (Segment, checklist, Select ladder, Place combobox) with a pinned heading and Sheet at compact; Input combobox; LensBar labels at every tier.

## Exit check
Deployed URL against v5 at 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536; both themes; Safari and Chrome; pane open at 1280, 1440 and 1600.
