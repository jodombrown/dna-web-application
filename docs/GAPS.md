# Gap notes

Things the build knows are missing, with the ruling that put them here. A gap is not a defect: it is
work that was deliberately not done, recorded so it is not rediscovered by accident. Notion is the
source of truth for the Gap Register; this file is the repo's working copy, and it carries only gaps
a reader of this codebase would otherwise have to infer from an absence.

Phase posture (ruling 140): the canonical project holds no real member data, so visibility, RLS and
consent findings are recorded with a severity and tracked. None of them blocks a merge. They are
invite-boundary gates, to close before the first real member invite.

## G1. Block and report have no surface (ruling 186)

**Severity: high at the invite boundary. Not a merge blocker (ruling 140).**

`public.member_blocks` exists and is enforced, but nothing in the app writes to it.

Ruling 50 places block and report in the chassis, on every surface. The chassis shipped without a
block store, so `member_blocks` was created inside Brief 4 to give Connect's projections something
to filter on. Ruling 186 moves its ownership out of Connect and corrects the register: block and
report were **not** built in the chassis.

What exists:

- The table, with RLS: the blocker selects, inserts and deletes their own rows; the blocked member
  never learns the row exists; admin may select and delete; service role has full access.
- `private.is_blocked(a, b)`, symmetric, applied as an absolute filter on every projection that
  returns a member (see the audit below).

What is missing:

- Any writer. No Block action on a member card, a profile, a post, a thread or a sheet, so in the
  running app the table can only ever hold rows put there by hand.
- Report entirely: no report object, no reason vocabulary, no queue, no admin surface. Ruling 115's
  human review queue has no inbox.
- An unblock surface, which the delete policy already permits but nothing calls.

Where it belongs: the chassis, not an engine. Convene, Collaborate, Contribute and Messaging all
filter on the same table (ruling 186), so the surface is written once and every engine inherits it.
Its brief also has to settle what a block does to work already shared between the two members, which
is a product question no ruling has yet answered.

What that brief no longer has to settle: what a block does to a profile and to the relationship.
Ruling 198 answered both, and the enforcement sits in `profile_view` and in a trigger on
`member_blocks`, not in a write path, so the Block action inherits the semantics rather than
restating them. The gap here is still the whole surface: no Block, no unblock, no report.

## G2. What a block means on a profile — closed (ruling 198)

**Closed 9 September 2026. The gap was a missing decision, not missing code, which is why PR #10 was
right to report it rather than patch it.**

The finding: with a block in place, `profile_view('<blocker>')` called by the blocked member returned
the full profile. Every projection inside the payload behaved; the subject itself was unfiltered.

Ruling 198 settles it. A block removes discovery and contact, drops the blocked party to the lowest
audience scope, and revokes the relationship in both directions. It does not hide the profile.

- Audience scope: the blocked viewer gets the public projection, enforced in `profile_view` as row
  policy through the same `private.admit_section` predicate every other viewer goes through, given a
  null viewer. No connections-scoped section, no anchored-scoped section, no mutual name, no shared
  Space, no anchored qualification, no DIA line, and third parties as roles rather than names.
- Actions: no relationship object at all, so the surface renders no Connect and no Follow, in either
  direction. `private.is_blocked` is symmetric and so is this.
- The relationship itself: the connect and follow edges are revoked (not deleted, so the history
  stays auditable) and the adjacency and follow rows removed, by a trigger on `member_blocks` rather
  than by a write path, so every future writer of that table inherits the semantics.
- The profile shell still loads. Hiding it discloses the block — a page that opened yesterday and
  fails today says exactly what happened — and is circumvented by signing out, so hiding is both
  leaky and legible. This is neither. The answer this file previously called "the stronger reading"
  was rejected for that reason.

Accepted cost, recorded so it is not reopened by accident: a member who blocks someone will find the
blocked person can still read their public page, and that will feel like the block did less than they
asked for.

Verified live on 9 September 2026 with a real block in place, both directions, as a member rather
than by reading the SQL, and the database returned to its prior state afterwards. What was not
changed and is not a defect: a pending `connection_requests` row between a blocked pair is left as it
stands. Neither party can see it — every projection filters the pair, and the sender has no direct
read on the table (ruling 157) — and withdrawing it would be a status change nobody asked for.

## G3. Multi-select filters on Connect (ruling 163)

**Severity: low. Deliberate scope cut, not a defect.**

Filters are single-value at launch, one value per axis across ten axes. Multi-select on skill, focus
area and industry was logged rather than built, because it turns the chip row, the URL scheme and
the empty-state copy into their own design problem. `docs/connect/SPEC.md` §13 refers to this as the
"logged gap"; this is where it is logged.

## G4. Hardcoded vocabularies in merged surfaces — closed (rulings 193, 194)

**Closed 9 September 2026. Recorded rather than deleted, because the shape is worth remembering.**

Ruling 187's work turned up that Profile had been reading segment labels from two hardcoded maps in
`SegmentBlock.tsx` since Brief 3 merged (ruling 145), against the standing rule that fixed
vocabularies are database tables read at runtime. Those went with ruling 187. The sweep of the other
merged surfaces found three more, and rulings 193 and 194 closed all three:

- `src/components/strand/SegmentBlock.tsx`, `SEG.returnee.fields[0].options` — the four
  `return_timeline` values, sitting beside `timelineOptions` as its fallback, so the literal shadowed
  the live source rather than being replaced by it. Surface: Profile (Brief 3). Removed; the select
  reads `vocabularies().timeline` or renders no options.
- `src/components/strand/verb-schema.ts`, the Contribute verb's `instrument` options
  (`["Time", "Skills", "In-kind"]`). Surface: Composer (Brief 1). Removed; the options arrive as
  `fieldOptions.instrument` from the same projection.
- `src/lib/feed.ts`, `INSTRUMENT_LABEL`. Surface: Feed (Brief 2). Removed; the labels come from the
  projection, and a Need whose vocabulary did not load renders no instrument row.

The open question the earlier entry left — whether an enum counts, when CLAUDE.md's absolute names
tables — was answered by ruling 193 on the precedent already in the code: `heritage_kind`,
`return_pathway` and `return_timeline` are enums and were already served at runtime through
`enum_range`. `contribute_instrument` now goes the same way. Its labels are derived from its values
in the projection rather than listed, because a list in SQL is the same anti-pattern relocated.

`public.profile_vocabularies()` is now `public.vocabularies()`: the projection serves three surfaces,
so it is no longer Profile's, and ruling 193 says rename the path rather than add a second one. The
old name was dropped in the same migration, not kept as an alias.

Deliberately not findings, listed so the sweep is not re-run over them (the G4 exclusions, ratified
by ruling 193): the five Cs and their labels, glyphs and copy (`cmeta.ts`, `cinfo.ts`, `VerbChip`,
`BadgeRow`, `Composer`'s DIA lines), audience labels and section titles (`ProfileSurface`),
notification kinds (`NotificationListItem`), lens ids (`lens.ts`, `connect.ts`), relationship states
(`MemberCard`), and the generated enum constants in `src/lib/database.types.ts`. These are structure,
doctrine or UI copy, not vocabularies members choose values from, and none can drift from the
database because the database does not own them. Convene's `ticket_kind` (`["Free", "Paid"]` in
`verb-schema.ts`) is the one adjacent case this PR left alone: it is a Brief 5 surface's vocabulary,
not one of the three sites the audit found, and widening the sweep into it was ruled out.

## Audit: `member_blocks` as an absolute filter (ruling 186, item 4)

Run against the canonical project on 9 September 2026, as a real member with real blocks, not by
reading the SQL. A block was inserted, every projection that returns a member was called from both
sides, and the database was returned to its prior state (zero block rows, `where_floor` back to 5).

| Projection | Blocker's view | Blocked party's view | Result |
| --- | --- | --- | --- |
| `connect_cards('members')` | blocked member absent | blocker absent | pass, both directions |
| `connect_cards('suggested')` | blocked member absent | blocker absent | pass, both directions |
| `connect_cards('network')` (connections, requests, sent, following) | blocked member absent | blocker absent | pass, both directions |
| Mutual names (`connect_card`, `profile_view.mutuals`) | mutual emptied | mutual emptied | pass, both directions |
| DIA rail rows (`connect-suggest`) | inherits `connect_cards('suggested')` under the member's own JWT | same | pass, both directions |
| `connect_where()` underlying counts | country tile disappeared | country tile disappeared | pass, both directions |
| `connection_request_intros(ids)` | **returned the other party's name** | **same** | **failed; fixed in this PR** |
| `profile_view(handle)` subject | returned the profile | returned the profile | **failed; logged as G2, not fixed** |

The `connect_where` rows sit below the floor of five on real data, so that line was proved by
dropping `where_floor` to 1 for the two calls and restoring it to 5 immediately after.

## G5. The WebKit web-process crash in the Profile owner flow (ruling 200)

**Severity: medium. Open, narrowed to one property and one element class, not fixed. The cause sits
in Strand and in a ruled style, so this file reports it rather than changing it.**

Ruling 200 asked for a cause that explains three facts, not one: why all sightings were dark, why
all were the Profile owner flow, and why Chromium has never produced it. This entry answers the
first three by elimination with measured evidence, and stops short of a crash log, for the reason in
"What could not be done" below.

### What could not be done, and why

The method ruling 200 sets out is to reproduce locally in WebKit and capture the crash. That was not
possible in this session and the block is environmental, not a judgement call: this session's egress
policy refuses the WebKit binary. `playwright install webkit` and `npm i @playwright/browser-webkit`
both fail with

```
403 request blocked: no rule or allowlist entry allows host "playwright.download.prss.microsoft.com"
403 ... host "cdn.playwright.dev"
```

and no system WebKit (`WebKitWebDriver`, `MiniBrowser`, webkit2gtk) is present. Chromium is
pre-installed and was used instead. So there is **no crash log, no signal and no stack in this
entry**, and no flow bisect either, since a bisect also needs the engine that crashes. What follows
is an elimination performed in Chromium against the same DOM the crashing runs sampled, which is
sound for deciding _what differs_ between the crashing and non-crashing cases, and silent on the
crash itself.

### The measurement

The Profile owner flow was driven to the point run 62 sampled — edit mode, immediately before the
section saves — under `tests/matrix.cjs`'s mock, and every element's compositing-relevant computed
style was recorded: `opacity`, `transform`, `filter`, `backdrop-filter`, `mix-blend-mode`,
`mask-image`, `will-change`, `box-shadow`, `background-image`, `appearance`, `color-scheme`,
`isolation`, `contain`, `animation`. Four cells were compared: light against dark, owner against
visitor, read against edit, and before a section save against after.

The DOM matches the crashing runs. At 820x1180 (run 62's viewport) the flow reports 535 nodes, 71
options and 20 selects against run 62's 546, 71 and 20; options and selects match exactly and the
11-node delta is the dev server against the deployed build. Node counts are identical in light and
dark at every viewport, which confirms ruling 200's reading that this is not a DOM-size cliff and
adds that it is not a DOM-shape difference between the themes either.

**Finding 1, the dark discriminator.** Across the whole owner flow, in both read and edit mode, the
only computed-style difference between light and dark on any of those properties is
`color-scheme: normal` becoming `color-scheme: dark`. After removing `color-scheme` from the
comparison, the residual is **zero differing signatures**. Nothing else about the surface is
dark-specific.

That rules out, with evidence rather than by inspection, four of the five suspects ruling 200
listed. Pattern assets and the Adinkra badge set render through identical `mask-image` in both
themes (69 masked elements in each). `backdrop-filter` is `none` on every element in the surface,
`mix-blend-mode` is `normal` on every element, and the only `filter` is a hover `brightness()` on
`Button` and `PlaceTile`, in both themes. No dark-only token uses `color-mix`, `oklch` or relative
colour syntax: the `[data-theme="dark"]` block in `src/styles/strand.css` is plain hex, and the
`oklch` values in `src/styles.css` are defined in both `:root` and `.dark`, so they are live in
light too. Layer-inducing properties are identical across the themes (16 elements below opacity 1 in
each).

**Finding 2, the owner discriminator.** Native-appearance form controls exist only in the owner
view. Visitor and public mount **zero**; the owner read view mounts 16 and edit mode 26:

|                                | selects | options | inputs | textareas | native-appearance controls |
| ------------------------------ | ------- | ------- | ------ | --------- | -------------------------- |
| public / visitor, either theme | 0       | 0       | 0      | 0         | **0**                      |
| owner read, either theme       | 14      | 42      | 2      | 0         | **16**                     |
| owner edit, either theme       | 20      | 71      | 9      | 3         | **26**                     |

Of the 26 in edit mode, 16 are painted by the engine's own form-control theme while being invisible:
14 `VisibilitySelect` overlays (`appearance: auto`, `opacity: 0`, `position: absolute`, boxes of
174x34, 161x34 and 122x34) and 2 `Switch` checkboxes (`appearance: auto`, `opacity: 0`, and a
**0x0** box). The remaining 10 are the visible text inputs and textareas, also `appearance: auto`.
The six `Select` controls set `appearance: none` and are author-painted.

**Finding 3, the crash window is not an event.** A section save remounts nothing: across the `where`
save, all 26 native controls survived, 0 were newly mounted and 0 unmounted. So the "a save promotes
or animates many elements at once" reading in ruling 200's suspect 4 does not hold, and neither does
any remount-storm reading. The condition is standing, present from the moment the owner view paints,
not created by the saves.

### The named suspect

The intersection of finding 1 and finding 2 contains exactly one thing, and nothing else in the
surface is in it:

> **Native-appearance form controls painted through WebKit's form-control theme under
> `color-scheme: dark`** — 26 of them in edit mode, 16 of which are painted while invisible, two of
> those at a zero-area box.

It is the only candidate that explains all three facts at once. Dark, because `color-scheme: dark`
is the sole dark-specific property in the surface and it is precisely the property that switches a
native control onto the theme's dark branch. Owner, because the owner view is the only view that
mounts a native control at all, so visitor and public have nothing on that path to crash. Chromium
never, because Blink paints form controls itself in Skia and treats `color-scheme` as a colour-token
switch inside that same painting code, whereas WebKit's Linux port paints controls through a
separate native theme (`RenderThemeAdwaita`) with a distinct dark branch — a different code path,
reached only by the engine that crashes.

This is a suspect named by elimination, not a proven cause. The elimination is strong — the residual
after `color-scheme` is zero, and the owner/visitor split is 26 against 0 — but it establishes what
differs, not what faults. The confirming experiment is below and has not been run.

### Why nothing was changed

Ruling 200's guardrails both apply, and they point the same way.

Every element of the suspect set is Strand's, ported verbatim, and carries a ruling:

| Artefact                                                               | Provenance                                                                                   | Ruling   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `color-scheme: dark` on `[data-theme="dark"]`, `src/styles/strand.css` | ported verbatim from the extraction; the file header records that values are not edited here | 57, 98   |
| `Switch.tsx`, the 0x0 `opacity: 0` native checkbox                     | "Ported from Strand `components/core/Switch.jsx`. Behavior unchanged."                       | 98       |
| `Select.tsx`                                                           | "Ported from Strand `components/core/Select.jsx` (extraction 3654dd17). Behavior unchanged." | 98       |
| `VisibilitySelect.tsx`, the 14 `opacity: 0` native selects             | "Ported from `profile/strand-patch/Profile.jsx` (B3-Profile-v3). Behavior unchanged."        | 124, 136 |

So the fix, if the suspect is confirmed, is a Strand change and a reopened ruling 57 or 98, not an
edit to this repo's copy. Ruling 200 says so directly: a ruled style gets its ruling reopened rather
than being quietly changed, and a cause in Strand is reported as a Strand request. Nothing in
`src/` was touched by this investigation, and the case was not weakened, skipped, retried or
quarantined.

### Ruling 152 is corrected, not confirmed

Ruling 152 characterised this as a navigation-timing race that moves each run. The evidence does not
support it. The condition that separates the crashing cases from the passing ones is **static**: it
is present from the first paint of the owner view in dark, it is unchanged by navigation, and
finding 3 shows it is unchanged by the saves the crash sits on. There is nothing timing-shaped about
it.

What ruling 152 read as movement is sampling. The matrix varies viewport and theme; of the eighteen
Profile owner cases in a full run, the nine dark ones all carry the identical condition, in the
identical quantity — the DOM stats above are the same at 430, 820, 1280 and 1366 — and roughly one
gives out per run. A fault that fires on about one in nine identical at-risk cases lands on a
different viewport each time by construction. The viewport is not a variable; it is the label on
whichever at-risk case happened to be running. Ruling 152's own note that the crash appeared at
430x932, "the narrowest viewport, which a resource ceiling would not produce", is consistent with
this: viewport does not predict it because viewport has nothing to do with it.

The framing ruling 152 withdrew — cumulative resource — is not reinstated here either. Finding 3
rules out accumulation across the saves.

### The single next step

Run the Profile owner flow in **WebKit, dark, at 820x1180**, looping until it fires, in an
environment that can obtain the WebKit binary — CI, where the matrix already runs WebKit, since this
session's egress policy cannot. Do it in two arms and compare:

1. **Control.** Loop the unmodified flow and record how many iterations produce the crash. This also
   supplies the crash log, signal and stack that this entry lacks; capture them.
2. **Probe.** Loop the same flow with `page.addStyleTag({ content: '*{color-scheme: light !important}' })`
   injected after load. This is a test-time injection into the running page and changes no product
   code, no repo style and no pass criterion; it is a probe, not a fix, and not a quarantine.

If the crash stops in arm 2 across at least three times the control's mean iteration count, the
suspect is confirmed, and the change belongs in Strand under a reopened ruling 57 or 98 — not in
this repo. If it still fires in arm 2, the elimination above is wrong and the next place to look is
the six `appearance: none` controls and the author-painted surface, since `color-scheme` would then
have been excluded as the discriminator.

If fifty loops of arm 1 produce nothing, that is itself the finding ruling 200 anticipated, and the
approach changes: the condition is standing rather than event-driven, so a crash that will not
reproduce under a tight loop points at the run's cumulative state across cases rather than the flow,
and the next step becomes running the nine dark owner cases in one browser process, in order, as the
matrix does.
