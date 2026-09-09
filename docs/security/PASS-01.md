# Security and privacy pass 01: chassis and Connect, read in one sitting

Session 13, 9 September 2026. Audit, not a build. Run before Brief 5, against `main` at 11d1819 and
against the canonical Supabase project `dgspjevjoblujcoljvkn`.

## Nothing was changed

No fix, no policy change, no migration, no schema change. Two candidate fixes were obvious while
reading and neither was written. Every live check ran inside an explicit transaction that was rolled
back, and the database is in the state it was in before this pass began; the closing state check is
recorded under **Live method** below.

**Nothing found here is severe enough to stop and demand an immediate fix.** Ruling 140 governs: the
canonical project holds six member rows, none of them a real member, so every finding below is a
severity and an invite-boundary gate, never a merge blocker, and none is described as a leak or a
breach. Four findings are High and become gates IB-1 to IB-4, which must close before the first real
member invite; the fix PR should be reviewed against this report rather than arriving with it.

Ruling 205 applies to the findings themselves. Where a pattern is claimed from a handful of
observations it is written as an observation, not asserted as a rule.

---

## 1. Every table: RLS, default deny, what each policy permits, and index coverage

48 tables in `public`. **RLS is enabled on all 48**, verified live against `pg_class.relrowsecurity`.
None sets `FORCE ROW LEVEL SECURITY`, which matters only for the table owner and is not a finding.
Every table is default-deny: Postgres denies a row that no policy admits, no table carries a
`USING (true)` policy for `authenticated` except the reference vocabularies and `public.members`
(finding F1), and `anon` holds `SELECT` on only fifteen tables.

Nine policy patterns recur. They are defined once here and named in the table.

| Pattern | What it permits |
| --- | --- |
| **P-own** | `member_id = auth.uid()` (or the role-specific owning column). Own rows only. |
| **P-section** | `private.can_see_section(member_id, '<section>')` for `authenticated` **and** `anon`: owner always; nobody if `profile_private`; anonymous only when `profile_shared` **and** the section audience is `everyone`; otherwise `everyone` / connected / shares-an-anchor per the stored audience. |
| **P-owner-write** | `INSERT`/`UPDATE`/`DELETE` gated on `member_id = auth.uid()`. |
| **P-admin-r** | `SELECT USING (private.is_admin())`, JWT `app_metadata.role = 'admin'`. |
| **P-admin-d** | `DELETE USING (private.is_admin())`. |
| **P-svc** | `FOR ALL TO service_role USING (true) WITH CHECK (true)`. |
| **P-ref** | `SELECT TO authenticated USING (true)`. Reference vocabulary, no member data. |
| **P-party** | Either end of a pair: `a = auth.uid() OR b = auth.uid()`. |
| **P-none** | No policy for `authenticated` at all beyond admin; members match no row. |

Index column names in the last column are the columns the policy filters on. "PK" means the
primary-key index leads with that column and serves the policy.

### Chassis: composer, Feed, notifications (Briefs 1 and 2)

| Table | RLS | Default deny | Policies, and what each permits | Filter columns indexed |
| --- | --- | --- | --- | --- |
| `posts` | on | yes | 11. `posts_member_select`: published **and** (`audience='everyone'`, or `'connections'` with `private.is_connected(author_id, uid)` for a member author / `is_space_member` for a Space author, or `'anchored'` with `private.can_see_anchor`), **or** `created_by = uid`, **or** own member-authored rows. `posts_member_insert`: `c_category <> 'system'`, `created_by = uid`, `private.can_author_as`. `posts_member_update`/`_delete`: own member-authored rows, never to `system`. `posts_space_lead_select`/`_update`/`_delete`: `private.is_space_lead(author_id)`. `posts_event_host_select`: published, anchored to an event they host. P-admin-r, P-admin-d, P-svc | `author_kind,author_id` ✓ `created_by` ✓ `anchor_kind,anchor_id` ✓ `status` ✓ (partial) `audience` ✗ (low-cardinality enum, not a defect) |
| `feed` (view) | n/a | inherits | `security_invoker=true`, verified live. Every row passes the caller's `posts` policies. `SELECT` to `authenticated`, revoked from `anon` | inherits `posts` |
| `post_media` | on | yes | 6. Member select: `EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id)`, so visibility is inherited from `posts` RLS, not duplicated. Insert/delete: `private.is_post_author`. P-admin-r, P-admin-d, P-svc | `post_id` ✓ (unique `post_id,position`) |
| `post_links` | on | yes | 6. Same shape as `post_media` | `post_id` ✓ (unique) |
| `post_dia` | on | yes | 3. Insert: `private.is_post_author`. Select: **admin only**. P-svc. A member holds the `SELECT` grant and matches no row | `post_id` ✓ (unique) |
| `post_drafts` | on | yes | 5. P-own ×4, P-svc. No Space lead, event host or admin read | `member_id` ✓ (unique `member_id,host_context`) |
| `post_saves` | on | yes | 6. P-own select/delete; insert also requires the post to exist and be published. P-admin-r, P-admin-d, P-svc. No aggregate read path exists | `member_id` ✓ (PK) |
| `post_reactions` | on | yes | 6. Identical to `post_saves` | `member_id` ✓ (PK) |
| `notifications` | on | yes | 6. `notifications_recipient_select`/`_update`: `recipient_member_id = uid`; `UPDATE` is a column grant on `read_at` alone. `notifications_actor_select`: `actor_kind='member' AND actor_id = uid` — the actor reads rows their own action produced, including the recipient's `read_at` (F11). P-admin-r, P-admin-d, P-svc | `recipient_member_id` ✓ `actor_kind,actor_id` ✓ |
| `spaces` | on | yes | 8. Member select: owner, active role holder, **or** any Space named by a post the caller can see. Insert/update: owner. Lead update: `is_space_lead`. P-admin-r, admin update, P-admin-d, P-svc | `owner_member_id` **✗ (F10)** `id` ✓ |
| `space_roles` | on | yes | 9. Member select: own rows or fellow active members. Member insert: own row on a Space they own. Member update: own row (leave). Lead insert/update/delete. P-admin-r, P-admin-d, P-svc | `member_id` ✓ `space_id` ✓ (unique `space_id,member_id`) |
| `events` | on | yes | 10. Member select: Space members, **or** any event named by a post the caller can see (F9). Member insert: self-host. Host select/update/delete. Lead update. P-admin-r, admin update, P-admin-d, P-svc | `space_id` ✓ `host_member_id` **✗ (F10)** |
| `opportunities` | on | yes | 9. Member select: receiver, Space member, or named by a visible post. Member insert/update/delete: receiver. Lead update. Host select via `event_id`. P-admin-r, P-admin-d, P-svc | `space_id` ✓ `receiver_member_id` **✗ (F10)** `event_id` ✗ |
| `stories` | on | yes | 7. Member select: author, or named by a visible post. P-owner-write ×3. P-admin-r, P-admin-d, P-svc | `author_member_id` **✗ (F10)** |
| `connection_requests` | on | yes | 5. `connection_requests_recipient_select`: `to_member_id = uid AND status <> 'withdrawn'`. **The sender has no select at all** (ruling 157; B1's `_member_select`, `_member_update`, `_member_delete` were dropped and `UPDATE`/`DELETE` revoked in the B4 migration). `connection_requests_member_insert`: `from_member_id = uid AND status='pending'`, kept for `publish_post`. P-admin-r, P-admin-d, P-svc | `to_member_id,status` ✓ `from_member_id,status` ✓ plus two partials for pending and declined ✓ |

### Profile and the vocabularies (Brief 3)

| Table | RLS | Default deny | Policies, and what each permits | Filter columns indexed |
| --- | --- | --- | --- | --- |
| `members` | on | **weak** | 6. `members_owner_select`/`_update`: own row. **`members_member_select`: `USING (true)`** — every signed-in member reads every row, and the `authenticated` grant covers every column including `profile_private`, `profile_shared`, `identified_at`, `updated_at` (**F1**). `members_anon_select`: `USING (profile_shared)`, with a 13-column grant (`identified_at`, `created_at`, `updated_at`, `profile_private`, `profile_shared` excluded). P-admin-d, P-svc | `id` ✓ `handle` ✓ `profile_shared` ✓ (partial `members_shared_idx`) |
| `member_about` | on | yes | 6. P-section (`about`), P-owner-write ×3, P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_origin` | on | yes | 6. P-section (`origin`), P-owner-write ×3, P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_intent` | on | yes | 6. P-section (`intent`), P-owner-write ×3, P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_links` | on | yes | 6. P-section (`links`, default `connections`), P-owner-write ×3, P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_segment_details` | on | yes | 6. P-section (`segment`) **and** only the variant matching `members.segment`, unless the caller is the owner. P-owner-write ×3, P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_focus_areas` | on | yes | 5. P-section (`work`), owner insert/delete, P-admin-r, P-svc | `member_id` ✓ (PK) `name` ✓ |
| `member_industries` | on | yes | 5. P-section (`work`), as above | `member_id` ✓ `name` ✓ |
| `member_regional_expertise` | on | yes | 5. P-section (`work`), as above | `member_id` ✓ `name` ✓ |
| `member_skills` | on | yes | 5. P-section (`skills`), as above | `member_id` ✓ `name` ✓ |
| `member_languages` | on | yes | 5. P-section (`languages`), as above | `member_id` ✓ `name` ✓ |
| `member_intents` | on | yes | 5. P-section (`intent`), as above | `member_id` ✓ `name` ✓ |
| `member_interests` | on | yes | 5. P-section (`segment`), as above | `member_id` ✓ `name` ✓ |
| `member_visibility` | on | yes | 6. P-own ×4 — nobody but the owner reads the audience settings, so a hidden section leaves no trace, not even its setting. P-admin-r, P-svc | `member_id` ✓ (PK) |
| `member_follows` | on | yes | 4. `member_follows_follower_select`: `follower_id = uid` only; **the followed member never reads a follower row** (ruling 118). Insert and delete policies were dropped in B4 and the grants revoked: the only writer is the `edges` mirror trigger. P-admin-r, P-admin-d, P-svc | `follower_id` ✓ (PK) `member_id` ✓ |
| `attestations` | on | yes | 5. `attestations_party_select`: attested member or attester. `attestations_viewer_select` (**`authenticated` and `anon`**): `can_see_section(member_id,'badges') OR can_see_section(member_id, <c_category>)`. P-admin-r, P-admin-d, P-svc. **No member insert, update or delete path anywhere** — append-only for members, service role writes (ruling 47 guardrails 1, 2, 7) | `member_id` ✓ `attester_member_id` **✗ (F10)** — it is the trailing column of the 4-column unique index and cannot lead a scan |
| `focus_areas`, `industries`, `regional_expertise`, `skills`, `languages`, `intents`, `interests`, `countries`, `world_countries` | on | yes | 2 each: P-ref, P-svc. `anon` holds no `SELECT` on any of them | PK on `name` ✓ |

### Connect (Brief 4)

| Table | RLS | Default deny | Policies, and what each permits | Filter columns indexed |
| --- | --- | --- | --- | --- |
| `edges` | on | yes | 4. `edges_member_select`: `from_id = uid` **or** (`edge_type <> 'follow'` and `to_id = uid`) — a follow is the follower's alone. P-admin-r, P-admin-d, P-svc. **No member write path**; `set_follow` and the accept trigger write | `from_id,edge_type` ✓ `to_id,edge_type` ✓ |
| `member_connections` | on | yes | 4. P-party, P-admin-r, P-admin-d, P-svc. Written by trigger only, no member grant | `member_id` ✓ (PK) `other_id` ✓ |
| `second_degree` | on | yes | 3. P-own select, P-admin-r, P-svc. The `authenticated` grant is **column-scoped to `member_id, fof_id, refreshed_at`**; `via_count` and `sample_via_ids` are withheld and a read of either is refused (verified live) | `member_id` ✓ (PK) `fof_id` ✓ |
| `dismissed_suggestions` | on | yes | 5. P-own select/delete; insert also requires `NOT private.is_blocked(uid, dismissed_id)`. P-admin-r, P-svc | `member_id` ✓ (PK) |
| `corridors` | on | yes | 2. P-ref, P-svc. Zero rows | PK ✓ |
| `member_corridors` | on | yes | 3. P-own select, P-admin-r, P-svc. Another member's corridor line arrives only through `connect_card` | `member_id` ✓ (PK) `corridor_id` ✓ |
| `member_embeddings` | on | yes | 2. P-admin-r, P-svc. **P-none for members**, and the `authenticated` grant carries no `SELECT` at all. Zero rows (ruling 153) | PK ✓ |
| `member_blocks` | on | yes | 6. P-own select/insert/delete on `blocker_id`; the blocked member never learns the row exists. P-admin-r, P-admin-d, P-svc. The `authenticated` grant carries `INSERT` and `DELETE` (**F8**) | `blocker_id` ✓ (PK) `blocked_id` ✓ |
| `member_segments` | on | yes | 2. P-ref, P-svc. Four label rows, no member data | PK ✓ |
| `private.connect_settings` | n/a | n/a | Schema `private` is not in PostgREST's exposed schema set, so it has no API surface and carries no policy. `where_floor = 5`, `decline_window_days = 90` | PK ✓ |

### Storage

| Bucket | Policies |
| --- | --- |
| `post-media` (private) | 4. Member select: own folder **or** `EXISTS (SELECT 1 FROM posts p WHERE p.id::text = foldername[2])`, so `posts` RLS decides. Member delete: own folder. Admin select. Service role all. **No `anon` policy** |
| `profile-media` (private) | 4. Viewer select (**`authenticated` and `anon`**): `private.can_see_core(foldername[1])` — every signed-in member for any member, anonymous for a shared profile. Owner delete. Admin select. Service role all. No member insert: uploads are the `media-upload` function's |

### Index summary

Ruling 115 requires indexed policy columns. Five are missing, all on chassis tables written in
Brief 1 and Brief 3: `spaces.owner_member_id`, `events.host_member_id`,
`opportunities.receiver_member_id`, `stories.author_member_id`, `attestations.attester_member_id`.
Recorded as **F10**. Everything Connect added is covered.

---

## 2. Every projection and write path, its full payload, and who may call it

Payloads are enumerated from each function's own `jsonb_build_object` keys and `RETURNS TABLE`
column list, not from what a caller happens to read. Every one of these returns `jsonb` or `void`,
so the SQL return type alone says nothing; the object the body builds is the API contract.

`anon` holds `EXECUTE` on exactly two functions in `public`, verified against `pg_proc.proacl`:
`profile_view` and `public_attestations`. Calls to `connect_cards` and `vocabularies` as `anon` were
refused live with `42501 permission denied for function`.

### Reads

| Projection | Callable by | Payload, field by field |
| --- | --- | --- |
| `profile_view(handle, as_public)` → jsonb | `anon`, `authenticated`, `service_role`. Returns `NULL` for a handle that does not exist **and** for an unshared profile read anonymously, so existence is not disclosed | `viewer` (`owner`/`member`/`anon`); `member.{id, handle, name, headline, avatar_path, cover_path, cover_focus, origin_country, current_place, current_country, local_tz, segment, segment_label, pattern, tier}` — **built unconditionally, no section gate (F2)**; `switches.{private, shared}` owner only; `private` bool; `sections.{about, segment, origin, where, work, skills, languages, intent, links, convene, collaborate, contribute, convey}` each gated on `private.admit_section`; `badges[].{c, items[].{object, attester, role, when}}` with `attester` through `private.third_party_label` and `role` nulled for an un-opted-in third party on the signed-out surface; `visibility` owner only; `relationship.{state, following}` absent for a blocked pair (ruling 198); `mutuals[].{name, handle, avatar_path}`; `shared_spaces[]` titles; `anchored` bool; `dia_line` string |
| `public_attestations()` → jsonb | `anon`, `authenticated`, `service_role` | `{convene|collaborate|contribute: [{member, handle, avatar_path, object, attester, role, when, c, object_kind, object_id}]}`, twelve per C. `member`/`handle` only where `profile_shared AND NOT profile_private` **and** the Badges audience is `everyone`; `attester` through `third_party_label(..., true)` and `role` null unless the attester shares publicly. `object` is an event, Space or opportunity **title**, returned to an anonymous caller with no check on that object's own visibility |
| `vocabularies()` → jsonb | `authenticated`, `service_role`. `SECURITY INVOKER`. Not `anon` | `focus[]`, `industries[]`, `regions[]`, `skills[]`, `languages[]`, `intent[]`, `interests[]`, `countries[]`, `world[]`, `segments[{value,label}]`, `heritage[]`, `pathway[]`, `timeline[]`, `instrument[{value,label}]`. Reference data only, no member data |
| `connect_cards('members', filters, cursor, limit)` → jsonb | `authenticated`, `service_role`. `NULL` when `auth.uid()` is null | `{items: [card], next_cursor}`. Card: `id, handle, name, avatar_path, identified (bool), headline, segment_label, place, origin, heritage, corridor_label, chips[], badges[], mutuals[{name, avatar_path}], rel, following`. `heritage` gated on the Origin section; `chips` gated on Work and Skills; **`place`, `origin`, `segment_label` and `headline` are not gated (F2)**. `next_cursor` is `name\|uuid`. No count, no score |
| `connect_cards('suggested', …)` | as above | `{items: [card + facts]}`. `facts.{events[], spaces[], corridors[], overlap.{focus,industries,regions,skills,languages}, mutuals[]}` — words only, each vocabulary overlap gated on the owner's section audience. The internal `hits` rank is computed in the query and **never returned** |
| `connect_cards('network')` | as above | `{requests: [card + message], sent: [card with rel forced to 'sent'], connections: [card], following: [card]}`. `message` is the sender's own introduction text. No status column reaches the sender |
| `connect_where()` → jsonb | `authenticated`, `service_role` | `{continent: [country name], diaspora: [country name]}`. Countries at or above `private.setting_int('where_floor', 5)` counted within the viewer's block scope. **The count never leaves the database.** Returned `{"continent":[],"diaspora":[]}` live — the floor is not met |
| `connect_filter_options()` → jsonb | `authenticated`, `service_role` | `segments[{value,label}]`, `locations[]`, `origins[]`, `heritage[]`, `pathway[]`, `corridors[{id,label}]` (empty until seeded, ruling 154), `focus[]`, `industries[]`, `skills[]`, `regions[]`. Reference data only |
| `connection_request_intros(ids)` → table | `authenticated`, `service_role` | `id, from_member_id, to_member_id, to_name, why, message, created_at`. Scoped to `from_member_id = uid OR to_member_id = uid` **and** `NOT private.is_blocked(from, to)` (ruling 186). **No `status`, no `responded_at`** |
| `public.feed` (view) | `authenticated`, `service_role` | `select p.*`: `id, author_kind, author_id, created_by, c_category, body, anchor_kind, anchor_id, created_object_kind, created_object_id, audience, status, published_at, created_at`. `created_by` on a Space post names the role holder who pressed Publish (F13); `audience` reaches the client |

### Writes

| Write path | Callable by | Security | What it accepts, and what it returns |
| --- | --- | --- | --- |
| `publish_post(payload)` | `authenticated`, `service_role` | **INVOKER** — every insert runs under the caller's own policies | Validates verb, author rights via `private.can_author_as`, anchor pairing, anchored-needs-anchor, non-empty. Creates the verb's object, the post, media, link, DIA record; deletes the draft. Returns the post `uuid` and nothing else. It is the **second writer into `connection_requests`** alongside `send_introduction` (F16) |
| `save_profile_section(section, payload)` | `authenticated`, `service_role` | **INVOKER** | Fourteen sections. Enforces caps (3/3/3/5/6/3/5) and vocabulary membership server-side, rejects an avatar or cover path outside the caller's own folder, validates the time zone and the country against `world_countries`. `handle` and `identified_at` are excluded from the `UPDATE` column grant, so neither is ever a member's to write. Returns `void` |
| `send_introduction(recipient, message)` | `authenticated`, `service_role` | DEFINER | Requires 1–300 chars, a real recipient, `NOT is_blocked`, and `relationship_state = 'none'`. One refusal message for every reason, so a window refusal is indistinguishable. Returns the request `uuid` |
| `respond_to_request(sender, accept)` | `authenticated`, `service_role` | DEFINER | Updates only a `pending` row addressed to the caller. Accept fires two triggers: `connection_accepted` notification to the requester, and the connect edges plus both adjacency rows. Decline writes nothing else. Returns `void` |
| `withdraw_request(recipient)` | `authenticated`, `service_role` | DEFINER | `pending` → `withdrawn`; the recipient policy excludes `withdrawn`, so the row leaves their Requests. Returns `void` |
| `set_follow(target, on)` | `authenticated`, `service_role` | DEFINER | On: refuses a blocked pair, inserts a `follow` edge. Off: sets `revoked_at`. The mirror trigger keeps `member_follows` in step. Silent no-op rather than an error. Returns `void` |
| `dismiss_suggestion(target)` | `authenticated`, `service_role` | DEFINER | Own row, permanent, applied as an anti-join in Suggested. Returns `void` |
| Direct table write: `member_blocks` INSERT/DELETE | `authenticated` | RLS | Not an RPC. Any signed-in member may insert `blocker_id = uid` over PostgREST; the ruling-198 trigger fires on that insert (**F8**) |
| Direct table writes: `post_saves`, `post_reactions`, `dismissed_suggestions`, `post_drafts` | `authenticated` | RLS | Own rows, existence only, no aggregate read path |

### Edge Functions

| Function | Auth | What crosses the boundary |
| --- | --- | --- |
| `connect-suggest` | Requires a `Bearer` JWT; calls `connect_cards('suggested')` **with the member's own JWT**, so RLS and `auth.uid()` decide what becomes a fact | Sends the candidate's **first name** and the words-only `facts` to Anthropic. Strips `facts` from every item before returning. Rejects any reason containing `%`, `!`, or a digit run not present verbatim in that candidate's own facts. Logs latency and counts, never names or facts. A missing reason drops the card rather than rendering it bare |
| `dia-compose-read` | Per-session rate limit on a hashed key | Reads the composer's own free text. Returns a verb, a confidence and the schema's fields; the confidence is consumed client-side as a floor and is never rendered. Logs latency and verb, never text |
| `link-unfurl`, `media-upload` | service role | Not member-to-member paths; out of this pass's scope for payload enumeration |

---

## 3. The six doctrine checks, answered across the whole set

### 1. No number reaches a client — **holds, with two observations**

Complete inventory of every numeric column in `public`, taken from `pg_attribute`:

| Column | Reaches a client? | Reading |
| --- | --- | --- |
| `second_degree.via_count`, `.sample_via_ids` | **no** | Withheld by column grant. A read as a member was refused live: `42501 permission denied for table second_degree` |
| `post_dia.confidence`, `.latency_ms` | **no** | The `SELECT` grant exists but the only policy is `private.is_admin()`; a member matches no row |
| `position` on the nine vocabulary tables and `member_segments` | yes, to `authenticated` | An ordering index on reference data, not a fact about a member. `vocabularies()` and `connect_filter_options()` order by it and do not return it |
| `post_media.width`, `.height`, `.position` | yes | Layout values for the image, not a member fact |

No projection returns a count, a score, a percentage, a strength, a distance or a `via_count`.
Suggested's `hits` rank is computed inside the query and discarded. `connect_where()` applies the
floor with `HAVING count(*) >= v_floor` and returns country **names**. `profile_view` returns a
`tier` word, never a completeness value. `post_saves` and `post_reactions` have no aggregate read
path: the only policy is own-rows, so no client can sum them.

Two things a client could sum, both about its own graph and neither rendered:

- **F12.** `second_degree` grants `SELECT (member_id, fof_id)` on own rows, so a member can list —
  and therefore count — their own second-degree set even though `via_count` is withheld. Same for
  `member_connections` and own `edges`. This is the member's own network size, not another
  member's, which is why it is recorded as an observation rather than a breach of the doctrine.
- **F14.** `connect_where()` subtracts blocked members from the count before applying the floor. A
  member who blocks one person and watches a country tile disappear learns that the country sat at
  exactly the floor. One-bit inference, no name attached.

### 2. Nothing reaches an anonymous caller beyond the public projection of a profile whose owner opted in — **two findings**

Tested at the role boundary as `anon`, inside rolled-back transactions, not through the app. The
same boundary is also exercised over real HTTP by `tests/live-checks.cjs` on every push, which
passed on the run carrying this report; see the coverage section for what that suite does and does
not reach, and why it is green while F1 to F4 hold.

What `anon` can reach, and it is a short list: `SELECT` on `members` (13 columns, `USING
(profile_shared)`), on `attestations`, and on the eleven profile section tables under P-section;
`EXECUTE` on `profile_view` and `public_attestations`; `SELECT` on `profile-media` storage objects
for a shared profile. Nothing else. `anon` holds **no** privilege on `posts`, `feed`, `edges`,
`member_connections`, `second_degree`, `connection_requests`, `notifications`, `member_blocks`,
`corridors`, `member_corridors`, `member_embeddings`, `member_follows`, `member_visibility`,
`spaces`, `events`, `stories`, `opportunities`, `dismissed_suggestions`, or any vocabulary table.
Ruling 156 holds: Connect renders nothing to an anonymous visitor, refused at the function ACL
rather than in the client.

Live, as `anon`: `members` → 2 rows (the two shared profiles). `profile_view('thandiwe-dube')`
returned the expected public projection; `intent`, which that member has set to `anchored`, was
correctly absent.

- **F7 (Medium).** `anon` reads `public.attestations` row by row, not only through the projection.
  Both live rows came back complete, carrying `attester_member_id` and `attester_role` for two
  members whose `profile_shared` is `false`. The projections above the table render those two as
  "the host" and "a Space lead" and null their role; the table hands an anonymous caller the
  identifier and the role. The **name** is not reachable, because `members_anon_select` requires
  `profile_shared` — so this is a stable identifier plus a role, not a name, and F7 is written that
  way deliberately.
- **F2a (High).** `profile_view` returns `origin_country`, `current_place`, `current_country`,
  `local_tz` and `segment` inside the `member` object to an anonymous caller regardless of what the
  Origin, Where and Segment section audiences say. See check 3 for the evidence.

### 3. Audience scope is row policy on every path — **the predicate is single and correct; the core row goes around it**

There is exactly one implementation. `private.admit_section(member, section, viewer)` is the whole
rule; `private.can_see_section` is a two-argument wrapper that passes `auth.uid()`. The table
policies call the wrapper, `profile_view` calls `admit_section` with an explicit viewer, and
`connect_card` calls it too. There is no second copy anywhere and no client-side audience filter:
Feed's lens filters are PostgREST predicates that **narrow** within `posts` RLS (`mine`,
`network` from the caller's own `member_connections` and `space_roles`, `saved` from own
`post_saves`), never widen. `admit_section` is correctly **not** granted to `authenticated` — a
member cannot ask it about an arbitrary pair; only the wrapper, scoped to themselves, is callable.

The predicate is right. What defeats it is that three attributes live on `members` and are copied
into the payload before any section gate runs.

**Evidence, live, in one rolled-back transaction.** Thandiwe's `origin`, `where`, `segment` and
`work` set to `connections`; viewer Yusuf, who is not connected to her:

| Probe | Result |
| --- | --- |
| `private.can_see_section(thandiwe,'origin' / 'where' / 'segment')` | `false`, `false`, `false` |
| `profile_view.sections` keys | `about, collaborate, contribute, convene, languages, skills` — origin, where, segment and work correctly withheld |
| `profile_view.member` | still `origin_country: "South Africa"`, `current_place: "Johannesburg, SAST"`, `local_tz`, `segment: "returnee"`, `segment_label: "Returnee"` |
| `connect_card` for the same member | still `place: "Johannesburg, SAST"`, `origin: "South Africa"`, `segment_label: "Returnee"`; `chips` correctly dropped the Work values and kept only Skills |
| `SELECT ... FROM public.members` directly | every column, unfiltered |

The Connect card is the sharpest statement of it: on one card, the Work chips obey the audience and
the origin and place do not.

- **F2 (High).** Recorded in two halves because they need different answers. **F2a**, the signed-out
  half, is a straight contradiction: ruling 139 makes the public surface member-authorised, and a
  member who sets Where to My connections has not authorised their city on a page anyone can read.
  **F2b**, the signed-in half, is a doctrine collision, not a bug to patch blind: ruling 124 says
  the core identity row is always visible to signed-in members and rulings 122 and 136 put origin
  and current location in that core row, while the `profile_section` enum offers `origin`, `where`
  and `segment` as audience-carrying sections. Both cannot be true. This wants a ruling before a
  fix, in the same shape as G2 before ruling 198.

### 4. A third party never reaches a signed-out surface without their own opt-in — **holds on both projections**

`private.third_party_label(member, role, public)` returns the name when the surface is signed-in or
when `private.named_publicly` is true (`profile_shared AND NOT profile_private`), and otherwise the
role: "the host", "a Space lead", "the recipient", "a member". Both anonymous-callable projections
apply it, and both null the `attester_role` alongside, so the role is not leaked back through the
field next to it.

Live, as `anon`, against two attestations whose attesters both have `profile_shared = false`:

- `profile_view('thandiwe-dube').badges` → `attester: "the host"`, `attester: "a Space lead"`, `role`
  absent in both.
- `profile_view(...).sections.convene[0].sub` → `"Attested by the host"`, with no trailing role.
- `public_attestations()` → `attester: "the host"` / `"a Space lead"`, `role: null`.

`profile_view.mutuals` returns third-party names but is built only inside `if v_viewer is not null`,
so it never runs for an anonymous caller. Ruling 141 holds on every path that renders a name.

Two adjacent observations, neither a name:

- **F7**, above: the raw `attestations` table gives `anon` the third party's identifier and role.
- `public_attestations()` returns event, Space and opportunity **titles** to an anonymous caller with
  no check on those objects' own visibility. Ruling 141 governs names, not object titles, so this is
  recorded as a question for the Convene brief rather than a finding against 141.

### 5. Blocks filter in both directions everywhere — **holds across Connect, fails on the Feed**

`private.is_blocked(a, b)` is symmetric by construction, so a single call covers both directions.
Every Connect projection calls it: `connect_cards` members, suggested and all four network sections,
`connect_card`'s mutuals, `connect_where`'s counts, `connection_request_intros` (added by ruling
186), `send_introduction`, `set_follow`, and the `dismissed_suggestions` insert policy.
`profile_view` applies ruling 198's scope drop, and the trigger on `member_blocks` revokes the
edges. Brief 4's own audit proved the Connect half live on 9 September and this pass reproduced it.

The check asks specifically about "projections written before `member_blocks` existed", and that is
where it fails.

**Evidence, live, in one rolled-back transaction.** A block inserted from Thandiwe to Tester:

| Probe, as the blocker | Result |
| --- | --- |
| `private.is_blocked(...)` | `true` |
| `connect_cards('members')` | `adaeze-nwosu, kwame-mensah, lerato-khumalo, yusuf-diallo` — the blocked member absent ✓ |
| `SELECT count(*) FROM public.feed WHERE author_id = <blocked>` | **6** — every one of the blocked member's posts still in the blocker's Feed |
| `SELECT ... FROM public.members WHERE id = <blocked>` | 1 row — by design under ruling 198, which does not hide the profile |

- **F4 (High).** `posts` RLS and the `feed` view carry no block predicate, in either direction. A
  blocked member's Everyone posts reach the blocker's Feed and the blocker's reach theirs. Ruling
  198 says a block "removes discovery and contact"; the Feed is neither named nor filtered. The
  chassis tables that hang off `posts` inherit the same gap: `post_media`, `post_links`, and the
  created objects (`events`, `spaces`, `stories`, `opportunities`) are all reachable through a
  visible post.

`notifications` is unfiltered too, but writes no rows a blocked pair could produce today, so it is
noted rather than counted.

### 6. Grounded-or-empty holds at the data layer — **holds**

Every empty case renders nothing rather than a fallback, and the emptiness is decided in SQL:

- `corridors` at zero rows: `connect_filter_options().corridors` is `[]` and `connect_card`'s
  `corridor_label` is `NULL`, stripped by `jsonb_strip_nulls`. No axis, no line (ruling 154).
- `connect_where()` returned `{"continent":[],"diaspora":[]}` live. Six members, floor of five: the
  floor is not met and the surface has nothing to show, which is the intended answer.
- `second_degree` at zero rows: Suggested's `fof` flag is false for every candidate, and the mutuals
  fact is `NULL`.
- Suggested filters `WHERE hits > 0`, so a candidate with no real reason is not a candidate.
- `connect-suggest` drops any card whose reason failed validation, so a card never renders with a
  fabricated or absent reason.
- `vocabularies()` returns `[]` per axis rather than a literal; ruling 194's "no fallback literal"
  holds in the projection as well as in the components.
- `profile_view` adds a section key only when the section has content, unless the caller is the
  owner, who needs the empty section to fill it.

One thing to watch rather than a finding: the floor is applied to `connect_where` alone. No other
projection counts anything, so there is nothing else for the floor to govern yet. That changes with
Convene's attendee list.

---

## 4. Findings, with severity and gate

Ruling 140's language throughout. None of these blocks a merge. High findings become invite-boundary
gates, to close before the first real member invite, alongside leaked-password protection (ruling 94,
still off, confirmed by the Supabase security advisor in this pass) and Resend Auth mail (ruling 76).

| # | Finding | Severity | Gate |
| --- | --- | --- | --- |
| **F1** | `members_member_select` is `USING (true)` and the `authenticated` grant covers every column. Any signed-in member reads the whole member table — all rows, `profile_private`, `profile_shared`, `identified_at`, `updated_at` — in one PostgREST call, bypassing every audience-scoped projection above it. Verified live as an isolated member with no connections: 6 of 6 rows, flags included | **High** | **IB-1** |
| **F2a** | The `member` object in `profile_view` carries `origin_country`, `current_place`, `current_country`, `local_tz` and `segment` to an **anonymous** caller regardless of the Origin, Where and Segment section audiences. Verified live | **High** | **IB-2** |
| **F2b** | The same three attributes reach a signed-in stranger on both Profile and Connect, and the Connect card shows the collision plainly: Work chips obey the audience, origin and place do not. Rulings 124/122/136 and the `profile_section` enum disagree about whether these are core-row or sectioned. Needs a ruling before a fix | **Medium** | IB-2 |
| **F3** | The whole-profile Private switch does not remove a member from Connect and does not blank the core row anywhere. Verified live with `profile_private = true`: `profile_view.sections` was `{}` and `private` was `true`, but `profile_view.member` still carried name, headline, place, origin, segment and both image paths, and `connect_cards('members')` still listed the member as a card | **High** | **IB-3** |
| **F4** | No block filter on `posts`, the `feed` view, or anything hanging off a visible post. Verified live: with a block in place the blocker still read all six of the blocked member's posts | **High** | **IB-4** |
| **F5** | The Members-lens `origin` and `location` filter axes query `members.origin_country` and `.current_country` with no `admit_section` check, while `heritage`, `pathway`, `focus`, `industry`, `skill` and `region` all check it. Verified live in the same transaction as F2: with Origin set to `connections`, `filters={"origin":"South Africa"}` returned the member and `{"heritage":"Continental"}` and `{"focus":"Infrastructure & Energy"}` returned nothing. Two axes are a searchable index over an attribute the member has hidden | **Medium** | IB-5 |
| **F6** | A declining recipient's decision is recoverable by the sender from two lenses of one surface. Verified live: for a **pending** request the Members card reads `rel: 'sent'` and the Sent row reads `sent`; for a **declined** request inside the window the Members card reads `rel: 'window'` while the Sent row still reads `sent`. Ruling 168 makes the window state itself intended and sender-owned; the finding is that the pair of states is differential, and ruling 157 forbids a differentiated state reaching the sender | **Medium** | IB-6 |
| **F7** | `anon` reads `public.attestations` row by row, receiving `attester_member_id` and `attester_role` for third parties who have not opted into public sharing. Both live rows demonstrate it. The name is not reachable; the identifier and role are | **Medium** | IB-7 |
| **F8** | `member_blocks` has a live writer. Verified live: an ordinary member inserted a block row over the `authenticated` grant. `docs/GAPS.md` G1 states the table "can only ever hold rows put there by hand", which is true of the app and not of the API. Two consequences: the ruling-198 trigger fires on that insert, and because it **revokes** rather than deletes edges, deleting the block row does not restore the connection or the follow. A block is currently irreversible in effect even though the row is deletable | **Medium** | IB-8 |
| **F9** | `events` rows reach every signed-in member in full through the created-object branch of `events_member_select`, including `virtual_url` and `host_member_id`. Verified live: an unrelated member read both event rows, one carrying a real join link. Chassis-shaped and lands on Brief 5, where an event acquires an audience of its own. `spaces`, `opportunities` and `stories` carry the same branch | **Medium** | IB-9 |
| **F10** | Five policy filter columns are unindexed, against ruling 115: `spaces.owner_member_id`, `events.host_member_id`, `opportunities.receiver_member_id`, `stories.author_member_id`, `attestations.attester_member_id` (trailing column of a 4-column unique index, so it cannot lead a scan). All five are chassis tables; everything Connect added is covered | **Low** now, Medium at scale | — |
| **F11** | `notifications_actor_select` lets the actor read the rows their action produced, including the recipient's `read_at`. On `connection_accepted` the accepter therefore learns when the requester opened the notification — a read receipt nobody designed | **Low** | — |
| **F12** | A member can enumerate and therefore count their own second-degree set from `second_degree(member_id, fof_id)`, and their own connections and follows, even though `via_count` is withheld. Own-network size, not another member's. Observation | **Low** | — |
| **F13** | `feed` returns `created_by`, so on a Space post every viewer learns which role holder pressed Publish. `audience` also reaches the client | **Low** | — |
| **F14** | `connect_where()` scopes its count by the viewer's blocks, so blocking one member and watching a tile disappear reveals that the country sat at exactly the floor. One bit, no name. Observation | **Low** | — |
| **F15** | `private.third_party_label` is `EXECUTE`-granted to `anon` and takes `p_public` as a **caller-supplied** argument: `third_party_label(<uuid>, '', false)` returns any member's real name. It is not reachable today because schema `private` is not in PostgREST's exposed schema set, so this is defence in depth, not an open path. A safety switch that the caller supplies is the wrong shape for a function granted to `anon` | **Low** | — |
| **F16** | Two writers insert into `connection_requests`: `send_introduction` and `publish_post`'s Connect branch. Only the first enforces `is_blocked` and `relationship_state = 'none'`, so the composer's Connect verb can create a pending request to a member who has blocked the author or who is inside the decline window. CLAUDE.md names five write paths for the graph; this is a sixth entry point into the same table | **Medium** | IB-10 |
| **F17** | Two stores answer "is following": `profile_view` reads `member_follows`, `connect_card` reads `edges`. They agree today because a trigger mirrors one into the other, and `set_follow` is the only writer. Recorded so the mirror is not mistaken for a second source of truth, and so a future writer of `edges` that bypasses the trigger is caught | **Low** | — |

### What passed, stated as results

Worth recording because these were the things most likely to have gone wrong and did not.

- RLS enabled on all 48 tables; default deny throughout; no table missing a policy.
- `anon` holds `EXECUTE` on exactly two functions, both of which apply `third_party_label`.
- Ruling 157's structural silence holds. Live, as a sender whose introduction had just been
  declined: `SELECT count(*) FROM connection_requests` → **0 rows**; the Sent section read `sent`;
  no notification was written; `connection_request_intros` carries no `status` column at all.
- Ruling 141 holds on both anonymous projections, verified against two attesters neither of whom
  has opted into public sharing.
- `via_count` is genuinely unreachable: a read as a member was refused at the column grant.
- `admit_section` is not callable by `authenticated`; only the self-scoped wrapper is.
- `attestations` has no member insert, update or delete path anywhere (ruling 47).
- `member_follows` insert and delete were correctly revoked in Brief 4, leaving one write path.
- Blocks filter in both directions on every Connect projection, reproducing Brief 4's audit.
- Grounded-or-empty holds at the data layer on every empty case the project currently has.
- The Supabase security advisor reports no missing-RLS finding. Its thirteen `SECURITY DEFINER`
  warnings are the D089 projection pattern working as designed; its one substantive warning is
  leaked-password protection, already ruling 94's accepted risk and already an invite-boundary gate.

### One thing found in passing that is not a security finding

`private.tz_from_place` resolved `"Los Ángeles, PST"` to `Asia/Manila`, because the abbreviation
fallback matches PST to Philippine Standard Time before any Americas zone. The member's local time
line is therefore wrong on that profile. Recorded here because this pass saw it; it belongs in the
Gap Register, not in a fix that rides on this report.

---

## 5. What this pass did not cover, and why

- **The HTTP surface, from this session.** This environment's network policy refuses outbound HTTPS
  to `dgspjevjoblujcoljvkn.supabase.co` (the proxy answers 403 to CONNECT), so no `curl` in this
  pass reached `/rest/v1/`. Every anonymous check here was run at the role boundary instead —
  `BEGIN; SET LOCAL ROLE anon; …; ROLLBACK;` — which is the same grant-and-policy evaluation
  PostgREST performs as that role, but not PostgREST's own layer: the `db-schemas` setting, RPC
  routing, embedded-resource expansion through foreign keys (`?select=*,members(*)`), `Prefer`
  headers, and the `graphql_public` schema. F15's containment rests on `private` not being in
  `db-schemas`, which is read from the migrations' stated intent and **not** proved here.

  **CI already covers much of that, and this section said otherwise in the first version of this
  report.** `tests/live-checks.cjs`, run by `pages.yml` on every push, hits `/rest/v1/` over real
  HTTP with the publishable key and asserts: ten tables and `profile_view` return nothing for a
  non-shared profile; the shared profile's core row is readable while its switches are refused by
  the column grant; `member_links` and `member_intent` return zero rows; ruling 141 on both
  anonymous projections; ruling 156 across eight Connect tables and four Connect RPCs; and
  `via_count` absent from every anonymous payload. It passed on the run carrying this report. The
  earlier claim that a repeat of check 2 over real HTTP was the first thing the next pass should do
  pointed at work that largely exists.

  What is genuinely left for the next pass is narrower: PostgREST's own layer as listed above, and
  the gap described next.
- **The shape of the existing live-check suite, which is why it is green while F1 to F4 hold.**
  Worth stating plainly, because a green suite beside four High findings otherwise reads as a
  contradiction. Three reasons, all structural rather than a bug in the suite:

  1. **Every check in it is anonymous.** There is no signed-in-member arm at all. F1 (any member
     reads the whole `members` table) and the Connect half of F3 (a Private member still renders as
     a card) are signed-in findings, so nothing in the suite could see them.
  2. **The core row's contents are never checked against the section audiences.** `check 1` asserts
     that anon reads the core row and that the *switches* are excluded from it. It asserts nothing
     about `origin_country`, `current_place`, `local_tz` or `segment` against the Origin, Where and
     Segment audiences — which is exactly F2a. The seeded fixture hides it too: the shared persona's
     only `member_visibility` row is `intent = anchored`, so Where, Origin and Segment sit at the
     `everyone` default and no case exists where the audience and the core row disagree. F2a was
     found by *creating* that disagreement in a rolled-back transaction.
  3. **No block is ever in place**, so F4 has no arm anywhere in CI.

  Two narrower notes on the same suite. Its ruling-141 assertion is a substring match against two
  hardcoded names, so it proves those two are not named and not that the mechanism is general; the
  mechanism was read separately here and holds. And its `attestations` read is scoped to the
  non-shared member, expecting zero rows, so it never reads the *shared* member's attestation rows —
  which is where F7's third-party identifiers are exposed.

  None of this is a criticism of the suite, which is checking what Briefs 3 and 4 asked it to check.
  It is the answer to "why did CI not catch these", and it is the most useful thing this pass can
  hand the next one: a signed-in arm, a fixture where a section audience and the core row disagree,
  and an arm with a block in place would each catch one of the four.

  **One observation about the suite's reliability, recorded rather than fixed.** On `main`'s
  post-merge run for PR #12 (run 86, 9 September 16:10) the suite scored **39 of 40** and the job
  failed, taking the whole matrix with it as a skipped step. The single failure was
  `ruling 156: /connect served HTML carries no card, tile or filter (status 404)` — a `GET
  $BASE/connect` returning 404 on that Pages deployment. **Every anonymous REST assertion in that
  run passed**, so the failure was the served page, not the data layer, and it is not a finding
  against any doctrine here. The same check passed on `main`'s next run (run 88, 17:25) and on the
  branch run at 17:04, with no code change in between.

  A mechanism fits the two observations and is offered as no more than that (ruling 205, on a
  sample of two): step 5 polls `/sign-in` up to twelve times at ten-second intervals before
  proceeding, while step 6 requests `/connect` once, with no retry, seconds after a fresh
  direct-upload deployment. A partially propagated deployment would produce exactly this split. The
  consequence worth naming is not the 404 itself but that a single unretried request gates the
  entire matrix, and that `main` was left red at 16:10 for a reason unrelated to the WebKit defect
  in G5 and unrelated to the diagnostic runs PR #12's merge note invoked under ruling 199. Adding a
  retry is a fix and belongs in a PR of its own, not in this report.

- **Realtime.** Whether Realtime publication is enabled on any of these tables, and whether its
  row filters match the RLS policies, was not examined at all. Realtime is a second read path with
  its own authorisation model.
- **Auth schema and JWT issuance.** `auth.users`, session lifetime, refresh-token rotation, the
  `app_metadata.role = 'admin'` claim's provenance, and who can set it. `private.is_admin()` trusts
  that claim; nothing here checked how it is granted.
- **`link-unfurl` and `media-upload`.** Read for auth posture only, not enumerated field by field.
  Both are service-role paths; `link-unfurl` fetches attacker-supplied URLs and deserves an SSRF
  review of its own, which this pass did not do.
- **Rate limiting and abuse.** `send_introduction`, `dismiss_suggestion` and the `member_blocks`
  insert have no rate limit. Enumeration cost against F1 was not measured.
- **The client.** `src/` was read to establish which paths call which projection and whether any
  audience decision is made client-side (it is not). It was not audited for XSS, dependency risk, or
  token handling.
- **Load.** F10's index gaps are read from `pg_indexes`, not measured. With six members no plan is
  informative.
- **Convene, Collaborate, Contribute, Convey and Messaging.** Out of scope by the brief. `events`,
  `spaces`, `opportunities` and `stories` were read only where the chassis already exposes them
  (F9), and their engines will change those policies.
- **`post_dia`'s admin-only read** is a policy reading, not a live result: the table has zero rows,
  so a member reading zero rows proves nothing.

## Live method

Every live check ran against `dgspjevjoblujcoljvkn` inside `BEGIN … ROLLBACK`, with `SET LOCAL ROLE`
and `SET LOCAL request.jwt.claims` to act as `anon` or as a named member. One methodological note
for whoever repeats this: `SET LOCAL` outside a transaction block is a no-op, and a probe written
that way silently runs as the connecting role. Two early probes in this pass were affected and both
were re-run inside an explicit transaction; the results reported above are the transactional ones.
The `anon` denials on `connect_cards` and `vocabularies` were confirmed that way and cross-checked
against `pg_proc.proacl`.

State before and after, unchanged on every counter:

`members 6 · shared 2 · private 0 · posts 6 · attestations 2 · member_blocks 0 · member_connections 6 ·
connection_requests 3 · member_visibility 1 · edges 7 (1 revoked, pre-existing from 9 September
01:01) · second_degree 0 · notifications 0 · where_floor 5 · decline_window_days 90`

## Closing

The pass is complete and its results are stated above, not pending. Seventeen findings: four High,
seven Medium, six Low. Ten become invite-boundary gates IB-1 to IB-10. Nothing was fixed and no
migration was written.

The shape of the four High findings is one shape, and it is the shape this pass existed to find. The
audience predicate is single, correct and enforced in SQL on every path that goes through it; what
gets past it is the material that does not go through it — the `members` core row, copied into two
projections before any gate runs (F1, F2, F3), and the `posts` audience, written before
`member_blocks` existed and never revisited (F4). Each surface is right on its own. The seams
between them are where the four High findings live, which is what the brief predicted and the reason
for reading the whole set at once rather than one PR at a time.

Two of the four want a ruling before they want a fix. F2b sets ruling 124's always-visible core row
against the `origin`, `where` and `segment` entries in the `profile_section` enum, and both cannot
stand. F3 needs the same answer for the whole-profile Private switch that ruling 198 gave for the
block: what a Private profile means on a surface that is not Profile. F1 and F4 need no ruling, only
work.
