# Conformance audit 01: the product against the register

Session 14, 11 September 2026, run against `main` at `3c7e0e1` (the merge of PR #26) and the
canonical Supabase project `dgspjevjoblujcoljvkn`. Read-only. Nothing in `src/`, `supabase/`, `docs/`
or `public/` was changed, no migration was written, no copy was edited, and every live check ran
inside a transaction that was rolled back. The register checked against is Revision 8, rulings 1 to
359. Ruling 140's language applies throughout: findings carry a severity and a gate, never the words
leak or breach. Ruling 205 applies: a pattern seen in a handful of places is recorded as an
observation. Ruling 289 applies: where a finding wants a ruling, it says so and the number is blank.

## Session open (ruling 286, ruling 146)

Founder commits on `main` by app id 159125892 (`gpt-engineer-app[bot]`): sixteen in total, all on
9 September, the last being `08bf787` "Added favicon.png to site". None since 10 September. The
working tree was clean at open. Two commits (`b65f6ee`, `569fc37`) carry the author account
`region17gh` (`r17ghana@gmail.com`), the founder's Region 17 Claude Code seat, a permitted identity
under ruling 369; they are the founder's own Code sessions, not Lovable.

State of `main`'s matrix, stated as results (ruling 190): the latest completed Pages run on `main`
is run 139 on `96d956c`, conclusion failure; its merge message records one WebKit failure under
ruling 199 (the Connect arm's aborted-fetch abort on mocked REST, the class ruling 357 then
corrected). Run 141 on `3c7e0e1` was in progress at 15:44 UTC when this audit opened and its result
is not known at the time of writing. No open pull request exists.

## Method

The register was grouped by surface: Composer, Feed, Shell and notifications, Profile, Connect,
Block, Auth, Onboarding, the media pipeline (rulings 345 to 353) and the username fold (343, 350),
then the chassis rules that apply everywhere. For each surface, three passes:

1. Implemented: every ruling naming behaviour, copy, layout or data was looked for in the code, and
   where it is data, confirmed against the live project.
2. As ruled: copy compared verbatim, layout compared to the SPEC, numbers checked against rulings
   254 to 258.
3. Unruled: everything a member can see or do on the surface that no ruling and no SPEC describes,
   recorded as a decision somebody made, not as a recommendation.

Evidence is a file and line on `main` at `3c7e0e1`, or a live query. Migrations are cited by the
repo file; where the live project's recorded version differs from the filename, the name is what is
cited.

Live method. Every live check ran through the project's SQL endpoint as one statement batch of the
form `begin; set local role <anon | authenticated>; set local request.jwt.claims = '{"sub": <test
account>, ...}'; <selects>; rollback;`. The two ruling 218 test accounts were used as the personas:
Owner Test (`5099248b-…`, onboarded, stance declared) and Member Test (`7c496c63-…`, onboarded,
stance untouched), plus `anon`. One check wrote a row (the direct insert into
`connection_requests` in C-1 below); it was rolled back inside the same batch and the count
afterwards, read as the table owner, matched the count before. Row counts were read as the table
owner and are reported as read.

Severity scale, as PASS-01 used it: High, a ruled behaviour is absent, inverted or has a second path
on a shipped surface; Medium, a ruled behaviour or a ruled string is approximate, or a doctrine rule
holds on most surfaces and not this one; Low, an observation, a stale document, or a detail with no
member-facing consequence today. Gate names the moment it has to be closed: merge (nothing here),
invite boundary, or launch.

---

## 1. Composer (Brief 1; rulings 3, 52 to 56, 68, 73, 74, 88, 103, 107, 119, 193, 194, 215, 287, 288, 291)

### 1.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 3, 68 | Implemented. Untyped posts are general Convey with no kicker, title or action | `src/components/strand/verb-schema.ts:90`, `src/components/dna/PostCardRouter.tsx:34-36` | |
| 52 | Implemented. Member never leaves the composer; DIA is a model call; failure is silence | `src/components/strand/Composer.tsx:230-274`, `src/lib/dia.ts:30-60` | |
| 53 | Implemented. Text-first, five chips always visible in C order | `Composer.tsx:847-855` | |
| 54, 74 | Implemented. Thinking state, silent fallback, 3.5 s client budget, 3.4 s server budget | `Composer.tsx:47`, `supabase/functions/dia-compose-read/index.ts:11` | |
| 55 | Implemented. Images and link unfurl only; `MediaBlock` keeps video and audio kinds for Strand parity and the composer never produces them | `Composer.tsx:404-435`, `src/components/strand/MediaBlock.tsx:1-2` | |
| 56 | Implemented. Three audiences, server-side drafts, one shell, Space authorship dropdown | `src/components/strand/AudienceSelect.tsx:23-27`, `src/lib/drafts.ts`, `Composer.tsx:906-933` | |
| 68 | Implemented. Publish label always "Publish"; DiaLine "DIA read this as an Event." family; audience defaults to the anchor | `Composer.tsx:156-162, 200-202, 962-971` | |
| 73 | Implemented. `anchor_kind` carries `connection_request` and `story`; `posts.created_by` exists | live enum `anchor_kind`; live `feed` view columns | |
| 88 | Implemented on the Feed card: React, Respond, Save, Share | `src/components/strand/PostCard.tsx:384-422` | |
| 88 | Divergent, Low. The composer preview footer renders Respond, Save and Share but no React, so the preview is not the card the Feed renders (composer SPEC section 3 says the preview carries the exact props) | `PostCard.tsx:424-460` | Low |
| 103, 107 | Implemented. 300 ms slide both ways, event-level scroll lock, armed drop state with the ruled copy | `src/components/strand/Sheet.tsx:18, 82-140`, `Composer.tsx:359-402, 766-805` | |
| 119 | Divergent, Medium. The Connect chip still reads "Make an Intro", the kicker reads "Intro", the DIA line reads "DIA read this as an Intro.", and the server prompt tells DIA "connect = Make an Intro". Ruling 119 relabelled the chip "Connect with someone" and freed "Intro" for the deferred brokered introduction | `src/components/strand/VerbChip.tsx:7`, `verb-schema.ts:35`, `Composer.tsx:157`, `dia-compose-read/index.ts:75` | Medium |
| 119, 215, 53 | Divergent, High. The Connect verb is offered from every composer entry (ruling 53 makes the five chips always visible) and the Feed's My Network empty state opens the composer on it, but `publish_post` refuses a Connect post that carries no member anchor with `send_introduction: not available`, and the composer surfaces no failure (ruling 291 is open). A member who picks Connect from the Feed, writes a message and presses Publish sees Publish re-enable and nothing else. The only working entry is "Connect with {first}" on a profile, which passes the member as the anchor | `supabase/migrations/20260910065849_publish_path_defects.sql:96-107` (live body confirmed), `Composer.tsx:478-502`, `src/components/dna/FeedSurface.tsx:314-327`, `src/components/dna/ProfileSurface.tsx:490-501` | High |
| 193, 194 | Implemented. Instrument options arrive from `vocabularies()` with no literal and no fallback | `verb-schema.ts:74-78`, `src/components/dna/ComposerShell.tsx:30-34, 65` | |
| 193 | Observation, Low. Two enum literals survive beside live enums: `["Free", "Paid"]` for `ticket_kind` (G4 records this as deliberately left alone), and the Edge Function's own `["Time", "Skills", "In-kind"]` for `contribute_instrument`, which G4's sweep did not reach because it covered `src/` only. `publish_post` maps any instrument label it does not recognise to `time` rather than refusing | `verb-schema.ts:56`, `dia-compose-read/index.ts:62, 67, 140`, `20260910065849_publish_path_defects.sql:139-140` | Low |
| 287 | Implemented. Every draft writer checks `published` | `Composer.tsx:298-326` | |
| 288 | Implemented. A consumed id is refused by name and leaves no orphan | `20260910065849_publish_path_defects.sql` | |
| 291 | Not implemented; the ruling is open. A failed publish rethrows and the surface shows nothing | `Composer.tsx:496-501`, `ComposerShell.tsx:83-96` | see section 5 |

### 1.2 Unruled: what a member can see or do on the composer that no ruling or SPEC describes

- U-C1. A composer opened with `initial.hold` set never runs inference for that draft; the flag exists for the profile's Connect entry and is a decision the code made (`Composer.tsx:231`).
- U-C2. The image picker accepts `image/*` on every tier; a HEIC from an iPhone is sent as-is and refused by the server's sniff (`Composer.tsx:626, 633`, `media-upload/index.ts:43-67`). Ruling 353 records the composer as transitional, so this is ruled as a state, not as an experience: what the member sees when it fails is nothing, because the thumbnail is removed silently (`Composer.tsx:428-431`).
- U-C3. The link field's placeholder is `https://` and the link row shows the title or, before the unfurl resolves, the domain (`Composer.tsx:655, 738`). SPEC section 9 covers the domain-only fallback; the placeholder is a decision.
- U-C4. The pointer-mode footer hint reads "⌘ Enter to publish · Esc to close" on Apple platforms and "Ctrl Enter…" elsewhere, decided by `navigator.platform` (`Composer.tsx:978, 1069`). SPEC section 7 names the shortcut; the platform sniff is a decision.
- U-C5. Publish is disabled while any image is still uploading (`Composer.tsx:965`). No ruling or SPEC line says so.
- U-C6. The DIA record stored with a post carries a numeric confidence and a latency (`src/lib/publish.ts:142-151`, `post_dia.confidence`). It is never rendered and members cannot select it (PASS-01 confirmed). A number stored about a member's post is a decision under ruling 310, company-facing.
- U-C7. The composer keyboard shortcut `c` opens the composer from any shell route unless a dialog other than the composer is open (`src/routes/_shell.tsx:76-87`). SPEC section 7 names `c`; the "any other dialog blocks it" rule is a decision.

---

## 2. Feed (Brief 2; rulings 69, 72, 80, 81, 83, 84, 90, 104, 105, 109, 119, 254 to 258)

### 2.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 69 | Divergent, High. The card's author row renders "Member" with an initials avatar for every author who is not the viewer, and the viewer's own name for their own posts. The `feed` view carries no author columns and `hydratePosts` resolves none, although a signed-in member may read the core row (name, avatar_path) of every member under `private.can_see_core`. Live: `feed` is `select p.* from posts` with fourteen columns, none of them a name | `src/lib/feed.ts:188-194, 201-202`, `supabase/migrations/20260907010200_b2_feed_read.sql:9-15`, live `pg_get_viewdef('public.feed')` | High |
| 69 | Divergent, Low. The card's overflow "More" control (SPEC section 5 item 1) never renders on the Feed because the host never passes `onMenu` | `FeedSurface.tsx:360-393`, `PostCard.tsx:224-232` | Low |
| 69, 84 | Implemented. Card anatomy otherwise as SPEC: meta line in the C text rung, kicker, display title, four-line clamp, Read more, divider, four icon actions with no counts | `PostCard.tsx:160-422` | |
| 72 | Implemented. React is an existence toggle with no count | `feed.ts:283-333`, `PostCard.tsx:398-405` | |
| 80 | Implemented. Strict reverse-chronological on `published_at, id`, no ranking field anywhere | `feed.ts:264-267`, live view definition | |
| 81, 83 | Implemented. Five lenses, `?lens=` in the URL, `all` omitted, For You identical to All | `src/lib/lens.ts` | |
| 84 | Implemented. Read more prefetches after an 80 ms hold; C slots prefetch after 80 ms | `PostCard.tsx:298-306`, `src/components/strand/PulseDock.tsx:84-89` | |
| 90 | Implemented. Saves and reactions are own-row select, insert, delete | live policies on `post_saves`, `post_reactions` | |
| 104, 109 | Implemented. Three independent scroll containers; pinned block; lens change lands the list beneath the block | `src/components/dna/AppShell.tsx:228-341`, `FeedSurface.tsx:244-276` | |
| 105 | Implemented. In-place expansion at `/posts/:id`, direct landing renders the expanded card with "Back to Feed" | `src/lib/feed-view.ts`, `FeedSurface.tsx:399-448` | |
| 119 | Divergent, Medium. The My Network empty state's action reads "Make an Intro" and opens the Connect verb; combined with the composer finding above it is a dead end from the first-run screen | `FeedSurface.tsx:314-327` | Medium |
| 254 to 258 | Holds. No count, numeral or progress renders on the Feed | grep sweep, section 10 | |
| SPEC section 3 empty copy | Divergent, Low. My Network, Mine and Saved carry body lines the SPEC does not give: "Make an intro. Posts from your connections appear here.", "Start with what is going on with you.", "Use the bookmark on any post and find it here." | `FeedSurface.tsx:326, 332, 339` | Low |
| SPEC section 5 meta line | Divergent, Low. The meta line is the absolute time only; the SPEC's "Lagos, WAT ·" place part is absent. Ruling 212 struck place from the profile core row; no ruling says what a Feed card's meta line carries after 212 | `feed.ts:216-217` | Low, wants a ruling ( ) |

### 2.2 Unruled: what a member can see or do on the Feed that no ruling or SPEC describes

- U-F1. My Network shows posts authored by Spaces the member holds an active role in, as well as posts by connections (`feed.ts:246-252`). The SPEC predicate is "author is a connection".
- U-F2. The Feed reads at most fifty posts per lens and offers no way to reach older ones (`feed.ts:236-240`). A member with more than fifty visible posts never sees the fifty-first.
- U-F3. Share uses the Web Share sheet where it exists, otherwise copies `/posts/:id` to the clipboard with the toast "Link copied.", and if that fails toasts the URL itself (`FeedSurface.tsx:30-48`). The shared address is signed-in only, so a recipient outside DNA lands on sign-in.
- U-F4. Respond on a card expands the card in place, and on a Convene card the control is named "Ask the host" (`PostCardRouter.tsx:66`, `FeedSurface.tsx:369`). There is no thread to respond into.
- U-F5. The post's own act button ("Get a ticket", "Join the Space" and so on) navigates to that C's stub route (`FeedSurface.tsx:370-373`).
- U-F6. A direct landing on a post the viewer may not see, or that does not exist, renders "This post is not available." (`FeedSurface.tsx:444-446`); while loading it renders the word "Loading" (`:440-442`).
- U-F7. A saved-post row in the left rail opens the post in place from the Feed and as a direct landing elsewhere, and its label is the title, else the first line of the body, else the word "Post" (`src/components/dna/Rails.tsx:42-88`).
- U-F8. The greeting uses the member's first name split on whitespace and an `en-GB` short date (`FeedSurface.tsx:110-117`). The SPEC gives the format; the locale is a decision.
- U-F9. A Space-authored post shows the Space title with "· Space" after the author name (`PostCard.tsx:182-184`). Composer SPEC section 3 names this for the preview; the Feed inherits it.

---

## 3. Shell and notifications (Brief 2; rulings 10, 12, 13, 57, 59, 60, 69, 71, 78, 79, 82, 84, 86, 92, 99, 100, 106, 107, 126, 134, 170, 174, 184, 230, 344)

### 3.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 57 | Implemented. Semantic tokens only in every DNA component; dark theme on `[data-theme="dark"]`; system preference followed at first load | `src/styles/strand.css:14-154`, `src/lib/tier.ts:47-83` | |
| 57, 95 | Divergent, Low. The root 404 and error pages are shadcn Tailwind markup on the `oklch` blue-grey tokens in `src/styles.css`, which ruling 95 prohibits (cool blue-greys), and they render outside the shell (ruling 69 makes chrome on every route a Done Means line). Both are the Lovable template's pages, kept | `src/routes/__root.tsx:28-87`, `src/styles.css:68-137` | Low |
| 57 | Divergent, Low. `theme-color` is a hardcoded light hex and does not follow the dark theme | `__root.tsx:96` | Low |
| 60 | Divergent, Medium. The manifest's `start_url` is `/convene`, a stub, while Feed is Home (ruling 69). An installed PWA opens on "Convene is next." | `public/manifest.webmanifest:4` (committed `40f4bf3`) | Medium |
| 60 | Not implemented, Medium. No service worker exists, so there is no offline shell and no install prompt beyond the browser's own; the manifest is the whole of the PWA | grep of `src/`, `public/`, `vite.config.ts` for serviceWorker and workbox: none | Medium, wants a brief ( ) |
| 69 | Implemented. Shell mounted once; five-C nav in fixed order; Feed is Home with no C colour; compact header logo, composer entry, bell, avatar | `AppShell.tsx`, `src/components/strand/AppHeader.tsx`, `PulseDock.tsx` | |
| 71, 79, 86 | Implemented. Rails only above 1024; right rail at 1440; rails hold context, never navigation | `AppShell.tsx:228-311`, `tier.ts:85-99`, `Rails.tsx` | |
| 78, 99, 106 | Implemented. One-row desktop header; logo alone is Home below expanded | `AppHeader.tsx:104-201` | |
| 82 | Implemented. A dot, never a numeral; four kinds; in-app only; copy verbatim per kind | `src/components/strand/NotificationBell.tsx`, `NotificationListItem.tsx:30-41`, live enum `notification_kind` | |
| 82, 144 | Implemented. Only `connection_accepted` has a writer today (the accept trigger); the other three kinds wait for their engines | live triggers: `on_connection_request_accepted` | |
| 84 | Divergent, Low. Hover-intent on the Home item and the logo fires on `mouseenter` with no 80 ms hold; slots and Read more hold correctly | `AppHeader.tsx:107, 177-180` | Low |
| 92, 126, 230 | Divergent, Low. The account panel holds View my profile, Edit profile, Change password, Dark theme, Sign out and the member's email address. Ruling 92 bounds it to sign-out and theme, 126 adds the two profile items, and Brief 4B's report states the Change password row as a judgment call. The email line is nobody's ruling | `AppShell.tsx:496-582` | Low |
| 100, 107 | Implemented. No chip behind dock glyphs; floating composer entry on scroll; handle and wall-tab geometry as SPEC | `PulseDock.tsx`, `AppShell.tsx:130-160, 359-449` | |
| 134 | Implemented. Mate masie is drawn only by `CBadge c="brand"` in empty states and the notification empty state; nowhere on the profile | `src/components/strand/cmeta.ts:19`, `EmptyState.tsx:39` | |
| 170, 174 | Implemented. `main` precedes both rails; a rail with a null label renders a bare div | `AppShell.tsx:249-310`, `src/lib/rail-store.ts` | |
| 184 | Implemented. Every logo and icon resolves by path from `/strand/` and `/`; sized by height, width auto; no module import, no inline SVG | sweep, section 10; `__root.tsx:110-115` | |
| 344 | Implemented. Safe-area insets once in the header and dock; `100dvh` on the shell | `AppShell.tsx:208-218, 343-357`, `PulseDock.tsx:185-190` | |
| 12, 13 | Not implemented. No Pulse read model; the dock's `states` prop is never passed, so no pulse dot can render | `AppShell.tsx:343-357` (no `states`), `AppHeader` called without `cStates` | see section 5 |
| 31 | Divergent, Low. The page's meta description reads "Diaspora Network Africa" and both DIA system prompts say the same; the locked positioning is "Diaspora Network of Africa", which the onboarding heading uses correctly | `__root.tsx:95`, `dia-compose-read/index.ts:73`, `supabase/functions/connect-suggest/index.ts:58`, `src/components/dna/OnboardingSurface.tsx:44` | Low |
| 27 | Open by ruling; observed. `public/robots.txt` allows every crawler everywhere (the Lovable template file, `4260d9f`); eight routes carry `noindex`; `/sign-in`, `/feed`, `/posts/:id` and the five C routes carry none. `/m/:handle` is `noindex` as ruling 127 requires | `public/robots.txt`, sweep 10 in section 10 | Low |

### 3.2 Unruled: what a member can see or do on the shell that no ruling or SPEC describes

- U-S1. The account panel shows the member's email address (`AppShell.tsx:496-499`).
- U-S2. A `?theme=dark` or `?theme=light` query parameter on any URL overrides the stored theme for that load (`tier.ts:71-72`). It exists for the matrix and is reachable by any member.
- U-S3. The unread dot polls every sixty seconds (`src/components/dna/NotificationPanel.tsx:48-52`).
- U-S4. The notification list shows the word "Loading" while it loads (`NotificationPanel.tsx:133-136`); an actor whose name cannot be read renders as "A member" (`src/lib/notifications.ts:88`); a Space role renders as "a lead" or "a member" (`:80-82`).
- U-S5. The five C stub routes carry a body line the SPEC does not give: "This surface arrives with its own brief. Until then Feed is Home and the shell is the same everywhere." (`src/routes/_shell/$c.tsx:25`).
- U-S6. The 404 page reads "404 / Page not found / The page you're looking for doesn't exist or has been moved. / Go home"; the error page reads "This page didn't load / Something went wrong on our end. You can try refreshing or head back home. / Try again / Go home" (`__root.tsx:28-87`). Both are outside Strand and outside the copy rules (an apostrophe contraction and a numeral).
- U-S7. Uncaught render errors are forwarded to Lovable's in-page hooks when the editor injected them (`src/lib/lovable-error-reporting.ts`, `__root.tsx:55`). Inert in production; a decision about where errors go.
- U-S8. The avatar button's accessible name is "Your profile" and it opens the account panel, not the profile (`AppHeader.tsx:206`).
- U-S9. The Home link on compact and medium carries `aria-current="page"` on the Feed; on expanded the Home icon does (`AppHeader.tsx:110, 176`).
- U-S10. Google Fonts is fetched at runtime for Bodoni Moda and Alegreya Sans because no brand font binaries were supplied (`strand.css:9-11`). A third-party request on every page load is a decision the Strand port made.

---

## 4. Profile (Brief 3; rulings 122 to 136, 138, 141 to 143, 145, 187, 188, 212, 213, 229, 275, 300, 336, 353)

### 4.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 122, 128, 131 | Implemented. Shared core plus one stance block, About 500 with clamp, headline 140, four links | `ProfileSurface.tsx:147-254, 1672-1753` | |
| 123 | Implemented. Identity mark from `tier`, never a ring or a percentage | `ProfileSurface.tsx:1686`, `src/components/strand/IdentityMark.tsx` | |
| 123 | Observation, Low. The mark's title reads "Identified" for the attested tier too | `IdentityMark.tsx:12` | Low |
| 124, 136, 212 | Implemented and confirmed live. Sections obey `admit_section`; the core row is name, handle, avatar, headline, tier, pattern; origin, place and stance ride on the member object only when their section is admitted. Live: Member Test viewing Owner Test (audience everyone on every section) receives them; Thandiwe Dube's `intent` at Anchored is absent from both the member and anon projections | live `profile_view` as Member Test and as anon; `member_visibility` rows | |
| 125 | Implemented. Four activity sections, owner sees the act, visitor sees nothing when empty; live rows carry no count | `ProfileSurface.tsx:1578-1656`, live `sections.convey` for Owner Test | |
| 126, 130 | Implemented. Edit in place per section, Edit profile opens all with a sticky Done bar, per-section drafts, name required | `ProfileSurface.tsx:320-452, 744-772` | |
| 127, 130 | Implemented. Public only when Share is on; gate copy verbatim; View as public banner verbatim; back row owner Feed, visitor Connect, public none | `ProfileSurface.tsx:773-788, 1012-1047, 708-743` | |
| 132, 134, 135 | Implemented. Locked condensing masthead (120 px collapse, 24 px release), pattern picker, C deck at `--shadow-2` | `ProfileSurface.tsx:72-77, 532-561`, `src/components/strand/CCard.tsx:39` | |
| 133 | Implemented. Five C cards, sheet with the four sections, previous and next, Join DNA footer; attestation rail inside the sheet | `src/components/strand/CSheetBody.tsx`, `AttestationRail.tsx` | |
| 133, 135 | Divergent, Low. The rail heading reads "Attested in {C} on DNA" where the SPEC gives "Attested on DNA"; each card links to the C's signed-in stub route, so from a signed-out page it lands on sign-in | `AttestationRail.tsx:61, 80`, `src/lib/profile.ts:292-294` | Low |
| 141 | Implemented and confirmed live. Anonymous `profile_view` and `public_attestations` render Kwame Mensah and Adaeze Nwosu as "the host" and "a Space lead"; the signed-in projection names them | live `profile_view('thandiwe-dube')` as anon and as Member Test | |
| 142 | Implemented and confirmed live. 55 African states for origin, 195 for current location, both tables | live counts; `ProfileSurface.tsx:176, 188` | |
| 143 | Implemented. Attestations is one table; badges project over it; no member insert path exists | live policies on `attestations` | |
| 187 | Implemented. Stance labels come from `member_stances` through `vocabularies()` and `profile_view.member.stance_label`; no map in a component | `src/components/strand/SegmentBlock.tsx:19-25`, live `member_stances` five rows | |
| 188 | Implemented. Profile reads its relationship from the same `private.relationship_state` and writes through Connect's paths | `profile.ts:238-261` | |
| 213 | Implemented and confirmed live. Anonymous `profile_view('owner-test')` (Share off) returns null | live | |
| 229 | Implemented. Request sent stays "Request sent" for a withdrawn request | `profile.ts:109-114` | |
| 275 | Implemented. `ProfileHeader` no longer accepts origin, place, segment or time props | `src/components/strand/ProfileHeader.tsx:7-12, 32-50` | |
| 300, 336 | Divergent, Medium (known follow-up under 336). The visible label reads "Segment" as the section title fallback and the edit select's label; the owner's empty act reads "Choose your segment"; the empty line enumerates "returning, anchored on the continent, an ally, or still exploring" and omits Kin | `ProfileSurface.tsx:132, 1527, 1539, 1542`, `SegmentBlock.tsx:92` | Medium |
| 212, 213 | Divergent, Medium. The owner's effect line under the Private switch reads "Members see your name, headline, segment, origin and location. Nothing else shows until you switch Private off." Ruling 212 moved segment, origin and location out of the always-visible row and 213 makes a Private profile null to non-connections; the line promises the opposite | `ProfileSurface.tsx:1148-1152` | Medium |
| 128 (SPEC section 3) | Divergent, Low. About's empty line reads "A short paragraph in your own words. The only free text on the page." where the SPEC gives the first sentence only; the second is untrue since the stance text fields and "In a sentence" are also free text | `ProfileSurface.tsx:169` | Low |
| 4, 50, 55, 119, 322 | Divergent, Medium, wants a ruling ( ). The C sheet copy on every shared profile describes features the register rules out or defers: Contribute "time, skills, introductions, equipment and capital" and "Give and receive more than money" and "Post a Need or an Offer" (ruling 4 and ruling 50 exclude money and Offers); Convey "text, images, audio or a link" and "the daily Edition" (55 defers audio, 49 defers the Edition to after launch); Connect "Ask for an intro through a shared connection" (119 defers the brokered intro); Collaborate "milestones" (50 waits); Convene "Keep your ticket in your wallet" (nowhere). Ruling 322 struck the onboarding tour for the same "capital" line. This copy was in the approved v3 page (ruling 138) and shipped with Brief 3 | `src/components/strand/cinfo.ts:14-88` | Medium |
| 222 | Partially implemented. Strand's `Sheet` moves no focus, traps none and returns none. The block control and the onboarding explainer implement it locally; the composer sheet, the C sheet, and Connect's intro and filter sheets do not | `Sheet.tsx` (no focus code), `src/components/dna/ProfileBlockControl.tsx:142-182`, `OnboardingSurface.tsx:844-874` | Medium |
| 345, 346 | Divergent, Medium. The profile's avatar and cover uploads do not use the client half of the pipeline: they send the picked file as-is, accept `image/jpeg,image/png,image/webp` only, and carry no timeout. Ruling 353 names the composer and the cover as transitional; ruling 346 names the avatar as the pipeline's first consumer, and the profile's avatar control is an avatar control | `profile.ts:205-229`, `ProfileSurface.tsx:902-915` | Medium |
| 348 | Pending by ruling. `media.crop` and `media.focal_point` exist; no ImageAdjust component | live `media` columns | |
| 27, 127 | Implemented. `/m/:handle` ships `noindex` | `src/routes/_shell/m.$handle.tsx:18` | |

### 4.2 Unruled: what a member can see or do on the profile that no ruling or SPEC describes

- U-P1. A signed-in member opening a handle that does not exist, or a Private member's handle, sees "No member at this address." with "The link may have changed." and a Back to Feed button (`ProfileSurface.tsx:789-799`). Ruling 213 makes the two cases indistinguishable by design; the copy is a decision.
- U-P2. Every select in edit mode has a first option labelled "Choose" (`ProfileSurface.tsx:1426`, `SegmentBlock.tsx:108`).
- U-P3. What I am here for carries a second field labelled "In a sentence" with the hint "Optional." and a 200-character cap (`ProfileSurface.tsx:229-236`). The SPEC says "one optional sentence"; the label and the cap are decisions.
- U-P4. Where I am carries a Current country select (ruling 142) and a Current location text with the hint "City and time zone, written out. Nairobi, EAT." (`:188-195`). The example city is a decision.
- U-P5. The owner's empty lines for Origin and heritage, Where I am, What I work on, Skills, Languages and What I am here for, and every "Add …" act label, are the build's (`:180-239`). The SPEC gives only About's and Links'.
- U-P6. The Edit profile mode adds a "Masthead pattern" card reading "The textile behind your name on the shared profile. Saves as you pick." (`:1701-1711`).
- U-P7. The Name field in edit reads "The only required field." and the headline field "One line, up to 140 characters. What you do, in your words." (`:1735, 1749`).
- U-P8. The expanded owner rail "See it as" carries the empty line "Turn on Share my profile to see it as the public does." and the row "The public sees it"; "Who sees what" lists every section including Badges with its audience word (`:587-636`).
- U-P9. The expanded visitor rail lists mutuals with the sub-label "Connected" and shared Spaces with "Shared Space" (`:643-679`).
- U-P10. Saving shows the toast "Saved." (SPEC) and failures toast "That did not save. Try again.", "That image did not upload. Try again." or "That did not go through. Try again." (`:416-418, 464, 481, 508, 524`). A vocabulary cap refusal toasts "Focus areas: up to 3." and a foreign-key refusal "That value is not in the list." (`profile.ts:193-202`).
- U-P11. Accepting a request on the profile toasts "You and {first} are connected." (`:1192`), the Connect toast reused on Profile.
- U-P12. The public header's logo links to `/`, which redirects to `/feed`, which redirects a signed-out visitor to sign-in (`:992-1002`).
- U-P13. The C sheet's accessible label is "About {C}" and on compact it is 85 percent tall (`:919-927`); the SPEC gives no label and the sheet's own head only.
- U-P14. In the public column on medium and expanded the sections flow in two and three CSS columns (SPEC 0.1) and the C deck bleeds 16 or 24 px past the column, capped at the column's gutter (`:1134-1136, 1799-1813`, ruling 344's fix).
- U-P15. The owner may set the badges audience from a control labelled "Badges" beside the switches (`:1337-1354`); SPEC section 7 says badges carry an audience, and where the control sits is a decision.
- U-P16. A profile visitor sees the DIA line as italic 15 in `--ink-2` under the sections (`:1845-1859`); the line's text comes from `profile_view.dia_line`, which today is produced only when a shared Space or a mutual exists.

---

## 5. Connect (Brief 4; rulings 111 to 121, 153 to 182, 185 to 189, 196, 213 to 216, 224, 225, 229, 243)

### 5.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 111 | Implemented and confirmed live. Typed edges, symmetric adjacency, materialised `second_degree` with `via_count` withheld by column grant (a select naming it is refused), nightly refresh scheduled | live policies, live grant on `second_degree (member_id, fof_id, refreshed_at)`, `supabase/migrations/20260908200100_b4_connect_rls.sql:190` | |
| 113, 153 | Implemented and confirmed live. Rules-only ranking on an internal `hits` never returned; `member_embeddings` at zero rows; DIA writes words only, validated for digits, percent and exclamation | `connect-suggest/index.ts:78-86`, live counts | |
| 113 | Observation, Low. The system prompt bans em dashes and the validator does not check for one | `connect-suggest/index.ts:64, 82` | Low |
| 117, 118 | Implemented. No Message action anywhere; Follow is one-way, silent, gated on nothing | `src/components/strand/MemberCard.tsx:138-156`, `20260908200200_b4_connect_rpcs.sql` (`set_follow`) | |
| 119 | Implemented. Intro sheet with a required message, one shot, copy verbatim | `src/components/dna/ConnectSurface.tsx:848-918` | |
| 120, 177 | Implemented. Up to three mutuals as avatars and names, never a count | `MemberCard.tsx:226, 337-362` | |
| 154 | Implemented and confirmed live. `corridors` has zero rows; the Corridor filter does not render and no card carries a corridor line | live count, `ConnectSurface.tsx:149` | |
| 155, 158, 159 | Implemented. Four lenses, no Messages seat, Where as a tile mosaic with one treatment, no map | `src/lib/connect.ts:25-50`, `src/components/strand/PlaceTile.tsx` | |
| 156 | Implemented. `/connect` redirects signed-out; `noindex` | `src/routes/_shell.tsx:57`, `src/routes/_shell/connect.tsx:12` | |
| 157, 214, 229 | Implemented and confirmed live. The sender has no select on `connection_requests` (recipient-only policy, non-withdrawn); `MEMBER_REL` has no window state; `relationship_display` maps window and withdrawn to sent | live policies, `MemberCard.tsx:28`, `20260909170000_r229_withdraw_renders_as_sent.sql` | |
| 161, 168 | Implemented. Decline returns the decliner to none with Connect available | `20260908200200_b4_connect_rpcs.sql` (`respond_to_request`) | |
| 163, 164 | Implemented. Single-value filters; skeletons match the shape; filtered-empty copy verbatim | `ConnectSurface.tsx:191-207, 586-622` | |
| 167, 170, 173 | Implemented. DIA once per screen; empty rail renders no landmark; filters act on Members only | `ConnectSurface.tsx:293-301, 457-513` | |
| 175 to 181 | Implemented. Portrait-led card at 96 and 120, actions in the head row, display name at 24, chips ordered server-side, no resting shadow, lens column on `--bg-sunken` | `MemberCard.tsx`, `ConnectSurface.tsx:264-268` | |
| 185 | Implemented. Descriptor cap 72 | `src/components/strand/LensBar.tsx:218-220` | |
| 186, 216 | Implemented. `member_blocks` is chassis; its writer is `src/lib/blocks.ts`; `private.is_blocked` filters every projection | live policies, `blocks.ts` | |
| 213 | Implemented and confirmed live. A Private member leaves Members; `send_introduction` refuses | `20260909160000_fix_pr_01_rulings_212_216.sql:1124-1159` | |
| 215 | Divergent, High. Gate: invite boundary. `connection_requests_member_insert` (with check `from_member_id = auth.uid() and status = 'pending'`) and the `insert` grant to `authenticated` both survive on the live project, so a member can insert a pending request directly over PostgREST without `is_blocked`, the decline window or ruling 213's Private rule. Verified live as Member Test: a direct insert addressed to Owner Test was accepted, then rolled back; the count as table owner afterwards was unchanged. Ruling 215 closed `publish_post`'s branch (F16, ruling 269) and not the grant, so "one write path into connection_requests" holds for the app and not for the API. The sender cannot read the row back (157), which is why the app never notices | live policy `connection_requests_member_insert`, live column privileges on `connection_requests` (INSERT to authenticated), `20260906170200_b1_rls.sql:356`, `20260908200100_b4_connect_rls.sql:263` (revokes update and delete only) | High |
| 224, 225 | Divergent, Low. The live project records a migration `20260909051113 r198_profile_view_block_scope` (a `do` block rewriting `profile_view` for the block scope) that has no file in the repo; the repo carries `r198_block_semantics` only. The current `profile_view` body is reproducible because three later migrations redefine it in full, so the state is reproducible and the history is not | live `supabase_migrations.schema_migrations` (28 rows) against `supabase/migrations/` (27 files) | Low |
| 243 | Not seeded. `corridors` is empty; ruling 243's Los Angeles to Accra row is due "before invites" | live count | see section 5 |
| SPEC section 1 | Stale, Low. The Connect SPEC still names the filter key `segment` with four values; the URL key is `stance` with five (ruling 300). Ruling 182 says the SPEC is corrected when the page wins | `docs/connect/SPEC.md:16`, `connect.ts:66` | Low |

### 5.2 Unruled: what a member can see or do on Connect that no ruling or SPEC describes

- U-N1. Suggestions are fetched with a nine-second client timeout and cached for five minutes; filter options are cached for ten (`connect.ts:288`, `ConnectSurface.tsx:271-301`). A dismissal or a new connection does not refresh the rail until the cache expires or an action invalidates it.
- U-N2. The Members lens returns eight chips per card and the card shows the first two (`MemberCard.tsx:248`, live card payload). Six values the member set travel to the client and never render.
- U-N3. A refused write toasts "An introduction needs a message.", "That request is no longer waiting." or the generic line (`connect.ts:352-356`). The server's own refusal wording never reaches the member.
- U-N4. Accept, decline, follow and dismiss update the card optimistically before the server answers (`ConnectSurface.tsx:323-366`); a refusal leaves the optimistic state until the next fetch.
- U-N5. The intro sheet's message field autofocuses and its counter reads "{n} characters left" (SPEC section 7) from a 300 cap enforced on both sides (`ConnectSurface.tsx:882-895`).
- U-N6. The Where lens's pick sets `location` and keeps every other filter (SPEC section 5); the Where floor lives in `private.connect_settings` and the function falls back to five if the row is absent (`20260909160000_fix_pr_01_rulings_212_216.sql:1087`).
- U-N7. Rail DIA rows show their Connect button only while the relationship is none (SPEC section 14 item 7).
- U-N8. The Connect card's name button opens `/m/:handle` with no search, so a card opened from a filtered Members list returns to an unfiltered Connect on Back (`ConnectSurface.tsx:391-392`).

---

## 6. Block (Brief 4A; rulings 186, 198, 207 to 211, 216, 220 to 222, 305)

### 6.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 198 | Implemented and confirmed live. The trigger `on_member_block_revokes_relationship` revokes connect and follow edges, deletes adjacency and follow rows and rebuilds second degree; `profile_view` drops the blocked viewer to the anonymous rule and hides no page | live trigger list, `20260910101135_b4a_block_control_directional_scope.sql` | |
| 207 | Implemented. No report item, no placeholder | `ProfileBlockControl.tsx:284-296` (one menu item) | |
| 208 | Implemented. Block and unblock in the visitor masthead overflow only | `ProfileSurface.tsx:1240-1247` | |
| 209, 220 | Implemented. Attestations survive; Anchored sections survive for the blocker | `profile_view` body (B4A section 6) | |
| 211 | Implemented. Both sheets verbatim, no numerals, no toast, unblock restores nothing | `ProfileBlockControl.tsx:225-245`, `blocks.ts:29-39` | |
| 216 | Implemented. The writer is a plain insert under the blocker's own policy | `blocks.ts:20-27`, live policy `member_blocks_owner_insert` | |
| 221 | Pending in Strand. The overflow is page-local as B4A section 4 permits | `ProfileBlockControl.tsx:36-61` | |
| 222 | Implemented on this control: heading focus in, Tab trap, focus back to the trigger | `ProfileBlockControl.tsx:142-182` | |
| 305 | Confirmed. Four block arms in the matrix and three live arms under 218 exist | `tests/block.cjs`, `tests/live-checks.cjs:580-771` | |

### 6.2 Unruled: what a member can see or do on the block control that no ruling or SPEC describes

- U-B1. The overflow panel flips to the trigger's right edge when it would cross the frame at 360 and 390 (`ProfileBlockControl.tsx:82-86, 101-108`).
- U-B2. On compact the confirm sheet hugs its content instead of taking Strand's full-frame height (`:305-307`).
- U-B3. A failed block write toasts the profile's generic "That did not go through. Try again." and names no block (`ProfileSurface.tsx:517-528`); B4A section 8 leaves the failure state to Code.
- U-B4. A blocked pair's pending request is left as it stands (G2 records this) and neither party can see it.

---

## 7. Auth (Brief 4B; rulings 23, 28, 76, 94, 230 to 236, 238 to 240, 261 to 264, 270 to 272, 278, 280, 282, 285, 318, 339 to 342)

### 7.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 28 | Implemented. Reset copy says one hour, once; the recovery flag has a one-hour TTL | `src/routes/reset.tsx:72`, `src/lib/recovery.ts:13` | |
| 230 | Implemented. `/reset`, `/reset/new`, `/password`, and the "Forgot your password?" link | `reset.tsx`, `reset_.new.tsx`, `src/routes/_shell/password.tsx`, `sign-in.tsx:263-282` | |
| 232 | Implemented. A provider mark appears on its own button and nowhere else; no tier from OAuth | `src/components/dna/AuthSurface.tsx:153-190` | |
| 233 | Implemented. Email and password, Google, LinkedIn; no Apple | `src/lib/auth-flow.ts:14` | |
| 234 | Unproven by design (G11); the arm reports UNPROVEN | `tests/auth-identity.cjs` | |
| 235 | Implemented. A provider sign-up lands in onboarding with the name prefilled and nothing else | `__root.tsx:164-219`, live `onboarding_state()` | |
| 240, 318 | Implemented. Recovery captured before the client is created; the gate holds every route at `/reset/new`; functional updaters leave a done stage alone | `recovery.ts:83-101`, `__root.tsx:144-155`, `reset_.new.tsx:59-65` | |
| 261 | Implemented. Breached-password copy on sign-up, reset and change | `auth-flow.ts:46-47`, three routes | |
| 262, 264 | Divergent, Medium. The auth alert's border and icon use `--danger`; the field flag rule, Strand's `Input` error state and `Button`'s danger variant use it too; `strand.css` still defines `--danger` and `--danger-tint` as legacy aliases in the light block only. Ruling 262 rules the alert onto `--error`; ruling 264 says the alias is removed rather than completed and never cited. The alias re-resolves in dark through `--error`, so nothing renders wrong; the rule is about the citation | `AuthSurface.tsx:108, 118`, `strand.css:76-77, 302`, `src/components/strand/Input.tsx:37, 70`, `Button.tsx:26` | Medium |
| 270 | Divergent, Medium. The sign-up "Check your email" body still reads "It works once and for one day." Ruling 270 corrected it to one hour on the page | `sign-in.tsx:180` | Medium |
| 271, 272, 236, 238, 239, 280, 339, 340, 342 | Not verifiable from the repository: mail templates, SMTP, redirect allow-list, provider consoles and notification toggles live in Supabase, Google and LinkedIn consoles. Recorded under section 11 | | |
| 264 | Observation, Low. Nineteen custom properties are defined in the light block and not the dark: the two `--danger` aliases, `--c-system` and its two rungs, `--c-stroke`, `--pulse-none`, six `--logo-*` reference values and six semantic aliases. All but the aliases are theme-neutral or re-resolve; ruling 264 asks Strand for a check that every property appears in both blocks and none exists here | `strand.css:14-151` | Low |
| 94, 231 | Console state; not verifiable from the repository | | |

### 7.2 Unruled: what a member can see or do on the auth surfaces that no ruling or the B4B report describes

- U-A1. Sign-up collects a display name as well as the address and password (`sign-in.tsx:232-240`); ruling 22 makes the waitlist email-only and ruling 307 makes onboarding the place the name is asked, so the name is asked twice.
- U-A2. The confirmation link is sent with a redirect to `/feed` (`sign-in.tsx:125`), after which the onboarding gate takes over.
- U-A3. Busy labels: "Signing in", "Creating your account", "Sending", "Setting your password", "Changing" (`sign-in.tsx:284-291`, `reset.tsx:105`, `reset_.new.tsx:205`, `password.tsx:157`). The B4B report records the pattern, not the strings.
- U-A4. A cancelled provider round trip renders a status line, an errored one an alert, both naming the provider (`auth-flow.ts:52-55`).
- U-A5. The minimum password is ten characters, stated in words (`auth-flow.ts:39, 45, 51`).
- U-A6. The change-password page cancels to the previous history entry, else to the Feed (`password.tsx:35-38`).
- U-A7. The provider marks are neutral placeholders (G10).

---

## 8. Onboarding (Brief 5; rulings 235, 242, 244, 247, 248, 293 to 300, 307 to 309, 311, 320 to 338)

### 8.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 242, 244 | Implemented. World list from `vocabularies()`; open signup with no invitation gate | `src/routes/where.tsx:24-29`, `sign-in.tsx` | |
| 247, 297, 333 | Implemented and confirmed live. Default stance exploring; `stance_declared_at` set only when touched; the five seeded members carry null; Owner Test declared, Member Test not | live `members`, `20260911052909_b5_stance_onboarding.sql` (`onboard_relationship`) | |
| 248, 321 | Implemented. One explainer sheet, three parts, copy verbatim | `OnboardingSurface.tsx:118-157, 831-1017` | |
| 293 to 300, 331 | Implemented. Five cards in order, bodies and labels verbatim to ruling 300, heading, sub-heading and footer verbatim; filter label "Relationship to the continent" on Connect | `OnboardingSurface.tsx:70-115`, `connect.ts:66` | |
| 307 | Implemented and confirmed live. Three screens, each writes on completion, resume to the first incomplete screen, gate in the root route, exit to the Feed and nothing after | `__root.tsx:164-219`, `src/lib/onboarding.ts:169-187`, live `onboarding_state()` | |
| 308, 309 | Implemented. No numeral, step counter, progress or deadline on any screen | sweep 6, section 10 | |
| 311 | Implemented. Company-facing emits per screen, time on screen three, entry path, explainer opens | `supabase/functions/onboarding/index.ts:81-161` | |
| 320, 327, 329 | Implemented. Cards stack below expanded, one row of five at expanded, chosen line hides on first touch and never returns | `OnboardingSurface.tsx:574-586, 732-748` | |
| 322 | Implemented. No five-C content in onboarding; the parked short-form draft is not in the tree | grep of `src/` and `public/` for the draft name, tour and affirm: none | |
| 323, 324, 326, 328 | Implemented. Photo states, username suggestion and taken alert, required controls, lead and hint verbatim | `OnboardingSurface.tsx:42-60, 316-359` | |
| 325 | Divergent, Medium, wants a brief ( ). The counter `members.username_changes` exists and `onboard_who` increments it, but no surface and no write path lets a member change their username after screen one: `save_profile_section('core')` takes name and headline only and `handle` is not in the members update grant. The ruling promises two changes in the life of an account and the product offers none | `20260911052909_b5_stance_onboarding.sql:566-572, 1188-1193`, live column privileges on `members` (UPDATE excludes `handle`) | Medium |
| 330 | Implemented. Avatar at 96 and 120, radius 18, 4 px plate | `OnboardingSurface.tsx:361, 402-408` | |
| 334, 335 | Implemented and confirmed live. Three to forty on both sides; `members_stance_declared` trigger stamps a later change | `onboarding.ts:189-198`, live trigger list | |
| 336 | Implemented. `handle` is the username; `who_completed_at` marks screen one | live `members` columns | |
| 338 | Confirmed live. Both test accounts onboarded through the surface; Member Test's stance is exploring with declared false | live `onboarding_state()` as Member Test | |
| 345 | Implemented. Thirty-second bound, every rejection surfaces, client conversion first | `onboarding.ts:211, 226-269` | |

### 8.2 Unruled: what a member can see or do in onboarding that no ruling or SPEC describes

- U-O1. Removing a chosen photo disables Continue again with no message (`OnboardingSurface.tsx:447-467, 334-338`); the SPEC gives the chosen and empty states and not the transition.
- U-O2. A username with a leading or trailing hyphen, or under three characters, silently disables Continue rather than showing the taken alert or any other (`:334-338`, `onboarding.ts:192-198`).
- U-O3. The explainer's "Got it" sits in a pinned footer on compact and inline at 280 wide otherwise (SPEC section 7); opening it emits a company-facing event carrying the currently selected stance (`onboarding.ts:161-163`).
- U-O4. The five seeded fixture members carry `onboarded_at` null on the live project. If any of them were ever given an auth account they would be routed to onboarding and asked for a photo (live `members`).
- U-O5. A sign-up that arrives mid-audit: a member `walkthrough-test-account` was created on the canonical project at 16:02:14 UTC while this audit ran, not yet onboarded (live `members`). Ruling 358 names the walkthrough as a human on real devices; this row is consistent with one having started. Recorded because the live state moved during the audit, not as a finding.

---

## 9. Media pipeline (rulings 345 to 353) and the username fold (343, 350)

### 9.1 Implemented and as ruled

| Ruling | Status | Evidence | Severity |
| --- | --- | --- | --- |
| 346 | Implemented. One write path (`media-upload`), one master, one `media` row, Tinify switchable, delivery by Storage transform | `supabase/functions/media-upload/index.ts:265-400`, `src/lib/media.ts:87-100` | |
| 346 | Observation, Low. `media` has zero rows while `post_media` has ten and every seeded avatar path predates the table; no backfill was ruled and none exists, so the masters uploaded before 11 September have no registry row | live counts | Low |
| 347, 352 | Implemented. Canvas re-encode strips on the client; byte-level strip of APP1, COM, PNG text chunks and WebP EXIF and XMP on the server, before and independent of Tinify | `media.ts:24-68`, `media-upload/index.ts:73-169, 304-307` | |
| 348 | Pending by ruling. Columns exist, no component | live `media` columns | |
| 351 | Implemented. The stored master is the client-normalised bytes; the server never rewrites pixels, only re-encodes through Tinify at the same edge for the avatar | `media-upload/index.ts:359-362` | |
| 353 | Implemented as ruled. Composer and cover keep the fit-to-2000 pass; `verify_jwt` is on for all five functions; `media-upload` is at version 8 | live function list | |
| 345 | Observation, Low. The server has no timeout of its own on the two Tinify calls; the client's thirty-second bound is the only one | `media-upload/index.ts:229-263` | Low |
| 353 | Observation, Low. The function's `GET` health check answers whether Tinify is configured to any holder of a valid JWT | `media-upload/index.ts:267-271` | Low |
| 343, 350 | Implemented and confirmed live. `private.derive_username` and `deriveUsername` fold NFKD and strip combining marks; live: "Jaûne L Odombrown" gives `jaune-l-odombrown`, "José Núñez-Ålund" gives `jose-nunez-alund`, "Søren Ødegård" gives `sren-degard` and a CJK name gives null, exactly the residuals G15 records | `onboarding.ts:47-60`, `20260911074558_r343_username_fold.sql`, live `derive_username` | |
| 343 | Divergent, Low (G15, known). Screen one's hint still promises a suggestion for a name that folds to nothing | `OnboardingSurface.tsx:49-50` | Low |

### 9.2 Unruled: media and username decisions no ruling describes

- U-M1. The normalised master is JPEG at quality 0.85 with a white ground painted behind transparency, fitted to 2000 px (`media.ts:12-13, 55-58`).
- U-M2. The avatar is delivered at 480 px square through a signed transform with a one-hour expiry and falls back to the untransformed master (`onboarding.ts:214, 272-280`, `media.ts:87-100`).
- U-M3. The bucket ceiling is ten megabytes on both buckets and the post bucket accepts three mime types (`media-upload/index.ts:22-27`).
- U-M4. Storage paths are `{member}/{uuid}.{ext}` for profile media and `{member}/{post}/{uuid}.{ext}` for post media (`media-upload/index.ts:313`); G12 records the one object filed under a consumed post id.

---

## 10. The chassis pass

Each cross-cutting rule, where it holds and where it does not.

**Grounded-or-empty (locked doctrine, rulings 15, 113, 125, 164).** Holds on the Feed (ghosts, per-lens empty states, no fabricated card), the rails (honest empty lines), notifications (no dot without a row, confirmed by `hasUnread`), Profile (activity sections, badges, DIA line, attestation rail render nothing without rows), Connect (Suggested empty without a reason, Where empty below the floor, confirmed live: `connect_where()` returns two empty groups), onboarding (chosen line only while the default is untouched) and the dock (no pulse data, no dot). No surface fails it.

**No numbers, rebalanced (rulings 254 to 258).** Holds everywhere a number is about another member or an aggregate: no count, percentage, meter, progress or step counter renders on any surface (sweep 6). Three numerals render, all about the member's own edit in progress and visible only to them (About's "N of 500", the intro sheet's "N characters left", the composer's "Drop to add up to N images"), which ruling 254 permits. Ruling 257's single owner-only surface for self-facing counts does not exist yet; no surface distributes such counts either, so nothing contradicts it. Server-side, `second_degree.via_count`, the suggested lens's `hits` and `post_dia.confidence` never leave the database to a member (live grants and policies).

**Audience as row policy (rulings 124, 139, 212, 213).** Holds on Profile (`profile_view` through `private.admit_section`, confirmed live for Anchored), on posts (the `posts_member_select` policy carries everyone, connections, anchored and the symmetric block filter; the `feed` view is `security_invoker`), on Connect (`admit_member` and `admit_section` inside every projection; a filter over a withheld attribute cannot match) and on Storage (both buckets private; profile media through `can_see_core`). Feed lenses are PostgREST predicates over the policy-visible set, never a client filter. Holds on every surface.

**The Digital Trust Layer (rulings 139 to 141).** Holds on both public projections, confirmed live: an unshared attester renders as "the host" or "a Space lead" for anon and by name for a signed-in member. Holds on `connection_request_intros` (block-filtered, no status). Holds on Where (names of countries only). No signed-out surface other than `/m/:handle` exists, so no other surface can fail it.

**Vocabularies as tables (absolute; rulings 142, 187, 193, 194).** Holds for every list a member picks from: focus areas, industries, regions, skills, languages, intents, interests, both country lists, stances, heritage, pathway, timeline and instrument all arrive from tables or enums through `vocabularies()` and `connect_filter_options()` with no fallback literal (sweep 4). Exceptions, all Low: `["Free", "Paid"]` beside `ticket_kind` (G4, deliberately left), the Edge Function's own instrument and ticket enums (`dia-compose-read/index.ts:62, 67, 140`) and the onboarding function's stance set (`onboarding/index.ts:30`), which the G4 sweep did not cover because it covered `src/` only. The five stance cards carry their titles as copy under ruling 331; the titles match `member_stances` labels today and nothing checks that they keep matching.

**One read projection and one write path per surface (absolute; rulings 188, 215).** Holds on Profile (`profile_view`, `save_profile_section`, with switches, visibility, media and pattern all routed through the one write), Connect (four projections, five writes; Profile's relationship writes route through them), Feed (one view; saves and reactions are ruled own-row table writes under ruling 90), notifications (one table read and one column update, Brief 2), onboarding (one projection, three writes through one function). Two departures. High: `connection_requests` has a second writer over PostgREST for `authenticated` (section 5, ruling 215). Low, observation: composer drafts are written by the client directly into `post_drafts` under own-row policies (`drafts.ts:72-80`) while everything else on the surface goes through `publish_post`; ruling 56 says server-side drafts and does not say how they are written.

**Every table ships with RLS (absolute).** Holds on every table in `public`: fifty tables, RLS enabled on all, policies on all (live `pg_class` and `pg_policy`). `private.connect_settings` has RLS off and no grant to any API role in a schema PostgREST does not expose (Low, observation). `public.media` carries member select of own rows, admin select and service role; it has no anon, Space lead or event host policy because none applies. The Supabase advisor's only security lints are the fifteen SECURITY DEFINER functions executable by `authenticated` and the two by `anon` (`profile_view`, `public_attestations`), which rulings 127 and 135 intend.

**The asset contract (rulings 184, 191, 192, 195, 197).** Holds: no logo or icon is imported as a module or inlined; every reference resolves by path; every wordmark is sized by height with width auto (sweep 8). `favicon.ico` is absent as 197 rules; `favicon.png` remains the founder's 64 px file as 195 records.

**Theme parity (rulings 57, 264).** Holds for every rung and semantic state; nineteen light-only properties remain, listed under Auth, none of which renders wrong today.

**Viewport stability (rulings 344, 349).** Holds in the code (insets once in the shell, `dvh` on full-height surfaces, the C deck bleed capped) and the width arm exists at fourteen stops per viewport in both engines. Not re-run here.

**Copy rules (sentence case, no exclamation, no em dash).** Hold across every DNA component and route (sweep 9); the only breaches are the two Lovable template pages (U-S6).

**Chrome on every route (ruling 69).** Holds on every DNA route; fails on the template 404 and error pages (U-S6, Low).

**Lovable discipline (rulings 146, 184, 286).** Holds: sixteen founder-bot commits on `main`, all of 9 September, all visual, none touching `supabase/`; nothing since.

---

## 11. Rulings with no implementation anywhere

Each is either a gap the register should carry or a ruling to retire. Rulings whose subject is an engine brief not yet issued (Convene, Collaborate, Contribute, Convey, Messaging, System Admin, User Settings, revenue) are not listed; they are scope, not gaps.

| Ruling | What is missing | Reading |
| --- | --- | --- |
| 12, 13 | A Pulse read model over the notification store and an ambient Pulse scoped to the member's network. The dock renders pulse dots from a `states` prop nothing supplies | Gap, Brief 2's successor |
| 60 | Offline shell and install prompt. The manifest exists; no service worker does | Gap, chassis |
| 47 | Guardrail 5, "attested member accepts before it renders": `attestations` has no acceptance column and every attestation renders on insert. Guardrails 2 to 4 have no insert path to enforce against because no member can insert | Gap, the first engine that writes an attestation |
| 46, 48 | Badges as Adinkra symbols per attested context. `BadgeRow` renders the C glyph in a pill labelled "Attested in {C}"; no badge symbol set distinct from the five C glyphs exists, and ruling 66 reserves those five for the Cs | Gap, Design |
| 243 | The Los Angeles to Accra agriculture corridor row, due before invites; `corridors` is empty | Gap, invite boundary |
| 246 | A shareable invite link with an Open Graph card | Gap, its own brief |
| 253 | The introductions lifecycle | Open by ruling |
| 257 | The one owner-only surface for self-facing counts | Gap, wants a brief ( ) |
| 291 | A publish failure that says so in words | Open by ruling; the composer is silent today |
| 325 | A path to change a username after onboarding (section 8) | Gap |
| 348 | ImageAdjust | Pending by ruling, Design first |
| 221, 222 | Strand `Menu`, and focus management in Strand's `Sheet` | Pending in Strand; four sheets have no focus handling today |
| 10 | Opt-in for push and email. In-app record only exists; no channel and no preference | Scope until Settings |
| 5, 123 | Identified tier through a verification provider. `identified_at` exists and only service role can set it; nothing sets it | Scope until KYC |
| 27, 23 | Indexability decision; LinkedIn ratification | Open by ruling |

---

## 12. What was not covered, and why

- The deployed URL. Ruling 61's exit check and ruling 190's habit of stating results were both honoured by not claiming them: this session's network policy refuses `app.diasporanetwork.africa` and every `pages.dev` preview (CONNECT refused at the proxy), so no rendered surface, no theme, no viewport and no browser was checked from here. Every layout claim above is read from the code and the SPEC, not seen. The matrix result on `main` is stated as recorded in section 0.
- The responsive matrix and the live-check suite were inventoried, not run. Their declared counts and arms are as `tests/expected-counts.json` and `tests/live-checks.cjs` state.
- Supabase, Google and LinkedIn console state (rulings 236, 238, 239, 271, 272, 280, 339 to 342, 94, 231). Not readable from the repository or the SQL endpoint.
- Real devices (ruling 358): no camera, no notched phone, no mail, no consent screen.
- Ruling 234's identity linking (G11): the arm needs a human's two sign-ins and a service-role key.
- The WebKit crash class (G5, rulings 200 to 206, 265, 268, 284, 304): a matrix defect, not a product conformance question.
- Edge Function runtime behaviour beyond their source: the deployed `media-upload` is version 8 and the others are as listed; the deployed bytes were not diffed against the repo.
- The Strand project itself and the Claude Design pages: ruling 276 keeps the pages off Code's reading list, and Strand's own guide was not read; SPECs were the visual contract.
- Anything an engine brief owns: Convene, Collaborate, Contribute, Convey, Messaging, System Admin, User Settings and the revenue thread.

---

## 13. Closing report

Divergences by severity, counting each finding once: **3 High, 12 Medium, 22 Low.** Unruled items recorded across the ten surfaces: **70.** Rulings with no implementation anywhere, outside engine scope: **15.**

The three largest.

1. **Ruling 215, Connect, High, gate invite boundary.** `connection_requests` has a second writer: the B1 insert policy and the `insert` grant to `authenticated` survive, so a direct PostgREST insert reaches a member without the block filter, the decline window or the Private rule. Verified as Member Test and rolled back. Fix PR 01 closed the composer's path and reported the table as having one writer; the API disagrees.
2. **Ruling 69, Feed, High.** Every other member's post is authored by "Member". The `feed` view carries no author columns and the client resolves none, while the core row it would need is readable to every signed-in member. The Feed has shipped this way since Brief 2 merged.
3. **Rulings 119, 215 and 53 together, Composer, High.** The Connect verb is offered everywhere and works only from a profile. From the Feed, including its own first-run empty state, a Connect post is refused by `publish_post` and the composer shows nothing, because ruling 291 is open. The chip, the kicker and the DIA line also still say Intro.

Two things the brief listed as known before the start were confirmed and not re-argued: the Profile's visible Segment label (ruling 336) is still there, with the omission of Kin from its empty line added here; the `--danger` alias is still cited on four surfaces and still defined in Strand's light block. The `member_segments` rename is complete on the live project. The five-C short-form draft has not leaked into any surface. `docs/GAPS.md` G1 to G15 are consistent with what was found, and this audit adds nothing to that file.

Two patterns worth naming as observations, not rules (ruling 205). Copy drift lands where a later ruling changed a word and the earlier surface kept it: Intro on the composer, Segment on the profile, one day on sign-up, the Private effect line after 212. And SPECs are corrected by ruling 182's standing rule less often than the register moves: the Connect SPEC's `segment` key and the profile SPEC's "Segment block" heading are both stale against ruling 300.

Results are stated as results. Nothing in this document describes a check as running.
