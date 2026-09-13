# Fix PR 03: the ruling 465 walkthrough defects and ruling 485's low-schema infrastructure

The closing report for PR #35, against `main` at `b4b21ab`. Twelve scope items under rulings 465, 485, 542
and 544 to 548. Written to be read by someone who saw none of the work.

## Outcome

Eleven of the twelve scope items are landed with a named proof. The twelfth, ruling 410's auth mail
templates, is console work whose approved copy the repository does not carry, and it is reported rather
than invented. Two items were verify-first and one of them turned out already built; one was already
built in substance and needed only the crash beside it removed. Three things the scope assumed were not
true, and each is reported in place rather than worked around.

The three that were not true:

1. **Ruling 545's Pages middleware cannot exist in this project.** Nitro's `cloudflare-pages` preset
   emits `dist/_worker.js`, and a `_worker.js` makes Pages ignore the `functions` directory entirely.
   Proved, not assumed: a probe `functions/_middleware.ts` that stamped a marker header never ran under
   `wrangler pages dev dist`, which loaded `dist/_worker.js/wrangler.json` instead. The worker entry still
   mints and owns the nonce as 545 describes; the one deviation is the channel it reaches the render on,
   and ruling 542 is the reason. Details under item 4.
2. **No `expires_at` column existed anywhere.** Item 7 asks for "the `expires_at` purge"; at `b4b21ab`
   no table in `public` or `private` carried the column and nothing treated a pending introduction as
   expiring. The migration creates both the column and the purge. The window it uses is a number no
   ruling supplies and is seeded as a setting, flagged below and in G23.
3. **W58's cause was not a missing reset.** TanStack Router's element scroll restoration *actively
   copies* the outgoing location's scroller position onto the incoming one. The profile was being
   scrolled to Connect's offset, not merely failing to be scrolled to the top, which is why the fix is a
   router option and not a `scrollTo`.

Ruling 292's declaration is regenerated from a measured run of each engine against the deployed worker:
chromium 4720 of 4721 over 205 arms, webkit 4721 of 4721 over 205 arms, zero lost web processes on either.
The live arms are 102 of 102 on the deployment. One check is red and stays red until the founder applies the
migration, and one chromium arm failed a page-error check for a reason I caused by pushing mid-run; both are
named below rather than smoothed over.

**Two defects in my own work were caught by re-reading the diff against the built worker rather than by a
test failing, and both are fixed in this PR.** The first: handing the nonce back on a response header worked
on every 2xx and silently failed on everything else, because h3 merges a request event's headers onto a
returned Response only when it is ok — a 404 shipped `script-src 'self'` against markup that carried a
nonce, blocking the very scripts the policy exists to allow. The second, in the fix for the first: with the
store in `src/lib/csp.ts`, which the router imports and so ships to the client, the client bundle carried
`new (({}).AsyncLocalStorage)` and would have thrown during hydration. Both are now proven on the
deployment, the 404 case by an arm written specifically for it.

## What I need from the founder

**One thing blocks the last red line, and one item cannot be done from here.**

1. **Apply `20260913220000_r482_485_introduction_expiry_purge.sql` to the canonical project with the
   Supabase CLI (`supabase db push`), not with the MCP.** Ruling 225 says the repo carries a migration
   before it is applied, so it is committed and unapplied, and ruling 444's drift arm correctly reports
   `FAIL 20260913220000 … in the tree, not recorded on the project` until it runs. That is the only red
   check on this PR. I did not apply it myself for an evidenced reason rather than caution: applying the
   same file on the throwaway branch through the MCP recorded it under a version the tool minted for
   itself, `20260913220047`, not the file's `20260913220000`. The statement text matched the file exactly
   (md5 `a10dc390598f7ebcb660c32852f56089` on both sides), so only the version diverges — which is
   precisely the shape ruling 444's arm exists to catch, and correcting it afterwards would mean hand
   editing the migration ledger that PASS-01 was written about. The CLI records the file's own version
   and leaves the drift arm green. Ruling 553 makes that the only route, extending 269.

   **One consequence to sequence rather than discover.** Between that push and the merge, the project
   records a version the branch has no file for, and the drift arm reads
   `FAIL … recorded on the project, no file in the tree` and exits 1. It is not an `EMPTY` row: the arm
   reaches `EMPTY` only at `if (!row.n)`, a recorded row whose `statements` array is empty, which is the
   PASS-01 pair and nothing else.

   On `main` that FAIL is latent, not manifest. No workflow here carries a `schedule` — `pages.yml` runs
   on `push: branches: ["**"]` and `workflow_dispatch` — so `main` has no run of its own during the
   window, and the merge is itself the push that triggers one, by which point the file is in the tree and
   the run is green. **The exposure is every other branch.** `migration-drift.cjs` reads
   `supabase/migrations` from the running checkout and the `live` job runs on every branch, so during the
   window any branch that does not carry the file goes red at step 8 for a reason that has nothing to do
   with it — the G17 baseline branch, a Brief 6 branch, a hotfix. So the ordering is not "push then merge
   promptly" but: `db push` immediately before merging this PR, and cut or push nothing else in between.
   The window should be minutes, and its cost falls on other people's branches rather than on this one.
   What the project carries meanwhile is one nullable column nothing reads plus a nightly cron job.

   While applying it, decide the window. It is seeded as `private.connect_settings` key
   `introduction_expiry_days` at 30 days, because no ruling in the handoff supplies a number.
   `update private.connect_settings set value_int = <days> where key = 'introduction_expiry_days';`
   changes it with no migration. Thirty is deliberately shorter than the 90-day decline window, on the
   reasoning that silence should clear faster than a refusal blocks — but it is a default, not a ruling.

2. **Ruling 410's three auth-mail copy changes need their approved text.** The sender pair is already
   decided and mechanical (`AUTH_SENDER` in `src/lib/contact.ts`). The reset footer, the password-changed
   heading appearing once, and a support line on every template are member-facing strings, and this
   handoff does not carry ruling 410's wording. Ruling 496 requires approved strings verbatim and G18
   records what happened the one time a string was needed and none was supplied, so I did not write
   them. Recorded as G22 with the exact console steps.

## The result

Preview deployment: **https://claude-dna-web-pr-03-yhcqax.dna-web-application.pages.dev**

- **The walkthrough defects are closed at their causes, not at their symptoms.** W54 is one schema row
  reading Convey's kicker rather than a card rewrite; W58 is a router option plus an ordering guarantee,
  because the router was carrying the previous surface's scroll position forward and the profile's
  condense effect was measuring it on mount.
- **Three guardrails moved from assertion into the harness, and each one bit when it was tested.** The
  token check now runs on every push instead of only when someone dispatches the matrix; the notification
  destination check is new; the migration lint caught a real hole in itself through its own negative
  control and was fixed before it was trusted.
- **`vite dev` serves the app again, and the nonce is provably one value across two layers.** Five live
  arms assert that the nonce in the CSP header is the nonce in the markup and in the shell's meta, on the
  same response, that the internal header never reaches a client, and that the next response differs.

---

## The twelve items

### 1. W54: a chipless post renders without a kicker — landed

`src/components/strand/verb-schema.ts`: `UNTYPED` reads its kicker from the Convey row (`VERB_SCHEMA.convey.kicker`) rather than carrying a second copy of the word, so the two cannot drift. Ruling 68's other half stands: no title, no field rows, no action, because there is no story object behind an untyped post and "Read the story" would lead nowhere. A `CARD_SCHEMA` row and its lookup, exactly as ruling 546 scoped it; no card rewrite and no required chip in the composer.

`data-kicker` was added to `PostCard`'s kicker element as the arm's hook. The kicker is uppercased in CSS, so the arm reads `textContent` and asserts the authored string rather than the transformed one — a detail worth recording, because asserting `innerText` failed on a correct implementation.

**Proof:** the publish arm publishes with no chip and asserts the kicker twice, once on the composer's preview (what the member sees before publishing) and once on the Feed card (where the finding was seen), together with the absence of the act.

### 2. W58: a profile opened from a Members card lands scrolled past the masthead — landed, at the cause

The cause is not a missing reset. The shell owns one scroller per tier (ruling 104) and the document never scrolls inside it, so TanStack Router's *element* scroll restoration governs it — and on a navigation to a location it holds no entry for, that restoration copies the outgoing location's element positions into the incoming one and applies them. The profile was being scrolled to Connect's offset. `ProfileSurface`'s condense effect (ruling 134) then read that offset on mount and condensed the masthead. Both halves of the finding are the same mechanism.

Two changes, one for the cause and one for the order:

- `src/router.tsx` names the shell's three scrollers in `scrollToTopSelectors`. That is the framework's own answer: they are excluded from the copy and scrolled to the top instead. Ruling 105 holds in both directions — expanding a card in place navigates with `resetScroll: false` so nothing runs, and collapsing goes back, where a location the router already holds an entry for is restored from that entry rather than zeroed. The rails carry over by the same mechanism, so they are named alongside the Feed column rather than left to be found later.
- `src/components/dna/AppShell.tsx` settles the position in a layout effect keyed on the surface, because the router does its scroll work from an `onRendered` subscription that can land *after* a child's mount effect has measured. The local run before the router change showed exactly that: the masthead measured 0 and the router then restored 96. Feed and `/posts/:id` are one surface, so expanding in place still keeps its position.

**Proof:** a connect arm scrolls the Members list past the condense threshold, opens the last card, and compares the landing against the same profile reached directly on a fresh document. The reference is calibrated rather than hardcoded because the masthead's banner bleeds up under the header by design, so the absolute offset is not zero at any tier.

### 3 and 4. `vite dev` cannot serve the app; the headers and the per-request nonce — landed as one change

Reproduced first: `/sign-in` returned 500 with `TypeError: Cannot read properties of undefined (reading 'window')` at `new Request` in node's undici, from `src/server.ts:87`. The dev server hands the worker entry a `NodeRequest`, not the global `Request`, so undici reads its internals as undefined. Ruling 542's finding, confirmed, and not a rebase regression.

Ruling 545's shape as specified needs a Pages middleware, and that layer cannot exist here. Nitro emits `dist/_worker.js`, and Pages ignores the `functions` directory when a `_worker.js` is present. **Proved rather than assumed:** a probe `functions/_middleware.ts` setting `x-probe-middleware` never ran under `wrangler pages dev dist`, whose log shows it loading `dist/_worker.js/wrangler.json`. The worker entry is the outermost layer this deployment has.

So the construction goes rather than being repaired. `src/server.ts` mints the nonce and owns it, exactly as 545 describes, and the render reads it from request scope, sets it on `ssr.nonce`, and echoes it in the shell's `csp-nonce` meta for hydration. One value, two layers, no `HTMLRewriter` pass over the body, and nothing on the SSR path constructs a `Request`. The single deviation from 545 is the channel: `AsyncLocalStorage`, in `src/lib/csp-nonce.server.ts`, rather than a request header.

**I got the channel wrong first, and the arm that caught it is in this PR.** My first attempt had the render mint and hand the value back on an internal response header. It worked on every 2xx and failed silently on everything else: h3 merges a request event's headers onto a returned Response only when that Response is ok, so `/this-route-does-not-exist` came back with nonces stamped on its script tags and `script-src 'self'` in its policy — blocking the very scripts the policy exists to allow. Measured on `wrangler pages dev dist` while re-reading my own diff, not caught by a test. That is why the worker owns the value: every response it builds carries its own nonce whatever the status.

The fix had a defect of its own, caught the same way. `src/lib/csp.ts` is imported by the router and ships to the client, where `node:async_hooks` cannot be constructed; with the store in that file the client bundle carried `new (({}).AsyncLocalStorage)`, which throws while the bundle is still evaluating and takes hydration with it. The store moved to its own server-only module; the client bundle now contains no reference to it and the build emits no externalisation warning.

Request-scoped is not a global in the sense csp.ts's previous note warned against: the value exists only inside the `run` the entry opened for that one request, so it cannot reach another. TanStack Start holds its own request event the same way.

**Proof.** `vite dev` serves: `/sign-in` returns 200 with the surface rendered, against 500 and the undici `TypeError` before. On the deployment, five live arms, all passing on the final head:

- `the SSR'd script tags carry a nonce` — 3 nonced script tags
- `every nonce in the markup is the one in the Content-Security-Policy header` — header `KylZO4plvpqz…`, markup `KylZO4plvpqzsA2SHhqFIw==`
- `the shell's csp-nonce meta carries the same value, so hydration reads it back` — meta `KylZO4plvpqz…`
- `a non-2xx render carries the nonce in its policy as well as its markup` — status 404, header `PAEa8Q6rhTEE…`, markup `PAEa8Q6rhTEELgaO3cC8vw==`
- `a second response carries a different nonce` — first `KylZO4plvpqz…`, second `PHn+pbhhAcSz…`

Locally the same contract holds across `/feed` (200), `/sign-in` (200) and a missing route (404): header, markup and meta agree on all three.

### 5. `getClaims()` in the server client — landed

`supabase/functions/media-upload/index.ts` is the one server-side JWT read in the tree. `getUser()` made a round trip to the Auth server on the path of every upload; `getClaims(bearer)` verifies the signature against the JWKS cached in the isolate and reads `sub` from the verified payload. It is never the weaker check: for a symmetric token, or where WebCrypto is unavailable, `getClaims` calls `getUser()` itself before trusting a claim, so the floor is exactly what the line did before. The token is passed explicitly because that client holds the member's JWT as a request header and persists no session.

**Proof:** file identity plus the existing auth arms, as item 5 allows, since no behaviour changes for a valid token. Deploying the function is the founder's step: this repository holds no Management API token (ruling 382) and CI deploys Pages, not Edge Functions.

### 6. The notification destination check — landed

Ruling 547 in full. `NOTIFICATION_REGISTRY` is one source of truth; `KIND_C` and `DESTINATION` are derived from it, so a kind cannot carry a glyph without a destination. G19's three destination-less kinds are suppressed rather than exempted, and their ruling 490 words are held in G19 until their surface ships rather than reinvented then.

Grounded-or-empty applies to the row and not only to the check: `loadNotifications` drops a row whose kind the registry does not hold, and `hasUnread` will not raise the bell's dot for one, because a dot that opens an empty list is worse than no dot. Both filter after the read rather than in the query, since the registry is the client's contract and a kind it holds need not yet exist in the database's enum — sending one to `in` would be an error rather than an empty result.

**Proof:** `tests/notifications.cjs`, now in the deploy job, with fourteen checks: the registry parses, every kind resolves to a destination and a C, every kind has a sentence so no row renders blank, both maps are derived, each kind appears as an object key exactly once, the read path filters in both places, and every database enum value the registry does not hold is named on every run. Plus two shell arms: a destination-less kind raises no dot and renders no row.

Two things it surfaced rather than fixed, both in G19: `connection_request` is still absent from the `notification_kind` enum — G19 recorded that as this PR's scope, but the handoff's twelve items do not name it and DONE MEANS allows no schema beyond what the scope names — and the list's empty state still promises two kinds that can no longer appear, which is approved copy no ruling replaces.

### 7. The `expires_at` purge — landed, and its premise corrected

There was no `expires_at`. At `b4b21ab` no table in `public` or `private` carried the column and nothing in the schema treated a pending introduction as expiring; the only expiry in Connect is the 90-day decline window, which counts from `responded_at` and is a different rule. The only trace of ruling 482 in the tree was the Sent empty state, which already tells a member their introductions wait "until they are accepted, or until they quietly expire". The migration makes that sentence true: the column, `private.purge_expired_introductions()`, and a nightly `pg_cron` job at 02:45, guarded exactly as `refresh_second_degree`'s schedule is.

Deletion is ruling 482's silence, and it is why no read projection changed. No declined row is written, so no decline window starts; the pending unique index is free again, so `send_introduction` accepts the next one; `private.relationship_state` finds no row and answers `none` through the one source ruling 188 names. A status value would have taught every projection a new state, which is the shape ruling 544 moved out of this PR.

Rows written before the column exists carry a null window and are never purged. Ruling 400 removed Connect from the composer, so the only `connection_requests` a published Feed post can point at are older ones, and purging those would empty the who and why such a card renders through `connection_request_intros` (ruling 157).

**Proof:** a write proof on a throwaway Supabase branch under ruling 269 (`erpcofqbxkemkicyyqus`), deleted afterwards and verified gone — `list_branches` returns only `main`, and the canonical project still shows 38 recorded migrations, one cron job and no `expires_at`. Six arms, all passing, every row rolled back:

| Arm | Result |
| --- | --- |
| a new pending row carries `expires_at` from the setting, unasked | PASS — `2026-10-13`, window 30 days |
| the purge removes exactly the lapsed row and says how many | PASS — returned 1 |
| the waiting row and the row with a null window are untouched | PASS — lapsed gone, both others kept |
| ruling 482: silence, not rejection. No declined row for the lapsed pair | PASS — 0 non-pending rows |
| requesting reopens at once: the pending index admits the same pair again | PASS — accepted |
| a second purge removes nothing: idempotent | PASS — returned 0 |

One thing the branch could not give, and it is G17 rather than a fault here: a fresh branch replayed only the six `b1` migrations, because the tree cannot replay from zero. G17 says so in terms — "a replay from an empty database in version order fails … the canonical project is the only environment the tree describes". So the preconditions the migration depends on (`private.connect_settings`, `private.setting_int`, `connection_requests`' `message` and `responded_at`, the pending unique index) were built on the branch as a fixture, to the canonical project's own definitions read from it directly, and the migration file was then applied verbatim. The proof is therefore fixture-backed rather than replay-backed, and that is named here rather than presented as more than it is.

### 8. The aria-live region and the unread dot label — verify first: already built, not rebuilt

Everything this item asks for is standing. Reported with its file and line, and nothing was added:

| What | Where |
| --- | --- |
| Ruling 480's unread dot: a hidden "Unread" label in a `--target-min` hit area, the dot still 8px | `src/components/strand/NotificationListItem.tsx:166-179` |
| `aria-live="polite"` on the lens descriptor | `src/components/strand/LensBar.tsx:174` |
| An aria-live region for a state change generally: the section save word | `src/components/strand/SectionCard.tsx:105-106` |
| Ruling 499: a privacy change announcing itself in its own words | `src/components/dna/ProfileSurface.tsx:264` (`AUDIENCE_SAID`), wired at `:533` |
| The region those words are announced through | `src/components/strand/Toast.tsx:15`, rendered at `ProfileSurface.tsx:809`, `:865`, `:1100` |
| The same pattern on the password strength line | `src/components/strand/PasswordField.tsx:98` |

The existing shell arm already asserts ruling 480's hit area and hidden label, so it also has its proof.

### 9. The both-themes token check in CI — verify first: it was not in CI on a push, and now is

`scripts/token-check.mjs` existed and passed, but its only CI reference was `.github/workflows/matrix.yml:114`, and that workflow is `workflow_dispatch` only. On a push, nothing ran it. It is static, so it now runs in `pages.yml`'s `deploy` job beside lint, tsc and the contact scan — `.github/workflows/pages.yml:48`. The dispatch copy stays, so a dispatched matrix still checks before it spends twenty minutes.

### 10. The migration lint — landed, and it found a hole in itself

`tests/migration-lint.cjs` enforces ruling 466 in the harness: it compares the migration files at the merge base with the default branch against the ones in the working tree, keyed on the 14-digit version rather than the path, and fails by name on a file whose content changed after it was applied.

The boundary is discovered, so the G17 baseline PR does not have to edit it. There is no date and no file list: it searches the whole tree for the version pattern, so a historical file that moves to a directory the drift arm no longer scans is a move with unchanged content and passes, while the same file edited in place fails wherever it sits. A new version always passes, two files sharing a version fail, and if the base cannot be resolved it reports UNPROVEN and exits 0 under ruling 228.

Its own ruling 270 negative control caught a real defect in it, which is the reason for running one: reading `git ls-tree -r HEAD` answered for the commit, so an amendment was invisible until it had been committed and a contributor running the lint before committing was told the tree was clean. It reads the working tree now. Both readings catch a committed amendment; only this one catches it while it is still cheap.

### 11. Ruling 541's force-push rule — landed in both files

Merged into the doctrine already there rather than added beside it. `CLAUDE.md` carries it next to the migration doctrine; `AGENTS.md` carries it in Sync discipline, and that file's blanket "never force-push" is narrowed to `main` in the same edit so the two files say one thing. The reason travels with the rule: Lovable syncs two ways on `main`, so a force push there destroys the founder's visual commits and they exist nowhere else. `CLAUDE.md` also gains item 3's dev commands.

### 12. The fold-ins — one landed, one reported

**`Input`'s boolean `error` (ruling 548): landed.** `error` carries two jobs, the invalid state and the words that explain it, and a caller may pass either. A boolean took the hint's place and rendered as nothing, so the field lost its hint and put no text where it had been. The two are separate now: a boolean paints the border and sets `aria-invalid`, and the hint stays. Verified against the surface the defect was reported on: the onboarding arms pass 85 of 85, because ruling 434's refusals render in their own block and the hint returning does not disturb them.

**Ruling 410's auth mail templates: reported, not landed.** The code half already stands from ruling 387 — `AUTH_SENDER` is the sender pair and `tests/contact.cjs` fails the build if either address appears anywhere else. The rest is console work with no code seam, and the three copy changes (W6, W21, W24) are member-facing strings this handoff does not carry the approved text for. Recorded as G22 with the console steps. While writing G22 the contact scan caught me putting two addresses into the document, which is the ruling 387 absolute working exactly as intended; the entry names the constants instead.

---

## The AsyncLocalStorage question, verified (ruling 549)

Raised as a Moderate-confidence risk before merge: `AsyncLocalStorage` needs a compatibility flag, it demonstrably works on the preview, and whether production matches is invisible until the first production request — the failure mode being the nonce reading undefined while the policy blocks every script it was meant to allow.

The risk is settled rather than live, and this is deliberately stated as one load-bearing argument with two corroborating ones rather than three of equal weight, because only the first cannot move.

**The argument that settles it: the dependency predates this PR and is already load-bearing in production.** `@tanstack/start-server-core`'s `requestHandler` runs *every* request through `eventStorage.run(...)` against a module-scope `new AsyncLocalStorage()`, and that module is in the built worker — `dist/_worker.js/_ssr/ssr.mjs` and `_ssr/server-B3ynfjdi.mjs`. The built worker holds four ALS constructions; `main`'s `src/lib/csp.ts` held none, so this PR adds an instance of a dependency the framework already imposes on every SSR response. An environment without ALS would therefore already be serving nothing at all, rather than newly breaking on this change. That holds whatever the flags turn out to mean, and it is why the conclusion does not rest on the two below.

Corroborating, and weaker for different reasons:

- **Production and preview cannot diverge.** Nitro writes both settings into `dist/_worker.js/wrangler.json` (`compatibility_date: 2026-09-01`, `compatibility_flags: ["nodejs_compat"]`), and that file is part of the uploaded artifact; production and every preview are `wrangler pages deploy dist` of the same build from the same workflow job. Read off the emitted file, so it is checkable — but it speaks to consistency between environments, not to whether the runtime honours the flag.
- **The flag is probably not what holds it up either.** `nodejs_als` exists to enable *only* that API, while `nodejs_compat`, which this project carries, includes it; and from a compatibility date of `2026-08-04` the runtime enables `nodejs_compat` by default, this project's date being `2026-09-01`. Taken from Cloudflare's live compatibility-flags and Node.js runtime documentation rather than recollection. Flagged as the softest leg: a reader whose knowledge predates that default cannot confirm it, and the conclusion is designed to survive it being wrong.

Recorded in CLAUDE.md under ruling 549 so it need not be re-derived.

## Ruling 270: every arm that proves a fix, with its reverted baseline

Each pair was measured, not reasoned about. The reverted runs are Chromium against the built worker served by `wrangler pages dev dist`; the `ruling 292` accounting line is excluded from the counts below where the declaration was still stale at the time, and is stated separately.

| Fix | Reverted baseline | With the fix |
| --- | --- | --- |
| W54, publish arm | 11 of 14 — both kicker assertions fail, detail `no kicker element` | 13 of 14 |
| W58, connect arm at 390x844 | 46 of 48 — landing reports `scrollTop 96` from the card *and* on the direct load, since the router's restoration survives the reload | 47 of 48 |
| Ruling 547, shell arms at 390x844 | 23 of 26 — the suppressed row renders, so the empty-state wait times out and the flow aborts, taking four further checks with it | 31 of 32 |
| Ruling 547, `tests/notifications.cjs` (a kind added with an empty destination) | 16 of 18 — fails by name on the destination and on the missing sentence | 14 of 14 |
| Ruling 466, `tests/migration-lint.cjs` (a line appended to an applied migration) | 3 of 3 — the false green that made me fix the lint; after the fix, 2 of 4, naming `20260906173303_b1_enums.sql` | 3 of 3 clean |
| Ruling 485, `scripts/token-check.mjs` (a surface citing `--bg-sunken-does-not-exist`) | FAIL, naming the file that cites it | every cited token resolves in both themes |
| Ruling 482, the purge, on the throwaway branch | 0 of 2 — the lapsed row stays pending past its window and the pair is refused a second introduction by `connection_requests_pending_uidx` | 6 of 6 |

**Items 3 and 4 are stated differently on purpose.** Four of the five nonce arms pass on `main`'s shape too, because that shape also carried one value across two layers — it just did it on a request header. Presenting them as this change's negative control would be false. What this change fixed is the dev server, and the honest pair is: `vite dev` on `/sign-in` returned **500** with the undici `TypeError` before, and returns **200** with the surface rendered after. The fifth arm is different: `a non-2xx render carries the nonce in its policy as well as its markup` has a real reverted baseline, because it fails against the response-header channel I tried first — 404 markup carrying a nonce with `script-src 'self'` in the policy. That arm exists because the shape it tests broke, which is the only kind of coverage worth adding.

---

## Ruling 292: the declaration

Regenerated with `EXPECT=write` against the deployed worker, one dispatched run per engine (ruling 283's split, so neither risks the 45-minute ceiling), with `DUMP_LABELS=1` so a changed count is named rather than only counted. `matrix.yml` had no way to set `DUMP_LABELS`, so it gained one input and one env line; without it a calibration run could produce the declaration or the labels, never both.

Every changed count, by arm group, and what changed in it:

One dispatched `EXPECT=write` run per engine against the deployed preview worker, split per ruling 283 so neither approached the 45-minute ceiling, then merged by the rule `tests/matrix.cjs` applies itself — max per arm, so each engine's numbers come from that engine's own run and a short arm cannot lower anything. Verified before use against a deliberately-bad input: fed a count of 1 for an arm declared at 14, the merge left it at 14.

| Engine | Run | Checks | Arms | Lost a web process |
| --- | --- | --- | --- | --- |
| chromium | 49 | 4720 of 4721 | 205 | 0 |
| webkit | 50 | 4721 of 4721 | 205 | 0 |

58 arms changed, 29 on each engine, all of them in the three groups this PR added checks to. No other arm moved and no count fell.

| Group | Arms | Count | Checks behind the change |
| --- | --- | --- | --- |
| `connect` | 18 (9 viewports x 2 themes) | 45 -> 47, 51 -> 53 | added `W58 precondition, Connect's list is scrolled past the condense threshold` and `W58, a profile opened from a Members card lands where a direct visit does (465)` |
| `shell` | 9 | 29 -> 31 | added `a destination-less kind raises no dot (ruling 547)` and `a destination-less kind renders no row (ruling 547, grounded-or-empty)` |
| `publish` | 2 | 12 -> 13 | added `W54: the published chipless card carries the Story kicker and no act (546, 68)` and `silence: untyped text -> no DiaLine, convey preview carrying the Story kicker (546)`; removed `silence: untyped text -> no DiaLine, convey preview, no kicker` |

The added and removed `record()` calls in the diff account for each net exactly — 2 added and 1 removed in `publish`, 2 added in each of the others — so the numbers explain themselves rather than being asserted.

**One arm failed, on chromium only, and it is not being written off as a flake.** `chromium 390x844 light connect: no page errors`, two resource 404s. It is most likely mine but not from the code: I pushed mid-run at 22:21:54, and a Pages redeploy retires the previous build's hashed asset URLs, so a page loading across the swap 404s. Four reasons to read it that way rather than as a defect in the new arm — all 18 chromium connect arms emitted the full 47 checks, so nothing aborted; only one of the 18 failed, where a structural fault in the added `page.goto` would have failed all eighteen; the same suite at that viewport and theme passes locally against a stable worker; and webkit ran the identical arms over an overlapping window with zero failures. The enforcing run on this head, with nobody replacing the deployment underneath it, is the judge. If it recurs it is real and I root-cause it rather than re-run it.

Holding the push until both calibration runs had finished was the right sequencing and I did not do it; the cost was one arm's page-error check, and the remedy was already built into the merge rule.

---

## Guardrails, absolutes and the environment

- **Identities on `main`, read through the API rather than the git author string (ruling 379).** `b4b21ab` is authored by `jodombrown` with `web-flow` as the merge committer; `b3cae4d` back to `3484eed` are all `claude` (id 81847). **Nothing by app id 159125892 (`gpt-engineer-app[bot]`).** `origin/main` was still `b4b21ab` at the fetch before branching, at the fetch before the first push, and at the fetch before the second, so there was nothing to rebase onto and no Lovable commit to preserve.
- **Never force push to `main`.** Not done, and now written into both files as item 11.
- **No migration file amended.** The lint proves it, and it is the only new file under `supabase/migrations/`. Nothing pre-empts the G17 baseline's directory move: the lint keys on version, not path.
- **No write proof on `dgspjevjoblujcoljvkn`.** The write proof ran on branch `erpcofqbxkemkicyyqus`, which is deleted and verified gone. The canonical project was read for definitions and for verification only, and still reports 38 recorded migrations, one cron job and no `expires_at`.
- **No second framework, client or auth path.** One Supabase client, one auth path, one router, one worker entry. The nonce change removes a construction rather than adding a layer.
- **No numeric renders.** Nothing added renders a count, score or percentage. The purge returns a row count to an operator; nothing surfaces it, and the notification bell still shows a dot rather than a numeral.
- **Out of scope and not pre-empted (ruling 544).** No `private.visible_to`, no predicate rewrite, no delete-and-purge path (460, 478), and no G17 baseline work.
- **Two environment limits worth recording.** This session's egress policy refuses `dgspjevjoblujcoljvkn.supabase.co` and `*.pages.dev`, so nothing was verified against the deployment from here; every deployment assertion in this report comes from CI, which is where the arms belong. And WebKit cannot be installed here (the Playwright CDN is refused), which is G21 again: the WebKit numbers in this report are the dispatched run's, not a local one's.

---

## Commits

| | |
| --- | --- |
| `a4e6cfa` | the nonce leaves the SSR path's `Request` (items 3, 4) |
| `d7667a2` | W54: a chipless post carries Convey's kicker (item 1) |
| `2a8ef2f` | W58: a profile opened from a Members card lands at the top (item 2) |
| `e967a5a` | the notification registry holds only the kinds that have somewhere to go (item 6) |
| `28f4aed` | `getClaims` in the media-upload function (item 5) |
| `fe87e0b` | the introduction expiry purge (item 7) |
| `d8d796b` | the token check, the destination check and the migration lint run on every push (items 9, 10) |
| `da8bfe6` | the force-push rule, the dev commands, and `Input` keeps its hint (items 11, 12) |
| `a8d6270` | the migration lint reads the working tree, not the commit — its own negative control found this |
| `4fb2de7` | the dispatch harness can name a changed count, not only count it |
| `7a0fe00` | the nonce channel is request scope, because a response header only covers a 2xx |
| `bee195b` | the bell and the list read the same window |
| `8ca4b07` | ruling 292's declaration, regenerated from a measured run of each engine |

## Rulings this PR produced (549 to 555)

Minted in review of the work, and each one is either implemented here or recorded in CLAUDE.md:

| | | Where it lives |
| --- | --- | --- |
| 549 | amends 545: the nonce is minted and held in worker request scope in a server-only module, not Pages middleware | `src/server.ts`, `src/lib/csp-nonce.server.ts`, CLAUDE.md |
| 550 | a non-2xx render carries the nonce in its policy as well as its markup | an arm in `tests/live-checks.cjs` |
| 551 | `connection_requests.expires_at` is minted here; 482 described intended rather than built behaviour | `supabase/migrations/20260913220000_…` |
| 552 | W58's cause is the router copying the outgoing scroller position forward | `src/router.tsx`, `src/components/dna/AppShell.tsx`, CLAUDE.md |
| 553 | a migration reaches canonical by `supabase db push`, never the MCP's `apply_migration`; extends 269 | CLAUDE.md |
| 554 | no push to a working branch while a calibration dispatch is in flight | CLAUDE.md |
| 555 | a handoff names the outcome, the ruling and the proof owed, never an unread mechanism | CLAUDE.md |
| 556 | the enforcing matrix runs on the final head and nothing is committed to the branch after it starts; sequences 554 | CLAUDE.md |

545 is amended rather than absorbed: what shipped is a different architecture from the one it described, and 549 is where that is recorded.

554 and 556 are both recorded against my own mistakes in this PR, and 556 is the sharper of the two. I pushed a documentation-only commit while an enforcing matrix was in flight, reasoning that it cost time and not validity. That was the wrong reading: the commit did not invalidate the run, it invalidated the run's subject, and run 194's result described a head that no longer existed. The rule that follows is to finish the branch — report and doctrine lines included — and only then let the run that will be cited start.

## Follow-ups, none of them in this PR

- **G19:** `connection_request` is still absent from the `notification_kind` enum. G19 recorded that as this PR's scope; the handoff's twelve items do not name it and DONE MEANS allows no schema beyond what the scope names. `tests/notifications.cjs` prints it on every run.
- **G19:** the notification list's empty state still promises two kinds that can no longer appear. Approved copy, no ruling supplies a replacement, left exactly as it is.
- **G22:** ruling 410's three template strings.
- **G23:** the expiry window, and applying the migration.
- **G17, unchanged and load-bearing here:** a fresh Supabase branch replays only the six `b1` migrations, so item 7's write proof is fixture-backed rather than replay-backed. Named in that item rather than presented as more than it is.
- `hasUnread` and `loadNotifications` both read the newest fifty rows and filter the kind client-side, because the registry can hold a kind the database enum does not. Beyond fifty unread suppressed rows the bell and the list agree with each other but not with the whole table. Consistent, bounded, and recorded here rather than fixed on my own initiative.
