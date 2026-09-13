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

## Scope of changes
If, while working or testing, you find a pre-existing bug, a performance concern, or behavior the task does not mention, do not fix, optimize, or extend it in this change unless the requested behavior cannot work without it; report it as a follow-up in your summary. Where the task is ambiguous, implement the reading its wording and the surrounding code most directly support, state that assumption, and do not build for the other readings. Commit tests only where the task asks for them or the repository already keeps tests for this kind of change, roughly one focused test per stated behavior. Do not turn scratch checks into permanent test files. Implement every behavior the task asks for, completely.

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

A test arm that cannot run is reported as unproven, never as passing, and never folded into a
passing count (ruling 228). An arm that silently vanishes reads as coverage the suite does not have.

Build order for any surface: schema and RLS, then Edge Functions, then UI. Confirm any design extraction arrived with real content before building from it; a missing or empty extraction is a stop-and-report condition, never a reason to reconstruct the prototype from ruling summaries (ruling 90). No surface is built without an approved Claude Design prototype (ruling 62); the extraction and SPEC.md are the visual contract, the brief is the behavior contract.
Design tokens and components come from Strand via the extraction; never from shadcn, never from the old repo (rulings 70, 72).
Exit check for every surface is the responsive test matrix on the deployed URL: 360, 390, 430, 744, 820, 1024 both orientations, 1280, 1536, both themes, Safari and Chrome (ruling 61).

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
