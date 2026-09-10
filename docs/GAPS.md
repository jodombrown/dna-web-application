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

- Any **surface**. No Block action on a member card, a profile, a post, a thread or a sheet, so in
  the running app nothing offers a member the action.
- Report entirely: no report object, no reason vocabulary, no queue, no admin surface. Ruling 115's
  human review queue has no inbox.
- An unblock surface, which the delete policy already permits but nothing calls.

**Correction, ruling 216.** This entry used to say the table "can only ever hold rows put there by
hand". That is true of the app and false of the API, and PASS-01's F8 proved it live: the
`authenticated` grant carries `INSERT` and `DELETE` on `member_blocks` and an ordinary member
inserted a block row over PostgREST. The gap is the missing surface, not a missing writer, and the
distinction matters because the ruling-198 trigger fires on that insert whoever wrote it. The
security pass's own re-test of F4 uses that path, and so does the standing block arm in
`tests/live-checks.cjs` (ruling 218).

F8 also flagged the irreversibility that follows: deleting the block row does not restore the
connection or the follow, because the trigger **revokes** edges rather than deleting them. That is
intended and ruling 211 says so — unblocking restores nothing and a revoked edge is re-made
deliberately. F8 was written before 211 existed. Nothing to fix; the block surface's brief inherits
it.

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

## G5. The WebKit web-process crash on the Profile surface (ruling 200)

**Severity: medium. Open, root-caused to a named class and anchored to exact library offsets, not
fixed. The fault is in engine code, so under ruling 200's guardrail it is reported rather than
changed.**

### The finding

A **SIGSEGV in WebKit's compositing thread**, `ThreadedCompositor`, in the `WPEWebProcess` of
Playwright's WPE build of WebKit 26.6 (`webkit-2359`). The thread is servicing a scheduled update
dispatched from `g_main_context_dispatch` when it walks a structure recursively — three functions
cycling about eight or nine levels — completes the walk, calls into a function far outside that
cluster, and faults there.

Frames, as offsets into `libWPEWebKit-2.0.so.1`:

| Frame     | Offset                                                            |                                                 |
| --------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| #0        | `+0x588b98a`                                                      | **fault site**, far outside the cycle's cluster |
| #1        | `+0x27b6be4`                                                      |                                                 |
| #2 … #26  | `+0x27b76f4` → `+0x27b23f1` → `+0x27b555f`                        | the cycle, 9x / 8x / 8x                         |
| #27       | `+0x27b1885`                                                      | the recursion is entered here                   |
| #28 … #32 | `+0x7607e1`, `+0x75f51a`, `+0x7659a9`, `+0x1d3726b`, `+0x1d356e6` |                                                 |
| #33, #34  | glib, `g_main_context_dispatch`                                   |                                                 |
| #35 … #38 | `+0x1d35d51`, `+0x1d36067`, `+0x1cd2ac3`, `+0x1d3bd46`            |                                                 |
| #39, #40  | `start_thread`, `clone3`                                          |                                                 |

Two crashes forty minutes apart, in different processes with different ASLR bases, produce
byte-identical offsets. The crash has one path, not several. No function is named because the build
ships no debug info and gdb prints `??` for these frames; a nearest-exported-symbol guess would name
a function that is not the one in the frame. The offsets are exact against this build and visibly
useless against another, which is what makes them safe to hand on.

### What it explains, and what it dissolves

Ruling 200 asked for a cause explaining three facts: every sighting dark, every sighting the Profile
owner flow, Chromium never. The finding explains all three, and two of them by showing they were
never facts.

- **Dark.** Broken by evidence before the cause was found: run 62's second attempt crashed at
  `webkit-1536x960-light`. Compositing is not theme-dependent.
- **Owner flow.** Broken too: a `profile visitor stranger` flow crashed on plain `page.goto`.
  Compositing runs on every view.
- **Viewport.** Never a variable. Six viewports have now produced it (430, 744, 820, 1280, 1366,
  1536), and the DOM census is identical at every one.
- **Chromium never.** Chromium has no `ThreadedCompositor`; it paints through Skia in its own
  process architecture. The one engine-specific fact is the one that held.

What survives as constant is **WebKit, and the Profile surface at `/m/:handle`**. The crash lands
during whatever the flow happens to be doing — a section save, `edit-done`, a navigation — because
the compositor is servicing a _scheduled_ update, not responding to the action.

### Whose defect

Every frame is inside `libWPEWebKit-2.0.so.1` or glib. None is DNA's, and none could be: no
application has code on that thread. That does not by itself make it WebKit's bug, because a page
can hand the compositor a layer tree that trips a latent fault in it. Establishing which of those it
is needs the symbolised frames, which needs a debug build.

Nothing in `src/` was touched, and no test was weakened, skipped, retried or quarantined.

### Two wrong answers, recorded because they were wrong

This entry named a cause twice before the evidence arrived, and both were refuted.

1. **`color-scheme: dark` on native form controls.** Reached by measuring that `color-scheme` is the
   only computed-style difference between the themes anywhere in the surface — which is true, and
   which read forward actually _predicts_ the light sighting that killed it. In light,
   `color-scheme` resolves to `normal` and the dark control path is never taken; the crash happened
   anyway.
2. **Native-appearance form controls, theme-independent.** Reached by measuring that they are the
   only element class present in the owner view and absent from every other — also true. Refuted by
   a crash in the visitor view, which mounts none of them, and again by the faulting thread being
   the compositor rather than any form-control paint path.

Both were reached by elimination on a small sample, both looked strong, and both were coincidences
of exactly the kind ruling 200 warned about. The guardrail that kept `src/` untouched is the only
reason neither shipped as a fix for a defect that lives in the engine.

Ruled out along the way, each by measurement rather than inspection: pattern and Adinkra SVG masks,
`backdrop-filter`, `mix-blend-mode`, dark-only `color-mix` / `oklch` / relative colour, DOM-size
cliffs, page nesting depth, stack exhaustion, and a remount storm at the section saves.

### Ruling 152, and ruling 200's own premise

**Ruling 152 is corrected.** It characterised this as a navigation-timing race that moves each run.
The condition is static: present from the first paint, unchanged by navigation, unchanged by the
saves. What 152 read as movement is sampling across identical at-risk cases.

**Ruling 200's premise is corrected too.** It replaced 152's one moving variable with three
constants. Two of the three broke on their own evidence within hours. A constant asserted from four
samples is a description of the sample.

### Reproducing it

Dispatch `matrix.yml` with a `loop` input (170 iterations fits the job timeout) to run
`tests/webkit-crash-loop.cjs`, which drives `tests/profile.cjs`'s own `runOwner` so the flow under
test is the matrix's flow. Core dumps, gdb frames, offset resolution and the library build id are
captured automatically.

**A single clean loop run proves nothing.** Four of five confirmed loop runs crashed, about one
crash per 210 iterations, so roughly one run in five comes back clean with nothing changed. Any
probe needs several runs per arm and a control arm run at the same time on the same head. The
`appearance` probe arm is the cautionary case: five clean runs there looked like a result and were a
coincidence.

The `compositing` probe arm (`WEBKIT_DISABLE_COMPOSITING_MODE=1`) is **not** evidence and should not
be read as any: whether this WPE build honours that variable was never verified, and the pass-count
test proposed for checking it was withdrawn as non-discriminating.

### The next step

Take the offsets above to a WebKit 26.6 debug build, or to the matching source, and symbolise
`+0x27b1885` (the recursion's entry), the cycle at `+0x27b76f4` / `+0x27b23f1` / `+0x27b555f`, and
`+0x588b98a` (the fault). That names the walk and the function that faults, and it is the one step
that decides whether the trigger is a layer tree the Profile surface builds or a latent fault in the
engine. Everything before it is done.

### Ruling 201, and where the evidence since corrects it

Ruling 201 corrects ruling 200's evidence: the crash is **intermittent, not deterministic once the
viewport is fixed**. It was absent from runs 53, 57, 59, 60 and 63, every one of which exercised
WebKit dark at all nine viewports, against three sightings at the time it was written.

**That correction is right, and the work in this entry measures it.** The crash rate is about one
per six full profile matrix runs, and about one per 210 owner-flow iterations in the loop. A given
viewport in a given theme passes far more often than it fails, exactly as 201 says. 201's practical
advice follows from the same number and is worth keeping verbatim: prioritise capturing a crash log
over bisecting, and treat a clean local loop as uninformative rather than as evidence there is
nothing there. Quantified: fifty loop iterations carry roughly a one-in-five chance of firing, so a
clean fifty-loop run is close to meaningless.

That advice was followed and it was the right call. The crash log settled the cause in one step;
every bisect-shaped line of attack in this entry produced a wrong answer.

**Two points in 201's evidence are superseded by primary evidence gathered afterwards**, both read
from job logs rather than inferred, and both recorded above:

- **Not every sighting is dark.** Run 62's _second attempt_ (`34314303037`, job `102354990849`)
  failed one check of 5990: `FAIL: webkit-1536x960-light profile owner flow WEB PROCESS CRASHED`.
  Ruling 200's table records run 62 as `webkit-820x1180-dark`, which was attempt 1. Both are run 62.
- **Not every sighting is the owner flow.** A `profile visitor stranger` flow crashed on plain
  `page.goto` (`34321583032`, job `102369208850`), in a view that mounts no form controls at all.

So the envelope 201 describes — WebKit, dark, Profile owner flow — is narrower than the defect. The
envelope that survives all sampling is **WebKit, and the Profile surface**. This matters for method
rather than priority: an investigator who restricts sampling to dark and to the owner flow halves
the at-risk population per run for no reason, and may read a clean light or visitor run as
exonerating when it is not.

**On 201's reading that intermittency within a narrow envelope means a race inside that envelope.**
The captured stack says otherwise, and says something more specific. The fault is a SIGSEGV on
WebKit's compositing thread while it services a _scheduled_ update dispatched from
`g_main_context_dispatch`. That is asynchronous with respect to whatever the flow is doing, which is
why the crash lands at a section save in one sighting, at `edit-done` in another and at `page.goto`
in a third, and why it looks like a race against the flow when it is not one. Ruling 152 called it a
navigation-timing race and offered the moving viewport as evidence; 201 is right that the viewport
is the only thing that varies and so evidences nothing. Both readings are superseded by the stack:
the timing that matters is the compositor's own scheduling, not the navigation's.

### How this was reached, in order

The sections below are the working record, kept in the order it happened, including the two wrong
answers, the withdrawn test, and four defects in this investigation's own instrumentation. A reader
who only wants the answer has it above.

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

### Correction, 10:48: "every time" was wrong

The entry above closed by saying the crash "reproduces inside a single loop run, every time so far".
Run 43 (`34339182619`), dispatched alongside run 42 and identical to it, reported `cores written: 0`
after its 170 iterations. It did not crash.

Corrected tally for loop runs whose exit codes are trustworthy:

| Run | Iterations | Outcome                                       |
| --- | ---------- | --------------------------------------------- |
| 38  | 170        | crash                                         |
| 39  | 170        | crash                                         |
| 40  | 170        | crash                                         |
| 42  | 170        | crash, offsets captured                       |
| 43  | 170        | **no crash**                                  |
| 41  | 170        | not separately confirmed, counted neither way |

Four crashes in five confirmed runs, about 850 iterations, so roughly one per 210 iterations. The
honest statement is that a loop run fires **most** of the time, not every time, and that a single
clean loop run is therefore worth nothing as evidence against a hypothesis — about one run in five
comes back clean with nothing changed.

That matters for the next person more than for the finding. A probe arm judged on one clean loop run
would be read exactly as wrongly as the `appearance` arm was: its five clean runs looked like a
result and were a coincidence. Anything tested against this crash needs several runs per arm and a
control arm run at the same time on the same head.

Recorded because the claim was made one message before the sample that broke it, which is the third
time in this investigation an over-strong reading has been corrected by the next observation — after
`color-scheme` and after native form controls.

### Update, 9 September 19:59: the fourth sighting, and the envelope has still only ever widened

Fix PR 01's matrix run on `93d5f75` ([34394466777](https://github.com/jodombrown/dna-web-application/actions/runs/34394466777), job `102611352995`) failed one check of 5990 with G5's own words:

```
FAIL: webkit-360x800-dark profile owner flow WEB PROCESS CRASHED
  | Error: locator.inputValue: Target page, context or browser has been closed
  - waiting for locator('[data-testid="section-where"]').locator('input').first()
  | state unavailable: Error: page.evaluate: Target crashed
  | DOM before the section saves {"nodes":546,"options":71,"selects":20,"fields":14,"sections":15}
```

Sighting four, and it did not repeat on the next full run, which is consistent with the roughly
one-crash-per-six-full-runs rate this entry already records. With the `1536x960-light` one recorded
above, the sampled population now spans **both themes, six viewports, and both the owner and the
visitor flow**. The envelope this entry already
settled on — **WebKit plus the Profile surface** — holds, and nothing narrower does.

**What to watch for next, because it is the reverse of the mistake ruling 205 caught.** Every new
sighting so far has *widened* the envelope and none has narrowed it. That is a one-directional
record, and a one-directional record is exactly the shape that invites an over-strong reading in the
other direction: if a WebKit failure turns up in a **third flow**, one that is not the Profile
surface at all, the honest reading may be that the envelope is WebKit rather than WebKit-plus-
Profile, and this entry's own framing would be the thing that was too narrow.

There is already a candidate. The same run failed a second WebKit check, `webkit-430x932-light
flow`, on the composer rather than on Profile: `page.waitForSelector` timed out after 30s waiting
for `section[role="dialog"][aria-label="Compose"]` to detach, with the locator resolving visible 64
times. It read as a hang rather than a crash on that first sighting, and on that basis it was **not**
recorded as a G5 sighting. The update below corrects that. Two things narrowed it at the time, and
one of them still holds:

- `Sheet` unmounts on a plain `setTimeout(SHEET_DUR)`, 300ms, not on `transitionend`. A dropped
  animation event therefore cannot produce a 30-second hang, and that hypothesis is out.
- What remains is either that `open` never flipped — the close is `page.keyboard.press("Escape")`
  against a `window` keydown listener, fired straight after a click on an audience radio, so a
  keypress that does not land flips nothing — or that the web process was wedged enough that timers
  and React commits stopped while the DOM still answered Playwright's queries.

The first is a test-robustness question and the second would be G5's envelope widening past Profile.
One sample does not separate them, and a decision rule was fixed in advance of the next run rather
than after seeing it: if the composer hang recurs on a head that still touches no composer code it
is systematic and gets a root cause, and if it does not it stays recorded as a single unproven
anomaly, called neither passing nor a flake (ruling 228).

**Outcome across two further runs: it recurred, and the reading above is wrong.**

The next run, on `3213f77`
([34398547302](https://github.com/jodombrown/dna-web-application/actions/runs/34398547302)), passed
**5996 of 5996**, both engines, every tier. On that sample alone the rule said the anomaly stays
unproven, and that is what was reported at 20:38.

The run after it, on `85ef492`
([34402440306](https://github.com/jodombrown/dna-web-application/actions/runs/34402440306), job
`102637543541`), failed **1 of 5997** on the same wait:

```
FAIL: webkit-360x800-dark flow Error: page.waitForSelector: Target page, context or browser has been closed
  - waiting for locator('section[role="dialog"][aria-label="Compose"]') to be detached
    3 x locator resolved to visible <section role="dialog" aria-modal="true" aria-label="Compose">
```

`85ef492` is documentation only. It touches no composer code, no component and no runtime source at
all, so under the rule fixed in advance this is systematic and gets a root cause rather than a flake
label.

**Two things above are corrected by it.**

**It is not a hang.** The first sighting timed out after 30s with the locator resolving 64 times.
This one resolved 3 times and then reported `Target page, context or browser has been closed`. The
page did not stay up and refuse to unmount; it went away. That is the same string G5's own crash
line carries — `WEB PROCESS CRASHED | Error: locator.inputValue: Target page, context or browser has
been closed` — minus the prefix.

**The prefix is the whole reason this looked like a different defect.** `WEB PROCESS CRASHED` is
written by `tests/profile.cjs`, which registers `page.on("crash")` and sets a flag. **No flow in
`tests/matrix.cjs` registers a crash listener** — they register `pageerror` and `console` only. So a
WebKit web-process crash in the composer flow *cannot* be labelled as one. It surfaces as whichever
Playwright call happened to be in flight when the process died: a closed target if the crash lands
during a call, a 30-second timeout if it lands between them.

**So the envelope is WebKit, not WebKit plus Profile.** The "plus Profile" half was an artifact of
where the instrumentation is, not of where the defect is. That is exactly the reverse of the mistake
ruling 205 caught, and this entry predicted it one update earlier: if a WebKit failure turns up in a
third flow, the honest reading may be that the envelope is WebKit. It turned up, in the composer
flow, twice.

Sightings restated: four labelled crashes on the Profile surface, plus **three** unlabelled ones on
the composer flow — `webkit-430x932-light`, `webkit-360x800-dark` and, on run 101
([34407997137](https://github.com/jodombrown/dna-web-application/actions/runs/34407997137)),
`webkit-744x1133-light` with the identical `Target page, context or browser has been closed` after
3 locator resolutions. Seven across four of the last five full runs.

The composer sightings now span **three distinct viewports and both themes**, which is the same
spread the Profile sightings took four crashes to reach. Two flows, the same signature, the same
engine, and the only thing that distinguishes them in the log is which one happens to register
`page.on("crash")`. The Profile surface is where the defect is most *visible*, not where it lives.

**Follow-up, not done here** (this PR is a security fix and CLAUDE.md's scope rule keeps it out):
register `page.on("crash")` in `tests/matrix.cjs` the way `tests/profile.cjs` already does, so a
crashed web process is reported as a crash in every flow rather than as whatever call it interrupted.
Two lines per flow, and until it exists every non-Profile WebKit crash will be mis-read the way this
one was.

**On the two totals, because they differ and the difference is not the suite growing.** The failing
run recorded 5990 checks and the green one 5996. Nothing was added to `tests/matrix.cjs` between
them. A flow that throws — a timeout or a crashed web process — stops before its remaining checks
run, so the six missing checks are the tail of the two flows that died, not six checks that did not
exist. Read a lower total in a failing matrix run as truncation, not as a smaller suite.

## G8. `main` is unverified, not green (ruling 237)

**Severity: high for sequencing, not for correctness. Opened 9 September 2026. Closed by Fix PR 01
merging and `main` completing a matrix again.**

`main`'s matrix job has failed at **step 6**, the Brief 3 live checks, since the `members` grants
moved on the canonical project: runs 86, 88, 92 and 94 all die there on the `CORE_COLS` breakage
PR #14 recorded. Step 6 gates step 9, so **no browser matrix has completed on `main` for hours**,
and `main`'s last full verification predates the grant change entirely.

This is not the same as `main` being red on a known defect. It is `main` being **unverified**: the
responsive matrix that ruling 61 makes the exit check for every surface has not run there, so
nothing is known about `main` in either engine at any width since the change.

The practical consequence is sequencing, and it is the reason this is written down rather than left
for someone to infer from four red runs:

- Fix PR 01 is what restores it. Its branch is the only one that has reached step 9, because it
  carries the `CORE_COLS` fix that lets step 6 pass.
- **Nothing else should merge until it does**, and no Code session should start on Brief 4A or 4B
  until Fix PR 01 lands and `main` completes a matrix again. Both would otherwise branch from a
  `main` whose last full verification predates the grant change.
- Design work on 4B is unaffected. A prototype does not branch from `main`.

## G6. Withdraw separated the two states ruling 214 joined — closed (ruling 229)

**Opened and closed 9 September 2026, both inside Fix PR 01. Ruling 227 stated the requirement,
ruling 229 chose option 1 of the three the gap set out. Kept here rather than deleted, because the
rejected options are the reason the chosen one costs what it costs.**

Ruling 214 joined `window` to `sent`: a decline inside the window and a request still waiting return
byte-identical payloads from every projection, so the sender cannot tell them apart by reading.
Verified live in that PR, on the Members card, on the Sent row and on `profile_view.relationship`.

The action is not joined. On Profile a `sent` relationship renders a **Request sent** button wired to
`withdraw_request`. `withdraw_request` updates a `pending` row and nothing else, so:

| The sender's state | What Request sent does | What the surface then shows |
| --- | --- | --- |
| Pending request | the row becomes `withdrawn`, the pair returns to `none` | the Connect action comes back |
| Declined, inside the window | nothing; the update matches no row | the button stays |

One click separates the two, which is the thing ruling 157 exists to prevent. The payload half of
ruling 214 holds; the transition half was never stated.

Three answers were defensible and the gap recorded them rather than guessing, in the shape G2 had
before ruling 198: keep the button and hold the display at Pending; remove the button from Profile
so nothing is clickable; or remember the press so both land on `none`.

**Ruling 229 chose the first.** `private.relationship_display` maps a withdrawn request to `sent`
for the rest of the decline window, exactly as it already maps `window` to `sent`. Server behaviour
inside the window is untouched and stays a literal no-op, there is no schema change, and because no
Connect action comes back in either case the sender cannot re-send from the surface.

The button was not the only surface, and the other three are closed with it:

| Surface | Before | After |
| --- | --- | --- |
| Profile's Request sent button | pending → `none`, window → `sent` | both stay `sent` |
| Members card `rel` | pending `sent`, window `sent`, withdrawn `none` | all three `sent` |
| My Network → Sent | row vanishes on withdrawal, stays for the window | row stays for both, for the window's length |
| Suggested | a withdrawn candidate reappears, a window one does not | neither reappears |
| `send_introduction` | accepts a re-send from the withdrawn sender, refuses the window one | refuses both, one message |

**Accepted cost, recorded rather than discovered.** A sender who withdraws a genuine pending request
does not get the Connect action back for that member until the window elapses, even though the
withdrawal really happened and the recipient's Requests row really did leave. They gave up their
turn. Verified live: a withdrawal older than `decline_window_days` releases, and the pair returns to
`none` on every surface.

## G7. My Network's Sent section has no withdraw affordance

**Severity: low. Not a merge blocker. Opened 9 September 2026 while closing G6. A Connect
increment, deliberately not built in Fix PR 01.**

`src/lib/connect.ts` exports `withdrawIntroduction`, and no component calls it. The only withdraw a
member can reach is Profile's **Request sent** button, so withdrawing a request means navigating to
the recipient's profile rather than acting on the Sent row that shows the request.

Ruling 229's display rule is already in place for it: a Sent row reads `sent` whether the request is
pending, inside the window, or withdrawn inside the window, so an affordance added there inherits
the rule rather than restating it. What the increment has to decide is only what the control looks
like on a card that has no primary action slot, which is a Connect surface question and belongs to a
Connect brief.
