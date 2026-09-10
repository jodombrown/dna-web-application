# DNA Brief 3 — Member Profile — Handoff spec

Generated from the prototype. Live page: `profile/B3-Profile-v3.dc.html`. Route `/m/:handle`. Rulings 122 to 136; identity 46 to 48, 123; relationship 118 to 120. Review rulings 130 to 136 are cited inline where each applies: 130 public masthead and close, 131 local time, 132 masthead pattern, 133 mate masie is DIA-only, 134 condensing banner, 135 Attested on DNA, 136 one masthead for every view, Anchored audience, 960 public column.
Status: v3 (legacy vocabularies verbatim, Anchored audience defined, 960 public column, spec citations); ruling 275 correction applied without a version bump (ruling 171): core row per ruling 212, ProfileHeader props struck. New components staged in `profile/strand-patch/Profile.jsx` (IdentityMark, ProfileHeader, VisibilitySelect, SectionCard, VocabularyPicker, SegmentBlock, BadgeRow, LinkRow, PatternPicker, CCard, CSheetBody, AttestationRail); each lands in Strand as its own file under `components/dna/`, then the page switches to the bundle. Header, dock come from the shell's staged patches. The Strand handoff for every staged component is `STRAND-HANDOFF.md` at the project root.

### Strand exceptions carried by this page

Two departures from the Strand guide, approved in review, recorded here so Strand's HANDOFF carries them as guide amendments rather than local overrides:
1. Deck shadow on the five C cards (ruling 130). `CCard` uses `--shadow-2` at rest so the five cards float as a deck on the public close. The guide's rule ("no shadow by default; `--shadow-stack` only on stacked decks") gains this one case: the C deck on a public page head or close. Nothing else on the profile carries a shadow at rest; `AttestationRail` cards use `--shadow-1` inside the C sheet, which is already a stacked layer.
2. Editorial display pair and masthead hairline (ruling 130). The public masthead sets the headline in `--font-display` italic (17 to 20) under the display name, and a 48 by 1 `--ink-3` rule separates the pair from the sans meta. The guide says the serif never appears in metadata; the headline is not metadata, but the italic display pair and the hairline are new to Strand and land as the "editorial masthead" pattern on `ProfileHeader`.

## 0. What the page shows

Three frames per ruling 67 (Compact 390, Medium 820, Expanded 1280), both themes, touch (compact, medium) and pointer (expanded). Review row: Theme, Viewer (Owner, Owner editing, Visitor, Public), Record (Populated, Empty), Segment (Returnee, Anchor, Ally, Still Exploring), Relationship (None, Following, Request sent, Request received, Connected), Shares an anchor (ruling 136; on by default so Anchored sections render for the visitor), Loading. The owner's Private profile and Share my profile switches are on the page itself; the review row also carries a "Share my profile on" checkbox (on by default for review) so the Public view shows the profile rather than the gate.

### 0.1 Three views (ruling 127)

- Owner: everything, editable.
- Visitor (signed-in member): core row, relationship actions, sections whose audience admits them.
- Public (signed out, opening `app.diasporanetwork.africa/m/:handle`): exists only when the owner has turned on Share my profile (off by default). Shows the core identity row, badges, "Sign in to connect" (Connect green) and only sections set to Everyone on DNA; My connections and Anchored sections never appear; no DIA line, no mutuals. Chrome is a signed-out header (logo, Sign in) with no dock, no rails, one centred column: full width on compact and medium, 960 centred inside the 1440 page on expanded (ruling 136; the locked banner still bleeds to the frame edge).
- Public banner (ruling 130): one locked banner, full-bleed, `position: sticky; top: 0` on the top layer, flush under the header (no gap on any tier). The cover and portrait are never covered: the page scrolls underneath the banner and continues below it. Content spans the full frame width (32 gutters). On medium and expanded the sections flow in CSS columns (two and three, 16 gap, `break-inside: avoid`) so cards pack evenly instead of leaving ragged grid rows; compact is one column. A section with a single field (About, Skills, Languages, Where I am) drops the repeated field label under its title.
  The public page is DNA's first impression when a member shares their link, so the identity block is set as an editorial masthead, not a banner-and-circle stack (ruling 130; Strand exception 2 above): ground is `--bg-sunken` with the kente tile (the one place a pattern may sit behind a page head), the name in the display face at 40 to 44 with balanced wrapping, the headline in the display face italic (19 to 20, `--ink-2`), a 48 by 1 `--ink-3` rule closing the pair. No meta or local-time line follows (ruling 212). No glyph marks the panel: mate masie is reserved for DIA and appears nowhere on the profile (ruling 133; the shell's empty states were moved off it as well). The tile is the owner's pick from three curated textiles (kente, adinkra, mudcloth; `PatternPicker`, ruling 132) in the Edit profile mode, "Masthead pattern", saving on pick; it also grounds the closing block.
  - Compact and medium: the locked block is cover plus masthead. Cover 150 and 200 tall, full-bleed, nothing on it; the masthead on the tile ground follows with a 1px `--line` beneath. The portrait (80 and 96, 18 radius) sits on a 6px `--surface` plate overlapping the cover's lower edge by half its height at the left gutter, with the headline (display italic 17) beside it; the name (display 34) follows. Condensing (ruling 134): past 120px of scroll the cover collapses to 0 over `--dur-base` and the masthead becomes one row: portrait 64 compact, 88 medium and expanded, on a 4px plate and two single-line (ellipsis) lines, name display 24, headline 15 `--ink-2` (headline caps at 140 characters). Identity stays locked while the list gets the screen back; scrolling back to the top restores the full block.
  - Expanded: the banner is split, 300 tall (`overflow: hidden`): a 520 masthead panel at the left holding only the identity (portrait 128 on its plate beside the name, headline and rule, at its foot) and the cover photo filling the rest. No text on the image, nothing overlaps. It condenses on scroll exactly as compact and medium do (one 60 row, ruling 134).
  - One CTA only, at the foot of the page. Nothing sits between the banner and About: the scroll starts with the sections. Labels for the signed-out: header "Sign in" (secondary, small); close "Join DNA" plus the sign-in link; C sheet footer "Join DNA"; gate "Sign in" and "Join DNA" side by side. Closing block on the plain ground (no tile, no frame): "{first name} is on DNA. This is how members move together.", then the five C cards (`--surface`, 1px `--line`, `--shadow-2` so they float a little as a deck (Strand exception 1 above); CBadge 48, display 22 title, one line, "Learn more"; a horizontal snap-scrolling row of 240 to 260 cards on compact and medium, five across on expanded; hover takes the C border and text colour), then "Join DNA" (Connect green), the page's one CTA, with "Already a member? Sign in" as a text link beneath (ruling 130: the shared link reaches non-members first; joining is the act, signing in the quiet path). No intro line. The member's own badges are not repeated in the close; attestations live in the C sheets (below). Tapping a C opens the C sheet: Strand `Sheet` (bottom sheet compact, 560 right drawer otherwise) with a C-tint head (CBadge 48, display 32 title in `--c-{c}-text`, 17 line), Overview in the display face at 22, then What you can do, Who it is for, How it connects to the other Cs at 17/1.55, and a footer with previous, Join DNA (Connect green), next. Copy lives in `C_INFO` (staged) and follows the voice rules. No counts, no marketing numbers.

  Attested on DNA (ruling 135), at the foot of each C sheet above the footer: a horizontal snap row of attestation cards from across the platform in that C. Card 248 wide: Avatar 28 and member name (700), CBadge 24 at the right, the object 15/500, "Attested by {name}, {role} · {when}" 13 `--ink-3`; `--surface`, 1px `--line`, `--shadow-1`. Each card is a link to the object's public page (event, Space, Need). The row rotates one card every 4 seconds, loops, pauses on hover and touch, and does not move under reduced motion. Nothing renders when the C has no eligible attestation. DIA places them; eligibility is the owner's existing controls: Badges audience "Everyone on DNA" and Share my profile on (My connections and Anchored keep an attestation inside DNA). No counts.
- Public with Share off: no profile. The signed-out header plus an EmptyState: "This profile is for members." "Sign in to see it, or join DNA." with Sign in and Join DNA.
- Owner's "View as public" (ghost, sm; visible only while Share is on): renders exactly the Public view under a 40 ink banner "Viewing as the public sees it · Back to your profile".
- Private beats Share: a private profile shared publicly shows the core row only.

Profile is chassis, not a C. Home is neutral in the header; no C is active in the dock. On compact and medium a back row tops the column: owner "Feed" (ink), visitor "Connect" (`--c-connect-text`), IconButton arrow-left plus the word 15/500; the public view has no back row. On expanded the profile sits in the shell's centre column (680 to 760) with the left rail (ruling 79); no right rail at 1280. Rail and column scroll independently (each `overflow-y: auto; min-height: 0`, the canvas never scrolls), as in the Feed.

Local time (ruling 131, struck by ruling 212): the place-derived local-time line does not render anywhere. The member's stored time zone remains data for scheduling surfaces; nothing on the profile displays it.

Left rail content, context only:
- Visitor: In common (up to three mutual connections, shared Spaces).
- Owner: See it as (A member sees it; The public sees it, only while Share is on) and Who sees what (each section with its audience).

## 1. Core identity row, photo-forward (rulings 122, 128, 136) — `ProfileHeader`

Always rendered for signed-in members, private or not. The portrait carries the page; the cover is atmosphere. The core row is name, handle, avatar, headline, identity tier and masthead pattern, nothing else (ruling 212, completed by ruling 275): origin, current place and segment appear only as their sections (Origin and heritage, Where I am, the segment block), each under its own audience, and no place-derived time line renders anywhere. One masthead for every view (ruling 136): owner, visitor and public all use the locked, condensing banner described under 0.1 (cover, tile ground, portrait on its plate, editorial name and headline), with these differences.
- Owner: cover tools on the banner (an "Add a cover" act when empty, a camera IconButton top right when set) and a camera badge on the portrait plate; the owner controls (Edit profile, Edit name and headline, View as public, Private and Share switches, the effect line, badge audience) follow the banner in the content. In Edit profile mode the banner does not lock or condense, so the sticky edit bar owns the top.
- Visitor: relationship actions and the request line follow the banner, then badges. Mutuals appear once: under the actions on compact and medium, in the "In common" rail on expanded.
- Public: nothing follows the banner; the scroll starts with About. Expanded public uses the split banner; owner and visitor on expanded use the stacked banner inside the centre column (no bleed, 220 cover, portrait 104) since the rails frame it.
- Medium bleeds the banner to the frame edge (the 680 column widens to 820 for the banner only, 32 gutters inside). Compact and medium keep the back row (Feed for the owner, Connect for a visitor) above the banner; the banner locks once it reaches the top.

- Cover: full column width, 14 radius, 180 tall compact, 220 medium, 260 expanded; `object-fit: cover` with a stored focus point; no gradient, no text on it. Owner's empty cover: `--bg-sunken` with the kente pattern tile and one act, "Add a cover" (secondary, sm, on `--surface`), centred; owner with a cover gets a camera IconButton 36 at top right. Uses the composer's media path (Tinify).
- Portrait: Avatar 96 compact, 120 medium and expanded, 18 radius, 4px `--bg` ring, overlapping the cover's lower edge by 55 percent of its height, inset 16 from the left. IdentityMark 24 at bottom right; owner camera affordance 30 at bottom left.
- Text block, inset 16: name display 36/400, headline 17 `--ink-2`. No meta line (ruling 212): segment, origin and place render only in their sections. **Origin rendering decision** (applies in Origin and heritage): a written country name, never an emoji or bitmap flag.
- Accents: DNA palette only; C colours appear on badges and the Connect actions. No banner band, no circle-on-banner stack.
- Owner controls under the text: "Edit name and headline" (secondary, sm) and, while Share is on, "View as public" (ghost, sm). Then two Switch rows divided by `--line`: Private profile, Share my profile (off by default). A 13 `--ink-3` line beneath states the current effect (members only; shared: core row plus Everyone sections; private: core row only).
- Visitor: relationship actions (section 6), then mutuals (section 6), then badges.
- `IdentityMark`: Identified and Attested tiers get a 22 ink circle with a white check at the avatar's bottom right, 2px `--bg` ring so it sits on the photo. Account tier: nothing. Never a progress ring, never a percentage, never "complete your profile".

## 2. Badges (ruling 123) — `BadgeRow`

One pill per attested context (Convene, Collaborate, Contribute), in that order: CBadge 24 plus "Attested in {C}" 15/500 in `--c-{c}-text`, 1px `--line`, pill radius. Tap toggles a provenance region below (`--bg-sunken`, 10 radius) listing each attestation as "{object}" and "Attested by {name}, {role} · {when}". Pill takes the C tint and C border while open. No numbers anywhere; two attestations in one context are two lines, not a "2".

## 3. Sections — `SectionCard`

Card chassis: `--surface`, 14 radius, 1px `--line`, 16 padding, 12 gap. Header: optional CBadge 24 (activity sections only), caps title 13 `--ink-3`, then for the owner a `VisibilitySelect` and a pen-line IconButton 36. Body is read view, edit view, or the owner's empty state. Edit footer: Cancel (ghost, sm) and Save (primary ink, sm), right aligned, above a 1px `--line`.

Order under the core row: About, segment block, Origin and heritage, Where I am, What I work on, Skills, Languages, What I am here for, Links, then the four activity sections Convene, Collaborate, Contribute, Convey.

About (ruling 128): the page's only free-text field. One paragraph, 500 characters, textarea with `maxLength` and a live "N of 500" hint. Read view 17/1.5; past 220 characters it clamps to three lines with "Read more" (same link style as the PostCard), "Show less" to collapse. Owner's empty: "A short paragraph in your own words." with "Write about yourself".

Links (ruling 128) — `LinkRow`: Website plus LinkedIn, X and Instagram handles (handle only, "@" added on render). Read view: icon 16 in a 32 `--bg-sunken` square, then the value 15/500 over the network name 13 `--ink-3`; website opens in a new tab. Icons: globe for website, at-sign for handles (Lucide brand glyphs are a Strand decision). Default audience My connections. Owner's empty: "Your website and the handles you want members to find." with "Add links". Nothing else is added: no other sections.

Read view rows: 13 `--ink-3` label, then chips (`Chip`, neutral tint) for vocabularies or 17/1.5 text for prose and selects.

Fields and vocabularies (never typed; `VocabularyPicker`):
- Origin and heritage: Country of origin (select), Heritage (First generation, Second generation, Third generation or later, Continental), Return pathway (Already returned, Planning a return, Circular, both places, Not planning a return).
- Where I am: Current location (text, "City and time zone, written out").
- What I work on: Focus areas (up to 3), Industries (up to 3), Regional expertise (up to 3).
- Skills: up to 5. Languages: up to 6.
- What I am here for: Intent (fixed list, up to 3) plus one optional sentence.

Seed vocabularies, verbatim from the legacy profile (v3 review), one list each in `VOCAB` in the page's logic class:
- Focus areas (10): Agriculture & Food Systems, Technology & Innovation, Healthcare & Wellness, Education & Training, Finance & Investment, Arts & Culture, Policy & Governance, Infrastructure & Energy, Trade & Commerce, Environment & Climate.
- Industries (10): Agriculture, Technology, Healthcare, Education, Finance, Manufacturing, Retail, Energy, Real Estate, Creative Industries.
- Regional expertise (6): West Africa, East Africa, Southern Africa, Central Africa, North Africa, African Diaspora.
- Skills (10): Leadership, Project Management, Software Development, Marketing, Sales, Design, Data Analysis, Strategy, Operations, Research.
- Languages (14, no legacy equivalent, authored here): English, French, Portuguese, Arabic, Swahili, Hausa, Yoruba, Igbo, Twi, Amharic, isiZulu, Sesotho, Wolof, Somali.
The ampersands and title casing in the legacy lists are kept as given; they are vocabulary values, not copy.

`VocabularyPicker`: chips 36 tall, pill; selected fills ink with a check; at the cap the remaining chips drop to `--ink-4` and `aria-disabled`; the label carries "up to N".

## 4. Segment block (ruling 122) — `SegmentBlock`

One component, four variants, directly under the core row; the card title is the segment label. Edit view starts with a Segment select, then the variant's fields:
- Returnee: Return timeline (Already back, Within a year, One to three years, Someday, not fixed), What I need on the ground (text).
- Anchor: Continental base (short text), What I can host or offer (text).
- Ally: How I support (text).
- Still Exploring: Interests (vocabulary, up to 5).
Read view renders only filled fields. Owner's empty: "Say where you stand: returning, anchored on the continent, an ally, or still exploring." with "Choose your segment". Changing the segment in edit keeps the other variants' data.

## 5. Activity (ruling 125)

Four SectionCards with the C badge: "Convenings attested" (Convene), "Spaces and roles" (Collaborate; completed roles carry a circle-check "Completed" 13/500 at the right), "Contributions fulfilled" (Contribute), "Stories authored" (Convey). Rows are 15/500 title over 13 `--ink-3` detail, divided by `--line`, flush to the card edges. Owner's empty: "Nothing here yet. It fills as your {C} activity is attested." with the act (Host or attend a convening; Start or join a Space; Post or fulfil a Need; Share a Story), each opening the composer on that verb. Visitor's empty: the section does not mount. No counts, no radar.

DIA line: one italic 15 `--ink-2` sentence below the sections, visitor only, only with a real reason ("Thandiwe fulfilled a Need in the Space you lead."). Absent otherwise.

## 6. Relationship, visitor view (rulings 118 to 120)

- None: "Connect with {first name}" (primary, Connect green; opens the composer's Connect verb with the member prefilled and a message) and "Follow" (secondary).
- Following: same, with "Following" (secondary, `aria-pressed`). Follow is independent of the connection state.
- Request sent: "Request sent" (secondary, Connect outline; tap withdraws).
- Request received: "Accept" (Connect) and "Decline"; line beneath: "{first name} asked to connect with you."
- Connected: a Connect-tint "Connected" pill with a check; no Connect button.
- No Message action.
- Mutuals: up to three Avatar 24 plus name, then "are connections you share" (or "is a connection you share"). Never a count, never "+N". Expanded left rail repeats them with shared Spaces under "In common"; the honest empty line is "Nothing in common yet."

## 7. Visibility (ruling 124) — `VisibilitySelect`

Every section has one (ruling 124, made canonical): About, segment, Origin and heritage, Where I am, What I work on, Skills, Languages, What I am here for, Links, the four activity sections and the badge row; only the core row (name, handle, headline, cover, portrait, identity tier, pattern) has none, since it is always visible. Everyone on DNA (globe), My connections (users), Anchored (map-pin); a 36 tall native select styled as an icon pill, owner only, read view only. A visitor sees exactly what the audiences admit, nothing else. Whole-profile Private and Share switches in the core row. Visitor logic: a section renders only if not private, not empty, and its audience admits the viewer (Everyone; My connections when connected; Anchored when the visitor shares an anchor with the owner). Anchored (ruling 136): a visitor qualifies when they hold a role in a Space the owner holds a role in, or when both have an attested record at the same event. Segment is not a qualifier: an Anchor-segment member with nothing in common sees nothing set to Anchored. The prototype default sets What I am here for to Anchored so the audience can be seen working; the review row's "Shares an anchor" flag stands in for the real check (`space_roles` and `event_attestations` joins). Public logic: Share on, not private, not empty, audience Everyone on DNA. Hidden sections leave no placeholder. Badges and the DIA line also hide when private. Expanded owner rail "Who sees what" lists each section with its audience.

## 8. Edit model (ruling 126)

Two ways in, one save model.
- Section edit: the pencil (or the empty act) opens that section in place; one at a time, opening another closes the first without saving. Each section saves alone; the toast "Saved." confirms. Cancel restores the saved values.
- Edit profile (owner button, and Edit profile in the avatar panel): every editable section (core, About, segment, Origin and heritage, Where I am, What I work on, Skills, Languages, What I am here for, Links) opens at once, each with its own Save and Cancel and its audience select still in the header. A sticky bar above the column reads "Editing your profile · Each section saves on its own. Nothing changes until you save it." with Done. Save keeps the section open in this mode; Done closes everything (unsaved edits are dropped, nothing is auto-saved). Activity sections are not editable; they show their audience select only.
- Drafts are per section (`drafts[id]`), never one profile-wide form. Name is the only required field: saving an empty name toasts "A name is required." and stays in edit. Headline caps at 140 characters.
- Avatar and cover use the composer's media path (Tinify). View my profile and Edit profile are the only profile items in the avatar panel.

## 9. States

Populated, owner empty (cover, About, Links and every section show their act), visitor empty (only the core row, actions and, if any, badges), public on, public off (sign-in prompt), owner viewing as public, loading (ghost header and two ghost cards, `role="status"`), private as visitor (core row and relationship actions only), both themes. Dark: identity mark stays ink on `--bg` ring; C text uses `--c-{c}-text`.

## 9.1 Five-C hover (ruling 129)

Wherever a C glyph is interactive (PulseDock and PulseBar slots, C cards, ActButtons, badges), pointer hover shows the C's canonical colour: glyph in `--c-{c}`, label in `--c-{c}-text`, no fill; the 1px lift stays on the dock. Staged in the shell's PulseDock patch and the profile's CCard.

## 10. Tokens

`--bg`, `--bg-sunken`, `--surface`, `--line`, `--line-strong`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--on-fill`, `--c-connect`, `--c-connect-text`, `--c-connect-tint`, `--c-{c}` and `-text`, `-tint` for badges, `--font-display`, `--font-sans`, `--radius-m`, `--shadow-stack` (avatar panel), `--dur-fast`, `--ease`. No raw colours.

## 11. Prototype only

Review row (including the "Shares an anchor" flag), demo data (`FULL`, `EMPTY`), the cover demo (demo-only: the demo cover reuses the portrait photograph `hero-professional.jpeg` because no cover asset exists; real covers come from members through the composer's media path and the focus point is stored per member), `contained` composer, the relationship radio (real states come from `connections` and `follows`), the Anchored flag (real state comes from shared Space roles and attested events), the Sign in button (no auth in this brief).
