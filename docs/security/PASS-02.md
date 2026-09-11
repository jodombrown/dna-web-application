# Security and privacy pass 02: the edges PASS-01 could not reach, and everything merged since

Session 14, 11 September 2026. Audit, not a build. Destination: Claude Code. Run against `main` at
`3c7e0e1` (after PR #26 merged) and against the canonical Supabase project `dgspjevjoblujcoljvkn`.
Ruling 364. Read `docs/security/PASS-01.md` first; this pass follows its method and report shape and
records only what is new.

## Nothing was changed, and nothing is severe enough to stop

No fix, no policy change, no migration, no schema change, no Supabase or Cloudflare configuration
change. **Nothing found here is severe enough to demand an immediate fix and stop.** Ruling 140
governs: the canonical project holds no real member data, so every finding below is a severity and,
where it matters, an invite-boundary gate, never a merge blocker, and none is described as a leak or
a breach. The most consequential single check — the SSRF review of `link-unfurl` — **passed** over
real HTTP against thirteen addresses it must refuse (Guardrails and scope E below), so there is no
stop-and-report condition.

The one repository change this pass makes is additive and outside the application: a workflow file,
`.github/workflows/security-pass-02-http.yml`, that runs the arms this environment cannot (below).
The report itself is the second and only other file.

Ruling 205 applies to the findings: where a pattern is claimed from a handful of observations it is
recorded as an observation. Ruling 228 applies to the arms: an arm that could not run is reported as
unproven, never as passing. Ruling 289 applies where a finding wants a ruling: it says so and leaves
the number blank.

### Where every check ran

Three surfaces. **SQL role-boundary**: `BEGIN … ROLLBACK` on the canonical project with
`set_config('request.jwt.claims', …, true)` to act as a named member or `anon`, evaluating the same
grant-and-policy logic PostgREST applies, but not PostgREST's own layer. **Real HTTP**: the
`security-pass-02-http` workflow job (run 2, `f86e2548`, job `103338398303`), on a GitHub runner with
open egress, against `https://dgspjevjoblujcoljvkn.supabase.co` with the publishable key and the
`MEMBER_` test account. **MCP/SQL introspection**: `pg_catalog`, `information_schema`,
`pg_policies`, `pg_proc`, `supabase_migrations` read directly. Every row in the scope-A table below
names which surface produced it. PASS-01's environment refused outbound HTTPS to the project and so
does this one (the agent proxy answers 403 to CONNECT for `dgspjevjoblujcoljvkn.supabase.co` and for
`*.pages.dev`); that is why the HTTP arms run as the committed workflow job.

### The write window, and its reversal

The only writes that cannot be rolled back are the media-upload EXIF measurement's storage objects
and `public.media` rows (scope D). They were made in one contiguous window and reversed:

- **Window: 2026-09-11 16:28:00Z to 16:28:13Z UTC** (run 2, the "Run the HTTP arms" step). Three
  images uploaded through the deployed `media-upload` as the `MEMBER_` account, each stored master
  fetched over HTTP and measured, then each storage object deleted by the same job (three
  `DELETE /storage/v1/object/profile-media/…`, status 200).
- The three `public.media` rows the function recorded (`336388a3…`, `93a67b3b…`, `e4accdf8…`, owner
  `7c496c63…`) were reversed from this session at 16:29 UTC (`DELETE … RETURNING id` returned all
  three). No member holds a delete on `public.media` by design, so this half is the auditor's.

**State counters, before and after** (the two lists differ, and every difference is Conformance
audit 01's, running concurrently against the same project — ruling 205, attributed, not mine):

| Counter | Before (15:53:20Z) | After (16:29:01Z) | Delta | Whose |
| --- | --- | --- | --- | --- |
| members | 7 | 8 | +1 | Conformance-01 (`40271e08`) |
| auth.users | 7 | 8 | +1 | Conformance-01 |
| media | 0 | 1 | +1 | Conformance-01 (`40271e08`, 16:09) |
| storage profile-media | 14 | 15 | +1 | Conformance-01 |
| shared / private | 1 / 0 | 1 / 0 | 0 | — |
| posts / attestations | 11 / 2 | 11 / 2 | 0 | — |
| member_blocks / connections / requests | 0 / 6 / 3 | 0 / 6 / 3 | 0 | — |
| member_visibility / edges / second_degree / notifications | 1 / 6 / 0 / 0 | 1 / 6 / 0 / 0 | 0 | — |
| storage post-media | 18 | 18 | 0 | — |

**This pass's own net footprint is zero**: its three media rows and three storage objects were
created inside the window and all six reversed. The residual `media = 1` row belongs to Conformance
audit 01 and was left untouched.

### Session open: `main`'s recent commits by author (ruling 286)

Every commit on `main` in range is authored by `jodombrown` (as `r17ghana@gmail.com` and, on merge
commits, as `Jaûne L Odombrown <jaunelamarro@icloud.com>`) or by `Claude <noreply@anthropic.com>`.
**No commit under any other identity, and no `gpt-engineer-app[bot]` (Lovable, app id 159125892)
commit in range.** Nothing to flag.

---

## 1. Scope A — PostgREST's own layer, over real HTTP

Every row ran over **real HTTP** (workflow run 2, `f86e2548`). `anon` uses the publishable key as
the bearer; `member` is the `MEMBER_` test account (`member-test`, handle `member-test`).

| Check | Request | Role | Response | Reading |
| --- | --- | --- | --- | --- |
| A1 private table | `GET /rest/v1/connect_settings?select=*` | anon | **404 PGRST205** "Could not find the table 'public.connect_settings'" | `private` table not routable |
| A1 private via Accept-Profile | `GET /rest/v1/connect_settings` + `Accept-Profile: private` | anon | **406 PGRST106** "Only the following schemas are exposed: public, graphql_public" | **`private` is not in the exposed schema set — proven over HTTP** |
| A1 private RPC | `POST /rest/v1/rpc/derive_username` | anon, member | **404 PGRST202** "Searched for the function public.derive_username … no match" | `private.derive_username` unreachable |
| A1 private RPC | `POST /rest/v1/rpc/third_party_label` | anon | **404 PGRST202** | `private.third_party_label` unreachable (F15 containment) |
| A2 RPC routing | `POST /rest/v1/rpc/profile_view` | anon | **200**, public projection of `thandiwe-dube` | intended (ruling 145) |
| A2 RPC routing | `POST /rest/v1/rpc/public_attestations` | anon | **200**, `role: null`, `attester: "the host"` | intended (ruling 141) |
| A2 RPC routing | `POST /rest/v1/rpc/{connect_cards, onboard_who, send_introduction}` | anon | **404 PGRST202** | not granted to `anon`; PostgREST hides them |
| A2 RPC routing | `POST /rest/v1/rpc/{vocabularies, onboarding_state, connect_where}` | anon | **401 42501** "permission denied for function" | granted to `authenticated` only |
| A3 embed | `GET /rest/v1/attestations?select=*,members(*)` | anon | **401 42501** "permission denied for table members" | embed does not widen; refused at grant |
| A3 embed | `GET /rest/v1/attestations?select=*,members(*)` (attester FK) | member | **403 42501** "permission denied for table members" | `members` has no table-level SELECT grant; `*` embed refused |
| A3 embed | `GET /rest/v1/media?select=*,members(*)` | member | **403 42501** | embed of `members` refused |
| A3 direct cols | `GET /rest/v1/members?select=id,name,handle,headline` | member | **200** identity columns | the 8-column grant (F1 fix), as designed |
| A3 direct cols | `GET /rest/v1/members?select=…,origin_country,current_country,stance` | member | **403/400** section-gated columns not in grant | section-gated columns not directly readable |
| **A4 count=exact** | `GET /rest/v1/members?select=id` + `Prefer: count=exact` | anon | **200**, `Content-Range: 0-0/1` | **exact total reaches the client (F18)** |
| **A4 count=exact** | `GET /rest/v1/members?select=id` + `Prefer: count=exact` | member | **206**, `Content-Range: 0-0/8` | **the platform member count reaches the client (F18)** |
| A4 count=exact | `attestations` | anon | `Content-Range: 0-0/2` | count reaches client |
| A4 count=exact | `member_about` | anon | `0-0/1` | count reaches client |
| A4 count=exact | `feed`, `posts` | member | `0-0/11`, `0-0/11` | counts reach client |
| A4 count=exact | `edges`, `member_connections` | member | `*/0`, `*/0` | own empty sets (no other member's total) |
| A4 count=exact | `member_skills` | member | `0-0/6` | count reaches client |
| A4 count=planned | `members` + `Prefer: count=planned` | anon | `0-0/2` | planner estimate also returned |
| A5 GraphQL | `POST /graphql/v1` `{ __typename }` | anon, member | **200**, `{"errors":[{"message":"pg_graphql extension is not enabled."}]}` | endpoint reachable but resolver inert |

**Reading of scope A.** Four results, three clean and one a finding. (1) `private` is genuinely not
exposed: the schema-set is `public, graphql_public`, so F15's containment, which PASS-01 could only
read from migration intent, is **now proven over real HTTP** — a caller cannot reach
`private.third_party_label` or any `private` object through PostgREST. (2) Embedded-resource
expansion never widens: `?select=*,members(*)` is refused at the grant layer in every direction,
because `members` carries only column grants, not a table SELECT, so the embed's `*` cannot resolve.
(3) `graphql_public` is exposed at the routing layer but `pg_graphql` is not installed, so the
resolver returns an error and no schema or data — a reachable endpoint with nothing behind it. (4)
The one finding: **`Prefer: count=exact` returns exact within-RLS row totals in `Content-Range` to
any caller**, including the whole-platform member count to a signed-in member (`0-0/8`) and the
shared-profile count to `anon` (`0-0/1`). That is a number reaching the client, and it is the
count-floor doctrine's blind spot. Recorded as **F18**.

---

## 2. Scope B, C, D — Realtime, Auth, Storage, each with evidence

### B. Realtime — nothing exposed (proven)

- The `supabase_realtime` publication has **`puballtables = false` and zero tables**
  (`pg_publication_tables` returns none). SQL introspection.
- The `realtime` schema exposes `messages`, `subscription`, `schema_migrations`; **`realtime` has no
  policies at all** (`pg_policies` where `schemaname = 'realtime'` → none), so no broadcast or
  presence channel is authorized. No table's changes are published, so Realtime is not a second read
  path on any member data. Where the answer is "nothing exposed," this is the proof.

### C. Auth and JWT

- **The `app_metadata.role = 'admin'` claim `private.is_admin()` trusts is not member-writable.**
  `is_admin()` body is `coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)`. **No
  function in `public`, `private`, `auth` or `storage` references `raw_app_meta_data`** (searched
  `pg_proc.prosrc`); the only trigger on `auth.users` is `handle_new_user`, which reads
  `raw_user_meta_data` for the display name only and never writes `app_metadata`. `admin` count in
  `auth.users`: **0**. `app_metadata` keys present across all users: `provider`, `providers` only.
  SQL introspection. No member-callable path can mint the admin claim.
- **Identity linking (rulings 234, 235) — unproven (ruling 228).** All eight `auth.identities` are
  `provider = email`; no Google or `linkedin_oidc` identity exists on the project, so "one address
  through both providers lands in one member" cannot be exercised. Consistent with ruling 278 / gap
  G11: no browser drives a real consent screen. Reported unproven, not passing.
- **Session lifetime, refresh-token rotation, the redirect allowlist — unproven from this session.**
  These live in GoTrue configuration, which no MCP tool or SQL reaches (rulings 239, 280, 342 say
  they must be verified at the consuming system's log, not a dashboard claim). `auth.refresh_tokens`
  shows 43 rows, none revoked, none with a parent, which is consistent with either single-use tokens
  not yet rotated or rotation off; it does not settle the question. Reported unproven.
- **Recovery route (ruling 240), re-read as merged.** `src/lib/recovery.ts` reads the recovery
  fragment before `createClient`, `src/routes/__root.tsx` `RecoveryGate` holds every route at
  `/reset/new` while a recovery is pending, and `reset_.new.tsx` shows the form only with a session,
  calls `updateUser({password})` then `signOut({scope:"others"})`. The URL fragment is never sent in
  a `Referer`, and `/reset/new` has no external link. Ruling 240 is closed in code, as ruling 282
  recorded. Client read.
- **Leaked-password protection (ruling 94).** The security advisor this run returned only the
  SECURITY DEFINER function warnings (the D089 projection pattern, working as designed) and **no
  leaked-password lint and no missing-RLS lint**. The toggle itself is a GoTrue setting not readable
  here; it remains ruling 94's accepted risk and an invite-boundary gate regardless of the advisor's
  silence.

### D. Storage and the media pipeline

- **`public.media`: three policies, owner-scoped.** `media_member_select` (`owner_id = auth.uid()`),
  `media_admin_select` (`private.is_admin()`), `media_service_role` (ALL). Grants: `authenticated`
  holds table SELECT (row-scoped by the policy to own rows); **`anon` holds no SELECT**. There is no
  member insert/update/delete policy — the sole writer is the `media-upload` function under the
  service role. SQL introspection. A member reads only their own `media` rows; `crop`/`focal_point`
  have no writer yet (ruling 348 pending).
- **`media-upload` at version 8, `verify_jwt = true` — EXIF stripping measured over real HTTP
  (rulings 347, 352).** Three images were uploaded through the deployed function as the `MEMBER_`
  account, each stored master fetched and scanned for the metadata it carried on the way in:

  | Input | Metadata carried in | Master bytes | Markers surviving in master | Stripped |
  | --- | --- | --- | --- | --- |
  | JPEG with GPS EXIF (`piexifjs`, lat/long + `Make`) | `Exif`, `DNA-AUDIT` | 293 | none | **yes** |
  | PNG with a `tEXt` chunk (GPS + device text) | `tEXt`, `DNA-AUDIT` | 86 | none | **yes** |
  | WebP with an appended `EXIF` chunk | `EXIF`, `DNA-AUDIT-EXIF` | 44 | none | **yes** |

  The function health endpoint reported `optimize: true, processor: true`, so Tinify also ran; the
  code strips unconditionally **before** the Tinify branch (`stripMetadata` on every path,
  independent of the `OPTIMIZE` flag), which is exactly what ruling 352 requires. Measured, not
  read: no GPS, EXIF, XMP or PNG text survived in any stored master. Rulings 347 and 352 hold.
- **Path and type handling.** The caller cannot choose the storage path: for `slot = avatar|cover`
  the path is `${uid}/${mediaId}.${ext}` and for a post it is `${uid}/${postId}/${uuid}.${ext}`,
  both prefixed by `auth.uid()`, and the storage RLS is folder-scoped to `foldername[1] = uid`, so a
  member cannot write outside their own folder. Type is sniffed from magic bytes
  (`image/jpeg|png|webp`) and a non-image is refused 415. Code read; path derivation confirmed in
  the D-phase results (every `storage_path` began with the member's own uid).
- **Signed transform URLs from `deliverImageUrl` (F21).** `src/lib/media.ts` signs every delivery
  URL for **3600 seconds** (`createSignedUrl(path, 60*60)`). A signed URL's signature is validated
  by Storage independent of RLS, so a URL minted while a profile was Shared keeps serving for up to
  an hour after the member turns Private. That is an audience change the URL outlives. Bounded to one
  hour and to avatar/cover imagery; recorded as **F21**, Low. (Not time-travel-measured over an hour;
  read from the TTL constant and Supabase signed-URL semantics.)
- **Buckets as merged.** `post-media` and `profile-media`, both **private**, each with a 10 MB file
  size limit and mime allow-list `{image/jpeg,image/png,image/webp}`. No bucket added since PASS-01;
  no `anon` policy on `post-media`; `profile-media` viewer select is
  `private.can_see_core(uuid_or_null(foldername[1]))` — row policy, not client filtering. SQL
  introspection.

---

## 3. Payload table for every function and Edge Function merged since PASS-01

PASS-01 section 2 shape. Payloads are enumerated from each function's own `jsonb_build_object` keys
and each Edge Function's `console.log` records. **Every function body below was matched to
`pg_proc.prosrc` by md5** (scope J); the read/write contract is the object the body builds.

### Read and write paths (SQL role-boundary + code)

| Path | Callable by | Security | Payload / behaviour |
| --- | --- | --- | --- |
| `profile_view(handle, as_public)` (B4A rebuild) | anon, authenticated, service_role | DEFINER | Adds `viewer_blocked` (the caller's own block of this member; the converse is never in the payload — B4A section 7). Directional block scope: the blocked party falls to the anonymous rule, the blocker keeps mutuals/anchored/DIA line (ruling 220). The five core-row attributes (`origin_country`, `current_place`, `current_country`, `local_tz`, `stance`, `stance_label`) are admitted by `admit_section` with the explicit viewer — F2 stays closed. `relationship` absent for a blocked pair |
| `onboard_who(name, username, avatar_path)` | authenticated, service_role | DEFINER | Returns `{status: ok|taken|invalid, username, suggestion, avatar_path, username_changes}`. Writes `name`, `handle`, `avatar_path`, `who_completed_at` on own row only; refuses `already complete`. `username_changes` (a number about the member's own behaviour) is returned. Existence check on `handle` ignores privacy and blocks (**F22**) |
| `onboard_where(city, country)` | authenticated, service_role | DEFINER | Returns `{status: ok, city, country}`. Validates country against `world_countries`, derives `local_tz`, writes own row; requires screen one complete |
| `onboard_relationship(stance, touched)` | authenticated, service_role | DEFINER | Returns `{status: ok, stance, stance_declared_at, onboarded_at}`. Only path that sets `onboarded_at`; a touched card writes `stance` + `stance_declared_at` |
| `onboarding_state()` | authenticated, service_role | DEFINER | Returns the caller's own onboarding state only: `next`, `who`, `where`, `relationship`, `onboarded_at`. Nothing about other members |
| `private.is_visible_stance_variant(member, stance)` | anon, authenticated, service_role | DEFINER | Boolean; own row, or `can_see_section(member,'stance')` and the member's current stance. Backs `member_stance_details` viewer policy |
| `private.stance_declared()` (trigger) | — | DEFINER | Before-update on `members.stance`: sets `stance_declared_at` when stance changes |
| `private.derive_username(name)` | (revoked from all API roles) | INVOKER, immutable | NFKD + strip combining marks + slugify to 40 chars; `null` when nothing survives. **Not routable over HTTP** (A1, proven). Returned `null` fallback removed (ruling 343) |
| `connect_cards`, `save_profile_section`, `connect_filter_options`, `vocabularies` (stance rename) | as PASS-01 | as PASS-01 | Same contracts; `segment` renamed to `stance` on the wire (`stance`, `stance_label`, `stances[]`). Members-lens `stance`/`location`/`origin` axes now check `admit_section` (F5 fix carried forward). No count, no score returned |
| `publish_post` (publish-path defects, rulings 287/288) | authenticated, service_role | INVOKER | D1/D2 fixes; the created-object and draft-deletion path. `post_links.url` inserted verbatim, no scheme validation (**F20**, client-side) |
| Direct table write: `public.media` | service_role only | RLS | No member write path; `media-upload` is the sole writer |

### Edge Functions — logged fields, one by one (code read)

**`onboarding`** (new; `verify_jwt` at the gateway). Emits the ruling-311 company-facing signal to
`console.log`, to the same log stream `connect-suggest` uses, never a new store:

- `onboarding_explainer_opened`: `{event, stance | null, entry_path}`
- `onboarding_write_refused`: `{event, screen (1|2|3), code, entry_path, latency_ms}`
- `onboarding_username_taken` / `onboarding_username_invalid`: `{event, screen: 1, entry_path}`
- `onboarding_screen_completed`: `{event, screen, entry_path, latency_ms}`, plus for screen one
  `{photo_set_here (bool), username_from_suggestion (bool), username_changes (number)}`, plus for
  screen three `{declared (bool), stance, time_on_screen_ms (number)}`
- `entry_path` is the auth provider decoded from the JWT `app_metadata.provider`. **Never logs a
  name, username, place, photo path, or id.** See F24 for the ruling-34 consequence.

**`connect-suggest`** (`verify_jwt`): `connect_suggest_no_candidates` `{event, latency_ms, error}`;
`connect_suggest_no_key` `{event}`; `connect_suggest_refusal` `{event, latency_ms}`;
`connect_suggest` `{event, candidates (count), rendered (count), latency_ms}`;
`connect_suggest_timeout` / `connect_suggest_error` `{event, latency_ms, status}`. **Never logs
names or facts**; the two counts stay server-side (stripped from the response). Calls
`connect_cards('suggested')` with the member's own JWT.

**`dia-compose-read`** (`verify_jwt`, deployed v10): `dia_rate_limited` `{event, latency_ms}`;
`dia_no_key` `{event, candidate_env_names[]}` (env var **names**, never values);
`dia_refusal` `{event, latency_ms}`; `dia_read` `{event, verb | null, latency_ms}`;
`dia_timeout` / `dia_error` `{event, latency_ms, status}`. **Never logs the composer text.** Reads
the composer's own free text only (the member's own content, ruling 8), not another member's message.

**`media-upload`** (`verify_jwt`, v8): `tinify_shrink_failed` / `tinify_fetch_failed` `{event,
status}`; `upload_failed` `{event, message}`; `media_row_failed` `{event, message}`;
`optimize_skipped` `{event, message}`; `media_uploaded` `{event, bucket, kind, bytes_in, bytes_out}`.
The success line carries no uid or path (bucket + kind + byte sizes only). The two `*_failed` lines
log a storage/DB error `message` which could contain a path fragment; minor, noted.

---

## 4. The six doctrine checks, answered across the whole set

1. **No number reaches a client — one breach, at the HTTP layer.** No projection returns a count,
   score, percentage, distance or `via_count`; `connect-suggest` strips its two counts;
   `connect_where` returns names, not counts. The exception is not in the SQL: **`Content-Range`
   totals reach the client for every member-readable table and view via `Prefer: count`** (F18,
   proven over HTTP), and `onboard_who`/`onboard_relationship` return the member's own
   `username_changes` count (about the caller, not another member). The doctrine holds in the
   projections and fails at PostgREST's count header.
2. **Nothing to an anonymous caller beyond the opted-in public projection — holds (proven over
   HTTP).** `anon` reaches exactly `profile_view` and `public_attestations` (200), and every other
   RPC returns 404 or 401; `anon` table SELECT is limited to the profile section tables, attestations
   and `members` (8 columns, `can_see_core`). The one residue is F7 (below), unchanged.
3. **Audience scope is row policy on every path — holds, with F21.** Realtime publishes nothing;
   Storage `profile-media` viewer select is `can_see_core` (row policy); the SSR shell renders `null`
   server-side so no `profile_view` JSON reaches signed-out HTML (client agent, section 2); embedded
   expansion is refused at the grant layer. The single gap is the one-hour signed URL outliving an
   audience change (F21).
4. **A third party never reaches a signed-out surface without their own opt-in — holds.**
   `public_attestations` applies `third_party_label(…, true)` and nulls the role unless
   `named_publicly`; `profile_view` mutuals are built only for a signed-in viewer. The raw
   `attestations` table remains the exception for `anon` (F7): an identifier and role, never a name.
5. **Blocks filter in both directions everywhere, including every function merged since — holds,
   except one oracle.** `posts_member_select` and `posts_event_host_select` both carry the block
   predicate (F4 fix, confirmed); every Connect projection filters `is_blocked`; the onboarding
   functions touch no other member's data — except `onboard_who`'s handle-existence check, which
   ignores blocks and privacy (F22).
6. **Grounded-or-empty at the data layer — holds.** `connect_where` applies the floor of five and
   returned nothing where the floor is unmet; Suggested filters `hits > 0`; onboarding renders only
   what was saved; `media` and the vocabularies return `[]` rather than a literal.

---

## 5. Findings from F18, and the status of every open PASS-01 finding

Ruling 140's language: severity and, where it matters, an invite-boundary gate. New gates continue
from **IB-11**. None blocks a merge.

| # | Finding | Severity | Gate | Where it ran |
| --- | --- | --- | --- | --- |
| **F18** | `Prefer: count=exact` (and `count=planned`) returns exact within-RLS row totals in `Content-Range` to any caller: the platform member count `0-0/8` to a signed-in member, `0-0/1` to `anon`, plus `feed`/`posts` `0-0/11`, `attestations` `0-0/2`, `member_skills` `0-0/6`. A number reaching the client, past the floor-of-five and past ruling 30's "no public member-count claim". The projections never do this; PostgREST's count header does | **Medium** | **IB-11** | real HTTP |
| **F19** | No security headers are served: the repository has no `public/_headers`, and `vite.config.ts` / `wrangler.jsonc` / nitro set no CSP, X-Frame-Options, Referrer-Policy, HSTS, X-Content-Type-Options or Permissions-Policy (client agent). A CSP is the mitigation F20 would need and there is none | **Medium** | **IB-12** | repo/code; live Cloudflare header set **unproven** (proxy blocks `*.pages.dev` from this session) |
| **F20** | `post_links.url` renders as a navigable `<a href={src}>` in `MediaBlock.tsx` with no protocol filter, and `publish_post` stores the URL verbatim (no `https?://` check). A crafted link card can carry a `javascript:` URL that runs in-origin on click. `LinkRow.tsx` (profile website) prepends `https://`, so that path is safe; the post link card is not | **Medium** | **IB-13** | code read (client agent) |
| **F22** | `onboard_who` is a username-existence oracle. Live (SQL role-boundary): with a target set Private, `profile_view` returned `null` (identical to an unknown handle) while `onboard_who(..., 'that-handle')` returned `{status: taken}`. Available to any signed-in, not-yet-onboarded caller, ignores privacy and blocks, and has no rate limit, so a guessed handle's existence — including a Private or unshared member's — is confirmable | **Medium** | **IB-14** | SQL role-boundary |
| **F21** | `deliverImageUrl` signs every delivery URL for 3600 s; a URL minted while a profile was Shared keeps serving for up to an hour after the member turns Private, an audience change the URL outlives. Bounded to one hour, avatar/cover only | **Low** | IB-15 | code + Storage semantics |
| **F23** | No server-side rate limit on `send_introduction`, `dismiss_suggestion`, the `member_blocks` insert, `onboard_who`, or `media-upload`. The in-memory limiters in `dia-compose-read` (30/min) and `connect-suggest` are per-isolate and reset on cold start, so they bound a warm instance only. Enumeration cost (F22) and upload/abuse cost are effectively unbounded | **Low** (Medium at scale) | IB-16 | code read |
| **F24** | The `onboarding` Edge Function emits the ruling-311 company-facing signal (screen completed, time-on-screen, stance declared vs default, photo/username set here vs later, provider entry path) while ruling 34's consent and de-identification mechanism does not yet exist. The app-authored record carries no name, id, place or handle, but it is written to request-scoped edge logs that carry the caller's JWT `sub`, so correlation to a member id is possible by anyone with log access | **Low** | IB-17 | code read |

No finding rises to High. F18, F19, F20 and F22 are the four worth closing before the first invite.

**F15 status change.** PASS-01 held F15 (the `anon`-granted `third_party_label` with a
caller-supplied `p_public`) as Low defence-in-depth "unproved over HTTP." This pass **proves the
containment over real HTTP**: `Accept-Profile: private` returns 406 "Only the following schemas are
exposed: public, graphql_public," and `POST /rest/v1/rpc/third_party_label` returns 404. The path is
closed; F15 is now defence-in-depth behind a proven boundary rather than an unproven assumption.

### Status of the other open PASS-01 findings (one line each)

| # | Status |
| --- | --- |
| **F7** | **Still open, Medium (IB-7).** `anon` holds SELECT on `attestations` including `attester_member_id` and `attester_role`; the raw table hands an anonymous caller a third party's identifier and role (never a name). Confirmed by grant + policy this pass |
| **F9** | **Still open for Brief 6.** `events_member_select` still admits any event named by a visible post to every signed-in member in full, `virtual_url` and `host_member_id` included; `spaces`, `opportunities`, `stories` share the branch. No audience of its own yet — this is the fact Brief 6 (Convene) inherits |
| **F10** | **Still open, Low (Medium at scale).** Of the five chassis policy columns, `spaces.owner_member_id`, `events.host_member_id`, `opportunities.receiver_member_id`, `stories.author_member_id` remain unindexed; `attestations.attester_member_id` is still only the trailing column of a composite unique key. No migration this pass |
| **F11** | **Still open, Low.** `notifications_actor_select` still lets the actor read the row their action produced, including the recipient's `read_at` (an unintended read receipt) |
| **F12** | **Still open, Low (observation).** A member can enumerate and therefore count their own second-degree set, connections and follows; F18 now also gives them the exact totals via `Content-Range` on their own rows |
| **F13** | **Still open, Low.** `feed` returns `created_by` (naming the Space role holder who published) and `audience` to the client |
| **F14** | **Still open, Low (observation).** `connect_where` scopes its floor count by the viewer's blocks, so blocking one member and watching a tile vanish reveals a country sat at exactly the floor |
| **F15** | **Contained, proven over HTTP** (above). Downgraded from "unproved" to defence-in-depth behind a proven schema boundary |
| **F17** | **Still open, Low.** Two stores still answer "is following" (`member_follows` for `profile_view`, `edges` for `connect_card`), kept in step by one trigger; recorded so a future `edges` writer that bypasses it is caught |

---

## 6. Tree against database (scope J)

Measured, not asserted. Function bodies compared by md5 of `pg_proc.prosrc` against the last
definition of each function in the migration tree; migration versions compared against
`supabase_migrations.schema_migrations`.

### Function bodies

**56 of 59 comparable functions match by md5.** The three that do not are not behavioural drift:

- `private.derive_username` — the applied body stores the combining-mark character class as **literal
  Unicode characters**, while the committed `r343` migration writes the same class as `\uXXXX`
  **escape sequences**. Postgres's ARE regex interprets both identically, so the fold is the same;
  the stored source and the committed source differ byte-for-byte. A `db reset` from the repo would
  store the escaped form and produce a different md5. Observation, not a security finding.
- `private.on_member_blocked` — the applied body has **no source comments**; the committed `r198`
  file carries three explanatory `--` comments. Same edges-revoke, adjacency-delete, follow-delete,
  `rebuild_second_degree_for` logic; only the comments differ. A `db reset` would store the commented
  form. Observation.
- `public.rls_auto_enable` — present in the database, **absent from the repo as a definition**: it is
  Supabase's automatic-RLS event-trigger function, created by the project setting, and the repo
  correctly only revokes its EXECUTE (`b1_lock_rls_auto_enable`). Not drift.

Two functions exist in old migrations but not in the database (`profile_vocabularies`,
`is_visible_segment_variant`), both dropped and renamed by later migrations (`vocabularies`,
`is_visible_stance_variant`). Expected, historical.

### Migrations

**27 repo migration files; 28 recorded rows.** Names align one-to-one except:

- **`r198_profile_view_block_scope` (recorded version `20260909051113`) has no standalone repo
  file** — the repo folds it into `20260909150000_r198_block_semantics.sql`. Final schema state is
  unaffected (profile_view is later replaced by B4A and B5), but the DB records two r198 migrations
  where the repo carries one.
- **20 of 27 repo filenames carry a leading timestamp that differs from the recorded version**
  (e.g. repo `20260906170000_b1_enums` vs recorded `20260906173303`); only 7 match (fix_pr_01, r229,
  publish_path_defects, b5_stance_onboarding, r343_username_fold, and the two that align by
  coincidence). Ruling ac0089b ("the migration carries the version the project recorded when it was
  applied") was applied to the later migrations but not retrofitted to b1–b4a. Operational
  consequence: a `supabase db push` from a clean checkout would treat those 20 as unapplied and try
  to re-run them, because push matches by version string. The canonical database is managed by hand,
  not by push, which is why this has not surfaced; recorded so it is not mistaken for cleanliness.
- **Two recorded migrations carry empty `statements`**: `fix_pr_01_rulings_212_216`
  (`20260909160000`) and `r229_withdraw_renders_as_sent` (`20260909170000`) both store the md5 of the
  empty string. The repo files carry their full content (12 and 3 function definitions), and those
  function bodies are among the 56 that match `pg_proc` by md5, so the objects are present and
  correct; only the `schema_migrations.statements` text is empty. This is the ruling-225 aftermath
  recorded in PASS-01's addendum: the fix was applied live and the migration repaired into the table
  without its statement text. A replay from `schema_migrations` alone would not recreate them; a
  replay from the repo would.

### What scope J did not cover, and why

- **Edge Function source vs deployed bundle** was not md5-compared: the deployed bundles are served
  as `ezbr_sha256` archive hashes (`media-upload` v8, `dia-compose-read` v10, `link-unfurl` v4,
  `connect-suggest` v1, `onboarding` v1), not as readable source through any tool here, so a
  byte-comparison against `supabase/functions/*/index.ts` could not be run. The deployed **behaviour**
  of `media-upload` and `link-unfurl` was measured directly over HTTP (scopes D, E) instead.
- **Row data** was not compared; the pass compares schema and function definitions, not table
  contents, and Conformance audit 01 was mutating rows concurrently.

---

## 7. Guardrails, and what this pass committed

- **[absolute] Nothing was fixed.** Findings only. No schema, policy, migration or configuration
  change in Supabase or Cloudflare.
- **The HTTP arms ran over real HTTP.** Scope A, the `link-unfurl` SSRF probes (scope E) and the
  media-upload EXIF measurement (scope D) ran on a GitHub runner via
  `.github/workflows/security-pass-02-http.yml` (run 2, `f86e2548`), because this session's proxy
  refuses `dgspjevjoblujcoljvkn.supabase.co`. No role-boundary check is labelled HTTP; every row in
  section 1 names its surface.
- **Scope E, stated as a result (ruling 190).** `link-unfurl` refused all thirteen probes over real
  HTTP — `169.254.169.254` (cloud metadata), `127.0.0.1`, `localhost`, `[::1]`,
  `metadata.google.internal`, `100.100.100.200`, `2130706433` (decimal 127.0.0.1), `0177.0.0.1`
  (octal), `file:///etc/passwd`, `gopher://127.0.0.1:6379/`, `192.168.0.1`, `10.0.0.1`, `[fd00::1]`
  — each returning `null`, while the public control `https://example.com/` returned a title. No SSRF
  finding.
- **The two state lists are recorded** above, with the one contiguous write window (16:28:00Z to
  16:28:13Z) and its reversal. This pass's net footprint is zero; the residual delta is Conformance
  audit 01's.
- The closing report states results, not that a check is running (ruling 190).

## Closing

The pass is complete and its results are stated above. Seven findings numbered from F18: **zero
High, four Medium (F18, F19, F20, F22), three Low (F21, F23, F24)**, becoming gates IB-11 to IB-17,
plus F15 downgraded to contained. The nine open PASS-01 findings each carry a status line; F9 keeps
its shape for Brief 6.

The shape this pass set out to find — material reaching the client without passing the audience
predicate — appears once and not in the SQL: PostgREST's `Content-Range` count header hands the
client exact within-RLS totals the projections were careful never to return (F18). Everything the
projections themselves build is sound: `private` is genuinely unexposed over HTTP, embedded
expansion cannot widen a read, Realtime publishes nothing, the SSRF guard holds against every probe,
and EXIF is stripped from every stored master unconditionally. The remaining findings live at the
edges the projections do not own — the transport's count header (F18), Cloudflare's absent CSP
(F19), an unfiltered link URL rendered in the client (F20), a pre-onboarding existence oracle (F22),
a signed URL's lifetime (F21), absent rate limits (F23), and telemetry that precedes its consent
mechanism (F24). None blocks a merge; four should close before the first real member invite.
