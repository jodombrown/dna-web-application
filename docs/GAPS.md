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

### The eighteenth sighting, and the first one the capture was watching (ruling 880)

Run [259](https://github.com/jodombrown/dna-web-application/actions/runs/35307376068) on `8fabd50`,
18 September, was the first WebKit pass after ruling 830's capture landed, and it crashed. It is
recorded here rather than in a pull request, because ruling 760 is right that a body and a comment
both die with the thread, and this is the first primary evidence anyone has for the question the
seventeen sightings above could not settle.

| Fact                         | Value                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Arm                          | `webkit-1280x800-dark profile visitor stranger`                                    |
| **Did the browser die too?** | **No: `browser still connected`**                                                  |
| Position                     | `ARM 2443 +1035s`, the arm's **first** `page.goto` to `/m/thandiwe-dube`           |
| Playwright's error           | `page.goto: Page crashed`, then `state unavailable: page.evaluate: Target crashed` |
| Emitted                      | 16 of a declared 22, so `UNPROVEN (228)`                                           |
| Core                         | `cores written: 1`, `core.eadedCompositor.13681.sig11`                             |

**The browser survives; only the web process dies.** Ruling 200's frames already said the fault is in
the compositor thread of the `WPEWebProcess`, but nothing had ever asked the browser whether it was
still there, and Playwright's own error cannot answer it: it reads "Target page, context or browser
has been closed" whichever went. `browser.isConnected()` read inside the crash handler answers it, and
`disconnected` not firing corroborates it. Measured beforehand against Chromium at `chrome://crash`,
where a lost web process gives exactly that pair.

**The core's own name is a third confirmation of the signature.** `core.eadedCompositor.13681.sig11`
is the kernel's `%e` truncating `ThreadedCompositor` to fifteen characters, and `sig11` is SIGSEGV:
the thread and the signal this entry names, arriving from the kernel rather than from Playwright.

**The frames were lost, and that is the part worth remembering.** The extraction step died before gdb
ran: `file` on that core printed `too many program headers (2054)` and no `execfn:`, so the `grep -o`
matched nothing and exited 1, and under the runner's default `bash -e` with `pipefail` the assignment
inherited it. The job went red for the crash it had just successfully recorded. Both extractions are
non-fatal now and the step carries `continue-on-error`, which is why ruling 850 then required a
degraded extraction to announce itself: silence plus safety is how the next one would be lost without
anyone noticing. **So offsets and frames still have never been captured on the PR path**, and the next
crash there is the first real test of that half of 830.

**This one is the short-count path, not the teardown path.** The crash arrived with the arm open and
on its first navigation, so the arm emitted 16 of 22 and read incomplete. The case ruling 832 had to
close separately — a crash charged to an arm after its last check has already passed, where the count
matches and nothing fails — is still unobserved in the wild and remains owed under ruling 849.

### The nineteenth sighting: the PR path captured frames, which the eighteenth said it never had (rulings 830, 850, 832, 228)

Run [278](https://github.com/jodombrown/dna-web-application/actions/runs/35552933642) on `d1e9e611`,
21 September, Session 28's enforcing run, `matrix (webkit)`. Recorded here because the entry above
names this exact run as the thing that was owed: "offsets and frames still have never been captured
on the PR path, and the next crash there is the first real test of that half of 830." This was it,
and it worked.

| Fact                | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Arm                 | `webkit-1280x800-dark-convene`                                                              |
| Playwright's error  | `locator.count: Target page, context or browser has been closed`                            |
| Emitted             | 39 of a declared 42, so `UNPROVEN (228)`; the 3 checks behind the failure never ran         |
| Job outcome         | stood down on one crashed arm under ruling 832; the job exits 0 and says so in its own tail |
| **Core extraction** | **`frames extracted; core not retained (284M)`** — gdb ran and returned frames              |

**What the nineteenth settles.** Ruling 830's capture works on the PR path. The eighteenth sighting's
extraction died before gdb ran and the frames were lost; this one ran, printed a per-thread walk, and
retained no core because it did not need to — which is the branch of ruling 850's `degraded()` that
means nothing degraded. The frames name `libWPEWebKit-2.0.so.1` throughout, and the walk prints its
own cycle guard: repeating offsets `+0x27b76f4` ten times, `+0x27b555f` nine, `+0x27b23f1` eight,
which the step labels as a recursive walk rather than as distinct frames.

**Still the short-count path.** 39 of 42 with three behind the failure, so ruling 849's teardown case
— a crash charged after an arm's last check has already passed, count matching, nothing failing —
remains unobserved and remains owed.

**Not this entry's scope.** Whether the browser survived. The eighteenth answered that with
`browser.isConnected()` read inside the crash handler; this entry does not repeat the claim from a
Playwright error string, which G5 already records cannot distinguish the two. The run's artefact
(`matrix-webkit-run-278`) carries the full capture.

### The twentieth sighting: two arms in one job, which ruling 832's exemption is not wide enough for (rulings 828, 832, 830, 850, 228, 292)

Run [284](https://github.com/jodombrown/dna-web-application/actions/runs/35581795427) on
`ddf5314e163c376e6f5d35a77e4ba7f6c5f3aa22`, PR #53's own `matrix (webkit)`, 21 September, against
`https://claude-handoff-29-a-post-mer.dna-web-application.pages.dev`. **The first job in this record
to lose two web processes**, which is the one fact that makes it worth an entry rather than a tally
mark.

| Fact                | Value                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arms                | `webkit-1280x800-light profile visitor stranger` **and** `webkit-1280x800-light-auth flows`                                                                                                      |
| Tier                | expanded, both; 74 of 76 expanded arms clean, compact and medium clean at 78 and 55                                                                                                              |
| Playwright's errors | `page.goto: Page crashed` navigating to `/m/thandiwe-dube`, with `state unavailable: page.evaluate: Target crashed`; and `page.waitForSelector: Target page, context or browser has been closed` |
| Classification      | `5 behind a web-process crash (G5) \| 0 an aborted fetch \| 0 unclassified`                                                                                                                      |
| Emitted             | 5038 of 5038 passed, with both arms `UNPROVEN` and excluded from the count (228)                                                                                                                 |
| **Core extraction** | **`frames extracted; core not retained (171M)`** — gdb ran, per-thread walk printed                                                                                                              |
| Job outcome         | **red.** `ruling 832 does NOT cover this run: 2 arms lost a web process`                                                                                                                         |

**What the twentieth settles, and what it does not.** Ruling 830's capture worked on the PR path for
the **second** time, so the nineteenth's result was not a one-off: the frames name
`libWPEWebKit-2.0.so.1` throughout and no core was retained, which is ruling 850's "nothing degraded"
branch. It settles nothing new about the cause. The fault is still engine code and under ruling 200's
guardrail it is reported rather than changed, which is why there is no fix to port into any PR that
meets it.

**Ruling 832's width is now a measured question rather than a hypothetical one.** The exemption is
one arm wide "because one is the rate ruling 828 measured and two is not", and this is the first
observation of two. One observation does not move a measured rate, and this entry does not propose
widening the exemption — a gate that widens itself on its first counterexample is a gate that stops
gating. It records that the case 832 was written to fail has now happened, on a diff that could not
have caused it.

**The second arm is a shape neither the eighteenth nor the nineteenth saw.** Both of those were the
short-count path, an arm crashing with checks still to emit. This job carried one of each:
`profile visitor stranger` emitted **16 of 22**, short, and `auth flows` emitted **29 against a
declared 28** — over, because the flow catch-all fires on the error path — with the harness saying so
in its own words and refusing to let the declaration be regenerated from the run. Ruling 849's
teardown case, a crash charged after an arm's last check has already passed with the count matching
and nothing failing, is still unobserved and still owed.

**Whose diff.** Not PR #53's. Its entire change is two markdown files, `docs/GAPS.md` and
`docs/strand-ports/v1789885868097915.md`, 134 insertions, nothing under `src/`, `tests/`, `public/`
or `.github/`. The identical application code had just read **5090 of 5090 on webkit with zero
crashed web processes** on run 282, the enforcing run for PR #52. `matrix (chromium)`, `deploy` and
`live` were all green on run 284.

**No re-run was spent.** Ruling 304: a re-run cannot confirm a WebKit failure by reproduction. The
commit that writes this entry is itself a push, so it supersedes run 284 under ruling 556 and starts
a fresh run on a new head — which re-runs `matrix (webkit)` as a consequence of the commit rather
than as a re-run of the job, exactly as the seventh, eighth and ninth sightings of G34 were handled.
The head's one re-run stays unspent.

**It recurred on the very next run, and the over-count shape with it.** Run
[287](https://github.com/jodombrown/dna-web-application/actions/runs/35585047043) on `63982f6`, the
head that superseded 284, lost **one** web process: `webkit-1024x1366-dark`, waiting for the Compose
dialog to detach, `4 x locator resolved to visible`. One arm, so ruling 832 stood the job down and it
exits 0 — with the tail refusing to let that read as a pass: _"STOOD DOWN ON ONE CRASHED ARM. THIS IS
NOT A CLEAN RUN … Do not read this green as the arm above having run."_ The arm emitted **33 against
a declared 32**, over rather than short, the flow catch-all on the error path again.

That is the fact worth keeping: **the over-count shape was new at the twentieth and recurred at the
next opportunity**, so it is a shape of this defect rather than a one-off, and ruling 292's refusal to
regenerate a declaration from a crashed run earns its keep twice in two runs. Everything else is the
same defect at a different viewport.

**This is where the sighting log stops for this class.** A recurrence that carries no new fact is a
tally mark, and a register that grows a section per tally is one nobody reads to the end. Recording
each one would also mean a push per sighting, each push starting the run that produces the next — so
from here a G5 crash is recorded only when it changes something: a new shape, a new count, a job that
ruling 832 cannot stand down, or ruling 849's teardown case, which is still unobserved and still owed.

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

**One question this entry did not settle, settled 19 September 2026 (rulings 920, 921).** CLAUDE.md's
permitted-identity list also carries `gpt-engineer-app[bot]`, app id `159125892` (rulings 146, 286),
which is Lovable committing straight to `main` and which ruling 146 requires be reported and rebased
onto rather than merely tolerated. Ruling 598's allowlist names three ids and not that one. The
answer is that it stays outside: the allowlist answers whether an identity may commit here at all,
and 146 answers what is done about a Lovable commit once it has — expected, reported by SHA and by
paths, rebased onto, the founder's visual change kept on conflict. Folding the app id into the
allowlist would make a Lovable commit read as unremarkable, which is the one thing 146 says it is
not. Ruling 920 also moves the check's primary axis: commits are classified by **how they landed**
rather than by who authored them, a merge commit from a `claude/*` branch is Code's, anything else
is reported by SHA and by paths, any change under `.lovable/` is reported by name, and the id check
stays as a second net that is never run alone. One consequence worth recording, found at the Session
27 open: the committer id on a merge made through the GitHub button is `19864447`, `web-flow`, which
is in no allowlist and never will be, and which under 920 classifies by how it landed — `2bcb8e3`,
the merge of #49, is Code's.

**What stays open: the missing arm, which is the half this entry was opened for.** Nothing in
`tests/`, `scripts/` or `.github/` reads any of these ids, and 920's landing-based classification has
no arm either. A session that skips the check still fails nothing.

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

**A second prop the mapping has to answer, found 21 September 2026 porting `FacetRail` (handoff 29-A
item 3, ruling 851).** Below `--tier-medium` Strand's compiled `FacetRail` renders through Strand's
`Sheet` as `{ open, onClose, tier: "compact", title, contained }`. `tier: "compact"` maps cleanly to
`variant="sheet"` under ruling 618. **`title` has nowhere to go.** This repository's `Sheet` has no
`title` and renders no heading of its own: it focuses `[data-sheet-heading]` when a caller supplies
one (`Sheet.tsx:158`), and all five callers that draw a heading — `ConnectSurface`,
`NotificationPanel`, `ConveneForm`, `OnboardingSurface`, `ProfileBlockControl` — supply it themselves.
Strand's `Sheet` draws it from the prop. So the two parts disagree about who owns the heading, and
ruling 605's migration has to say which: either `tier` and `size` arrive and `title` does not, and
every caller keeps drawing its own, or `title` arrives too and the five existing headings become
duplicates. `src/components/strand/FacetRail.tsx` passes `label` and draws its own heading in the
meantime, which is the repository's convention and not the compile's. No second sheet was added and
`Sheet` was not rewritten (handoff 29-A item 3's instruction).

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

**Fifth sighting, 18 September 2026, and the first against the fixed wait.** Pages run 261 on
`7522504` (PR 46, the crash harness), `matrix (webkit)`, first attempt, at `webkit-1536x960-dark`: the
same check, the same arm and the same width as the fourth, 5078 of 5080, no crash. But the failure
mode has changed, and that is the point of recording it. The first four read the pre-restore state
because 300 ms was a guess. This one waited on the signal, for ten seconds, and the signal never came:
`locator.waitFor: Timeout 10000ms exceeded ... waiting for [data-testid="continue-draft"] to be
detached, 24 × locator resolved to visible`. So "the guess was short" no longer covers it. Either the
restore genuinely does not complete on that arm on that run, or ten seconds is still short for WebKit
at 1536x960 under load. **Open, and deliberately not fixed from one sighting**: a remedy chosen from a
single observation is the shape ruling 200's guardrail exists to refuse, and this entry has already
recorded two causes it named confidently and had to withdraw.

**Sixth sighting, the same day, and the one that earned this entry's own clause.** Run 261's second
attempt, at `webkit-1280x800-dark-convene-zone`, 5080 of 5081, no crash: `choosing a zone opens the
door and the line reads it, from the country (821)`. Not the draft-restore check, but the same family
and a worse instance of it, because it had **no wait at all**:

```js
await zone().selectOption("America/New_York");
record(
  tag + " choosing a zone opens the door …",
  (await dialog.locator('[data-convene="country-tz-line"]').textContent()) === "…" &&
    !(await pub().isDisabled()),
);
```

`selectOption` resolves when the change event is dispatched, not when React has re-rendered the line
and re-evaluated the door. **The app was not wrong, and the same run proves it**: the next check in
that arm passed, so the payload did carry `America/New_York` and the door did open. The arm won that
race on every run before this one.

This is what the paragraph above meant by "not this gap's scope until one of them earns it". One
earned it, so it is recorded here rather than under a new number, which is what ruling 638 exists to
prevent. **Fixed** in the shape the fourth sighting's fix uses: an in-page poll on the two signals the
assertion needs, with its own bail and its own sentence, then the assertion unchanged. The arm's
declared count is unchanged, so a real regression still fails exactly as before. Proven locally
against `wrangler pages dev` on Chromium at 96 of 96 for the four Convene arms; WebKit is not
installed in that environment, so the engine the sighting came from is proven only by CI.

**Seventh sighting, 18 September 2026: the sixth's twin, in the arm the fix did not reach.** Pages run
265 on `a11529f` (PR 48, Handoff 26-A, a doc-and-comment-only head), `matrix (webkit)`, first attempt,
at `webkit-1280x800-dark-convene`: `and the zone the host chooses opens the door and reads from the
country (821)`, 5064 of 5065, no crash, and the run's classifier reads `1 unclassified` because this
is neither a G5 crash nor ruling 357's aborted fetch. The one crashed arm in that job,
`webkit-390x844-light-block-flow`, is separate and was correctly reported UNPROVEN and excluded under
rulings 228 and 832; one crashed arm does not fail the job, and this check is what did.

The 821 gate is asserted in **two** arms, not one. Ruling 821's own commit, `e3392e5`, wrote both: the
new `-convene-zone` arm's and the existing `-convene` arm's, the second being the "wrong country"
check extended to assert the gate and then open it the way a host would. The sixth sighting fixed
`runConveneZone`'s instance and left this one, still as `e3392e5` wrote it, at
`tests/matrix.cjs:2817` to `2824` (`git blame` on those lines names that commit):

```js
await dialog
  .locator('select[data-convene="country-tz"]')
  .selectOption("America/New_York", { timeout: 5000 });
record(
  tag + " and the zone the host chooses opens the door and reads from the country (821)",
  (await dialog.locator('[data-convene="country-tz-line"]').textContent()) ===
    "Time zone America/New_York, from the country." && !(await pub().isDisabled()),
);
```

Byte for byte the shape the sixth sighting names: the `{ timeout: 5000 }` bounds how long
`selectOption` waits for the control, not how long React takes to re-render the line and re-evaluate
the door, so the two signals are read on the next tick with no wait at all. The fix went into the arm
the failure was seen in and the twin was left, which is why this entry now has the same defect in it
twice and why the sighting is recorded rather than folded into the sixth.

**The app was not wrong here either, and this run proves it the same way.** The check's detail is
empty, so the assertion's boolean was false rather than a locator throwing. Every other check in that
arm passed, including the Ghana check immediately after it, which reads a resolved row and its zone
from the same form, and the tier line reports `expanded: 76 arms | 75 with no failing check | 1 with
at least one`, so this arm's single failure is this check. The same run's `deploy`, `live` and
`matrix (chromium)` were all green on that head, and the head is a doc-and-comment diff that reaches
no test and no surface, so nothing in it could reach this arm.

**Not fixed there, and the patch was named so the next code session applies it in one step.** PR 48
is doc, comment and register only under ruling 759's handoff, so a harness change was outside its
scope and was not smuggled in under a green-CI argument. The patch is the sixth sighting's, moved:
the same in-page poll on the same two signals, its own bail and its own sentence, inserted between
the `selectOption` at `:2819` and the `record` at `:2820`, with the assertion and the arm's declared
count left alone so `tests/expected-counts.json` stays untouched (ruling 292). Nothing else in the
file has earned it: the remaining fixed wait in the Convene arm is `waitForTimeout(150)` and it has
still not been seen to fail.

**Fixed, 18 September 2026, as Convene Pass 4's first commit.** The named patch is in, byte for byte
the sixth sighting's shape, and it is this build's first commit rather than a PR of its own so that
Pass 4's own enforcing run is not a coin flip on the one check that has been red on a head that could
not have caused it. `record()` calls in the file: 170 before, 170 after, so
`tests/expected-counts.json` is untouched and a real regression still fails exactly as before. Both
instances of the 821 gate now wait on the state they assert, which is what the sixth sighting should
have carried and what left this entry with the same defect in it twice.

No re-run was spent on this. The push that carried this entry superseded run 265 and started a fresh
run on the new head, which re-runs `matrix (webkit)` as a consequence of the commit rather than as a
re-run of the job, so the head's one re-run under ruling 304 remains unspent.

**Ruling 304, demonstrated again.** Run 261's two attempts on a byte-identical head failed one check
each, in two different arms at two different widths, with **zero overlap**. That is 304's finding
exactly: on this engine a re-run cannot confirm a WebKit failure by reproduction, so the single re-run
neither confirmed the fifth sighting nor cleared it, and the head's one re-run bought a different red
rather than a green.

**Eighth sighting, 20 September 2026: the fifth's mode, a second time, with the evidence the fifth
was missing.** Pages run 274 on `5481522` (PR 50, Session 27's types regeneration), `matrix (webkit)`,
first attempt, at `webkit-1536x960-dark` — the same check, the same arm and the same width as the
fifth, and the same message to the character:

```
FAIL [no crash] webkit-1536x960-dark flow TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
  - waiting for locator('…[data-testid="continue-draft"]') to be detached
    24 × locator resolved to visible <button type="button" data-testid="continue-draft">Continue your dr
```

The fifth sighting is the only other instance against the fixed wait, and it closed by naming two
possible causes and refusing to choose between them from one observation. This is the second
observation, and it carries something the fifth could not: **the same job lost three web processes** —
`webkit-820x1180-dark`, `webkit 744x1133 dark connect` and `webkit-1280x800-light-auth flows`, with
the classifier reading `7 behind a web-process crash (G5) | 0 an aborted fetch on mocked REST | 2
unclassified` and 4969 of 4971. Ruling 828 measured G5 at about one crashed arm per four to five
WebKit passes; three in one job is roughly three times that rate, which is not a healthy runner. That
discriminates between the fifth's two candidates and favours the second: ten seconds is still short
for WebKit at 1536x960 **under load**, rather than the restore genuinely never completing. It does not
prove it, and this entry is not going to claim it does.

**It is not the PR's, and that is checkable rather than asserted.** The immediately preceding head,
`17b3102`, read `matrix (webkit)` at 5090 of 5090 with zero crashes and zero unclassified — this arm
among them. The whole diff between that head and `5481522` is two files: `src/lib/database.types.ts`,
which is generated types that erase at compile plus an `export const Constants` that nothing under
`src/` imports and whose only change is key ordering, and `tests/live-checks.cjs`, which
`tests/matrix.cjs` does not reference at all. The failing arm ran byte-identical application code on
the run where it was green.

**Still open, still not fixed, and now for a second reason.** Raising the ten seconds is the guess the
fifth sighting refused, and this entry has already named two causes confidently and withdrawn both. A
second sighting is not a diagnosis. What would settle it is a reading that separates load from
behaviour — the restore's own elapsed time recorded on a healthy run and on a degraded one, so the
question becomes how long the restore takes rather than whether ten seconds is enough. That is a
harness change worth making deliberately, not on the way past.

**No re-run was spent on this either.** The push that carries this entry supersedes run 274 and starts
a fresh run on the new head, which re-runs `matrix (webkit)` as a consequence of the commit rather
than as a re-run of the job — the same route the seventh sighting took, and for the same reason: under
ruling 304 a re-run cannot confirm a WebKit failure by reproduction, so spending one buys little.

**Ninth sighting, 21 September 2026: the fifth's mode a third time, on a healthy runner, which is
what the eighth was missing.** Pages run
[279](https://github.com/jodombrown/dna-web-application/actions/runs/35554896651) on `6ca7d623`
(PR 51, Session 28), `matrix (webkit)`, first attempt, at `webkit-1366x1024-light` — the second
sighting's width, the fifth and eighth sighting's mode, and the same message to the character:

```
FAIL [no crash] webkit-1366x1024-light flow TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
  - waiting for locator('…[data-testid="continue-draft"]') to be detached
    24 × locator resolved to visible <button type="button" data-testid="continue-draft">Continue your dr
```

5087 of 5089, `emitted 31 of 32`, and the classifier reads
`0 behind a web-process crash (G5) | 0 an aborted fetch on mocked REST | 2 unclassified`.

**The runner was healthy, and that is the whole value of this sighting.** The eighth had three
crashed web processes in the one job — roughly three times ruling 828's measured rate — and used that
to favour the second of the fifth sighting's two candidates: ten seconds is still short for WebKit
**under load**, rather than the restore never completing. This job lost **zero** web processes, at
every tier: `compact: 78 arms … 0 that lost a web process`, `medium: 55 … 0`, `expanded: 76 … 0`. So
the load reading does not cover this one, and the eighth's tentative preference between the two
candidates does not survive a healthy runner producing the identical failure. Neither candidate is
established; what has changed is that the eighth's discriminator has been withdrawn by the next
observation, which is the third time this entry has had to give back a cause it leaned towards.

**It is not the PR's, and this is the cleanest instance of that the entry has.** The immediately
preceding head, `d1e9e611`, read this arm green on run 278. The entire diff between that head and
`6ca7d623` is **one file, `docs/GAPS.md`** — markdown that reaches no test, no surface and no build
output. The failing arm ran byte-identical application code and byte-identical harness code on the
run where it was green, one run earlier.

**Still open, still not fixed, and the reading the eighth asked for is now the only way forward.**
What would settle it is the restore's own elapsed time recorded on a healthy run and on a degraded
one, so the question becomes how long the restore takes rather than whether ten seconds is enough.
This sighting supplies the healthy half of that comparison as a bare fact — it failed — without the
timing that would make it useful, because the harness does not record it. That is the harness change
worth making deliberately.

**No re-run was spent on this one either**, for the third time and the same reason: the push that
carries this entry supersedes run 279 and starts a fresh run on the new head, which re-runs
`matrix (webkit)` as a consequence of the commit rather than as a re-run of the job. Under ruling 304
a re-run cannot confirm a WebKit failure by reproduction, so the head's one re-run stays unspent and
is available if the next head reds on this same check.

**Not this gap's scope.** The check's assertions and the arms' declared counts stay as they are.

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

**Addendum, 18 September 2026 (P4-SPEC sections 3 to 5), and why this entry stays open.** Pass 4
landed the third named fix and the surface around it: the host-placed pin under 790, the rewritten
zero-results hint under 814, and the `Why is my venue not here?` control whose panel says the gap is
the map's coverage and not the host's typing. A host in Accra, Nairobi or Lagos is now told what is
happening and given something to do about it, which is what this entry said was owed to the surface.
What it does not do is close the entry: the two named fixes above — a second POI source behind the
same `place-resolve` contract, or DNA's own venue vocabulary read at runtime — are still a ruling and
a brief, and neither has been decided. The words are honest and the affordance exists; the coverage
does not. See G44 for what the panel can and cannot truthfully say while that is so.

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

### Addendum, 21 September 2026: point 1 is closed by ruling 997, and ruling 999 says where the constraint lives (997, 999, 636, 638)

**No new G number. This is G36's own point 1**, and it is recorded here under 638 rather than in a
report or a PR comment, because the register is what the next reader opens.

**Point 1 is closed by 997.** The combination is refused: a lens set that cannot render icon-first
never enters a compact bar. That closes the hole this entry's point 1 named — a set the fit test can
never rescue, rendering labels at a width where they do not fit — as a rule, rather than by the one
repair that removed the Feed's instance of it (`all` gained `globe`).

**999 withdrew 997's data half, and that changes nothing here.** There is no lens vocabulary table,
lenses do not enter `public.vocabularies()`, and `src/lib/lens.ts` is not a breach of the
fixed-vocabularies absolute: lenses are navigation, not a content vocabulary. `CLAUDE.md`'s absolute
now carries that clause. No migration was written for this and none is owed.

**999's consequence, which is the part still open.** The constraint lives on the array's contents,
not on the type. Read in the tree today: `Lens.icon` is `icon?: string | undefined`, so `Lens[]`
cannot require an icon on every member, and `LensBar` has no refusal — `canSwitch` is
`!labels && lenses.length > 0 && lenses.every((l) => !!l.icon)`, and when it is false the bar sets
`fit` true and renders labels at every width, `compact` included. So 997's refusal is today a rule a
caller keeps rather than a shape the compiler or the part enforces, and a set that breaches it still
renders exactly the way this gap opened. Whether `Lens[]` can express the constraint in a form
`compact` can require — a variant of the type whose `icon` is required, or a `compact` that will not
accept a set without one — is Strand's under 636, not this repository's.

## G37. With the fit test corrected, the medium tier reads icon-first for a 3px shortfall that `main` hid inside a label's padding

**Severity: low, a Design decision rather than a defect. Opened 17 September 2026 during Session 23 on
PR 45, filed under ruling 597. The number is assigned by this entry (ruling 638). Explained on 18
September 2026 under ruling 902 and its closure condition corrected under ruling 903, in Session 26's
doc-only PR; the reading that closes it is owed and is recorded as owed below.**

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

**Why the two fit tests disagreed (ruling 902).** The disagreement is structural, it is in the side
padding, and it is neither in the labels nor in the column. Strand prices a tab by formula: active at
`W + 32` and inactive at `W + 30`, from `PAD_ON 16` and `PAD_OFF 15`. This repo does not price a tab;
it measures one. `src/components/strand/LensBar.tsx:106` to `117` reads a hidden probe through
`getBoundingClientRect()` and needs `8 + others * 2 + activeMax + others * inactiveMax`, where the
probe tab renders at `padding: 0 14px` active and `0 8px` inactive (line 209), `fontSize: 15` (210),
`gap: 8` beside a 20px icon box (208, 217). The leading 8 is the track's own `padding: 4` and the 2 is
its `gap: 2` (lines 235, 236); both are identical in the two formulas, so both cancel.

The side padding does not cancel. Against `W`, the content inside the padding, Strand asks 32 on an
active tab where this repo asks 28, and 30 on an inactive tab where this repo asks 16. On the Feed's
five lenses, one active and four inactive, that is `5W + 168` against `5W + 108`: a structural 60px,
Strand higher, before a label is measured and before any column enters. It is the dominant term of the
91px the two tests disagreed by, and the 2px the G37 question was about is inside it.

**A correction to that arithmetic, read in the tree.** `W + 28` and `W + 16` are the padding alone.
The probe tab also carries `border: "1px solid transparent"` under `boxSizing: "border-box"`
(`LensBar.tsx:212`, `213`), and `getBoundingClientRect()` returns the border box, so what this repo
measures is `W + 30` active and `W + 18` inactive and its five-lens price is `5W + 118`, not
`5W + 108`. The 60px therefore holds only if Strand's own tabs carry the same 1px border that its
formula omits, in which case the term cancels on both sides; against Strand's formula exactly as
written the structural difference is 50px. Which of the two is right cannot be settled from here,
because ruling 663 keeps Strand's source out of this repo. It changes nothing about the finding: the
term is structural, it is fixed before any label or column width enters, and it is the dominant one
either way.

**Strand's candidate cause, the column term, is refuted.** The difference above is in what each test
charges for a tab. It is the same number at every track width, so it is present whatever column either
test is run against, and a column term cannot explain a constant. Strand could not test this itself:
663 keeps this repo's shell out of Strand, so the column it would have had to measure is here and not
there. The tracks this repo measured are in the table above: 358 at 390, 616 at 744 and 1024, and
760 at 1280.

**Strand's own rejection of the icon term was right, and for the right reason.** The icon is a 20px
box with an 8px gap beside it (`LensBar.tsx:208`, `217`), so 28px per tab and 140px across five
lenses. That overshoots the 91px it would have to account for, and a term larger than the whole
disagreement cannot be the disagreement.

**What the G37 question actually was.** Porting `PAD_OFF 15` against this repo's 8, framed as 15px
against 16px, is 2px per tab, one pixel a side. It was sitting inside a 12px-per-tab difference on the
same inactive tab. The question was real and it was six times smaller than the difference it sat
inside.

**The closure condition, corrected (ruling 903).** This repo keeps `0 14px` active and `0 8px`
inactive, and Strand's fit test is corrected to price them, so G37 no longer closes on a 15px port.
Nor does it close on either of the other two choices above; 903 settles the question they were raised
against. It closes on the deployed Feed at the medium tier reading labels, read on the deployed URL
and on no fixture, because `wrangler pages dev dist` is not the environment ruling 61's exit criterion
names.

**The reading is still owed.** Session 26's PR was to take that reading and record it here, and it
could not. This session's egress policy denied `CONNECT` with a 403 to
`dna-web-application.pages.dev`, to `main.dna-web-application.pages.dev` and to
`app.diasporanetwork.africa`, and to the Actions artifact host
(`productionresultssa19.blob.core.windows.net`) that carries `matrix-out/results.json`. Ruling 371's
clause is what was applied: stop and report, never route around a block through another tool.

Two in-policy channels were checked first and neither carries the answer. The CI instrument does read
the mode on the deployed URL: `tests/matrix.cjs:3811` to `3830` records `data-lensbar` with the track
width, the overflow list and the probe's own measurements for every shell arm, and 820 by 1180 is one
of them. But `record()` prints a check's detail only when the check fails (`tests/matrix.cjs:1725`),
so on a green run that JSON reaches `results.json` inside the artifact and never the job log. And no
other arm encodes the mode in its pass or its failure: the width arm's lens check counts five tabs and
reads which one is selected (`tests/matrix.cjs:2254` to `2260`) and asserts nothing about labels.

So this entry does not say what the medium tier shows, because this session did not see it. The
arithmetic above is why the port was refused; it is not evidence about the deployed surface, and it is
deliberately not read as a prediction of one. G37 stays open. One step closes it: the founder reading
the deployed Feed at 820 in a browser, or the `chromium-820x1180-shell lens bar` record inside a
`matrix-chromium-run-<n>` artifact, whose detail carries `mode`, `track`, `overflowing` and the probe
widths for that run's own deployed preview. `main` at `3a6bd94` has one already, artifact
`matrix-chromium-run-263` of run
[35360154318](https://github.com/jodombrown/dna-web-application/actions/runs/35360154318).
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

## G40. The composer still says the zone comes from the place once one is set, after the country has already set it — closed (Convene Pass 4)

**Closed 18 September 2026 by Convene Pass 4, which is where this entry said it would close. P4-SPEC
section 1 carries the four ratified cases and the two further readings, and the string this entry was
opened about appears nowhere in the tree. Kept rather than deleted, because the reason it was not
fixed in a code session is the reusable part: a line in a ratified block is a Design and Chat
decision, and waiting cost nothing but a sentence that was wrong for a day.**

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

**Correction, ruling 898.** Half of the paragraph above did not survive. The country line is
untouched and P4-SPEC section 2 says so in as many words. The second half is wrong: `GMT` is a
display abbreviation, and for any zone that observes daylight saving it is a computed offset that
moves twice a year, so one stored instant reads `EDT` on one surface and `America/New_York` on
another. It read clean in the drawn frames only because Africa/Accra is GMT all year, which is
exactly the trap — the one country the whole of Convene was drawn in is the one country where the
defect is invisible. 898 extends 821's IANA-only rule from the zone control to every member-facing
Convene surface, and Pass 4 carried it to the resolved row, the composer's derived label, the card's
meta line, the cancelled card's `Was set for` and the rail. `zoneAbbr` survives in
`src/lib/when.ts` with no caller and a docstring saying what it is no longer for.

## G41. The C brand rung is painted under small text on five surfaces, and the worst of them bypasses the ink rung written to prevent exactly that

**Severity: high for Contribute, medium for Collaborate and Convene, light theme only; Convey is the
one dark-theme case. Not a merge blocker, and not a ruling 140 finding: this is rule 10's AA target
(610 per 480), not visibility, RLS or consent. Opened 18 September 2026 during Session 26's doc-only
PR, filed under ruling 597, and carrying ruling 874's contrast read, which has never had a G number
because Strand keeps no Gap register and 638 assigns the number by the entry that is written. The
number is assigned by this entry (ruling 638). State, 19 September 2026 (ruling 917, Session 27's
PR): the narrow remedy is taken. `Button`'s `primary` variant reads the C's own ink rung when a `c`
is passed, so a **Contribute fill** carries `--ink` at 8.29:1 instead of `--on-fill` at 2.10:1. That
closes the first row of the table below for Contribute and nothing else. The entry stays OPEN on
three counts, and it is worth being exact about which, because 917's change is narrower than "G41 is
fixed for Contribute":

1. **Collaborate (3.75:1) and Convene (3.79:1) on their own fills.** Their ink rungs are themselves
   `--on-fill`, so reading the rung moves nothing. Below AA for text under 18.66px bold or 24px
   regular, above the 3:1 large-text floor. The remedy is darkening the two fills, a D092 brand
   change and the founder's and Design's.
2. **Every `secondary` and `ghost` label, Contribute included, which is the fourth and fifth rows of
   the table.** 917 changes `primary` only. `Button`'s `secondary` and `ghost` paint the label in the
   bare brand rung off `cVar` (`Button.tsx:50`, `:53`), so `SectionCard`'s empty-section act
   (`SectionCard.tsx:133`, `variant="secondary"` with the section's `c`) still reads
   **2.10:1** for Contribute on `--surface`, unchanged by this PR. Handoff 27-A's proof owed for
   this item asks for a Contribute `SectionCard` act to be read at 360 and 1280; the reading is that
   it did not move, and under the change 917 specifies it could not have. The remedy here is not an
   ink rung at all — the ink rung is for text on a fill — but the text rung, `--c-contribute-text`
   `#7E6000`, which is the third candidate this entry named when it was opened and is equally
   Design's.
3. **`VerbChip` and `CBadge`**, the brand rung as text on its own tint, untouched and unaddressed by
   917.**

**The read (ruling 874).** A 15px label on Collaborate teal, `--c-collaborate: #30909C`, fails rule
10's AA target for text below 18.66px bold or 24px regular. `src/styles/strand.css:142` carries the
same read on the same colour, in its own comment: `--c-collaborate-ink: #ffffff; /* 3.9:1, large text
and icons only on teal fills */`. Strand's `tokens/colors.css` carries it identically. The read is
right and this entry is not a rebuttal of it; what follows is where it lands in this repo.

**The 3.9:1 does not reproduce. 3.75:1 does, and nothing the annotation concludes moves.** White on
`#30909C` is 3.75:1 by the WCAG 2 relative-luminance formula, not 3.9:1, computed on the sRGB
coefficients with the 0.05 offsets. Both numbers fail 4.5:1 and both clear the 3:1 floor for large
text and non-text, so the annotation's conclusion stands exactly as written. It is recorded because a
number sitting in a token comment is the number the next reader quotes, and because ruling 891 asks
that a claim about a measurement be verified before it is restated.

**The mitigation is real, and it is the three-rung contract rather than a per-component habit.**
`src/styles/strand.css:130` states it: brand (`--c-<c>`) is for fills, glyphs and the 3px accent
stroke, locked hex, never used as small text; `text` is the contrast-safe rung, AA as text on `--bg`;
`tint` is the wash behind badges and chips. The text rung holds by construction on the light ground:
Connect `#1E5A3C` 7.61:1, Convey 8.17:1, Convene 6.40:1, Collaborate 5.96:1, Contribute 5.52:1, all
on `--bg: #FAF7F2`. `LensBar` follows it: the active lens takes the brand rung on its **icon** only
(`src/components/strand/LensBar.tsx:155`, `299`), its label is `--ink`, and the pill under both is
`--surface`. So a surface that follows the contract cannot reach the read at all.

**What was still open was whether any surface paints small text on a C rung anyway. Five do.**
Measured light-theme ratios, one row per pairing:

| Pairing                                          | Connect | Convene  | Collaborate | Contribute | Convey |
| ------------------------------------------------ | ------- | -------- | ----------- | ---------- | ------ |
| `--on-fill` `#FFFFFF` on `--c-<c>`               | 6.39    | **3.79** | **3.75**    | **2.10**   | 8.73   |
| `--c-<c>-ink` on `--c-<c>` (the rung as written) | 6.39    | **3.79** | **3.75**    | 8.29       | 8.73   |
| `--c-<c>` as text on `--c-<c>-tint`              | 5.42    | **3.19** | **3.17**    | **1.84**   | 6.97   |
| `--c-<c>` as text on `--surface` `#FFFFFF`       | 6.39    | **3.79** | **3.75**    | **2.10**   | 8.73   |
| `--c-<c>` as text on `--bg` `#FAF7F2`            | 5.98    | **3.55** | **3.51**    | **1.97**   | 8.17   |

- `src/components/strand/Composer.tsx:1166` to `1175`, Publish. 17px, weight 500, `--on-fill` on the
  active verb's fill through `Button`'s primary variant (`src/components/strand/Button.tsx:29`, `47`).
  The verb is whatever the member is composing, so Contribute reads 2.10:1 and Collaborate 3.75:1.
- `src/components/dna/PostCardRouter.tsx:101`, the post's own act in its own C (rule 3). 15px, weight
  500, the same pairing. `src/components/strand/verb-schema.ts` gives an action to Collaborate ("Join
  the Space"), Contribute ("Offer to help") and Convey ("Read the story"), and none to Convene, so two
  of the three rendered are below the target and one of those is below the 3:1 floor as well.
- `src/components/strand/VerbChip.tsx:66` to `71`, the composer's verb row, selected state. 15px,
  weight 500, the brand rung as text on its own tint. This is the case the contract line names in so
  many words. Dark theme is not clean here either: Convey reads 3.57:1.
- `src/components/strand/CBadge.tsx:49` to `53`, the badge's optional label below 48px. 13px, weight
  500, uppercase, the brand rung on the tint, the same column as the row above.
- `src/components/strand/SectionCard.tsx:133`, the empty section's act on the owner's own profile.
  15px, weight 500, `variant="secondary"`, whose label colour is the bare brand rung
  (`src/components/strand/Button.tsx:50`; `ghost` is the same at `53`), on the card's `--surface`
  ground (`SectionCard.tsx:90`). Its `c` runs over `ProfileSurface.tsx:122` to `127`'s four activity
  Cs through `:1681`, `:1691` and `:1700`, so Contribute's "Post or fulfil a Need" reads 2.10:1,
  Collaborate's 3.75:1 and Convene's 3.79:1, and only Convey clears the target. The first and fourth
  rows of the table carry the same numbers because `--on-fill` and `--surface` are both `#FFFFFF` on
  the light theme: it is one pair read from both sides, once as ink on a fill and once as a fill
  under ink.

**The worst of it bypasses the rung that exists to stop it, and one component carries both halves.**
`Button` is in three of the five: its `primary` variant paints the fill and its `secondary` and
`ghost` variants paint the label in the bare rung, off the same `cVar` at `Button.tsx:5`. And it never
reads a `-ink` token: `primary` and `danger` both set `color: "var(--on-fill)"`, a flat `#FFFFFF` in
light theme. So `--c-contribute-ink: var(--ink)` at `src/styles/strand.css:146`, whose comment says
gold is too light for white ink, is inert on every primary button, and the Publish button on a
Contribute post is
white on `#D4AF37` at 2.10:1 — under the 3:1 floor that even an icon has to clear. `Chip.tsx:19` is
the one place in the tree that reads a `-ink` rung, and no caller passes it a `c`, so the one correct
consumer of the rung renders nowhere. Dark theme escapes all of this by coincidence rather than by
design: `--on-fill` there is `#141412`, which is the value every dark `-ink` rung already holds, and
its ratios clear 4.5:1 for four Cs and reach 4.22:1 for Convey.

**Why no gate caught it.** `scripts/token-check.mjs` proves that every token a surface cites resolves
in both themes (ruling 485); it is static, it reads declarations against citations, and it has no
opinion about what a pairing measures. Nothing in the harness reads contrast at all, which is why
874's read had nowhere to land until this entry.

**Why nothing was changed when this was opened, and what changed since.** Session 26's PR was doc,
comment and register only under ruling 903's re-sync. Three remedies were named: `Button`'s primary
could read `--c-<c>-ink` instead of `--on-fill`, which fixes Contribute and leaves Collaborate and
Convene where they are; the Collaborate and Convene fills could darken, which is a D092 change and a
brand one; or the small-text-on-brand pairings could be moved to the text rung on a tint. Ruling 917
took the first, in Session 27's PR, as `src/components/strand/Button.tsx`'s `onColor`: `primary` with
a `c` reads that C's ink rung, `danger` keeps `--on-fill` because `--error` is not a C and has no
rung, and `primary` with no `c` keeps it because the fill is `--ink` and white is correct on it. It
is a rendered-pixel change on every primary button that carries a C, and Contribute's Publish is the
one that visibly moves. Its `SectionCard` act does **not**: that is a `secondary` button and the
first remedy does not reach `secondary` or `ghost`, which is the state note above. The second and
third remedies are both still open and both belong to Design and the founder.

**Not this gap's scope.** The text rung, which is AA on the ground for all five Cs and is what almost
every surface uses. `CBadge`'s glyph and `AppShell`'s compose tab, which paint the brand rung and the
ink rung on graphics rather than text (`src/components/dna/AppShell.tsx:445`, `446`). The dark theme,
except for the two Convey readings named above. And the 3px accent stroke and every border and frame
that takes the brand rung, none of which is text.

## G42. Four C tokens are declared and read by nothing, and the system category's colours are written inline instead — the system half closed (Session 27)

**Severity: low, tidiness with one real consequence. Not a merge blocker. Opened 18 September 2026
during Session 26's doc-only PR, as a follow-up found while sweeping the C rungs for G41, filed under
ruling 597. The number is assigned by this entry (ruling 638).**

**What it is.** `src/styles/strand.css` declares `--c-stroke` (`:151`) and the system category's three
rungs, `--c-system`, `--c-system-tint` and `--c-system-ink` (`:153` to `:155`). No surface reads any
of the four: `var(--c-stroke)`, `var(--c-system)`, `var(--c-system-tint)` and `var(--c-system-ink)`
return nothing across `src/` and `public/`. `--c-stroke` is the 3px accent stroke width the token
block's own contract line names, and every border that draws it writes its own width.

The consequence is in the system category, and it is not only duplication.
`src/components/strand/PostCard.tsx:118` and `:119` handle a post DIA could not type by branching on
`c === "system"` and writing two literals inline. The frame agrees with the token by accident:
`"var(--line-strong)"` is exactly what `--c-system` holds. The label does not: the card writes
`"var(--ink-3)"`, `#77736C`, where `--c-system-ink` is `var(--ink)`, `#1A1A18`. So the declared
palette and the shipped card disagree about the system category's text colour, and the token is the
one nothing renders. The next surface that draws a system post either writes the same two literals or
reads the tokens, and gets a different colour depending on which it picks.

**Why no gate caught it.** `scripts/token-check.mjs` reads declarations against citations to prove
every cited token resolves (ruling 485). It is deliberately one-directional: a token declared and
never cited is not a broken reference and the check has nothing to say about it.

**Closed 19 September 2026, in Session 27's PR, which is the next PR that touched the card.**
`src/components/strand/PostCard.tsx` now reads `var(--c-system)` for the frame and
`var(--c-system-ink)` for the label. The frame's resolved colour is unchanged, because
`--c-system` holds `--line-strong` and that is what the literal said. The label's is not: a system
post's C line goes from `#77736C` to `#1A1A18` in light theme, and in dark from `#9B958A` to
`#F2EDE5`, because `--c-system-ink` is `var(--ink)` and follows the theme where the literal did not.
That is the rendered-pixel change Session 26's doc-only PR could not make, and it is the correction
rather than a side effect: the declared palette and the shipped card no longer disagree about what
colour the system category's text is. `scripts/token-check.mjs` reads clean on both new citations.

**Why it was not fixed when it was opened.** Session 26's PR was doc, comment and register only
under ruling 903's re-sync, and pointing `PostCard` at the tokens changes a rendered value's
provenance even where the resolved colour is identical, which was the one thing that PR could not do.

**What stays open under this number: nothing.** `--c-stroke` is still declared and read by nothing,
and that is the D092 question below rather than an open half of this entry.

**Not this gap's scope.** Whether `--c-stroke` should exist at all, which is a D092 question. The
`-ink` rung, which has a consumer (`src/components/strand/Chip.tsx:19`) even though no caller reaches
it today; that is G41's.

## G43. The map plate carries no projection, so the host's own point is not a coordinate and does not travel with the event

**Severity: medium for the surface, none for the code. Not a merge blocker. Opened 18 September 2026
during Convene Pass 4, filed under ruling 597. The number is assigned by this entry (ruling 638).
State, 19 September 2026 (ruling 929, Session 27's PR): the host-placed pin is withdrawn from the
build. What this entry described as "a surface that reads correctly and stores nothing" no longer
renders — the plate, the pointer and keyboard placement, the act, the copper dot, the host readings
of the chip, and `pin_x` and `pin_y` in the composer's store are all gone, and 897's panel line no
longer says the pin travels. The plate, the area chip and the map's own point stay. The entry stays
OPEN, because what it names as the fix is unchanged: the pin returns when the plate has tiles and
therefore a projection, and that pass is still owed.**

**What it is.** P4-SPEC section 5 orders a map plate and two pin kinds, and its own guardrail 3 says
the plate "renders no tiles and no invented geography in this build". Both were built:
`src/components/dna/ConvenePlate.tsx` draws a hairline grid on `--bg-sunken` with the matched area in
a chip, the host's point is a copper dot inside a dashed `--c-convene` ring and the map's own point is
an ink dot with a `--line` hairline, and they never read the same. What the two clauses cannot both
deliver is a coordinate. **A plate with no tiles carries no projection, so a position on it is a
position on a plate and not a place on the earth.**

**What was built instead, and why it is not a workaround.** The host's point is held as a fraction of
the plate in each axis, in the composer's own `pin_x` and `pin_y`. The payload carries them,
`publish_post` reads neither, and an unread key is dropped — which is what makes the omission provable
rather than promised. Writing that fraction into `event_delivery.lng` and `.lat` would have satisfied
the frames and put invented geography into the database, where every later read would treat it as a
real point: the worst available version of the thing guardrail 3 refuses. The map's own point does
have a coordinate behind it, written by `place-resolve`, and it renders at the plate's centre as the
token for "the map holds a point" and never as where that point is.

**What this costs, stated plainly.** The panel's second line, ratified in P4-SPEC section 3, reads
`Type the venue as you say it, then place the pin where it is. Both travel with the event.` The words
travel, in `place_text`. The pin does not. The sentence is true of the built surface the spec
describes and is not yet true of this build, and a host in Ghana who places a pin will not find it on
the event. That is the gap, and it is named here rather than softened in the copy, because the copy is
ratified and the shortfall is the code's.

**The fix this entry names.** The pass that gives the plate real tiles from the provider — which is
what the plate's own unplaced line already promises — gives the same control a projection, and the
host's point becomes a coordinate at that moment. It needs two columns on `event_delivery` beside the
existing `lng` and `lat`, because P4-SPEC section 5 draws a host-placed point standing beside a
resolver-derived one and one pair cannot hold both, and it needs a ruling on which provider and which
token reaches the client. Until then the pin is a surface that reads correctly and stores nothing.

**Not this gap's scope.** The two pin kinds, the chip's four readings, the instruction by state and by
input mode, and the act by state are all built and all proven in the harness. Nothing about how the
pins read is in question here; only what is behind one of them.

## G44. The info panel says the map holds no venues for a country, and nothing in the tree knows which countries that is true of

**Severity: medium for the surface, none for the code. Not a merge blocker. Opened 18 September 2026
during Convene Pass 4, filed under ruling 597. The number is assigned by this entry (ruling 638).**

**What it is.** P4-SPEC section 3 draws the `Why is my venue not here?` control in the state
`Country chosen, place empty`, and says of its panel: "The country name in the title and body is the
country the host chose. The claim is about that country's coverage and renders only where it is
true." The claim is a coverage fact. This tree holds no coverage fact about any country.
`place-resolve` answers `one`, `several`, `none` or `unavailable` and carries no coverage signal, and
`public.world_countries` is two columns, `name` and `position`. The two ways to render the drawn state
exactly are a hardcoded list of countries, which the fixed-vocabularies absolute forbids by name, and
a coverage column on the vocabulary that nobody has ratified and that would need its own migration,
its own RLS reading and its own source of truth.

**What was built instead.** The control waits for grounds. It renders once the country the host chose
has answered a lookup with nothing at least once in this composing session, which is the map's own
zero and the only true thing the surface can say about that country's coverage. With the field then
cleared, the form is in the drawn state and the claim is grounded. A host in France, where the map
does hold venues, never sees a panel telling them it does not.

**What this costs.** The control appears one step later than the frames draw it: after the first
empty answer rather than on choosing the country. A host who chooses Ghana and never types anything
is not offered the explanation. Against that, the alternative was a sentence that is false for most
of the world's countries, rendered on the strength of a list this repository is forbidden to hold.

**The fix this entry names.** G35's decision, and the same one: a coverage fact has to come from
somewhere before a surface can assert it. Either the second POI source makes the claim unnecessary
for the countries it covers, or DNA's own venue vocabulary carries coverage as a property of the
vocabulary, read at runtime as every fixed vocabulary is. Either way the control can then render on
the country alone, as drawn.

**Not this gap's scope.** The three panel strings are ratified and render verbatim, the panel is
Strand's `Sheet` under ruling 901, and the rewritten zero-results hint under P4-SPEC section 4 makes
the same claim in the state where it has always been grounded. Only the moment the control appears is
in question.

## G45. Pass 4's event-page half has no event page to land on

**Severity: medium for the brief, none for the code. Not a merge blocker. Opened 18 September 2026
during Convene Pass 4, filed under ruling 597. The number is assigned by this entry (ruling 638).**

**What it is.** P4-SPEC section 7's second half and section 10 are both on the event page: the
attendee's reading of the host's map link (`Open the host's map link`, with its note), and `Get
directions` through the viewer's own handler in its three states. Section 6's third chip reading,
`Placed by the host`, is the attendee's too. **There is no event page in this tree.** The routes are
`__root`, `_shell`, `_shell/$c`, `_shell/connect`, `_shell/feed`, `_shell/m.$handle`,
`_shell/password`, `_shell/posts.$id`, `index`, `relationship`, `reset`, `reset_.new`, `sign-in`,
`welcome` and `where`; `/posts/$id` is ruling 105's expanded card as page content and not an event
page; and `Get directions` returns zero hits repository-wide. P1-SPEC-R5 section 5a carried all three
to Pass 4 by name, and Pass 4's own Done Means does not name any of them.

**Why it was not built anyway.** An event page is a surface, and ruling 62 says no surface is built
without an approved prototype and that the extraction and SPEC are its visual contract. P4-EXTRACTION
draws four event-page _states_ at four tiers, which ratifies that copy; it draws no page — no
masthead, no order, no route, no data contract, nothing a builder could lay out without inventing it.
Building one from four states is exactly the reconstruction ruling 90 refuses.

**What was built.** The four chip readings live in one component and are selected by a `viewer` prop,
so `Placed by the host` is written, is one prop away, and has nowhere to mount. The composer mounts it
as the host. The map link is stored (P4-SPEC section 7's first half) and no read path selects it.

**The fix this entry names.** A drawn event page, or a ruling that the expanded card is the event
surface and the three affordances belong on it. The second is cheap and may be right — `/posts/$id`
already renders the expanded card as page content — but it is a ruling, because P4-EXTRACTION's frames
draw the card without a plate, without a link row and without directions, and adding them to the card
is a card change nobody has approved.

## G46. The info panel opens a second `dialog` inside the composer's, and the tree has no nested-sheet precedent

**Severity: low. Not a merge blocker. Opened 18 September 2026 during Convene Pass 4, filed under
ruling 597. The number is assigned by this entry (ruling 638).**

**What it is.** `ConveneForm` renders inside the Composer's own `Sheet`, so P4-SPEC section 3's panel
nests a second `Sheet` — a second `dialog` opened with `showModal()`, a second `aria-modal` panel and a
second Tab trap — inside the first. Every one of the seven other `Sheet` callers in the tree mounts at
surface level, so there is no precedent to copy and nothing that has been exercised twice.

**What was checked.** Escape does not double-close: the outer sheet's `cancel` handler is on its own
dialog and `cancel` does not bubble, so the top-layer dialog takes it. The harness opens the panel,
reads its three strings and closes it with Escape at both tiers, and the composer is still open on the
next check. What is not checked is the Tab trap: the outer sheet's focusable list is computed from its
own panel, which now contains the inner sheet's controls, so Tab inside the panel is governed by two
traps at once. No misbehaviour was observed; nothing proves there is none.

**Two things the spec asked for that this build did not take, and why.** P4-SPEC section 3 says the
panel is a `Sheet` "`contained`, with `tier` passed per frame", at "390 bottom-anchored, 820
side-anchored, 1280 and 1440 centred, which is 584's geometry". Strand as ported has neither. `Sheet`
takes no `tier` and has no centred geometry: it implements ruling 492, whose own header calls it
"canonical and not overridable per surface" — a bottom sheet on compact, a 40 percent side sheet on
medium and expanded — and all seven callers pass `variant={tier === "compact" ? "sheet" : "drawer"}`.
Taking the drawn anchor would mean a per-surface geometry override, which is the thing 492 forbids and
the thing "one part, no variant" is asking for. And `contained` is the prototype's scaled-frame
affordance: `ComposerShell` never passes it, so in the app it is undefined, and passing it would trade
`showModal()` for a bare `open` attribute and give up the browser-owned top layer and inert
background that ruling 499 chose. So the panel is the one part, with the geometry the part has.

**The fix this entry names.** A ruling on which is canonical — 584's centred expanded geometry or
492's side sheet — and, if 584, a change to `Sheet` itself rather than to this caller, because every
sheet on the platform mounts that one component. Separately, if nesting is to be a pattern rather than
one surface's accident, `Sheet` should know it is inside another and hand the trap over; that is a
Strand ask, not a repo patch.

## G47. The composer's Date picker is displayed and then ignored whenever the When words parsed to a date

**Severity: high for the surface, none for the register's own subject. Not a merge blocker. Opened
18 September 2026 during Convene Pass 4, filed under ruling 597. The number is assigned by this
entry (ruling 638). Pre-existing: `git log -S` puts the line in `b29ab90`, Convene Pass 1's PR 3, so
Pass 4 found it rather than caused it and did not fix it — a follow-up found during a PR earns a
number, not a patch.**

**What it is.** `src/components/dna/ConveneForm.tsx` reads the moment as
`const date = parsed?.date ?? (v("when_date") || null)`, which prefers the parse over the picker.
The picker is mounted only in the state where `parseFailed` is true, and `parseFailed` is
`whenWords.trim() !== "" && !(parsed && parsed.time)` — words that parsed to a date but carried no
time. So the one state the picker exists for is a state where `parsed?.date` is non-null and takes
precedence over everything the host types into it. The Date input renders
`value={v("when_date") || parsed?.date || ""}`, so the host's own edit is displayed back to them and
then discarded.

**The failing input.** With `now` at 18 September 2026, the host types `16 October` into When.
`parseWhen` returns `{ date: "2026-10-16", time: null }`, the hint reads `That did not read as a
date and time. Pick them below.` and the pickers mount pre-filled with 2026-10-16. The host corrects
the Date to 2026-10-17 and sets the Time to 19:00. The field shows 17 October. `date` is still
`"2026-10-16"`, so `startsAt` is the sixteenth, `convene.starts_at` is the sixteenth, and the event
is stored for the sixteenth. The read-back line beneath the field also reads the sixteenth, so the
form contradicts itself on screen rather than failing silently — which is the one mercy in it.

**Why the Time field does not have the same defect.** `time` reads
`parsed?.time ?? (v("when_time") || null)`, and in this state `parsed.time` is null by construction,
so the picker's value is what is used. The asymmetry is the whole bug: the same expression is
correct for one field and wrong for the other, because only one of the two is guaranteed null in the
state that mounts them.

**The fix this entry names.** The picker is the later statement and should win: read the picker's
value first and fall back to the parse, `v("when_date") || parsed?.date || null`, matching how the
host experiences the two controls. It is one line, and it wants a check of its own in the Convene
arm — the arm already drives this exact state at `failed parse: the hint and a date and time picker,
Publish off` and then fills only the Time, which is why five passes over the file have not caught it.

**Not this gap's scope.** Pass 4's section 9 is unaffected. The weekday contradiction names
`dateLine(startDate, …)`, which is derived from the same `date`, so the sentence names the instant
that is actually stored and stays true whatever this entry decides.

## G48. Selecting a lens re-divides the track, so every seat moves under the finger that chose it

**Severity: high for the surface, and it is shipping to members today on every surface that mounts
the part. Not a merge blocker under ruling 140 — this is not a visibility, RLS or consent finding —
but it is the one item on Session 27's list that is live rather than latent. Opened 19 September
2026 during Session 27 under ruling 952, filed under ruling 597. The number is assigned by this
entry (ruling 638). Fixed in the same PR that opens it; the entry stays because 638 assigns the
number by the entry and because the mechanism outlives this fix.**

**The read.** `src/components/strand/LensBar.tsx` gives the active tab `flex: on ? "none" : "1 1 0"`
and every other tab an equal share of what is left. Selection is therefore a layout input: when it
moves, the outgoing tab collapses from its content width to a share and the incoming one does the
reverse, and every seat between and beside them changes x. The member's next tap lands on the seat
that has slid under their finger rather than the one they aimed at, which on a four-lens bar is
usually the neighbour.

**Where it ships.** Three mounts, all on `main`: the Feed (`src/components/dna/FeedSurface.tsx:549`),
Connect (`src/components/dna/ConnectSurface.tsx:880`) and the header's dense rendering
(`src/components/strand/AppHeader.tsx:130`), which is the compact and medium tiers once the member
has scrolled into the list. It is not Brief 9's, it is not the bundle's, and no surface opts out of
it: the distribution rule is the part's own.

**The prototype reaches it by the same mechanism.** Handoff 27-A records the reading taken on
Strand's own part at compact: seats at 4-81, 83-127, 129-173 and 175-219 with `All` active, and
4-48, 50-94 and 96-219 with the third lens active, up to 79px of shift. That reading is carried here
as the prototype's and not as this repo's: it is quoted from the handoff rather than re-measured,
and its second row lists three seats where the first lists four, so the transcription is not exact
even though the mechanism it describes is the one in this tree. The repo's own reading is the
harness check named below, which measures seat x on the deployed build rather than in a prototype.

**Ruling 936's reflow is a different one.** 936 measures 12px at a tier boundary, where the bar's
rendering changes because the tier changed. This one needs no resize and no tier change: it fires on
a plain selection at a fixed width, and its magnitude is the difference between a label's content
width and an equal share rather than a padding step.

**Why no gate caught it.** The shell arm has read the bar's layout since G36 (`tests/matrix.cjs`, the
`lensFit` check): it asserts that no tab's content exceeds its box and that the track does not
scroll. Both of those are true of a bar whose seats move, because they are read once, in one
selection state. Nothing in the harness had ever read the same seat twice, and a check that never
compares two states cannot see a state change. The check this entry adds does exactly that and
nothing more.

**The fix, and the constraint it had to clear.** Every tab now takes `flex: "1 1 0"`, so the track is
divided equally and selection is no longer a layout input. Ruling 488's constraint holds: the active
tab's own background is still the indicator, painted on the first frame, and nothing returns to a
measured absolute chip moved by transform, which is W34 and which 488 removed. `--target-min` and
the 44 floor are untouched. Ruling 723's labels-fit switch still decides labels against icon-first on
the same probe, re-measured on resize and on font load; its arithmetic follows the layout it decides
for, as the part's own comment requires, so the per-seat requirement it tests is now a seat of the
track's equal division rather than the active tab's content width plus the others' shares.

**What that arithmetic costs, stated plainly.** Equal seats are a stricter fit test than content-sized
active plus equal inactive, because the widest label has to fit one seat rather than the whole track
minus the others' shares. At widths where the old test answered "fits" by a few pixels the bar now
renders icon-first, which is G37's band and G37's question. This entry does not decide it; it records
that the boundary moved and why.

**Not this gap's scope.** Ruling 905's 44px seat, whose mechanism is pending Design and which nothing
here implements. G37's icon-first threshold at the medium tier. The labels-fit switch itself, which
is G36's and is unchanged in substance. And `docs/shell/LENS_BAR_SPEC.md`'s Distribution line, which
named the superseded mechanism and is corrected in the same PR rather than left to be rebuilt from.

## G49. The ruling 919 focus-ring sweep: an inline `all: unset` outranks every focus rule in the stylesheet, and 41 of 42 sites carry one

**Severity: high for keyboard accessibility, both themes, every tier. Not a merge blocker and not a
ruling 140 finding. Opened 19 September 2026 during Session 27 under ruling 919, filed under ruling 597. The number is assigned by this entry (ruling 638). Recorded, not fixed: the remedy is 41 sites
across 29 files and a decision about which mechanism gives the ring back, which is Design's and the
founder's rather than a code session's.**

**Why the sweep exists.** Session 26 recorded a ring with nowhere to draw and the finding lived in a
session's prose. A finding in prose cannot be re-run, so this entry carries the scope, the hits and
the sites the sweep cleared. A sweep that records only its hits cannot be checked against its own
scope by the next reader, which is the whole reason 919 asks for an entry.

**The mechanism, measured rather than reasoned (ruling 891).** `src/styles/strand.css:368` declares
the ring globally, `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px }`, and
`src/components/strand/LensBar.tsx:171` injects its own copy for the tabs. Both are author stylesheet
rules. An inline `style` declaration outranks an author stylesheet rule that carries no `!important`,
and `all: unset` sets every longhand to its initial value, which for `outline-style` is `none`.
So an element with an inline `all: unset` matches `:focus-visible`, is focused, and computes
`outline-style: none`. Read in Chromium on a synthetic page: the `all: unset` tab reads
`focusVisible: true, outlineStyle: "none", outlineWidth: "0px"` while the plain tab beside it under
the same two rules reads `solid 2px rgb(74, 141, 119)`.

**And measured on the running app, not only on a probe.** `/sign-in` at 390, every focusable control,
each focused in turn and its computed outline read:

| Control                 | Part                      | Computed outline when focused |
| ----------------------- | ------------------------- | ----------------------------- |
| `Sign in`               | `Button`                  | `solid 2px rgb(74, 141, 119)` |
| `Continue with Google`  | `Button`                  | `solid 2px rgb(74, 141, 119)` |
| `Sign in with LinkedIn` | `Button`                  | `solid 2px rgb(74, 141, 119)` |
| `Show password`         | `PasswordField.tsx:79`    | `none 0px`                    |
| `Forgot your password?` | `sign-in.tsx` text button | `none 0px`                    |
| `Create an account`     | `sign-in.tsx:247`         | `none 0px`                    |

`Button` does not use `all: unset` and its ring draws. The three that do not draw are the three that
do. One surface, one reading, both halves of the rule in the same screenshot.

**The scope, so it can be re-run.** Every inline `all: "unset"` under `src/`, walked back to the JSX
tag or the shared style constant that owns it: 42 sites in 29 files.
`grep -rn 'all: "unset"' src/` is the whole scope and the count is the check.

**The hits: 41 sites.** Four in `AppShell.tsx` (`:488`, `:546`, `:569`, `:592`), two each in
`FeedSurface.tsx` (`:430`, `:478`), `AppHeader.tsx` (`:118`, `:145`, `:190`, `:216` — four),
`ConveneForm.tsx` (`:90`'s shared `TEXTBTN`, `:989`), `OnboardingSurface.tsx` (`:223`, `:494`,
`:826` — three), `ProfileSurface.tsx` (`:271`'s shared `LINK_STYLE`, `:683`, `:1120` — three) and
`PostCard.tsx` (`:129`'s `linkStyle`, `:459`), and one each in `AuthSurface.tsx:284`,
`NotificationPanel.tsx:169`, `ProfileBlockControl.tsx:53` (`ITEM`, the overflow menu item),
`Rails.tsx:70`, `AudienceSelect.tsx:46`, `BackRow.tsx:30`, `BadgeRow.tsx:54`, `Chip.tsx:53`,
`DiaLine.tsx:61`, `LensBar.tsx:272`, `MediaBlock.tsx:188`, `NotificationListItem.tsx:115`,
`PasswordField.tsx:79`, `PatternPicker.tsx:44`, `ProfileHeader.tsx:333`, `PulseDock.tsx:100`,
`Segment.tsx:43`, `Toast.tsx:37`, `VerbChip.tsx:54`, `VocabularyPicker.tsx:51` and
`src/routes/sign-in.tsx:247`. Every one is a focusable control or a style constant spread onto one.

**`LensBar` is the sharpest case and is the ring with nowhere to draw.** The part injects
`.strand-lens [role=tab]:focus-visible{outline:2px solid var(--focus);outline-offset:2px}` — a rule
written for these tabs and these tabs only — and then sets `all: "unset"` inline on each tab, which
outranks it. The rule matches, the element is focused, and the outline computes to none. The spec
asks for it in so many words (`docs/shell/LENS_BAR_SPEC.md`: "Focus: 2px `--focus` (emerald) outline,
2px offset, on every lens, both themes"), so this is a shortfall against a ratified contract and not
a design question.

**The sites the sweep cleared.** One of the 42: `src/components/strand/Composer.tsx:924`, a
`fieldset` that sets `outlineStyle: "dashed"` in the same inline object, so the shorthand's reset is
overwritten by a later longhand on the same element. It is a decoration rather than a focus ring and
the fieldset is not focusable, so it is cleared for two reasons and neither of them generalises.
Cleared outside the `all: unset` set, and named so the next sweep knows they were looked at:
`MemberCard`'s name button (`.strand-mc-name`, `strand.css:404`) and `PlaceTile`
(`.strand-placetile`, `:409`), which take the ring from the stylesheet with nothing inline to beat
it; `Button`, `Input`, `Select` and `PasswordField`'s own field, which either carry no `all: unset`
or replace the ring with a drawn border of their own; and every `outline: "none"` in the tree
(`Input.tsx:54`, `Select.tsx:40`, `AuthHead.tsx:63`, `Composer.tsx:1031` and `:1121`,
`OnboardingSurface.tsx:666` and `:936`, `AuthSurface.tsx:69` and `:117`,
`ProfileBlockControl.tsx:169`), which are deliberate suppressions on fields that draw a focus border
instead and are not this sweep's subject.

**Why no gate caught it.** `scripts/token-check.mjs` proves every cited token resolves in both themes
(ruling 485); `--focus` resolves, and it is cited, and the check has no opinion about whether the
declaration that cites it wins its cascade. Nothing in the harness focuses a control and reads its
computed outline. The matrix's `block-focus` arms read focus _order_ and not focus _paint_, which is
why nine of them pass on every run while the ring is absent.

**The fix this entry names.** One decision, then a mechanical change: either stop using `all: unset`
on focusable elements in favour of a narrower reset, or give the ring back where the reset removed
it — a shared `:focus-visible` rule carrying `!important`, or the outline restored inline in each
part. The first is correct and large; the second is small and is the kind of thing that decays. The
choice is Design's with the founder, and it wants a harness arm that focuses one control per part and
reads `outlineStyle`, because this is a defect that a screenshot of a passing run does not show.

**Not this gap's scope.** The ring's colour, offset and radius, all of which the spec settles and
none of which is in question. The `outline: "none"` suppressions on fields, listed above as cleared.
Focus order, roving tabindex and the dialog focus traps, which the block-focus and keyboard arms
already read.

## G50. Sixteen files are not prettier-clean, and CI enforces prettier on every file type except theirs

**Severity: low, tidiness with one decision behind it. Not a merge blocker. Opened 19 September 2026
during Session 27, filed under ruling 597. The number is assigned by this entry (ruling 638). Not
fixed here on purpose: a whitespace diff across sixteen files would bury every other change in
Session 27's PR, which is the reason the handoff asks for a number rather than a reformat.**

**What it is.** `npx prettier --check .` reports sixteen files:

`.claude/settings.json`, `docs/audit/CONFORMANCE-01.md`, `docs/audit/FIX-PR-03.md`,
`docs/composer/SPEC.md`, `docs/connect/SPEC.md`, `docs/convene/P1-EXTRACTION.md`,
`docs/convene/P1-SPEC-R5.md`, `docs/convene/P1-SPEC.md`, `docs/onboarding/SPEC.md`,
`docs/profile/B4A-SPEC.md`, `docs/profile/SPEC.md`, `docs/security/PASS-01.md`,
`docs/security/PASS-02.md`, `docs/shell/SPEC.md`, `src/styles/strand.css`, `wrangler.jsonc`.

**Whether the repo enforces prettier in CI: it does, and that is what makes the sixteen readable as
a set rather than as an accident.** `pages.yml:39` runs `bun run lint`, which is `eslint .`, and
`eslint.config.js` ends with `eslintPluginPrettier` from `eslint-plugin-prettier/recommended`, so a
prettier violation is an eslint **error** and fails the job. What it does not do is reach these
files. Flat config lints `**/*.js`, `**/*.cjs` and `**/*.mjs` by default and the one `files` block
adds `**/*.{ts,tsx}`; nothing adds `.md`, `.json`, `.jsonc` or `.css`. Every one of the sixteen is
one of those four extensions, and every `.ts`, `.tsx` and `.cjs` file in the tree is clean. The
sixteen are not sixteen files that slipped past a gate; they are the exact complement of the gate's
reach.

**The decision this entry exists to surface.** Two coherent answers and the repo currently states
neither. Add `npx prettier --check .` as its own step in `pages.yml` beside `bun run lint` and
reformat the sixteen in a PR that does nothing else — which makes the formatter's authority match
its configuration, at the cost of one whitespace commit across the docs. Or narrow prettier's own
scope with a `.prettierignore` that names what is not enforced, so `--check` and CI agree and a
contributor running `bun run format` does not produce a diff CI never asked for. What should not
stand is the present state, where `bun run format` rewrites sixteen files that no gate will ever
complain about and no reader can tell whether that is policy or drift.

**Why no gate caught it.** It is not a gate's miss: the gate is doing exactly what it is configured
to do, over exactly the files it is configured to see. This is a scope question, which is why it is
an entry and not a fix.

**Not this gap's scope.** `.claude/settings.json`'s contents. An agent never writes its own
permission rules at any scope (ruling 378), so that file is named here as one of the sixteen and is
not touched, and whoever takes the reformat decision should note that it is the founder's file
whichever answer they pick.

## G51. The design-system bundle's runtime errors were fixed at cause in correction 21, and this repository holds no record of what they were — closed (Session 29, compile `v1789885868097915`)

**Severity: low for this repository's own code, which loads none of the bundle; medium for the
register, because a defect class closed with no written symptom cannot be checked off when the
compile that closed it arrives. Opened 21 September 2026 during Session 28 from handoff 28-A item 7,
filed under ruling 597. The number is assigned by this entry (ruling 638).**

**Why the entry exists at all.** The number is owed. 638 says a G number is assigned by writing the
entry into this file and is never reserved in a report, a PR body or a chat message, so the number
is written here with the description missing rather than promised somewhere the next reader will not
look.

**What this repository carries, read today.** `docs/strand/` holds exactly one compile,
`v1789720800167997`, which its own `README-EXPORT.md` names as correction 17. Its rules are in
`docs/strand/README.md`: one directory per compile, named from the bundle's own
`@ds-compile-id`; a directory is never overwritten and never deleted; nothing here is built into the
app or served to visitors, so no module imports the bundle, no route serves it and no build step
reads it. `LENSBAR-CHANGES-14-16.md` carries corrections 14, 16 and 17 and nothing later.

**What the tree does not carry, and this is the gap.** Correction 21 appears nowhere in this
repository: not in `docs/`, not in `CLAUDE.md`, not in any commit message on any branch. Neither do
corrections 18 to 20. No file here describes a runtime error raised by the bundle — not which error,
not where it was raised, not on which compile, not what correction 21 changed at cause. The entry is
therefore opened with its symptom record blank on purpose. Reconstructing a mechanism nobody read in
the tree is what rulings 943, 955, 957, 958 and 960 were written about, and ruling 555 says a
mechanism a handoff asserts is a lead to verify and never a fact to build on.

**What was owed, and from whom.** From Design or the founder: which errors the bundle raised, on which
compile, in which host, and what correction 21 changed at cause. That is four sentences from someone
who watched them, and it is the whole of what this entry needed to become useful.

## The symptom record, written from the artifact (21 September 2026, handoff 29-A item 6)

The compile carrying correction 21 landed in this tree as `docs/strand/v1789885868097915/`, and it
answers all four. Quoted rather than paraphrased, because a paraphrase of a defect is a mechanism
nobody read.

**Which errors, and where.** `docs/strand/v1789885868097915/STRAND-CORRECTION-21-EXTRACTION.md` §1(c):

> **(c) Item 11 is three errors, not five.** `NS.__errors` holds three entries: one React #299 in
> `ui_kits/dna/app.jsx`, one in `ui_kits/dna/composer/proto.jsx`, and `Can't find variable: IMG` in
> `ui_kits/dna/connect.jsx`. Not two and two and one. The correction's reading of the count is the
> only thing that changes; every cause it names is real and all three are fixed.

So: **three**, not the five the correction reported. Two React #299 (a `createRoot` with no container)
and one `ReferenceError` on an undefined binding.

**On which compile they were raised, and on which they are gone.** The pre-fix state is correction
20's `v1789787827785362`. `STRAND-CORRECTION-21-EXTRACTION.md` §0 tabulates it against the loaded
pre-fix bundle, with `the bundle's own demo errors` reading **3**, and the compile stamp in the same
file records the after side as `BUNDLE_ERRORS: "none"` at `v1789885868097915`. `README-EXPORT.md`'s
"Fixed" section states it plainly:

> **The bundle's `__errors` array is empty.** It held **three** entries — one React #299 in
> `app.jsx`, one in `composer/proto.jsx`, one `Can't find variable: IMG` in `connect.jsx`. Both
> mounts now check for `#root`; `connect.jsx` defines its own asset constant instead of reading one
> `shell.jsx` assigns after it has already been evaluated. No demo was removed.

**In which host.** The artifact names no browser, and it does not need to: each component in
`_ds_bundle.js` is wrapped in its own `try { … } catch (e) { __ds_ns.__errors.push({ path, error }) }`,
so `__errors` collects throws at module-evaluation time and the three entries are three demo pages of
Strand's own kit failing to evaluate — not a rendering that differs by engine. The host is therefore
any page that loads the bundle without the `#root` the two mounts assumed, which is what the fix
addresses. That is the honest answer to the fourth question and it is read off the artifact rather
than supplied by a witness.

**What correction 21 changed at cause.** `STRAND-CORRECTION-21-EXTRACTION.md` §3, "Item 11 — the
bundle's own errors":

> All three fixed at cause: both `createRoot` calls mount only when a `#root` exists, and
> `connect.jsx` defines its own `DEMO_IMG` rather than reading a binding `shell.jsx` assigns to
> `window` after `connect.jsx` has already been evaluated. No demo is removed. **`feed.jsx` has the
> same `IMG` pattern and does not error**, because its references are inside function bodies rather
> than at module scope; it is not one of the three and is left alone.

**Status: closed.** The record is what this entry was opened without, and the compile that closed it is
in the tree at a path that is never overwritten and never deleted (907). Two things are deliberately
not claimed. The closure rests on the artifact's own statement about itself, which is the shape ruling
891 refuses for a claim a harness could check — so this entry closes on a **record**, not on a check:
nothing in `src/` loads the bundle, no arm here can read `__errors`, and building one would mean
serving an artifact this tree deliberately does not serve. And `feed.jsx` carrying the same pattern
without erroring is recorded above because it is the kind of detail a later reader would otherwise
re-derive.

**Still not this gap's scope.** The app project's bound `_adherence.oxlintrc.json` and which compile it
belongs to; see the paragraph below, which is unchanged.

**Why it matters here even though nothing in `src/` loads the bundle.** Rulings 888 and 907 bind the
app Design project to a named artifact in this tree, and 855 and 858 bind a ratification to that
named artifact, which is why 18 lands beside 17 and never on top of it. When the compile carrying
correction 21 is exported into `docs/strand/`, this entry is where its fix is checked off and
closed; without the symptom record there is nothing to check it off against, and the closure would
rest on the export's own prose about itself, which is the shape ruling 891 refuses.

**Not this gap's scope.** The app project's bound `_adherence.oxlintrc.json` and which compile it
belongs to (handoff 28-A item 1, ruling 996). That is held on a statement from the founder or from
Design and is a separate question: this repository carries no adherence config at all, at root, in
`scripts/` or in `tests/`.

## G52. At the medium tier the lens bar's recorded mode disagrees with the lens bar's own recorded measurement, on the same run, in the same evaluate — closed (Session 29, handoff 29-A item 7)

**Severity: low as a rendering outcome — icon-first is a legible bar and nothing overflows, every
`lensFit` check on the run passed — and medium as a measurement problem, because a mode that does
not follow from the numbers printed beside it makes ruling 916's record unusable for pricing Brief
9's redraw, which is the job ruling 975 promoted the baseline to a gate for. Opened 21 September
2026 during Session 28, from handoff 28-A item 8's re-read, filed under ruling 597. The number is
assigned by this entry (ruling 638). Not fixed here: item 8 says a re-read that disagrees with 981
is reported and not reconciled, and no cause has been established.**

**Where the numbers come from.** `main` at `f36df8b9`, `matrix.yml` run 56, `special: shell`, against
`https://dna-web-application.pages.dev`. 596 of 596 checks passed, 18 arms, no crashed web process.
The mode, the track and the probe are all read in the one `page.evaluate` at `tests/matrix.cjs:4076`,
after `document.fonts.ready`, so they are the same moment by construction.

**The price, from `src/components/strand/LensBar.tsx` as it stands on that head.** Ruling 981: under
fill packing the price is `n × seat(widest)`, which the file spells
`need = 8 + others * 2 + n * seat`, with `seat = Math.max(activeMax, inactiveMax)` and labels chosen
when `Math.ceil(need) <= track.clientWidth`. On the Feed's five lenses that is
`need = 16 + 5 × seat`, so labels require `seat <= (track - 16) / 5`. At the medium tier the track is
616 at every width, so the threshold is **seat ≤ 120.0**.

**What run 56 recorded at 744, 820 and 1024.** Both engines measured below the threshold at all six
readings, and four of the six rendered icon-first anyway.

| Engine   | seat (widest probe) | `need` | track | price says | mode recorded                             |
| -------- | ------------------- | ------ | ----- | ---------- | ----------------------------------------- |
| chromium | 118                 | 606    | 616   | labels     | icon-first at 744, 820, 1024              |
| webkit   | 119                 | 611    | 616   | labels     | icon-first at 744; labels at 820 and 1024 |

The probe rounds to whole pixels in the harness, so chromium's seat is in `[117.5, 118.5)` and
webkit's in `[118.5, 119.5)`; the whole of both intervals sits under 120.0, so rounding does not
reach the disagreement. Nor does the engines' own spread: they differ by one pixel and land on
opposite answers at 820.

**Where the price and the mode do agree.** Everywhere else on the run. At the compact tier the
thresholds are seat ≤ 62.4 (track 328, 360 wide), ≤ 68.4 (358, 390) and ≤ 76.4 (398, 430), every
measured seat is 118 or 119, and all six compact readings are icon-first, as priced. At the expanded
tier `FeedSurface` passes `labels={expandedTier}`, so `canSwitch` is false, the bar never measures
and no probe is rendered — which the record shows as three chromium and three webkit lines carrying
a mode and a track and no probe at all. The disagreement is the medium tier and nothing else.

**What this is not.** It is not ruling 981 being wrong, and it is not the arithmetic being wrong:
apply the file's own expression to the file's own measurement and it answers labels. It is that the
mode the bar was rendering when the check read it does not follow from the measurement the same check
read. The two must therefore have come from different moments — the bar's `fit` is state, set by a
`measure()` that runs in a layout effect at mount and again on `ResizeObserver` and on the font
events, while the probe and the track are read once at check time. Anything more than that is a
guess, and this entry does not make one.

**What is worth knowing when it is picked up.** `useTier` starts at `compact` and corrects in an
effect, so every medium-tier mount lays out twice and the track's width changes underneath the bar.
And this repository's port carries no equivalent of the Strand bundle's correction 16 item 16, the
zero-measurement guard that keeps the rendering it has and retries rather than treating a zero as an
answer — `LENSBAR-CHANGES-14-16.md` in `docs/strand/v1789720800167997/` describes it and
`LensBar.tsx` does not have it. Both are places to look. Neither is established as the cause.

**The branch's own enforcing run moved the mode without moving the measurement, which is the
strongest thing this entry has.** Run
[278](https://github.com/jodombrown/dna-web-application/actions/runs/35552933642) on `d1e9e611`,
against the branch preview, read webkit as **icon-first at 744, 820 and 1024** where run 56 on `main`
read **labels at 820 and 1024**. The probe is byte-identical across the two runs
(`a63 i62 a90 i89 a119 i118 a77 i76 a82 i81`) and so is the track (616). Chromium's nine lines are
byte-identical between the two runs as well. So the same engine, given the same measurement against
the same track, answered differently on two runs: the mode is not a function of the measurement, and
what separates 820 on `main` from 820 on the branch is timing rather than pixels. The cross-engine
split the table above records is the same phenomenon caught once; this is it caught twice.

**Session 28's diff cannot account for it (confidence: high).** Ruling 1000 removed `dense`, which
was read in exactly two places: `ico` at render time in `LensBar`, and `AppHeader`'s bell predicate.
It never entered `canSwitch`, `measure()`, the probe's markup or the track, and the probe rendered
its 20px icon spacer with or without it, so the fit computation is the same code on both heads. The
shell arm also reads the Feed's own in-column bar, not the compact header bar, because it runs before
any scroll. That leaves the race (confidence: moderate to high) rather than the change.

**One consequence worth stating plainly.** On run 278 all six medium readings are icon-first on both
engines, so the disagreement with the price is uniform there rather than split. That is a tidier
record and not a better one: it is six readings the arithmetic says should have been labels.

**A third reading, and it is a third answer.** Run
[279](https://github.com/jodombrown/dna-web-application/actions/runs/35554896651) on `6ca7d623` — a
head whose only difference from `d1e9e611` is this file — read webkit's medium tier as **labels at
744**, icon-first at 820 and icon-first at 1024. So webkit's three medium widths have now produced
three different triples on three runs, on two heads whose fit code is identical and against a probe
and a track that never moved:

| Run                  | Head       | 744        | 820        | 1024       |
| -------------------- | ---------- | ---------- | ---------- | ---------- |
| 56 (`main` baseline) | `f36df8b9` | icon-first | labels     | labels     |
| 278                  | `d1e9e611` | icon-first | icon-first | icon-first |
| 279                  | `6ca7d623` | labels     | icon-first | icon-first |

Every one of those nine readings carries the same probe
(`a63 i62 a90 i89 a119 i118 a77 i76 a82 i81`) and the same 616 track, and the price says labels for
all nine. 744 has now answered both ways. This is no longer a split to be attributed to an engine or
to a head: within one engine, one measurement and one track, the mode is settled per run and per
width by something the record does not capture.

**What it costs elsewhere.** G37 is about this tier and its numbers are older than the code: its
table prices the widest label as an active tab at 131px under the pre-952 probe, which rendered
`padding: 0 14px` active against `0 8px` inactive, and its 619 comes from the pre-952 expression
`8 + others * 2 + activeMax + others * inactiveMax`. Ruling 952 made the probe's side padding uniform
and made every seat equal, and run 56 measures that same label at 118 (chromium) and 119 (webkit).
G37's finding may still stand; its arithmetic no longer describes the file, and that is recorded here
rather than edited into G37, which is not this PR's to reopen.

## Closed: the mode now follows from the measurement, on three readings and two engines (21 September 2026)

**Handoff 29-A item 7, the named proof, taken after the enforcing run on the final head (ruling 556)
and recorded here in a post-merge commit because a PR body dies with the thread (597). Readings are
CI's, never Code's (916).** The subject is `claude/handoff-29-a-8h9ozv` at
`496c4cbd85fca1382e1658664c6e524bd083075b`, merged to `main` as `1a71ee8`, against
`https://claude-handoff-29-a-8h9ozv.dna-web-application.pages.dev`.

**(a) Reproducibility.** The enforcing matrix, `pages.yml` run
[282](https://github.com/jodombrown/dna-web-application/actions/runs/35578165589) — 5090 of 5090 on
chromium and 5090 of 5090 on webkit, 209 arms each, no crashed web process, no unclassified failure —
and one further `matrix.yml` dispatch, run
[57](https://github.com/jodombrown/dna-web-application/actions/runs/35581148853) with `special: shell`
on the same head and the same `base_url`, 596 of 596. The two agree **line for line at every width on
both engines: mode, track and probe.**

| width | track | chromium probe                            | webkit probe                              | mode, runs 282 and 57 |
| ----- | ----- | ----------------------------------------- | ----------------------------------------- | --------------------- |
| 360   | 328   | `a17 i17 a43 i43 a72 i72 a31 i31 a36 i36` | `a17 i16 a44 i43 a73 i72 a31 i30 a36 i35` | icon-first            |
| 390   | 358   | same                                      | same                                      | icon-first            |
| 430   | 398   | same                                      | same                                      | icon-first            |
| 744   | 616   | same                                      | same                                      | icon-first            |
| 820   | 616   | same                                      | same                                      | icon-first            |
| 1024  | 616   | same                                      | same                                      | icon-first            |
| 1366  | 760   | no probe                                  | no probe                                  | labels                |
| 1280  | 760   | no probe                                  | no probe                                  | labels                |
| 1536  | 748   | no probe                                  | no probe                                  | labels                |

The three expanded lines carry no probe because `FeedSurface` passes `labels={expandedTier}`, so
`canSwitch` is false and the bar never measures — the same shape run 56 recorded on `main`.

**(b) Agreement with the price.** The bar names its packing now (`width="fill"` at every call site,
change-list item 24) and the test prices the packing it decides for (ruling 981, item 57). With
`icons` set, `seat(w) = max(44, w + 2·14 + 2·1 + 20 + 8)` and
`need = 2(TRACK_PAD) + GAP(n−1) + n · seat(widest)` on five lenses:

- chromium: widest 72, `seat = 130`, `need = 8 + 8 + 5 × 130 = 666`.
- webkit: widest 73, `seat = 131`, `need = 8 + 8 + 5 × 131 = 671`.

666 and 671 are above every track the bar measures against — 328, 358, 398 and 616 — so the price says
icon-first at all six widths on both engines, and icon-first is what all twelve lines rendered, twice.
**Every line's mode equals its own line's price.** That is what this entry recorded as not holding.

**The counterfactual (984).** The packing is doing the work, and naming it is what makes the answer
legible rather than lucky. Under `content` the price would be `Σ seat(wᵢ)`: chromium
`75 + 101 + 130 + 89 + 94 = 489`, plus 16, is **505**; webkit `75 + 102 + 131 + 89 + 94 = 491`, plus
16, is **507**. Both sit under the 616 medium track, so a `content`-packed bar would render labels
there. It does not, because this track stretches and divides equally under ruling 952, which is `fill`,
and `fill` is what all three call sites name.

**(c) Against run 56's `main` baseline (975), with the arithmetic for every line that changed.**

|                        | run 56 (`f36df8b9`)                                        | runs 282 and 57 (`496c4cb`)               |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| chromium probe         | `a63 i63 a89 i89 a118 i118 a77 i77 a82 i82`                | `a17 i17 a43 i43 a72 i72 a31 i31 a36 i36` |
| webkit probe           | `a63 i62 a90 i89 a119 i118 a77 i76 a82 i81`                | `a17 i16 a44 i43 a73 i72 a31 i30 a36 i35` |
| chromium medium        | icon-first, icon-first, icon-first — price said **labels** | icon-first ×3 — price says icon-first     |
| webkit medium          | icon-first, **labels**, **labels** — price said labels ×3  | icon-first ×3 — price says icon-first     |
| compact, both engines  | icon-first ×6, priced icon-first                           | icon-first ×6, priced icon-first          |
| expanded, both engines | labels ×6, no probe                                        | labels ×6, no probe                       |

**Every one of the twenty probe readings moved by exactly −46**, on both engines and in both the
active and the inactive shape. That is the whole of the change and it is arithmetic, not measurement:
the probe span used to carry the seat's glyph (20), its gap (8), its side padding (16) and its border
(2) inside its own markup, and those 46 pixels now live in `seat()` instead, so the probe reports the
label and nothing else. The seat's own price rose by 12 at the same time, because the bar's side
padding went 8 to `PAD` 14 (item 47, ruling 973). Net on the Feed's five lenses at medium: the old
price was `8 + 8 + 5 × 118 = 606` against a 616 track, which said labels; the new price is 666, which
says icon-first.

**The two lines that changed mode are webkit at 820 and at 1024**, labels to icon-first. Both were
lines where the old price said labels and the old rendering said labels on run 56 but icon-first on
runs 278 and 279 — the instability this entry exists for. They are now icon-first with the price
agreeing, on two independent runs.

**Why this closes rather than merely improves.** The entry's finding was never that icon-first was
wrong; it was that "the mode the bar was rendering when the check read it does not follow from the
measurement the same check read", and that three runs on two heads produced three different triples
from one probe and one track. Two things in handoff 29-A's item 2 reach that directly. The
zero-measurement guard (correction 16 item 16) was this entry's own second candidate, named in "what is
worth knowing when it is picked up", and it is now ported: a measurement of zero keeps the rendering
the bar has and retries on a frame and on a 120ms timer, bounded, rather than collapsing `need` below
any column. The scale normalisation (item 17) landed with it. And the price moved 60px clear of the
616 track, where it had been 10px under it, so a race that lands on either side of a 10px margin no
longer has a boundary to land on. The first is a cause the entry had already named; the second is why
the margin that made it visible is gone.

**A third reading, on a third deployment, taken the same day.** Run
[284](https://github.com/jodombrown/dna-web-application/actions/runs/35581795427), PR #53's own
`matrix (webkit)` against a different Pages preview
(`claude-handoff-29-a-post-mer.dna-web-application.pages.dev`), read the bar at all nine viewports
**byte-identically to runs 282 and 57**: `a17 i16 a44 i43 a73 i72 a31 i30 a36 i35` on tracks of 328,
358, 398, 616, 616 and 616, icon-first at every one, and labels with no probe at 760, 760 and 748.
That job went red on G5's twentieth sighting, two crashed web processes at 1280x800 in unrelated
arms; its lens record is untouched by that and is recorded here because a third agreement on a third
deployment is what this entry spent three runs failing to get.

**What is not claimed.** `useTier` starting at `compact`, this entry's first candidate, is unchanged —
handoff 29-A item 7 holds it out as shell-wide with its own blast radius. So the race is not proven
absent; it is proven not to change this bar's answer at any width in ruling 61's matrix, twice, on both
engines. If a future reading disagrees with its own line's price, that is a new sighting and this entry
is where it starts, reopened rather than rewritten.

## G53. The Lens Bar's visual contract now describes a bar this repository does not build, and the header's two centre-slot states no longer share a height

**Severity: low as a rendering — every frame the code produces is the one the compile governs — and
medium as a contract, because ruling 62 makes SPEC.md the visual contract and a contract that
disagrees with the build is read as the build being wrong. Opened 21 September 2026 during handoff
29-A's Strand re-sync, filed under ruling 597. The number is assigned by this entry (ruling 638). Not
fixed here: 29-A's scope is the re-sync, and a SPEC is Design's document under rulings 62, 663 and 129.**

**What moved.** The re-sync to compile `v1789885868097915` took the geometry from the compile, under
ruling 844 carrying 618's lesson. Four lines of `docs/shell/LENS_BAR_SPEC.md` no longer describe
`src/components/strand/LensBar.tsx`:

| LENS_BAR_SPEC says                                                                               | the build now does                                                  | why                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------- |
| Track "44 tall at every breakpoint"                                                              | 52, composed 4 + 44 + 4                                             | ruling 918, change-list item 35       |
| Seats "min 44 wide, 36 tall"                                                                     | 44 wide and 44 tall                                                 | ruling 918, items 35 and 54a          |
| Compact variant "inactive lenses min `--target-min`"                                             | 44, in every mode                                                   | rulings 905 and 498, items 50 and 54a |
| "Active content: icon 20 plus label ... at every breakpoint except the compact-tier header slot" | in icon-first every seat is one 44px glyph, the active one included | R1, ruling 936, item 40               |

`docs/shell/SPEC.md` line 15 is stale on the same control for an older reason: it still describes the
header slot as `dense` with "the active lens shows its name in place of its icon" and seats at "36
tall" and "32 min". Ruling 1000 retired `dense` before this PR and the prop no longer exists.

**The second half, which is a real consequence and not only a document.** LENS_BAR_SPEC's "Composer
entry, same language" says the composer entry "shares the track's shape, not a pill: `--bg-sunken`,
`--radius-m`, 44 tall". `AppHeader` builds it at `minHeight: 44` and the header row is 56 tall at
compact and medium. The two states of that one centre slot are now 44 (composer entry) and 52
(LensBar track). Both fit the row and they never render at the same time — `data-centre` is `lens` or
`compose` — so nothing clips and nothing overflows. But the slot's two states no longer share a
height, and the sentence that said they share a shape is the sentence that made them one control in
two states.

**What closing it needs.** A Design decision on one question — does the composer entry follow the
track to 52, or do the two states stop sharing a height — and then one pass over `LENS_BAR_SPEC.md`
and `SPEC.md` line 15 against compile `v1789885868097915`. Neither is code this PR may write: the
extraction and SPEC.md are the visual contract (ruling 62) and Strand does not open the app project
(663).

## G54. `width="content"` is reachable and this bar's active seat is bolder than its inactive one, so that packing would re-lay the row on every selection

**Severity: low, because no caller passes it — `FeedSurface`, `ConnectSurface` and `AppHeader` all
name `fill` — and medium if one ever does, because the failure is G48's exactly and G48 is closed.
Opened 21 September 2026 during handoff 29-A's Strand re-sync, filed under ruling 597. The number is
assigned by this entry (ruling 638). Not fixed here: the fix is a decision about the active seat's
weight, which is LENS_BAR_SPEC's and therefore Design's (rulings 62, 663).**

**The mechanism, read in the tree.** Change-list item 24 adds `width`, and ruling 981's fit test
prices the packing it names. Under `fill` every seat takes `flex: 1 1 0` and every seat is the same
width whichever lens is active, which is ruling 952 and what closed G48. Under `content` the compiled
part leaves `flex` undefined and each seat sizes to its own label — which is safe in Strand, because
Strand's `TAB` carries `fontWeight: 500` for every seat and a label is the same width selected or
not.

**This bar is not Strand's on that one point.** `LENS_BAR_SPEC.md` specifies "Active content: icon 20
plus label 15/700" against "Inactive lenses ... icon plus label 15/500", and
`src/components/strand/LensBar.tsx` renders `fontWeight: on ? 700 : 500`. Under `content` packing the
selected seat would therefore be wider than the same seat unselected, every other seat would move to
make room, and selecting a lens would slide the row under the finger that chose it. That is G48's
defect, in a packing G48's fix does not reach, because the fix was equal flex rather than equal
content.

**Why the prop exists anyway.** Handoff 29-A Done Means 3 requires every call site to name its
packing, precisely so the compile's `content` default cannot change a page silently; all three name
`fill`. The measurement already handles `content` correctly — it prices `Σ seat(wᵢ)` from each lens's
own widest measured shape, so the fit verdict would be right even where the rendering reflows.

**What closing it needs, and the two ways out.** Either the active seat's weight stops varying, which
is what Strand did and what would make `content` safe here as it is there, or `width="content"` is
refused by the type until it does. Both are one line; neither is this PR's to choose, because the
15/700 active label is the visual contract's (ruling 62) and this handoff's scope is the re-sync.

## G55. Nothing in the harness proves that a file under `public/strand/icons/` serves from the deployment

**Severity: low. No icon is missing today and every surface that draws one renders correctly across
ruling 61's matrix. It is recorded because it is the reason a proof this session owed could not be
taken. Opened 21 September 2026 during handoff 29-A, filed under ruling 597. The number is assigned by
this entry (ruling 638).**

**What was owed and what was taken.** Handoff 29-A item 5 asks that the two new glyphs,
`panel-left-close.svg` and `chevron-left.svg`, hash identically to their copies under
`docs/strand/v1789885868097915/assets/icons/` **and that each resolves on the deployed preview**. The
hashes were taken and match (`d4e8abae…4bbd0` and `40cff7c3…4f758`), and both served 200 from
`wrangler pages dev dist` of the built worker. The deployed half was not taken and is reported unproven
rather than passing (ruling 228).

**Why it could not be taken, and why that is the gap rather than the session's problem.** The session
that would have fetched them had no egress to `*.pages.dev` — the proxy answered 403 to CONNECT — so it
fell to the harness, and the harness does not ask. `scripts/deployment-serves.sh` polls every path the
suites open plus ruling 184's asset contract: `/strand/logo.png`, `/favicon.png`,
`/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/manifest.webmanifest` and exactly one
Adinkra mark, `/strand/adinkra/mate-masie.svg`. **No path under `/strand/icons/` is in it**, and
`Icon.tsx` draws every glyph as a CSS mask, which paints nothing and raises nothing when the URL 404s.
So an icon that failed to ship would be invisible to CI and visible only to a person looking at the
page.

**What closing it needs.** One decision and one line. The decision is scope: ruling 184's block is an
asset _contract_, a named table, and forty-four icons are not that — so either the two or three glyphs
a rail collapse control will bind get named alongside the contract, or the check learns to walk
`public/strand/icons/` and poll what it finds. The second is the honest one and it is the one that
cannot rot, because a glyph added later is covered without anyone remembering. Either is a line in
`scripts/deployment-serves.sh`, which the `deploy`, `live` and both `matrix` jobs already run.

## G56. Three rows the build already derives by trigger, which is the shape ruling 1002's absolute now forbids

**Severity: low today, medium at the next change to any of the three. Opened 21 September 2026
during handoff 29-B, filed under ruling 597. The number is assigned by this entry (ruling 638). Not
fixed here: the handoff names item 3 as record and change none of them, and two of the three are
held in place by rulings that point the other way.**

**The rule, read forwards.** Ruling 1002 puts the absolute in `CLAUDE.md`: a derived row, one table
restating a fact whose truth lives in another, is written by its source's write path in the same
transaction that writes the source, and never by a trigger. Convene Pass 2 is built to it —
`public.event_registrations` is the truth, `private.rsvp_write` writes the `event_rsvp` edge beside
it, and `private.rsvp_edge_drift()` plus `tests/rsvp-drift.cjs` enforce the derivation rather than
asserting it. Read backwards, the rule is a question about the rows already here. Three answer to it.

**1. The accept derives four rows by trigger.** `private.on_connection_accepted()`
(`20260908233543_b4_connect_rls.sql:88`), on `on_connection_request_accepted_graph`, fires after an
update of `status` on `public.connection_requests` and inserts two `connect` rows into `public.edges`
and two rows into `public.member_connections`. The source's write path is
`public.respond_to_request` (`20260908233909_b4_connect_rpcs.sql:478`), which writes the status and
nothing else. Under 1002 those four inserts belong inside `respond_to_request`, and nothing measures
the agreement: there is no `connect_edge_drift`, so a request accepted by any path the trigger does
not see leaves the graph short an edge and nobody learns of it. This is the nearest kin to the RSVP
derivation and the one a drift function would be cheapest to add to.

**2. Second degree is maintained by trigger on a derived table.**
`private.second_degree_on_connect()` (`:114`), on `on_member_connection_second_degree`, fires after
an insert on `public.member_connections` — itself a row written by the trigger above — and writes
`public.second_degree`. So it is a derivation of a derivation, two triggers deep from the write path.
**This one is doctrine, not drift.** `CLAUDE.md`'s Connection Engine section carries ruling 111's
words: second degree is "served from a materialized set, refreshed incrementally on new connections
and fully overnight". 1002 and 111 point in different directions here, and which wins is a decision
rather than a repair. The nightly `private.refresh_second_degree()` is already the drift correction
1002 would otherwise ask for, which is the argument for leaving it exactly where it is.

**3. The follow mirror, the lead the handoff named, and it is real.**
`private.mirror_follow_edge()` (`:197`), on `on_edge_follow_mirror`, fires after an insert or an
update of `revoked_at` on `public.edges` and mirrors a live `follow` edge into
`public.member_follows`, deleting the mirror when the edge is revoked. The source's write path is
`public.set_follow` (`20260908233909_b4_connect_rpcs.sql:514`), which writes the edge and nothing
else. Under 1002 the mirror belongs inside `set_follow`, in the same transaction, with a drift
function beside it. Of the three this is the plainest breach: the mirror restates the edge and
nothing else, exactly as the `event_rsvp` edge restates the registration.

**Considered and excluded, with the reason, so the next reader does not re-derive them.**

- `private.notify_connection_accepted()` (`20260908142054_b3_rulings_141_142_144.sql:269`), on
  `on_connection_request_accepted`, inserts a `public.notifications` row on accept. A notification is
  a consequence with a life of its own — it is read, it is dismissed — not a second statement of the
  source's fact, and no drift function could compare the two once that life begins. Ruling 144 is
  what puts it there.
- `private.on_member_blocked()` (`20260909051055_r198_block_semantics.sql:33`) revokes edges and
  deletes adjacency and mirror rows on a block. It removes derived rows rather than writing them, and
  `CLAUDE.md` already names "the ruling 198 trigger carries every consequence". Worth recording all
  the same: `public.member_blocks` has **no write path function at all** — ruling 216's control
  inserts the row directly under RLS through `src/lib/blocks.ts` — so there is no write path for
  those consequences to move into. It is the one place in the tree where 1002's absolute has no
  landing site, and closing it would mean giving block a write path first.
- `private.handle_new_user()` (`20260908072031_b3_profile_rpcs.sql:42`) derives the `public.members`
  row from `auth.users`. The source is written by GoTrue and we own no write path on it, so a trigger
  is the only mechanism there is.
- `private.stance_declared()` (`20260911052909_b5_stance_onboarding.sql:111`) is a BEFORE trigger
  setting `stance_declared_at` on the row being written. Same row, same statement; no second table.
- `private.edges_purge_member()` (`20260908233543_b4_connect_rls.sql:219`) deletes inbound edges on
  member delete, standing in for the foreign key `edges.to_id` cannot carry because it is
  polymorphic. Cleanup, not derivation.
- `private.enforce_vocab_cap()` (the seven `member_*_cap` triggers) and `on_member_block_rate_limit`
  (`20260912090557_fix_pr_02_rulings_408_444.sql:143`) raise or refuse. They write no row at all.

**What closing it needs.** Item 3 for the follow mirror: move the `member_follows` write into
`set_follow` and add a drift function and an arm in `rsvp-drift.cjs`'s shape. Item 1 the same, inside
`respond_to_request`, and it is the larger of the two because four rows across two tables move at
once. Item 2 needs a ruling that says which of 1002 and 111 governs a set that is already rebuilt
nightly, and that is the founder's, not a PR's.

**Ruling 1017 (Session 30) answers item 2's question.** 111 decides what `second_degree` is, a
materialized set refreshed incrementally on new connections and fully overnight, and 1002 decides how
it is written: by the source's write path, in the same transaction, never by a trigger. The two do not
compete. So the incremental refresh moves into `public.respond_to_request` when that path is next
touched, the other two trigger rows (items 1 and 3) move the same way at the same time, and nothing
changes now.

## G57. The RSVP drift arm cannot state the denominator its own PASS line is specified to carry

**Severity: low. The agreement is measured whole either way; what is missing is the number standing
behind it. Opened 21 September 2026 during handoff 29-B, filed under ruling 597. The number is
assigned by this entry (ruling 638). Not fixed in 29-B: the fix belongs in a migration file, which
under rulings 466 and 225 has to come from the file's author. Corrected and closed by ruling 1022 in
handoff 30-A: see the closing paragraph, which replaces the grant this entry first proposed.**

**The mechanism, read in the tree.** Handoff 29-B item 2 specifies the arm's passing outcome as "a
`PASS` that states how many going member registrations it measured", and in the same paragraph
specifies the role it connects as: "the second file grants that role `USAGE` on `private` and
`EXECUTE` on the function and nothing else". Both are true of
`20260921120100_p2_event_registrations.sql` as written — lines 283 and 284 make exactly those two
grants — and together they do not admit the count. `private.rsvp_edge_drift()` returns disagreements
only, never a total, and `live_arms` holds no `select` on `public.event_registrations`: the file
revokes all from `anon` and `authenticated`, grants `select` to `authenticated` and `all` to
`service_role`, and names `live_arms` nowhere on the table. Switching into `authenticated` does not
reach it either, because `live_arms` holds that role with `inherit false` and `auth.uid()` is null
under it, so `event_registrations_member_select` admits no row.

**What the arm does instead.** `tests/rsvp-drift.cjs` reads the count in its own statement, outside
the drift read, and prints the number when the connecting role can see it and the reason when it
cannot. The PASS line therefore states the agreement — every going member registration carries one
live `event_rsvp` edge and every live edge carries a going registration, which
`private.rsvp_edge_drift()` measures whole because it is SECURITY DEFINER — and names this gap where
the denominator would be. The moment a later migration grants the select, the number appears with no
edit to the arm.

**What closing it needed, corrected (handoff 30-A).** This entry first proposed a column grant,
`grant select (event_id, member_id, status) on table public.event_registrations to live_arms;`, as the
narrowest fix. It would have read zero. `live_arms` does not bypass row security (ruling 382), and
every policy on `public.event_registrations` is to `authenticated` or `service_role`, so under that
grant the count succeeds and returns 0 whatever the table holds; and a policy admitting `live_arms`
would show it real members' rows, which is what 382 exists to refuse. Ruling 1022 closes it the other
way: `private.rsvp_going_member_count()` in `20260921140100_p2_event_parties.sql`, SECURITY DEFINER,
returning the number of going member registrations and nothing else, with EXECUTE granted to
`service_role` and `live_arms`. `tests/rsvp-drift.cjs` calls it in place of the direct count and names
its two failures apart: `42883`, the function not on the project, is the state between commit and
apply and the PASS says the count function is not applied yet; `42501`, the function present and not
executable by this role, is drift of the kind the arm already calls a FAIL for `rsvp_edge_drift()`,
because the same file grants it. After the apply the PASS line states the number, zero included.

**Closed** on run 294 (35681550980), the enforcing run on `3d1e430`, the head that carries the
regenerated types (handoff 30-A item 7) and the first on which the function is both committed and
applied. Green on all four jobs; its `live` job printed 0 going member registrations from
`private.rsvp_going_member_count()`. The number could not be written here by that same head, because
a run number exists only once the run starts and ruling 556 commits nothing to the branch after the
enforcing run starts; PR #55 reported it, and handoff 30-B wrote it into this paragraph.

## G58. Ruling 225's ordering turns the drift arm red on the branch that obeys it, and the doctrine records only the other direction

**Severity: low in effect, medium in cost to the next reader — the whole `live` job reads red for the
length of the window, so a real failure arriving beside it is easy to miss. Opened 21 September 2026
during handoff 29-B, filed under ruling 597. The number is assigned by this entry (ruling 638). Not
fixed here: the two ways to clear it are Chat's apply and a change to the arm, and neither belongs in
this PR.**

**The mechanism, measured rather than reasoned.** Run 285 on `claude/handoff-29-b-dna-web-7k9lf7`,
head `3a14918`, job `live`, step 8:

```
FAIL 20260921120000 r1004_1010_audience_helpers: in the tree as 20260921120000_r1004_1010_audience_helpers.sql, not recorded on the project
FAIL 20260921120100 p2_event_registrations: in the tree as 20260921120100_p2_event_registrations.sql, not recorded on the project
```

That is `tests/migration-drift.cjs`'s second loop — the one that walks the repo map and fails any
version the project did not return — and it fires on exactly the state ruling 225 mandates. 225 says
a migration is committed before the state it describes is applied. From the commit until Chat's
apply, the branch carries a file the project has no row for, and the arm calls that drift, because
from inside the arm the two directions are indistinguishable: it cannot tell a migration waiting to
be applied from one that was applied and then lost its row.

**`CLAUDE.md` analyses the mirror case only.** Its paragraph on the paste window works through
`recorded on the project, no file in the tree` in detail — that the FAIL is latent on `main` because
no workflow here carries a `schedule` and the merge is itself the triggering push, that **the
exposure is every other branch**, and that the remedy is to paste immediately before merging and cut
nothing in between. Every word of that is about the direction that opens _after_ the apply. The
direction that opens _before_ it, on the PR branch itself, is not written down anywhere, and it is
the longer of the two whenever a handoff puts a relay between the commit and the apply, as 29-B does:
PR #52 had to merge, then the founder relays, then Chat applies.

**Why it matters beyond the noise.** Step 8 failing fails the whole `live` job, and the job carries
the ruling 218 arms, the migration drift and now the RSVP drift. A reader seeing `live` red on a
migration PR learns nothing about which of those is speaking without opening the log. On this run
step 7 read `120/120` and step 9 read its intended UNPROVEN, so the red was step 8 alone — but that
had to be read out of the log rather than off the job.

**What closing it needs, and the two shapes it could take.** Either a fourth outcome in the arm —
a version in the tree with no row on the project, and no row for any _later_ version either, is
`PENDING` rather than `FAIL`, which distinguishes a migration waiting to be applied from one whose
row was lost, since a lost row would sit behind versions that did apply — or a line in `CLAUDE.md`
stating plainly that a migration PR's own `live` job is red between commit and apply, so the next
reader stops at the log instead of at the diff. The first is the better guardrail and the one that
needs a ruling, because `PENDING` is a hole in a gate and the argument for it is that 225 puts the
hole there deliberately. The second is a sentence and could ride any PR.

## G59. First sighting: the vocabulary arm's 5 s attach wait timed out once on WebKit, and did not reproduce

**Severity: low. One sighting, not reproduced, on an arm whose subject is a deliberately empty
control. Opened 21 September 2026 during handoff 29-B, filed under ruling 597. The number is assigned
by this entry (ruling 638). Not fixed here: one sighting is not a pattern, and `tests/matrix.cjs`
says plainly that a class is added to the ruling 357 list "when a sighting is understood, never to
make a tail read cleaner".**

**What failed.** Run 286 attempt 1, `matrix (webkit)`, head `1e63c04`, 5087 of 5089 checks passing:

```
FAIL [no crash] webkit-390x844-dark-vocab-failed: flow completed TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('section[role="dialog"][aria-label="Compose"]').locator('[role="radiogroup"][aria-label="Instrument"]')

FAIL [no crash] ruling 292 | webkit-390x844-dark-vocab-failed: emitted every check it declares UNPROVEN (228): emitted 3 of 4; the 1 checks behind the failure never ran
```

The second is ruling 292's consequence arm reporting the check the timeout swallowed. One finding.

**The arm, read in the tree.** `tests/vocabulary.cjs:92` to `98`, the `vocab-failed` variant of
rulings 193 and 194, where the `vocabularies()` read is forced to fail so a flow can check the
controls behave. It opens the composer, waits up to 10 s for the Compose dialog, clicks the "Post a
Need (Contribute)" radio, then waits for the Instrument radiogroup with
`waitFor({ state: "attached", timeout: 5000 })`. The wait is for attachment rather than visibility on
purpose — the file's own comment says "a radiogroup with no options has no box, which is the point",
because under the forced failure the group renders empty. So the 5 s is the budget for the composer
to mount the group after the failing vocabulary request settles.

**Why it reads as a flake rather than a defect.** Four readings, none of them the arm's own:

- `matrix (chromium)` passed on the **same head**, `1e63c04`.
- `matrix (webkit)` was green on `main` at `1a71ee8`.
- The re-run of the same job, same head, same deployment, passed.
- Within the failing job, compact was 77 of 78 clean and medium and expanded were 55 of 55 and 76 of 76. Ruling 554's tell: a real defect in that radiogroup would fail the arm at every viewport, in
  both themes and on both engines.

**Why it landed `unclassified`, correctly.** Ruling 357's class matches the WebKit wording for an
aborted fetch on the mocked REST origin, `… due to access control checks`, against a failure's page
errors. This failure's detail is a Playwright locator timeout, so `ABORTED_MOCK_FETCH` did not match
and should not have. The tail said `0 behind a web-process crash (G5) | 0 an aborted fetch on mocked
REST | 2 unclassified`, which is the honest reading.

**What closing it needs.** A second sighting, which turns one timeout into a pattern worth acting on;
or changing the wait to key on the settled state the composer reaches after the forced failure rather
than on a fixed 5 s. The second is **G34's shape exactly** — a fixed wait standing in for the thing
actually being waited on — and if G34 is ever closed by teaching `matrix.cjs` to wait on states
rather than clocks, this wait belongs in the same pass.

## G60. Brief 7 draws no accepted-role state, and Brief 10's invitation sheet promises one

**Severity: moderate. Opened 21 September 2026 during handoff 30-A, filed under ruling 597. The
number is assigned by this entry (ruling 638). Not fixed here: the line belongs to Brief 10's build
handoff and the state belongs to a Brief 7 revision, and neither is this PR's.**

**The disagreement, read across the briefs.** Brief 10 section 6 assigns the accepted role on a
profile to Brief 7, and Brief 10's SPEC puts `Your profile lists the role once you accept (Brief 7).`
in the invitation sheet. Brief 7 Revision 1 defers Connect to Convene and draws no such state: there
is no profile element for a role a member has accepted on an event, on any tier, in any theme.

**What the tree holds.** `public.event_parties` (`20260921140100_p2_event_parties.sql`) stores the
acceptance under ruling 1018: one row per member per role per event, with a status of `invited`,
`accepted` or `declined`, and `event_parties_named_member_select` lets the member read their own rows
in every status. No surface reads it on a profile. `profile_view` does not join it, and nothing in
Brief 7's extraction has a place for it to land. So when Brief 10 ships, the sentence in its
invitation sheet describes a state the profile does not have, and a member who accepts on that promise
opens their profile and finds nothing.

**What closing it needs.** Two decisions, in two places. Brief 10's build handoff decides the line:
either the sentence comes out of the sheet, or it is rewritten to promise only what the event page
shows, which is the accepted name and image on every projection of that event (678). A Brief 7
revision draws the state: where an accepted role sits on the profile, what it reads, and whether it
carries the event's link. The second is a Claude Design pass under ruling 62 and cannot be
reconstructed from the SPEC's one sentence (ruling 90). Until the revision lands, nothing reads
`event_parties` on a profile and the sheet line is the only thing that says otherwise.

## G61. Older tables carry grants the newer files revoke, because Supabase's default privileges hand them out and only six files take them back

**Severity: low, an invite-boundary gate under prototype posture (ruling 140). Opened 21 September
2026 during handoff 30-A, filed under ruling 597. The number is assigned by this entry (ruling 638).
Not fixed here: a fix is a new migration under ruling 466, from Chat.**

**The mechanism, read live on the canonical project on 21 September 2026.** `pg_default_acl` carries
one row for tables in `public` owned by `postgres`: `anon=Dxtm`, `authenticated=Dxtm` and
`service_role=Dxtm`, which is TRUNCATE, REFERENCES, TRIGGER and MAINTAIN handed to every table at
creation before any file says a word about it. No migration in the tree alters default privileges.
Six files run `revoke all on table ... from anon, authenticated` before granting what they mean
(`20260921120100` and `20260921140100` among them), and those tables carry only what the file
grants; every other file granted on top of the default and left the four in place. Row security does
not govern TRUNCATE, and neither TRUNCATE, REFERENCES, TRIGGER nor MAINTAIN is reachable through
PostgREST today, which is why the severity is low: the grants are real and nothing can use them yet.

**Every table in `public` that carries them, from `information_schema.role_table_grants`.** The view
does not report MAINTAIN, so each row below reads as TRUNCATE, REFERENCES, TRIGGER and, by the default
ACL, MAINTAIN. Only `public.event_registrations` carries none of them: `authenticated` holds SELECT
alone.

For `authenticated`, every table but `event_registrations`: `attestations`, `connection_requests`,
`corridors`, `countries`, `dismissed_suggestions`, `edges`, `event_delivery`, `event_host_settings`,
`events`, `feed`, `focus_areas`, `industries`, `intents`, `interests`, `languages`, `media`,
`member_about`, `member_blocks`, `member_connections`, `member_corridors`, `member_embeddings`,
`member_focus_areas`, `member_follows`, `member_homes`, `member_industries`, `member_intent`,
`member_intents`, `member_interests`, `member_languages`, `member_links`, `member_origin`,
`member_regional_expertise`, `member_skills`, `member_stance_details`, `member_stances`,
`member_visibility`, `members`, `notifications`, `opportunities`, `post_dia`, `post_drafts`,
`post_links`, `post_media`, `post_reactions`, `post_saves`, `posts`, `regional_expertise`,
`second_degree`, `skills`, `space_roles`, `spaces`, `stories`, `world_countries`.

For `anon`: `attestations`, `countries`, `event_delivery`, `event_host_settings`, `focus_areas`,
`industries`, `intents`, `interests`, `languages`, `media`, `member_about`, `member_focus_areas`,
`member_follows`, `member_homes`, `member_industries`, `member_intent`, `member_intents`,
`member_interests`, `member_languages`, `member_links`, `member_origin`,
`member_regional_expertise`, `member_skills`, `member_stance_details`, `member_visibility`,
`members`, `regional_expertise`, `skills`, `world_countries`. The tables the handoff named from its
own read, `member_stances`, `focus_areas`, `notifications` and `event_delivery`, are four of these;
`20260907010622_b2_notifications.sql:49` revoked from `anon` only, which is why `notifications` is
absent from the `anon` list and present in the `authenticated` one.

**The second write path, in the same read.** `authenticated` holds INSERT, UPDATE and DELETE on
`public.event_delivery`, admitted by `event_delivery_host_all`
(`20260916120100_p1_convene_place_columns.sql:116`), beside `publish_post`'s write of the same rows.
`public.event_host_settings` carries the same shape under `event_host_settings_host_all` (`:121`).
Under the one-write-path absolute those are a second door each, held shut today only by the host
predicate in the policy.

**What closing it needs.** One migration from Chat, under 466: `revoke truncate, references, trigger,
maintain on all tables in schema public from anon, authenticated`, and `alter default privileges for
role postgres in schema public revoke truncate, references, trigger, maintain on tables from anon,
authenticated` so the next table starts clean without its file remembering to say so; then a
decision, not a revoke, on `event_delivery` and `event_host_settings`, because dropping the direct
grants there removes a path a Convene surface may already use. A harness arm that reads
`role_table_grants` and fails on any of the four for `anon` or `authenticated` would keep it closed,
in `tests/migration-drift.cjs`'s shape.

## G62. Strand's `Segment.tsx` still names `SegmentBlock` in its own header, one line the rename under 1007 was told not to touch

**Severity: cosmetic. Opened 22 September 2026 during handoff 30-B, filed under ruling 597. The
number is assigned by this entry (ruling 638). Not fixed here: the handoff names the file as not
edited, and its two Done Means disagree on this one line.**

Ruling 1007 renamed `src/components/strand/SegmentBlock.tsx` to `StanceBlock.tsx` and its five
identifiers with it. `src/components/strand/Segment.tsx:3`, the header of Strand's segmented
control, reads "Not SegmentBlock: that is the Profile's stance block", written when the two parts
shared a prefix so a reader would not confuse them. After the rename that line names an export
that no longer exists. Handoff 30-B's Done Means 1 asks the identifier scan over `src` and `tests`
to return nothing, and its Done Means 2 asks `git diff` to show no change to `Segment.tsx`; on this
line they cannot both hold, and the handoff's own body says the file is not renamed and not
edited, so the build left it and the scan returns this one comment line. Closing it is a one-line
edit to that comment, "Not StanceBlock", in a change whose brief names Strand's `Segment` as
editable.

## G63. The "Who sees what" rail row still falls back to the literal `Stance` when `stance_label` is absent

**Closed 22 September 2026 under ruling 1031 (handoff 30-C item 12): the row keeps the section's
name. It is navigation, not a stance label read out of a row, so it is not a ruling 194 case and
no change is made. Opened 22 September 2026 during handoff 30-B, filed under ruling 597; severity
was low.**

Handoff 30-B removed the stance section title's literal fallback under ruling 194: the title reads
`public.member_stances` through `vocabularies()` and renders no text when that read fails. The
owner's "Who sees what" rail in `src/components/dna/ProfileSurface.tsx` (around line 713) labels
its stance row `profile.member.stance_label ?? TITLES.stance`, where `TITLES.stance` is the literal
`"Stance"`. Two readings are open. As a section name it is navigation, the row lists every section
by its name and 397 fixed that name as Stance, so a literal is what 999 permits. As a stance label
it is the same shape 194 just removed from the title, one rail over, reading the saved
`stance_label` rather than the vocabulary and a literal when that is null. The row shows the saved
label when a stance is set and the word Stance only for an owner with no stance, so the literal
never stands in for a failed vocabulary read the way the title's did. Whether the row should read
the vocabulary and render empty like the title, or is a section name and stays, is a ruling to ask
for rather than a fix to make; no test asserts either behaviour today.

## G64. The stance section renders an empty `h2` when the vocabulary fails

**Severity: low. Opened 22 September 2026 during handoff 30-C, filed under ruling 597. The number
is assigned by this entry (ruling 638). Not fixed here: the handoff names it as a register entry,
and the stance section is Brief 3's surface, one handoff over.**

Handoff 30-B (#56) made the stance section's title read `public.member_stances` through
`vocabularies()` under ruling 194 and render no text when that read fails: the title is
`stanceLabel ?? ""` in `src/components/dna/ProfileSurface.tsx`. The heading element stays in the
tree with nothing in it, so a failed vocabulary read leaves an empty `h2` on the profile, which
accessibility checkers flag as an empty heading and a screen reader announces as a heading with
no name. The fix is to render no heading element at all when the label is absent, and to assert
that in `tests/vocabulary.cjs`'s failed pass beside the existing check that no literal stands in.

## G65. Guest emails have no stated lawful basis, and the Terms and Privacy Policy are not in this tree

**Severity: invite-boundary gate. Opened 22 September 2026 during handoff 30-D, filed under ruling 597. The number is assigned by this entry (ruling 638). Prototype posture (ruling 140): the
canonical project holds no real member data, so this blocks no merge and closes before the first
real member invite.**

Ruling 532 requires the lawful basis for holding a guest's email address to be stated in the Terms
and the Privacy Policy, and puts guest emails under ruling 479's erasure work. Neither document is
in this tree, so nothing here can cite them and no surface links to the paragraph that would
govern the address a guest types on `/e/{slug}`. The address is held in `event_registrations`
`guest_email` on a going or not-going row, and as a hash only in `guest_link_requests` for a day.
What closes this: the two documents, the paragraph in each, and the erasure path under 479 that
removes a guest's rows on request.

## G66. Nothing sends a reminder to anyone, so the guest line holds the reminder out

**Severity: low. Opened 22 September 2026 during handoff 30-D, filed under ruling 597. The number
is assigned by this entry (ruling 638).**

B10-SPEC section 4's Guest sheet reads `One email address, so the door and the reminder can reach
you.` The door reaches the guest: the going confirmation carries it (1035). The reminder does not
exist. Ruling 571 names reminders and nothing in this tree sends one to a guest or a member; there
is no scheduler, no reminder text and no row that says one was sent. Under grounded-or-empty the
field line in `src/components/dna/GuestSheet.tsx` reads `One email address, so the door can reach
you. Nothing else is asked.` until something sends a reminder, and the SPEC's line returns with it.
What closes this: a scheduled send (a Supabase cron or a dispatch-only workflow), its text through
`_shared/mail.ts`, and a record of the send.

## G67. Brief 11 is titled "Convene Pass 4", and ruling 622's fourth pass is pay and admit, which has no brief

**Severity: low. Opened 22 September 2026 during handoff 30-D, filed under ruling 597. The number
is assigned by this entry (ruling 638).**

Two things carry the name. Brief 11 is titled "Convene Pass 4". Ruling 622's fourth pass of
Convene is pay and admit: paid events, tickets and the door for them, which is the work this
handoff holds out of the guest path (`This event takes tickets, and tickets are not open yet.`)
and which has no brief. A reader who follows "Pass 4" from the guest path's refusal lands on a
brief about something else. What closes this: a ruling that retitles one of the two, and the
brief for pay and admit when it is written.

## G68. A link request is recorded before its email is sent, so a failed send is throttled into a silent "Check your email" for ten minutes

**Severity: low. Opened 22 September 2026 during handoff 30-D, filed under ruling 597. The number
is assigned by this entry (ruling 638). Not fixed here: the throttle is `20260922120000`'s and an
applied migration is never amended (466).**

`public.guest_link_request` inserts the `guest_link_requests` row and answers `send: true` before
the guest-rsvp Edge Function has asked Resend for anything. When Resend refuses, the function
answers 502 and the sheet shows the failure under the field, which is right; but the row is already
recorded, so the guest's retry inside ten minutes is answered `send: false` and the function says
202, which the sheet renders as `Check your email` for a mail that never left. What closes this: a
new migration that records the ask only once the send succeeded (a second function the Edge
Function calls after Resend answers), or that lets the function delete its own row on a failed
send, with `tests/live-db.cjs`'s guest arm extended to the failure case.

## G69. The canonical project carried Handoff 31-A's schema before its migrations reached `main`, and the types regeneration returned it

**Severity: low. Opened 22 September 2026 during handoff 30-D item 7, filed under ruling 597. The
number is assigned by this entry (ruling 638). Amended the same day: first written as unrecorded
schema, which was true at the regeneration and not an hour later. Amended 23 September 2026:
#59 merged `main` into Handoff 31-A's branch and regenerated `src/lib/database.types.ts` on the
merged head, and that file now carries these objects, recorded under `20260922150000
p2_discovery_schema` and `20260922150100 p2_discovery_projection`, which are in the tree with it.
The catalog-comparing drift arm below stays open.**

The types regeneration taken after `20260922120000` was applied returned, beside the migration's
five additions, objects that exist on the project and nowhere in `supabase/migrations` on this
branch: the tables `convene_families`, `convene_lenses`, `convene_picks`, `discovery_dismissals`,
`editors` and `member_subscriptions`; the functions `convene_discovery`, `dismiss_discovery_item`
and `set_subscription`; and the column `events.family` with a foreign key to `convene_families`.
At the regeneration `tests/migration-drift.cjs` read PASS, so no `schema_migrations` row named
them; by the enforcing run on `3805792` the same arm read FAIL for `20260922150000
p2_discovery_schema` and `20260922150100 p2_discovery_projection`, recorded on the project with no
file in this tree. They are Handoff 31-A's (#59), applied by Chat ahead of that PR's merge: the
regeneration landed inside the moment between the objects' creation and their rows' recording,
and this branch then sat in G58's second half. They are left out of `src/lib/database.types.ts`
(its header says so), because a type here is a licence for a surface to reach what this tree does
not define; #59's own regeneration carries them. What remains open: a drift arm that compares the
project's catalog against the tree and not only its `schema_migrations` rows, so an object that
reaches the project ahead of its row reads as drift rather than passing unseen for however long
the recording takes.

## G70. `live_arms` may mint a guest row on any published event, until the guest arms sit behind a fixture policy

**Severity: low, invite-boundary gate. Opened 22 September 2026 during handoff 30-D, filed under
ruling 597 from the finding `20260922160000_r382_live_arms_guest_functions.sql` names in its own
header. The number is assigned by this entry (ruling 638). Prototype posture (ruling 140): the
canonical project holds no real member data, so this blocks no merge.**

`20260922160000` grants `live_arms` execute on `public.guest_link_request(text, text)` and
`public.guest_rsvp(uuid, text, text)`, exactly the two signatures and nothing wider, so the two
live-db guest arms can run instead of reading UNPROVEN (228). Both functions are SECURITY DEFINER
and gate on the event's public page and on the throttle, not on the caller, so a holder of
`LIVE_DB_URL`, CI's one secret for this role (382), may write a guest row on any published event
whose post is to everyone. The arms roll their rows back inside their own transaction. What closes
this: before the first real member invite, a fixture policy that admits the two ruling 218 test
accounts' events and no other, the shape the attestations arms already take under ruling 435, with
the grant narrowed to run through it.

## G71. The Home facet's rungs are not drawn and not built

**Severity: medium, invite-boundary gate (ruling 140). Opened 22 September 2026 during handoff 31-A,
filed under ruling 597. The number is assigned by this entry (ruling 638).**

The Home facet's rungs (rulings 927, 928) are not drawn in Brief 9's prototype and not built; the
facet ships one option per home under 1042. `public.convene_discovery`'s `p_home` narrows to
in-person and hybrid events whose physical delivery city matches the chosen home's city, and
nothing wider. Owed: a Design correction drawing the rungs on FacetRail's home axis, and the
projection's rung predicate against `member_homes.region` and the event's place, in a new migration.

## G72. FacetRail has no control on its own Browse line, so ruling 944's collapse control is not rendered

**Severity: low. Opened 23 September 2026 during handoff 31-B item 4, filed under ruling 597 and
reported under 732 rather than worked around at the page. The number is assigned by this entry
(ruling 638).**

Ruling 944 puts an icon control with the accessible name `Collapse browse` and no visible word on the
rail's `Browse` line, collapsing the rail to its 64 icon strip while the lanes take the width. Strand's
`FacetRail` (`src/components/strand/FacetRail.tsx`, compile `v1789885868097915`) renders its
expanded heading as a bare `h2` with no action slot, so there is nowhere on that line for a caller's
control; placing one over the heading from Discovery is the page-level workaround 732 forbids. The
shell's `lanes` mode already carries the collapsed width (`rail: "collapsed"`, the 64 column), which
the pane uses under 688, so the control lands as one prop once Strand gives the heading a slot. The
extraction's own note also stands: the icon set had no collapse glyph at the time; `panel-left-close`
is in `public/strand/icons/` now. Owed: a Strand correction adding an action to FacetRail's heading.

## G73. DiaLine's text is a string, so the first section's sentence cannot link the host's name

**Severity: low. Opened 23 September 2026 during handoff 31-B item 7, filed under ruling 597 and
reported under 732. The number is assigned by this entry (ruling 638).**

Ruling 1046 has `{name}` in `You follow no host yet. {name} hosts {title} in {city}; follow them and
their events start here.` link to `/m/{handle}`. Strand's `DiaLine` takes `text?: string` and renders
it in a plain span, so the sentence renders in full as words with the name unlinked. Owed: a Strand
correction letting DiaLine carry a link, after which Discovery passes it.

**Closed 23 September 2026 by handoff 31-D's PR, under ruling 1053.** 1053 rules the sentence plain
text: the host's name is not linked, so DiaLine's string is the whole answer and no Strand correction
is owed. `DiscoverySurface` already rendered it that way; the comment names 1053 and the below density
arm now asserts that the sentence carries no link.

## G74. On Discovery a card's React and Save render and do nothing

**Severity: medium. Opened 23 September 2026 during handoff 31-B item 3, filed under ruling 597. The
number is assigned by this entry (ruling 638).**

Handoff 31-B's surface reads only through `loadDiscovery` and writes only through
`dismissDiscoveryItem`, and the card is Pass 1's at rest byte for byte (660), so the card's four
actions render. Share needs no write and is wired; `Ask the host` and the card's own tap open the
event page. React and Save have no write path on this surface and are inert. Owed: a ruling on
whether Discovery takes the Feed's two existence toggles (`setSaved`, `setReacted` and the `loadMarks`
read beside them) as a second write path, or the card at rest on Discovery hides them.

## G75. A FacetRail option never wraps, and the longest category family is wider than the medium rail

**Severity: low. Opened 23 September 2026 during handoff 31-B item 4, filed under ruling 597 and
reported under 732. The number is assigned by this entry (ruling 638).**

SPEC section 0 sets the medium rail at 240. FacetRail's option chips are `white-space: nowrap`, and
the vocabulary's `Cultural, heritage and religious` chip is wider than the 198 the nav's padding
leaves at that width, so it runs into the nav's right padding (measured at 820: the nav's content
reaches 258 against its 240 box). It stays inside the column, so nothing pans. At expanded's 260 it
fits. The prototype drew stand-in family labels (Revision 1, conflict 3), which is why its frames
never showed it. Owed: a Strand correction letting an option wrap, or a Design ruling on the rail's
width.

## G76. FacetRail has no per-axis single select, so When and Home toggle rather than choose

**Severity: low. Opened 23 September 2026 during handoff 31-B item 9, filed under ruling 597 and
reported under 732. The number is assigned by this entry (ruling 638).**

Handoff 31-B makes When and Home single-select inside a multi-select rail. FacetRail's `single` mode
is one selection across the whole rail, so the two axes render as the rail's toggle buttons
(`aria-pressed`) and Discovery keeps only the newest choice in each when it writes the query. The
behaviour is single-select; the semantics a screen reader hears are a toggle group rather than a
radio group. Owed: a Strand correction for a per-axis `select="single"`.

## G77. Below expanded the event page's Back row names Feed when the member came from Discovery

**Severity: low. Opened 23 September 2026 during handoff 31-B item 12, filed under ruling 597. The
number is assigned by this entry (ruling 638).**

B9-SPEC section 0 draws the compact route with `the Back row naming Discovery`. Handoff 31-B item 12
keeps `/convene/events/{id}` below expanded as 1023's own page, unchanged, and gives `EventSurface`
one prop only (the pane's), so the Back row still reads `Feed` and returns to the Feed whatever the
member came from. Owed: a ruling on the Back row's origin below expanded, and then the route state
that carries it.

**Closed 23 September 2026 by `d0c1f52`, handoff 31-D, under ruling 1065.** Discovery sets an origin
record in router history state when it opens an event (`src/lib/origin.ts`), and the page's Back row
reads it: its label is the origin's, and it goes back when the member arrived from that origin in this
history, else navigates to the origin's route and search. With no origin, a cold arrival or a document
load, the row names Discovery and goes to `/convene`, because the page lives under Discovery's route
(1047). The not-found state's button follows the same rule and reads `Back to {label}`.

## G78. The Pane's close control floats over the top of its content

**Severity: low. Opened 23 September 2026 during handoff 31-B item 12, filed under ruling 597 and
reported under 732. The number is assigned by this entry (ruling 638).**

Strand's `Pane` places its `closeLabel` control absolutely at the pane's top right with no space
reserved for it (700). Brief 10's page starts with its invitation notice when the member has one, and
at 1280 the close control sits over that notice's top right corner. Nothing is unreachable. Owed: a
Strand correction reserving the close control's row, or a Design call on the page's first block
inside a pane.

**Closed 23 September 2026 by handoff 31-D's PR, on the page and not in Strand's Pane.** With
`inPane`, `EventSurface` raises its top padding to `calc(var(--space-2) + var(--target-primary) +
var(--space-2))`, the close control's inset, its height and the same gap again, so the page's first
block starts below the control. `Pane.tsx` is unchanged (732, 950). The Discovery pane arm measures
the first block's top against the control's bottom at every expanded width. Design brief 31-E yields
to this fix; if Strand later gives the Pane a reserved close row, the page's padding comes out with
that port.

## G79. At expanded the lanes lose their horizontal position when the pane opens and closes

**Severity: low. Opened 23 September 2026 during handoff 31-D item 6, filed under ruling 597. The
number is assigned by this entry (ruling 638).**

`DiscoverySurface` returns a different element tree with the pane open (the lanes inside Strand's
`Pane` as its list) from the one it returns with the pane closed (the lanes in the surface's own
column). React rebuilds the lanes on each switch, so every lane's horizontal scroll resets to its
first card when the pane opens and again when it closes. The column keeps its place, because the
shell's layout key is the lens and does not change (688), and the lens and the facets survive (1063).
Below expanded nothing is rebuilt in place: the event page is its own route and Back restores the
column and each lane through the router's element restoration (1065). Owed: Strand's Pane open state
under 1064 (Design brief 31-E), which gives the list one place in the tree whether the pane is open or
not.

## G80. place-resolve's ordering arm reads Mapbox's live answer, so an empty side fails it

**Severity: low. Opened 23 September 2026 during handoff 31-D, on run 319 (35850287842), filed under
ruling 597. The number is assigned by this entry (ruling 638).**

`tests/live-checks.cjs` proves 633 by asking `place-resolve` for `Front Room` in the United States
with two proximities, Portland and Los Angeles, and passing when the first suggestions differ. It
skips only when both calls answer `none`. On run 319 Portland answered a place and Los Angeles
answered with no first suggestion, so the arm failed with `los angeles` empty, on a head whose diff
touches neither the function nor the arm; `main`'s run 318 on `1463b5c` passed the same check. The
arm is asserting on Mapbox Search Box's live answer for one name near one city, which is not the
function's behaviour to own. Owed: the arm reads an empty side as unproven with its reason (228),
the way it already reads two `none` answers, or proves 633 on a query whose answers are stable.
