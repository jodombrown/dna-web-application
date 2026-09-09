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

**Severity: medium. Open, narrowed to one element class, not fixed. Ruling 200's premise that every
sighting is dark is false, and the named suspect this entry first carried is refuted.**

Ruling 200 asked for a cause explaining three facts: why every sighting was dark, why every sighting
was the owner flow, and why Chromium has never produced it. One of those three facts did not
survive.

### The light sighting, which changes the question

Run 62's **second attempt** (`34314303037`, job `102354990849`, finished 06:34 on 9 September 2026,
after this investigation opened) failed one check out of 5990:

```
5989/5990 checks passed
FAIL: webkit-1536x960-light profile owner flow WEB PROCESS CRASHED
  | Error: locator.evaluate: Target page, context or browser has been closed
  | Call log: - waiting for locator('[data-testid="edit-done"]').first()
  | state unavailable: Error: page.evaluate: Target crashed
  | DOM before the section saves {"nodes":598,"options":71,"selects":20,"fields":14,"sections":15}
```

`webkit-1536x960-**light**`. Read from the job log, not inferred. Ruling 200's table records run 62
as `webkit-820x1180-dark`, which was attempt 1; attempt 2 of the same run number crashed in light,
at a different viewport, in the same flow.

So the constants are two, not three: **WebKit, and the Profile owner flow.** Theme is not one, and
neither is viewport. Both are labels on whichever at-risk case happened to be running.

### What that refutes, including this entry's own first answer

This entry originally named `color-scheme: dark` on native form controls as the cause. **That is
refuted.** In light theme `color-scheme` resolves to `normal`, so the dark form-control path is
never taken, and the crash happened anyway. A cause that is absent from a sighting is not the cause.

The measurement that named it is still correct, and now says something better. Across the whole
owner flow, in both read and edit mode, the only computed-style difference between light and dark on
any compositing-relevant property is `color-scheme`; after removing it the residual is **zero
differing signatures**. Read forward rather than backward, that predicts the light sighting: if the
two themes are identical in every compositing respect, whatever kills the process in dark can kill
it in light. The "every sighting is dark" run of four was a coin landing the same way four times
across a population of nine dark and nine light owner cases per run, and then landing the other way.

That same measurement still rules out, by measurement rather than inspection, four of ruling 200's
five listed suspects — pattern and Adinkra masks (69 masked elements in each theme),
`backdrop-filter` (`none` on every element), `mix-blend-mode` (`normal` on every element), and
dark-only `color-mix` / `oklch` / relative colour (the `[data-theme="dark"]` block is plain hex, and
`styles.css`'s `oklch` is defined in both `:root` and `.dark`). It rules them out as _theme_
discriminators. Since theme is no longer a discriminator at all, they are ruled out of that role and
back into the general population — but none of them is owner-specific, and the owner constant is the
one that held.

### What survives

The owner discriminator, which is now the only structural one left, and is unaffected by the light
sighting. Native-appearance form controls exist in the owner view and in no other view:

|                                | selects | options | inputs | textareas | native-appearance controls |
| ------------------------------ | ------- | ------- | ------ | --------- | -------------------------- |
| public / visitor, either theme | 0       | 0       | 0      | 0         | **0**                      |
| owner read, either theme       | 14      | 42      | 2      | 0         | **16**                     |
| owner edit, either theme       | 20      | 71      | 9      | 3         | **26**                     |

Visitor and public never crash and mount none of them. The crashing run's own DOM sample —
71 options, 20 selects, 14 fields, 15 sections — matches this census exactly, at every viewport
measured (430, 820, 1280, 1366, 1536) and in both themes, which is also why viewport cannot be the
variable: the at-risk population is identical at every one of them.

Of the 26 in edit mode, 16 are painted by the engine's own form-control theme while invisible: 14
`VisibilitySelect` overlays (`appearance: auto`, `opacity: 0`, `position: absolute`) and 2 `Switch`
checkboxes (`appearance: auto`, `opacity: 0`, and a **0x0** box). The other 10 are the visible text
inputs and textareas, also `appearance: auto`. The six `Select` controls set `appearance: none` and
are author-painted.

**The surviving suspect** is therefore native-appearance form controls on WebKit's form-control
paint path, theme-independent — not the dark branch of that path. It still explains owner (nothing
else in the surface is owner-only) and Chromium-never (Blink paints controls itself in Skia; WebKit's
Linux port paints through a separate native theme). It no longer has to explain dark, because dark
is not a fact about this crash.

It is a suspect narrowed by elimination, not a proven cause, and this entry has now been wrong once
about a suspect reached the same way. The confirming experiment is below.

### Where the crash sits in the flow

At `[data-testid="edit-done"]`, which the flow clicks after the section saves. A section save
remounts nothing — across the `where` save all 26 native controls survived, 0 newly mounted, 0
unmounted — so the crash window is a standing condition being exercised, not an event that creates
one.

### Why nothing was changed

Every artefact in the suspect set is Strand's, ported verbatim, and ruled:

| Artefact                                                   | Provenance                                                             | Ruling   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | -------- |
| `Switch.tsx`, the 0x0 `opacity: 0` native checkbox         | "Ported from Strand `components/core/Switch.jsx`. Behavior unchanged." | 98       |
| `Select.tsx`                                               | "Ported from Strand `components/core/Select.jsx`. Behavior unchanged." | 98       |
| `VisibilitySelect.tsx`, the 14 `opacity: 0` native selects | "Ported from `profile/strand-patch/Profile.jsx`. Behavior unchanged."  | 124, 136 |

`color-scheme: dark` in `src/styles/strand.css` (rulings 57, 98) was in this table while it was the
suspect and is out of it now, but the conclusion is unchanged for the rest: if the surviving suspect
is confirmed, the fix is a Strand change under a reopened ruling 98, not an edit to this repo's
copy. Ruling 200 says a ruled style gets its ruling reopened rather than quietly changed, and a
cause in Strand is reported as a Strand request. Nothing in `src/` was touched, and the case was not
weakened, skipped, retried or quarantined.

### Ruling 152, and ruling 200's own premise

Ruling 152 called this a moving navigation-timing race. Corrected: the condition that separates
crashing from passing cases is static, present from the first paint of the owner view, unchanged by
navigation and unchanged by the saves. What 152 read as movement is sampling across identical
at-risk cases.

Ruling 200 replaced 152's one moving variable with three constants. Corrected too: there are two.
The theme constant broke on its own evidence within hours of the ruling being written, which is what
a constant asserted from four samples does. The correct statement is that the crash is
**WebKit-only and owner-flow-only**, and that every other axis so far — theme, viewport — is a label
on the sample, not a property of the defect.

### The instrument, and the next step

`tests/webkit-crash-loop.cjs` loops `tests/profile.cjs`'s own `runOwner`, so the flow under test is
the flow the matrix runs. `.github/workflows/webkit-crash.yml` runs it with core dumps enabled and
extracts the signal and stack from any core with gdb. It is `workflow_dispatch` only: not the
matrix, not a merge gate, no pass criterion changed. Themes alternate per iteration, because theme
is not a variable and pinning one halves the at-risk population.

- **Control.** The flow unmodified. Supplies the crash log, signal and stack this entry still lacks.
- **Probe.** The same flow with `appearance: none` forced on every form control, taking them off the
  engine's native form-control paint path. Validated in Chromium before use: native-appearance
  controls go from 16 to 0, and the flow records the same 29 checks with the same single
  dev-server-only warning, so the probe moves the variable without perturbing the flow.
- **`PROBE=color-scheme`** is kept only because it is cheap. The light sighting predicts it makes no
  difference; a run where it does would mean the light sighting has a second cause.

Reading the result: crash in control and none in probe across at least three times the control's
mean iteration count confirms the surviving suspect, and the change then belongs in Strand under a
reopened ruling 98. Crash in both refutes it, and the next place to look is what else is owner-only
— the edit bar, the audience machinery, and the write path itself, which is the one thing the owner
flow does that no other view does. No crash in fifty control loops is the finding ruling 200
anticipated, and the step becomes running the full at-risk population in one browser process, in
order, as the matrix does, since the matrix produces this crash roughly once per run and a tight
loop over a single case may not reproduce the conditions that matter.

### Sampling so far

| Run                                                      | Population                                         | Result                                        |
| -------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `34314303037` (run 62, attempt 2)                        | full matrix, both themes, both engines             | **crash**, `webkit-1536x960-light`, 5989/5990 |
| `34319186149` (dispatched, `special=profile theme=dark`) | 9 dark WebKit owner cases + visitors, both engines | no crash, 1770/1770                           |

One clean run of the nine dark owner cases is consistent with the historical rate of about one
crash per full run and refutes nothing on its own. Three further dispatched runs of the same shape
were queued; they were aimed at dark before the light sighting was found, which halves their
coverage but does not invalidate them.

One constraint on running the instrument: GitHub dispatches a `workflow_dispatch` workflow only from
the default branch, so `webkit-crash.yml` becomes dispatchable when this branch merges. Until then
the control arm is sampled by dispatching the existing `matrix.yml` with `special=profile` and no
theme filter.
