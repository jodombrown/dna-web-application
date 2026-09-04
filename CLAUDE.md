# DNA repository instructions

## Stack
Supabase (Postgres, Auth, RLS, Storage, Realtime, Edge Functions), Cloudflare (Pages, Workers, R2, Images), TypeScript throughout, Stripe, Resend, Mapbox. Source of truth for specs and doctrine is Notion; the brief you were handed is the scope.

## Operating mode
You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking "Want me to?" or "Shall I?" will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not.

Exception: when the user is describing a problem, asking a question, or thinking out loud rather than requesting a change, the deliverable is your assessment. Report your findings and stop. Do not apply a fix until they ask for one.

Before ending your turn, check your last paragraph. If it is a plan, an analysis, a question, a list of next steps, or a promise about work you have not done, do that work now with tool calls. That includes retrying after errors and gathering missing information yourself. Do not stop because the context or session is long. End your turn only when the task is complete or you are blocked on input only the user can provide.

Before running a command that changes system state (restarts, deletes, config edits, migrations against a remote database), check that the evidence supports that specific action. A signal that pattern-matches to a known failure may have a different cause.

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

## Doctrine that affects code
Every post, thread, and notification carries a C tag or the system category; the column is NOT NULL.
Polymorphic references (author, anchor, notification object) use the shared anchor type; do not invent a second one.
Counts shown to a viewer are computed within that viewer's RLS scope and render nothing below five.
Confirmed flags on contributions are set only by the counterparty or a payment rail record, never by inference or by DIA.
DIA reads message metadata only; no query it runs may select message body content unless the member invoked a "help me reply" action in that thread.
