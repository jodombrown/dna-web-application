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

### Update, 07:23: the owner constant breaks too, and the experiment is confounded

The probe arm produced a crash, and not the one it was looking for. Run 12
(`34321583032`, job `102369208850`, env `RULING200_PROBE: appearance` confirmed in the log):

```
3533/3534 checks passed
FAIL: webkit-820x1180-dark profile visitor stranger flow Error: page.goto: Page crashed
  - navigating to ".../m/thandiwe-dube", waiting until "networkidle"
  | state unavailable: Error: page.evaluate: Target crashed
```

**`profile visitor stranger`**, dying during `page.goto` on plain navigation, before any
interaction. The visitor view mounts zero form controls (the census above: 0 selects, 0 options, 0
native-appearance controls). So if this is the same defect, native form controls cannot be its cause,
and the surviving suspect is refuted along with the first one.

The arms as they stand, counting owner cases only:

| Arm                  | Owner cases | Owner crashes                         | Other crashes                                     |
| -------------------- | ----------- | ------------------------------------- | ------------------------------------------------- |
| Control              | 90          | 2 (`744x1133-dark`, `1536x960-light`) | none, across roughly 270 visitor and public flows |
| Probe (`appearance`) | 90          | **0**                                 | 1, `820x1180-dark` visitor stranger               |

**This does not confirm the probe and it does not cleanly refute it, and the reason is a confound
this entry has to state rather than argue past.** Two readings fit:

1. The crash was never owner-specific. The owner flow is simply the longest and busiest case, so it
   drew the first six sightings; the probe removed nothing, and 0 owner crashes in 90 is the 13%
   that a rate of 2-in-90 produces by chance.
2. The probe caused it. `appearance: none` on every control is a real rendering change, and it was
   only ever validated as _behaviour_-neutral (95/99 in both arms in Chromium), which is not the
   same as crash-neutral in WebKit. On that reading the probe traded an owner crash for a visitor
   one, and proves nothing about either.

The control arm's silence on visitor flows is the one piece of evidence that bears on this, and it
cuts towards reading 2: roughly 270 visitor and public flows across the control runs produced no
crash, while the first probe arm produced one in 90. That is weak — one event — but it is the
asymmetry to test.

What is now certain regardless of which reading survives: **ruling 200's three facts are down to
one.** Not theme (the light sighting), not viewport (six viewports, and the DOM census identical at
every one), and the owner constant is at best unproven. What is left is WebKit, and the Profile
surface at `/m/:handle`.

The disambiguating step, and it is a fork rather than a single instruction:

- Run more probe iterations. A second visitor crash under the probe, where the control has none in
  several hundred visitor flows, makes reading 2 the answer: the probe is unsafe as an instrument
  and must be replaced by one that removes native controls without a global rule (for example,
  rendering `VisibilitySelect` and `Switch` from a build flag rather than restyling them).
- Run more control iterations, watching the visitor and public flows specifically. A visitor crash
  in the control makes reading 1 the answer, the defect is a Profile-surface defect rather than an
  owner-flow one, and the whole owner-only line of investigation in this entry is a dead end that
  the first six samples made look alive.

Both are running. Neither has enough samples yet, and this entry will not call it until one of them
does.

### Update, 07:36: the core, and the cause class

The core capture worked on its first crash. Run 17 (`34322686504`, job `102372710843`), a **control**
run:

```
=== core.eadedCompositor.15835.sig11 ===
ELF 64-bit LSB core file, x86-64, version 1 (SYSV), SVR4-style,
from '/home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess'
execfn: '/home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/WPEWebProcess'
```

Three facts, none of them inferred:

1. **Signal 11, SIGSEGV.** A segmentation fault, not an abort, not an OOM kill.
2. **The faulting thread is `ThreadedCompositor`.** The core pattern's `%e` records the crashing
   thread's comm, which the kernel truncates to 15 characters: `eadedCompositor` is
   `ThreadedCompositor`. This is WebKit's compositing thread.
3. **The process is `WPEWebProcess`.** Playwright's Linux WebKit is the **WPE** port. Earlier
   revisions of this entry said the Linux port paints through `RenderThemeAdwaita`, which is the GTK
   port; that was wrong and is corrected here.

This is the outcome ruling 200's method predicted: "A stack naming a compositor, a rasteriser, a
font or an image decoder tells you the class of cause in one step and saves the entire bisect." The
class is **compositing**, and ruling 200's own first sentence under "Where to look first" — that a
web-process crash in one engine is usually compositing, rasterisation or memory rather than
JavaScript — is the part of that ruling the evidence has now confirmed rather than broken.

It also settles, without needing more sampling, why the constants kept falling. Compositing runs on
every view, in every theme, at every viewport. A fault in the compositor thread has no reason to
respect the owner flow, dark theme, or 820x1180, and it did not: it merely appeared there first
because the owner flow is the longest and busiest case in the matrix and therefore the most
compositing the run does in one page.

Consequences for the two suspects this entry has already withdrawn: both were surface styling, and
neither is where the fault is. `color-scheme` was refuted by the light sighting; native form
controls are refuted twice over, by the visitor crash and now by the faulting thread being the
compositor rather than a form-control paint path.

**The probe that matches the evidence** is therefore neither of the stylesheets. `RULING200_PROBE`
now accepts `compositing`, which launches the engine with `WEBKIT_DISABLE_COMPOSITING_MODE=1` rather
than injecting CSS. If the crash stops with accelerated compositing off and the control keeps
producing it, the cause is in WebKit's threaded compositor, and the question for DNA becomes which
composited layer the Profile surface creates that trips it, not which component is at fault.

**The stack is still missing, and the reason is my own extraction bug, not the capture.** `gdb` was
handed the core with no executable, because the exe was resolved from `eu-readelf` looking for
`WebKitWebProcess` — the GTK port's binary name, which the WPE build does not have. gdb then read
the core as an executable and reported "not in executable format". `file` names the binary in
`execfn`, so the step now parses that and calls `gdb <exe> --core <core>`. Fixed here; the next
control-arm crash should produce the frames.

Sampling at this point, all read from job logs:

| Arm                | Runs | Owner cases | Owner crashes | Visitor/public crashes |
| ------------------ | ---- | ----------- | ------------- | ---------------------- |
| Control            | 11   | 162         | 3             | 0                      |
| Probe `appearance` | 5    | 90          | 0             | 1                      |

The `appearance` arm's numbers are no longer the interesting comparison, since the faulting thread
tells us it was testing the wrong thing. They are kept because a null result against a wrong
hypothesis is still a record of what was tried.

### Update, 08:05: the compositing arm is uninformative, and the test I proposed for it was wrong

Two compositing-probe runs finished clean (`34324908709`, `34324916741`, both with
`RULING200_PROBE: compositing` confirmed in the job env, both `3540/3540 checks passed`).

The entry above committed, in advance, to a way of reading that: an arm whose pass counts matched
the control digit for digit would be evidence the switch was a no-op. **That test does not work and
is withdrawn.** 3540 is the structural total for this flow set — nine viewports, two themes, six
flows — so any run that does not crash reports 3540/3540 whether or not the probe did anything. The
control runs report the same number. Identical totals distinguish nothing.

So the compositing arm says nothing yet, for two independent reasons, and neither is that the
compositor is innocent:

1. Two runs is far below the control's crash rate of roughly one run in five. Zero crashes in two
   runs is the expected result under any hypothesis.
2. Whether this WPE build honours `WEBKIT_DISABLE_COMPOSITING_MODE` is still unverified, and this
   repo has no way to verify it. Playwright passes `env` to the browser process and the web process
   inherits it, so it reaches the process; whether the engine acts on it is the open part.

**The stack is worth more than this probe.** The core already names the class, and a probe whose
effect cannot be confirmed cannot narrow it further, whereas frames would name the function. The
gdb fix landed in `b5d38b9`, and the two control runs on that head (`34324924043`, `34324930989`)
both passed, so it has not yet had a crash to work on. More control runs are dispatched for that
purpose alone.

Sampling to date, counted by run rather than by case, because crashes have now appeared in owner and
visitor flows and a per-case denominator would imply a precision this does not have:

| Arm                 | Runs | Runs that crashed                                                                     |
| ------------------- | ---- | ------------------------------------------------------------------------------------- |
| Control             | 15   | 3 (`744x1133-dark` owner, `1536x960-light` owner, and run 17 whose core was captured) |
| Probe `appearance`  | 7    | 1 (`820x1180-dark`, visitor stranger)                                                 |
| Probe `compositing` | 2    | 0                                                                                     |

### Update, 08:54: the stack. DONE MEANS item 1 is met

Run 34 (`34329351986`, job `102394030379`), a control run on the fixed-gdb head, crashed and the
extraction produced frames. The faulting thread:

```
Thread 1 (Thread 0x7f4fa6ffe6c0 (LWP 13535)):
#0  0x00007f603bea0f8a  libWPEWebKit-2.0.so.1     <- fault site
#1  0x00007f6038dcc1e4  libWPEWebKit-2.0.so.1
#2  0x00007f6038dcccf4  ]
#3  0x00007f6038dc79f1  ]  three-frame cycle
#4  0x00007f6038dcab5f  ]
   ... same three addresses repeating, through #26 (about eight levels)
#27 0x00007f6038dc6e85  libWPEWebKit-2.0.so.1     <- recursion entered here
#28 0x00007f6036d75de1
#29 0x00007f6036d74b1a
#30 0x00007f6036d7afa9
#31 0x00007f603834c86b
#32 0x00007f603834ace6
#33 libglib-2.0.so.0
#34 g_main_context_dispatch
#35 0x00007f603834b351  libWPEWebKit-2.0.so.1
#36 0x00007f603834b667
#37 0x00007f60382e80c3
#38 0x00007f6038351346
#39 start_thread
```

That this is the faulting thread is not an assumption: the other two threads in the core are parked
in `__GI___poll` and `__futex_abstimed_wait_common64`, and a thread blocked in poll or in a futex
wait cannot take a SIGSEGV. It is also the thread the core's own name records,
`ThreadedCompositor`.

What the shape says, and what it rules out:

- **A recursive descent, bounded, not runaway.** Frames #2 to #26 are three addresses repeating for
  about eight levels, and #27 onward is an ordinary entry path from the glib main loop. A stack
  overflow would show the cycle continuing to the base of the stack with no entry path visible, and
  would raise SIGSEGV on the guard page rather than inside a callee. **Stack exhaustion is ruled
  out.** So is "the page is too deep": eight levels is a shallow tree.
- **The fault is not in the recursion itself.** Frame #0 sits at `0x7f603bea0f8a`, far from the
  `0x7f6038dc…` cluster the recursive frames occupy, so the walk descends normally and then calls
  something else, which faults. The defect is in what the eighth level reached, not in the walking.
- **Driven from the main loop, not from script.** Frames #33 and #34 are
  `g_main_context_dispatch`. This is the compositor servicing a scheduled update, which is why the
  crash lands "during or around" whatever the flow happens to be doing rather than on a particular
  action, and why it has appeared at a section save, at `edit-done`, and at `page.goto`.

This closes ruling 200's DONE MEANS item 1: a named cause, with the evidence that names it. A
SIGSEGV in a bounded recursive walk on WebKit's compositing thread, entered from the glib main
loop, faulting in a callee at the bottom of the walk.

**Whose defect it is, stated as far as the evidence goes and no further.** Every frame is inside
`libWPEWebKit-2.0.so.1` or glib. None is in DNA's code, because DNA has no code in that process's
compositor thread — no application ever does. That does not by itself make it WebKit's bug: a page
can hand the compositor a layer tree that trips a latent fault in it. What the evidence does settle
is that the trigger cannot be any of the three things this entry previously chased, because none of
them is reachable from a compositing tree walk: not `color-scheme`, not native form controls, not
anything owner-specific.

**What is still unknown** is the name of the function at frame #0 and of the three in the cycle. The
addresses are unsymbolised because the shipped WPE build has no debug info. They can still be
resolved to the nearest exported symbol from the library's dynamic table, which is the next step and
is cheap.

### Update, 09:37: the loop reproduces it, and a truncation cost the second stack

Run 38 (`34332754044`, job `102404960483`), a 170-iteration owner-flow loop, crashed. The pipeline
worked end to end: a core was written, gdb produced frames, the offsets resolver ran, and the
retention guard did its job — `frames extracted; core not retained (266M)`. A 266 MB core copied
into the artifact would have been the upload failure that guard was added to prevent.

Two things the run establishes beyond the crash itself:

- **The loop reproduces the defect**, at roughly 11.5 seconds an iteration against about 80 seconds
  an owner case in a profile matrix run. That is the sampling instrument the rest of this
  investigation should use.
- **gdb does resolve some exported symbols in this build.** `libWPEWebKit-2.0.so.1+0x771180` came
  back as `WebKit::WebProcessMain(int, char**)`. That does not change the decision not to guess at
  the unexported ones: the frames that matter are still `??`, and a nearest-export guess for those
  would still name the wrong function.

**The faulting thread's frames were lost to my own truncation, not to the crash.** The extraction
piped gdb through `head -600`. This core has eight threads and `thread apply all bt` prints them in
descending order, so the faulting thread is printed last and `head` ate exactly it; the resolver's
`tail -60` then showed threads 8 down to 2. The `grep: write error: Broken pipe` at the top of the
step is the tell. Every thread that did survive is parked in `poll`, a futex wait, or `g_cond_wait`,
which is consistent with the earlier finding but adds nothing.

Fixed by asking gdb for the current thread first: in a core gdb positions itself on the thread that
faulted, so `bt 60` before `thread apply all bt 25` puts the frames that matter at the top of the
output where nothing can truncate them. The head limit is raised to 4000 and the resolver now prints
its first 80 lines rather than its last 60, for the same reason.

This is the third defect in this investigation's own instrumentation, after the `WebKitWebProcess`
exe lookup that fed gdb a core with no executable, and the `tee` that opened `loop.log` before its
directory existed. All three were found by reading the output rather than by a wrong conclusion
reaching the report, which is the reason for reading it.

The finding is unchanged: run 34's stack already established the cause, and run 38 corroborates that
the loop reproduces it. Sampling, by run:

| Arm                 | Runs | Crashed                                                                    |
| ------------------- | ---- | -------------------------------------------------------------------------- |
| Control, matrix     | 23   | 3                                                                          |
| Control, loop       | 4    | 1 (run 38; runs 35 to 37 were the `tee` defect, and their loops ran clean) |
| Probe `appearance`  | 7    | 1 (visitor)                                                                |
| Probe `compositing` | 2    | 0, uninformative                                                           |

### Update, 09:40: the loop makes it reproducible on demand

Run 39 (`34332764279`) crashed as well, reporting `frames extracted; core not retained (262M)`. So
both 170-iteration loop runs crashed, and both lost their faulting thread to the `head -600`
truncation described above, which the following runs correct.

The rate is the point of this entry, and it changes what this defect costs to investigate:

| Instrument                            | Owner cases per run      | Crash rate                  |
| ------------------------------------- | ------------------------ | --------------------------- |
| Profile matrix run, `special=profile` | 18, in about 24 minutes  | about 1 run in 6            |
| Owner-flow loop, 170 iterations       | 170, in about 35 minutes | 1 per run, twice out of two |

Two crashes in roughly 340 iterations is about one per 170, consistent with the matrix arm's rate
per owner case rather than better than it. What changed is not the defect's frequency but the
sampling: a single loop run now contains enough owner cases to fire, so the crash reproduces
**within one run** instead of once per six. Ruling 200's method asked for exactly this — "looping
the owner flow until it fires" — and it is now available to anyone dispatching `matrix.yml` with a
`loop` input.

That matters for what comes next rather than for the finding, which run 34's stack already settled.
A hypothesis about this crash can now be tested in one runner, against a control arm of the same
shape, instead of waiting on a one-in-six sighting. Whoever picks this up should use the loop and
not the matrix for that.

Recorded rate, by run, at this point:

| Arm                 | Runs | Crashed                                                                           |
| ------------------- | ---- | --------------------------------------------------------------------------------- |
| Control, matrix     | 23   | 3                                                                                 |
| Control, loop       | 5    | 2 (runs 38 and 39; runs 35 to 37 were the `tee` defect and their loops ran clean) |
| Probe `appearance`  | 7    | 1, a visitor flow                                                                 |
| Probe `compositing` | 2    | 0, uninformative: effect unverified, pass-count test withdrawn                    |

### Update, 10:12: run 40 crashed; the resolver was dropping the frames it existed to resolve

Run 40 (`34336015250`), a 170-iteration loop on the faulting-thread-first head, crashed:
`frames extracted; core not retained (260M)`. Three loop runs, three crashes.

The gdb change worked — the faulting thread's frames are in the raw output and the artifact. The
**resolver** then dropped them. It grouped frames under `Thread N` headers, and gdb's `bt` on the
current thread emits frames with no such header, so the one backtrace worth resolving was the one
discarded. Its printed output began at the all-threads sweep instead, which for this core meant
threads 32 down to 28, every one of them parked in a futex or a semaphore wait.

Fixed: frames now attach to the most recent header of either kind, the `=== FAULTING THREAD ===`
marker opens a group, and frames appearing before any header open an implicit one rather than
vanishing. Verified against a fixture before dispatch.

That is the fourth defect in this investigation's own instrumentation, after the `WebKitWebProcess`
exe lookup, the `tee` ordering, and the `head -600` truncation. This one was predicted before the
log was read — the parser groups by a header the new gdb output does not emit — which is the only
reason it was caught on the first crash rather than the third.

Worth recording about the core itself: this process had **32 or more threads**, against three in run
34's. Every thread visible in the sweep was idle in a futex, a semaphore, `poll` or `g_cond_wait`.
Thread count is a property of the run, not of the crash, and it does not change the finding; it does
mean a truncating `head` is even less forgiving here than it was at run 38.

### Update, 10:47: the offsets, and two crashes that name the same three functions

Run 42 (`34339173919`), a 170-iteration loop on the head carrying both instrumentation fixes,
crashed and produced what the previous four runs could not: the faulting thread's frames as
**library-relative offsets**.

The faulting thread, against `libWPEWebKit-2.0.so.1` from `webkit-2359` (WebKit 26.6, Playwright's
WPE build):

| Frame     | Offset                                                            | Note                                            |
| --------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| #0        | `+0x588b98a`                                                      | **fault site**, far outside the cycle's cluster |
| #1        | `+0x27b6be4`                                                      |                                                 |
| #2 … #26  | `+0x27b76f4` → `+0x27b23f1` → `+0x27b555f`                        | the cycle, repeating (9x, 8x, 8x)               |
| #27       | `+0x27b1885`                                                      | the recursion is entered here                   |
| #28 … #32 | `+0x7607e1`, `+0x75f51a`, `+0x7659a9`, `+0x1d3726b`, `+0x1d356e6` |                                                 |
| #33, #34  | glib, `g_main_context_dispatch`                                   | scheduled update being serviced                 |
| #35 … #38 | `+0x1d35d51`, `+0x1d36067`, `+0x1cd2ac3`, `+0x1d3bd46`            |                                                 |
| #39, #40  | `start_thread`, `clone3`                                          | thread entry                                    |

**Run 34 and run 42 crashed in the same three functions.** Run 34's absolute addresses were captured
before offsets existed; subtracting run 42's offsets from them yields one load base,
`0x7f6036615600`, for all three cycle frames — and the same base maps run 34's entry frame to
`+0x27b1885`, which is run 42's `#27` exactly. Two crashes, in different processes with different
ASLR bases about forty minutes apart, in different runs, produce byte-identical offsets. Under the
same base run 34's fault site is `+0x588b98a` and its `#1` is `+0x27b6be4`, matching run 42 there
too.

That is corroboration, not a new finding: run 34's stack already established the cause. What it adds
is that the crash has **one** path rather than several, and that these offsets are stable enough to
be worth handing to someone with symbols.

**What these offsets are for.** They are exact against this build and useless against any other, and
that is the point: anyone with a WebKit 26.6 debug build, or the matching source, maps
`+0x27b76f4`, `+0x27b23f1`, `+0x27b555f`, `+0x27b1885` and `+0x588b98a` to functions and lines in
one step; anyone with a different build sees immediately that they cannot. No function is named here
because naming one from the nearest exported symbol would name the wrong function, and this entry
has already produced two wrong answers reached by plausible-looking inference.

Loop tally: four loop runs on heads whose exit codes are trustworthy, four crashes (runs 38, 39, 40,
42; run 41's outcome was not separately confirmed and is not counted either way). The crash
reproduces inside a single loop run, every time so far.
