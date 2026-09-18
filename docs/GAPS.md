# Gap notes

Things the build knows are missing, with the ruling that put them here. A gap is not a defect: it is
work that was deliberately not done, recorded so it is not rediscovered by accident. Notion is the
source of truth for the Gap Register; this file is the repo's working copy, and it carries only gaps
a reader of this codebase would otherwise have to infer from an absence.

Phase posture (ruling 140): the canonical project holds no real member data, so visibility, RLS and
consent findings are recorded with a severity and tracked. None of them blocks a merge. They are
invite-boundary gates, to close before the first real member invite.

## G1. Report has no surface, and block has one place only (ruling 186)

**Severity: high at the invite boundary. Not a merge blocker (ruling 140). Narrowed 10 September
2026 by Brief 4A, which built the block control on the profile.**

`public.member_blocks` is written by the app now, from one surface: the overflow on Profile's
Visitor action row (`src/components/dna/ProfileBlockControl.tsx`, `src/lib/blocks.ts`, B4A-SPEC.md).
Ruling 208 puts unblock in the same place, and ruling 198 keeps `/m/:handle` loading for both
parties, so there is no list and no settings dependency to build. Report is untouched and the rest
of the chassis still has no block affordance.

Ruling 50 places block and report in the chassis, on every surface. The chassis shipped without a
block store, so `member_blocks` was created inside Brief 4 to give Connect's projections something
to filter on. Ruling 186 moves its ownership out of Connect and corrects the register: block and
report were **not** built in the chassis.

What exists:

- The table, with RLS: the blocker selects, inserts and deletes their own rows; the blocked member
  never learns the row exists; admin may select and delete; service role has full access.
- `private.is_blocked(a, b)`, symmetric, applied as an absolute filter on every projection that
  returns a member (see the audit below).
- Block and unblock on Profile, from Brief 4A: one overflow item and one confirm sheet in two
  variants, on the signed-in Visitor view. The writes are a plain insert and delete on
  `member_blocks` under the blocker's own RLS, so the ruling 198 trigger carries every consequence
  and there is no second place for the semantics to live. Fix PR 02 (ruling 442) adds a second
  trigger on the same insert, `on_member_block_rate_limit`, which bounds how many blocks one member
  may write in an hour through `private.rate_limit`; the ceiling is internal and the refusal is
  words. The insert stays a plain insert, and the live arms that prove it run as `live_arms` on
  `LIVE_DB_URL` (ruling 382), never on a Management API token.

What is still missing:

- Block anywhere else. No Block action on a member card, a post, a thread, an event or a Space, so
  a member who meets someone outside `/m/:handle` has to reach their profile to act. Ruling 50 puts
  block on every surface; Brief 4A gave it one, which is the one that also carries unblock.
- Report entirely: no report object, no reason vocabulary, no queue, no admin surface. Ruling 115's
  human review queue has no inbox. Ruling 207 defers it deliberately: a report needs a moderation
  destination, which is the System Admin brief, and a report that goes nowhere promises someone is
  reading.

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
`member_blocks`, not in a write path, so every writer inherits the semantics rather than restating
them. Brief 4A is the first writer and it inherits them exactly: it writes the row and re-reads.

**Brief 4A, 10 September 2026.** What it settled beyond building the control. B4A section 6 made the
audience-scope drop directional, which ruling 198 always was in words and the r198 implementation
was not: `private.is_blocked` stays symmetric because discovery and contact are symmetric, but only
the party who was blocked falls to the anonymous rule. The blocker keeps their own viewer, so ruling
220's anchor still admits Anchored sections to them and their mutuals, shared Spaces and DIA line
survive, while the revoked edge removes Connections sections from both sides. `profile_view` gains
one key, `viewer_blocked`, which is the caller's own block and never the converse.

One thing Brief 4A leaves open and did not create. A member with the Private switch on returns null
from `profile_view` to anyone who is not an existing connection (ruling 213), and a block revokes the
connection, so a blocked party loses the page for a Private member rather than seeing it at the
lowest scope. That is ruling 213 reaching them first, not a disclosure: ending a connection without
any block does the same thing. B4A section 7's enumeration assumes a profile that loads, so it does
not describe this case, and no ruling covers the interaction. It belongs with the chassis brief.

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

| Projection                                                          | Blocker's view                                                   | Blocked party's view     | Result                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ | ----------------------------------- |
| `connect_cards('members')`                                          | blocked member absent                                            | blocker absent           | pass, both directions               |
| `connect_cards('suggested')`                                        | blocked member absent                                            | blocker absent           | pass, both directions               |
| `connect_cards('network')` (connections, requests, sent, following) | blocked member absent                                            | blocker absent           | pass, both directions               |
| Mutual names (`connect_card`, `profile_view.mutuals`)               | mutual emptied                                                   | mutual emptied           | pass, both directions               |
| DIA rail rows (`connect-suggest`)                                   | inherits `connect_cards('suggested')` under the member's own JWT | same                     | pass, both directions               |
| `connect_where()` underlying counts                                 | country tile disappeared                                         | country tile disappeared | pass, both directions               |
| `connection_request_intros(ids)`                                    | **returned the other party's name**                              | **same**                 | **failed; fixed in this PR**        |
| `profile_view(handle)` subject                                      | returned the profile                                             | returned the profile     | **failed; logged as G2, not fixed** |

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
sighting so far has _widened_ the envelope and none has narrowed it. That is a one-directional
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
WebKit web-process crash in the composer flow _cannot_ be labelled as one. It surfaces as whichever
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
`page.on("crash")`. The Profile surface is where the defect is most _visible_, not where it lives.

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

## G8. `main` was unverified, not green — closed (ruling 237)

**Opened 9 September 2026, closed 10 September 2026 at 00:40 when `main` completed a matrix for the
first time since the grants moved. Kept rather than deleted, because the distinction it turns on —
unverified is not the same as red — is the reusable part.**

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

### Closed, 10 September 00:40

Fix PR 01 merged at 00:02:41 as `bb57e64`, and `main`'s run 103
([34419547470](https://github.com/jodombrown/dna-web-application/actions/runs/34419547470)) is the
first matrix to complete there since the grants moved.

| Tier                                                                  | Result            |
| --------------------------------------------------------------------- | ----------------- |
| `deploy`                                                              | green             |
| Step 6, live checks and the ruling 218 signed-in arms                 | **green**         |
| Browser matrix, Chromium, every width, both orientations, both themes | **green**         |
| Browser matrix, WebKit                                                | 1 failure of 5983 |

**`main` is verified.** That is what this gap asked for and it does not require a green WebKit tier:
the condition was that the matrix _runs to completion_ so `main`'s behaviour is known, and it now
does. Nothing is gated on this any more — Brief 4A and 4B may start, and other work may merge.

The one failure is recorded below rather than here, because it is **not** the signature this file has
been tracking.

### Update, 10 September 00:40: a WebKit failure that is NOT this signature

`main`'s run 103 ([34419547470](https://github.com/jodombrown/dna-web-application/actions/runs/34419547470))
failed 1 of 5983, WebKit, and it is neither a crash nor the Compose-dialog wait:

```
FAIL: webkit 820x1180 light connect: flow completed locator.click: Timeout 15000ms exceeded.
  - waiting for locator('[role="dialog"][aria-label="Introduce yourself to Adaeze Nwosu"]')
      .getByRole('button', { name: 'Send introduction' })
```

It is recorded here **without being counted as a G5 sighting**, deliberately. A click that never
becomes actionable is a third distinct symptom, and this entry has already been wrong once by
reading a symptom as a different defect and once by reading two symptoms as unrelated. It is neither
until there is evidence.

**What is established.** No code change caused it. `main` at `bb57e64` and `3213f77` differ in
exactly one file for `src/` and `tests/` — `tests/live-checks.cjs`, which is step 6's script and
which the browser matrix never loads. `tests/connect.cjs`, `tests/matrix.cjs` and all of `src/` are
byte-identical, and `3213f77` passed **this exact tier** 5996/5996 in both engines. Same code, same
viewport, same theme, opposite outcome.

**One observation worth keeping, stated as an observation (ruling 205).** Every WebKit failure
sampled so far lands on a sheet or dialog transition: the Compose dialog failing to detach (three
times), the Profile surface during navigation or a section input (four), and now a dialog button
that never becomes actionable. Playwright's actionability requires an element to be _stable_ — the
same box across two animation frames — so a stalled compositor or rAF would produce exactly this
timeout, and `Sheet` animates for 300ms. That is a hypothesis with a mechanism, not a finding, and
`tests/connect.cjs`'s own `tap()` helper already exists because clicks on this surface were fragile
enough to need a hit test and a retry loop before clicking.

**What would settle it**, and is the same follow-up this entry already logs: register
`page.on("crash")` in `tests/matrix.cjs`. A click timeout with a crash flag set is G5; a click
timeout with no crash is something else. Today the suite cannot tell those apart outside
`tests/profile.cjs`.

### Update, 10 September 11:47: the same commit run twice, disjoint failure sets (ruling 304)

Brief 4A's PR #20, head `79db1b1`, run 115
([34465444602](https://github.com/jodombrown/dna-web-application/actions/runs/34465444602)). The
matrix job was re-run once on the **same commit and the same tree**, and the two attempts share not
one failure. Chromium was clean at every width, both orientations and both themes in both attempts.

| Attempt              | WebKit failures                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 (job 102831943218) | `webkit 360x800 light connect: no page errors`, two REST requests to `post_saves` and `post_reactions` aborted "due to access control checks"                                                                                                                                                                                                    |
| 2 (job 102845377529) | `webkit-390x844-light profile owner flow` **WEB PROCESS CRASHED** at `section-where`'s input; `webkit-1280x800-dark profile owner flow` **WEB PROCESS CRASHED** at the same input; `webkit-820x1180-dark profile visitor connected flow`, `page.waitForURL` to `**/feed` timed out at sign-in; `webkit-390x844-dark-auth: recovery landing flow` |

**Two of attempt 2's four are this signature**, and they are counted: `WEB PROCESS CRASHED` on the
Profile owner flow at the `where` section's input is what this entry has been tracking since ruling
200, and `tests/profile.cjs`'s own `page.on("crash")` is what labels them. They add
`webkit-390x844-light` and `webkit-1280x800-dark` to the sampled population, so the envelope widens
again rather than narrowing, exactly as this entry has warned every time.

**Attempt 1's failure is recorded without being counted**, on the same reasoning as run 103's: it is
the Connect flow, it is not a crash, and it is a third distinct symptom (aborted requests rather
than a timeout or a crash). `tests/connect.cjs` registers no crash listener, so the suite cannot say
whether a web process died under it. That is the same blind spot, and the same follow-up closes it.

**What this pair establishes that a single sighting could not, now ruling 304.** Ruling 265 put the
rate at roughly one green run in two and made that the merge policy rather than an observation. Two
attempts on a byte-identical tree producing four failures and one failure, with **zero overlap**, is
the strongest evidence yet for that rate: the failing set on this engine is not a property of the
code under test. It also means a re-run cannot be used to confirm a WebKit failure by identical
reproduction, which is the test the babysit rules ask for. On this engine, the absence of
reproduction is the finding. Ruling 304 records it: runs of one materially unchanged tree produced
different WebKit failure sets each time, with zero overlap between two attempts on a byte-identical
head; this is 265's rate demonstrated rather than asserted, it establishes that a re-run cannot
confirm a WebKit failure by reproduction here, and it makes ruling 274's crash flag the item that
would end the ambiguity permanently.

**Run 117, 16:33, makes it four sets.** Head `e170b36`
([34498061216](https://github.com/jodombrown/dna-web-application/actions/runs/34498061216)) differs
from run 116's `542b245` by one markdown file the matrix never loads. Chromium green at every width,
both orientations and both themes; step 6 green. Three WebKit failures, none shared with runs 115 or
116 except the auth arm's class: `webkit-1366x1024-dark flow`, the Compose dialog never detaching
across 64 locator resolutions over 30 seconds, which is this entry's composer symptom and its
fourth sighting; and `webkit-390x844-light-auth` and `webkit-390x844-dark-auth` on the recovery
landing flow. Recorded, not re-run: under 304 a fifth run would sample the same distribution.

### Ruling 828: the rate, censused, and the last constant broken

Ruling 827 asked whether the rate had risen after five sightings were reported in one day. It had
not, and the census that answers it is below: every failed run since crash labelling existed, read
from the job logs. **Seventeen crashed arms in sixteen jobs, 10 to 17 September, every one WebKit and
not one Chromium.**

| Crash (UTC)    | Run    | Arm              | Viewport, theme | Into the matrix step |
| -------------- | ------ | ---------------- | --------------- | -------------------- |
| 09-11 06:45:02 | 133    | profile owner    | 820x1180 light  | 9m57s                |
| 09-11 08:34:46 | 139    | profile owner    | 430x932 light   | 10m48s               |
| 09-11 08:36:03 | 139    | profile owner    | 744x1133 dark   | 12m05s               |
| 09-11 15:58:57 | 141    | profile owner    | 820x1180 light  | 12m21s               |
| 09-11 17:58:19 | 147    | auth flows       | 1280x800 dark   | 22m45s               |
| 09-11 19:06:07 | 154    | profile owner    | 820x1180 dark   | 13m03s               |
| 09-11 19:48:30 | 156    | viewport arm     | 820x1180 dark   | 3m30s                |
| 09-12 06:07:18 | 160    | auth flows       | 390x844 dark    | 22m37s               |
| 09-12 10:05:18 | 172    | profile owner    | 820x1180 dark   | 13m00s               |
| 09-13 08:10:59 | 180    | profile owner    | 820x1180 light  | 12m12s               |
| 09-16 22:18:33 | 234    | auth flows       | 1280x800 dark   | 26m53s               |
| 09-16 23:40:08 | 241    | onboarding flows | 390x844 dark    | 29m49s               |
| 09-17 04:42:18 | 245    | viewport arm     | 1024x1366 light | 4m24s                |
| 09-17 17:19:46 | 253 a1 | block flow       | 390x844 dark    | 28m08s               |
| 09-17 17:59:47 | 254 a1 | viewport arm     | 390x844 light   | 1m21s                |
| 09-17 22:57:17 | 250 a3 | onboarding flows | 390x844 dark    | 28m49s               |
| 09-17 23:25:50 | 250 a4 | block flow       | 390x844 dark    | 26m38s               |

**Why earlier days look clean, and it is not that they were.** `armCrashed`, `"behind a web-process
crash"` and the `page.on("crash")` listener all arrived in one commit, `3090336` of 10 September, and
the same commit's job shape is the second half of it: until ruling 283 split the engines, one `matrix`
job drove Chromium and WebKit together, so a day's WebKit passes are not comparable across that
boundary either. Before 10 September a lost web process surfaced as a closed-target error or a
thirty-second timeout and was counted as neither. The rate did not rise on 17 September; counting
started.

**The rate, by Pacific day.** Numerator exact from the logs; denominator approximate, counted as runs
whose latest attempt lasted long enough to complete a matrix pass, which undercounts re-run attempts.
11 September: six of sixteen jobs, 37 per cent. 16 September, the busiest day of the window at 25
passes: three, 12 per cent. 17 September: four of nine, 44 per cent. 11 September and 17 September are
the same number at this sample size, and the busiest day is the lowest. This is ruling 265's rate and
this entry's "about one per six full profile matrix runs" measured again over a wider window: about
one crashed arm per four to five WebKit passes.

**Three explanations tested and all three refuted.**

- **Concurrency is not the variable.** Run 250 attempt 4 crashed with one matrix job in flight on the
  whole account; attempt 3, thirty minutes earlier on the same head, crashed with three. The busiest
  day of the window had the lowest rate.
- **Ordering and accumulation are not the variable.** The sightings run from 81 seconds into the
  matrix step, run 254 attempt 1 at about the fifth arm of 205, to 29m49s, run 241 in the last arm
  group. There is no curve. The apparent concentration at `390x844 dark` is an artefact of which arms
  exist where: the flow arms run at `[390,844]` and `[1280,800]` only, both themes, so that
  combination is one of four by construction and not one of eighteen.
- **Nothing in the environment moved.** Runner `2.337.0`, image `ubuntu-24.04` version
  `20260907.300.1` (release `ubuntu24/20260907.300`), provisioner `20260828.587`, Playwright `1.63.0`,
  WebKit 26.6 `playwright webkit v2359`: identical between run 108, which passed on 10 September, and
  run 250 attempt 4, which crashed on 17 September. Consistent with the fault being anchored to
  offsets inside a fixed `libWPEWebKit-2.0.so.1`, and it closes off "something moved under us".

**The last surviving constant is broken.** This entry says what survives is WebKit and the Profile
surface at `/m/:handle`. Six of the seventeen are the profile owner flow and **all six are from 10 to
13 September**. Since then it has crashed on the block control flow, onboarding flows, auth flows, and
twice on a bare viewport arm that only renders and measures. The surface is not a variable either, and
the modal viewport simply tracks whichever heavy arm exists at the time: `820x1180` held six sightings
while profile owner was the heaviest arm, `390x844` six once the flow arms were. Every constant ruling
200 named is now refuted by this entry's own evidence, which leaves WebKit's compositor and nothing
else. The next step is unchanged and is still the only one that decides whose defect it is: symbolise
the offsets against a WebKit 26.6 debug build.

**What CI now captures, and what it did not.** At the moment of the crash the harness had one log
line, the sticky flag on every failing check behind it, Playwright's error text and, in the artefact,
`arms.json`. It had no core, no stack, no memory figure, no browser stderr, no answer to whether the
browser died with the web process, and no timeline at all, because nothing is printed for a passing
check: this census had to place each crash by step timestamps. Rulings 830, 831 and 832 close that,
and the table above is the argument for each of them. 830 ports matrix.yml's core dump, gdb frames and
offset resolution onto the WebKit job of the PR path, asks `browser.isConnected()` inside the crash
handler, listens for `disconnected`, and prints one line per arm. 831 stops a crashed or late-throwing
arm reading as a stale declaration. 832 makes one crashed arm unproven under 228 rather than red, and
keeps a second crash failing. Ruling 833 declined an arm-level retry.

## G6. Withdraw separated the two states ruling 214 joined — closed (ruling 229)

**Opened and closed 9 September 2026, both inside Fix PR 01. Ruling 227 stated the requirement,
ruling 229 chose option 1 of the three the gap set out. Kept here rather than deleted, because the
rejected options are the reason the chosen one costs what it costs.**

Ruling 214 joined `window` to `sent`: a decline inside the window and a request still waiting return
byte-identical payloads from every projection, so the sender cannot tell them apart by reading.
Verified live in that PR, on the Members card, on the Sent row and on `profile_view.relationship`.

The action is not joined. On Profile a `sent` relationship renders a **Request sent** button wired to
`withdraw_request`. `withdraw_request` updates a `pending` row and nothing else, so:

| The sender's state          | What Request sent does                                  | What the surface then shows   |
| --------------------------- | ------------------------------------------------------- | ----------------------------- |
| Pending request             | the row becomes `withdrawn`, the pair returns to `none` | the Connect action comes back |
| Declined, inside the window | nothing; the update matches no row                      | the button stays              |

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

| Surface                       | Before                                                              | After                                       |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| Profile's Request sent button | pending → `none`, window → `sent`                                   | both stay `sent`                            |
| Members card `rel`            | pending `sent`, window `sent`, withdrawn `none`                     | all three `sent`                            |
| My Network → Sent             | row vanishes on withdrawal, stays for the window                    | row stays for both, for the window's length |
| Suggested                     | a withdrawn candidate reappears, a window one does not              | neither reappears                           |
| `send_introduction`           | accepts a re-send from the withdrawn sender, refuses the window one | refuses both, one message                   |

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

## G9. Strand has no show-password affordance, no eye icon and no loading button (Brief 4B) — two of three closed (Design pass 01)

**Severity: low. Not a merge blocker. Opened 10 September 2026 building Brief 4B, and recorded in
the handoff (section 4) as gaps to be raised in Strand rather than patched locally. Two of the three
closed on 13 September 2026 by Design pass 01: `PasswordField` and the two eye icons landed
(rulings 392, 491), and `AuthHead` plus `AuthColumn` took the logo-and-heading pattern out of the
page compositions (rulings 377, 390, 487, 491). The Show passwords checkbox is gone from
`/reset/new` and `/password`; the eye toggle is inside each field. `Button` still has no `loading`
prop, and the separator, the provider buttons and the focusable alert are still page-level
compositions.**

Three parts the auth surfaces needed and Strand does not carry. All three are worked around at page
level in this build, and the workaround is what the handoff says to keep in Code:

- `Input` has no show-password affordance, and no `eye` icon exists in `public/strand/icons/`.
  `/reset/new` and `/password` use a Strand `Checkbox` labelled "Show passwords" and swap the input
  `type` themselves.
- `Button` has no `loading` prop. Every auth submit uses `disabled` plus a label swap ("Sign in" to
  "Signing in", "Send reset link" to "Sending", and so on).
- The "or" separator, the provider-button pattern and the focusable alert block are page-level
  compositions of Strand parts, in `src/components/dna/AuthSurface.tsx`. They are staged in Strand's
  own `STRAND-HANDOFF.md` if Strand wants them as components.

A fourth part was missing from the repo rather than from Strand: `Checkbox` is shipped in Strand but
had never been ported here, so `src/components/strand/Checkbox.tsx` is a port in the same idiom as
`Switch`, not a new component. Nothing reads shadcn's checkbox (rulings 70, 72).

## G10. The provider marks are placeholders, and LinkedIn's wording is unconfirmed (ruling 233)

**Severity: medium at the invite boundary. Not a merge blocker (ruling 140). Opened 10 September
2026 building Brief 4B.**

`public/strand/marks/google.svg` and `public/strand/marks/linkedin.svg` are neutral grey glyphs
drawn as placeholders. They are deliberately not imitations of either trademark. Before the first
real member invite:

- Replace `google.svg` with the official "G" from the Sign in with Google branding guidelines.
- Replace `linkedin.svg` with the official "in" logo from the LinkedIn brand downloads.
- Confirm the button wording against LinkedIn's terms. The build ships "Continue with Google", which
  Google permits, and "Sign in with LinkedIn" on both the sign-in and the sign-up surface, because
  LinkedIn's terms favour that wording and offer no sign-up variant. If LinkedIn's current terms
  permit "Continue with LinkedIn", the label is one string in
  `PROVIDER_BUTTON_LABEL` (`src/lib/auth-flow.ts`).

Both marks resolve by path and are never imported as a module, so the swap is a file overwrite in
one directory with no component edited. Ruling 232 holds either way: a provider mark appears on its
own button and nowhere else.

## G11. Ruling 234's identity-linking arms cannot run unattended

**Severity: medium at the invite boundary. Not a merge blocker (ruling 140). Opened 10 September
2026 building Brief 4B. Reported UNPROVEN, never as passing (ruling 228).**

Ruling 234 asks that one address arriving by two providers be tested rather than assumed. No browser
can drive a real Google or LinkedIn consent screen, so `tests/auth-identity.cjs` checks the state the
round trip leaves behind instead: exactly one `auth.users` row for the address, every provider
identity on that one user id, and exactly one `public.members` row for it.

The arms need `SUPABASE_SERVICE_ROLE_KEY` and an `IDENTITY_EMAIL` that a human has signed in to by
both providers at least once. Neither is available to a CI run today, so all three arms report
UNPROVEN and are counted apart from the passes. They close when a human does the two sign-ins once
against the canonical project and the key is added as a repository secret.

## G12. The manual publish unblock left one image filed under a consumed post id

**Severity: low at the invite boundary. Not a merge blocker (ruling 140). Opened 10 September 2026
closing the publish path defects (rulings 287 and 288).**

Founder account `5099248b-7c3e-4d50-ab61-3a13b9826bca` was wedged by D2: a draft carrying an already
consumed `post_id` failed `posts_pkey` on every retry, and the rollback restored the draft each time.
The unblock, done out of band on 10 September and before this fix, rewrote that draft's `post_id`
from `5425de85-e25b-4634-be8d-2fad7a62b751` to `35c0b123-2228-49cc-b76e-bc71d8df8a90`. The attached
image was already uploaded and stays at
`5099248b-…/5425de85-…/7d73ea0d-….jpg`, under the previous post's folder, because storage paths are
written at upload time and the rewrite touched only the draft row.

The consequence is one object whose read is gated on the wrong post id:
`post_media_objects_member_select` resolves the folder segment to
`5425de85-e25b-4634-be8d-2fad7a62b751`, which is a different published post from the one the image
now belongs to.

Accepted risk, low: both posts are `audience = 'everyone'`, so the mismatched gate admits exactly the
audience the correct gate would have admitted and nothing is withheld from or disclosed to anyone.

It closes by moving the object to the folder for the post that now owns it, or by leaving it and
letting the member re-attach; either is a data touch on one row, not a code change. The guard shipped
in `20260910065849_publish_path_defects.sql` means no further draft can reach this state.

## G13. The reset landing overwrote its own completion (ruling 318, superseding 301)

**Severity: medium. A product defect in Brief 4B's `/reset/new` route, not a harness fault. Opened
11 September 2026 from PR #21's first run carrying ruling 301's diagnostic. Fixed in the PR that
opens this entry; recorded so the history of the arm reads correctly.**

Ruling 301 held that the auth recovery arm was the failure most likely to be mistaken for a real
one, and instrumented it so the next firing could be classified rather than guessed at. Run 120
([34537723787](https://github.com/jodombrown/dna-web-application/actions/runs/34537723787)), the
first run carrying that diagnostic, `matrix (webkit)`:

```
FAIL [no crash] webkit-390x844-dark-auth: recovery landing flow completed TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[data-testid="reset-done"]') to be visible
 | {"url":"https://claude-dna-page-crash-regist.dna-web-application.pages.dev/reset/new","rendered":["reset-new"],"alert":"","busy":"false"} | updateUser calls 1 | logout scopes ["others"]
```

Read in order: not a lost web process, so not G5. The password update reached the mock and was
answered. The scoped sign-out ran. `aria-busy` is false, so `submit()`'s `finally` ran. No alert,
so nothing was rejected. And the form is still the rendered stage. The surface completed the
password change, signed other devices out, and stayed on the form.

The cause is in `src/routes/reset_.new.tsx`. `submit()` ends with `clearRecovery()` and
`setStage("done")`. The `[ready, session]` effect ends with `setStage("form")`. `updateUser` and the
scoped sign-out both replace the session object the effect depends on, so the effect re-runs after
the submit resolves; by then the recovery flag has been cleared and the session is live, which is
the `form` branch, and it overwrites `done`. Whether the effect lands before or after the `done`
set is scheduling, which is why it showed only in WebKit and moved between viewport and theme
pairs: runs 113, 115 attempt 2, 116, 117, 119, 120, 122 and 123, never twice at the same pair, and
never in Chromium.

**Ruling 301 is superseded by 318 because the arm was never unstable.** It was reporting a real
defect the harness could not previously distinguish from noise; the flake reading rested on failures
that recorded nothing but the selector they timed out on. The instrumentation ruling 301 added was
correct and stays; its premise that the fault was probably in the arm was wrong, and one classified
firing settled it.

The fix is the smallest change the arm can prove: both `setStage` calls in that effect become
functional updaters that leave a `done` stage alone. No route restructuring, no new arm, timeout not
raised. The existing recovery arm is the proof, because it already fails in the engine that shows
the defect and passes in the one that does not.

## G14. Brief 5 landed its schema first and its surface second (rulings 90, 225, 334 to 336)

**Severity: none open. Recorded 11 September 2026 so the two-step landing is legible in the tree.**

`onboarding/SPEC.md` did not arrive with the first Brief 5 handoff, so PR #23's first commit carried
only what the handoff governs on its own: `20260911090000_b5_stance_onboarding.sql`, the four
onboarding functions, the `onboarding` Edge Function and the stance rename in the client. The SPEC
arrived with register revision 6, and the second commit built the three screens, the gate in the
root route and the split matrix arm to it. The SPEC is committed at `docs/onboarding/SPEC.md`.

The migration was held until the surface existed, because applying it renames the wire keys
`main`'s deployed client reads. It was rehearsed against the canonical project inside a rolled-back
transaction first, then applied with the surface, still committed before applied (ruling 225).

Rulings 334 to 336 confirm the decisions the first commit had to take against the live schema:
username is three to forty characters, enforced in `onboard_who`; a later stance change on Profile
stamps `stance_declared_at` by trigger; `members.handle` is the username and `who_completed_at`
marks screen one. Profile's visible label still reads Segment and is corrected under 300 in the
Profile spec as a follow-up, not here (ruling 336).

The ruling 218 test accounts completed onboarding once through the real surface, by
the Responsive matrix workflow dispatched with `onboard=1`, which runs
`tests/onboard-test-accounts.cjs` against the deployment: Owner Test touched a card, Member Test did not, and the live arms in
`tests/live-checks.cjs` read that difference every run rather than bypassing the gate.

## G15. A name that folds to nothing gets no username suggestion, and the hint still promises one (ruling 343)

**Severity: low. Not a merge blocker. Recorded 11 September 2026 with the transliterating fold.**

Ruling 343 made the username derivation transliterate rather than delete: trim, NFKD, strip
combining marks, then SPEC section 9's rules, the same fold in `private.derive_username` and
`deriveUsername` in `src/lib/onboarding.ts`. "Jaûne" derives `jaune` where it derived `jane`.

Two shapes still derive nothing, measured against the canonical project before the change was
written (ruling 242):

- A name in a non-Latin script (王小明, Кирилл, أحمد) has no compatibility decomposition to ASCII,
  folds to nothing, and leaves the username field empty. The `'member'` placeholder both readers
  used to substitute is gone: the server returns a null suggestion, `onboard_who` refuses an empty
  username as invalid, and the member types one. Screen one's hint still reads "We'll suggest one
  from your name.", which is not true for them; the copy needs a fallback line for the empty
  field, and it is copy, so it waits on a ruling rather than being invented here.
- Four Latin letters have no decomposition either and still fall to the ASCII filter: Ø (Søren
  Ødegård derives `sren-degard`), ß (`strae`), Ł (`ukasz`) and Æ (`sir`). A transliteration table
  (Ø to o, ß to ss, Ł to l, Æ to ae, and the Icelandic Þ and Ð) would close these; it is a second
  fold rule on both sides and waits on the same ruling.

The fold on both sides was checked against sixteen names, identical output on all sixteen; the
matrix's onboarding-flows arm proves the client half on "Jaûne Ñoño-Ålund".

## G16. The mosaic cannot show the ruling 459 exclusion at five members (rulings 459, 228)

**Severity: low. Not a merge blocker. Recorded 13 September 2026 with the W49 amendment.**

Ruling 459 excludes an account that has not finished onboarding from `connect_cards` in every lens,
from `connect_where` and from `send_introduction`. Two of the three are measured on the deployment:
the live arm clears `onboarded_at` inside a rolled-back transaction, reads `connect_cards` and calls
`send_introduction`, and measures both against the same calls with `onboarded_at` set (ruling 270).

`connect_where` cannot be measured the same way. It is the country mosaic, not a list of members: it
returns the names of countries holding at least `private.setting_int('where_floor', 5)` admitted
members, so it carries no member id and one member entering or leaving a country is observable only
at that floor. The canonical project holds twelve members across two countries, four in the largest,
so the mosaic is empty for every viewer and stays empty either way. The arm reads it both ways,
reports that half UNPROVEN with that reason, and never folds it into the passing count (ruling 228).
It becomes measurable once any country holds five members whose profiles admit the viewer; the arm
already records a pass in that case without a change.

What is proven meanwhile: `public.connect_where` reads `private.is_onboarded` in both its counting
arms, asserted by the migration itself (`20260913072642`), and the predicate is the same one the
measured `connect_cards` filters on.

**Ruling 559 makes this a cold-start gap rather than a standing asterisk.** The arm reports UNPROVEN
because the cohort is too small for the mosaic to name any country, which is correct under ruling 228
but means the surface stays unexercised until the corridor fills. The close condition is five members
sharing a country whose profiles admit the viewer — not a code change, and specifically not lowering
`private.connect_settings` key `where_floor` to make the arm run, which would change product behaviour
to make a test pass. Recorded as 559 so that a permanently unproven arm is read as a cold start rather
than as noise.

## G17. The migration tree records the project's history and no longer replays from zero (rulings 466, 444, 225)

**Severity: medium for a new environment. Not a merge blocker, and not a defect on the canonical
project. Recorded 13 September 2026 with the drift repair.**

The second amendment restored the seventeen amended migration files to the statements the project
recorded, byte for byte, so the tree and `supabase_migrations.schema_migrations` now agree row for
row and the drift arm is green. The amendments that were removed had been carrying one change: the
seven RLS helpers moved from `public` to `private` after `b1_rls` was applied. That change is now
its own migration, `20260913065215_r466_private_helpers_recorded`, which necessarily sorts last.

So a replay from an empty database in version order fails: `20260907010622_b2_notifications` creates
policies calling `private.is_admin()`, which nothing before it creates, and nine further files down
to `fix_pr_02` reference the same seven helpers in `private` before the migration that puts them
there. `supabase db reset` against a local stack stops at the first of them.

Both ways out are decisions, not repairs to take unasked:

- a back-dated migration that creates the seven helpers in `private` immediately after `b1_rls`,
  which puts a version in the tree that the project never recorded, exactly the divergence ruling
  444's arm exists to catch; or
- a squashed baseline: one migration holding the schema as it stands, with the history behind it
  archived, which makes the tree replayable and ends the row-for-row correspondence with the
  project's recorded history.

Until one is taken, the canonical project is the only environment the tree describes, and a new
environment is built by restoring from it rather than by replaying migrations.

**Ruling 563 adds one requirement to whichever way out is taken: the baseline must be dumped after the
14 September correction.** It has to capture `public.connection_requests` with a null `expires_at` on
all ten rows, not the single timestamp the column default wrote through the catalog's missing value
(G23). A dump taken before that correction would bake the defect into the one artefact a new
environment is built from, and the false header in `20260913220000` would then be describing the
baseline as well as the file. Ruling 544 keeps the baseline itself out of Fix PR 03's line of work, so
this is the requirement recorded rather than the dump performed.

---

## G18. Design pass 01 arrived without `EXTRACTION.md`, so four system-page strings are unwritten

**Severity: low. Not a merge blocker. Opened 13 September 2026 building Design pass 01
(rulings 90, 495, 496).**

The pass was handed over as `HANDOFF.md`, `STRAND-CHANGES.md`, `STRAND-HANDOFF.md`, `APP-SPEC.md`
and the register. `design-pass-01/EXTRACTION.md`, `design-pass-01/DP01-Design-Pass-01.dc.html` and
`design-pass-01/strand-patch/*` did not. The divergence list is what Code builds from and it arrived
with real content, so ruling 90's stop-and-report applies only to what is genuinely absent rather
than to the pass:

- **B10 item 5.** "Copy, new, awaiting a ruling: reset sent, 404, 500 and stub page lines are in
  `EXTRACTION.md` under 'New copy'." Ruling 496 requires the new strings verbatim, so they were not
  invented. Those four pages carry their existing copy on the pass's layout: one `AuthHead`, one 480
  column, centred with auto margins, one act and a footer line. Items 1, 2, 3, 4 and 6 of B10 are
  built; item 5 is the only one outstanding, and it is a copy change with no code shape behind it.
- **The prototype page.** `DP01-Design-Pass-01.dc.html` is the exit check's visual reference
  (handoff section D). Every state was built to the divergence list and the surface's own approved
  page instead. A state-by-state probe against the prototype is owed once it lands.
- **`strand-patch/*.jsx`.** The Strand parts were written from `STRAND-CHANGES.md`, which specifies
  each one in prose, into this repo's TypeScript. Nothing was reconstructed from ruling summaries.

## G19. Three notification kinds name a destination that has no surface yet

**Severity: low. Not a merge blocker. Opened 13 September 2026 building Design pass 01 B17
(rulings 462, 490).**

Every row now names its destination in words before the tap. Two of the five have somewhere to go:
`connection_accepted` opens the other member's profile and `connection_request` opens My Network's
Requests. `attestation_received`, `space_role_approved` and `event_reminder` name "Opens the
contribution", "Opens the Space" and "Opens the event"; none of those objects has a route, because
Convene is Brief 6 and Collaborate and Contribute follow it. Those rows mark read on open and go
nowhere. Grounded-or-empty applies to a route as much as to a count, so nothing is faked; the
navigation lands with the engine that owns the object.

Two related notes on the same rows:

- `connection_request` is not yet in the `notification_kind` enum. Ruling 461 adds it and is Fix PR
  03's scope, not this pass's; no migration was written here. The client carries the kind, its copy
  and its destination, so the row renders correctly the moment the enum lands.
- "Opens the event" is Code's wording. The handoff names four destinations verbatim (B17 item 1) and
  `event_reminder` is not among them, so its line is written to the same shape and flagged here
  rather than presented as ruling 496 copy.

**Addendum, Fix PR 03 (ruling 547).** The three kinds are now suppressed from the registry rather
than rendered with a destination that leads nowhere. `NOTIFICATION_REGISTRY` in
`src/components/strand/NotificationListItem.tsx` holds only `connection_accepted` and
`connection_request`; `loadNotifications` drops a row whose kind the registry does not hold and
`hasUnread` will not raise the bell's dot for one, so a member is never sent to a list with nothing
in it. `tests/notifications.cjs` asserts the contract and names the suppressed kinds on every run, so
the register does not become the only place they are recorded. Ruling 547's reason for suppressing
rather than exempting: an exemption list is a second place where the contract lives and it outlives
the reason it was written.

The three kinds keep their approved words here until their surface ships and they rejoin the
registry: `attestation_received` is "Opens the contribution", `space_role_approved` is "Opens the
Space", `event_reminder` is "Opens the event" (the last still Code's wording, per the note above).
Two consequences worth naming rather than fixing here:

- `connection_request` is still absent from the `notification_kind` enum. The note above records it as
  Fix PR 03's scope, but the Fix PR 03 handoff's twelve items do not name it and DONE MEANS allows no
  schema beyond what the scope names, so no migration was written. `tests/notifications.cjs` prints
  it as "in the registry, not yet in the database enum" on every run. It needs a ruling that puts it
  in a PR, not a decision taken inside one.
- The notification list's empty state still says rows appear "when a member accepts your connection
  request, attests a contribution, approves your Space role, or an event you joined is near". Two of
  those four can no longer appear. It is approved copy and no ruling supplies a replacement, so it
  was left exactly as it is (G18's lesson); it needs a ruling, not a rewrite.

## G20. The branch's first Pages preview served static files and 404ed every route — closed, one-off

**Severity: medium while it stood, and it blocked the exit check rather than the build. Opened and
closed 13 September 2026 during Design pass 01 (rulings 61, 217). Closed by the next push: Pages run
182 deployed the same branch, ruling 217's gate passed, and the live job ran its checks against the
deployment. The deployment path is sound and the failure below was one bad deployment, not a
reproducible fault. Left recorded because the symptom is worth recognising on sight and because the
next occurrence has somewhere to start.**

Pages run 181 deployed `8c41028` successfully and returned the alias
`https://claude-dna-design-pass-01-wp.dna-web-application.pages.dev`. Ruling 217's gate then polled
that deployment for seventeen minutes and got 404 on every route it opens (`/sign-in`, `/connect`,
`/reset`, `/reset/new`, `/password`, `/welcome`, `/where`, `/relationship`,
`/.well-known/security.txt`) while every static asset answered 200 (`/strand/logo.png`,
`/favicon.png`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`,
`/manifest.webmanifest`, `/strand/adinkra/mate-masie.svg`). Static files serving while every
dynamic route 404s is the shape of a deployment whose worker is not being invoked, not of an
application error, and all three jobs (chromium, webkit, live) failed at that gate with nothing
tested.

The build is not the cause, and that was measured rather than assumed. The same `dist/` was served
locally through `wrangler pages dev` on the deployment's own compatibility date and flags, and every
one of those paths answered 200, the new icons included. The tree also passes lint, `tsc`, the
contact parity and no-literal scan and the token check.

Two facts narrow it. The run immediately before it, run 180 on `claude/pr-02-dna-core-ewcqod`,
deployed to the same Pages project eleven minutes earlier and its own gate passed, so the project
itself was serving. And Cloudflare truncated this branch's alias to twenty-eight characters
(`claude-dna-design-pass-01-wp` from `claude/dna-design-pass-01-wpwb8a`), which is the same length
as that branch's alias; the aliases differ, but the truncation is worth ruling out before anything
else.

The redeploy settled it. The push carrying the Sheet and onboarding corrections triggered run 182 on
the same branch and the same alias, and the gate passed on the first poll of every path. So: one bad
deployment, not the branch, not the alias truncation, and not the build. If it recurs, redeploy
first, and only if a second deployment 404s the same way pass `matrix.yml`'s `base_url` the
deployment URL (`https://<hash>.dna-web-application.pages.dev`) instead of the alias.

---

## G21. WebKit runs only in CI, and design pass 01 proved that costs defects

This container carries Chromium and no WebKit, so a local `node tests/matrix.cjs` proves the
Chromium half of ruling 61's matrix and nothing else. Under ruling 228 every WebKit arm is therefore
**unproven until the CI run reports it**, and a local green is never the exit check.

That is not a theoretical cost. Run 183 on `128fff0` was green on Chromium — 76, 55 and 74 arms with
no failing check, every failure ruling 292 count drift — and red on WebKit with two defects that
Chromium could not have shown, each systematic rather than a flake:

**The onboarding explainer's focus.** Eighteen arms, every viewport and both themes:
`focus lands on the sheet heading (ruling 222)`. `ExplainerSheet` kept a private focus timer and a
private Tab trap from before the pass rewrote `Sheet`, so two mechanisms competed for the same
focus: the Sheet focuses on a frame after the dialog enters the top layer, the local copy focused on
a 30ms timer, and whichever landed last won. Chromium's rAF fires inside 30ms and the heading won;
WebKit's rAF inside a freshly opened `<dialog>` runs later, so the Sheet's fallback control won and
focus never reached the heading. Fixed by deleting all three local copies — the timer, the trap and
a hand-rolled focus restore — and marking the heading `data-sheet-heading`, which is the wiring the
Sheet already reads. This is ruling 480 and 499's "one Sheet" holding: a second copy of the focus
contract is not redundancy, it is a race.

**The composer measured mid-slide.** One arm, `webkit-360x800-light publish within viewport`: the
publish row sat at y 934 in an 800-tall viewport, on a panel whose top was 189px below its resting
place. Not a layout defect — the harness waited a fixed 500ms for a 300ms slide, which holds on
Chromium and loses on WebKit, where the transform starts a frame later and runs slower under CI
load. The sibling check passed in the same breath because a translate does not change height. Fixed
with `sheetSettled()`, which polls for the panel's resting `transform: none` instead of sleeping.

**A fill against a moving sheet, run 184.** With both of those fixed, run 184's WebKit job came back
4827 of 4831 with two arms incomplete: `webkit-1280x800-dark-publish` timed out waiting for DIA's
line, and `webkit-1280x800-dark-guards` found Publish still disabled after thirty seconds. Publish
is gated on `has` (text, media, link or a field), not on DIA, so a disabled button after a `fill()`
means the text never reached React state; the same cause starves DIA, which is why one push produced
both. The discriminator is not the engine, the viewport or the theme: the base arm at that same
viewport, theme and engine passed in the same job, exercising the same composer and the same DIA.
The one difference is that the base arm had just been given `sheetSettled()` and these two had not,
so they filled the textarea while the sheet was still sliding — and Playwright's `fill()` checks
visible, enabled and editable, but not stable. Both flows now settle the sheet before the first
fill, and a DIA wait that fails reports what the textarea actually held and what the line actually
showed, so a recurrence names its limb instead of timing out mutely.

Confidence in that reading is **moderate, not proven**: WebKit cannot run here, so the mechanism is
inferred from which arms passed rather than reproduced. The change is strictly safer either way, and
the reporter is there precisely because the next occurrence should not need this reasoning again.

The method note: a fixed sleep before a geometric assertion, a duplicated focus contract, and a fill
against a moving element are all engine-dependent races. Each reads as green on the engine that
happens to win. None is visible without the WebKit job.

## G22. Ruling 410's auth mail templates are console work whose copy the repo does not carry

**Severity: low. Not a merge blocker. Opened 13 September 2026 building Fix PR 03 item 12
(rulings 410, 496, 548).**

The code half is already standing. `src/lib/contact.ts` exports `AUTH_SENDER` as `accounts@` with
Reply-To `support@` and a display name of DNA, mirrored value-for-value at
`supabase/functions/_shared/contact.ts`, and `tests/contact.cjs` fails the build if either address
appears anywhere else. There is nothing to change in the repository: Supabase Auth's templates and its
SMTP sender live in the Supabase console, which is why the handoff calls this "console plus template
work, no code seam".

What is outstanding, and why it was not written here:

- **The sender pair.** Set the Auth SMTP sender and its Reply-To to exactly the two addresses
  `AUTH_SENDER` declares, with its display name. Read them from `src/lib/contact.ts`
  (`CONTACT.authSender.address` and `CONTACT.support.address`); they are not repeated here, because
  the ruling 387 absolute bars an address literal from a document as much as from a surface, and the
  scan arm of `tests/contact.cjs` enforces it. Mechanical: ruling 387 already decided both values.
- **The three copy changes (W6, W21, W24): the reset footer, the password-changed heading once rather
  than twice, and a support line on every template.** These are member-facing strings and the Fix PR
  03 handoff does not carry ruling 410's approved text. Ruling 496 requires approved strings verbatim,
  so they were not invented; G18 records what happened the one time a string was needed and no ruling
  supplied it. This needs ruling 410's text pasted into the console, not a draft from here.

Nothing in the deployed app changes when this lands, so no arm can prove it from the repository. The
proof is a reset mail received from the `authSender` address, replied to, and arriving at the
`support` one.

**Status, 13 September 2026.** Drafts for all three strings now exist and are awaiting the founder's
approval by number under ruling 496; they are deliberately not quoted here, because copy that has not
been approved should not sit in the repository looking as though it has. Two notes carried with them:

- The draft footer omits the reset link's expiry duration on purpose. Nobody has read the value
  configured in Supabase, and a number written into approved copy without reading it off the console is
  the same failure this gap exists to record. If it is wanted in the line, the configured value comes
  first and the line is redrafted after.
- The support line necessarily contains an address. It is approved and pasted into the Supabase console,
  which the ruling 387 scan does not read — but it must never be quoted into a repository file, including
  this one. `tests/contact.cjs` fails the build if it is, which is the absolute working rather than an
  inconvenience: the addresses live in `src/lib/contact.ts` and its Deno mirror, and nowhere else.

## G23. The introduction expiry window is a seeded default, not a ruled number

**Severity: low. Not a merge blocker. Opened 13 September 2026 building Fix PR 03 item 7
(rulings 482, 485); applied and amended with ruling 563 on 14 September 2026.**

Fix PR 03's item 7 asks for "the `expires_at` purge". At `b4b21ab` no table in `public` or `private`
carried an `expires_at` column and nothing in the schema treated a pending introduction as expiring;
the only trace of ruling 482 in the tree was the Sent empty state, which already tells a member their
introductions wait "until they are accepted, or until they quietly expire".
`supabase/migrations/20260913220000_r482_485_introduction_expiry_purge.sql` is what makes that true:
the column, a nightly `pg_cron` job, and `private.purge_expired_introductions()`, which deletes the
pending rows past their window. Deletion is ruling 482's silence — no declined row, so no decline
window starts and the pair returns to `none`, which is what reopens requesting immediately — and it
needed no read projection to change, which is what kept it out of Fix PR 05's territory.

**Applied.** `supabase db push` recorded it on the canonical project on 14 September 2026 under the
file's own version, and ruling 444's drift arm reads `37 matched, 0 drift, 2 empty`. Ruling 553 records
why the CLI and never the MCP: applying this same file through `apply_migration` on a throwaway branch
recorded the statements byte-identically, md5 `a10dc390598f7ebcb660c32852f56089` on both sides, but
under the version the tool minted for itself, `20260913220047`, which trades one drift row for two.

**The window is a seeded default, and ruling 557 keeps it at 30.** No ruling in the handoff supplied a
number, so it is `private.connect_settings` key `introduction_expiry_days` rather than a constant in a
predicate: `update private.connect_settings set value_int = <days> where key =
'introduction_expiry_days';` changes it, with no migration. Thirty is deliberately shorter than the
90-day decline window, because silence should clear faster than a refusal blocks. Ruling 557 settles it
on a narrower argument than that: expiry is silence (ruling 482), the sender is never told it happened
and simply regains the ability to ask, so the whole cost of a longer window falls on the sender's
patience and produces no signal to anyone, while a shorter one mostly raises the rate at which a
recipient who is deliberately not answering gets asked again.

One consequence of the asymmetry below is worth stating with it: a recipient who declines buys 90 days
of quiet, and one who ignores buys 30. Under ruling 157 the sender cannot tell the two apart, so
declining is strictly the better move for a recipient who wants to stop being asked, and it costs them
nothing socially. The asymmetry nudges toward the cheaper, signal-free action rather than toward
silence.

**Changing the number is forward-only, unlike the decline window.** The two settings live in the same
table and are read through the same helper, and they behave in opposite ways:

| Setting                         | Read                                                | Effect of changing it                                                     |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `decline_window_days` (90)      | per call, inside the RPCs, against `responded_at`   | retroactive: every existing declined pair is re-windowed at once          |
| `introduction_expiry_days` (30) | once, at insert, as the `expires_at` column default | forward only: rows already pending keep the window they were stamped with |

`private.purge_expired_introductions()` compares the stored `expires_at`, never a recomputed window,
which is what makes that so, and the semantics are right this way round: the Sent empty state promises
a member their introductions wait "until they are accepted, or until they quietly expire", and a live
predicate would move that promise under them whenever the setting moved. But a wrong guess is then
correctable only going forward, and re-windowing rows already in flight would be a data `update` on
`public.connection_requests` rather than a settings change. Thirty was free to revise until the first
introduction was sent after the push, because every row that existed then carried a null `expires_at`.

### Ruling 563: the column default reached every pre-existing row, and this migration's header says it does not

`alter table public.connection_requests add column expires_at timestamptz default (now() +
make_interval(...))` does not leave existing rows alone. Since Postgres 11 a default that is not
volatile takes the fast path instead of rewriting the table: the expression is evaluated **once** and
stored as the column's missing value, which every pre-existing row then reads back. `now()` is STABLE,
not volatile, so that is the path taken, and the effect is indistinguishable from a backfill.

Read from the catalog after the push, `pg_attribute` for the column showed `atthasmissing = true` and
`attmissingval = {"2026-10-14 02:35:25.485652+00"}`: one timestamp, read by all ten rows, across
`pending`, `accepted`, `declined` and `withdrawn` alike.

**What it would have cost.** The four pending rows the live arms depend on would have been deleted by
the nightly purge on 14 October, and a published Connect post rendering through
`connection_request_intros` would have quietly lost the who and why it shows (ruling 157) — the exact
outcome the paragraph below says the nullable column exists to prevent.

**Corrected, and verified.** The rows were restored to null by hand in the SQL Editor on 14 September
2026; reading the project afterwards gives 10 rows, **0 carrying an `expires_at`**, 4 pending, 0
pending with an expiry. The update writes a real null into every tuple, so the missing value is
unreachable rather than merely overridden: it stays in the catalog until some later table rewrite, and
no new row can read it, because an insert stores the default's evaluated value in the tuple itself.

**The file cannot be fixed, which is why this is written here.** Its header says "the column is
nullable with no backfill, so every row written before this migration has a null `expires_at` and can
never be purged". Ruling 466 forbids amending an applied migration. The claim's conclusion now holds,
but only because 563 was found and corrected, not because the migration left those rows alone.

**A clean replay is safe, by ordering rather than by design.** No migration seeds rows into
`connection_requests`: every `insert into public.connection_requests` in the tree sits inside a
function body. So on a fresh replay the table is empty when this migration runs, and the missing value
has no tuple to reach. That is the whole reason an un-amendable file with a false header is survivable
here, and it is fragile in one specific way — anyone who later adds a seed migration with an earlier
version arms the trap without touching the file. Ruling 564 puts the general rule in
`tests/migration-lint.cjs`: in a new migration, `add column` on a nullable column carrying a `default`
is flagged unless it is split into two statements or carries an explicit marker comment declaring that
reaching existing rows is intended. `not null default` is exempt, because reaching every row is what
makes that constraint hold.

**What was always deliberate, and still is.** Rows written before the column existed carry a null
`expires_at` and are never purged. Ruling 400 removed Connect from the composer, so the only
`connection_requests` a published Feed post can point at are older ones, and purging those would empty
the who and why such a card renders through `connection_request_intros` (ruling 157).

## G24. Warm-on-open is unbuilt, and the composer's cold path is accepted silence until it is

**Severity: low. Not a merge blocker. Opened 15 September 2026 under ruling 637, filed under ruling
597, from the ruling 74 measurement (PR #38).**

**What ruling 637 decided.** The composer's cold path is accepted at launch as designed silence under
rulings 52 and 54. A DIA read that does not resolve inside the budget renders nothing and the composer
stays as it was; that is the behaviour ruling 54 specified and ruling 52 requires, not a failure of it.
So the cold path is recorded here as accepted rather than as a defect, and **warm-on-open is not built
now**.

**What was measured, so the acceptance rests on numbers rather than on an estimate.** Dispatched runs
[53](https://github.com/jodombrown/dna-web-application/actions/runs/34932032166) and
[54](https://github.com/jodombrown/dna-web-application/actions/runs/34933023641) of `matrix.yml`, job
`dia-latency`, against the deployed `dia-compose-read` (version 11) on `claude-sonnet-5`:

|                                       | n   | p50  | p95  | max  |
| ------------------------------------- | --- | ---- | ---- | ---- |
| the function's own `latency_ms`, warm | 77  | 2045 | 2672 | 3009 |
| client wall, warm                     | 77  | 2242 | 2851 | 3189 |

Warm, nothing came near the 3400 ms abort: 728 ms of headroom at p95 server-side, 649 ms under the
composer's 3500 ms budget. Cold is the whole of the exposure. Run 53's first three calls were 3411,
3405 and 3403 ms and returned null; run 54's first was 3108 ms and returned an inference. Three
breaches in 83 calls, every one an opening call against a cold isolate, and the ephemeral prompt cache
had expired between the two runs. So the cold path sits at the edge of the budget and crosses it
sometimes, which is a different thing to decide about than a deterministic breach — and what a member
sees when it crosses is one DIA line that never appears.

**The mechanism to prove before density, and why it is deferred rather than dismissed.** Warm-on-open
is the candidate: a request issued when the composer mounts, so the isolate is booted and the system
prompt is in the ephemeral cache by the time the member's first 700 ms debounce fires. It is deferred
because the cost curve runs the right way. An isolate retires after a short idle, so at launch volumes
most composes start cold; as composing traffic rises the isolate is already warm and the opening-call
penalty is paid by fewer and fewer members. Density makes this cheaper, not dearer, which is why
building it now would be paying for a problem that shrinks on its own.

**Unasserted until the arm is re-run against it (ruling 228).** `tests/dia-latency.cjs` proves nothing
about warm-on-open today: no run has ever exercised it, because it does not exist. Whoever builds it
owes the same arm re-run against a genuinely cold isolate — dispatch `matrix.yml` with
`dia_latency: "1"` after a long enough idle — showing the opening call inside the 3400 ms abort. Until
that run exists, no claim that warm-on-open closes this may appear in a report, a ruling summary or
this file.

## G25. Every ruling 74 number was measured from North America, and the West African edge is unmeasured

**Severity: medium at the continental invite boundary. Not a merge blocker. Opened 15 September 2026
under ruling 637, filed under ruling 597.**

**Proof owed: the same arm, unchanged, run from the closest available West African region, before
invites reach the continental side.**

**What the existing sample does and does not cover.** The two dispatched runs measured two different
edge regions, and neither is near a member the continental invites are for. Run 53 was served from
`us-east-2` (`cf-ray …-ORD`, runner in Azure `eastus`); run 54, eight minutes later against the same
deployment and the same function, from `us-west-1` (`cf-ray …-LAX`, runner in `westus3`). That pair is
the finding: the region follows the caller, so `us-east-2` is where run 53's calls ran and not a
property of the function.

Two consequences, stated separately because they have different causes:

- **The client wall figure does not travel.** It carries the caller-to-edge leg, so the 649 ms of
  headroom under the composer's 3500 ms budget is headroom for a North American caller. A member in
  Accra or Lagos has less, by an amount nobody here has measured.
- **The server-side figure may not travel either.** `latency_ms` is the Anthropic hop measured inside
  the function, which is independent of the caller's distance but not of the edge region the call runs
  in. Both samples measured that hop from North America. Which region Supabase routes a West African
  caller to is unmeasured, and this file does not guess at it: the arm prints `x-sb-edge-region` from
  the response for exactly this reason, so the run names the region rather than the reader assuming
  one.

**What the run needs, and the one open question in it.** `tests/dia-latency.cjs` takes `BASE` and the
ruling 218 credentials from the environment and needs nothing else, so it runs anywhere with Node 20
or later and egress to the deployment. What it does not have is a vantage point: GitHub-hosted runners
offer no West African region, so this needs a host in or near the region — a self-hosted runner, or a
single attended run from a machine there — and choosing which is a decision rather than a task. The
arm itself does not change; if it did, the comparison with runs 53 and 54 would be worth less than the
new numbers.

**What it settles when it lands.** Whether the 3.5 s client budget holds for a continental member with
their own leg included, and which edge region their calls are served from. Until then, ruling 74's
budget is proven for North American callers and unproven for the members the continental invites are
addressed to.

## G26. `CardFade` takes an optional scroller and falls back to `window`, which never scrolls

**Severity: low, latent. Not a merge blocker. Opened 15 September 2026 under ruling 595, filed under
ruling 597.**

**What ruling 595 requires.** A component that takes a scroller never defaults to `window`, and a
scroll-driven effect with no scroller throws rather than attaching to something that will not fire.

**What the tree does instead, read rather than assumed.** `src/components/strand/CardFade.tsx` declares
`scroller?: HTMLElement | null | undefined` and its own doc comment says "Omitted means the page";
`groupFor` then does `const target: EventTarget = scroller ?? window` and attaches the shared rAF
loop's `scroll` listener to that target. Under ruling 104 the shell owns one scroller per tier and the
document never scrolls inside it, so `window` is precisely the target whose `scroll` event never fires.
The failure is silent by construction: a card registered against `window` keeps whatever opacity it was
first given instead of raising anything.

**Both call sites pass a scroller, so this is a signature rather than a sighting.** `ConnectSurface`
(the `CardFade` around `MemberCard`) and `FeedSurface` (the one around the post cards) both pass
`scroller={scrollerRef.current}`. What makes the default reachable anyway is that `scrollerRef.current`
is null until the shell's scroller mounts, and the effect is keyed on `[scroller]` — a ref's `.current`
changing does not re-render the parent, so a first registration made while it is still null persists
until the parent re-renders for some other reason. No misattached card has been observed on the
deployment, and this entry does not claim one; it records the signature ruling 595 forbids and the
reason the forbidding is not academic.

**What is owed.** Make `scroller` required and throw when it is absent, in that one file. The two call
sites already pass it, so the cost is the file plus whatever the throw surfaces about the null window
between mount and scroller — which is the point of throwing.

## G27. Ruling 597's own instance: the ruling 74 follow-ups were comments before they were gaps

**Severity: none as a defect; recorded as the register's own audit trail. Opened 15 September 2026 under
ruling 597.**

**The rule.** A follow-up found during a PR earns a G number, not a comment. Ruling 638 completes it: a
G number is assigned only by writing the entry into this file, never reserved in a PR body, a report or
a chat message.

**The instance, which is this one.** The ruling 74 measurement (PR #38, merged as `23c2979`) produced
two follow-ups — warm-on-open and the West African edge measurement — and both were first written as
comments on that PR, where they read as finished thoughts about a merged change. They became gaps only
when ruling 637 sent them here as G24 and G25. Nothing was lost, because the same session wrote both;
the failure mode is the one where it is not the same session, and a merged PR's comment thread is not
where anyone looks for the register.

**Why a comment cannot stand in for an entry.** A PR comment is addressed to that PR's reviewers and
dies with the thread; a gap entry is addressed to whoever reads this codebase next and has to survive
the PR entirely. The two artefacts also fail differently: a comment nobody reads costs nothing visible,
while a missing gap entry is rediscovered as a surprise, which is the cost this file exists to avoid.
So the test for "does this need a G number" is not severity — G24 is severity low and G27 is not a
defect at all — but whether an absence would otherwise have to be inferred.

## G28. The session-open commit check is a discipline with no arm, and its shape is an id allowlist

**Severity: medium. Not a merge blocker. Opened 15 September 2026 under ruling 598, filed under ruling 597.**

**The shape, which ruling 598 fixes.** The check is an allowlist of GitHub account and app ids, never a
denylist of names. The ids are `214720153` (`jodombrown`), `81847` (`claude`) and `319149162`
(`region17gh`, the Region 17 seat under ruling 369). The reasoning is ruling 379's: a git author name or
email is free text that the committer sets, so a denylist of names fails open on exactly the identity
nobody anticipated, while an allowlist of ids read from the API fails closed on anything unrecognised
and names it.

**What the repository does not have.** Nothing in `tests/`, `scripts/` or `.github/` references any of
those ids, or app id `159125892`. The check is performed by a session reading `main`'s recent commits
through the API at session open and reporting what it finds; a session that skips it fails nothing, and
no run records that it happened. That is the gap. It was performed for PR #38 and the result written
into that PR's body, which under G27's own reasoning is the weaker of the two places to put it.

**One question this entry does not settle.** CLAUDE.md's permitted-identity list also carries
`gpt-engineer-app[bot]`, app id `159125892` (rulings 146, 286), which is Lovable committing straight to
`main` and which ruling 146 requires be reported and rebased onto rather than merely tolerated. Ruling
598's allowlist names three ids and not that one. Whether the Lovable app id belongs inside the
allowlist or stays outside it as an expected-and-reported identity is the founder's call; a session
reading the allowlist today should treat a `159125892` commit as expected, report it, and rebase, which
is what ruling 146 already says.

## G29. `tests/auth.cjs` section 7 waits fifteen seconds on a render instead of on the mock

**Severity: low. Not a merge blocker. Opened 15 September 2026 under ruling 574, filed under ruling 597.**

**The arm and the wait.** Section 7 of `tests/auth.cjs` proves that sign-up's "Check your email" state
is byte-identical whether or not the address already has an account (rulings 432, 384). It fills the
form, clicks submit, and then does `page.waitForSelector('[data-testid="check-email"]', { timeout:
15000 })` — fifteen seconds of patience for a rendered state, with no signal that the request it depends
on was even served. Ruling 574 records that it fails roughly one WebKit run in eighteen. That rate is
574's figure and was not re-measured here.

**The fix ruling 574 names.** Key the wait off a signal from the mock rather than off the render.
`mockAuth` in the same file already intercepts `**/<project-ref>/auth/v1/**` and fulfils the sign-up
call itself, so the arm can wait for that response — or for a flag the route handler sets when it serves
it — and only then assert the state. A wait that resolves on a response the test itself produced cannot
be slow for a reason the test does not control, which is what makes fifteen seconds unnecessary rather
than merely generous.

**The same shape appears fourteen times in the file, and that is not this gap's scope.** Every
`waitForSelector` in `tests/auth.cjs` carries `timeout: 15000`. Ruling 574 names section 7's, which is
the one with a measured failure rate; the others are the same pattern and become work when one of them
earns it.

## G30. Ruling 605's Sheet migration is unstarted, and its mapping leaves one question open

**Severity: medium at the invite boundary. Not a merge blocker, by ruling 605. Opened 15 September 2026,
filed under ruling 597.**

**What ruling 605 asks for.** `variant` and `width` out of Strand's `Sheet`, `tier` and `size` in, with
`variant="sheet"` becoming `tier="compact"` and `variant="drawer"` becoming `tier="medium"`.

**What the repository carries now.** `src/components/strand/Sheet.tsx` declares
`variant?: "sheet" | "drawer"` defaulting to `"sheet"`, and `width?: number | string`, used as
`const sheet = variant === "sheet"` and `const w = sheet ? "100%" : len(width ?? SHEET_WIDTH)` against
`SHEET_WIDTH = "40%"` and `COMPOSER_SHEET_WIDTH = "50%"`. Seven Strand call sites pass `variant`:
`ProfileSurface`, `OnboardingSurface`, `IntroSheet`, `ConnectSurface` (through its own `sheetVariant`),
`ProfileBlockControl`, `NotificationPanel` and `Composer`. Exactly one passes `width`: the composer, at
`COMPOSER_SHEET_WIDTH`.

**The migration is mostly the deletion of a conversion the call sites already perform.** Every one of
the seven computes the variant from a tier it is already holding — `compact ? "sheet" : "drawer"`, or
`tier === "compact" ? "sheet" : "drawer"` in the composer and the notification panel. Ruling 605 lets
them pass the tier they have instead of converting it down and letting `Sheet` convert it back.

**The open question, which is why this is not a mechanical rename.** The shell's tier vocabulary is
three values, `compact | medium | expanded`, and the call sites' own prop types say so. Ruling 605's
mapping is two-to-two: `"drawer"` covers both medium and expanded today and maps to `tier="medium"`. So
either `Sheet`'s `tier` takes all three values and the expanded call sites pass `"expanded"` — which
needs a decision about whether expanded behaves as medium does — or it takes two and its name collides
with the shell's three-value tier, which is the kind of one-flag-two-meanings collision ruling 590 was
written about. `size` has the smaller version of the same question: only the composer needs a
non-default today, so the vocabulary has to cover the canonical 40 percent and the composer's 50 and
nothing else until something asks.

**Not in scope when it lands.** `src/components/ui/sheet.tsx` and `src/components/ui/sidebar.tsx` are a
different, shadcn `Sheet` with a `side` prop, untouched by this and its own question under rulings 70
and 72.

## G31. A chromium sighting on the public profile at 1280 by 800, seen once and not reproduced

**Severity: none as a defect; recorded as a sighting, so that a second one has a first to sit beside.
Opened 15 September 2026, filed under ruling 597.**

**What was seen.** Run
[207](https://github.com/jodombrown/dna-web-application/actions/runs/34935945656) of `pages.yml`,
attempt 1, job `matrix (chromium)` on `ee05a0b`, failed two arms and only two, both at 1280x800 and both
the signed-out public profile. `chromium-1280x800-light profile public` threw `page.goto: Timeout
30000ms exceeded` navigating to `/m/thandiwe-dube` on the branch preview under `waitUntil: "networkidle"`,
and `chromium-1280x800-dark profile public` threw `page.waitForSelector: Timeout 20000ms exceeded`
waiting for `[data-testid="profile"]:not([data-view="loading"])` at the same path. Both landed in
`runPublic`'s catch in `tests/profile.cjs` as one `profile public flow` record each, and the page state
the catch dumps with them reads `view: null` — the profile element was not in the document at all, rather
than present and still loading.

**The other four failures are ruling 292's accounting, not four more defects.** The job reported 4930 of
4936 checks, over 76 compact arms clean, 55 medium clean, 72 of 74 expanded clean, 0 that lost a web
process and 6 unclassified. Four of the six are INCOMPLETE records: `profile public` emitted 1 of 16 in
each theme, which is the catch's own record and nothing else, and `profile owner` emitted 32 of 33 in
each theme. The owner arm's missing check is a coupling rather than a second failure, and it is worth
naming because the log does not. Its thirty-third record is "View as public matches the signed-out page
section for section (check 5)", which `tests/profile.cjs` guards with `if (pubRun !== undefined)` against
the section list the public arm stores in `seenPublic`; the public arm timed out before it reached that
`set`, so the comparison was skipped rather than failed. One arm's failure shortens another arm's
declared count, silently but for 292.

**Why it is recorded as transient.** Attempt 2 of the same run re-ran the chromium job alone and reported
4968 of 4968 with 74 of 74 expanded arms clean and 0 unclassified. 4968 − 4936 = 32 is exactly the
15 + 1 + 15 + 1 checks the four INCOMPLETE records name, so the two attempts differ by the failure and
its consequences and by nothing else. The re-run drove the same head and the same artefact: GitHub re-ran
only the failed job, `deploy` did not re-execute (its attempt 2 record carries attempt 1's 06:13:12 to
06:13:54 timestamps), and both attempts read the same branch preview from the same `BASE`. WebKit drove
the same widths in the same run's attempt 1 and was clean at 1280x800 in both themes, and run
[208](https://github.com/jodombrown/dna-web-application/actions/runs/34941026322) drove the same tree on
`main` after the merge and was green. Under ruling 228 it is attempt 2, not attempt 1's pass count, that
proves those 32 checks on that head.

**Ruling 554 is not the explanation, and that was checked rather than assumed.** 554's signature is a push
landing under running arms and retiring the preview's hashed assets. Nothing was pushed to the branch
between `ee05a0b` at 06:12:49, the push that created run 207, and the merge at 07:18:20, which created
run 208. Attempt 1's arms ran 06:14:22 to 06:41:05 and attempt 2's 06:51:15 to 07:17:29, both inside that
window, and the branch's only deploy finished at 06:13:51 before either. So the cause is unattributed,
which is the whole of what this entry claims.

**What is owed.** Nothing, unless it recurs. Both failures are on the navigation leg to the deployed
preview rather than inside an assertion, so there is nothing in a surface or an arm to fix from one
sighting, and a fix guessed from one is a change nobody can later attribute. A second sighting is what
would earn the work, and the first is recorded here because the pair is the evidence, not either half:
run 207's artefacts `matrix-chromium-run-207` hold both attempts, attempt 1 as artifact 10384635140 and
attempt 2 as 10385176388, with the arm's screenshots.

## G32. The composer's `created_object` assembly against the namespaced store is flat, dotted keys; the app assembles none

**Severity: low, a contract note. Not a merge blocker. Opened 16 September 2026 by the Convene Pass
1 handoff (section 0, G32 owed), filed under ruling 638: the number is assigned by this entry.**

**What the handoff says.** Pass 1's host "builds the card from `created_object.convene.*`" (3.2), and
the prototype's `publishedCard` does exactly that. The handoff asked Code to confirm the assembly
before PR 3 built on it.

**What the bundle does, read rather than assumed.** Strand's Composer at `v1789537371639386`
assembles `post.created_object` as
`Object.fromEntries(Object.entries(fv).map(([k, v]) => [k, v.value]))` whenever a verb is active. It
is the whole field store flattened: every key of every verb that ever held a value, with the supplied
form's keys under their dotted names (`"convene.title"`, `"convene.meta"`, `"convene.place_query"`),
not nested under `convene`. Nothing in the bundle nests, filters by the active verb, or drops the
preview-only keys. `created_object.convene.*` in the handoff therefore means "the entries whose key
starts with `convene.`", which is how the prototype reads it (`k.startsWith('convene.')`), and not a
`created_object.convene` object.

**What the app does instead.** The app's Composer hands the host `ComposerState.fields`, the store
itself, and assembles no `created_object`. `src/lib/publish.ts` flattens that store into
`payload.fields` for `publish_post`, dotted keys included, and the function is the only reader of
them (20260916120200). The published card is not built by the host from the store at all: on
`onClose('published')` the shell invalidates the Feed read and the card renders from the rows the
one projection returns, which is what the one-read-projection absolute asks for and what the
prototype's timer-based `publish` stood in for. So there is no host-side assembly for PR 3 to build
on, and none is needed: the meta line the prototype computed from `created_object` is the same line
`src/lib/feed.ts` computes from `events` and `event_delivery`.

**What is owed.** Nothing in code. If a later surface needs the Composer to hand over an assembled
object rather than the store, it takes the bundle's shape: flat, dotted, unfiltered, and the host
filters by prefix. This entry exists so the next reader does not look for a nested object the bundle
never produces.

## G33. Two `live` jobs on different branches share one project and two test accounts, and one run's fixture can be read by the other's arm

**Severity: low, a harness gap. Not a merge blocker. Opened 16 September 2026 during Convene Pass 1's
PR 1, filed under ruling 597: a follow-up found during a PR earns a G number, not a PR comment. The
number is assigned by this entry (ruling 638).**

**What was seen.** Pages run 223 on `1e34082` (PR 1) and run 224 on `85fadea` (PR 2) started within a
minute of each other after a merge forward. Their `live` jobs ran against the same canonical project
with the same OWNER and MEMBER test accounts. PR 2's F3 arm set the owner's Private switch at
19:40:08.96 UTC and restored it at 19:40:09.47, both committed through REST. PR 1's ruling 416 arm
read the owner's post from `public.feed` as the member at 19:40:09.37, inside that window, and got
`author_name null`: `private.can_see_core` reads `members.profile_private`, which the other run had
just set. The arm recorded `FAIL ruling 416` (98 of 99) on a head whose diff was two policy lines in a
migration file. PR 2's own run, five seconds later, read 99 of 99, and every run before it that day
read 99 of 99 on the same arm.

**Why the transaction wrapper does not cover it.** `tests/live-db.cjs` runs its arms on one pg client
inside a transaction it rolls back, so nothing an arm writes reaches another run. `tests/live-checks.cjs`
F3 and F4 are REST arms: they change the owner's switches and the block row through PostgREST as the
signed-in accounts, commit, and restore a moment later. The restore is part of the same run's sequence,
not of the database's isolation, so a concurrent reader on another branch sees the interim state.
`pages.yml`'s `concurrency` group is per ref, which serialises runs of one branch and nothing across
branches, and the stacked Convene PRs push three branches at once by design.

**What it costs.** A red `live` job that is nobody's, on whichever branch's arm happened to read during
another branch's fixture window, at a rate set by how often two branches push together. Under the CI
rules it is a re-run once identified, and a re-run passes; the cost is the identification, which took
reading two logs side by side, and a red check on a PR that was green.

**Second sighting.** Pages runs 250 (PR 42, `e6e35f2`) and 251 (PR 44, `19b1087`), both `live` jobs pushed
a minute apart and running their arms at 05:09:58 and 05:09:59 UTC on 17 September. Run 250's F4 fixture
held the block while run 251 inserted it (`F4: the viewer blocks the other member` read 409, `23505`),
then tore it down under run 251's reads (`B4A section 4` read `viewer_blocked false`, `B4A section 7`
read `relationship present`). Three arms red on a head whose diff touches none of them; the fix below
is unchanged, and until it lands two `live` jobs are never re-run together.

**The fix this entry names.** One of two shapes, and not both. Either the REST fixtures move inside the
same rolled-back transaction as the live-db arms (F3's switch and F4's block are one `update` and one
`insert` under the caller's role, which `actAs` already provides), so no run commits fixture state at
all; or the `live` job takes a cross-branch concurrency group (`live-${{ github.repository }}`, not
cancelling in progress), so two runs never overlap the project. The first removes the window; the
second only serialises it, and the first is the one that also holds for a founder's own test on the
project during a run.

**Not this gap's scope.** The arms' assertions and counts stay as they are; the 416 arm was right to
read null, since the owner was Private at that instant.

**What confirmed the cause, 17 September 2026.** Run 252 on PR 3, whose `live` job ran with no other
branch's `live` job anywhere near it, read all three arms green on the same assertions and the same
fixtures that had failed on run 251 twenty minutes earlier. Nothing in the diff between the two heads
touches F3, F4 or B4A. Overlap is the whole of it, which is why the two re-runs after the
`place-resolve` redeploy at 16:08 UTC were fired one after the other, PR 2's first and PR 3's only
once PR 2's had finished, and both came back green.

## G34. The draft-restore check in `tests/matrix.cjs` waits a fixed 300 ms after `Continue your draft`, not on the restore

**Severity: low, a harness gap in G29's shape. Not a merge blocker. Opened 16 September 2026 during
Convene Pass 1's PR 3, filed under ruling 597. The number is assigned by this entry (ruling 638).**

**What was seen.** Pages run 228 on `c1d6811`, `matrix (webkit)`, one check on the `webkit-1536x960-dark`
arm:

```
FAIL [no crash] webkit-1536x960-dark Continue your draft restores it, and Draft saved is still the only trace
0 behind a web-process crash (G5) | 0 an aborted fetch on mocked REST | 1 unclassified
5035 of 5036 checks passed
```

No crash, no aborted fetch, no network error in the job, and the same code green on WebKit at
5036 of 5036 in runs 216, 218 and 222 that day: the branch's diff since run 222 is two policy lines
in a migration file and a `docs/GAPS.md` entry, neither of which the composer loads.

**The wait.** The check clicks `[data-testid="continue-draft"]`, then `await page.waitForTimeout(300)`,
then asserts three things at once: the textarea's value begins with the draft's words, the
`continue-draft` control is gone, and `Draft saved` appears exactly once. Three hundred milliseconds
is a guess at how long the restore takes on a loaded WebKit; when the guess is short, the first or
second assertion reads the pre-restore state and the check fails with nothing wrong in the app.

**The fix this entry names.** Wait on the signal the restore produces rather than on the clock:
`await dialog.locator('[data-testid="continue-draft"]').waitFor({ state: "detached" })` and
`await expect(ta).toHaveValue(/^(Three intros|We need a volunteer)/)` (or a `waitForFunction` on the
value), then assert the `Draft saved` count. A wait that resolves on the state the assertion needs
cannot be short. The same fixed-wait shape appears elsewhere in the file (`waitForTimeout(150)` after
clicks in the Convene arm, added in Pass 1) and is not this gap's scope until one of them earns it.

**Second sighting.** Pages run 235 on `402e708`, `matrix (webkit)`, first attempt, at
`webkit-1366x1024-light`: the same check, the same shape, one viewport over from the first. Two sightings
in one day at two widths on two heads whose composer code is the same is a timing that the fixed wait
loses often enough to name it a recurring cost, not a one-off.

**Third sighting.** Pages run 244 on `da0e7da` (PR 45, the LensBar fix), `matrix (webkit)`, first attempt,
at `webkit-430x932-dark`: the same check, the same shape, on a head whose composer code is `main`'s. Its
one re-run passed 4981 of 4981. Three sightings on three heads at three widths, all WebKit, none with a
crash; recorded here at PR 3's next code push rather than as a doc-only push to the branch it was seen on
(ruling 556).

**Fourth sighting, and the fix, 17 September 2026.** Pages run 253 on `7270755` (PR 3, the 807 dedupe),
`matrix (webkit)`, the re-run, at `webkit-1536x960-dark`: the same check, the same shape, 5060 of 5061,
no crash. Four sightings on four heads at four widths, all WebKit. That re-run was the head's one, and the
first attempt had already been spent on a G5 crash on `webkit-390x844-dark-block-flow`, so the choice was
a red head the founder cannot merge or the fix this entry has named since it was opened. The fix is in:
the check now waits for `continue-draft` to detach and then for the textarea to actually hold the draft's
words, each with its own timeout and its own failure sentence, rather than for 300 ms. The assertions and
the arm's declared count are unchanged, so a real regression still fails exactly as before. The other
fixed waits in the file (`waitForTimeout(150)` in the Convene arm) have not earned the same treatment and
are left alone.

**Not this gap's scope.** The check's assertions and the arm's declared count stay as they are.

## G35. Mapbox Search Box carries no POI for Ghana, Kenya or Nigeria, so a Convene host there always falls to their words

**Severity: medium for the surface, none for the code. Not a merge blocker. Opened 16 September
2026 during Convene Pass 1's place-anchoring correction (Session 23), filed under ruling 597. The
number is assigned by this entry (ruling 638).**

**What was seen.** The founder typed `Front Room Osu Accra` on PR 3's preview and got nothing; `Front
Room` alone returned a Front Room in Bangkok. The correction read that as an anchoring fault, and the
anchoring fault was real (the call carried no `proximity`, so Search Box anchored on the Edge node's
IP). But anchoring is not what emptied the Ghana answer. Through Mapbox's own Search Box tooling,
with `country=GH`: `Kempinski Hotel Gold Coast City`, `Labadi Beach Hotel`, `Alliance Française
Accra`, `Kotoka International Airport`, `Accra Mall`, `Makola Market` and `University of Ghana` return
no `poi` feature at all; what comes back, when anything does, is a `place`, `locality` or `country`
feature (Accra, Abura, Ola, Ghana), which the function's `types=poi,address` never asks for. With
`proximity` at Accra and no country, `Kotoka International Airport` returns cafés and car hire in
Saudi Arabia and Oman with `distance` in the millions of metres: the nearest POI Mapbox knows for
those words is on another continent. Kenya (`Alliance Française Nairobi`, `Sarit Centre` under
`country=KE`) and Nigeria (`country=NG`, `types=poi`) behave the same. South Africa and the United
Kingdom return POIs and streets. Every POI that did come back anywhere carried
`external_ids.dataplor`, which is the one POI source Search Box exposes here.

**What it means for the surface.** Case 2 of the anchoring rule (no home, stated country) is correct
and does what it says: `Front Room` under `country=GH` is `none`, which is Mapbox's own zero and reads
as `No place found for that. It is kept as you wrote it.` That sentence is now true, where before the
correction it was not, and the event publishes with the words in `place_text`. But a host in Accra,
Nairobi or Lagos will read it for every venue they own, and the resolved row (place, coordinates, a
zone from the place) never forms for them; the zone then comes from the host's browser, because words
carry none, not from the venue. The market the surface is built for is the one the provider does not cover.

**The fix this entry names.** A decision before code. Either a second POI source for the African
footprint behind the same `place-resolve` contract (the function's four states and the row's shape
do not change; the provider behind `suggest` and `retrieve` does), or DNA's own venue vocabulary that
members grow, read at runtime as every fixed vocabulary is, with Search Box as the fallback for the
rest of the world. Both are a ruling and a brief, not a patch. Until then the four states and the
hints are honest, and `docs/` should say plainly that a Ghana venue will not resolve.

**Not this gap's scope.** The unavailable state, the anchoring rule and the live arms are Session
23's and are in; the Ghana arm in `tests/live-checks.cjs` asserts what is true (a Mapbox answer with
nothing outside Ghana), and the country filter itself is proven on the United Kingdom.

**Addendum, 17 September 2026 (ruling 810), and why this is not a new number.** Ruling 810 asks for
the Ghana coverage fact to be written into the register so it is not investigated a third time. It is
already here, opened a day earlier under 597, and a second entry for one fact is what 638's
"the number is assigned by the entry" exists to prevent: the next reader opens the register and finds
two, and neither says which is current. So this stands as G35 and no G38 was minted. What 810 adds,
recorded here: the founder, composing from California against PR 3's preview on the redeployed
function, typed `Labadi Beach` and got nothing, and `Labadi` returned the area it sits in, which is
the same shape as the `Front Room` evidence above and the first time it was read on the anchored
build rather than the IP-anchored one. The interim answer is ruling 784's: the member's words stand
beside a resolved area, so a Ghana host publishes their venue words with the area's name, city, point
and zone, and the card reads them back. The third named fix, beside the two above, is a host-placed
pin under ruling 790, which is Pass 4's answer if one is wanted; it needs no provider at all. None of
this is a defect and none of it blocks the merge.

## G36. The lens bar could never fall back to icon-first on the Feed, its fit test did not match its layout, and no check read the layout it produced

**Severity: medium for the surface, and it reached production: PR 0's correction 14 is on `main`. Opened
16 September 2026 during Session 23, filed under ruling 597. The number is assigned by this entry (ruling
638).**

**What was seen.** The founder, on an iPhone in Safari at 390 wide against PR 3's preview, read a lens label
painted over the neighbouring lens's icon. Both matrix engines had passed every arm on the same build at 390.

**What it was.** Three things, established in this order on the branch that fixes them, and none of them
iOS.

1. **The Feed's lens set could never switch.** Correction 14's rule is that a set with a lens lacking an icon
   never renders icon-first, because that lens would have nothing to fall back to. `src/lib/lens.ts`
   shipped `all` without an icon, so `canSwitch` was false, no probe was rendered, `fit` was set true
   and the bar rendered labels at every width on every engine. The first form of the shell check on this
   branch read the bar as `mode: labels` at 360, 390 and 430 with no probe in the document, which is what
   made this visible. `all` now carries `globe`, the set's icon for everything a member can see.
2. **The fit test did not match the layout it decided for.** The track gives the active tab its content
   width (`flex: none`) and every other tab an equal share of what is left (`flex: 1 1 0`), so a label
   fits only if it fits its share. The test compared the sum of the labels' natural widths against the
   track, which passes while a long label overflows a short share: run 239 on this branch read
   `network` at 86px of content inside a 72px share at 390 with the sum test satisfied. The test now
   takes the widest label as an active tab plus the widest as an inactive tab times the others, with
   the gaps and the track's padding, against the track.
3. **Nothing re-measured after the web font arrived.** The measurement ran once at mount and again only
   on track resize, and the fonts are self-hosted with `font-display: swap`; a swap after hydration
   widens every label with no re-measure. Fixed alongside (re-measure on `document.fonts.ready` and on
   every later font load), and the probe no longer sits in a zero-size clipped box read through
   `scrollWidth`, which was the reading the correction arrived with; neither of those two was the cause
   of what the founder saw, and both could have been the next one.

**Why the matrix did not see it.** It had no assertion on the bar's layout. It checked the bar's presence,
its lenses, the active lens and the URL, and never that a label sat inside its tab. The shell arm now
does, at every viewport on both engines, after `document.fonts.ready`: no tab's content exceeds its box
and the track does not scroll, whichever mode the bar chose. With that one check in place the defect
reproduced on Chromium on the first run, which is the whole point of the check.

**What the matrix still cannot do.** Ruling 61 names Safari, and the matrix runs Playwright's WebKit on
Linux, which shares WebCore with Safari and not its iOS text, font-loading or scrolling behaviour. The
founder's iPhone is the only iOS check this project has. This time iOS was where a person happened to
look, not what was different; the next time it may be the other way round, and a real-device pass
(BrowserStack, or a Playwright run on a macOS runner with an iOS simulator) is the fix this half names.

**Not this gap's scope.** Connect's lens bar carries its own set and is not read by the shell check; if
its set ever loses an icon it fails the same way, silently, until a check reads it.

## G37. With the fit test corrected, the medium tier reads icon-first for a 3px shortfall that `main` hid inside a label's padding

**Severity: low, a Design decision rather than a defect. Opened 17 September 2026 during Session 23 on
PR 45, filed under ruling 597. The number is assigned by this entry (ruling 638).**

**What was measured.** The G36 fix's shell check, run on Chromium against `wrangler pages dev dist` of
`458e285` and of `main` at `1eb7ab8`, at the same widths:

| Build     | 390 by 844 (track 358)                               | 744 by 1133 and 1024 by 768 (track 616)       | 1280 by 800 (track 760) |
| --------- | ---------------------------------------------------- | --------------------------------------------- | ----------------------- |
| `main`    | labels, `network` at 86px of content in a 72px share | labels, nothing over its box by more than 1px | labels                  |
| `458e285` | icon-first                                           | icon-first                                    | labels                  |

The corrected test needs 619px for labels on the Feed's set: the track's 8px of padding, four 2px gaps,
the widest label as the active tab (131px, "My Network") and the widest as an inactive tab (118px)
times the four others. At 616px the four inactive tabs get a 117.25px share each, so the widest label's
118px does not fit by 0.75px, and the bar renders icon-first at every medium-tier width. On `main` that
same 0.75px was clipped out of the label's 8px side padding, under the check's 1px tolerance and below
anything an eye could see; the medium tier read labels and looked right.

**Why it is logged and not fixed here.** Correction 14's rule is binary, labels fit or they do not, and
the test now answers it exactly. Making the tier read labels again is one of three choices, none of
them the PR's to make: a tolerance in the test (which hides a real overlap the next time a label is a
pixel wider), 1px less side padding on inactive tabs (8 becomes 7, saving 8px, and the tier fits with
5px to spare), or a wider column at the medium tier. The founder owns the lens bar; the choice goes to
Design with these numbers.

**Not this gap's scope.** The compact tier is the founder's screenshot and reads icon-first correctly;
the expanded tier fits with 141px to spare.

## G38. A published in-person event with no resolved place carried the host's browser zone, not the country's

**Severity: high for the surface, and it reached the stored row rather than only the rendering.
Opened 17 September 2026 during Convene Pass 1's PR 3, filed under ruling 597. The number is assigned
by this entry (ruling 638). Fixed on the same branch under rulings 813, 817 and 821; this entry
stands as the record of what it was and how it was read.**

**What decided it.** `src/components/dna/ConveneForm.tsx:204` to `210`, as it stood:

```ts
const tz: string | null = !format
  ? null
  : physical
    ? knownZone(placeTz)
      ? placeTz
      : browserTz
    : browserTz;
```

`placeTz` is written only by `pick()` from a resolved place. With no resolution the field is empty
and the zone fell to `browserTz`, the host's own; the payload carried it as `convene.timezone` and
`20260916120200_p1_publish_post_convene.sql:175` read it into `events.timezone`. A Ghana event
composed from California was stored `America/Los_Angeles`.

**The part that was worse than the label.** `zoneForInstants` is the same value, and
`startsAt = instantFor(date, time, zoneForInstants)`, so the zone interpreted the host's typed time
rather than only labelling it. A host in California typing `7pm` for an Accra event stored 03:00 the
following day in Accra, and every viewer read that instant. Ghana is where it was found because
Mapbox resolves no venue there (G35), which makes the words-only path the normal path for exactly the
market the surface is built for.

**Why it survived the founder's test.** The composer never showed the browser zone in words in that
state: `whenSuffix` reads `, time zone from the place once it is set`, and the `Time zone …, from the
place.` line renders only when a place resolved. The wrong value was stored, never displayed.

**What the fix turned out to cost, and why this entry was rewritten.** As first written this entry
named four pieces and the first was a migration, because no country-to-zone source existed in the
repo: `public.world_countries` is `(name text primary key, position smallint not null unique)` with
no alpha-2 and no zone, and the only name-to-code fold lives server-side in `place-resolve`. Ruling
817 asked whether the runtime could answer instead, and it can. Through that same fold and ICU's
Intl Locale Info API, all 195 stored names return at least one IANA zone with no Mapbox call:
`GH` one, `CD` two, `US` 29, and 168 of the 195 exactly one. So `anchor` returns `zones` beside the
code, the form takes the single zone silently, asks only for the 27 that carry several (821), and
falls back to its previous behaviour where a runtime cannot say. No column, no table, no migration,
and no hardcoded array: the zones are a runtime vocabulary from the function, like every other.

**The two-shape read is load-bearing, and only the deployment could show it.** The Intl Locale Info
API ships in two shapes, a getter `locale.timeZones` and a method `locale.getTimeZones()`, and
`zonesFor` reads `(l.getTimeZones?.() ?? l.timeZones)` for that reason. That looked like ordinary
defensiveness when it was written and it is not: **the deployed Deno runtime answers through
`getTimeZones()`, while the Node 22.22 probe that scoped ruling 817 carries only the getter.** Written
to either shape alone, `anchor` would have returned `zones: null` for all 195 countries on one of the
two runtimes, the form would have fallen back to the host's browser zone exactly as before, and
nothing would have failed: the fix would have shipped inert. What proved it is `zones_via` in the
response, which names the shape that answered, and the live arm reading it back from the deployed
function rather than from a local run. The general lesson is ruling 545's again, one layer down: a
capability probed in one runtime is a fact about that runtime, and the only environment that settles
an Edge Function's ICU is the one the function runs in.

**Not this gap.** The resolved-place path was correct throughout: a place that resolves carries its
own zone from its own point. Online events keep the host's browser zone by ruling 824, which has no
country to derive from. The seven already published events are not backfilled (823). The `whenSuffix`
copy still reads `, time zone from the place once it is set` while a country-derived zone is already
in force, which is G40.

## G39. A whole `matrix (webkit)` job can fail on TLS resets against the Pages preview, and every arm behind the first navigation reads as a defect

**Severity: medium for the harness, none for the app. Not a merge blocker. Opened 17 September 2026
during Convene Pass 1's PR 3, filed under ruling 597. The number is assigned by this entry (ruling
638).**

**What was seen.** Pages run 254 on `0848c79`, `matrix (webkit)`, the head's one re-run, at 18:57
UTC: a dozen arms failed at their first navigation with

```
FAIL [no crash] webkit-1280x800-dark profile owner flow Error: page.goto: Peer failed to perform TLS handshake: Error sending data: Connection reset by peer
  - navigating to "https://claude-dna-web-handoff-jlhuy-fdod.dna-web-application.pages.dev/sign-in", waiting until "networkidle"
```

and the ruling 292 tail then read `INCOMPLETE: emitted 1 of 33`, `emitted 2 of 32`, `emitted 1 of 10`
for arms whose checks never ran. `matrix (chromium)` on the same head and the same preview was 5061
of 5061 on its first attempt, and `live` was 118 of 118, so the deployment was serving; the resets
were to one runner over one window.

**Why it matters beyond one run.** The failure reads, in the job summary and in the wake event, as a
dozen arms failing on surfaces the diff never touched, which is indistinguishable at a glance from a
real regression. It also consumed the head's one re-run, which is what forced G34's fix to be taken
rather than re-run. A reachability failure is not an arm's result and should not be reported as one.

**The fix this entry names.** Two halves, and the first is the one that pays. The harness already has
a reachability step before the matrix (`The deployment serves every path the suites open`, ruling
217); a navigation that fails with a transport error rather than an HTTP status should be retried
once against the same URL and, if it fails again, should end the job as a reachability failure by
name rather than emitting per-arm failures — the arms did not run. The second half is the classifier:
`tests/matrix.cjs` classifies a lost web process (G5) and a WebKit aborted fetch (357) and calls
everything else unclassified, so a transport error joins those two as a named class and stays out of
the arm counts (ruling 228's shape: an arm that cannot run is unproven, never failing).

**Not this gap's scope.** The preview URL itself is not in question: it is read from the deploy job's
own wrangler output and was correct on that run.

## G40. The composer still says the zone comes from the place once one is set, after the country has already set it

**Severity: low, copy only. Not a merge blocker. Opened 17 September 2026 during Convene Pass 1's PR
3, filed under ruling 597. The number is assigned by this entry (ruling 638).**

**What it is.** `src/components/dna/ConveneForm.tsx` composes `whenSuffix` from `tzFromPlace`: with a
resolved place it reads `, the time at the place`, and for any other in-person state
`, time zone from the place once it is set`. Since rulings 813 and 821 a words-only event already
carries a zone, the country's, so that sentence now describes a state the form is no longer in: it
promises a zone that is already decided. It was accurate before the fix only in the sense that the
zone was wrong anyway.

**Why it is not fixed here.** The copy in the place block is ratified per surface and Pass 4 redraws
the block with the zone control in it (821). Inventing a replacement sentence in a code session is
exactly what ruling 62's visual contract exists to prevent. The line to write is a Design and Chat
decision, not this session's.

**Not this gap's scope.** The `Time zone {zone}, from the country.` line under the control and the
`Time zone GMT, from the place.` line under a resolved row are both ratified and correct as built.
