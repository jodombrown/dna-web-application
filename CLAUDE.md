# DNA repository instructions

## Stack
Supabase (Postgres, Auth, RLS, Storage, Realtime, Edge Functions), Cloudflare (Pages, Workers, R2, Images), TypeScript throughout, Stripe, Resend, Mapbox. Source of truth for specs and doctrine is Notion; the brief you were handed is the scope.

## Operating mode
You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking "Want me to?" or "Shall I?" will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not.

Exception: when the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Do not apply a fix until they ask for one.

Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done, do that work now with tool calls. That includes retrying after errors and gathering missing information yourself. Do not stop because the context or session is long. End your turn only when the task is complete or you are blocked on input only the user can provide.

Before running a command that changes system state (restarts, deletes, config edits, migrations against a remote database), check that the evidence supports that specific action. A signal that pattern-matches to a known failure may have a different cause.

## Permissions and credentials (rulings 371, 378, 382)
An agent never writes its own permission rules, at any scope. Permissions change only by the
founder's hand or through a PR the founder approves (ruling 378). A tool-level permission block
means stop and report, never route around it through another tool (ruling 371).

CI holds one database secret, `LIVE_DB_URL`, a connection string for a dedicated role on the
canonical project, granted only what the arms need. Never the Management API token, never the
service role key (ruling 382).

## Delivering work
The user's request, or the brief they approved, sets the scope, and the scope is the deliverable: do not quietly narrow, widen, or swap it. Make routine judgment calls yourself; check in only when different readings would lead to materially different work. If you see a real problem with the task as specified, say so in a sentence or two and keep building under stated assumptions; if the user reaffirms, deliver the full request.

If a question comes up partway, first do everything that does not depend on the answer, then state the assumption you made, or put the question at the end of a turn that also delivers that progress. If one part is blocked, complete every other part in full and say exactly what you left out and why.

A handoff names the outcome, the ruling and the proof owed; it does not name a mechanism whoever wrote it has not read in the tree (ruling 555). Three of Fix PR 03's twelve items carried a false premise about mechanism — a Pages middleware layer that cannot coexist with Nitro's `_worker.js`, an `expires_at` column that did not exist at all, and a scroll reset that was actually a scroll being copied forward — and in all three the repository disagreed with the handoff. So a mechanism a handoff asserts is a lead to verify, never a fact to build on: read it in the tree first, and when it is wrong, report that as the finding and build what the outcome and the ruling actually require. The stop-and-report clause is what turns each of those into evidence instead of a workaround.

## Scope of changes
If, while working or testing, you find a pre-existing bug, a performance concern, or behavior the task does not mention, do not fix, optimize, or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary. Where the task is ambiguous, implement the reading its wording and the surrounding code most directly support, state that assumption, and do not build for the other readings. Commit tests only where the task asks for them or the repository already keeps tests for this kind of change, roughly one focused test per stated behavior. Do not turn scratch checks into permanent test files. Implement every behavior the task asks for, completely.

## Dev commands (rulings 542, 545)
`bun run dev` (`vite dev`) serves the app. It did not, between Fix PR 02 and Fix PR 03: the worker entry rebuilt the incoming request to carry the CSP nonce forward, and `new Request(request, { headers })` throws under the dev server's own Request implementation (ruling 542). Ruling 545 moved the nonce onto the response, so nothing on the SSR path constructs a Request and the dev server serves again.

`wrangler pages dev dist`, after `bun run build`, serves the built worker, and it is the only local command that proves anything about the worker: the per-response CSP nonce, the six security headers, `_routes.json` and `/.well-known/security.txt` all come from `dist/_worker.js`, which `vite dev` never builds. Ruling 292's declaration is regenerated against this, never against `vite dev`.

Neither is an exit criterion. Every exit criterion is checked on the deployed preview URL, because that is the only environment the founder tests in.

## Editing
Minimize tokens spent editing files. When it will not affect the result, surgically edit a file rather than rewrite it.

## Batching
First privately list what you need next; then request every item that does not depend on another's result in this one response.

## Progress
Before you start, say in one line what you are about to do. Brief updates while you work. Close with a short recap that stands on its own: what you found, what you did, what is next, and the deployed URL where the result can be checked. Never claim done against a local run; exit criteria are checked against the deployed URL.

## Absolutes
[absolute] No destructive schema change against the production database without an explicit instruction naming the table.
[absolute] No sending to real recipients (email, push, message) from any environment other than production, and only when the brief names it.
[absolute] No second framework, second auth path, or second payment rail without a brief that names it.
[absolute] Every new table ships with RLS enabled and explicit policies for every persona (member, Space lead, event host, admin, service role). A table without RLS is a failed task.
[absolute] No secrets in code, logs, or commit messages.
[absolute] Lovable never creates or alters schema.
[absolute] Fixed vocabularies (focus areas, industries, regional expertise, skills, languages, countries) are database tables read at runtime, never hardcoded arrays in a component. The legacy build kept them in a React file with a comment admitting they had to be hand-synced with the database; that is the named anti-pattern.
[absolute] One read projection and one write path per surface. Profile ships profile_view and save_profile_section; every surface after it follows the same shape. The legacy build had ten-plus duplicate profile-read functions.
[absolute] The attestations table is chassis and already exists. Every engine writes to it; no engine creates its own attestation, endorsement, or trust table.
[absolute] No numeric score, percentage, progress indicator, match score, trust score, or completion score is ever computed for display, in any surface, in any form.
[absolute] Company email addresses come from `src/lib/contact.ts` or its Deno mirror `supabase/functions/_shared/contact.ts`, never a literal in a surface, an edge function, a document or a test; the DNA Email Directory in Notion is the source of truth for every address and where it is published; `noreply@` is retired and nothing sends from it; the app subdomain is never an email domain; every outbound sender carries Reply-To `support@` through the module's sender pairings (ruling 387, which supersedes ruling 385 in full).

## Doctrine that affects code
Every post, thread, and notification carries a C tag or the system category; the column is NOT NULL.
Polymorphic references (author, anchor, notification object) use the shared anchor type; do not invent a second one.
Counts shown to a viewer are computed within that viewer's RLS scope and render nothing below five.
Confirmed flags on contributions are set only by the counterparty or a payment rail record, never by inference or by DIA.
DIA reads message metadata only; no query it runs may select message body content unless the member invoked a "help me reply" action in that thread.
A migration is committed before the state it describes is applied to the shared project, and if a
batch has to be applied in pieces the repo carries the whole batch before the first piece runs
(ruling 225). Applying first leaves the canonical database ahead of every checkout, so a `db reset`
reverts work nobody knew was there and a concurrent session audits a state no migration explains,
which is exactly what happened on 9 September and became PASS-01's 18:30 addendum.
A migration file is never amended after it is applied; a change is a new migration (ruling 466).
`tests/migration-lint.cjs` enforces 466 in the harness rather than by assertion: it compares the
migration files at the merge base with the default branch against the ones in the working tree, keyed
by version rather than by path, so a file that moves to another directory keeps passing and a file
whose content changed after it was applied fails by name.

A migration reaches the canonical project by `supabase db push` from the founder's machine, and never
by the Supabase MCP's `apply_migration` (ruling 553, extending 269). `apply_migration` mints its own
version rather than honouring the file's: applying `20260913220000` through it recorded the statements
byte-identically, md5 and all, under `20260913220047`. That trades one drift row for two and
manufactures exactly the divergence ruling 444's arm exists to catch, and the only way back is hand
editing `supabase_migrations.schema_migrations`, which is what PASS-01 was written about.

Between that push and the merge, the project records a version the branch has no file for, and the
drift arm reads `FAIL … recorded on the project, no file in the tree` and exits 1. That is not an
`EMPTY` row: the arm reaches `EMPTY` only at `if (!row.n)`, a recorded row whose `statements` array is
empty, which is the PASS-01 pair and nothing else. The two conditions are deliberately separate and
only one of them is red.

On `main` the FAIL is latent rather than manifest. No workflow here carries a `schedule`; `pages.yml`
runs on `push: branches: ["**"]` and `workflow_dispatch`, so `main` has no run of its own during the
window, and the merge is itself the push that triggers one — by which point the file is in the tree and
the run is green. **The exposure is every other branch**, because `migration-drift.cjs` reads
`supabase/migrations` from the running checkout and the `live` job runs on every branch: during the
window any branch that does not carry the file goes red at step 8 for a reason that has nothing to do
with it. So the ordering is not "push then merge promptly" but: `db push` immediately before merging,
and cut or push nothing else in between. The window should be minutes, and its cost falls on other
people's branches rather than on the one being merged.

Never force push to `main` (ruling 541) `[absolute]`. Force-with-lease is permitted on a Claude
working branch, and only after a rebase that was instructed, pinned to the exact prior head. Plain
force, without a lease, is refused everywhere. The reason is that Lovable syncs two ways on `main`
(ruling 146): a force push there destroys the founder's visual commits, and they exist nowhere else.

A test arm that cannot run is reported as unproven, never as passing, and never folded into a
passing count (ruling 228). An arm that silently vanishes reads as coverage the suite does not have.

Never push to a working branch while a calibration dispatch is in flight (ruling 554). `pages.yml`
concurrency cancels the branch's matrix jobs on a push, and the push redeploys the preview underneath
the arms that are still running: a Pages deploy retires the previous build's hashed asset URLs, so a
page loading across the swap 404s. It cost one arm's page-error check during Fix PR 03's calibration,
on one engine of two, and the tell was that only one of the eighteen connect arms failed when a real
defect would have failed all eighteen. Wait for the dispatch, then push.

The enforcing matrix runs on the final head, and nothing is committed to the branch after it starts
(ruling 556, which sequences 554 rather than amending it). A commit arriving mid-run does not invalidate
the run, it invalidates the run's subject: an enforcing run on a head that is about to be superseded
proves nothing whatever it reports, however green. So finish the branch first — including the report and
any doctrine lines — and only then let the run that will be cited start. "It is documentation only, so it
costs time and not validity" is the wrong reading, and it is the one taken during Fix PR 03: a doc-only
push superseded run 194 and its result described a head that no longer existed.

The SSR nonce is held in `AsyncLocalStorage` (rulings 545, 549), which the Workers runtime provides
under `nodejs_compat`; `nodejs_als` is the narrower flag for enabling only that API and is not what
this depends on. `wrangler.jsonc` carries `nodejs_compat` and a compatibility date of `2026-09-01`, and
for dates from `2026-08-04` the runtime enables `nodejs_compat` by default, so the flag is
belt-and-braces rather than the thing holding it up. Nitro copies both into
`dist/_worker.js/wrangler.json`, which travels with the upload, so production and preview cannot
diverge: both are `wrangler pages deploy dist` of the same artifact. The dependency is not new either
way — `@tanstack/start-server-core` runs every request through its own `AsyncLocalStorage`, so an
environment without it would already serve nothing.

Build order for any surface: schema and RLS, then Edge Functions, then UI. Confirm any design extraction arrived with real content before building from it; a missing or empty extraction is a stop-and-report condition, never a reason to reconstruct the prototype from ruling summaries (ruling 90). No surface is built without an approved Claude Design prototype (ruling 62); the extraction and SPEC.md are the visual contract, the brief is the behavior contract.
Design tokens and components come from Strand via the extraction; never from shadcn, never from the old repo (rulings 70, 72).
Exit check for every surface is the responsive test matrix on the deployed URL: 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536, both themes, Safari and Chrome (ruling 61).

The shell owns one scroller per tier and the document never scrolls inside it (ruling 104), so the
router's element scroll restoration is what governs a surface-to-surface navigation, not window scroll.
Left alone it copies the outgoing location's scroller position onto a location it holds no entry for,
which is how a profile opened from a Members card arrived already scrolled past its masthead (W58,
ruling 552). The shell's scrollers are named in `scrollToTopSelectors` in `src/router.tsx` so they are
excluded from that copy, and the shell settles the position in a layout effect keyed on the surface,
because the router does its scroll work from an `onRendered` subscription that can land after a child's
mount effect has measured. Every future surface inherits both. A `scrollTo` on a surface's own mount is
not the fix: it papers over the copy and races the measurement.

## The Digital Trust Layer (rulings 139 to 141)

Member-authorized visibility is DNA's Digital Trust Layer, governed by DNA's Terms and Privacy Policy and built to GDPR and equivalent standards. Three rules bind every surface that shows one member's data to another:

Audience scope (everyone / connections / anchored) is enforced as row policy, never client-side filtering. A viewer who may not see a row gets no row, not a hidden element.

A member's name never reaches a signed-out surface through another member's content unless that member has opted into public sharing themselves. Use private.third_party_label; an unshared third party renders as a role ("the host", "a Space lead", "the recipient"), never as a name. This applies to every public surface, not just the profile rail.

Anchored qualifies on a shared Space role or a shared attested event.

## Phase posture (ruling 140)

The canonical project holds no real member data. Report every visibility, RLS, and consent finding plainly, with a severity, and continue; none of them blocks a merge. They are recorded as invite-boundary gates to close before the first real member invite. Do not describe findings as leaks or breaches.

## Connection Engine (rulings 111 to 116)

The graph lives in Postgres. One typed edges table (connect, follow, event_rsvp, event_attested, space_role, space_role_completed, contribution_fulfilled, story_about, authored) plus the attestations table. Only counterparty-attested completion edges carry trust weight; follow, RSVP, and co-membership carry none.

First degree and mutuals come from a symmetric adjacency table. Second degree is served from a materialized set, refreshed incrementally on new connections and fully overnight; never computed live, because recursive CTEs at this shape run seconds, not milliseconds. Third degree is computed only for a specific pair with a bounded, cycle-guarded CTE, never enumerated.

No graph database. If three-hop interactive traversal or online community detection becomes routine, pilot Apache AGE inside the same Postgres before proposing any external engine, and raise it as a decision rather than building it.

Embeddings come from a separate provider (Anthropic has no embedding model); DIA on Claude writes explanations only. Matching may rank internally and must display only words: the reasons that produced a suggestion, never a distance, score, or percentage. Dismissals persist and are applied as an anti-join. If the rules stage yields nothing real, render nothing.

## Connect (Brief 4, rulings 153 to 188)

Four read projections and five write paths. Nothing else reads or writes the graph from a surface; a
sixth of either is the v1/v2 stack starting again (the absolute above).

Projections: `connect_cards(lens, filters, cursor, limit)` for Members, Suggested and Network;
`connect_where()` for the country mosaic; `connect_filter_options()` for the ten filter axes;
`connection_request_intros(ids)` for what a Feed Connect post shows. Suggested reaches the client
through the `connect-suggest` Edge Function, which calls `connect_cards('suggested')` with the
member's own JWT so nothing the member may not see becomes a fact DIA reasons over.

Write paths: `send_introduction`, `respond_to_request`, `withdraw_request`, `set_follow`,
`dismiss_suggestion`. `connection_requests` has one writer at the API as well as in the app
(rulings 215, 415): `authenticated` holds no insert grant and no insert policy on the table;
`send_introduction` is the only path in. The composer carries no Connect verb (ruling 400): a
request is sent from Connect or from the profile's "Connect with" entry, never published.

`private.relationship_state(viewer, target)` is the single source for none, sent, received,
connected and window, on Connect and on Profile alike (ruling 188). Neither surface keeps a private
copy and no surface derives a relationship from `connection_requests` directly; the sender has no
direct read on that table at all, because a declined status must never reach them (ruling 157).

`private.is_blocked` is symmetric and absolute: every projection that returns a member filters on it
in both directions. `member_blocks` is chassis, not Connect's (ruling 186). Its writer in the app is
the block control on Profile's Visitor overflow (Brief 4A, ruling 216): `src/lib/blocks.ts` inserts
and deletes the blocker's own row under `member_blocks_owner_insert` and `member_blocks_owner_delete`,
and the ruling 198 trigger carries every consequence. Report still has no surface, logged as gap G1
in `docs/GAPS.md`.

Stance has one source (rulings 187, 300): `public.members.stance` (enum `public.stance`, default
`exploring`) is the axis, `public.member_stances` is the label vocabulary every surface reads, and
`public.member_stance_details` holds the per-variant fields. Brief 5 dropped `members.segment` and
renamed the tables. No component keeps a stance label map.

## Brand assets (ruling 184)

A brand or logo change is its own change with its own ruling and never rides in another brief's PR.
Scope that enters through a build is scope nobody decided.

The swap is a file replacement, never a code change. Every logo and icon resolves by path from this
contract, so the next wordmark lands by overwriting files in one directory plus a cache bust:

| Path | Use |
| --- | --- |
| `public/strand/logo.png` | wordmark: `AppHeader`, public profile chrome, sign-in (660 wide) |
| `public/strand/logo-dark.png` | dark-theme wordmark, if the redesign needs one |
| `public/favicon.png` | browser tab, and the square master every other icon derives from |
| `public/favicon.ico` | browser tab, legacy, 32 and 16 (arrives with the wordmark redesign) |
| `public/apple-touch-icon.png` | iOS home screen, 180 |
| `public/icon-192.png`, `public/icon-512.png` | PWA manifest, maskable safe area |

No component may import a logo as a module, inline it as SVG, or hardcode a dimension that assumes
the current wordmark's aspect ratio. Size by height, width auto.

Lovable commits straight to `main` (ruling 146) as `gpt-engineer-app[bot]`, app id 159125892
(ruling 286). Check `main`'s recent commits at the start of any code session, report
`gpt-engineer-app[bot]` commits, and rebase onto them. On conflict keep the founder's visual change
and report it rather than resolving it silently.

Commit identity is checked by the GitHub account login or app id from the API, never by the git
author name or email string (ruling 379). The permitted identities are `jodombrown`, `claude`,
`gpt-engineer-app[bot]` and `region17gh`, the founder's Region 17 Claude Code seat (ruling 369).
Any other identity is reported at session open.
