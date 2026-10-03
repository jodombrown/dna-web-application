# DIA inventory: prototype and canonical, side by side

Handoff 47-A, Session 47 (Lane F). Governing rulings 1417 to 1427 (Notion D1519 to D1529).
This file records what exists. It carries no judgement and no recommendation; what the new DIA
keeps is the founder's call in Chat (1422).

## Certified against

| Item | Value |
| --- | --- |
| Prototype repository | `jodombrown/dna`, default branch `main` |
| Prototype pinned SHA | `b6cd764b0499614c8636d136ef648d6f6c9f2601` (head commit 2026-09-15 18:01 PDT) |
| Prototype Supabase project ref | `ybhssuehmfnxrzneobok` (`supabase/config.toml:1`, `src/lib/config.ts:18`) |
| Canonical repository | `jodombrown/dna-web-application` |
| Canonical SHA | `bf6b10c49e1dbd51d9292ff37fb6f94410be5982` (origin/main when this branch was cut) |
| Canonical Supabase project ref | `dgspjevjoblujcoljvkn` (`src/lib/supabase.ts:10`), recorded for contrast only |
| Written | 2026-10-03 06:28 PDT (Pacific) |

Method: legacy repositories were cloned read-only into `/home/user/` outside the canonical tree
(shallow, depth 1), never added as a remote, submodule or dependency. No database was queried.
Status (live, stub, dead) is decided by tracing call sites from a mounted route or a scheduled job;
each status names its chain or says "no caller found". System prompts and member-facing strings are
copied verbatim. The prototype was read at its pinned SHA, the canonical app at `bf6b10c4`.

## Part 0: identifying the prototype

### Candidates

The owner's repositories were listed through the session's repository listing (11 repositories
visible to the session credential). Every `jodombrown` repository in that list was tested for the
markers, not only the named candidates.

| Repository | Default branch | Head SHA | Head commit (Pacific) | Reachable |
| --- | --- | --- | --- | --- |
| `jodombrown/dna` | `main` | `b6cd764b0499614c8636d136ef648d6f6c9f2601` | 2026-09-15 18:01 PDT | yes |
| `jodombrown/dna-May-2026` | `main` | `2e6b8cf44cc65efff7ff2af185c946a43849a457` | 2026-08-12 19:05 PDT | yes |
| `jodombrown/dna-original-repo-2025` | n/a | n/a | n/a | no: `add_repo: repository "jodombrown/dna-original-repo-2025" was not found on github.com, or this session's GitHub credential doesn't have access to it. ... Detail: you don't have access to jodombrown/dna-original-repo-2025`. It is also absent from the owner's repository listing. |
| `jodombrown/pryoritea` | `main` | `21e5e6baa2b62dbdfefc8377b47f5baa8837494b` | 2026-08-20 13:45 PDT | yes |
| `jodombrown/hbcustartupopen_2026` | `main` | `ee034a90095a4ebde60b6536bcb48880ab6e3b1e` | 2026-06-27 15:05 PDT | yes |
| `jodombrown/gabacenter` | `main` | `0b7ea9aa5f434ae4133a767992ac597382f92f3d` | 2026-06-01 00:38 PDT | yes |
| `jodombrown/hbcustartupopen-214f7b1b` | `main` | `f664d563b0fadf21a7b4e602f4ddc6e2bbfbb587` | 2026-03-06 12:09 PST | yes |
| `jodombrown/gabacenter-6329c655` | `main` | `6fb761e3491683f7fd508da87193bc413d9440a7` | 2026-01-29 08:36 PST | yes |
| `jodombrown/gabacenter-060f0c5e` | `main` | `f8af0b82ecfa1c81a7638b7de63ce37516012a94` | 2026-01-19 05:36 PST | yes |
| `jodombrown/hbcustartupopen` | n/a | none | n/a | yes, but empty: `warning: You appear to have cloned an empty repository.` |

`jodombrown/dna` is reachable under that name; no rename was found in the listing. The listing also
holds `region17gh/r17ghana`, which is not a `jodombrown` repository and was not tested.

### Markers

| Marker | `jodombrown/dna` | `jodombrown/dna-May-2026` | Every other `jodombrown` repository |
| --- | --- | --- | --- |
| `src/services/dia/` with about 21 modules | present: 21 files (20 modules plus `index.ts`) | present: 21 files (20 modules plus `index.ts`) | absent |
| `src/components/dia/` with about 19 components | present: 19 files (18 components plus `index.ts`) | present: 19 files, identical to `jodombrown/dna` | absent |
| `supabase/functions/_shared/dia-core/` | present: `audit.ts consent.ts identity.ts index.ts limits.ts model-call.ts models.ts` | present, identical | absent |
| `src/types/dia.ts` containing `DIACoreService` | present | present, identical | absent |
| `REBUILD_FLAGS.collaborateContributeRebuild` | present: `src/lib/rebuildFlags.ts:16` `collaborateContributeRebuild: true,` | present | absent (no `src/`-level DIA tree at all) |
| migration creating `dia_match_results` | present: `20260212300000_dia_core_engine_tables.sql` | present, same file | absent |
| migration creating `dia_conversations` | present: `20260212300000_dia_core_engine_tables.sql` | present, same file | absent |
| migration creating `dia_rematch_queue` | present: `20260212600000_profile_identity_hub.sql` | present, same file | absent |
| migration creating `dia_feed_insights` | present: `20260212200000_feed_architecture_tables.sql` | present, same file | absent |
| migration creating `dia_composer_suggestions` | present: `20260212100000_post_composer_tables.sql` | present, same file | absent |
| `gemini-2.5-flash` in function source | present: `supabase/functions/_shared/dia-core/models.ts:42` and following | present | absent |
| `gemini-3-flash-preview` in function source | present: `supabase/functions/_shared/dia-core/models.ts:43` and following | present | absent |
| `src/services/dia/` contents vs `jodombrown/dna` | n/a | differs in 4 files: `connectCards.ts`, `matchingEngine.ts`, `profileIntelligence.ts`, `regionalIntelligence.ts` | n/a |
| Supabase ref | `ybhssuehmfnxrzneobok` | `ybhssuehmfnxrzneobok` | not read |

Markers for the other repositories were tested on the tree at each head (`git ls-tree`), for
`src/services/dia`, `src/components/dia`, `supabase/functions/_shared/dia-core`, `src/types/dia.ts`
and any `supabase/functions/dia-*` directory; none was present, so the remaining markers were not
applicable.

### Result

Two candidates carry the markers. Under the handoff's rule the one with the later head is
inventoried: `jodombrown/dna` at `b6cd764b`, head commit 2026-09-15 18:01 PDT, against
`jodombrown/dna-May-2026` at `2e6b8cf4`, 2026-08-12 19:05 PDT. `jodombrown/dna-May-2026` is
recorded above; its DIA tree matches `jodombrown/dna` except the four service files named.

The prototype points at Supabase project `ybhssuehmfnxrzneobok`: `supabase/config.toml:1`
`project_id = "ybhssuehmfnxrzneobok"`, and `src/lib/config.ts:18` falls back to
`'https://ybhssuehmfnxrzneobok.supabase.co'` when `VITE_SUPABASE_URL` is unset
(`src/integrations/supabase/client.ts:7` reads `config.SUPABASE_URL`). No env example file is in the
tree. That is the same ref Chat read, in which the tables `dia_match_results`, `dia_conversations`,
`dia_rematch_queue`, `dia_feed_insights` and `dia_composer_suggestions` were reported absent; the
repository's migrations do create them. The database was not queried here; Chat reads the live
schema.

Recorded facts about the prototype head: commit `b6cd764b` is authored by `gpt-engineer-app[bot]`
(`159125892`) with message `Wrote inventory deliverable` and an `X-Lovable-Edit-ID` trailer, and the
tree carries `.lovable/mcp/manifest.json`. That repository is legacy and read-only here; the
gpt-engineer stop rule in Guardrail 2 governs canonical `main`, which carries no such commit (see the
closing code check below).

## Part A: prototype DIA, at `b6cd764b`

### A1. Edge functions (part 1: dia-* functions)

Source: `jodombrown/dna` at `b6cd764b0499614c8636d136ef648d6f6c9f2601`, read-only. Paths are relative to the repo root. Line counts by `wc -l`.

**Shared model resolution (applies to every row marked "Via dia-core: yes" that calls a model).** `supabase/functions/_shared/dia-core/model-call.ts` (66 lines) `callModel()` posts to `GATEWAY_URL` from `supabase/functions/_shared/dia-core/models.ts` (75 lines): `https://ai.gateway.lovable.dev/v1/chat/completions` (the Lovable AI gateway, OpenAI-compatible), with header `Authorization: Bearer ${LOVABLE_API_KEY}` (env var `LOVABLE_API_KEY`; throws `LOVABLE_API_KEY missing` if unset). Model string is `modelOverride ?? modelFor(capability)`; no function in this section passes `modelOverride`. `modelFor` reads the `GATEWAY_MODELS` map, falling back to `FALLBACK_MODEL = "google/gemini-2.5-flash"`. `providerOf()` returns `gemini` for `google/*`. Only `temperature`, `max_tokens`, `tools`/`tool_choice` and `response_format` the caller sets are forwarded. A non-2xx gateway response throws `AI gateway ${status}: ${first 300 chars}`. Perplexity is a separate direct call: `PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"`, `PERPLEXITY_MODEL = "sonar"`, key env var `PERPLEXITY_API_KEY`. `ANTHROPIC_ALTERNATES` (`anthropic/claude-haiku-4-5`, `anthropic/claude-sonnet-4-5`) are declared in `models.ts` and not referenced by any function in this section.

`GATEWAY_MODELS` entries relevant here: `reactive_query: "google/gemini-2.5-flash"`, `compose_read`, `smart_replies`, `smart_compose`, `thread_summary`, `inbox_brief`, `daily_pulse`: `"google/gemini-3-flash-preview"`, `daily_insights: "google/gemini-2.5-flash"`. Capabilities `smart_chips`, `hub_intelligence`, `trigger_prompt`, `curate` are declared in the `DiaCapability` type and have no map entry (would resolve to the fallback), but none of those functions calls `callModel`.

Other dia-core pieces used: `checkLimit` calls RPC `dia_check_limit(p_user_id, p_capability)`; `recordUsage` calls RPC `dia_record_usage(p_user_id, p_capability, p_tokens)`; `writeEvent` inserts into `public.dia_events` (columns `user_id, principal_type, capability, surface, provider, model, success, latency_ms, tokens, error_code, error_message, meta`). All three use the service-role client. `dia_check_limit`, `dia_record_usage`, `dia_tier_limits` and `dia_events` appear in `src/integrations/supabase/types.ts`; no `CREATE` for any of them was found in `supabase/migrations/`. `checkConsent` (`dia-core/consent.ts`, reads `dia_preferences`) is exported but is not called by any function in this section. Identity: `requireUser` (validates the Bearer JWT via `auth.getUser`), `requireInternal` (accepts only `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret` equal to env `CRON_SECRET`; otherwise 401 `{"error":"Internal endpoint: service-role or cron secret required"}`), both in `supabase/functions/_shared/auth.ts`.

**Routing facts used in caller chains.** `src/App.tsx:386-387` mounts `DiaSheetProvider` and `DiaSheetMount` at the app root around every route; `DiaSheetMount.tsx:18-21` lazy-renders `DiaSheet` once the sheet has been opened. The sheet is opened by `src/components/UnifiedHeader.tsx:445` (rendered by `src/layouts/BaseLayout.tsx:109` on routes no `AppShell` claims, signed-in, `md` and up) and by `src/components/mobile/DnaMobileHeader.tsx:121` (signed-in), and seeded by `src/components/right-rail/AskDiaCta.tsx:37`. `src/config/featureFlags.ts` sets `MESSAGING_ENABLED = false`; `src/App.tsx:596-613` then redirects `/dna/messages`, `/dna/messages/:conversationId` and `/dna/messages/group/:groupId` instead of mounting `DnaMessages` / `GroupThreadPage`. The DM `ChatThread` remains reachable through the global `MessageOverlay` that `src/contexts/MessageContext.tsx:131` renders (provider mounted at `src/App.tsx:385`), opened by `openMessageOverlay` from the "Reach out" buttons below. `src/components/profile/ProfileCard.tsx` (another `openMessageOverlay` caller) has no importer.

| Function | Path (lines) | What it does (one sentence) | Model / provider | Tools | Reads | Writes | Via dia-core | In config.toml (+verify_jwt value) | Caller | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| dia-compose-read | `supabase/functions/dia-compose-read/index.ts` (205) | Reads a composer draft and proposes one of the Five C verbs plus that card's fields, or returns `{verb:null}`. | `google/gemini-3-flash-preview` via Lovable gateway (`LOVABLE_API_KEY`); temp 0.1, max_tokens 300 | none | RPC `dia_check_limit` | `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/useDIACompose.ts:127` | live |
| dia-daily-insights | `supabase/functions/dia-daily-insights/index.ts` (165) | Generates the day's 6 global insight topics into `dia_insights` if today's set is absent. | `google/gemini-2.5-flash` via Lovable gateway; `response_format: json_object`, max_tokens 2000 | none | `dia_insights` | `dia_insights` (update `is_active=false`, insert 6 rows); `dia_events` | yes | yes, `verify_jwt = false` | `src/components/dia/DiaInsights.tsx:70` (user JWT); no schedule found | live (call chain exists; the only caller found is rejected 401 by `requireInternal`, see subsection) |
| dia-daily-pulse | `supabase/functions/dia-daily-pulse/index.ts` (259) | Turns client-supplied events, tasks and needs into a headline, narrative and highlights. | `google/gemini-3-flash-preview` via Lovable gateway; forced tool | `build_daily_pulse` (forced) | RPC `dia_check_limit` (only if JWT valid) | `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/messaging/useDailyPulseBrief.ts:48` | live |
| dia-feedback | `supabase/functions/dia-feedback/index.ts` (54) | Records a thumbs up or down on a dia-search answer. | none (imports `modelFor` only to label the row with `google/gemini-2.5-flash`) | none | none (auth only) | `dia_messaging_feedback` | partial (`modelFor` only) | yes, `verify_jwt = false` | `src/components/dia/DiaSearch.tsx:327` | live |
| dia-hub-intelligence | `supabase/functions/dia-hub-intelligence/index.ts` (357) | Returns hardcoded region/country hub metadata plus platform-wide counts and recent rows per C. | none (no model call) | none | `profiles`, `events`, `collaboration_spaces`, `opportunities`, `feed_posts` | none | no | yes, `verify_jwt = false` | no caller found | dead |
| dia-inbox-brief | `supabase/functions/dia-inbox-brief/index.ts` (318) | Builds a cross-thread brief from the caller's recent unread DM and group messages. | `google/gemini-3-flash-preview` via Lovable gateway; forced tool | `build_inbox_brief` (forced) | `conversations`, `conversation_participants`, `profiles`, `messages`, RPC `get_group_conversations_for_user`, RPC `get_group_messages`, RPC `dia_check_limit` | `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/messaging/useInboxBrief.ts:39` | live |
| dia-search | `supabase/functions/dia-search/index.ts` (448) | Answers a member question through a tool loop over platform tools and Perplexity web search, with a 24h cache and follow-up suggestions. | `google/gemini-2.5-flash` via Lovable gateway (loop temp 0.2 / max_tokens 900; follow-ups temp 0.4 / 120); `web_search` tool calls Perplexity `sonar` (`PERPLEXITY_API_KEY`) | 9 tools from `_shared/dia-tools.ts`, `tool_choice: "auto"` | `dia_queries`, RPC `dia_check_limit`, plus every table the tools read (see dia-tools) | `dia_queries` (insert, update `cache_hits`), `dia_query_log`, `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = false` | `src/components/dia/DiaSearch.tsx:382` | live |
| dia-smart-chips | `supabase/functions/dia-smart-chips/index.ts` (154) | Returns 3 to 4 rule-based "Ask DIA" prompt chips from the caller's own activity, topped up from a fixed fallback list. | none (rule-based) | none | `event_registrations` (+ embedded `events`), `space_members` (+ embedded `spaces`), `posts` | none | no | not listed | `src/components/right-rail/AskDiaCta.tsx:66`, `src/components/dia/DiaSheet.tsx:37` | live |
| dia-smart-compose | `supabase/functions/dia-smart-compose/index.ts` (180) | Suggests 3 openers for a new 1:1 thread from both members' profile fields. | `google/gemini-3-flash-preview` via Lovable gateway; forced tool | `suggest_openers` (forced) | `profiles`, RPC `dia_check_limit` | `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/messaging/useDiaSmartCompose.ts:22` | live (overlay path only) |
| dia-smart-replies | `supabase/functions/dia-smart-replies/index.ts` (181) | Suggests 2 to 3 short replies to the other person's latest message in a conversation. | `google/gemini-3-flash-preview` via Lovable gateway; forced tool | `suggest_replies` (forced) | `messages`, RPC `dia_check_limit` | `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/messaging/useDiaSmartReplies.ts:27` | live (overlay path only) |
| dia-thread-summary | `supabase/functions/dia-thread-summary/index.ts` (280) | Summarises recent messages in a conversation into headline, bullets, open questions and action items, cached on the conversation row. | `google/gemini-3-flash-preview` via Lovable gateway; forced tool | `summarise_thread` (forced) | `conversations`, `messages`, `profiles`, RPC `dia_check_limit` | `conversations.summary_payload`, `conversations.last_summarised_message_id`, `dia_events`; RPC `dia_record_usage` | yes | yes, `verify_jwt = true` | `src/hooks/messaging/useThreadSummary.ts:28` | live (overlay path only) |
| dia-trigger-prompt | `supabase/functions/dia-trigger-prompt/index.ts` (84) | Calls RPC `trigger_dia_prompt` for a user and event type. | none | none | none directly | via RPC `trigger_dia_prompt` (see subsection) | no | not listed | no caller found | dead |
| curate-diaspora-events | `supabase/functions/curate-diaspora-events/index.ts` (262) | Asks Perplexity for 15 to 20 real upcoming diaspora events and inserts new ones into `events` as curated, published, organizer-less rows. | Perplexity `sonar` direct (`https://api.perplexity.ai/chat/completions`, `PERPLEXITY_API_KEY`); `response_format: json_schema`, temp 0.1 | none | `events` (`is_curated = true`) | `events`, `dia_events` | partial (`PERPLEXITY_URL`, `PERPLEXITY_MODEL`, `writeEvent` only) | yes, `verify_jwt = false` | `docs/CRON-SETUP.sql:36-46` cron `weekly-curate-diaspora-events` | live (scheduled in a docs file; the request as written carries the anon key, which `requireInternal` rejects, see subsection) |

`supabase/functions/_shared/dia-tools.ts` (470 lines) is the tool registry for dia-search (re-exported through `_shared/dia-core/index.ts`); its only importer among functions in this section is dia-search (via dia-core), so its status follows dia-search: live.

---

#### dia-compose-read

- **Auth:** `requireUser` (401 on missing/invalid JWT). Service-role client used for limits and audit only; reads no member data.
- **Model resolution:** capability `compose_read` -> `GATEWAY_MODELS.compose_read` = `google/gemini-3-flash-preview`; POST `https://ai.gateway.lovable.dev/v1/chat/completions`, `LOVABLE_API_KEY`. `temperature: 0.1`, `maxTokens: 300`. Messages: system prompt, then user = draft text sliced to 4000 chars. The failure audit row hardcodes `provider: 'gemini'`.
- **Flow:** text under 18 chars returns quiet `too_short`. `checkLimit` not allowed returns quiet `limit_reached`. Model error writes a failed `dia_events` row (`error_code: model_unavailable`) and returns quiet. Success writes `dia_events` (meta `{chars}`) then `recordUsage`. Output is parsed from the first `{...}` after stripping code fences; unknown verb or confidence under `0.6` returns quiet. Fields are filtered by a per-verb whitelist (`convene: title, when, where, format`; `contribute: direction, kind, give, to, impact`; `collaborate: title, roles, type`; `connect: intent, where`; `convey: title`), each trimmed to 48 chars, `direction` dropped unless `offer`/`need`; `reason` sliced to 60.
- **Reads / writes:** RPC `dia_check_limit`; writes `dia_events`, RPC `dia_record_usage`.
- **Tools:** none.
- **Member-facing returns:** never an error to the member. Every non-success path returns HTTP 200 `{"verb":null,"confidence":0,"fields":{},"reason":<code>}` with reason one of `too_short`, `limit_reached`, `model_unavailable`, `unparseable`, `unknown_verb`, `low_confidence`, `error`.
- **Caller chain:** live: route `/dna/feed` (`src/App.tsx:566`) -> `src/pages/dna/Feed.tsx:157` (also `:178`, `:255`) `composer.open('story')` -> `src/contexts/ComposerContext.tsx` -> `AppDrawer` at `src/App.tsx:381` -> `src/components/drawer/resolvers.tsx:33` `<ComposerSurface />` -> `src/components/drawer/surfaces/ComposerSurface.tsx:21` `<UniversalComposer>` -> `src/components/composer/UniversalComposer.tsx:164` `useDIACompose({ enabled: isOpen && !successData })` -> `supabase.functions.invoke('dia-compose-read')` at `src/hooks/useDIACompose.ts:127` (debounced, only when draft is 18+ chars). Other composer openers exist (e.g. `src/components/mobile/MobilePostButton.tsx:26`, `src/components/collaborate/SpacesShell.tsx:33`).

<details><summary>System prompt: dia-compose-read SYSTEM_PROMPT</summary>

```text
You read a draft post for DNA, a platform for the African diaspora, and decide which of the Five C's it is, then extract the structured fields that C's card renders.

THE FIVE VERBS:
- "connect"     (Connect)     — looking for a specific person or offering yourself to someone. Co-founder, investor, mentor, advisor, collaborator, introductions.
- "convene"     (Convene)     — hosting a gathering. Event, meetup, summit, webinar, panel, workshop, call.
- "collaborate" (Collaborate) — starting or recruiting for a piece of ongoing work. A project, initiative, venture, team, Space.
- "contribute"  (Contribute)  — offering something you have, or asking for something you need. Expertise, time, network, knowledge, mentorship, resources.
- "convey"      (Convey)      — telling a story, sharing a thought, an update, an observation, news, a reflection. THIS IS THE DEFAULT when nothing else clearly fits.

CRITICAL DISTINCTIONS:
- "connect" points at a PERSON. "contribute" points at WORK + an OUTCOME. "I need a marketing lead for my startup so we reach 100K users" is contribute (it names an outcome). "Anyone know a good marketing lead?" is connect.
- "collaborate" is ongoing WORK someone joins. "contribute" is a discrete give or ask.
- If it is just a thought, an opinion, news, or a story — it is convey. Do not force it into another verb.

FIELDS BY VERB (omit any field you cannot infer — DO NOT GUESS, DO NOT INVENT):

convene:
  title   — the event name, short. Not a sentence.
  when    — natural language, exactly as written ("Saturday at 6pm", "March 15"). Do NOT invent a date.
  where   — a place. Omit if virtual.
  format  — one of: "In person", "Virtual", "Hybrid"

contribute:
  direction — "offer" (they have something to give) or "need" (they want something)
  kind      — one of: Expertise, Time, Network, Knowledge, Mentorship, Partnership, Resources
  give      — WHAT is on the table, short. "4 hrs/week", "Marketing lead", "Blockchain architecture review"
  to        — WHO or WHAT it goes to. "Health startups", "HealthTech". For an open offer, use "Open to match".
  impact    — THE CONSEQUENCE. "Ship faster", "Reach 100K users". This is the most important field: it is what makes someone act. Only fill it if the text actually names an outcome.

collaborate:
  title — the project/Space name, short.
  roles — comma-separated roles they need. "Solar engineer, Market lead"
  type  — one of: Initiative, Project, Venture, Working group, Campaign

connect:
  intent — who they need, short. "Co-founder", "Investor", "Mentor"
  where  — a place, if mentioned.

convey:
  title — a headline for the story, drawn from what they wrote. Short, not a full sentence.

RULES:
- NEVER invent a value that is not supported by the text. An empty field is correct; a fabricated one is a bug.
- Keep every field under 48 characters.
- confidence is 0-1: how sure you are of the VERB (not the fields).
- If the text is too short, vague, or you are unsure, return verb "convey" with low confidence.

Return ONLY this JSON. No prose, no markdown, no code fences:
{"verb":"convene","confidence":0.9,"fields":{"title":"Founders Meetup","when":"Saturday at 6pm","where":"Lagos","format":"In person"},"reason":"Reads like an event"}
```
</details>

#### dia-daily-insights

- **Auth:** `requireInternal` (service-role Bearer or `x-cron-secret`). Comment in file describes it as "a cron-triggered generator". `verify_jwt = false` in config.toml.
- **Model resolution:** capability `daily_insights` -> `google/gemini-2.5-flash`; Lovable gateway, `LOVABLE_API_KEY`. `responseFormat: { type: 'json_object' }`, `maxTokens: 2000`, no temperature sent.
- **Flow:** selects `dia_insights` where `start_date = today` and `is_active = true` limit 1; if present returns `{ok:true, generated:false}` with no model call. Otherwise generates, sets `is_active = false` on all currently active `dia_insights` rows, inserts up to 6 rows (`title` 120 chars, `description` 260 chars, en/em-dashes replaced with `-`, `query_prompt` 400 chars, `category` coerced to one of `fintech, energy, tech, agriculture, real-estate, creative, healthcare, education` else `tech`, `region` one of `west-africa, east-africa, north-africa, southern-africa, central-africa` else null, `is_featured` on the first, `display_order` 1..6, `start_date` today). Audit row `principal_type: 'service'`, `user_id: null`.
- **Reads / writes:** reads `dia_insights`; writes `dia_insights`, `dia_events`. No `checkLimit`/`recordUsage`.
- **Tools:** none.
- **Returns:** `{ok:true, generated:false}`, `{ok:true, generated:true, count}`, or 500 `{ok:false, error:<message>}` (internal message, e.g. `no topics generated`). The client never shows these.
- **Caller chain:** route chain exists: any route showing the header -> `src/components/UnifiedHeader.tsx:445` or `src/components/mobile/DnaMobileHeader.tsx:121` `openDia()` -> `DiaSheetMount` at `src/App.tsx:387` -> `src/components/dia/DiaSheet.tsx:132` (Insights tab) `<DiaInsights limit={6}>` -> `supabase.functions.invoke('dia-daily-insights', { body: {} })` at `src/components/dia/DiaInsights.tsx:70`, then the component reads `dia_insights` for today directly. That invoke carries the member's JWT, which is neither the service-role key nor an `x-cron-secret`, so `requireInternal` returns 401 and the result is discarded (`.catch(() => null)`; `invoke` resolves with an error object). No `cron.schedule` or `net.http_post` for this function was found in `supabase/migrations/*.sql`, `docs/CRON-SETUP.sql` or `docs/*.sql`. No other caller found. `docs/audits/codebase-bug-audit-2026-08-07.md:118` records the auth gate being added.

<details><summary>System prompt: dia-daily-insights system</summary>

```text
You curate 6 daily briefing topics for the DNA (Diaspora Network of Africa) platform.
Each topic must be timely, non-partisan, and directly relevant to progress for the Global African Diaspora AND/OR the African continent.
Cover a mix of: economic development, investment, remittances, technology, policy, culture, education, healthcare, energy, climate, trade.
Do NOT use em-dashes. Use plain hyphens or restructure.
Return STRICT JSON only, no prose.
```
</details>

<details><summary>System prompt: dia-daily-insights user message template (sent as the user turn)</summary>

```text
Today is ${today}. Generate 6 insight cards.
Each item shape:
{
  "title": "short headline, 6-10 words, no em-dashes",
  "description": "1-2 sentence hook explaining why it matters now, <= 220 chars",
  "query_prompt": "the exact question a user would ask DIA to explore this topic",
  "category": "one of: ${ALLOWED_CATEGORIES.join(', ')}",
  "region": "one of: ${ALLOWED_REGIONS.join(', ')} OR null for continent-wide/global"
}
Return: { "insights": [ ...6 items... ] }
```
</details>

#### dia-daily-pulse

- **Auth:** best-effort `requireUser`; an invalid or missing JWT does not 401 (`userId` becomes null). Config has `verify_jwt = true`, so the platform gateway requires a JWT before the function runs.
- **Model resolution:** capability `daily_pulse` -> `google/gemini-3-flash-preview`; Lovable gateway, `LOVABLE_API_KEY`. No temperature or max_tokens sent. `tools` = one function, `toolChoice: { type: "function", function: { name: "build_daily_pulse" } }`.
- **Flow:** body `{events, tasks, needs, userFirstName?}` is supplied by the client (the function reads no member tables). If all three are empty, returns canned quiet-day output with no model call. `checkLimit` only when `userId` known. Context is the first 5 of each list as JSON. Success writes `dia_events` (meta `{totals}`) and `recordUsage` when `userId` known; returns the tool arguments.
- **Reads / writes:** RPC `dia_check_limit`; writes `dia_events`, RPC `dia_record_usage`.
- **Tools (function-calling):** `build_daily_pulse`, description `Return a compact cross-module daily pulse.`; parameters `headline` (string), `narrative` (string), `highlights` array of `{module: enum convene|collaborate|contribute, refId, oneLiner, suggestion}` (required `module, refId, oneLiner`).
- **Member-facing / fallback strings (verbatim):** quiet day 200: `{"headline":"Quiet day across your modules","narrative":"No urgent events, tasks, or open needs in your spaces right now. Good time to start something.","highlights":[]}`. Limit 429: `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",limit,used}`. Gateway 429: `{"error":"Rate limited, try again shortly."}`. Gateway 402: `{"error":"AI credits exhausted."}`. Other gateway error 500: `{"error":"AI gateway error"}`. No tool call 500: `{"error":"no tool output"}`. Catch-all 500: `{"error":<message or "unknown">}`.
- **Caller chain:** live: route `/dna/convey` (`src/App.tsx:759-762`) -> `src/pages/dna/Convey.tsx:4` `<ConveyStoryHub />` -> `src/pages/dna/convey/ConveyStoryHub.tsx:235` (tab `daily`, label "Daily") `<DailyPulseContent active />` -> `src/components/pulse/DailyPulseContent.tsx:30` `useDailyPulseBrief(active)` -> `supabase.functions.invoke('dia-daily-pulse')` at `src/hooks/messaging/useDailyPulseBrief.ts:48`.

<details><summary>System prompt: dia-daily-pulse systemPrompt (array joined with a single space)</summary>

Pieces, in order, joined with `" "`:

```text
You are DIA, the Diaspora Intelligence Agent.
You write a short cross-module daily brief for a member of the DNA platform (Diaspora Network of Africa).
Tone: warm, direct, never corporate. Never use em-dashes (use a hyphen or restructure).
Keep the headline under 12 words. Narrative under 3 sentences.
Reference items by their natural names. Do not invent items not present in the input.
```

Resulting string:

```text
You are DIA, the Diaspora Intelligence Agent. You write a short cross-module daily brief for a member of the DNA platform (Diaspora Network of Africa). Tone: warm, direct, never corporate. Never use em-dashes (use a hyphen or restructure). Keep the headline under 12 words. Narrative under 3 sentences. Reference items by their natural names. Do not invent items not present in the input.
```
</details>

<details><summary>System prompt: dia-daily-pulse userPrompt (array, empty entries filtered, joined with "\n")</summary>

```text
${body.userFirstName ? `User first name: ${body.userFirstName}.` : ""}
Today across the user's Five C's:
${totals.events} upcoming event(s), ${totals.tasks} task(s) needing attention, ${totals.needs} open contribution need(s) in their spaces.
Raw context JSON: ${context}
Compose a brief and 3-5 highlights pointing to specific items.
```
</details>

#### dia-feedback

- **Auth:** reads `Authorization`, validates with the service-role client's `auth.getUser(token)`. `verify_jwt = false`.
- **Model resolution:** no model call. Imports `modelFor` from dia-core only to stamp `model: modelFor("reactive_query")` = `google/gemini-2.5-flash` on the row.
- **Flow:** body `{query_hash, helpful, variant?}`; inserts `dia_messaging_feedback` `{user_id, surface: "dia_search", helpful, ref_id: String(query_hash), model, variant}`. The insert error is not checked.
- **Reads / writes:** writes `public.dia_messaging_feedback` (created in `supabase/migrations/20260511170718_9effc3a8-667d-40ee-a942-ff0ccab59bfe.sql:20`).
- **Tools:** none.
- **Returns (verbatim):** 401 `{"error":"Unauthorized"}` (no header), 401 `{"error":"Invalid token"}`, 400 `{"error":"query_hash and helpful required"}`, 200 `{"success":true}`, 500 `{"error":<message or "server_error">}`.
- **Caller chains:** live: (1) header `openDia()` (`src/components/UnifiedHeader.tsx:445` / `src/components/mobile/DnaMobileHeader.tsx:121`) -> `DiaSheetMount` `src/App.tsx:387` -> `src/components/dia/DiaSheet.tsx:119` `<DiaSearch source="dia-sheet">` -> thumbs button -> `supabase.functions.invoke('dia-feedback')` at `src/components/dia/DiaSearch.tsx:327`. (2) route `/dna/convey` -> `src/pages/dna/Convey.tsx:4` -> `src/pages/dna/convey/ConveyStoryHub.tsx:356` `<DiaContextual pillar="convey">` -> `src/components/dia/DiaContextual.tsx:78` / `:132` `<DiaSearch>` -> `DiaSearch.tsx:327`.

#### dia-hub-intelligence

- **Auth:** `requireUser`; `user_id` forced to the caller. `verify_jwt = false`.
- **Model resolution:** none. No `callModel`, no gateway, no dia-core import (imports `requireUser` from `_shared/auth.ts`). `docs/audits/codebase-bug-audit-2026-08-07.md:134` records the same.
- **Flow:** `hub.metadata` from in-file constants `REGION_CONFIG` (north-africa, west-africa, east-africa, southern-africa, central-africa, each with name, tagline, description and a country list with flagcdn URLs) and `COUNTRY_CONFIG` (12 countries). `hub.metrics`: exact counts of `profiles` (`deleted_at is null`), upcoming `events` (`date_time >= now`), active `collaboration_spaces`; `contributions_total` and `stories_published` hardcoded `0`. Feeds by request flag: connect = recent `profiles`; convene = upcoming `events`; collaborate = active `collaboration_spaces`; contribute = open `opportunities`; convey = public `feed_posts`. None of the queries filter by hub region or country. `attendee_count`, `team_size` hardcoded `0`, `seeking_roles` `[]`. Uses the service-role client.
- **Reads / writes:** reads `profiles`, `events`, `collaboration_spaces`, `opportunities`, `feed_posts`; writes nothing.
- **Tools:** none.
- **Returns:** 200 JSON `{success:true, timestamp, cache_status:'miss', personalization_tier, hub, feeds}`; 500 `{success:false, error:<message>, timestamp}`.
- **Caller:** no caller found. No `functions.invoke`/URL reference in `src/`, migrations, or docs SQL. Older docs reference `adin-hub-intelligence` and a `useHubData.ts` hook (`docs/DNA-SYSTEM-COMPLETION-ASSESSMENT.md:162`); no `useHubData` exists in `src/`. Status: dead.

#### dia-inbox-brief

- **Auth:** `requireUser`; member-scoped client `makeUserClient(auth.token)` (anon key + member JWT, RLS applies) for all reads; service-role client for limits and audit.
- **Model resolution:** capability `inbox_brief` -> `google/gemini-3-flash-preview`; Lovable gateway, `LOVABLE_API_KEY`. No temperature or max_tokens. Forced tool `build_inbox_brief`.
- **Flow:** up to 30 `conversations` where caller is `user_a` or `user_b`; per conversation reads caller's `conversation_participants.last_read_at`; resolves other members' `profiles.full_name, username`; per DM reads up to 5 `messages` newer than `last_read_at` (or the last 24h) not sent by the caller, keeps 3, content sliced to 240 chars. Groups via RPC `get_group_conversations_for_user`, those with `unread_count > 0` (first 10), then RPC `get_group_messages(p_conversation_id, p_limit: 6, p_before_id: null)`, excluding own and `system` messages, keeps 3. If nothing, returns the empty payload with no model call. Otherwise `checkLimit`, builds a transcript of up to 8 threads, calls the model, writes `dia_events`, `recordUsage`, returns the payload.
- **Reads / writes:** reads `conversations`, `conversation_participants`, `profiles`, `messages`, RPCs `get_group_conversations_for_user`, `get_group_messages`, `dia_check_limit`; writes `dia_events`, RPC `dia_record_usage`. Message bodies are read and sent to the model.
- **Tools (function-calling):** `build_inbox_brief`, description `Return a structured cross-thread inbox brief.`; parameters `headline`, `narrative`, `highlights[]` of `{threadId, threadType: enum direct|group, title, oneLiner, suggestion}` (all required).
- **Member-facing / fallback strings (verbatim):** empty payload headline `You are all caught up across every thread.`, narrative `Nothing new across your inbox right now. Come back later for fresh activity.`. Missing model headline default `Here is what is new in your inbox.`. Limit 429 `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",...}`. Gateway 429 `{"error":"Rate limited"}`, 402 `{"error":"Credits exhausted"}`, other 500 `{"error":"AI gateway error"}`, catch-all 500 `{"error":<message or "Unknown error">}`.
- **Caller chain:** live: route `/dna/feed` -> `src/layouts/BaseLayout.tsx:166-169` (rendered when `user && location.pathname.startsWith('/dna/feed')`) `<MorningBriefBanner />` -> `src/components/pulse/MorningBriefBanner.tsx:91` `useInboxBrief(eligible && !dismissed)` (eligible = signed in, `prefs.summariesEnabled` (default `true` in `src/hooks/messaging/useDiaMessagingPrefs.ts:12`), path `/dna/feed`, not yet seen today) -> `supabase.functions.invoke('dia-inbox-brief')` at `src/hooks/messaging/useInboxBrief.ts:39`. Second chain: `MorningBriefBanner.tsx:186` `<InboxDigestSheet>` (also opened by `?digest=open`) -> `src/components/pulse/InboxDigestSheet.tsx:42` `useInboxBrief(open && totalUnread > 0)` -> same invoke. Not gated by `MESSAGING_ENABLED`.

<details><summary>System prompt: dia-inbox-brief system</summary>

```text
You produce a short cross-thread inbox brief for the user. No em-dashes. Same language as the messages. Headline under 14 words. Narrative under 3 sentences, plain and warm. For each thread highlight, give one factual one-liner and one concrete next-step suggestion (under 12 words).
```
</details>

<details><summary>System prompt: dia-inbox-brief user message template</summary>

```text
Here are recent unread messages across the user's threads:\n\n${transcript}\n\nUse the build_inbox_brief tool.
```

Each transcript block is `Thread ${i + 1} [${head.threadType}] "${head.title}" (id=${head.threadId}):\n${lines}` with lines `  - ${m.author}: ${m.content}`, blocks joined with `\n\n`.
</details>

#### dia-search

- **Auth:** `requireUser`; tool calls use `makeUserClient(token)` (member JWT, RLS applies); service-role client for cache, logs, limits, audit. `verify_jwt = false`.
- **Model resolution:** capability `reactive_query` -> `google/gemini-2.5-flash`; Lovable gateway, `LOVABLE_API_KEY`. Loop call: `tools: TOOL_DEFINITIONS`, `toolChoice: "auto"`, `temperature: 0.2`, `maxTokens: 900`. Follow-up call: same model, `temperature: 0.4`, `maxTokens: 120`, no tools. The `web_search` tool calls Perplexity `sonar` at `https://api.perplexity.ai/chat/completions` with `PERPLEXITY_API_KEY`. Audit and `dia_queries.model_used` record `modelFor(CAPABILITY)`; audit rows hardcode `provider: "gemini"`.
- **Limits in code:** `MAX_TOOL_STEPS = 6`, `MAX_TOOL_CALLS_TOTAL = 12`, `MAX_TOOL_ERRORS = 2` per tool, `MAX_TOKENS_TOTAL = 6000`, `MAX_PRIOR_TURNS = 4`, prior answers clipped to 600 chars, query max 500 chars.
- **Flow:** validates body `{query, source = "dashboard", prior_turns[]}`. `sanitizeQuery` replaces four injection regexes (`ignore (all )?(previous|above|prior) (instructions|prompts?)`, `disregard (the )?system prompt`, `you are now ... (assistant|dan|jailbreak|developer mode)`, `print (your )?(system|initial) prompt`) with `[redacted]`; blocks when under 8 chars remain (logs `dia_query_log` with `blocked_reason`, writes failed `dia_events`). Hash = SHA-256 of `${userId}:${normalized}`. `checkLimit`. Non-follow-ups check `dia_queries` for an unexpired row by `query_hash`; a hit bumps `cache_hits`. A miss runs the tool loop (system prompt, up to 4 prior turns, query; executes tool calls with per-call cache; after 6 steps sends a final user turn `Summarize the tool results concisely.`), dedupes results by id, inserts `dia_queries` (expires in 24h, `estimated_cost: 0`), `recordUsage`, logs `dia_query_log`. If turns remain and an answer exists, generates 3 follow-ups. Writes `dia_events` (meta `cache_hit, tools_fired, source, sanitize_reason`).
- **Reads / writes:** reads `dia_queries`, RPC `dia_check_limit`, plus tool tables (below); writes `dia_queries`, `dia_query_log`, `dia_events`, RPC `dia_record_usage`.
- **Tools:** the 9 in `_shared/dia-tools.ts`, listed in that subsection below.
- **Member-facing / fallback strings (verbatim):** 400 `{"error":"Thread limit reached","message":"Start a new question to keep asking."}`; 400 `{"error":"Query is required"}`; 400 `{"error":"Query too long","message":"Max 500 chars"}`; 400 `{"error":"Query blocked","message":"Your question was blocked by DIA's safety filter. Try rephrasing."}`; 429 `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",limit,used,resets_at}`; loop-exhausted answer default `I gathered some results but couldn't finish synthesizing.`; 500 `{"error":"Internal server error","message":<message or "Something went wrong">}`. Internal: `Empty model response` thrown when no message. Tool-loop messages to the model: `{"error":"tool_budget_exhausted"}`, `{"error":"tool_disabled_after_repeated_errors"}`.
- **Caller chains:** live: (1) header `openDia()` (`src/components/UnifiedHeader.tsx:445` / `src/components/mobile/DnaMobileHeader.tsx:121`), or `src/components/right-rail/AskDiaCta.tsx:37` `openWith(prompt)` -> `DiaSheetMount` `src/App.tsx:387` -> `src/components/dia/DiaSheet.tsx:119` `<DiaSearch source="dia-sheet">` -> `supabase.functions.invoke('dia-search')` at `src/components/dia/DiaSearch.tsx:382`. (2) route `/dna/convey` -> `src/pages/dna/Convey.tsx:4` -> `src/pages/dna/convey/ConveyStoryHub.tsx:356` `<DiaContextual pillar="convey">` -> `src/components/dia/DiaContextual.tsx:78` / `:132` `<DiaSearch>` -> `DiaSearch.tsx:382`.

<details><summary>System prompt: dia-search SYSTEM_PROMPT (tool loop)</summary>

```text
You are DIA (Diaspora Intelligence Agent), the intelligence layer for DNA — the platform mobilizing the Global African Diaspora.

You have TWO kinds of tools:
1. PLATFORM tools (search_my_network, search_platform_people, recent_convene_joins, find_events, find_spaces, find_opportunities, my_post_analytics, find_stories_and_posts) — these read the user's DNA data under their permissions.
2. web_search — searches the OPEN WEB via Perplexity.

Routing rules (STRICT):
- If the question is about "my network", "my connections", "my posts", "my events", "my spaces", things happening ON DNA, or lists of people/events/opportunities that DNA members would have — use PLATFORM tools FIRST. Never answer these from memory. Never call web_search for them.
- Only use web_search for macro news, external facts, or clearly external topics.
- You may call multiple platform tools if needed. Compose your answer from the tool results.
- If a platform tool returns 0 results, say so plainly ("I looked and didn't find any X yet") and suggest one concrete adjacent action the user could take. Do NOT fabricate results. Do NOT switch to web_search as a workaround for missing platform data.
- Keep answers concise (under 180 words), grounded in tool results, and never invent people or events.
- Cite web sources only when web_search was actually used.
```
</details>

<details><summary>System prompt: dia-search generateFollowUps system</summary>

```text
You suggest 3 concise follow-up questions a DNA (Diaspora Network of Africa) member could ask DIA next, based on the answer they just received. Each under 60 chars. Output ONLY a JSON array of 3 strings, nothing else.
```

User turn template: `Question: ${question}\n\nAnswer: ${answer.slice(0, 800)}\n\nSuggest 3 follow-ups as JSON array.`
</details>

<details><summary>System prompt: dia-search final synthesis turn (appended as a user message after 6 tool steps)</summary>

```text
Summarize the tool results concisely.
```
</details>

#### _shared/dia-tools.ts (tool registry for dia-search)

- **Path / lines:** `supabase/functions/_shared/dia-tools.ts` (470). Exports `TOOL_DEFINITIONS`, `executeTool`, `makeUserClient`, `emptyResults`, types `ToolContext`, `AggregatedResults`; re-exported by `_shared/dia-core/index.ts`.
- **Client:** every platform tool uses the caller-scoped client from `makeUserClient` (anon key + member JWT, RLS applies). `ROW_CAP = 20`; text returned to the model carries at most 8 items.
- **Status:** live via dia-search only (no other importer among the functions in this section).

Tools (name and description verbatim, then what the implementation reads):

1. `search_my_network`: "Find people already in the user's accepted connections. Use for questions like 'who in my network...', 'my connections in X sector', 'friends who joined Y'." Params `query` ("Free-text keywords (headline, bio, skills, location)."), `location` ("Optional city/region/country filter."), `industry` ("Optional industry filter."). Reads `connections` (`status = 'accepted'`, caller as requester or recipient, limit 500) then `profiles` (`id, full_name, headline, avatar_url, location, industry, skills`) with `ilike` on `location`, `industry`, and `headline|bio|full_name`. Relevance label `In your network`.
2. `search_platform_people`: "Find ANY public members on the platform matching filters. Use for open lookups like 'artisans in Kenya', 'farmers in North America', 'fintech founders in Ghana'." Params `query` ("Free-text keywords across headline/bio/skills/industry."), `location`, `industry`. Reads `profiles` with the same filters. Relevance label `Platform match`.
3. `recent_convene_joins`: "List people from my network who recently RSVP'd/joined an event on Convene. Answers 'who in my network just joined Convene?'" Param `since_days` ("Look-back window in days. Default 14."). Reads `connections`, `event_attendees` (`user_id, event_id, created_at, events(id, title, start_time)`), `profiles`. Empty-network text: `{"joins":[],"note":"You have no accepted connections yet."}`.
4. `find_events`: "Search upcoming DNA events by topic/keyword/location. Use for 'events about X', 'upcoming events in Lagos', etc." Params `query`, `location`. Reads `events` (`is_public = true`, `start_time >= now`, `ilike` title/description/location).
5. `find_spaces`: "Find collaboration spaces (projects) the user is a member of, optionally filtered by keyword or status." Params `query`, `status` ("e.g. 'active', 'archived'"). Reads `space_members` (caller, limit 200) then `spaces` (`id, title, status, description`).
6. `find_opportunities`: "Search open contribution needs (Contribute hub). Use for 'opportunities in X sector', 'needs in Kenya', etc." Params `query`, `region`, `focus_area`. Reads `opportunities` (`status in ('active','in_progress')`, `ilike` title/description, `specific_region`, `tags` contains).
7. `my_post_analytics`: "Return view/engagement counts for posts the current user authored over the past N days. Use for 'how many people viewed my posts', 'engagement on my recent post', etc." Param `since_days` ("Look-back window in days. Default 30."). Reads `posts` (`author_id = caller`, `is_deleted = false`), counts `post_likes` and `post_comments`. Returns `window_days, post_count, total_views, total_likes, total_comments, top_posts` (numeric counts, passed to the model and into `network_matches.analytics`).
8. `find_stories_and_posts`: "Search public posts and stories on Convey by topic or keyword." Params `query`, `since_days` ("Optional look-back window. Default 90."). Reads `posts` (`is_deleted = false`, `privacy_level = 'public'`), `profiles` for author name/avatar. Name fallback `DNA Member`, title fallback `Untitled`.
9. `web_search`: "Search the OPEN WEB via Perplexity for macro news, external facts, or anything not stored in DNA. Do NOT use for questions about the user's network, posts, events, or platform members." Params `query` (required), `recency` (enum `day|week|month|year`, "Optional recency filter."). POSTs to `PERPLEXITY_URL` with model `sonar`, `max_tokens: 700`, `temperature: 0.2`, `return_citations: true`, optional `search_recency_filter`; collects `citations`. Missing key text: `{"error":"web_search unavailable"}`; non-2xx: `{"error":"web_search failed: <status>","details":...}`.

Unknown tool text: `{"error":"Unknown tool: <name>"}`; thrown errors return `{"error":<message or "tool_error">}`.

<details><summary>System prompt: dia-tools web_search (Perplexity system message)</summary>

```text
Answer concisely with citations. Focus on Africa, diaspora, and allied communities where relevant.
```
</details>

#### dia-smart-chips

- **Auth:** no `requireUser`; reads the `Authorization` header into an anon-key client and calls `auth.getUser()`. No or invalid header returns the fallback chips (200). Not listed in config.toml (platform default applies).
- **Model resolution:** none. Header comment: "Rule-based, no LLM cost." No dia-core import.
- **Flow:** with a member: (1) any `event_registrations` row for the caller in the last 30 days -> chip `network-joins`; (2) latest `event_registrations` with embedded `events(id, title, start_date)` filtered `events.start_date >= now` -> chip `event-brief`; (3) first `space_members` with embedded `spaces(id, name)` -> chip `space-health`; (4) any `posts` by caller in last 30 days -> chip `my-post-analytics`. Tops up from fallback to 4 max; `personalized` true if any non-`discover` chip.
- **Reads / writes:** reads `event_registrations`, `events` (embedded), `space_members`, `spaces` (embedded), `posts`; writes nothing.
- **Tools:** none.
- **Member-facing strings (verbatim):** fallback chips: label `Latest African fintech funding` / prompt `Latest fintech funding across Africa this month`; label `Diaspora renewable projects` / prompt `Diaspora-led renewable energy projects in East Africa`; label `Markets hiring tech talent` / prompt `Which African markets are hiring senior tech talent right now?`. Personal chips: label `Who in my network joined an event lately?` / prompt `Who in my network recently RSVPd to an event?`; label `` `Brief me on ${truncate(nextEvent.title, 32)}` `` / prompt `` `What should I know before attending ${nextEvent.title}?` ``; label `` `What's active in ${truncate(mySpace.name, 32)}?` `` / prompt `` `Summarize recent activity and open tasks in ${mySpace.name}` ``; label `How are my posts performing?` / prompt `How many people viewed and reacted to my posts in the last 30 days?`. Any error returns the fallback set.
- **Caller chains:** live: (1) route `/dna/feed` -> `src/pages/dna/Feed.tsx:276` `<FeedCommunityPulse />` -> `src/components/feed/FeedCommunityPulse.tsx:9` `<DnaRightRail />` -> `src/components/right-rail/DnaRightRail.tsx:21` `<AskDiaCta />` -> `supabase.functions.invoke('dia-smart-chips')` at `src/components/right-rail/AskDiaCta.tsx:66` (enabled when signed in). (2) header `openDia()` -> `DiaSheetMount` `src/App.tsx:387` -> `src/components/dia/DiaSheet.tsx:37` (enabled while the sheet is open).

#### dia-smart-compose

- **Auth:** `requireUser`; `makeUserClient` for the profile read; service-role for limits/audit.
- **Model resolution:** capability `smart_compose` -> `google/gemini-3-flash-preview`; Lovable gateway, `LOVABLE_API_KEY`. No temperature or max_tokens. Forced tool `suggest_openers`.
- **Flow:** body `{otherUserId}`; reads `profiles` (`id, full_name, headline, bio, current_city, current_country, ethnic_heritage, professional_sectors`) for caller and other member; if the other profile is not visible returns empty suggestions with no model call; `checkLimit`; context lines `Sender: name=...; headline=...; sector=...; heritage=...; location=...` and `Recipient: ...`; model; `dia_events`; `recordUsage`; returns up to 3 trimmed suggestions with U+2014 replaced by `-`.
- **Reads / writes:** reads `profiles`, RPC `dia_check_limit`; writes `dia_events`, RPC `dia_record_usage`.
- **Tools (function-calling):** `suggest_openers`, description `Return 3 short opening message suggestions.`; parameter `suggestions` string array, `minItems: 3`, `maxItems: 3`.
- **Returns (verbatim):** 400 `{"error":"otherUserId required"}`; 403 `{"error":<profile query error message>}`; 200 `{"suggestions":[],"basedOnUserId":...}` when the other profile is not readable; limit 429 `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",...}`; gateway 429 `{"error":"Rate limited"}`, 402 `{"error":"Credits exhausted"}`, other 500 `{"error":"AI gateway error"}`; catch-all 500 `{"error":<message or "Unknown error">}`.
- **Caller chain:** live (overlay path only): route `/dna/:username` (`src/App.tsx:523`) -> `src/pages/ProfileV2.tsx:446` `<ManifestRenderer>` / `:450` `<NeedsRenderer>` -> `src/components/contribute/manifest/ManifestRenderer.tsx:74` `<CurrencyStanceCard variant="renderer">` / `src/components/contribute/needs/NeedsRenderer.tsx:59` `<NeedCard variant="renderer">` -> "Reach out about this stance" `CurrencyStanceCard.tsx:132` / "Reach out about this Need" `NeedCard.tsx:183` (open needs only) -> `openMessageOverlay` (`src/contexts/MessageContext.tsx:61`) -> `<MessageOverlay>` `MessageContext.tsx:131` -> `src/components/messaging/MessageOverlay.tsx:119` `<ChatThread>` -> `src/components/messaging/inbox/ChatThread.tsx:686` `<SmartComposeSuggestions>` (rendered when the thread has zero messages and `smartRepliesEnabled !== false`) -> `src/components/messaging/dia/SmartComposeSuggestions.tsx:29` `useDiaSmartCompose` -> `supabase.functions.invoke('dia-smart-compose')` at `src/hooks/messaging/useDiaSmartCompose.ts:22`. The `/dna/messages/:conversationId` route path (`src/pages/dna/Messages.tsx:173`, `:246`) is redirected because `MESSAGING_ENABLED = false`.

<details><summary>System prompt: dia-smart-compose system</summary>

```text
You generate 3 short opening messages for a first-time 1:1 chat between two members of the African diaspora network. Each opener must: be under 22 words, be warm but professional, reference one concrete shared dimension (sector, heritage, location, or work) when available, never use em-dashes, never use emojis, and never invent facts not in context. Return via the suggest_openers tool.
```
</details>

<details><summary>System prompt: dia-smart-compose user message template</summary>

```text
Context:\n${context}\n\nWrite 3 distinct openers the Sender could send to the Recipient. Vary tone: 1 warm intro, 1 curiosity question, 1 specific collaboration prompt.
```
</details>

#### dia-smart-replies

- **Auth:** `requireUser`; `makeUserClient` for messages; service-role for limits/audit.
- **Model resolution:** capability `smart_replies` -> `google/gemini-3-flash-preview`; Lovable gateway, `LOVABLE_API_KEY`. No temperature or max_tokens. Forced tool `suggest_replies`.
- **Flow:** body `{conversationId}`; reads last 12 `messages` (`id, sender_id, content, created_at, is_deleted`), drops deleted; no inbound message returns `{suggestions:[], basedOnMessageId:null}` with no model call; `checkLimit`; transcript lines `You: ...` / `Them: ...`; model; `dia_events`; `recordUsage`; returns up to 3 trimmed suggestions and `basedOnMessageId`.
- **Reads / writes:** reads `messages` (bodies sent to the model), RPC `dia_check_limit`; writes `dia_events`, RPC `dia_record_usage`.
- **Tools (function-calling):** `suggest_replies`, description `Return 3 short reply suggestions.`; parameter `suggestions` string array, `minItems: 2`, `maxItems: 3`.
- **Returns (verbatim):** 400 `{"error":"conversationId required"}`; 403 `{"error":<messages query error>}`; limit 429 `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",...}`; gateway 429 `{"error":"Rate limited"}`, 402 `{"error":"Credits exhausted"}`, other 500 `{"error":"AI gateway error"}`; catch-all 500 `{"error":<message or "Unknown error">}`.
- **Caller chains:** live (overlay path only): same chain as dia-smart-compose through `src/components/messaging/MessageOverlay.tsx:119` `<ChatThread>` -> `src/components/messaging/inbox/ChatThread.tsx:395` `useDiaSmartReplies(conversationId, lastInboundMessageId, !isBlocked && !replyingTo && diaPrefs.smartRepliesEnabled)` -> `supabase.functions.invoke('dia-smart-replies')` at `src/hooks/messaging/useDiaSmartReplies.ts:27`. Dead chain: `src/components/messaging/group/GroupThreadView.tsx:183` is reached only via `src/pages/dna/GroupThread.tsx:4`, whose route `/dna/messages/group/:groupId` is redirected while `MESSAGING_ENABLED = false`.

<details><summary>System prompt: dia-smart-replies system</summary>

```text
You generate 3 short reply suggestions for a 1:1 chat. Replies must be under 12 words, sound natural, in the same language as the last inbound message, and never use em-dashes. No emojis unless the conversation already uses them. Return via the suggest_replies tool.
```
</details>

<details><summary>System prompt: dia-smart-replies user message template</summary>

```text
Conversation:\n${transcript}\n\nReply as "You".
```
</details>

#### dia-thread-summary

- **Auth:** `requireUser`; `makeUserClient` for all reads and the cache write; service-role for limits/audit.
- **Model resolution:** capability `thread_summary` -> `google/gemini-3-flash-preview`; Lovable gateway, `LOVABLE_API_KEY`. No temperature or max_tokens. Forced tool `summarise_thread`.
- **Flow:** body `{conversationId, force?, sinceMessageId?, audienceName?}`; reads `conversations.summary_payload, last_summarised_message_id`; since = `sinceMessageId`'s `created_at` or last 24h; reads up to 80 `messages` since then, drops deleted; none returns the "nothing new" payload; when no `sinceMessageId`, not `force`, and the cached `last_summarised_message_id` equals the newest id, returns the cached payload without a model call; else `checkLimit`, resolves other senders' `profiles.full_name`, transcript lines `[${m.id}] ${who}: ${content}`, model, `dia_events`, `recordUsage`; writes the payload back to `conversations` when cacheable.
- **Reads / writes:** reads `conversations`, `messages` (bodies sent to the model), `profiles`, RPC `dia_check_limit`; writes `conversations.summary_payload`, `conversations.last_summarised_message_id` (columns added in `supabase/migrations/20260511165623_f7596be0-9bc2-4170-a1c9-23dca226f364.sql`), `dia_events`, RPC `dia_record_usage`.
- **Tools (function-calling):** `summarise_thread`, description `Return a structured summary of the conversation.`; parameters `headline` ("One-sentence summary, under 16 words."), `bullets` ("3 to 5 key points, decisions, or status updates."), `openQuestions` ("Questions the other party left unanswered. Empty if none."), `actionItems[]` of `{title, kind: enum task|event|note, context, sourceMessageId}` (required `title, kind, context`).
- **Member-facing / fallback strings (verbatim):** empty headline `Nothing new to catch up on.`; missing model headline default `Recent conversation summary`; 400 `{"error":"conversationId required"}`; 403 `{"error":<messages query error>}`; limit 429 `{"error":"Monthly query limit reached","message":"You've used all your DIA queries this month",...}`; gateway 429 `{"error":"Rate limited"}`, 402 `{"error":"Credits exhausted"}`, other 500 `{"error":"AI gateway error"}`; catch-all 500 `{"error":<message or "Unknown error">}`.
- **Caller chain:** live (overlay path only): same chain as dia-smart-compose through `src/components/messaging/MessageOverlay.tsx:119` `<ChatThread>` -> `src/components/messaging/inbox/ChatThread.tsx:611` `onCatchMeUp` (present when `diaPrefs.summariesEnabled`) sets `summaryOpen` -> `ChatThread.tsx:903` `<MessageSummaryDrawer>` -> `src/components/messaging/dia/MessageSummaryDrawer.tsx:39` `useThreadSummary` -> `supabase.functions.invoke('dia-thread-summary')` at `src/hooks/messaging/useThreadSummary.ts:28`. Dead chain: `src/components/messaging/group/GroupThreadView.tsx:579` (route `/dna/messages/group/:groupId` redirected).

<details><summary>System prompt: dia-thread-summary system</summary>

```text
You summarise a recent group or 1:1 chat for ${audienceName ? audienceName : 'the user'}. Be concise. No em-dashes. Use the same language as the conversation. Each bullet must be a complete sentence under 18 words. Action items must be concrete and assignable. When summarising a group, attribute statements to the speaker (e.g. "Ama proposed..."). Use the summarise_thread tool.
```
</details>

<details><summary>System prompt: dia-thread-summary user message template</summary>

```text
Recent messages (oldest first):\n${transcript}
```
</details>

#### dia-trigger-prompt

- **Auth:** `requireInternal`, else `requireUser`; a non-internal caller may only pass its own `user_id` (403 otherwise). Not listed in config.toml.
- **Model resolution:** none. No dia-core import.
- **Flow:** body `{user_id, event_type}`; service-role client calls RPC `trigger_dia_prompt(target_user_id, event_type)`; returns `{success:true, data}`.
- **Reads / writes:** RPC `trigger_dia_prompt`. In-file comment says it was "renamed from trigger_adin_prompt in B3 move 1; verified present in live catalog 2026-07-10". `src/integrations/supabase/types.ts:14885` declares `trigger_dia_prompt(event_type, target_user_id)` returning void. No migration creating or renaming to `trigger_dia_prompt` was found; the only definition in `supabase/migrations/` is `public.trigger_adin_prompt` in `20250801062316_57e6f3d5-6b74-4d60-beee-4f1b8633ad3a.sql:60-80`, which updates `profiles.adin_prompt_status` to `prompted` (from `none`/`eligible`) and upserts `adin_profiles (id, prompted_by_event, last_updated)`.
- **Tools:** none.
- **Returns (verbatim):** 400 `{"error":"Missing user_id or event_type"}`; 403 `{"error":"Forbidden: can only trigger DIA prompt for your own user_id"}`; 500 `{"error":<rpc or thrown message>}`.
- **Caller:** no caller found in `src/`, migrations, `docs/CRON-SETUP.sql` or `docs/*.sql`. Status: dead.

#### curate-diaspora-events

- **Auth:** `requireInternal` (service-role Bearer or `x-cron-secret`). `verify_jwt = false`.
- **Model resolution:** not the Lovable gateway. Direct POST to `PERPLEXITY_URL` = `https://api.perplexity.ai/chat/completions`, `model: PERPLEXITY_MODEL` = `sonar`, `Authorization: Bearer ${PERPLEXITY_API_KEY}`, `temperature: 0.1`, `response_format: { type: "json_schema", json_schema: { name: "diaspora_events", schema: EVENT_SCHEMA } }`. Constants come from dia-core; the call does not go through `callModel`.
- **Flow:** parses `choices[0].message.content` as JSON `{events:[...]}`; reads existing `events` where `is_curated = true` for a `lower(trim(title))|date` dedupe set; per new event inserts into `events` with `event_type` coerced to `conference|workshop|meetup|webinar|networking|social|other` (else `other`), `format` to `in_person|virtual|hybrid` (else `in_person`), a hardcoded Unsplash cover URL per type, a slug from the title (80 chars), `organizer_id: null`, `is_public: true`, `is_published: true`, `status: "published"`, `is_curated: true`, `curated_source: "perplexity"`, `curated_source_url: website_url || null`, `curated_at: now`, `tags`, `timezone: "UTC"`. A `23505` unique violation (index `idx_events_curated_dedupe_key`, migration `20260808110000_curated_events_dedupe_constraint.sql`) counts as skipped. Writes one `dia_events` row (`principal_type: 'service'`, `capability: 'curate'`, `provider: 'perplexity'`, `model: 'sonar'`).
- **Reads / writes:** reads `events`; writes `events`, `dia_events`.
- **Tools:** none (structured output schema only: `events[]` of `title, description, event_type, format, location_name, location_city, location_country, start_time, end_time, website_url (string|null), tags[]`, all but `website_url` required).
- **Returns:** 200 `{success:true, total_from_perplexity, inserted, skipped, errors}`; 500 `{success:false, error:<message>}` with internal messages such as `PERPLEXITY_API_KEY is not configured`, `No content in Perplexity response`, `No events returned from Perplexity`. Not member-facing.
- **Caller chain:** scheduled: `docs/CRON-SETUP.sql:36-46` `cron.schedule('weekly-curate-diaspora-events', '0 11 * * 0', ...)` running `net.http_post(url := 'https://ybhssuehmfnxrzneobok.supabase.co/functions/v1/curate-diaspora-events', headers := {"Content-Type": "application/json", "Authorization": "Bearer <project anon key JWT, role "anon">"}, ...)`. The function's `requireInternal` accepts only the service-role key as Bearer or a matching `x-cron-secret`; the request as written carries the anon key and no `x-cron-secret`, so it would receive 401. This schedule lives in a `docs/` SQL file; no `cron.schedule` for this function exists in `supabase/migrations/`. No frontend caller found (`src/pages/admin/CuratedSourceReviews.tsx` does not reference it).

<details><summary>System prompt: curate-diaspora-events system</summary>

```text
You are a research assistant that finds real upcoming events relevant to the African diaspora. Return only factual, verifiable events. If you cannot find enough real events, return fewer rather than inventing fictional ones.
```
</details>

<details><summary>System prompt: curate-diaspora-events PERPLEXITY_PROMPT (sent as the user turn)</summary>

```text
Find 15-20 real upcoming events in 2026 relevant to the African diaspora community worldwide. Include conferences, summits, festivals, workshops, and networking events. Cover categories: tech, business/investment, culture/arts, healthcare, education, and social impact. Include events in Africa (Lagos, Nairobi, Accra, Kigali, Cape Town, Addis Ababa) AND diaspora cities (London, New York, Atlanta, Toronto, Paris, Dubai). For each event provide: title, description (2-3 sentences), event_type (one of: conference, workshop, meetup, networking, social, other), format (one of: in_person, virtual, hybrid), location_name (venue name), location_city, location_country, start_time (ISO 8601 datetime), end_time (ISO 8601 datetime), website_url (the event's actual website URL if known, otherwise null), tags (array of 2-4 relevant tags like "tech", "investment", "culture", "health", "education", "social"). Only include real events that are actually scheduled or have been announced. Do not invent fictional events.
```
</details>

### A1. Edge functions (part 2: DIA-adjacent generators)

Source: `/home/user/dna` (jodombrown/dna) at `b6cd764b0499614c8636d136ef648d6f6c9f2601`. All paths below are relative to that root. Line counts are `wc -l`.

**Method.** All 60 directories under `supabase/functions/` (excluding `_shared`) were grepped for LLM endpoints (`chat/completions`, `audio/transcriptions`, `ai.gateway`, `api.openai`, `api.perplexity`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`), `dia-core` imports, `dia_*` table access, and suggestion/nudge/brief/recommendation/match/insight logic. Status was traced from `src/main.tsx` -> `src/App.tsx` through a static import graph (alias `@/` and relative imports, lazy `import()` included), then confirmed by reading each call site. Schedules were taken only from `cron.schedule` / `net.http_post` in `supabase/migrations/*.sql` and `docs/*` (see A8).

**Included (17):** ai-search, global-search, transcribe-voice, get-event-recommendations, suggest-usernames, connection-health-analyzer, generate-connect-nudges, generate-daily-briefs, generate-opportunity-nudges, engagement-reminders, engagement-tracker, process-automated-nudges, watch-curated-sources, notify-window-decay, mcp (the 15 named candidates plus process-automated-nudges), and two functions included only because they write a `dia_*` table: unsubscribe-email (updates `dia_preferences`) and delete-account (deletes from seven `dia_*` tables).

**Excluded (30), no LLM call, no dia-core import, no `dia_*` write, no suggestion/nudge generation:** auth-email-hook (uses `LOVABLE_API_KEY` only as webhook signing secret and preview bearer, `auth-email-hook/index.ts:134,175`), auto-archive-releases, compress-image, create-event, create-payment, generate-sitemap, geocode-city, guest-rsvp, handle-beta-approval, link-preview, messages-cleanup, messaging-email-digest, oembed-proxy, place-search, seed-test-accounts, send-beta-access-granted, send-connection-request, send-contact-email, send-event-blasts, send-event-reminders, send-magic-link, send-newsletter, send-notification-email (reads `dia_preferences` only, `:309`), send-password-reset, send-push-notification (reads `dia_preferences` only, `:128`), send-survey-response, send-universal-email, send-welcome-email, stripe-webhook, verify-payment. The 13 dia-* / curate functions named in the brief are covered in another section.

**Shared auth helper referenced below:** `requireUser` (`supabase/functions/_shared/auth.ts:35-46`, validates a user JWT via anon client `auth.getUser`), `requireInternal` (`_shared/auth.ts:70-81`, accepts only `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret` equal to env `CRON_SECRET`).

#### Summary table

| Function | Path (lines) | What it does (one sentence) | Model / provider | Tools | Reads | Writes | Via dia-core | In config.toml (+verify_jwt) | Caller | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| ai-search | `supabase/functions/ai-search/index.ts` (289) | Sends the query to an LLM for intent JSON, then ilike-searches profiles and events with the expanded terms. | `gpt-4o-mini`, OpenAI direct (`api.openai.com/v1/chat/completions`, `OPENAI_API_KEY`) | none | `profiles`, `events` (caller JWT, RLS) | none | No (bypass) | Yes, `verify_jwt = false` (config.toml:33-34) | `src/services/searchService.ts:118` (`aiSearch`) | dead: searchService.ts has no importer |
| global-search | `supabase/functions/global-search/index.ts` (452) | Combines DB ilike results with a Perplexity web search, re-scores all results with an LLM, and generates 6 LLM search suggestions. | Perplexity `llama-3.1-sonar-small-128k-online` (`PERPLEXITY_API_KEY`); OpenAI `gpt-4o-mini` x2 (`OPENAI_API_KEY`) | none | `profiles`, `events`, `projects` (caller JWT) | none | No (bypass) | Yes, `verify_jwt = false` (:85-86) | `src/services/searchService.ts:61` (`globalSearch`) | dead: searchService.ts has no importer |
| transcribe-voice | `supabase/functions/transcribe-voice/index.ts` (123) | Transcribes a voice-message audio file (base64 or storage URL) to text. | OpenAI `whisper-1` (`/v1/audio/transcriptions`, `OPENAI_API_KEY`) | none | audio URL on project storage host | none | No (bypass) | No | `src/components/messaging/inbox/VoiceMessagePlayer.tsx:164` | dead: guarded by `const transcriptionEnabled = false` (:150), returns at :158 before invoke |
| get-event-recommendations | `supabase/functions/get-event-recommendations/index.ts` (237) | Loads up to 50 upcoming public events plus the user's interests, groups, connections and attendee counts, and asks the LLM for a scored top-10 with reasoning. | `google/gemini-2.5-flash` via Lovable AI gateway (`callModel`, capability `event_recommendations`) | forced function `recommend_events` | `profiles`, `group_members`, `connections`, `events`, `event_attendees` (user client); RPC `dia_check_limit` | `dia_events` (writeEvent); RPC `dia_record_usage` | Yes | Yes, `verify_jwt = true` (:81-82) | `src/components/events/EventRecommendations.tsx:41` | dead: EventRecommendations.tsx has no importer |
| suggest-usernames | `supabase/functions/suggest-usernames/index.ts` (180) | Asks the LLM for 8 name-based username suggestions as JSON, with a deterministic fallback on parse failure. | `google/gemini-2.5-flash` via gateway (`callModel`, capability `suggest_usernames`) | none | request body only; RPC `dia_check_limit` | `dia_events`; RPC `dia_record_usage` | Yes (limits/audit/model); identity from `_shared/auth.ts` | Yes, `verify_jwt = false` (:115-116) | `src/components/onboarding/steps/UsernameStep.tsx:71` | live: `UsernameStep` <- `src/pages/Onboarding.tsx:397` <- `App.tsx:423` route `/onboarding` (auto on mount :41-45 and button :264) |
| connection-health-analyzer | `supabase/functions/connection-health-analyzer/index.ts` (274) | Computes a 0-100 health score per accepted connection from messages, comments and reactions, and inserts a `weak_connection` nudge for both members when the gap is 60+ days. | none | none | `connections`, `conversations`, `messages`, `post_comments`, `post_reactions`, `profiles` (service role) | `dia_nudges` | No | Yes, `verify_jwt = false` (:39-40) | no caller found (no client invoke, no schedule) | dead |
| generate-connect-nudges | `supabase/functions/generate-connect-nudges/index.ts` (116) | Inserts `first_connections` nudges for zero-connection users (with 3 suggested ids) and `reengagement` nudges for inactive users. | none | none | RPCs `get_users_needing_connection_nudges`, `get_suggested_connections`, `get_inactive_users_for_reengagement` | `dia_nudges` | No | Yes, `verify_jwt = false` (:77-78) | no caller found | dead |
| generate-daily-briefs | `supabase/functions/generate-daily-briefs/index.ts` (400) | Builds up to three rule-based brief cards per active user (one per C module, fallbacks to fill) and replaces that day's rows. | none | none | `profiles`, `connections`, `trend_follows`, `opportunities`, `events`, `spaces`, `space_members`; RPC `get_trending_hashtags` | `dia_brief_cards` (delete + insert) | No | No | no caller found | dead |
| generate-opportunity-nudges | `supabase/functions/generate-opportunity-nudges/index.ts` (480) | Scores open opportunities against up to 100 profiles (skills, interests, region, contribution history) and inserts up to 2 templated contribute nudges per user. | none | none | `profiles`, `dia_preferences`, `opportunities`, `opportunity_interests`, `space_members`, `contribution_badges`, `dia_nudges` | `dia_nudges` | No | No | no caller found | dead |
| engagement-reminders | `supabase/functions/engagement-reminders/index.ts` (247) | For users in tiers at_risk / dormant / moderate, inserts templated nudges (comeback, post, pending requests, profile) and logs them. | none | none | `user_engagement_tracking`, `dia_nudges`, `dia_preferences`, `connections`, `profiles` | `dia_nudges`, `reminder_logs` | No | Yes, `verify_jwt = false` (:73-74) | docs-only schedule `docs/CRON-SETUP.sql:22-33` | dead (no migration schedule, no client invoke) |
| engagement-tracker | `supabase/functions/engagement-tracker/index.ts` (247) | Computes a 7-day engagement score and tier per profile and upserts it. | none | none | `profiles`, `posts`, `post_comments`, `connections`, `messages`, `event_attendees` | `user_engagement_tracking` (upsert :186-188) | No | Yes, `verify_jwt = false` (:75-76) | docs-only schedule `docs/CRON-SETUP.sql:8-19` | dead (no migration schedule, no client invoke) |
| process-automated-nudges | `supabase/functions/process-automated-nudges/index.ts` (253) | Inserts templated nudges for overdue Collaborate tasks (1, 3, 7+ days) and stalled spaces. | none | none | `collaborate_tasks`, `spaces`, `space_activity_log`, `collaborate_nudges` | `collaborate_nudges`, `collaborate_tasks` (update), `space_activity_log` | No | No | no caller found | dead |
| watch-curated-sources | `supabase/functions/watch-curated-sources/index.ts` (129) | Fetches each unconfirmed curated event's source URL, hashes the text, and opens a `source_changed` review row when the hash changes. | none | none | `events`, external `curated_source_url` pages | `curated_source_reviews`, `events` (`source_last_hash`, `source_last_checked`) | No | Yes, `verify_jwt = false` (:47-48) | no caller found | dead |
| notify-window-decay | `supabase/functions/notify-window-decay/index.ts` (85) | Notifies subscribers once when an unconfirmed event's expected window has arrived, then stamps the event. | none | none | `events`, `event_date_subscriptions` | `notifications`, `events` (`date_decay_notified_at`) | No | Yes, `verify_jwt = false` (:49-50) | no caller found | dead |
| mcp | `supabase/functions/mcp/index.ts` (259) | Lovable-generated MCP server exposing three read-only tools to external agents. | none (serves tools; makes no model call) | MCP tools `get_profile`, `list_upcoming_events`, `list_communities` | RPCs `get_public_profile`, `list_public_events`; `communities` (anon/publishable key via REST) | `mcp_tool_events` (service role, telemetry) | No | No | no in-app invoke; URL string displayed by `src/pages/admin/AgentIntegrations.tsx:21` (no importer, not in App.tsx); registered in `.lovable/mcp/manifest.json:4`; test `src/test/mcp/mcpTools.e2e.test.ts:13` | dead (no mounted-route or schedule caller; external MCP clients are outside the tracing rule) |
| unsubscribe-email | `supabase/functions/unsubscribe-email/index.ts` (191) | Looks up `dia_preferences` by unsubscribe token and turns off all or one email category. | none | none | `dia_preferences` | `dia_preferences` (update :95) | No | Yes, `verify_jwt = false` (:117-118) | link URL built in `supabase/functions/send-notification-email/index.ts:96,115`; that function is invoked by `src/services/notificationService.ts:74` | live (indirect, recipient clicks email link): notificationService <- `src/hooks/usePostReactions.ts:84` <- `src/components/feed/PostCard.tsx` <- `src/components/feed/SearchDialog.tsx` <- `src/pages/dna/Feed.tsx` <- `App.tsx` |
| delete-account | `supabase/functions/delete-account/index.ts` (149) | Deletes a user's storage, related rows (including seven `dia_*` tables) and the auth user. | none | none | storage buckets `avatars`, `dna-media-public`, `post-media` | deletes from `connections`, `dia_nudges`, `dia_recommendations`, `dia_events`, `dia_user_usage`, `dia_query_log`, `dia_preferences`, `dia_messaging_events`, `profiles` (list :109-120, delete loop :122-128); `auth.admin.deleteUser` (:130) | No | No | `src/components/mobile/MobileSettingsView.tsx:32` | dead: MobileSettingsView imported only by `src/components/mobile/index.ts`, which has no importer |

#### ai-search

- Path: `supabase/functions/ai-search/index.ts` (289 lines). Env: `OPENAI_API_KEY` (:5), `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Auth: own bearer check plus `supabase.auth.getUser(token)` (:37-61); client is anon key with caller JWT (:50-54).
- Model call: `analyzeSearchIntent` (:93-184), `fetch('https://api.openai.com/v1/chat/completions')` (:95), `model: 'gpt-4o-mini'` (:102), `temperature: 0.2`, `max_tokens: 1000` (:153-154). User message is the raw query (:148-151). Fallback intent on missing or unparsable output (:161-183).
- Search: `performEnhancedSearch` (:195-290) ilike over `profiles` (:211-243, `deleted_at is null`, limit 15) and `events` (:247-287, limit 10, optional week/month window). Terms sanitized by `sanitizeForOrFilter` (:191-193). Returns `{ intent, results, suggestions }`.
- Caller chain: `src/services/searchService.ts:116-120` exports `aiSearch`, which invokes `ai-search`. No file imports `searchService.ts`. Status: dead.

<details><summary>System prompt: ai-search analyzeSearchIntent (ai-search/index.ts:106-146)</summary>

```text
You are an advanced search intent analyzer for the Diaspora Network of Africa (DNA) platform.
          
          Your task is to deeply understand user search intent and extract:
          1. Core semantic meaning and intent
          2. Content types (profile, community, event, post) - be intelligent about what the user likely wants
          3. Geographic context (African countries, diaspora locations, global regions)
          4. Temporal context (timeframes, urgency, event timing)
          5. Professional context (skills, industries, expertise levels)
          6. Social context (networking, collaboration, investment, mentorship)
          7. Semantic expansions (synonyms, related concepts, industry terms)
          8. Smart suggestions that anticipate user needs
          
          DNA Platform Context:
          - Focus on African diaspora professional network
          - Key pillars: Connect, Collaborate, Contribute
          - Users are professionals, entrepreneurs, investors, creators
          - Global community with African heritage/interests
          
          Return JSON only with this enhanced structure:
          {
            "query": "processed search query with key terms",
            "semanticIntent": "brief description of what user is really looking for",
            "confidence": 0.95,
            "filters": {
              "types": ["profile", "community", "event", "post"],
              "location": "location if mentioned or inferred",
              "timeframe": "time filter if mentioned",
              "skills": ["skills/expertise mentioned"],
              "categories": ["technology", "business", "culture", etc.],
              "userIntent": "networking|collaboration|investment|learning|hiring|events"
            },
            "expandedTerms": ["semantically related terms that capture intent"],
            "suggestions": ["3 intelligent suggestions that anticipate user needs"]
          }
          
          Be intelligent about inferring content types based on intent:
          - "investors" or "funding" -> likely want profiles + events
          - "conferences" or "meetups" -> likely want events + communities  
          - "learn about" or "courses" -> likely want communities + events + posts
          - "connect with" -> likely want profiles
          - "opportunities" -> likely want posts + events + communities

```

</details>

#### global-search

- Path: `supabase/functions/global-search/index.ts` (452 lines). Env: `PERPLEXITY_API_KEY` (:5), `OPENAI_API_KEY` (:6).
- Auth: own bearer check plus `auth.getUser` (:29-53); caller-JWT client (:42-46).
- Flow: `performDynamicSearch` (:108-183) over `profiles` (limit 5), upcoming `events` (limit 5), active `projects` (limit 5) with fixed `relevanceScore` 0.9 / 0.85 / 0.75; `performWebSearch` (:186-253) to `https://api.perplexity.ai/chat/completions` (:195), `model: 'llama-3.1-sonar-small-128k-online'` (:202), `temperature: 0.1`, `search_recency_filter: 'month'`; output parsed line by line into results with `relevanceScore: 0.7` (:256-316); `rankSearchResults` (:339-388) sends all results to OpenAI `gpt-4o-mini` (:345, :352) for 0.0-1.0 scores; `generateAISuggestions` (:391-453) to OpenAI `gpt-4o-mini` (:404, :411). Response includes `results` (top 20), `suggestions`, `sources`, and `status.perplexityAvailable` / `status.openaiAvailable` (:70-84).
- Caller chain: `src/services/searchService.ts:59-63` exports `globalSearch`, which invokes `global-search`. No importer. Status: dead.

<details><summary>System prompt: global-search performWebSearch, Perplexity (global-search/index.ts:206-214)</summary>

```text
You are helping search for real, current information related to: ${query}. 
            Focus on finding actual, recent, and verifiable information about:
            - Real companies, organizations, and people
            - Actual events, conferences, and opportunities  
            - Current news and developments
            - Legitimate investment opportunities
            
            Return specific, factual results with sources. Do not make up or invent information.
            Format your response as a structured list with titles, descriptions, and URLs where available.

```

</details>

<details><summary>User prompt: global-search performWebSearch (global-search/index.ts:218)</summary>

```text
Find real, current information about: ${query}

```

</details>

<details><summary>System prompt: global-search rankSearchResults, OpenAI (global-search/index.ts:356)</summary>

```text
Score each result from 0.0 to 1.0 based on relevance to the query. Return only a JSON array of scores: [0.95, 0.8, ...]

```

</details>

<details><summary>User prompt: global-search rankSearchResults (global-search/index.ts:360)</summary>

```text
Query: "${query}"\n\nResults:\n${results.map((r, i) => `${i+1}. ${r.title}: ${r.description}`).join('\n')}

```

</details>

<details><summary>System prompt: global-search generateAISuggestions, OpenAI (global-search/index.ts:415)</summary>

```text
Generate 6 realistic search suggestions related to the query. Return only a JSON array: ["suggestion 1", "suggestion 2", ...]

```

</details>

<details><summary>User prompt: global-search generateAISuggestions (global-search/index.ts:419)</summary>

```text
Original query: "${query}"

```

</details>

#### transcribe-voice

- Path: `supabase/functions/transcribe-voice/index.ts` (123 lines). Auth: `requireUser` from `_shared/auth.ts` (:3, :45-46).
- Input `audioBase64` (decoded in chunks, :11-38) or `audioUrl` (must pass `isSafePublicUrl` with the project storage host as the only allowed host, :58-67). Sends multipart to `https://api.openai.com/v1/audio/transcriptions` (:91) with `model: 'whisper-1'` (:87), `language: 'en'` (:88), bearer `OPENAI_API_KEY` (:94). Returns `{ text }`. No prompt.
- Caller chain: `src/components/messaging/inbox/VoiceMessagePlayer.tsx:164` (inside `handleTranscribe`, :152-176) <- `ChatBubble.tsx:296` <- `ChatThread.tsx` <- `src/components/messaging/MessageOverlay.tsx:119` <- `src/contexts/MessageContext.tsx:51-54` (rendered when `isOverlayOpen`) <- `MessageProvider` mounted at `src/App.tsx:385`; the overlay is opened from `NeedCard.tsx:45-46,183` (on `ProfileV2`, route `/dna/:username`, `App.tsx:523`) and `CurrencyStanceCard.tsx:33-34,132` (on `ManifestEditorPage`, `App.tsx:724`). The `/dna/messages` routes redirect while `MESSAGING_ENABLED = false` (`src/config/featureFlags.ts:38`, `App.tsx:597-615`). In `VoiceMessagePlayer.tsx`, `const transcriptionEnabled = false;` (:150) and `if (!transcriptionEnabled) { return; }` (:158-160) precede the invoke (:164). Status: dead (invoke unreachable).

#### get-event-recommendations

- Path: `supabase/functions/get-event-recommendations/index.ts` (237 lines). Imports `requireUser, makeUserClient, callModel, writeEvent, modelFor, checkLimit, recordUsage` from `../_shared/dia-core/index.ts` (:3). `CAPABILITY = 'event_recommendations'` (:5).
- Reads under the user client (`makeUserClient(auth.token)`, :23): `profiles` (:29-33), `group_members` (:36-39), `connections` (:44-48), `events` (:55-62, upcoming, published, public, limit 50), `event_attendees` status going (:71-75). Early return with `[]` if no events (:64-68) before the limit check.
- Limit: `checkLimit(admin, userId, CAPABILITY)` (:86), 429 with "Monthly query limit reached" (:87-97).
- Model: `callModel` (:134-166) with forced tool `recommend_events` (schema :140-164: `event_index` number, `score` number "Score from 0-100", `reasoning` string). Model resolves to `google/gemini-2.5-flash` (`models.ts:50`).
- Output (:193-209): each event plus `recommendation_score`, `recommendation_reason`, `friends_attending_count`, `total_attendees`.
- Audit / usage: `writeEvent` failure (:169-174, `provider: 'gemini'`), success (:211-216, `meta.events_scored`), `recordUsage` after success (:219).
- Caller chain: `src/components/events/EventRecommendations.tsx:41` inside a `useQuery` (:37-41). No file imports `EventRecommendations.tsx`. Status: dead.

<details><summary>System prompt: get-event-recommendations (get-event-recommendations/index.ts:100-110)</summary>

```text
You are an intelligent event recommendation system for the Diaspora Network of Africa (DNA).
Your task is to analyze events and user profiles to recommend the most relevant events.

Consider:
- User's interests and tags
- User's location vs event location (prefer local or virtual events)
- Event type alignment with user preferences
- Social connections attending (higher priority if friends are going)
- Group membership (higher priority for group-hosted events user is part of)

Return recommendations as a structured list with reasoning.

```

</details>

<details><summary>User prompt template: get-event-recommendations (get-event-recommendations/index.ts:112-130)</summary>

```text
User Profile:
- Interests: ${profile?.interests?.join(', ') || 'None'}
- Tags: ${profile?.interest_tags?.join(', ') || 'None'}
- Location: ${profile?.current_country || profile?.location || 'Unknown'}
- Groups: ${groupIds.length} groups
- Connections: ${connectionIds.length} connections

Events to score (${events.length} total):
${events.map((e, i) => {
  const attendees = attendeesByEvent[e.id] || [];
  const friendsGoing = attendees.filter(a => connectionIds.includes(a)).length;
  return `${i + 1}. "${e.title}" (${e.event_type}, ${e.format})
   - Location: ${e.location_city || 'Virtual'}, ${e.location_country || ''}
   - Date: ${e.start_time}
   - Friends attending: ${friendsGoing}
   - Description: ${e.description?.substring(0, 150)}...`;
}).join('\n')}

Recommend the top 10 events with scores and brief reasoning.

```

</details>

#### suggest-usernames

- Path: `supabase/functions/suggest-usernames/index.ts` (180 lines). Auth: `requireUser` from `../_shared/auth.ts` (:3, :19-20). dia-core imports `callModel, writeEvent, modelFor, checkLimit, recordUsage` (:4). `CAPABILITY = 'suggest_usernames'` (:11).
- Body fields read: `fullName, industry, countryOrigin, currentLocation` (:26). The client sends `fullName, industry, primaryOriginCountry, currentLocation` (`UsernameStep.tsx:72-77`), so `countryOrigin` arrives undefined and the prompt uses its `'Africa'` default.
- Limit check (:55-67), `callModel` with system + user messages, no tools (:71-83), resolves to `google/gemini-2.5-flash` (`models.ts:51`). Error mapping 429 / 402 (:84-93). Markdown fence stripping and JSON parse (:102-115); fallback of three name-derived handles (:116-143). `writeEvent` (:87-89, :147-148), `recordUsage` (:151).
- Caller chain: `src/components/onboarding/steps/UsernameStep.tsx:71` in `generateAISuggestions` (:62-), called from `useEffect` on mount when `data.full_name` is set (:41-45) and from the "AI Suggestions" button (:264) <- `src/pages/Onboarding.tsx:12,397` (step `case 2`) <- `src/App.tsx:59` lazy, `<Route path="/onboarding" element={<Onboarding />} />` (:423). Status: live.

<details><summary>System prompt: suggest-usernames (suggest-usernames/index.ts:76)</summary>

```text
You are a creative username generator specializing in African diaspora professional identity. Generate meaningful, culturally-aware username suggestions. Always respond with valid JSON only.

```

</details>

<details><summary>User prompt template: suggest-usernames (suggest-usernames/index.ts:29-50)</summary>

```text
Generate 8 short, clean username suggestions based ONLY on this person's name.

Name: ${fullName}
Industry (for context only, do not include in usernames): ${industry || 'Professional'}
Country of Origin (for context only, do not include in usernames): ${countryOrigin || 'Africa'}
Current Location (for context only, do not include in usernames): ${currentLocation || 'Global'}

Rules:
- Usernames must be between 3 and 20 characters
- Use only lowercase letters, numbers, dots (.), underscores (_) or hyphens (-)
- Base every suggestion on variations of their first and/or last name (e.g. denacia, denacia_o, d_okoro, denaciaokoro, denacia01)
- You may use initials and simple numbers, but DO NOT add extra words like "pro", "diaspora", "connects", job titles, industries, countries, or slogans
- Do not include references to Africa, diaspora, locations, or professions in the username itself
- All usernames should feel like natural, name-based handles that the person could realistically choose

Return ONLY a JSON array of objects with this exact format:
[
  {
    "username": "suggested_username",
    "explanation": "Very short note about how this relates to their name"
  }
]

```

</details>

#### connection-health-analyzer

- Path: `supabase/functions/connection-health-analyzer/index.ts` (274 lines). Gate: `requireInternal` (:130-131). Service-role client (:136-139). No model call.
- Loads up to `BATCH_LIMIT = 2000` accepted `connections` ordered by id, processed `CONCURRENCY = 15` at a time (:148-156, :237-245).
- `analyzeConnectionHealth` (:21-123): shared `conversations` for the pair (:32-37), `messages` in those conversations, `post_comments` and `post_reactions` by either user, 90-day window (:40-63). Score: recency max 40, frequency (last 30 days) max 40, longevity max 20 (:83-104); status strong >= 70, moderate >= 40, weak >= 20, else fading (:107-111).
- When `days_since_interaction >= 60` for direction A, inserts two `dia_nudges` rows (`nudge_type: 'weak_connection'`, `nudge_category: 'connection'`, `priority: 'low'`, `expires_at` +14 days) with message template `` `You haven't connected with ${...full_name || 'your connection'} in ${days} days. Send them a message?` `` (:193-228).
- Caller: no client invoke, no `cron.schedule`. Only a comment mentions it in `src/services/dia/networkIntelligence.ts:206`. Status: dead (no caller found).

#### generate-connect-nudges

- Path: `supabase/functions/generate-connect-nudges/index.ts` (116 lines). Gate: `requireInternal` (:22-23). No model call.
- RPC `get_users_needing_connection_nudges` (:33-35); per candidate RPC `get_suggested_connections(p_user_id)` (:44-46), top 3; inserts `dia_nudges` with message `` `You're new to DNA! Here are ${n} members you might want to connect with.` ``, `action_url: '/dna/connect/discover'`, `priority: 'medium'`, `status: 'sent'`, `metadata.type: 'first_connections'`, `metadata.suggested_user_ids` (:52-62).
- RPC `get_inactive_users_for_reengagement` (:70-72); inserts `dia_nudges` with message `'Come back and discover new members in your network!'`, `priority: 'low'`, `metadata.type: 'reengagement'` (:81-91).
- Caller: no caller found. Status: dead.

#### generate-daily-briefs

- Path: `supabase/functions/generate-daily-briefs/index.ts` (400 lines). Gate: `requireInternal` (:338-339). Module-level service-role client (:34-36). No model call.
- Per user context (:38-63): `profiles.professional_sectors, interests`, accepted `connections` count, `trend_follows.hashtag`.
- Signal generators, one per C (:65-210): contribute `opportunity_match` (opportunities overlapping sectors, last 7 days, `signal_strength = min(n/5,1)`), connect `sector_aligned_returnees` (new profiles overlapping sectors, `min(n/10,1)`), convene `event_with_network_attendance` (next public published event in 14 days, fixed 0.7), collaborate `space_match` (public active spaces overlapping interests, 0.6, with `space_members` count), convey `followed_trend_active` (RPC `get_trending_hashtags('24h', 5)` intersected with follows, 0.5).
- Selection: sort by `signal_strength`, one per C, top 3, then fallbacks `profile_completion`, `network_growth` (< 5 connections), `evergreen_events` (:212-295).
- Writes: delete today's `dia_brief_cards` for the user (:303-307), insert rows with `position`, `c_module`, `signal_type`, `signal_strength`, `title`, `body`, `cta_label`, `cta_route`, `target_entity_*`, `reasoning`, `is_fallback`, `expires_at` +24h (:309-327).
- Modes: POST body `user_id` for one user (:342-360); otherwise all profiles with `last_seen_at` in last 30 days, batches of 50 (:362-386).
- Not in `config.toml`. Caller: no caller found. Status: dead.

#### generate-opportunity-nudges

- Path: `supabase/functions/generate-opportunity-nudges/index.ts` (480 lines). Gate: `requireInternal` (:388-389). No model call.
- Hardcoded `AFRICAN_REGIONS` country map (:36-42), `CONTRIBUTION_TYPE_LABELS` (:45-51), `MESSAGE_TEMPLATES` for `opportunity_match`, `opportunity_trending`, `contribution_impact` (:54-71), random template pick (:73-76).
- `getMatchingOpportunitiesForUser` (:116-229): up to 30 active / in_progress `opportunities` not created by the user; weighted score skills 30%, interests/focus 25%, location 20% (same place 100, same African region 80, global/remote/diaspora 70, else 30), contribution history 25%; keeps `score >= 50`, top 3, with `reasons`.
- `generateOpportunityNudges` (:231-381): reads `dia_preferences.nudge_categories` (:250-259); match nudges carry `payload.match_score` and `payload.match_reasons` (:280-295); trending nudge from the user's spaces with `{count}` filled by `Math.floor(Math.random() * 10) + 5` (:319-339); `contribution_impact` from `contribution_badges` validated in last 7 days (:343-378).
- Run (:401-456): profiles with `profile_completion_percentage >= 40`, limit 100; skip users with 2+ such nudges in 48h; insert up to 2 `dia_nudges` per user with `user_id, nudge_type, message, status: 'sent', payload, priority` (:434-444).
- Not in `config.toml`. Caller: no caller found. Status: dead.

#### engagement-reminders

- Path: `supabase/functions/engagement-reminders/index.ts` (247 lines). Gate: `requireInternal` (:156-157). No model call.
- `NUDGE_TEMPLATES` (:18-55): `dormant_comeback`, `at_risk_post`, `new_connections`, `profile_incomplete` (uses `profile_completion_percentage`, "Your profile is ${...}% complete..."), `popular_post`, `weak_connection`.
- `generateNudgesForUser` (:57-149): reads `dia_preferences.nudge_categories` (:62-68), `connections`, `profiles.profile_completion_percentage` (< 60 triggers `profile_incomplete`).
- Run: `user_engagement_tracking` rows with tier in `at_risk`, `dormant`, `moderate` (:168-171); skip if any `dia_nudges` in last 24h (:184-193); insert into `dia_nudges` (:200-202) and `reminder_logs` (:210-216).
- Caller: no client invoke, no migration schedule. A schedule exists only in `docs/CRON-SETUP.sql:21-33` (job `daily-engagement-reminders`, `0 10 * * *`), see A8. Status: dead (by the rule: docs are not an applied schedule).

#### engagement-tracker

- Path: `supabase/functions/engagement-tracker/index.ts` (247 lines). Gate: `requireInternal` (:91-92). No model call.
- Up to 2000 `profiles` with `is_active = true`, concurrency 20 (:111-120). Per user: 7-day and total counts from `posts`, `post_comments`, `connections`, `messages`, `event_attendees` (:134-146).
- `calculateEngagementScore` (:30-49): posts max 30, comments max 20, connections max 24, messages max 12, events max 14, capped 100. `determineEngagementTier` (:51-84): `dormant`, `at_risk`, `moderate`, `active`, `champion`, `new`.
- Upserts `user_engagement_tracking` on `user_id` with `engagement_score`, `engagement_tier` and last-activity fields (:186-205). Output is the input set for engagement-reminders.
- Caller: docs-only schedule `docs/CRON-SETUP.sql:7-19` (job `hourly-engagement-tracker`, `0 * * * *`). Status: dead (by the rule).

#### process-automated-nudges

- Path: `supabase/functions/process-automated-nudges/index.ts` (253 lines). Gate: `requireInternal` (:38-39). No model call.
- Overdue `collaborate_tasks` (:52-70): nudge at 1 day, 3 days, 7+ days with dedupe on `last_nudge_at` (:78-103); inserts `collaborate_nudges` (:117-121), updates task `last_nudge_at` / `nudge_count` (:129-140), inserts `space_activity_log` (:159-160).
- Stalled active `spaces` (:165-): nudges space creator; message `` `Your space "${space.name}" hasn't had activity in ${days} days. Consider posting an update or archiving if the project is complete.` `` (:206); inserts `collaborate_nudges` (:219-221).
- Not in `config.toml`. Caller: no caller found. Status: dead.

#### watch-curated-sources

- Path: `supabase/functions/watch-curated-sources/index.ts` (129 lines). Gate: `requireInternal` (:49-50). No model call.
- Up to 200 `events` with `date_confirmed = false` and non-null `curated_source_url` (:54-59). Skips URLs failing `isSafePublicUrl` (:78-83). Fetch with 15 s timeout (:85-88), strip scripts/styles/tags, SHA-256 (:26-44, :95). On hash change inserts `curated_source_reviews` (`reason: 'source_changed'`, `status: 'open'`) (:97-109). Updates `events.source_last_hash`, `source_last_checked` (:111-117). Header comment states it never writes `date_confirmed`, `start_time`, `end_time` (:10-11), and the code contains no such write.
- Caller: no caller found. Status: dead.

#### notify-window-decay

- Path: `supabase/functions/notify-window-decay/index.ts` (85 lines). Gate: `requireInternal` (:19-20). No model call.
- Up to 200 `events` with `date_confirmed = false`, `date_decay_notified_at is null`, `expected_window_start <= today` (:25-32). For each, all `event_date_subscriptions.user_id` (:46-49) get a `notifications` row (`type: 'event_window_decay'`, title `"Expected dates passed with no announcement"`, message `` `"${e.title}" hasn't announced dates yet, and its historical window has arrived.` ``) (:52-63); then stamps `events.date_decay_notified_at` (:68-71).
- Caller: no caller found. Status: dead.

#### mcp

- Path: `supabase/functions/mcp/index.ts` (259 lines). Header: "AUTO-GENERATED by @lovable.dev/mcp-js" bundled from `src/lib/mcp/index.ts` (:1-5). Server `dna-platform-mcp` version `0.3.0` (:249-255) via `createSupabaseHandler(mcp_default, { functionName: "mcp" })` (:258-259).
- Tools: `get_profile` (RPC `get_public_profile`, :137-165), `list_upcoming_events` (RPC `list_public_events`, :174-200), `list_communities` (REST `communities` with `is_active=eq.true&moderation_status=eq.approved`, :211-246). REST calls use `SUPABASE_PUBLISHABLE_KEY ?? SUPABASE_ANON_KEY` (:13-32). Telemetry to `mcp_tool_events` with `SUPABASE_SERVICE_ROLE_KEY` (:40-58, :117-125). No LLM call.
- Server instructions string (verbatim, :253): "Tools for exploring the DNA (Diaspora Network of Africa) platform, the mobilization infrastructure for the Global African Diaspora's return. Use `get_profile` to look up a public member profile by its /dna/<username> handle, `list_upcoming_events` to discover upcoming public events across the Convene module, and `list_communities` to discover active African diaspora communities. All tools return public data only and validate their inputs strictly; malformed calls return a typed error with `code` and `message`."
- Caller: no in-app invoke. `src/pages/admin/AgentIntegrations.tsx:21` builds the URL for display; that page has no importer and is not referenced in `App.tsx`. `.lovable/mcp/manifest.json:4` declares `"path": "/functions/v1/mcp"`. `src/test/mcp/mcpTools.e2e.test.ts:13` targets it. Status: dead under the tracing rule.

#### unsubscribe-email

- Path: `supabase/functions/unsubscribe-email/index.ts` (191 lines). No auth gate; token in query (`GET`, :29-32) or body. Reads `dia_preferences` by `unsubscribe_token` (:48-52), updates email category flags (:94-97), returns HTML for GET (:110-).
- Caller: link built by `supabase/functions/send-notification-email/index.ts:96` (`type=all`) and `:115` (per type). send-notification-email is invoked from `src/services/notificationService.ts:74` (`sendNotificationEmail`), called by `src/hooks/usePostReactions.ts:84` <- `src/components/feed/PostCard.tsx` <- `src/components/feed/SearchDialog.tsx` <- `src/pages/dna/Feed.tsx` <- `src/App.tsx` (also `src/services/connectionService.ts:90,135` <- `src/pages/dna/settings/BlockedUsersSettings.tsx` <- `App.tsx`). Status: live (indirect; executes when a recipient opens the emailed link).

#### delete-account

- Path: `supabase/functions/delete-account/index.ts` (149 lines). Validates caller bearer (:70-), service-role client (:68). Storage cleanup in `avatars`, `dna-media-public`, `post-media` (:96-101). Deletes rows from the list at :109-120 via the loop at :122-128 (includes `dia_nudges`, `dia_recommendations`, `dia_events`, `dia_user_usage`, `dia_query_log`, `dia_preferences`, `dia_messaging_events`), then `auth.admin.deleteUser` (:130).
- Caller: `src/components/mobile/MobileSettingsView.tsx:32`; re-exported only by `src/components/mobile/index.ts:15`, which has no importer. Status: dead.

### A2. dia-core

Directory: `supabase/functions/_shared/dia-core/` (7 files, 288 lines total). Header of `index.ts`: "the thin shared substrate every DIA edge function passes through. Five concerns in one place: identity, consent, limits, audit, model-config."

#### Files

**`supabase/functions/_shared/dia-core/models.ts` (75 lines).** Model configuration.
- `GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions"` (:10).
- `PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"` (:11); `PERPLEXITY_MODEL = "sonar"` (:14).
- `type DiaCapability` (:17-34): `reactive_query`, `compose_read`, `smart_replies`, `smart_compose`, `smart_chips`, `thread_summary`, `inbox_brief`, `daily_pulse`, `daily_insights`, `hub_intelligence`, `trigger_prompt`, `connect_nudges`, `opportunity_nudges`, `daily_brief`, `event_recommendations`, `suggest_usernames`, `curate`.
- `GATEWAY_MODELS` (private, :41-52): `reactive_query` and `daily_insights`, `event_recommendations`, `suggest_usernames` -> `google/gemini-2.5-flash`; `compose_read`, `smart_replies`, `smart_compose`, `thread_summary`, `inbox_brief`, `daily_pulse` -> `google/gemini-3-flash-preview`. `FALLBACK_MODEL = "google/gemini-2.5-flash"` (:54).
- `ANTHROPIC_ALTERNATES` (:60-64): `haiku: "anthropic/claude-haiku-4-5"`, `sonnet: "anthropic/claude-sonnet-4-5"`; comment marks them "config-ready (NOT active)".
- `modelFor(capability)` (:66-68), `providerOf(model)` (:70-75: `anthropic/` -> anthropic, `google/` -> gemini, `openai/` -> openai, else gateway).
- Exported: `GATEWAY_URL`, `PERPLEXITY_URL`, `PERPLEXITY_MODEL`, `DiaCapability`, `ANTHROPIC_ALTERNATES`, `modelFor`, `providerOf`.
- Call sites: `model-call.ts:5` (`GATEWAY_URL`, `modelFor`, `providerOf`, `DiaCapability`); `_shared/dia-tools.ts:7` (`PERPLEXITY_MODEL`, `PERPLEXITY_URL`, direct import of `./dia-core/models.ts`); `curate-diaspora-events/index.ts:3` (`PERPLEXITY_URL`, `PERPLEXITY_MODEL` via index, used :72, :80, :231, :248); `modelFor` used in `dia-compose-read/index.ts:154`, `dia-daily-insights/index.ts:155`, `dia-daily-pulse/index.ts:172`, `dia-feedback/index.ts:44` (`modelFor("reactive_query")`, no model call), `dia-inbox-brief/index.ts:255`, `dia-search/index.ts:287,357,408,438`, `dia-smart-compose/index.ts:130`, `dia-smart-replies/index.ts:128`, `dia-thread-summary/index.ts:209`, `get-event-recommendations/index.ts:171`, `suggest-usernames/index.ts:88`. `ANTHROPIC_ALTERNATES`: no call site.
- Capabilities in the type with no function using them as `CAPABILITY`: `smart_chips`, `hub_intelligence`, `trigger_prompt`, `connect_nudges`, `opportunity_nudges`, `daily_brief`.

**`supabase/functions/_shared/dia-core/model-call.ts` (66 lines).** Single gateway call.
- `callModel(opts)` (:28-66): env `LOVABLE_API_KEY` (throws "LOVABLE_API_KEY missing", :29-30); model = `opts.modelOverride ?? modelFor(opts.capability)`; forwards `temperature` / `max_tokens` only when set, `tools` + `tool_choice` (default `"auto"`), `response_format` (:33-47); POST to `GATEWAY_URL` with `Authorization: Bearer ${LOVABLE_API_KEY}` (:49-53); non-2xx throws `AI gateway ${status}: ...` (:54-57); returns `{ message: choices[0].message, tokens: usage.total_tokens ?? 0, model, provider: providerOf(model), raw }`.
- Exported: `CallModelOpts`, `CallModelResult`, `callModel`.
- Call sites (`callModel(`): `dia-compose-read/index.ts:142`, `dia-daily-insights/index.ts:59`, `dia-daily-pulse/index.ts:120`, `dia-inbox-brief/index.ts:204`, `dia-search/index.ts:85,228`, `dia-smart-compose/index.ts:93`, `dia-smart-replies/index.ts:91`, `dia-thread-summary/index.ts:154`, `get-event-recommendations/index.ts:134`, `suggest-usernames/index.ts:71`.

**`supabase/functions/_shared/dia-core/identity.ts` (13 lines).** Re-exports `requireUser, requireAdmin, requireInternal, escapeHtml, isSafePublicUrl` and types `AuthResult, AuthOk, AuthErr` from `../auth.ts` (:4-5). Declares `PrincipalType = "user" | "cron" | "service" | "agent"` (:7) and `interface Principal` (:9-13).
- Call sites through dia-core: `requireUser` imported from dia-core by `dia-compose-read/index.ts:16` (used :124), `dia-daily-pulse/index.ts:3` (:50), `dia-inbox-brief/index.ts:5` (:50), `dia-search/index.ts:14` (:255, :434), `dia-smart-compose/index.ts:6` (:31), `dia-smart-replies/index.ts:6` (:31), `dia-thread-summary/index.ts:6` (:42), `get-event-recommendations/index.ts:3` (:20). `PrincipalType` used by `audit.ts:5`. `requireAdmin`, `requireInternal`, `escapeHtml`, `isSafePublicUrl`, `Principal`: no call site through dia-core (functions import them from `_shared/auth.ts` directly: `suggest-usernames`, `dia-daily-insights`, `curate-diaspora-events`, `dia-trigger-prompt`, `dia-hub-intelligence`, and all generators in A1).

**`supabase/functions/_shared/dia-core/consent.ts` (41 lines).** `IMPLIED_CONSENT` set (:9-16): `reactive_query`, `compose_read`, `smart_replies`, `smart_compose`, `smart_chips`, `thread_summary`. `checkConsent(admin, userId, capability)` (:23-41): implied -> `{allowed: true, reason: "implied"}`; otherwise reads `dia_preferences.in_app_enabled` for the user; no row -> `{allowed: false, reason: "no_preferences"}`; `in_app_enabled === false` -> `in_app_disabled`, else `ok`. Exported: `ConsentStatus`, `checkConsent`.
- Call sites: none. No file in `supabase/functions/` calls `checkConsent`.

**`supabase/functions/_shared/dia-core/limits.ts` (42 lines).** `checkLimit(admin, userId, capability)` (:15-26) calls RPC `dia_check_limit(p_user_id, p_capability)` and throws on error; returns `LimitStatus { allowed, tier, capability, limit (null = unlimited), used, remaining }`. `recordUsage(admin, userId, capability, tokens = 0)` (:28-42) calls RPC `dia_record_usage(p_user_id, p_capability, p_tokens)` and logs on error. Header names `dia_tier_limits` as source of truth (:1-2). Exported: `LimitStatus`, `checkLimit`, `recordUsage`.
- Tier names: none appear in `limits.ts` or anywhere in `supabase/`. `dia_tier_limits` (columns `tier`, `capability`, `monthly_limit`, `updated_at`), `dia_check_limit`, `dia_record_usage` and `dia_resolve_tier(p_user_id) -> string` appear only in the generated `src/integrations/supabase/types.ts` (:2704-2724, :12264-12273); no `supabase/migrations/*.sql` file defines them.
- Call sites `checkLimit(`: `dia-compose-read/index.ts:136`, `dia-daily-pulse/index.ts:79`, `dia-inbox-brief/index.ts:172`, `dia-search/index.ts:301`, `dia-smart-compose/index.ts:69`, `dia-smart-replies/index.ts:71`, `dia-thread-summary/index.ts:122`, `get-event-recommendations/index.ts:86`, `suggest-usernames/index.ts:55`. `recordUsage(`: `dia-compose-read/index.ts:170`, `dia-daily-pulse/index.ts:226`, `dia-inbox-brief/index.ts:283`, `dia-search/index.ts:364`, `dia-smart-compose/index.ts:158`, `dia-smart-replies/index.ts:156`, `dia-thread-summary/index.ts:237`, `get-event-recommendations/index.ts:219`, `suggest-usernames/index.ts:151`.

**`supabase/functions/_shared/dia-core/audit.ts` (38 lines).** `writeEvent(admin, e)` (:22-38) inserts one row into `dia_events` (`user_id, principal_type (default 'user'), capability, surface, provider, model, success (default true), latency_ms, tokens, error_code, error_message, meta`), logs on error. Exported: `DiaEvent`, `writeEvent`. (`dia_events` appears in `src/integrations/supabase/types.ts:2142`; no migration creates it.)
- Call sites: `curate-diaspora-events/index.ts:229,246`, `dia-compose-read/index.ts:152,162`, `dia-daily-insights/index.ts:134,150`, `dia-daily-pulse/index.ts:167,212`, `dia-inbox-brief/index.ts:253,275`, `dia-search/index.ts:285,406,436`, `dia-smart-compose/index.ts:128,150`, `dia-smart-replies/index.ts:126,148`, `dia-thread-summary/index.ts:207,229`, `get-event-recommendations/index.ts:169,211`, `suggest-usernames/index.ts:87,147`.

**`supabase/functions/_shared/dia-core/index.ts` (13 lines).** `export *` from `models.ts`, `model-call.ts`, `identity.ts`, `consent.ts`, `limits.ts`, `audit.ts` (:4-9); re-exports `TOOL_DEFINITIONS, executeTool, makeUserClient, emptyResults` and types `ToolContext, AggregatedResults` from `../dia-tools.ts` (:12-13).
- Importers (all via `../_shared/dia-core/index.ts`): `curate-diaspora-events/index.ts:3`, `dia-compose-read/index.ts:16`, `dia-daily-insights/index.ts:7`, `dia-daily-pulse/index.ts:3`, `dia-feedback/index.ts:6`, `dia-inbox-brief/index.ts:5`, `dia-search/index.ts:7-19`, `dia-smart-compose/index.ts:6`, `dia-smart-replies/index.ts:6`, `dia-thread-summary/index.ts:6`, `get-event-recommendations/index.ts:3`, `suggest-usernames/index.ts:4`. (12 functions.)

#### Routing through dia-core vs bypass (all functions in `supabase/functions/`)

| Function | LLM / model call | Endpoint and model | Through dia-core `callModel` | dia-core pieces used |
|---|---|---|---|---|
| dia-compose-read | yes (:142) | gateway, `google/gemini-3-flash-preview` | yes | requireUser, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| dia-daily-insights | yes (:59) | gateway, `google/gemini-2.5-flash` | yes | callModel, writeEvent, modelFor (auth via `_shared/auth.ts` requireInternal) |
| dia-daily-pulse | yes (:120) | gateway, `google/gemini-3-flash-preview` | yes | requireUser, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| dia-inbox-brief | yes (:204) | gateway, `google/gemini-3-flash-preview` | yes | requireUser, makeUserClient, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| dia-search | yes (:85, :228) | gateway, `google/gemini-2.5-flash`; plus Perplexity `sonar` inside tool `web_search` (`_shared/dia-tools.ts:437`) | gateway calls yes; `web_search` tool is a direct fetch | requireUser, makeUserClient, TOOL_DEFINITIONS, executeTool, emptyResults, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| dia-smart-compose | yes (:93) | gateway, `google/gemini-3-flash-preview` | yes | requireUser, makeUserClient, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| dia-smart-replies | yes (:91) | gateway, `google/gemini-3-flash-preview` | yes | same as smart-compose |
| dia-thread-summary | yes (:154) | gateway, `google/gemini-3-flash-preview` | yes | same as smart-compose |
| get-event-recommendations | yes (:134) | gateway, `google/gemini-2.5-flash` | yes | requireUser, makeUserClient, checkLimit, callModel, writeEvent, recordUsage, modelFor |
| suggest-usernames | yes (:71) | gateway, `google/gemini-2.5-flash` | yes | checkLimit, callModel, writeEvent, recordUsage, modelFor (auth from `_shared/auth.ts`) |
| curate-diaspora-events | yes (:71) | direct `fetch(PERPLEXITY_URL)`, model `PERPLEXITY_MODEL` (`sonar`), env `PERPLEXITY_API_KEY` | no (constants and audit from dia-core, transport direct) | PERPLEXITY_URL, PERPLEXITY_MODEL, writeEvent |
| dia-feedback | no | none | n/a | modelFor only (writes `"reactive_query"` model string into `dia_messaging_feedback`, :39-44) |
| dia-hub-intelligence | no (no fetch, no dia-core import) | none | n/a | none |
| dia-smart-chips | no (no fetch, no dia-core import) | none | n/a | none |
| dia-trigger-prompt | no (no fetch, no dia-core import) | none | n/a | none |
| ai-search | yes (:95) | direct OpenAI `gpt-4o-mini`, `OPENAI_API_KEY` | no (bypass) | none |
| global-search | yes (:195, :345, :404) | direct Perplexity `llama-3.1-sonar-small-128k-online`; direct OpenAI `gpt-4o-mini` x2 | no (bypass) | none |
| transcribe-voice | yes (:91) | direct OpenAI `whisper-1` | no (bypass) | none |
| all other 42 functions | no | none | n/a | none |

`checkConsent` is used by no function. No function calls `callModel` with `modelOverride`. No embedding endpoint is called anywhere in `supabase/functions/`.

#### `supabase/functions/_shared/dia-tools.ts` (470 lines)

- Header: "DIA platform tools, server-side, RLS-safe" (:1-3). Imports `PERPLEXITY_MODEL, PERPLEXITY_URL` from `./dia-core/models.ts` (:7). `ROW_CAP = 20` (:9).
- Exports: `ToolContext` (:11-14), `makeUserClient(accessToken)` (:16-23, anon key + caller JWT, no session persistence), `AggregatedResults` (:26-34), `emptyResults()` (:36-38), `TOOL_DEFINITIONS` (:41-) with nine tools: `search_my_network` (:45), `search_platform_people` (:62), `recent_convene_joins` (:79), `find_events` (:94), `find_spaces` (:110), `find_opportunities` (:126), `my_post_analytics` (:143), `find_stories_and_posts` (:158), `web_search` (:174); `executeTool(name, args, ctx, webCitations)` (:190-470).
- Tables read in `executeTool` (caller-scoped client): `connections`, `profiles`, `event_attendees`, `events`, `space_members`, `spaces`, `opportunities`, `posts`, `post_likes`, `post_comments`. `web_search` (:434-461) posts to `PERPLEXITY_URL` with `PERPLEXITY_MODEL`, env `PERPLEXITY_API_KEY`, `max_tokens: 700`, `temperature: 0.2`, `return_citations: true`, optional `search_recency_filter`.
- Importers: only `_shared/dia-core/index.ts:12-13`. Through dia-core: `TOOL_DEFINITIONS` / `executeTool` / `emptyResults` used only by `dia-search/index.ts:88,169,108,329`; `makeUserClient` used by `dia-search/index.ts:106`, `dia-inbox-brief/index.ts:54`, `dia-smart-compose/index.ts:35`, `dia-smart-replies/index.ts:35`, `dia-thread-summary/index.ts:46`, `get-event-recommendations/index.ts:23`.

<details><summary>System prompt: dia-tools web_search, Perplexity (_shared/dia-tools.ts:443)</summary>

```text
Answer concisely with citations. Focus on Africa, diaspora, and allied communities where relevant.

```

</details>

### A3. Client services and hooks

Repository: `jodombrown/dna` at `b6cd764b0499614c8636d136ef648d6f6c9f2601`, read-only. Line counts from `wc -l`. Reachability was traced with an import graph built from `src/main.tsx` (static and `lazy(() => import())` edges, `@/` and relative specifiers), then each chain was confirmed by reading the rendering line in each file. "Import-reachable" alone was never taken as live.

Two facts govern several chains below:

- `MESSAGING_ENABLED = false` (`src/config/featureFlags.ts:38`). The routes `/dna/messages`, `/dna/messages/:conversationId` and `/dna/messages/group/:groupId` render `<Navigate to="/dna/connect">` instead of `DnaMessages` / `GroupThreadPage` (`src/App.tsx:596-615`). Anything reachable only through `pages/dna/Messages.tsx` or `pages/dna/GroupThread.tsx` does not render.
- `ChatThread` still renders through a second path that the flag does not gate: `/dna/:username` (`App.tsx:523`) -> `ProfileV2.tsx:430` `onMessage={() => openMessageOverlay(profile.id)}` -> `ProfileV2Hero.tsx:202-203` (and `:408-409` on mobile) "Message" button, shown in the visitor branch -> `contexts/MessageContext.tsx:61-87` `openMessageOverlay` -> `MessageContext.tsx:131` `<MessageOverlay>` (provider mounted at `App.tsx:385`) -> `MessageOverlay.tsx:119` `<ChatThread>`. Below, this is called "the overlay chain".

| Module | Path (lines) | Purpose | Inputs (event bus events / tables / RPCs / edge functions) | Outputs | Consumers (file:line) | Status (with chain) |
|---|---|---|---|---|---|---|
| collaborateCards | `src/services/dia/collaborateCards.ts` (41) | COLLABORATE card generator. Stubbed: one canned "rebuilding" card | None (no Supabase import) | `DIACard` with `cardType: 'DIA_COLLABORATE_REBUILDING'` | `services/diaCardService.ts:13,144`; `services/dia/index.ts:45` | dead (canned stub content). Imported by `diaCardService`, but only the surfaces `feed`, `collaborate_hub` and `space_detail` map to `collaborate` (`diaCardService.ts:121-132`). The only mounted `getDIACards` callers pass `connect_hub`, `convene_hub` and `event_detail`; `getDIACardsForFeed` (`diaCardService.ts:206`) has no caller |
| connectCards | `src/services/dia/connectCards.ts` (334) | Four CONNECT card generators: skill_suggestion, network_growth, connection_reactivation, mutual_bridge | Tables `profiles`, `connections`; `introductionService.hasExistingIntroduction` (`:13`) | `DIACard` or null per generator | `diaCardService.ts:11,140`; `index.ts:43` | live: `/dna/connect` (`App.tsx:536-539`) -> `pages/dna/connect/Connect.tsx:239` `<DIAHubSection surface="connect_hub">` (desktop and tablet branch; the mobile branch returns at `:202` without it) -> `components/dia/DIAHubSection.tsx:45` `getDIACards` -> `diaCardService.ts:140` `generateConnectCards()` |
| contentIntelligence | `src/services/dia/contentIntelligence.ts` (228) | Content analysis: mode detection, topics, sentiment, quality score, tags | None (type import only, no Supabase) | `contentIntelligenceService` object | `index.ts:27` only | dead: sole importer is `services/dia/index.ts`, which has no importer anywhere in `src/` (checked `@/services/dia` and relative specifiers; the export name appears nowhere else) |
| contributeCards | `src/services/dia/contributeCards.ts` (42) | CONTRIBUTE card generator. Stubbed: one canned "rebuilding" card | None | `DIACard` with `cardType: 'DIA_CONTRIBUTE_REBUILDING'` | `diaCardService.ts:14,146`; `index.ts:46` | dead (canned stub content). Same reason as collaborateCards: `contribute` maps only from `feed`, `contribute_hub`, `opportunity_detail`, none passed by a mounted caller |
| conveneCards | `src/services/dia/conveneCards.ts` (329) | Five CONVENE generators: event_overlap, event_recommendation, post_event_follow_up, hosting_nudge, curated_event | Tables `connections`, `event_attendees`, `events`, `profiles`, `event_registrations` | `DIACard` or null | `diaCardService.ts:12,142`; `index.ts:44` | live, two chains: (1) `/dna/convene` (`App.tsx:624-627`) -> `pages/dna/convene/ConveneDiscovery.tsx:471` `<DIAHubSection surface="convene_hub">` (in the `related` slot when `showHostedDetail` is false) -> `DIAHubSection.tsx:45` -> `diaCardService.ts:142`; (2) `/dna/convene/events/:id` index (`App.tsx:632-633`) -> `components/convene/EventOverview.tsx:744` `<DIADetailInsight surface="event_detail">` -> `components/dia/DIADetailInsight.tsx:40` -> `diaCardService.ts:142` |
| conversationIntelligence | `src/services/dia/conversationIntelligence.ts` (208) | Messaging metadata stats per conversation and per user | Tables `conversation_participants`, `messages` (selects `sender_id, created_at`), `conversations` | `conversationIntelligenceService` | `index.ts:28` only | dead: only re-exported by the unimported `index.ts` |
| conveyCards | `src/services/dia/conveyCards.ts` (274) | Four CONVEY generators: content_performance, publishing_cadence, amplification_suggestion, trending_alignment | Tables `posts`, `post_likes`, `profiles`, `post_hashtags`, `hashtags` | `DIACard` or null | `diaCardService.ts:15,148`; `index.ts:47` | dead: `convey` maps only from `feed` and `convey_hub` (`diaCardService.ts:122,127`); no mounted caller passes either |
| crossCCards | `src/services/dia/crossCCards.ts` (153) | Two cross-C generators: c_to_c_bridge, weekly_digest | Tables `event_registrations`, `events`, `connections`, `space_tasks`, `contribution_offers`, `posts` | `DIACard` or null | `diaCardService.ts:16,150`; `index.ts:48` | live: `/dna/convene/events/:id` index -> `EventOverview.tsx:744` `<DIADetailInsight surface="event_detail">` (`event_detail` maps to `convene` and `cross_c`, `diaCardService.ts:128`) -> `DIADetailInsight.tsx:40` -> `diaCardService.ts:150` |
| diaEventBus | `src/services/dia/diaEventBus.ts` (120) | Singleton emitter; routes events to the nudge engine and to `on()` listeners | Events from producers (A5) | Calls `processEvent`, then `storeNudge` per returned nudge | `components/convene/EventOverview.tsx:339`; `hooks/usePostLikes.ts:141`; `hooks/useReshare.ts:118`; `services/connectionService.ts:105,155`; `services/dia/diaPeriodicCheck.ts:113,123,133,143` | live: e.g. `/dna/convene/events/:id` -> `EventOverview.tsx:330-345` RSVP mutation -> `diaEventBus.emit` (`:339`). `diaEventBus.on` has no caller in `src/` |
| diaEventTypes | `src/services/dia/diaEventTypes.ts` (204) | Type union `DIAPlatformEvent` (20 event types) | None | Types only | `diaEventBus.ts:23`, `diaNudgeEngine.ts:19`, `diaNudgeStorage.ts:11` (all `import type`); `index.ts:55` | type-only module, no runtime code |
| diaNudgeEngine | `src/services/dia/diaNudgeEngine.ts` (638) | Maps 18 event types to nudge templates; applies throttle rules | Tables `profiles`, `events`, `spaces`, `opportunities` (name and title lookups, `:146-186`); localStorage counts via `diaNudgeStorage` | `DIAProactiveNudge[]`, also written to localStorage at `:619` | `diaEventBus.ts:24,60`; `index.ts:52` | live (called; output has no reader): any producer chain -> `diaEventBus.ts:60` `processEvent`. Nudges land in localStorage `dia_nudges`; no rendered code reads them (see diaNudgeStorage) |
| diaNudgeStorage | `src/services/dia/diaNudgeStorage.ts` (195) | localStorage persistence and throttle counters for engine nudges | localStorage key `dia_nudges` | Stored nudge list (max 50) | `diaNudgeEngine.ts:20-26,571,578,585,619`; `diaEventBus.ts:25,62`; `services/unifiedNotificationService.ts:13,359,366,373`; `index.ts:53` | live for writes and counts (via the engine). `getPendingNudgesForUser`, `getNudgesForChannel`, `clearNudgesForUser` have no caller. `updateNudgeStatus` is called only from `unifiedNotificationService.ts:413-414,427-428,441-442`, each gated on `notification.diaNudgeId`, which is constructed as `null` at both construction sites (`unifiedNotificationService.ts:166,233`) |
| diaPeriodicCheck | `src/services/dia/diaPeriodicCheck.ts` (190) | Timer that runs four checks and emits events | Table `events` (only live check); emits to `diaEventBus` | Emits `event_starting_soon` | `layouts/BaseLayout.tsx:8,55`; `index.ts:54` | live: `App.tsx:388` `<BaseLayout>` wraps all routes -> `BaseLayout.tsx:53-58` `useEffect` (when `user?.id`) -> `initDIAPeriodicChecks`. Three of four checks are stubs returning `[]` (A5) |
| eventMatching | `src/services/dia/eventMatching.ts` (416) | Event to user matching and attendance likelihood | Tables `profiles`, `events`, `event_registrations`, `connections` | `eventMatchingService` | `index.ts:34` only | dead: only re-exported by the unimported `index.ts` |
| index | `src/services/dia/index.ts` (118) | Barrel re-export of all DIA services | n/a | Re-exports | none | dead: no file in `src/` imports `@/services/dia` or `./index` of this folder |
| matchingEngine | `src/services/dia/matchingEngine.ts` (293) | Cross-C matching (opportunities, events, spaces, profiles) | Tables `profiles`, `opportunities`, `events` | `matchingEngineService` | `index.ts:31` only | dead: only re-exported by the unimported `index.ts` |
| networkIntelligence | `src/services/dia/networkIntelligence.ts` (271) | Connection strength, smart introductions, community cluster | Tables `profiles`, `connections`, `conversations`, `messages` (count, head only), `post_likes`, `event_registrations` | `networkIntelligenceService` | `index.ts:23` only | dead: only re-exported by the unimported `index.ts` |
| profileIntelligence | `src/services/dia/profileIntelligence.ts` (274) | Profile analysis, skill gaps, network position | Tables `profiles`, `opportunities`, `connections` | `profileIntelligenceService` | `index.ts:22` only | dead: only re-exported by the unimported `index.ts` |
| regionalIntelligence | `src/services/dia/regionalIntelligence.ts` (194) | Regional aggregates; exports `AFRICAN_REGIONS`, `DIASPORA_HUBS` | Tables `profiles`, `events`, `opportunities`, `posts` | `regionalIntelligenceService` | `index.ts:40` only | dead: only re-exported by the unimported `index.ts` (same-named consts in `services/matchingService.ts:53` and `lib/countryFlags.ts:30` are local definitions, not imports) |
| relationshipStrength | `src/services/dia/relationshipStrength.ts` (491) | Relationship strength 0 to 1 per connection | Tables `profiles`, `connections`, `conversations`, `messages` (`sender_id, created_at`), `post_likes`, `event_registrations`; reads and upserts `network_edges` (`:206`, `:259`) | `relationshipStrengthService` | `index.ts:24` only | dead: only re-exported by the unimported `index.ts` |
| trendIntelligence | `src/services/dia/trendIntelligence.ts` (204) | Topic, hashtag and event-category trends | Tables `posts`, `events` | `trendIntelligenceService` | `index.ts:37` only | dead: only re-exported by the unimported `index.ts` |
| useDIACompose | `src/hooks/useDIACompose.ts` (185) | Debounced read of composer text; proposes a verb and fields | Edge function `dia-compose-read` (`:127`) | `{ proposal, isReading, diaFilled, releaseField, reset }` | `components/composer/UniversalComposer.tsx:40,164` | live: `App.tsx:376` `DrawerProvider resolvers={drawerResolvers}` and `App.tsx:381` `<AppDrawer />` -> `components/drawer/resolvers.tsx:33` `<ComposerSurface />` -> `drawer/surfaces/ComposerSurface.tsx:21` `<UniversalComposer>` -> `UniversalComposer.tsx:164` (enabled `isOpen && !successData`, `:169`) |
| useDiaDailyBrief / useRecordBriefInteraction | `src/hooks/useDiaDailyBrief.ts` (90) | Right-rail three-card brief and interaction recording | RPC `get_dia_daily_brief` (`:33`); RPC `record_brief_interaction` (`:75`); Realtime broadcast channel `dia-brief-{userId}`, event `brief_refresh` (`:56-61`) | `DiaBriefCard[]`; drops a card from cache on `dismissed` / `not_interested` | `components/right-rail/DiaDailyBrief.tsx:11,76,129` | live: `/dna/feed` (`App.tsx:565-568`) -> `pages/dna/Feed.tsx:276` `<FeedCommunityPulse />` (desktop branch; mobile returns at `:168`) -> `feed/FeedCommunityPulse.tsx:9` `<DnaRightRail />` -> `right-rail/DnaRightRail.tsx:19` `<DiaDailyBrief />` -> `DiaDailyBrief.tsx:76` |
| useDiaNudges | `src/hooks/useDiaNudges.ts` (170) | Lists and resolves server-side nudges | Table `dia_nudges`: select (`:35`), update accepted (`:101`), dismissed (`:123`), snoozed (`:141`); Realtime `postgres_changes` on `dia_nudges` (`:78-92`) | `{ nudges, loading, acceptNudge, dismissNudge, snoozeNudge, refetch }` | `pages/NudgeCenter.tsx:7,17` | live: `/dna/nudges` (`App.tsx:828-831`) -> `NudgeCenter.tsx:17` |
| useDiaPreferences / useUpdateDiaPreferences | `src/hooks/useDiaPreferences.ts` (101) | Read, default-create and update DIA preferences | Table `dia_preferences`: select (`:38`), insert default row (`:46`), update (`:78`) | Preferences row; toasts | `pages/DiaPreferences.tsx:8,12,13` | live: `/dna/preferences` (`App.tsx:833-836`) -> `DiaPreferences.tsx:12-13` |
| useDiaSmartCompose | `src/hooks/messaging/useDiaSmartCompose.ts` (29) | Openers for an empty 1:1 thread | Edge function `dia-smart-compose` (`:21-24`) | `{ suggestions, basedOnUserId }` | `components/messaging/dia/SmartComposeSuggestions.tsx:4,29` | live via the overlay chain -> `ChatThread.tsx:686` `<SmartComposeSuggestions>` (when `messages.length === 0` and `diaPrefs.smartRepliesEnabled !== false`) -> `SmartComposeSuggestions.tsx:29` |
| useDiaSmartReplies | `src/hooks/messaging/useDiaSmartReplies.ts` (34) | Reply suggestions for last inbound message | Edge function `dia-smart-replies` (`:26-29`) | `{ suggestions, basedOnMessageId }` | `messaging/inbox/ChatThread.tsx:34,395`; `messaging/group/GroupThreadView.tsx` | live via the overlay chain -> `ChatThread.tsx:395` (enabled `!isBlocked && !replyingTo && diaPrefs.smartRepliesEnabled`). The `GroupThreadView` consumer renders only from the redirected group route |
| useDiaMessagingPrefs | `src/hooks/messaging/useDiaMessagingPrefs.ts` (73) | Per-user toggles for smart replies and summaries | Table `dia_messaging_prefs`: select (`:30`), upsert (`:49`); telemetry `logDiaMessagingEvent` -> `dia_messaging_events` | `{ prefs, isLoading, update }` (defaults when no row) | `pulse/MorningBriefBanner.tsx:7,49`; `messaging/inbox/ChatThread.tsx:35,88`; `messaging/dia/DiaMessagingSettingsDrawer.tsx:10,26`; `messaging/group/GroupThreadView.tsx:44,69`; `messaging/MessageSettingsDialog.tsx:11,27` | live: `App.tsx:388` `<BaseLayout>` -> `BaseLayout.tsx:167-169` `<MorningBriefBanner />` (signed in, path starts `/dna/feed`) -> `MorningBriefBanner.tsx:49`; also the overlay chain -> `ChatThread.tsx:88` and `ChatThread.tsx:910` -> `DiaMessagingSettingsDrawer.tsx:26`. `MessageSettingsDialog` (via `ConversationListPanel` <- `Messages.tsx`) and `GroupThreadView` consumers do not render |
| useThreadSummary | `src/hooks/messaging/useThreadSummary.ts` (103) | On-demand catch-me-up summary, 5-minute manual refresh throttle | Edge function `dia-thread-summary` (`:28`) | `ThreadSummary` (summary plus action items) | `messaging/dia/MessageSummaryDrawer.tsx:11,39`; `messaging/dia/ActionItemChip.tsx:5` (type only) | live via the overlay chain -> `ChatThread.tsx:903` `<MessageSummaryDrawer>` -> `MessageSummaryDrawer.tsx:39` (enabled when the drawer is open) |
| useDailyPulseBrief | `src/hooks/messaging/useDailyPulseBrief.ts` (84) | Cross-module pulse plus DIA-narrated brief, 30-minute stale time | `useDailyPulse` (tables `event_attendees`, `space_tasks`, `space_members`, `opportunities`, `spaces`); edge function `dia-daily-pulse` (`:47-48`) | `{ pulse, brief, isLoading, isError }` | `components/pulse/DailyPulseContent.tsx:5,30` | live: `/dna/convey` (`App.tsx:758-761`) -> `pages/dna/Convey.tsx:4` `<ConveyStoryHub />` -> `ConveyStoryHub.tsx:235` (`activeTab === 'daily'`) `<DailyPulseContent active />` -> `DailyPulseContent.tsx:30` |
| useInboxBrief | `src/hooks/messaging/useInboxBrief.ts` (47) | Cross-thread inbox narrative | Edge function `dia-inbox-brief` (`:38-41`) | `InboxBriefPayload` | `pulse/MorningBriefBanner.tsx:6,91`; `pulse/InboxDigestSheet.tsx:21,42` | live: `BaseLayout.tsx:167-169` -> `MorningBriefBanner.tsx:91` (enabled `eligible && !dismissed`; `eligible` requires `/dna/feed` and `prefs.summariesEnabled`, `:55-58`) and `MorningBriefBanner.tsx:186` -> `InboxDigestSheet.tsx:42` |
| useInboxDigest | `src/hooks/messaging/useInboxDigest.ts` (119) | Ranked digest of direct and group threads, minus active snoozes | `messageService.getConversations`, `groupMessageService.getGroupConversations`; table `dia_brief_snoozes` select (`:56`) | `InboxDigestPayload` | `pulse/InboxDigestSheet.tsx:20,41` | live: `BaseLayout.tsx:169` -> `MorningBriefBanner.tsx:186` `<InboxDigestSheet>` -> `InboxDigestSheet.tsx:41` (enabled when the sheet is open) |
| useBriefActions / useActiveSnoozes | `src/hooks/messaging/useBriefActions.ts` (147) | Snooze, mark read, mark all read from the digest | Table `dia_brief_snoozes`: select (`:32`), upsert (`:67`); `messageService.markAsRead`, `groupMessageService.updateReadCursor`; telemetry `dia_messaging_events` | Mutations | `pulse/InboxDigestSheet.tsx:22,43` | `useBriefActions` live: same chain -> `InboxDigestSheet.tsx:43`. `useActiveSnoozes` (`:23`) has no caller (dead) |
| usePulseBar | `src/hooks/usePulseBar.ts` (566) | Five-C pulse bar data; Connect segment counts recent DIA connection recommendations | Table `dia_recommendations` select `id`, `rec_type = 'connection'`, last 7 days, limit 10 (`:70-76`); plus `connections`, `profiles`, `event_attendees`, `space_members`, `opportunity_interests`, `opportunities`, `posts`, `post_likes`, `post_comments` | `pulseData` | `components/pulse/PulseBar.tsx:12,39`; `hooks/usePulseNavigation.ts:9,42` | live: `App.tsx:388` -> `BaseLayout.tsx:110` `{!claimed && <PulseBar />}` -> `PulseBar.tsx:39`; also `BaseLayout.tsx:164` `<PulseDock />` -> `usePulseNavigation.ts:42` |

Hook search scope: `src/hooks/**` and every `hooks` directory under `src/` (only `src/components/onboarding/hooks` exists; it holds nothing DIA). Hooks named DIA anywhere in `src/`: the four required hooks, the three `messaging/useDia*` hooks, and `useDiaSheet` in `src/contexts/DiaSheetContext.tsx:66` (a context accessor, outside the hook directories). `src/hooks/convene/useConveneDiscoveryLanes.ts:285` `useDiasporaEvents` matches the name pattern but is not DIA.

#### Per-module notes

- **diaCardService routing** (`src/services/diaCardService.ts`, 221 lines, outside `services/dia`): `SURFACE_CATEGORIES` (`:121-132`) maps ten surfaces to categories. Mounted callers pass exactly three surfaces: `connect_hub` (`Connect.tsx:239`), `convene_hub` (`ConveneDiscovery.tsx:471`), `event_detail` (`EventOverview.tsx:744`). So the generators actually invoked are connect, convene and cross_c. `ConveneDIADiscoveryCard`, `ConveyDIADiscoveryCard`, `CollaborateDIADiscoveryCard`, `ContributeDIADiscoveryCard` import only `isDismissed` / `dismissDIACard` from `diaCardService`, not the generators. Card dismissals are localStorage key `dia_dismissed_cards`, 7-day expiry (`:82-83`).
- **collaborateCards / contributeCards canned strings** (never rendered, per status): headline `DIA is preparing your COLLABORATE intelligence`, body `Spaces are being reimagined. Your DIA insights will return with the new module.`, action `Got it`; headline `DIA is preparing your CONTRIBUTE intelligence`, body `Opportunities are being reimagined. Your DIA insights will return with the new module.`, action `Got it`.
- **diaNudgeEngine double write**: `processEvent` stores the nudge itself (`diaNudgeEngine.ts:619`) and returns it; `diaEventBus.ts:60-63` then calls `storeNudge` again for each returned nudge. Each nudge that passes throttling is written twice to `dia_nudges` in localStorage, with the same `id`.
- **Engine vs server nudges**: the engine writes only to browser localStorage key `dia_nudges`. The hook `useDiaNudges` reads the Supabase table `dia_nudges`. These are separate stores with the same name; no client code moves rows between them.
- **conversationIntelligence / relationshipStrength / networkIntelligence**: their `messages` selects are `sender_id, created_at` or a head-only count. All three are dead.
- **contentIntelligence** has no Supabase import; it is pure functions over input text.
- **useDiaNudges.snoozeNudge** takes an `until` argument but writes only `status: "snoozed"` (`useDiaNudges.ts:139-145`).
- **useDiaPreferences** inserts a default row on PGRST116 with `notification_frequency: 'normal'`, `nudge_categories: ['connection', 'content', 'engagement']`, `email_enabled: true`, `in_app_enabled: true` (`:46-55`).
- **Edge functions present in `supabase/functions/` with a `dia-` prefix**: `dia-compose-read`, `dia-daily-insights`, `dia-daily-pulse`, `dia-feedback`, `dia-hub-intelligence`, `dia-inbox-brief`, `dia-search`, `dia-smart-chips`, `dia-smart-compose`, `dia-smart-replies`, `dia-thread-summary`, `dia-trigger-prompt`. No `src/` call site invokes `dia-hub-intelligence` or `dia-trigger-prompt` (searched string literals and `functions/v1` URLs). `dia-daily-insights`, `dia-feedback`, `dia-search` and one `dia-smart-chips` call are under `src/components/dia/` (another section's scope).

#### Other DIA call sites in src/

Files outside `src/services/dia/`, `src/components/dia/` and the hook directories that invoke a `dia-*` edge function or read or write a `dia_*` table. DIA-named RPCs are listed in a final row group for completeness.

| File:line | Call | Table / function | Status (with chain) |
|---|---|---|---|
| `src/components/right-rail/AskDiaCta.tsx:46` | select last 24h query | table `dia_query_log` | live: `/dna/feed` -> `Feed.tsx:276` -> `FeedCommunityPulse.tsx:9` -> `DnaRightRail.tsx:21` `<AskDiaCta />` |
| `src/components/right-rail/AskDiaCta.tsx:66` | invoke, falls back to `FALLBACK_CHIPS` on error | edge function `dia-smart-chips` | live: same chain |
| `src/components/connect/ConnectNudges.tsx:22` | select `status = 'sent'`, limit 3 | table `dia_nudges` | dead: only importer `pages/dna/Me.tsx:5,42`; `DnaMe` is lazy-declared (`App.tsx:60`) but never used as an element, and `/dna/me` is `<Navigate to="/dna/feed">` (`App.tsx:516`) |
| `src/components/admin/ContributionModerationQueue.tsx:41`, `:90` | select, update | table `dia_contributor_requests` | live (admin): `/admin/contributions/moderation` (`App.tsx:878-901`, behind `AdminRouteGuard`) -> `pages/admin/contributions/ContributionModeration.tsx` -> `ContributionModerationQueue` |
| `src/components/admin/SignalAnalyticsDashboard.tsx:50` | select | table `dia_signals` | live (admin): `/admin/signals` (`App.tsx:913`) -> `pages/admin/AdminSignals.tsx` -> `SignalAnalyticsDashboard` |
| `src/pages/admin/DiaAdminPage.tsx:59`, `:75`, `:90` | select | tables `dia_daily_stats`, `dia_popular_queries`, `dia_cost_tracking` | live (admin): `/admin/dia` (`App.tsx:891`) |
| `src/services/notificationSystemService.ts:1045` | `getPreferences` select | table `dia_preferences` | live: `/dna/settings/notifications` route element `App.tsx:484` -> `pages/dna/settings/NotificationSettings.tsx:17` -> `NotificationPreferencesPanel.tsx:73`; also `notificationSystemService.create` (`:494`) |
| `src/services/notificationSystemService.ts:1124` | `updatePreferences` upsert | table `dia_preferences` | live: same chain -> `NotificationPreferencesPanel.tsx:96` |
| `src/services/diaMessagingTelemetry.ts:30` | insert | table `dia_messaging_events` | live: via `useBriefActions` (MorningBriefBanner chain), `useDiaMessagingPrefs` update, and overlay-chain `ChatThread` / `MessageSummaryDrawer` / `ActionItemChip` |
| `src/services/diaMessagingTelemetry.ts:58` | insert in `submitDiaFeedback` | table `dia_messaging_feedback` | live via the overlay chain: `ChatThread.tsx:903` -> `MessageSummaryDrawer.tsx:162` `<DiaFeedbackBar>` -> `DiaFeedbackBar.tsx:4` `submitDiaFeedback`. Also rendered by `messaging/dia/SmartReplyChips.tsx:61` |
| `src/services/connectionService.ts:389` | RPC in `getConnectionRecommendations` | RPC `rpc_dia_recommend_people` | dead: `getConnectionRecommendations` has no caller in `src/` |

### A4. Components and surfaces

Repository: `jodombrown/dna` at `b6cd764b0499614c8636d136ef648d6f6c9f2601`, read-only. All paths are relative to `src/`. Line counts come from `wc -l`. Status is decided only by tracing render call sites from `App.tsx`. "Live" means a chain exists from a mounted route or from the app-root provider tree to the component. "Stub" means the component is reachable or exported but renders nothing (or a placeholder) by its own code. "Dead" means no render call site reachable from a mounted route was found.

Route and gate facts the chains below depend on:

- `App.tsx:386-387` mounts `<DiaSheetProvider>` and `<DiaSheetMount />` above `<BaseLayout>` and `<Routes>`, so the DIA sheet is app-wide.
- `App.tsx:839-840`: `/dna/dia` is `<Navigate to="/dna/feed" replace />` (comment: "/dna/dia is deprecated - DIA lives in a right-side sheet"). `App.tsx:842`: `/dna/adin` redirects to `/dna/feed`. No standalone DIA page route exists.
- `App.tsx:834-837`: `/dna/preferences` -> `OnboardingGuard` -> `DiaPreferences`. `App.tsx:829-833`: `/dna/nudges` -> `OnboardingGuard` -> `NudgeCenter`. `App.tsx:877-891`: `/admin` -> `AdminRouteGuard` -> `AdminDashboardLayout`, child `dia` -> `DiaAdminPage`; `/admin/adin` redirects to `/admin/dia`.
- `config/featureFlags.ts:38`: `MESSAGING_ENABLED = false`. `App.tsx:596-616`: `/dna/messages`, `/dna/messages/:conversationId` and `/dna/messages/group/:groupId` render `<Navigate to="/dna/connect" replace />` while the flag is false, so `DnaMessages` (`pages/dna/Messages.tsx`) and `GroupThreadPage` (`pages/dna/GroupThread.tsx`) are not mounted by any route.
- `ChatThread` is still reachable without those routes: `App.tsx:385` `<MessageProvider>` -> `contexts/MessageContext.tsx` renders `<MessageOverlay>` when `isOverlayOpen` -> `components/messaging/MessageOverlay.tsx:119` `<ChatThread>`. The overlay is opened by `openMessageOverlay`, called from `pages/ProfileV2.tsx:430` (`onMessage` -> `ProfileV2Hero` "Message" button, `components/profile-v2/ProfileV2Hero.tsx:202-206` and `:408-412`), route `/dna/:username` (`App.tsx:523`). No `MESSAGING_ENABLED` check gates that button.
- Sheet triggers (`openWith` from `contexts/DiaSheetContext.tsx`): `components/UnifiedHeader.tsx:439-456` (authenticated only, `hidden md:flex`, rendered by `layouts/BaseLayout.tsx:109` when `!claimed`); `components/mobile/DnaMobileHeader.tsx:118-128` (when `user`); `components/right-rail/AskDiaCta.tsx:99,111,121`. Header strings: `Ask DIA` (aria-label, both headers) and `Ask DIA` (tooltip text, `UnifiedHeader.tsx:453`).

#### Summary table

| Component | Path (lines) | Mounts on (route or parent file:line) | Trigger | States | Dismiss behaviour | Dismissal persists server-side? | Status (chain) |
|---|---|---|---|---|---|---|---|
| index.ts (barrel) | components/dia/index.ts (13) | imported by pages/dna/convey/ConveyStoryHub.tsx:21 (`DiaContextual` only) | n/a | n/a | n/a | n/a | live as a re-export path for `DiaContextual`; its other 12 exports have no importer through it |
| DiaSheetMount | components/dia/DiaSheetMount.tsx (26) | App.tsx:387 | sheet `open` becomes true once | not opened (null), opened (lazy DiaSheet) | none | n/a | live: App.tsx:387 |
| DiaSheet | components/dia/DiaSheet.tsx (154) | DiaSheetMount.tsx:8,21 (lazy) | `openWith()` from header buttons and AskDiaCta | closed, open with 5 tabs | sheet close (onOpenChange) | no | live: App.tsx:387 -> DiaSheetMount.tsx:21 |
| DiaSearch | components/dia/DiaSearch.tsx (1055) | DiaSheet.tsx:119; DiaContextual.tsx:78, :132 | submit, suggestion chip, follow-up chip, auto-search from seed | empty, loading, populated, threaded, thread cap, rate-limited, error toasts | none | n/a (save writes `dia_saved_answers`; feedback invokes `dia-feedback`) | live: App.tsx:387 -> DiaSheetMount -> DiaSheet.tsx:119; also /dna/convey -> ConveyStoryHub.tsx:356 -> DiaContextual.tsx:132 |
| DiaHistory | components/dia/DiaHistory.tsx (252) | DiaSheet.tsx:144 | History tab | loading, error, empty, populated (full mode) | Archive (row), Delete (row), Clear all | yes: `dia_query_log.archived_at` update, row delete; RPC `purge_expired_dia_history` | live: DiaSheet.tsx:144 |
| DiaInsights | components/dia/DiaInsights.tsx (181) | DiaSheet.tsx:132 | Insights tab | loading, empty/error (merged), populated | none | n/a | live: DiaSheet.tsx:132 |
| DiaBriefs | components/dia/DiaBriefs.tsx (152) | DiaSheet.tsx:136 | Briefs tab | loading, empty, populated (briefs and/or nudges) | none | n/a | live: DiaSheet.tsx:136 |
| DiaSaved | components/dia/DiaSaved.tsx (115) | DiaSheet.tsx:140 | Saved tab | loading, empty, populated | Delete (row) | yes: delete from `dia_saved_answers` | live: DiaSheet.tsx:140 |
| DiaInsightOfDay | components/dia/DiaInsightOfDay.tsx (89) | none | n/a | loading, null, populated | none | n/a | dead: no caller found (exported from index.ts:4 only) |
| DiaContextual | components/dia/DiaContextual.tsx (146) | pages/dna/convey/ConveyStoryHub.tsx:356 | expand/collapse toggle | collapsed, expanded; floating-button variant | none | n/a | live (desktop only): App.tsx:758-762 /dna/convey -> pages/dna/Convey.tsx -> ConveyStoryHub.tsx:354-356 (`rightColumn` is null when `isMobile`) |
| DiaProfileCard | components/dia/DiaProfileCard.tsx (203) | DiaSearch.tsx:546 | DiaSearch response with profiles | compact, full | none | n/a | live, compact branch only: both live DiaSearch chains pass `compact` true (DiaSheet.tsx:122, ConveyStoryHub.tsx:356 `compact`); full branch has no live chain |
| DiaStoryCard | components/dia/DiaStoryCard.tsx (206) | DiaSearch.tsx:578 | DiaSearch response with stories | compact, full | none | n/a | live, compact branch only (same reason as DiaProfileCard) |
| DiaHashtagChip / DiaHashtagInline | components/dia/DiaHashtagChip.tsx (114) | DiaSearch.tsx:610 (Chip) | DiaSearch response with hashtags | trending, not trending | none | n/a | Chip live: DiaSearch.tsx:610; Inline dead: no caller found |
| DiaOpportunityCard | components/dia/DiaOpportunityCard.tsx (28) | DiaSearch.tsx:710 | DiaSearch response with opportunities | returns null | none | n/a | stub: renders null (file header "STUBBED: Phase 2 teardown") |
| NudgeCard | components/dia/NudgeCard.tsx (190) | pages/NudgeCenter.tsx:77 | NudgeCenter list | single populated state | "Not now" (dismiss), "Snooze" | yes: `dia_nudges.status` update to `dismissed` / `snoozed` via useDiaNudges (snooze `until` is not written) | live: App.tsx:829-833 /dna/nudges -> NudgeCenter.tsx:77 |
| DIAInsightCard | components/dia/DIAInsightCard.tsx (214) | DIAHubSection.tsx:101; DIADetailInsight.tsx:68 | card list from diaCardService | full, compact | X button or `dismiss`-type action | no, localStorage key `dia_dismissed_cards` (7-day expiry, services/diaCardService.ts:82-116) | live via DIAHubSection and DIADetailInsight |
| DIAHubSection | components/dia/DIAHubSection.tsx (113) | pages/dna/connect/Connect.tsx:239; pages/dna/convene/ConveneDiscovery.tsx:471 | page mount (query on user id) | loading, none (null), populated | via DIAInsightCard | no, localStorage `dia_dismissed_cards` | live: App.tsx:537 /dna/connect -> Connect.tsx:236-239 (desktop/tablet branch; mobile branch returns at :202); App.tsx:624-628 /dna/convene -> ConveneDiscovery.tsx:471 (`related`, when `!showHostedDetail`) |
| DIADetailInsight | components/dia/DIADetailInsight.tsx (78) | components/convene/EventOverview.tsx:744 | page mount | none (null), populated (one compact card) | via DIAInsightCard | no, localStorage `dia_dismissed_cards` | live: App.tsx:632-633 /dna/convene/events/:id index -> EventOverview.tsx:744; also EventDetail.tsx:288; MyEvents.tsx:330 -> EventOverviewPanel |
| PostConnectionNudgeCard | components/dia/PostConnectionNudgeCard.tsx (164) | components/connect/ConnectionRequestCard.tsx:134 | accepting a connection request | null (no nudges), populated | X button | no, localStorage key `nudge-connection-${connection_id}` = `dismissed` (ConnectionRequestCard.tsx:97-100) | live (mobile only): App.tsx:537,544 /dna/connect/network -> Connect.tsx:219 `<Outlet>` (mobile branch only; desktop branch renders no Outlet) -> pages/dna/connect/Network.tsx:228 -> ConnectionRequestCard.tsx:134 |
| AskDiaCta | components/right-rail/AskDiaCta.tsx (130) | right-rail/DnaRightRail.tsx:21 | always rendered in rail | fallback chips, personalized chips, with/without "Continue" row | none | n/a | live (desktop only): App.tsx:566 /dna/feed -> pages/dna/Feed.tsx:276 (desktop branch; mobile returns at :168) -> feed/FeedCommunityPulse.tsx:9 -> DnaRightRail.tsx:21 |
| DiaDailyBrief | components/right-rail/DiaDailyBrief.tsx (254) | right-rail/DnaRightRail.tsx:19 | always rendered in rail | loading, populated (real cards padded with evergreen) | menu "Not interested", "Dismiss", "Save for later" | yes: RPC `record_brief_interaction` (types `dismissed`, `not_interested`, `saved`, `viewed`, `clicked`, `why_this_opened`) | live (desktop only): same chain as AskDiaCta, DnaRightRail.tsx:19 |
| MorningBriefBanner | components/pulse/MorningBriefBanner.tsx (191) | layouts/BaseLayout.tsx:166-171 | once per calendar day on /dna/feed when summaries pref on and unread > 0; or `?digest=open` | hidden, banner shown, sheet open | X button; tapping banner also marks seen | no, localStorage key `dia:morning-brief:${user.id}` = date string | live: App.tsx:388 BaseLayout -> BaseLayout.tsx:167 (`user && pathname.startsWith('/dna/feed')`) |
| InboxDigestSheet | components/pulse/InboxDigestSheet.tsx (310) | MorningBriefBanner.tsx:186 | banner tap or `?digest=open` | loading, error, no conversations, populated, brief loading/error | Close; per-thread Snooze menu | snooze and mark-read go through `useBriefActions` (not traced in this section) | live: BaseLayout.tsx:169 -> MorningBriefBanner.tsx:186 |
| DailyPulseContent | components/pulse/DailyPulseContent.tsx (234) | pages/dna/convey/ConveyStoryHub.tsx:235 | Convey "Daily" lens | loading, error, empty, populated, with/without DIA brief | none | n/a | live: /dna/convey -> ConveyStoryHub.tsx:235 (`activeTab === 'daily'`) |
| UniversalComposer DIA line + ComposerFields DiaMark | components/composer/UniversalComposer.tsx (1094), components/composer/ComposerFields.tsx (336) | drawer/surfaces/ComposerSurface.tsx:21 | typing in composer (`dia-compose-read` via useDIACompose) | reading, proposal shown, verb picked by member, none | "not this?" rejects proposal | not traced in this section | live: App.tsx:376 DrawerProvider (resolvers from drawer/resolvers.tsx:33) -> ComposerSurface.tsx:21 -> UniversalComposer |
| ComposerSuccessScreen | components/composer/ComposerSuccessScreen.tsx (254) | none | n/a | single populated state | dismiss button (`suggestion.dismissLabel`) | n/a | dead: no caller found |
| SmartReplyChips | components/messaging/dia/SmartReplyChips.tsx (70) | messaging/inbox/ChatThread.tsx:841; messaging/group/GroupThreadView.tsx:528 | inbound message with `smartRepliesEnabled` | null, loading, populated | none | n/a | live via ChatThread: /dna/:username -> ProfileV2.tsx:430 -> MessageContext overlay -> MessageOverlay.tsx:119 -> ChatThread.tsx:841; GroupThreadView chain dead (route redirect) |
| SmartComposeSuggestions | components/messaging/dia/SmartComposeSuggestions.tsx (82) | messaging/inbox/ChatThread.tsx:686 | empty thread (`messages.length === 0`) | blocked/disabled (null), loading, error, empty, populated | none | n/a | live: ChatThread.tsx:686 via overlay chain above |
| MessageSummaryDrawer | components/messaging/dia/MessageSummaryDrawer.tsx (196) | ChatThread.tsx:903; GroupThreadView.tsx:579 | header More menu "Catch me up" (when `summariesEnabled`) | loading, error, populated, nothing-new | Close; per-action-item X | no (action-item dismissals are in-memory `Set`, reset on close) | live: ChatThread.tsx:611-614, :903 via overlay chain |
| ActionItemChip | components/messaging/dia/ActionItemChip.tsx (87) | MessageSummaryDrawer.tsx:139 | summary with action items | single state | X button | no (in-memory) | live: via MessageSummaryDrawer |
| DiaFeedbackBar | components/messaging/dia/DiaFeedbackBar.tsx (66) | SmartReplyChips.tsx:61; MessageSummaryDrawer.tsx:162 | suggestions or summary shown | unvoted, voted | n/a | vote sent via `submitDiaFeedback` (services/diaMessagingTelemetry) | live: via SmartReplyChips and MessageSummaryDrawer in ChatThread |
| DiaMessagingSettingsDrawer | components/messaging/dia/DiaMessagingSettingsDrawer.tsx (83) | ChatThread.tsx:910; GroupThreadView.tsx:585 | header More menu "DIA settings" | single state | Done | toggles persist to `dia_messaging_prefs` | live: ChatThread.tsx:615, :910 via overlay chain |
| GroupMentionsDrawer | components/messaging/dia/GroupMentionsDrawer.tsx (111) | GroupThreadView.tsx:591 | @ button | empty, populated | close | n/a | dead: only parent GroupThreadView, whose route redirects (MESSAGING_ENABLED false) |
| MessageSettingsDialog | components/messaging/MessageSettingsDialog.tsx (77) | messaging/ConversationListPanel.tsx | settings action in list | single state | close | toggles persist to `dia_messaging_prefs` | dead: ConversationListPanel only rendered by pages/dna/Messages.tsx, whose routes redirect |
| DiaConversationStarter | components/messaging/DiaConversationStarter.tsx (106) | messaging/ConversationListPanel.tsx:660 | conversation idle 7+ days, no unread, not group | null, populated | X button | no, localStorage key `dia-starter-dismissed-${conversationId}` = `1` | dead: ConversationListPanel only rendered by Messages.tsx (route redirects) |
| DiaDiscoveryCard (chassis) | components/cards/DiaDiscoveryCard.tsx (151) | convene/ConveneDIADiscoveryCard.tsx:273 (live); convey, collaborate, contribute discovery cards (dead) | parent decides | single state | X button calls parent `onDismiss` | parent-owned | live: via ConveneDIADiscoveryCard |
| ConveneDIADiscoveryCard | components/convene/ConveneDIADiscoveryCard.tsx (285) | pages/dna/convene/ConveneDiscovery.tsx:604 | priority rules over profile and network data | null, one of 5 card types | X button | no, localStorage `dia_dismissed_cards` with key `convene-discovery-${cardTypeId}-${user.id}` | live: /dna/convene -> ConveneDiscovery.tsx:604 (list view, `showDiscoveryLanes` true: lens `all`, no facets) |
| ConveyDIADiscoveryCard | components/convey/ConveyDIADiscoveryCard.tsx (224) | none | n/a | null, one of 5 card types | X button | no, localStorage `dia_dismissed_cards` key `convey-discovery-${cardTypeId}-${user.id}` | dead: no caller found |
| CollaborateDIADiscoveryCard | components/collaborate/CollaborateDIADiscoveryCard.tsx (52) | none | n/a | dismissed (null), rebuilding card | X or "Got it" | no, localStorage `dia_dismissed_cards` key `DIA_COLLABORATE_REBUILDING` | dead: no caller found (also a stub by its header) |
| ContributeDIADiscoveryCard | components/contribute/ContributeDIADiscoveryCard.tsx (51) | none | n/a | dismissed (null), rebuilding card | X or "Got it" | no, localStorage `dia_dismissed_cards` key `DIA_CONTRIBUTE_REBUILDING` | dead: no caller found (also a stub by its header) |
| DiaOrganizerInsight | components/convene/DiaOrganizerInsight.tsx (107) | none | n/a | dismissed/no insight (null), populated | X button | no, localStorage key `dia_organizer_insight_dismissed` (timestamp, 7-day cooldown) | dead: no caller found |
| PastEventDiaNudge | components/convene/PastEventDiaNudge.tsx (142) | convene/MyEventCard.tsx:229; pages/dna/convene/MyEvents.tsx:662 | past event row | dismissed (null), share_story, connect_attendees | X button | no, localStorage key `dia_past_event_dismissed_${variant}_${eventId}` (timestamp, 7-day cooldown) | live (share_story only): App.tsx:654-659 /dna/convene/mine -> MyEvents.tsx:662 (past attending) and MyEvents.tsx:474 -> MyEventCard.tsx:229 (`isPast && !isCancelled`); `connect_attendees` variant has no caller |
| DiaUniqueInsight | components/profile/DiaUniqueInsight.tsx (113) | pages/ProfileV2.tsx:540 | owner views own profile | non-owner (null), loading, empty (null), Pro teaser, full | none | n/a (insight cached to `profiles.dia_insight`) | live, teaser branch only: /dna/:username -> ProfileV2.tsx:540; `isPro` is not passed so defaults to false, the full "DIA says" branch has no live chain |
| DIAInsightCard (identity-hub) | components/identity-hub/DIAInsightCard.tsx (155) | none | n/a | hidden, upsell, learning, populated | none | n/a | dead: no caller found |
| DiaInsightCard (connect hub) | components/connect/hub/DiaInsightCard.tsx (465) | imported at connect/hub/DiscoveryFeed.tsx:15, never rendered | n/a | 5 type variants | X button calls `onDismiss` | n/a | dead: imported but no render site (DiscoveryFeed itself is live at Connect.tsx:248) |
| HubDIAPanel | components/hubs/shared/HubDIAPanel.tsx (168) | none (re-exported at hubs/shared/index.ts:26) | n/a | null, loading, populated | X per row | no (in-memory `Set`) | dead: no caller found |
| DemoDIA | components/demo/sections/DemoDIA.tsx (162) | pages/Demo.tsx:99 | page load | static | none | n/a | live: App.tsx:409 /demo -> Demo.tsx:99 (static copy; renders no DIA output) |
| NudgeCenter (page) | pages/NudgeCenter.tsx (174) | App.tsx:829-833 | route | loading, empty per tab, populated | via NudgeCard | yes: `dia_nudges` | live: route /dna/nudges |
| DiaPreferences (page) | pages/DiaPreferences.tsx (276) | App.tsx:834-837 | route | loading, form | Cancel (history back) | save writes `dia_preferences` | live: route /dna/preferences |
| DiaAdminPage (page) | pages/admin/DiaAdminPage.tsx (334) | App.tsx:891 | route (admin) | checking, access denied, loading per card, no data, populated | none | n/a | live: /admin/dia under AdminRouteGuard (admin-facing, not member-facing) |

---

#### index.ts

`components/dia/index.ts` re-exports `DiaSearch`, `DiaHistory`, `DiaInsights`, `DiaInsightOfDay`, `DiaContextual`, `DiaProfileCard`, `DiaStoryCard`, `DiaHashtagChip`, `DiaHashtagInline`, `DiaOpportunityCard` (default), `NudgeCard` (default), `DIAInsightCard`, `DIAHubSection`, `DIADetailInsight`. It does not export `DiaSheet`, `DiaSheetMount`, `DiaBriefs`, `DiaSaved` or `PostConnectionNudgeCard`. The only import through the barrel is `pages/dna/convey/ConveyStoryHub.tsx:21` (`DiaContextual`). No strings.

#### DiaSheetMount

Mount chain: `App.tsx:386` `<DiaSheetProvider>` -> `App.tsx:387` `<DiaSheetMount />`. It reads `open` from `useDiaSheet()`, flips `hasOpened` true the first time `open` is true, and from then on renders `<Suspense fallback={null}><DiaSheet /></Suspense>` with `DiaSheet` lazy-imported (`DiaSheetMount.tsx:8`).

States: never opened (returns `null`), opened at least once (renders DiaSheet, which then follows `open`).

Strings: none.

#### DiaSheet

Mount chain: App.tsx:387 -> DiaSheetMount.tsx:21 -> DiaSheet. Opened by `openWith(prompt?)` from `UnifiedHeader.tsx:445`, `DnaMobileHeader.tsx:121`, `AskDiaCta.tsx:99,111,121`. `openWith` with a prompt sets `seedPrompt` and `seedNonce = Date.now()`; DiaSearch then auto-submits it.

Behaviour: right-side `Sheet`. When open, invokes Edge Function `dia-smart-chips` (`DiaSheet.tsx:34-42`, staleTime 10 min); each chip's `prompt` is passed to DiaSearch as `suggestions` (falls back to DiaSearch defaults when empty or on error). Five tabs; each tab's content is rendered only while that tab is active. On the Ask tab, the first text input is focused 120 ms after open. Clicking an item in Insights, Briefs, Saved or History calls `openWith(query)` and switches to the Ask tab.

States: closed; open on tab `search` (default), `insights`, `briefs`, `saved`, `history`.

Member-facing strings:
- `DIA`
- `Beta`
- `Your AI agent for Africa and its diaspora`
- `Ask` (tab)
- `Insights` (tab)
- `Briefs` (tab)
- `Saved` (tab)
- `History` (tab)
- Smart chip prompts from `dia-smart-chips` (server text, rendered as DiaSearch empty-state chips).

DiaSearch props from this parent: `source="dia-sheet"`, `compact`, `hideBrandInAnswer`, `initialQuery={seedPrompt}`, `autoSearch={!!seedPrompt && seedNonce > 0}`, `key={`ask-${seedNonce}`}`. DiaInsights: `limit={6}`.

#### DiaSearch

Mount chains:
1. App.tsx:387 -> DiaSheetMount.tsx:21 -> DiaSheet.tsx:119 (Ask tab), `compact` true, `hideBrandInAnswer` true.
2. App.tsx:758-762 `/dna/convey` -> `pages/dna/Convey.tsx` -> `ConveyStoryHub.tsx:356` (desktop only) -> `DiaContextual.tsx:132` (expanded state; `compact` true because ConveyStoryHub passes `compact`). Props from `config/dia-pillar-config.ts` `convey` entry.
3. `DiaContextual.tsx:78` (floating-button bottom sheet, `compact={false}`): no live chain, because ConveyStoryHub does not pass `floatingButton`.

Data: invokes Edge Function `dia-search` with `{ query, source, prior_turns }` (`DiaSearch.tsx:382-388`). Thumbs feedback invokes `dia-feedback` with `{ query_hash, helpful }` (`:327`). Save inserts into table `dia_saved_answers` (`user_id, query_text, answer, tool_results, citations, query_hash`) (`:348-355`). Input `maxLength={500}`. Enter submits, Shift+Enter inserts newline. Textarea auto-grows to 200 px.

Thread model: `MAX_TURNS = 5` (root plus follow-ups). A submit while a response is on screen and the cap is not reached is sent as a follow-up with prior turns replayed. When the cap is reached a restart row appears.

Network matches: rendered in `networkMatchPriority` order (default `['profiles','stories','projects','opportunities','hashtags','events']`) capped by `maxResults` (default profiles 3, stories 2, projects 2, hashtags 3, events 2, opportunities 2). The current user is filtered out of profiles. Names in the answer text that match a returned profile's `full_name` become buttons navigating to `/dna/${id}`. Section click targets: profile card `/dna/${id}` (DiaProfileCard), event `/events/${id}`, project `/dna/collaborate/spaces/${id}`, hashtag `/dna/hashtag/${name}`, story `/story/${id}`. (`handleProfileClick` navigating to `/profile/${id}` and `handleStoryClick` are defined but not passed to any child.)

States:
- Empty (no response, not pending, not rate-limited): `DiaEmptyState` with suggestion chips.
- Loading (`searchMutation.isPending`): `DiaSearchSkeleton`; submit button shows spinner; input disabled.
- Populated: answer card, optional Sources, optional feedback row, optional "In Your DNA Network" card, optional follow-up chips.
- Threaded: prior-turn strips plus a "Follow-up" strip above the answer.
- Thread cap reached: restart row.
- Rate-limited: amber banner; input disabled; response and empty state hidden.
- Cached response: `Cached` badge and an info toast.
- Error: toasts only (no inline error state).
- `DiaNoResults` (`:212-241`) is defined but never rendered by this file.

Member-facing strings (verbatim):
- `Ask DIA about African opportunities, markets, or trends...` (default placeholder, non-compact)
- `Ask DIA…` (placeholder when `compact`)
- `Ask DIA` (textarea aria-label)
- `Ask DIA` (submit button aria-label and title)
- `{response.usage.queries_remaining} queries remaining this month`
- `DIA is researching...`
- `Searching global sources and your network`
- `Ask DIA Anything About Africa`
- `Get AI-powered intelligence about African markets, opportunities, and connect with your network members who share your interests.`
- Default empty-state suggestions (used when no `suggestions` prop): `Fintech opportunities in Nigeria`, `Renewable energy investments in Kenya`, `Tech hubs in Ghana`, `Agricultural innovations in Ethiopia`
- Unrendered `DiaNoResults` copy: `No results found for your query`, `Try being more specific or explore these suggestions:`, `Fintech founders in West Africa`, `Diaspora investors in renewable energy`, `Tech professionals from Nigeria in London`
- `Monthly Query Limit Reached` (banner title)
- `You've used all {rateLimitInfo?.limit || 10} DIA queries this month.`
- ` Resets on {new Date(rateLimitInfo.resets_at).toLocaleDateString()}.`
- `Upgrade` (banner button, no onClick)
- `You asked`
- `Follow-up`
- `Answer` (card label when `hideBrandInAnswer`)
- `DIA` (card title when not `hideBrandInAnswer`)
- `Cached` (badge)
- `Saved` / `Save answer` (bookmark aria-label and title, by state)
- `Sources`
- `Source` (fallback source name when a citation URL does not parse)
- `Show less`
- `Show {citations.length - 5} more sources`
- `Was this helpful?`
- `Helpful` (aria-label)
- `Not helpful` (aria-label)
- `In Your DNA Network`
- `Connected Professionals`
- `Related Stories`
- `Related Topics`
- `Related Events`
- `Active Spaces`
- `Contribution Opportunities`
- Event row: `{event.title}`, date via `toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })`, badge `{event.relevance}`
- Project row: `{project.name}`, badge `{project.status}`
- `Ask a follow-up`
- Follow-up chips: `{f}` from `response.data.follow_ups`
- `{MAX_TURNS - totalTurns} {MAX_TURNS - totalTurns === 1 ? 'turn' : 'turns'} left in this thread`
- `You've reached the {MAX_TURNS}-turn limit for this thread.`
- `New question`
- Toasts: `Thanks — glad it helped`, `Thanks — DIA will learn from this`, `Couldn't record feedback`, `Saved`, `Couldn't save`, `Retrieved from cache`, `Monthly Query Limit Reached` with description `You've used all your DIA queries this month.`, `Please sign in to use DIA`, `Query too long` with description `Maximum 500 characters allowed`, `Search failed` with description `Please try again.`
- `Untitled question` (stored as `query_text` when no question text; surfaces later in DiaSaved)
- Answer body, citations and match fields are server text from `dia-search`.

Suggestions passed by the Convey chain (`dia-pillar-config.ts:93-100`, first four used via `.slice(0, 4)`): `Trending stories this week`, `Popular hashtags in African tech`, `Founder journey stories`, `Content about diaspora investment`. Placeholder from that config: `Discover stories, content, or trending topics...` (shown only when not compact; the live Convey chain is compact, so `Ask DIA…` shows).

#### DiaHistory

Mount chain: DiaSheet.tsx:144 (History tab), props `onQueryClick` only, so the full (non-compact) layout renders.

Data: on load fires RPC `purge_expired_dia_history` (best effort), then selects `dia_query_log` rows for the user with `archived_at` null, newest first, limit 20. Deduplicates by lowercase trimmed `query_text`. Archive sets `archived_at`; Delete deletes the row; Clear all deletes every row for the user after a `confirm()` dialog. Clicking a row re-asks in the Ask tab.

States: loading (spinner), error, empty, populated (full), compact (top 5 plus overflow count; no live chain uses compact).

Member-facing strings:
- `Failed to load history`
- `No search history yet`
- `Your DIA queries will appear here`
- `Recent Searches`
- `{uniqueQueries.length} unique`
- `Clear all`
- `Delete all DIA history? This cannot be undone.` (confirm dialog)
- Relative time via `formatDistanceToNow(..., { addSuffix: true })`
- `Cached`
- `Archive` (aria-label), `Archive (kept 14 days)` (title)
- `Delete` (aria-label and title)
- `Archived items are automatically removed after 14 days.`
- Compact-only: `+{uniqueQueries.length - 5} more queries`
- Toasts: `Could not archive`, `Archived (kept for 14 days)`, `Could not delete`, `Deleted`, `Could not clear history`, `History cleared`

#### DiaInsights

Mount chain: DiaSheet.tsx:132 (Insights tab), `limit={6}`.

Data: invokes Edge Function `dia-daily-insights` with `{}` (errors swallowed), then selects `dia_insights` where `is_active` true and `start_date` equals today's UTC date, ordered by `display_order`, limit 6. Click updates `dia_insights.click_count` (+1, client-computed) and passes `query_prompt` to the Ask tab. Category icons/colours map: fintech, energy, tech, agriculture, real-estate, creative, healthcare, education, default.

States: loading; empty or error (one shared state); populated.

Member-facing strings:
- `No insights available`
- `Today's Insights`
- `Refreshed daily`
- `Featured` (badge)
- Category badge: `{insight.category}` (CSS capitalize)
- Region labels: `West Africa`, `East Africa`, `North Africa`, `Southern Africa`, `Central Africa` (else raw `insight.region`)
- `{insight.title}`, `{insight.description}` (database text)

#### DiaBriefs

Mount chain: DiaSheet.tsx:136 (Briefs tab).

Data: selects `dia_brief_cards` (`id, title, body, cta_label, generated_at`) for the user, newest 6; and `dia_nudges` (`id, nudge_type, message, created_at`) with `status = 'pending'`, newest 6. Brief CTA sends the card `title` to the Ask tab; nudge button sends the nudge `message`.

States: loading; empty (both lists empty); populated with briefs, nudges, or both.

Member-facing strings:
- `No briefs yet`
- `DIA will surface personalized briefs and nudges as you connect, convene, and contribute.`
- `Today's briefs`
- `{b.title}`, `{b.body}`, relative time, `{b.cta_label}` (button)
- `Nudges for you`
- `{n.nudge_type.replace(/_/g, ' ')}` (capitalized via CSS), `{n.message}`
- `Ask DIA` (nudge button)

#### DiaSaved

Mount chain: DiaSheet.tsx:140 (Saved tab).

Data: selects `dia_saved_answers` (`id, query_text, answer, created_at`) for the user, newest 50. Delete removes the row.

States: loading; empty; populated.

Member-facing strings:
- `Nothing saved yet`
- `Tap the bookmark on any DIA answer to keep it here for later.`
- `{s.query_text}`, `{s.answer}`, relative time
- `Re-ask`
- `Delete` (aria-label)
- Toast: `Removed from saved`

#### DiaInsightOfDay

Mount chain: no caller found. Exported from `components/dia/index.ts:4`; no import anywhere.

Data (if mounted): selects featured active `dia_insights`, picks one by day-of-year modulo count.

States: loading card; null (no insight); populated.

Member-facing strings:
- `DIA Insight of the Day`
- `{insight.title}`, `{insight.description}`
- `Ask DIA more`

#### DiaContextual

Mount chain: `/dna/convey` (App.tsx:758-762) -> `pages/dna/Convey.tsx` -> `ConveyStoryHub.tsx:354-356` `<DiaContextual pillar="convey" collapsed={false} compact />` inside `rightColumn`, which is `null` when `isMobile`, passed at `ConveyStoryHub.tsx:439`.

Behaviour: card with header and a chevron toggle; when expanded, renders DiaSearch with the pillar config. `collapsed={false}` means it starts expanded. The floating-button variant (`floatingButton && isMobile`) renders a fixed round button that opens a bottom sheet containing DiaSearch; no caller passes `floatingButton`.

States: expanded (initial on Convey), collapsed; floating-button closed/open (no live chain). Returns `null` if the pillar has no config.

Member-facing strings:
- `DIA: {config.title}` -> live value `DIA: Stories & Content`
- `{config.description}` -> live value `Discover stories, content, and trending topics`
- The toggle button and the floating button have no aria-label or text.

#### DiaProfileCard

Mount chain: DiaSearch.tsx:546 inside "Connected Professionals". Both live DiaSearch chains pass `compact` true, so only the compact button renders. DiaSearch passes no `mutualConnections` and no `onConnect`.

Behaviour: compact: whole row navigates to `/dna/${id}`. Full (no live chain): relevance badge links to `/dna/connect/discover?match=${slug}` (`skills`, `location` or `high`), mutuals link `/dna/${id}?tab=mutuals`, skill badges link `/dna/connect/discover?skill=${skill}`.

States: compact; full.

Member-facing strings:
- Compact: `{full_name}`, `{headline || relevance}`, avatar fallback `{full_name?.charAt(0) || '?'}`
- Full (no live chain): `{full_name}`, `{headline}`, `{location}`, relevance badge `{relevance}` (component comment lists `"High match" | "Skills match" | "Location match"`), aria-label `Filter discovery by ${relevance}`, `{mutualConnections} mutual{mutualConnections > 1 ? 's' : ''}`, aria-label `View ${mutualConnections} mutual connections`, skill badge `{skill}`, aria-label `Find more profiles with ${skill}`, `+{skills.length - 3}`, `View Profile`, `Connect`

#### DiaStoryCard

Mount chain: DiaSearch.tsx:578 inside "Related Stories"; compact on both live chains.

Behaviour: compact row navigates to `/story/${id}`. Full (no live chain): author button to `/profile/${author.id}`, hashtag badges call `onHashtagClick`.

Member-facing strings:
- Compact: `{title}`, `{author.name}`, `·`, relative `{timeAgo}`
- Full (no live chain): `{title}`, `"{excerpt}"`, `{author.name}`, `·`, `{timeAgo}`, `{formatCount(view_count)} views`, `{formatCount(like_count)} likes`, `#{hashtag}`, `+{hashtags.length - 4}`, `Read Story`
- Count format: `${(count / 1000000).toFixed(1)}M`, `${(count / 1000).toFixed(1)}k`

#### DiaHashtagChip and DiaHashtagInline

Mount chain: `DiaHashtagChip` at DiaSearch.tsx:610 inside "Related Topics", with `onClick` navigating to `/dna/hashtag/${name}`. `DiaHashtagInline`: no caller found.

States: trending (orange styling, flame icon), not trending.

Member-facing strings:
- `#{name}`
- `{formatCount(post_count)} posts`
- Inline variant: `#{name}`

#### DiaOpportunityCard

Mount chain: DiaSearch.tsx:710 inside "Contribution Opportunities". The component returns `null` unconditionally (`DiaOpportunityCard.tsx:27`). The section heading `Contribution Opportunities` still renders in DiaSearch when the response contains opportunities, with no cards under it.

Strings: none.

#### NudgeCard

Mount chain: `/dna/nudges` (App.tsx:829-833) -> `OnboardingGuard` -> `pages/NudgeCenter.tsx:77`.

Behaviour: Accept navigates to `payload.action_url` if present, then calls `onAccept`. "Not now" calls `onDismiss` (sets `dia_nudges.status = 'dismissed'`, `resolved_at`). "Snooze" computes `until` 30 days out and calls `onSnooze`; `useDiaNudges.snoozeNudge` writes only `status = 'snoozed'` and does not store `until` (`hooks/useDiaNudges.ts:138-144`). Left border colour by `priority`.

Member-facing strings:
- Type labels (`NUDGE_TYPE_CONFIG`): `Opportunity Match`, `Trending`, `Impact Update`, `Getting Started`, `Connect`, `Welcome Back`, `We Miss You`, `Share Update`, `Connections`, `Complete Profile`, `Content`, `Reconnect`; fallback `{nudge.nudge_type || 'Notification'}`
- `{nudge.payload.match_score}% match` (only for opportunity nudge types)
- `{nudge.message}`
- Match reason badges `{reason}` (first 3)
- Action button: `View Opportunity`, `Check It Out`, `See Impact`, `View Requests`, `Complete Profile`, else `Do this`
- `Not now`
- `Snooze`
- Toasts from useDiaNudges: `Error` / `Failed to load nudges`, `Error` / `Failed to accept nudge`, `Success` / `Nudge accepted`, `Error` / `Failed to dismiss nudge`, `Error` / `Failed to snooze nudge`, `Snoozed` / `You'll see this again later`

#### DIAInsightCard

Mount chain: via DIAHubSection.tsx:101 (full mode) and DIADetailInsight.tsx:68 (`compact`). Card objects come from `services/diaCardService.ts` `getDIACards`, which runs client-side generators in `services/dia/*Cards.ts` per surface (`SURFACE_CATEGORIES`, `diaCardService.ts:120-131`) and filters out keys present in localStorage `dia_dismissed_cards`.

Behaviour: X button and any action of type `dismiss` call `onDismiss(card.dismissKey)`. `custom` action with `payload.action === 'open_introduction'` opens `IntroductionModal`. `navigate` actions navigate; a URL matching `/dna/messages?to=` calls `onMessageUser` instead when provided. Full mode shows primary plus secondary buttons; compact shows only the primary as a text link.

States: full; compact; with or without IntroductionModal open.

Member-facing strings:
- `Dismiss` (aria-label)
- `DIA • {CATEGORY_LABELS[card.category]}` where labels are `CONNECT`, `CONVENE`, `COLLABORATE`, `CONTRIBUTE`, `CONVEY`, `CROSS-C`
- `{card.headline}`, `{card.body}`, `{primaryAction.label}`, `{action.label}`, compact `{primaryAction.label} →`

Card copy reachable on live surfaces (connect_hub -> connect generators; convene_hub -> convene generators; event_detail -> convene and cross_c generators):
- `services/dia/connectCards.ts`: `You and ${bestCandidate.full_name || 'someone'} share ${sharedSkills.length} skill${sharedSkills.length > 1 ? 's' : ''}`; `${bestCandidate.headline || 'A fellow diaspora member'}. You both know ${sharedSkills.slice(0, 2).join(' and ')}. Worth connecting?`; `View Profile`; `Not now`; `${total} connections and growing`; `You've hit the ${hitMilestone} milestone${recent > 0 ? ` with ${recent} new connections this month` : ''}. Your diaspora network is expanding.`; `Explore Network`; `Reconnect with ${otherProfile.full_name || 'a connection'}`; `It's been a while since you connected with ${otherProfile.full_name || 'them'}. ${otherProfile.headline || 'Catch up on what they have been working on.'}`; `Send Message`; `View Profile`; `Connect ${profileA.full_name} and ${profileB.full_name}?`; `They're both in your network but don't know each other. A warm connection could spark collaboration.`; `Make a Connection`; `Not now`
- `services/dia/conveneCards.ts`: `${bestCount} connections are attending ${event.title}`; `People in your network are going. Join them and make the most of the event together.`; `View Event`; `Not now`; `You might enjoy: ${bestEvent.title}`; `Based on your interest in ${matchReasons.slice(0, 2).join(' and ')}, this event looks like a fit.`; `Not interested`; `Follow up from ${event.title}`; `You attended this event recently. ${attendeeCount || 0} other attendees were there. Connect with them while the conversation is fresh.`; `See Attendees`; `Have you considered hosting an event?`; `You have attended ${attendedCount} events this month. Your experience as an engaged participant could make you a great host.`; `Create Event`; `Not for me`; `{event.title}` as headline with body `${location ? `📍 ${location} · ` : ''}${event.event_type || 'Event'} curated by DNA.${tags.length > 0 ? ` Tags: ${tags.join(', ')}` : ''}`; `Browse All`
- `services/dia/crossCCards.ts` (event_detail only): `Turn ${event.title} into ongoing collaboration`; `${attendeeCount} people attended this event. Create a Space to keep the conversation and collaboration going.`; `Create Space`; `Not now`; `Your week across the Five C's`; `This week: ${parts.join(', ')}. ${totalActivity >= 5 ? 'You are building real momentum.' : 'Every action strengthens the diaspora.'}` with parts `${connections} connection${...}`, `${events} event${...}`, `${tasks} task${...} completed`, `${contributions} contribution${...}`, `${posts} post${...} published`; `View Dashboard`

#### DIAHubSection

Mount chains:
- `/dna/connect` (App.tsx:537-541) -> `OnboardingGuard` -> `pages/dna/connect/Connect.tsx:236-239` `<DIAHubSection surface="connect_hub" limit={2} onMessageUser={handleMessageMember} />` in `ConnectHubLayout` `leftPanel`. The mobile branch (`Connect.tsx:202-229`) returns before this and does not render it.
- `/dna/convene` (App.tsx:624-628) -> `OnboardingGuard` -> `pages/dna/convene/ConveneDiscovery.tsx:471` `<DIAHubSection surface="convene_hub" limit={2} />` inside the `related` prop when `showHostedDetail` is false.

Data: `getDIACards({ userId, surface, limit, excludeDismissed: true })`, staleTime 5 min. Dismiss calls `dismissDIACard(dismissKey)` (localStorage `dia_dismissed_cards`, 7 days) then `refetch()`.

States: loading (header plus spinner); no cards (returns `null`); populated.

Member-facing strings:
- `DIA Insights`
- `Loading insights...`
- `{cards.length}` (count chip)

#### DIADetailInsight

Mount chain: `/dna/convene/events/:id` (App.tsx:632) -> `EventDetail` with index route `EventOverview` (App.tsx:633) -> `components/convene/EventOverview.tsx:744` `<DIADetailInsight surface="event_detail" entityId={event.id} />`. Also `pages/dna/convene/EventDetail.tsx:288` renders `EventOverview` directly, and `/dna/convene/mine` -> `MyEvents.tsx:330` -> `EventOverviewPanel` -> `EventOverview`.

Data: `getDIACards` with `limit: 1`. `entityId` is part of the query key only; the generators receive just `userId`. Dismiss as DIAHubSection.

States: none (returns `null`; no loading UI); populated (one compact DIAInsightCard).

Strings: none of its own (see DIAInsightCard).

#### PostConnectionNudgeCard

Mount chain: `/dna/connect/network` (App.tsx:537, child at :544) -> `Connect.tsx:219` `<Outlet>` in the mobile branch only -> `pages/dna/connect/Network.tsx:228` -> `components/connect/ConnectionRequestCard.tsx:132-142`, rendered when `status === 'accepted' && showNudges && nudges.length > 0`.

Trigger: on accept, `ConnectionRequestCard.tsx:66` calls `onRequestHandled` (which reloads the parent's request list, `Network.tsx:228`), then if localStorage key `nudge-connection-${connection_id}` is absent it calls `generatePostConnectionNudges` (`lib/dia/postConnectionNudges.ts`, client-side Supabase queries) and shows the card after 500 ms. Whether the card stays mounted across the parent reload was not traced at runtime.

Dismiss: X sets `showNudges` false and writes localStorage `nudge-connection-${connection_id}` = `dismissed`.

States: `null` when no nudges; populated with 1 to 3 nudges.

Member-facing strings:
- `DIA Suggestion`
- `Dismiss` (aria-label)
- `{connectedUserName}`, `{connectedUserHeadline}`, initials fallback
- Nudge descriptions and CTAs from `lib/dia/postConnectionNudges.ts`: `You and ${connectedUserName} are both attending "${futureEvent.title}"` / `View Event`; `${connectedUserName} posted a need for ${overlap[0]} — matches your expertise` / `View Opportunity`; `${connectedUserName} is in "${space.name}" — join to collaborate` / `View Space`; `You and ${connectedUserName} both know ${mutualProfile.full_name}` / `Message ${mutualProfile.full_name.split(' ')[0]}`; `Send ${connectedUserName} a welcome message` / `Start Conversation`

#### AskDiaCta

Mount chain: `/dna/feed` (App.tsx:566) -> `pages/dna/Feed.tsx:202-276` (desktop branch; the mobile branch returns at `Feed.tsx:168`) -> `<aside>` -> `components/feed/FeedCommunityPulse.tsx:9` -> `components/right-rail/DnaRightRail.tsx:21`.

Data: last `dia_query_log` row for the user in the past 24 hours; Edge Function `dia-smart-chips` (fallback chips on error). Every button calls `openWith` on the DIA sheet.

States: fallback chips; personalized chips; with or without the Continue row.

Member-facing strings:
- `Ask DIA` (section aria-label and heading)
- `Tailored to your recent activity.` (when `personalized`)
- `Real-time intelligence across the diaspora.`
- `Continue: {truncate(lastQuery.query_text, 40)}` (truncation appends `…`)
- Fallback chip labels: `Latest African fintech funding`, `Diaspora renewable projects`, `Markets hiring tech talent`
- Fallback chip prompts (button title, sent to sheet): `Latest fintech funding across Africa this month`, `Diaspora-led renewable energy projects in East Africa`, `Which African markets are hiring senior tech talent right now?`
- Server chips: `{c.label}`, title `{c.prompt}`
- `Start a conversation`

#### DiaDailyBrief

Mount chain: same as AskDiaCta, `DnaRightRail.tsx:19`.

Data: `useDiaDailyBrief` -> RPC `get_dia_daily_brief(p_user_id)`; realtime broadcast channel `dia-brief-${user.id}` event `brief_refresh` invalidates. Interactions -> RPC `record_brief_interaction(p_card_id, p_interaction_type)`; `dismissed` and `not_interested` also remove the card from the cached list. Fewer than 3 real cards are padded with client-side evergreen cards for modules not already present; evergreen cards record no interactions and show no menu.

States: loading (3 skeletons); populated (real, evergreen, or mixed). No empty or error UI.

Member-facing strings:
- `DIA Daily Brief` (section aria-label)
- `DIA Brief`
- `Today's three signals for you`
- `Refresh brief` (aria-label)
- Module badge labels (`right-rail/moduleVisuals.ts`): `Connect`, `Convene`, `Collaborate`, `Contribute`, `Convey`
- `Evergreen` (when `is_fallback`)
- `{card.title}`, `{card.body}`, `{card.cta_label}`
- `Why this card` (aria-label), popover `Why DIA surfaced this`, `{card.reasoning}`
- `Card options` (aria-label)
- `Save for later`, `Not interested`, `Dismiss`
- Evergreen cards: `Grow your network in DNA` / `Discover diaspora professionals aligned with your sector and heritage.` / `Find people` / reasoning `A strong network multiplies every other action you take on DNA.`; `Upcoming gatherings in DNA` / `Browse events where the diaspora is showing up this month.` / `See events` / `Showing up is how connections become collaborations.`; `Browse opportunities` / `See where your time, capital, or expertise can move the needle today.` / `See opportunities` / `Contribution is the engine of diaspora impact.`

#### MorningBriefBanner

Mount chain: App.tsx:388 `<BaseLayout>` -> `layouts/BaseLayout.tsx:166-171` when `user && location.pathname.startsWith('/dna/feed')` -> lazy `MorningBriefBanner`. Applies on both widths.

Data: `useDiaMessagingPrefs` (table `dia_messaging_prefs`); `useInboxBrief` (Edge Function `dia-inbox-brief`). Eligible when signed in, `summariesEnabled`, and on `/dna/feed`. Shows once per calendar day (localStorage `dia:morning-brief:${user.id}` holds the date). Banner shows only when the brief has `totalUnread > 0`. `?digest=open` opens the digest sheet and strips the param.

States: hidden; banner visible; digest sheet open.

Member-facing strings:
- `Morning brief` / `Afternoon brief` / `Evening brief` (by local hour: before 12, before 17, else)
- `{brief.data.totalUnread} unread - {brief.data.unreadThreadCount} threads`
- `{brief.data.headline}`, `{brief.data.narrative}` (server text)
- `Tap to open digest`
- `Dismiss morning brief` (aria-label)

#### InboxDigestSheet

Mount chain: `MorningBriefBanner.tsx:186` (always rendered there, controlled by `open`).

Data: `useInboxDigest`, `useInboxBrief` (`dia-inbox-brief`, only when open and unread > 0), `useBriefActions` (mark read, mark all read, snooze; not traced in this section).

States: loading; error; no conversations; populated; DIA brief sub-states loading, populated, error.

Member-facing strings:
- `Inbox digest`
- Description: `Reading your inbox...` / `You are all caught up across every thread.` / `${data.totalUnread} unread message${data.totalUnread === 1 ? '' : 's'} across ${data.unreadThreadCount} thread${data.unreadThreadCount === 1 ? '' : 's'}.`
- `Building your digest...`
- `Could not load your inbox right now.`
- `No conversations yet.`
- `Open Messages` (two places)
- `DIA brief`
- `Reading across your threads...`
- `DIA could not assemble a brief right now.`
- `Direct`, `{data.directUnread} unread`, `Groups`, `{data.groupUnread} unread`
- Thread row: `{t.title}`, `{t.lastMessageRelative}`, `{hl?.oneLiner || t.lastMessagePreview}`, `{hl.suggestion}`, unread badge `99+` cap
- `Mark read`, `Snooze`, `For 1 hour`, `Until later today`, `Until tomorrow`, `For a week`, `Open`
- `Mark all read`, `Close`

#### DailyPulseContent

Mount chain: `/dna/convey` -> `ConveyStoryHub.tsx:235` `{activeTab === 'daily' && <DailyPulseContent active />}`. The lens is defined at `ConveyStoryHub.tsx:46` (`Daily`, description `Your day across Connect, Convene, Collaborate and Contribute`).

Data: `useDailyPulseBrief` (Edge Function `dia-daily-pulse`).

States: loading; error; empty; populated with optional DIA brief and up to three sections.

Member-facing strings:
- `Your Daily Pulse`
- Summary: `A quiet day across your modules.` / `${pulse.events.length} events, ${pulse.tasks.length} tasks, ${pulse.needs.length} open needs` / `Reading across Connect, Convene, Collaborate and Contribute...`
- `Building your pulse...`
- `Could not load your daily pulse right now.`
- `Nothing urgent today. Good time to start something new.`
- `DIA brief`, `{brief.headline}`, `{brief.narrative}`
- `Coming up`, event time format `EEE p`
- `Needs your attention`, task meta `{t.spaceTitle}` plus ` - overdue` / ` - stalled` / ` - due ${format(new Date(t.dueDate), 'MMM d')}`
- `Open in your spaces`, `{n.spaceTitle} - {n.type}`
- `{hl.suggestion}` (server text per row)

#### UniversalComposer DIA line and ComposerFields DiaMark

Mount chain: `App.tsx:376` `<DrawerProvider resolvers={drawerResolvers}>` (resolvers from `components/drawer/resolvers.tsx:33`, `<ComposerSurface />`) -> `components/drawer/surfaces/ComposerSurface.tsx:21` -> `UniversalComposer`. Opened by `composer.open(...)` from surfaces (for example `ConveneDiscovery.tsx:607`).

Data: `useDIACompose` invokes Edge Function `dia-compose-read` (`hooks/useDIACompose.ts:127`) and returns a proposed verb and fields; fields DIA filled are flagged in `diaFilled` and shown with a DiaMark until the member edits them.

States: reading; proposal shown; member-picked verb; no line.

Member-facing strings:
- `DIA is reading…`
- `Posting as {cfg.label} · {cfg.cName}` (from `modeConfig(mode)`)
- `DIA read this as {cfg.label} · {cfg.cName}`
- `cfg.label` / `cfg.cName` values from `src/config/composerModes.ts:33-65`: `Make a Connection` / `Connect`; `Host an Event` / `Convene`; `Start a Collaboration` / `Collaborate`; `Offer or Ask` / `Contribute`; `Tell a Story` / `Convey`
- `not this?`
- DiaMark chip text: `DIA`

#### ComposerSuccessScreen

Mount chain: no caller found (no file renders `<ComposerSuccessScreen`).

Data (if mounted): suggestion from `services/diaPostCreationService`, headline from `SUCCESS_HEADLINES[mode]`.

Member-facing strings: `{headline}`, `{suggestion.headline}`, `{suggestion.body}`, `{suggestion.actionLabel}`, `{suggestion.dismissLabel}`, `Done - Go to Feed`.

#### SmartReplyChips

Mount chains: live via `ChatThread.tsx:840-841` when `!replyingTo && diaPrefs.smartRepliesEnabled` (overlay chain from `/dna/:username`). `GroupThreadView.tsx:527-528` has no live route.

Data: suggestions from `useDiaSmartReplies` (Edge Function `dia-smart-replies`) in the parent. Tap inserts text into the composer; nothing is sent.

States: `null` when not loading and no suggestions; loading; populated (with DiaFeedbackBar when `conversationId` set).

Member-facing strings:
- `DIA suggestions`
- `Drafting replies...`
- `{text}` chip and title (server text)

#### SmartComposeSuggestions

Mount chain: `ChatThread.tsx:685-686` in the empty-thread state when `diaPrefs.smartRepliesEnabled !== false`, `enabled={true}`, `otherUserName` is the first name.

Data: `useDiaSmartCompose` (Edge Function `dia-smart-compose`); suppressed when the other user is in the blocked set.

States: `null` (disabled or blocked); loading; error; empty; populated.

Member-facing strings:
- Parent text above it: `Start the conversation` (`ChatThread.tsx:684`)
- `DIA suggestions to start with ${otherUserName}` / `DIA opener suggestions`
- `Drafting openers...`
- `Couldn't draft openers right now. Type your own message below.`
- `No suggestions yet. Type a message below.`
- `{s}` suggestion buttons (server text)

#### MessageSummaryDrawer

Mount chain: `ChatThread.tsx:903`, opened from `ChatHeaderActions` More menu item `Catch me up` (`ChatHeaderActions.tsx:103-107`), passed only when `diaPrefs.summariesEnabled` (`ChatThread.tsx:611-614`). GroupThreadView chain has no live route.

Data: `useThreadSummary` (Edge Function `dia-thread-summary`); Refresh triggers `summary.refresh` and logs `summary_refreshed`.

States: loading; error; populated; nothing new to flag.

Member-facing strings:
- Menu item: `Catch me up`
- `Catch me up` (title)
- `DIA reads the last 24 hours of this thread and surfaces what matters.`
- `Reading the conversation...`
- `DIA could not summarise this thread.`
- `Could not load summary` (fallback error text)
- `{summary.data.headline}`
- `Generated {format(new Date(summary.data.generatedAt), 'h:mm a')}`
- `Key points`, `Open questions`, `Actions`
- `Nothing new worth flagging.`
- `Refresh`, `Close`

#### ActionItemChip

Mount chain: MessageSummaryDrawer.tsx:139.

Behaviour: primary navigates to `/dna/convene/create?...` (event), `/dna/collaborate/tasks/new?...` (task), or `/dna/convey/compose?...` (other) with `title`, `sourceConversationId`, `sourceContext`. X hides it for the drawer session.

Member-facing strings:
- `{item.title}`, `{item.context}`
- `Dismiss action` (aria-label)
- `Schedule in Convene` / `Save to Convey` / `Add to Collaborate`

#### DiaFeedbackBar

Mount chain: SmartReplyChips.tsx:61 (`surface="smart_reply"`); MessageSummaryDrawer.tsx:162 (`surface="summary"`).

States: unvoted; voted (one-shot).

Member-facing strings:
- `Was this helpful?` (default label)
- `Helpful`, `Not helpful` (aria-labels)
- `Thanks - DIA will use this to get sharper.`

#### DiaMessagingSettingsDrawer

Mount chain: `ChatThread.tsx:910`, opened from More menu item `DIA settings` (`ChatThread.tsx:615`, `ChatHeaderActions.tsx:108-112`).

Data: `useDiaMessagingPrefs` read and update (`dia_messaging_prefs`).

Member-facing strings:
- Menu item: `DIA settings`
- `DIA in messaging`
- `Choose how DIA shows up in your conversations.`
- `Smart replies`
- `DIA suggests short replies above the composer when someone messages you.`
- `Toggle smart replies` (aria-label)
- `Catch me up`
- `DIA can summarise the last 24 hours of a thread on demand.`
- `Toggle catch-me-up summaries` (aria-label)
- `DIA never sends on your behalf. Suggestions only fill the composer for you to review.`
- `Done`

#### GroupMentionsDrawer

Mount chain: `GroupThreadView.tsx:591`; GroupThreadView is rendered only by `pages/dna/GroupThread.tsx`, whose route `/dna/messages/group/:groupId` redirects while `MESSAGING_ENABLED` is false. No live chain. It lives in `components/messaging/dia/` but renders no DIA output (client-side `@name` matching).

Member-facing strings:
- Trigger aria-label in parent: `${mentionCount} mentions of you` / `Mentions of you`; GroupThreadView also has `DIA actions` (aria-label), `Catch me up`, `DIA settings`
- `Mentions of you`
- `${mentionedMessages.length} message${mentionedMessages.length === 1 ? '' : 's'} mention you in this group.` / `Nobody has mentioned you here yet.`
- `When teammates use @{myName ?? 'your name'}, the messages will land here.`
- `{m.sender_full_name || 'Member'}`, date `MMM d, h:mm a`, `{m.content || '(no text)'}`

#### MessageSettingsDialog

Mount chain: `components/messaging/ConversationListPanel.tsx` only, which is rendered only by `pages/dna/Messages.tsx` (routes redirect). No live chain.

Member-facing strings:
- `Message settings`
- `Control how DIA assists you in your conversations.`
- `Smart Replies`
- `Suggested one-tap replies appear above the composer.`
- `Conversation summaries`
- `Catch up on long threads with a short DIA-generated summary.`

#### DiaConversationStarter

Mount chain: `ConversationListPanel.tsx:658-665` (`!hasUnread && !conversation.is_group`); no live chain (see MessageSettingsDialog).

Data: client-side queries on `event_attendees` (with `events.title`) and `profiles` (`industry, headline`) for the other user; shown only if the last message is older than 7 days.

States: `null`; populated.

Member-facing strings:
- `They recently attended ${title}`
- `Ask about their work in ${profile.industry}`
- `💡 {suggestion}` (`DiaConversationStarter.tsx:95`)
- `Dismiss suggestion` (aria-label)

#### DiaDiscoveryCard

Mount chain: live through `ConveneDIADiscoveryCard.tsx:273`. Other callers (Convey, Collaborate, Contribute discovery cards) have no live chain.

States: single state; `announce` adds `role="status"`.

Member-facing strings:
- Eyebrows: `DIA · CONVENE`, `DIA · CONVEY`, `DIA · CONTRIBUTE`, `DIA · COLLABORATE`, `DIA · CONNECT`
- `Dismiss` (aria-label)
- `{headline}`, `{body}`, `{cta.label}`

#### ConveneDIADiscoveryCard

Mount chain: `/dna/convene` -> `ConveneDiscovery.tsx:604`, in the list view (`viewMode` not `map` or `search`) when `showDiscoveryLanes` is true (`activePill === 'all' && !hasActiveFacets`, `ConveneDiscovery.tsx:287`).

Data: `profiles` (`current_city, sectors, created_at`); accepted `connections` (limit 100), confirmed `event_registrations`, published `events` starting within 7 days. First matching rule wins. Dismiss uses `dismissDIACard` (localStorage `dia_dismissed_cards`, 7 days) with key `convene-discovery-${cardTypeId}-${user.id}`.

States: `null`; `city-nudge`; `low-content`; `network-activity`; `sector-match`; `welcome`.

Member-facing strings:
- `Discover events near you` / `Set your city in your profile to see events in your area.` / `Update Profile`
- `Events in ${displayCity} are just getting started` / `Be the first to bring the diaspora together in ${displayCity}!` / `Host an Event`
- `${networkActivityCount} ${networkActivityCount === 1 ? 'connection is' : 'connections are'} going to events this week` / `See what your network is up to.` / `View Events`
- `Events in ${primarySector} trending in your network` / `Discover events that match your expertise.` / `Browse ${primarySector}`
- `Welcome to CONVENE` / `Discover, attend, and host events that connect the diaspora.` / `Explore Events`

#### ConveyDIADiscoveryCard

Mount chain: no caller found.

Member-facing strings:
- `Share your first story` / `Your voice matters — tell your diaspora story, share insights, or amplify what matters to you.` / `Write a Story`
- `Your latest story got ${recentEngagement} ${recentEngagement === 1 ? 'reaction' : 'reactions'}` / `Keep the momentum going — your audience is listening.` / `Write Another`
- `Stories about ${userSectors[0]} trending in your network` / `See what the community is saying about topics you care about.` / `Read Stories`
- `${publishedCount} stories published across the network` / `The diaspora voice is growing — read, react, and contribute.` / `Browse Stories`
- `Welcome to CONVEY` / `Amplify the diaspora voice — share stories, insights, and updates with your community.` / `Get Started`

#### CollaborateDIADiscoveryCard

Mount chain: no caller found. File header: "STUBBED: Phase 2 teardown".

Member-facing strings: `DIA is preparing your COLLABORATE intelligence`, `Spaces are being reimagined. Your DIA insights will return with the new module.`, `Got it`.

#### ContributeDIADiscoveryCard

Mount chain: no caller found. File header: "STUBBED: Phase 2 teardown".

Member-facing strings: `DIA is preparing your CONTRIBUTE intelligence`, `Opportunities are being reimagined. Your DIA insights will return with the new module.`, `Got it`.

#### DiaOrganizerInsight

Mount chain: no caller found. Message and CTA come from `utils/convene/generateOrganizerInsight` (not enumerated here).

Member-facing strings: `DIA`, `{insight.message}`, `{insight.ctaLabel}`, `Dismiss insight` (aria-label).

#### PastEventDiaNudge

Mount chain: `/dna/convene/mine` (App.tsx:654-659) -> `pages/dna/convene/MyEvents.tsx:662` (past attending rows, collapsible from `:620`) and `MyEvents.tsx:474` `<MyEventCard isPast />` -> `components/convene/MyEventCard.tsx:228-230` (`isPast && !isCancelled`). Both callers pass `variant="share_story"`.

Behaviour: share_story navigates to `/dna/convey/compose?mode=story&context=${eventTitle}`; connect_attendees navigates to `/dna/convene/events/${eventId}?tab=attendees`.

States: dismissed (`null`); share_story; connect_attendees (no caller).

Member-facing strings:
- `You attended "${eventTitle}" — share your experience with the diaspora`
- `Write a story about what you learned or experienced`
- `Write a Story`
- connect_attendees (no caller): `You attended "${eventTitle}"${attendeeCount ? ` with ${attendeeCount} others` : ''} — expand your network`, `Connect with fellow attendees to keep the conversation going`, `View Attendees`
- `Dismiss` (aria-label)

#### DiaUniqueInsight

Mount chain: `/dna/:username` (App.tsx:523) -> `pages/ProfileV2.tsx:539-542` `<DiaUniqueInsight userId={profile.id} isOwner={permissions.is_owner} />`. `isPro` is not passed and defaults to `false`.

Data: `services/dia-uniqueness-service.ts`: reads `profiles.dia_insight` if updated within 7 days, otherwise composes up to three client-side template sentences and writes them to `profiles.dia_insight` and `dia_insight_updated_at`. No Edge Function.

States: non-owner (`null`); loading (skeleton); empty (`null`); Pro teaser (blurred text plus lock, the live branch); full with Regenerate (no live chain).

Member-facing strings:
- `DIA Insight` (teaser label)
- `Unlock with Pro`
- `DIA says` (full branch)
- `Regenerate` (full branch)
- Insight templates (`dia-uniqueness-service.ts:38-87`): `Your ${heritage.slice(0, 3).join(' and ')} heritage bridges communities that rarely connect on other platforms.`; `Your network spans ${networkStats} countries — you're a true global connector.`; `Your ${topSkill} expertise positions you uniquely in the diaspora network.`; `You lead in ${formatCName(impactScores.strongestC)} and have room to grow in ${formatCName(impactScores.growthOpportunityC)} — the combination could amplify your impact.`; `Active across ${activeCs} of the Five C's — that puts you in the top tier of DNA members.`; `You've started strong in ${formatCName(impactScores.strongestC)}. Exploring other C's could unlock surprising connections.`; `Living in ${profile.current_country} with roots in ${originName} gives you a unique bridge between both worlds.`

#### DIAInsightCard (identity-hub)

Mount chain: no caller found (`components/identity-hub/DIAInsightCard.tsx`; every `DIAInsightCard` import in the tree resolves to `components/dia/DIAInsightCard`).

Member-facing strings:
- `What makes you unique on DNA?`
- `Upgrade to Pro to unlock DIA-powered insights about your profile, network position, and diaspora impact.`
- `Upgrade to Pro`
- `DIA is learning about you`
- `As you build your profile and engage across the Five C's, DIA will generate personalized insights about what makes you unique.`
- `DIA Insight`
- `Hide from profile` / `Show on profile` (title)
- `Refresh insight` (title)
- `Visible on your profile` / `Only you can see this`

#### DiaInsightCard (connect hub)

Mount chain: imported at `components/connect/hub/DiscoveryFeed.tsx:15`; DiscoveryFeed has no JSX use of it. DiscoveryFeed itself is live (`Connect.tsx:248`). No render site found.

States: five type variants (`new_arrivals`, `people_you_should_know`, `network_insight`, `event_overlap`, `contribution_match`).

Member-facing strings:
- `DIA Insight` (badge)
- `Dismiss` (aria-label)
- `{insight.description}`, `{insight.primaryAction.label}`, `{insight.secondaryAction.label}`
- `Want to meet them?`
- `+{insight.count - 3}`
- `{insight.primaryAction?.label || 'Connect'}`
- `+{insight.percentage}%`
- `Network activity`
- `{insight.count} people you know`
- `NEED` / `OFFER`

#### HubDIAPanel

Mount chain: no caller found (re-exported at `components/hubs/shared/index.ts:26-27`; no importer).

Member-facing strings: `DIA Insights`, `{visibleRecommendations.length}`, `Loading insights...`, `{rec.title}`, `{rec.description}`, tooltip `{rec.reason}`, `Ask DIA about {hub}`.

#### DemoDIA

Mount chain: `/demo` (App.tsx:409) -> `pages/Demo.tsx:99`. Static marketing section; no DIA data.

Member-facing strings:
- `Meet DIA`
- `Diaspora Intelligence Agent` (twice)
- `DIA is DNA's intelligence layer, woven through every C, anticipating needs, surfacing opportunities, and keeping the diaspora coordinated.`
- `Not an assistant that waits for commands. An agent that operates with intention.`
- Features: `Smart Discovery` / `Find the right people, events, and opportunities`; `Proactive Nudges` / `Never let important tasks fall through`; `Network Intelligence` / `Understand your diaspora connections`; `Opportunity Matching` / `Surface relevant contributions and content`
- `DIA`
- Chat mock: `Based on your mentorship interests and the event you attended last week, I found 3 educators in Accra who are building similar programs. Would you like me to connect you?`; `Yes! Can you also check if any of them attended the Tech Summit?`; `Two of them did! Kwame Asante actually asked a question during the same panel you were inspired by. He is also looking for diaspora collaborators. A perfect match.`

#### NudgeCenter (page)

Mount chain: `/dna/nudges` (App.tsx:829-833) -> `OnboardingGuard` -> `pages/NudgeCenter.tsx`. No in-app link was traced in this section; reachability is by route.

Data: `useDiaNudges(activeTab === 'sent' ? 'sent' : 'all')` reads `dia_nudges` with a realtime channel; tabs filter by `status`.

States: loading; empty per tab; populated.

Member-facing strings:
- `Nudge Center`
- `Your personalized suggestions to help you stay connected and engaged`
- `Your Nudges`
- `{sentNudges.length} pending`
- `DIA analyzes your activity and suggests actions to help you get the most from DNA`
- Tabs: `Pending`, `Snoozed`, `Done`, `Archived` (text hidden below `sm`), count badges
- `Loading nudges...`
- `No pending nudges. You're all caught up!`, `No snoozed nudges`, `No completed actions yet`, `No archived nudges`
- Priority badge `{nudge.priority}`
- `About DIA Nudges`
- `DIA (Diaspora Intelligence Agent) is your AI companion that learns from your activity patterns to provide timely, personalized suggestions. Nudges are designed to help you maintain connections, discover opportunities, and stay engaged with the DNA community.`

#### DiaPreferences (page)

Mount chain: `/dna/preferences` (App.tsx:834-837) -> `OnboardingGuard` -> `pages/DiaPreferences.tsx`.

Data: `useDiaPreferences` / `useUpdateDiaPreferences` on table `dia_preferences`. Local form state is initialised from defaults at first render; the re-seed on load is written as `useState(() => {...})` (`DiaPreferences.tsx:26-38`), which runs only on the first render.

States: loading; form.

Member-facing strings:
- `DIA Preferences`
- `Customize how DIA keeps you engaged with the DNA community`
- `Notification Frequency`
- `How often should DIA send you engagement nudges?`
- `Never - No nudges`, `Low - Only critical nudges`, `Normal - Balanced nudges`, `High - All engagement nudges`
- `Nudge Categories`
- `Choose which types of nudges you want to receive`
- `Connection Nudges` / `Pending requests, weak connections, networking opportunities`
- `Content Nudges` / `Post suggestions, popular topics, community highlights`
- `Engagement Nudges` / `Profile completion, activity reminders, milestone celebrations`
- `Delivery Channels`
- `Choose how you want to receive notifications`
- `Email Notifications` / `Receive nudges via email`
- `In-App Notifications` / `See nudges in your DNA dashboard`
- `Quiet Hours`
- `Pause notifications during specific hours`
- `Enable Quiet Hours`, `Start Time`, `End Time`
- `Cancel`, `Save Preferences`
- Toasts: `Preferences Updated` / `Your notification preferences have been saved.`; `Error` / `Failed to update preferences. Please try again.`

#### DiaAdminPage (page, admin-facing)

Mount chain: `/admin` (App.tsx:877-883, `AdminRouteGuard` -> `AdminDashboardLayout`) -> child `dia` (App.tsx:891). Also checks `user_roles` for `admin` itself.

Data: tables `dia_daily_stats` (7 rows), `dia_popular_queries` (10), `dia_cost_tracking` (7).

States: checking admin; access denied; per-card loading; per-card no data; populated.

Strings:
- `Access Denied`, `You don't have permission to view this page.`
- `DIA Admin Dashboard`, `Monitor usage, costs, and performance`
- `This Week`, `total queries`, `Active Users`, `this week`, `Cache Hit Rate`, `{avgCacheHitRate.toFixed(1)}%`, `avg this week`, `Est. Cost`, `${weeklyCost.toFixed(2)}`
- `Daily Statistics`, headers `Date`, `Queries`, `Users`, `Cache %`, `Avg Time`; cells `{stat.cache_hit_rate?.toFixed(0)}%`, `{stat.avg_response_time_ms}ms`
- `No data available`
- `Popular Queries`, `{query.unique_users} users`, `{query.query_count}x`, `No queries yet`
- `Cost Breakdown`, headers `Date`, `Queries`, `Tokens`, `Total Cost`, `Avg/Query`; cells `${cost.total_cost?.toFixed(4)}`, `${cost.avg_cost_per_query?.toFixed(4)}`
- `No cost data available`

#### DIA consumers recorded but not rendering DIA output

- `pages/dna/Feed.tsx:26` imports `incrementSessionCount` from `services/dia-feed-cadence` (no DIA UI).
- `components/convene/EventOverview.tsx:68` imports `diaEventBus` from `services/dia/diaEventBus` (event emission; its DIA UI is DIADetailInsight above).
- `components/notifications/UnifiedNotificationCard.tsx:28` imports only the type `DIACardCategory`.

### A5. Event bus and nudges

Files: `diaEventTypes.ts` (204), `diaEventBus.ts` (120), `diaNudgeEngine.ts` (638), `diaNudgeStorage.ts` (195), `diaPeriodicCheck.ts` (190), all under `src/services/dia/`.

Bus mechanics (`diaEventBus.ts`): `emit` (`:53`) first returns early for the eight types in `STUBBED_EVENT_TYPES` (`:32-41`, check at `:54-57`, logs `[DIA emitter stubbed during teardown]`). Otherwise it calls `processEvent(event)` (`:60`), stores each returned nudge (`:62`), then calls `on()` listeners (`:69-78`). No code in `src/` calls `diaEventBus.on`, so the listener path never runs. `processEvent` (`diaNudgeEngine.ts:603`) returns `[]` when the type has no entry in `EVENT_HANDLERS` (`:606-607`), when throttled (`:614`), or on any thrown error (`:621-623`).

| Event type (verbatim) | Producer(s) | Handler | Behaviour | No-op? |
|---|---|---|---|---|
| `new_connection` | no producer found | `diaNudgeEngine.ts:196` | Fetches connected member name; notification-channel nudge, low, 3 days | Never fires (no producer) |
| `connection_request_received` | `services/connectionService.ts:105` (after insert in `sendConnectionRequest`; caller `connect/hub/DiscoveryFeed.tsx:350`, rendered at `Connect.tsx:248`) | none in `EVENT_HANDLERS` | `processEvent` returns `[]` at `:607`; no listeners | Yes |
| `connection_accepted` | `services/connectionService.ts:155` (in `acceptConnectionRequest`; callers `connect/ConnectionRequestCard.tsx:55`, `connect/hub/ConversationsPanel.tsx:269`, `pages/ProfileV2.tsx:419`) | none in `EVENT_HANDLERS` | `processEvent` returns `[]` at `:607`; no listeners | Yes |
| `new_member_in_sector` | no producer found | `diaNudgeEngine.ts:215` | Feed-channel nudge, low, 7 days | Never fires |
| `event_rsvp` | `components/convene/EventOverview.tsx:339` (RSVP mutation, status `going` or `maybe`) | `diaNudgeEngine.ts:235` | Recipient is the host; fetches attendee name and event title; notification channel, medium, 1 day; written to the attendee's own browser localStorage | Runs; output never read |
| `event_starting_soon` | `services/dia/diaPeriodicCheck.ts:143` | `diaNudgeEngine.ts:257` | Recipient host; channel `both`, urgent, 1 day; suppressed in quiet hours | Runs; output never read |
| `event_ended` | no producer found | `diaNudgeEngine.ts:276` | channel `both`, high, 7 days | Never fires |
| `event_milestone` | no producer found | `diaNudgeEngine.ts:296` | notification, medium, 3 days | Never fires |
| `space_inactive` | `diaPeriodicCheck.ts:113` (loop over stub result `[]`) | `diaNudgeEngine.ts:316` | Bus stub returns before engine | Yes (stubbed at bus and at source) |
| `task_overdue` | `diaPeriodicCheck.ts:123` (loop over stub result `[]`) | `diaNudgeEngine.ts:335` | Bus stub returns before engine | Yes |
| `task_completed` | no producer found | `diaNudgeEngine.ts:354` | Bus stub | Yes |
| `space_member_joined` | no producer found | `diaNudgeEngine.ts:373` | Bus stub | Yes |
| `space_milestone` | no producer found | `diaNudgeEngine.ts:395` | Bus stub | Yes |
| `opportunity_response` | no producer found | `diaNudgeEngine.ts:415` | Bus stub | Yes |
| `opportunity_match_found` | no producer found | `diaNudgeEngine.ts:437` | Bus stub | Yes |
| `opportunity_expiring` | `diaPeriodicCheck.ts:133` (loop over stub result `[]`) | `diaNudgeEngine.ts:455` | Bus stub | Yes |
| `content_milestone` | `hooks/usePostLikes.ts:141` (`onSuccess`, when the computed count equals 10, 50 or 100 and `notificationContext.postAuthorId` is set; passed by `posts/PostCard.tsx:93-97` and `pages/dna/FeedStoryDetail.tsx:69`) | `diaNudgeEngine.ts:476` | Recipient post author; notification, low, 3 days. Count 100 maps to milestone `100_views` although it counts likes (`usePostLikes.ts:131-136`) | Runs; output never read |
| `content_shared` | `hooks/useReshare.ts:118` (`onSuccess`, when `originalAuthorId !== userId`) | `diaNudgeEngine.ts:494` | Recipient author; notification, low, 3 days | Runs; output never read |
| `weekly_digest_due` | no producer found | `diaNudgeEngine.ts:533` | feed, low, 7 days | Never fires |
| `profile_completion_stall` | no producer found | `diaNudgeEngine.ts:515` | feed, low, 14 days | Never fires |

"Output never read" means: the nudge is written to localStorage `dia_nudges`, and no rendered code reads that key (A3, diaNudgeStorage row). For `event_rsvp`, `content_milestone` and `content_shared` the recipient is another member, while the write happens in the acting member's browser.

#### Nudge templates (every handler in `EVENT_HANDLERS`, `diaNudgeEngine.ts:192-550`)

Strings are verbatim source, including template expressions. Each card's `id` is `dia-nudge-{event.type}-{ms}` and `dismissKey` is `nudge-{event.type}-{ms}` (`:65,75`). Priority maps to card priority urgent 100, high 80, medium 60, low 40 (`:72`). Fallbacks for lookups: name `'Someone'`, event `'your event'`, space `'your space'`, opportunity `'your opportunity'` (`:152,163,174,185`).

| id (cardType) | Trigger | Conditions | Headline | Body | CTAs (label: target) | Channel / priority / expires |
|---|---|---|---|---|---|---|
| `new_connection_nudge` | `new_connection` | type guard only | `New connection made!` | `` `You connected with ${name}. Explore what you can build together.` `` | `View Profile` (primary): `/dna/profile/${event.connectedUserId}`; `Message`: `/dna/messages?thread=${event.connectedUserId}` | notification / low / 3d |
| `new_member_sector_nudge` | `new_member_in_sector` | type guard only | `New arrival in your sector` | `` `${name} just joined DNA. They work in ${event.sector} — see if you align.` `` (source contains an em-dash) | `View Profile`: `/dna/profile/${event.newMemberId}` | feed / low / 7d |
| `event_rsvp_nudge` | `event_rsvp` | going or maybe at producer | `New RSVP!` | `` `${name} just registered for ${title}.` `` | `View Attendees`: `/dna/convene/events/${event.eventId}` | notification / medium / 1d |
| `event_starting_soon_nudge` | `event_starting_soon` | event within 60 min at producer | `Event starting soon!` | `` `${title} starts in ${event.startsIn} minutes. Make sure everything is ready.` `` | `View Event`: `/dna/convene/events/${event.eventId}` | both / urgent / 1d |
| `event_ended_nudge` | `event_ended` | type guard only | `Your event just wrapped up!` | `` `${event.attendeeCount} people attended ${title}. Follow up while the energy is fresh.` `` | `Thank Attendees`: `/dna/convene/events/${event.eventId}`; `Create Follow-Up Space`: `open_composer` mode `space` | both / high / 7d |
| `event_milestone_nudge` | `event_milestone` | type guard only | `` `Milestone: ${event.milestone.replace('_', ' ')} RSVPs!` `` | `Your event is gaining momentum. Share it with your network to keep growing.` | `Share Event`: `/dna/convene/events/${event.eventId}` | notification / medium / 3d |
| `space_inactive_nudge` | `space_inactive` | bus-stubbed | `Space needs attention` | `` `Your space has been quiet for ${event.daysSinceActivity} days. A quick check-in can reignite momentum.` `` | `Visit Space`: `/dna/collaborate/spaces/${event.spaceId}`; `Post Update`: `open_composer` mode `post`, `relatedSpaceId` | both / high / 7d |
| `task_overdue_nudge` | `task_overdue` | bus-stubbed | `Task overdue` | `` `Your task in ${spaceName} was due. Need help? Ask your team.` `` | `View Task`: `/dna/collaborate/spaces/${event.spaceId}` | notification / high / 3d |
| `task_completed_nudge` | `task_completed` | bus-stubbed | `Task completed!` | `` `Great work finishing your task in ${spaceName}. Keep the momentum going.` `` | `View Space`: `/dna/collaborate/spaces/${event.spaceId}` | notification / low / 1d |
| `space_member_joined_nudge` | `space_member_joined` | bus-stubbed | `New space member!` | `` `${name} just joined ${spaceName}. Welcome them and assign tasks.` `` | `View Space`: `/dna/collaborate/spaces/${event.spaceId}` | notification / medium / 3d |
| `space_milestone_nudge` | `space_milestone` | bus-stubbed | `` `${event.milestone.replace('_pct', '%')} complete!` `` | `Your space is making real progress. Share this milestone with your team.` | `Celebrate`: `/dna/collaborate/spaces/${event.spaceId}` | both / medium / 7d |
| `opportunity_response_nudge` | `opportunity_response` | bus-stubbed | `New response!` | `` `${name} expressed interest in ${title}. Review their profile.` `` | `View Response`: `/dna/contribute/opportunities/${event.opportunityId}` | notification / high / 3d |
| `opportunity_match_nudge` | `opportunity_match_found` | bus-stubbed | `Opportunity match` | `` `DIA found an opportunity that's a ${event.matchScore}% match for your skills. Take a look.` `` | `View Opportunity`: `/dna/contribute/opportunities/${event.opportunityId}` | both / medium / 7d |
| `opportunity_expiring_nudge` | `opportunity_expiring` | bus-stubbed | `Opportunity expiring soon` | `` `${title} expires in ${event.daysLeft} days. Extend or close it.` `` | `View Opportunity`: `/dna/contribute/opportunities/${event.opportunityId}` | notification / medium / `event.daysLeft` days |
| `content_milestone_nudge` | `content_milestone` | count 10, 50 or 100 at producer | `Your content is resonating!` | `` `Your post just reached ${event.milestone.replace('_', ' ')}. Keep the momentum going.` `` | `View Post`: `/dna/feed` | notification / low / 3d |
| `content_shared_nudge` | `content_shared` | resharer is not author | `Your content was shared!` | `` `${name} shared your post with their network. Your ideas are spreading.` `` | `View Post`: `/dna/feed` | notification / low / 3d |
| `profile_completion_nudge` | `profile_completion_stall` | type guard only | `Complete your profile` | `` `Your profile is ${event.completionPct}% complete. A complete profile gets 3x more connections.` `` | `Edit Profile`: `/dna/profile/edit` | feed / low / 14d |
| `weekly_digest_nudge` | `weekly_digest_due` | type guard only | `Your weekly DNA digest` | `See what happened across your network this week.` | `View Feed`: `/dna/feed` | feed / low / 7d |

Throttle rules (`diaNudgeEngine.ts:30-37`, applied in `shouldThrottle` `:560-595`, all counted from the acting browser's localStorage):

- Quiet hours: local hour `>= 22` or `< 7` suppresses `notification` and `both` channels (`:554-568`).
- Max 8 nudges per day per recipient, excluding `dismissed` (`:571`; `diaNudgeStorage.ts:132-143`).
- Max 3 notification or both nudges per recipient in the last hour (`:576-580`).
- At most one nudge of the same event type per recipient per 24 hours (`:584-591`).
- `maxFeedCardsVisible: 3` is declared (`:33`) and not read anywhere.

#### Periodic checks (`diaPeriodicCheck.ts`)

Start: `initDIAPeriodicChecks(userId)` (`:161`), called from `BaseLayout.tsx:55` when signed in. First run after a 10-second timeout (`:163-167`), then every `CHECK_INTERVAL_MS = 30 * 60 * 1000` (30 minutes) (`:154,170-174`). Cleanup clears both on unmount or user change. `runPeriodicChecks` (`:102`) runs all four with `Promise.all`, each with `.catch(() => [])`.

| Check | Interval | What it queries | Empty / no-op? (code reason) |
|---|---|---|---|
| `checkStalledSpaces` (`:47`) | 10 s after mount, then 30 min | nothing | Returns `[]`: body is `// STUBBED: Phase 2 teardown. Restore in Phase 3 rebuild.` then `console.debug('[Periodic check stubbed]', 'stalled_spaces'); return [];` (`:48-50`). Its `space_inactive` emit (`:113`) would also be dropped by the bus stub list |
| `checkOverdueTasks` (`:55`) | same | nothing | Returns `[]` (`:56-58`, `'overdue_tasks'`). `task_overdue` is also bus-stubbed |
| `checkExpiringOpportunities` (`:63`) | same | nothing | Returns `[]` (`:64-66`, `'expiring_opportunities'`). `opportunity_expiring` is also bus-stubbed |
| `checkUpcomingEvents` (`:71`) | same | `events` select `id, organizer_id, start_time` where `organizer_id = userId`, `status != 'cancelled'`, `start_time` between now and now plus 60 minutes, limit 5 (`:75-82`) | Live. Emits `event_starting_soon` per row (`:143`) with `startsIn` in rounded minutes. The same-type 24-hour throttle and quiet hours then apply |

#### Storage and dismissal

| Store | Key or table (verbatim) | Written by | Read by | Server-side? |
|---|---|---|---|---|
| Engine nudges | localStorage `dia_nudges` (`diaNudgeStorage.ts:39`), max 50 entries (`:40`), expired entries pruned on each write (`:71-74`) | `storeNudge` from `diaNudgeEngine.ts:619` and `diaEventBus.ts:62` | Throttle counters only (`countNudgesToday`, `countRecentNudgesByType`, `countNotificationsLastHour`). `getPendingNudgesForUser` and `getNudgesForChannel` have no caller | No. Per browser, not per account; `clearNudgesForUser` has no caller, so entries persist across sign-outs on the same browser until expiry |
| Engine nudge status (`seen` / `acted` / `dismissed`) | same localStorage entry | `updateNudgeStatus` (`diaNudgeStorage.ts:112`), reachable only through `unifiedNotificationService.ts:359,366,373` when `notification.diaNudgeId` is truthy | n/a | No. `diaNudgeId` is set to `null` at both construction sites (`unifiedNotificationService.ts:166,233`), so this branch does not execute |
| Server nudges | Supabase table `dia_nudges` | Not written by client code. Status updated by `useDiaNudges` accept (`:101`), dismiss (`:123`), snooze (`:141`) | `useDiaNudges.ts:35` on `/dna/nudges`; `ConnectNudges.tsx:22` (dead) | Yes. Dismissal persists as `status = 'dismissed'`, `resolved_at` set. Snooze writes `status = 'snoozed'` only; the `until` argument is not stored |
| DIA insight card dismissals | localStorage `dia_dismissed_cards`, 7-day expiry (`diaCardService.ts:82-83`) | `dismissDIACard` (`diaCardService.ts:101`) | `getDIACards` filter, `isDismissed` | No |
| Daily brief card dismissals | RPC `record_brief_interaction` (`useDiaDailyBrief.ts:75`) | `DiaDailyBrief.tsx:129` | `get_dia_daily_brief` | Yes (server RPC); client cache also drops the card on `dismissed` / `not_interested` (`:82-87`) |
| Morning brief banner seen-today | localStorage `` `dia:morning-brief:${user.id}` `` (`MorningBriefBanner.tsx:63,95`) | `MorningBriefBanner` | `MorningBriefBanner` | No |
| Inbox digest snoozes | Supabase table `dia_brief_snoozes` | `useBriefActions.ts:67` upsert | `useInboxDigest.ts:56`; `useActiveSnoozes` (no caller) | Yes |

Summary of dismissal persistence for the event bus and nudge engine specifically: engine nudges live only in browser localStorage, and their dismissal path is unreachable. No engine nudge is written to or dismissed in any Supabase table. The server-side `dia_nudges` table and its persisted dismissal belong to a separate path (`useDiaNudges` on `/dna/nudges`) that the client engine does not feed.

### A6. Schema, from the repository's migrations

Source: `/home/user/dna/supabase/migrations/` at `b6cd764b0499614c8636d136ef648d6f6c9f2601`, 895 files (`ls | wc -l`). Every file was split into statements (dollar-quoting and comments respected) and replayed by name in filename order. No database was queried. "Net" below means the state a filename-order replay of the migration text describes; it is not a claim about any live project.

How the table set was chosen:

- every `CREATE TABLE` whose name matches `dia`, `adin`, `ada_`, `nudge`, `embedding`, `brief`, `insight`, `tier`, `match`, `usage`, `consent`, `audit`, `query_log`, `prompt`;
- every table or RPC reached by `.from('…')` / `.rpc('…')` in `supabase/functions/_shared/dia-core/` (7 files, 288 lines), `supabase/functions/dia-*` (13 functions), `generate-connect-nudges`, `generate-daily-briefs`, `generate-opportunity-nudges`, and the DIA files under `src/services/dia*`, `src/hooks/*Dia*`, `src/components/dia/`, `src/pages/Dia*`;
- every identifier in the migrations matching `dia_`, `_dia_`, `user_dia`, `adin_`.

What dia-core and the DIA edge functions reach (from `grep -oE "\.(from|rpc)\('…'"`):

| Caller | Tables (`.from`) | RPCs (`.rpc`) |
| --- | --- | --- |
| `_shared/dia-core/` | `dia_events` (audit.ts:23, insert), `dia_preferences` (consent.ts:32, select `in_app_enabled`) | `dia_check_limit` (limits.ts:20), `dia_record_usage` (limits.ts:34) |
| `dia-search` | `dia_queries` (3), `dia_query_log` (3) | none |
| `dia-daily-insights` | `dia_insights` (3) | none |
| `dia-feedback` | `dia_messaging_feedback` | none |
| `dia-trigger-prompt` | none | `trigger_dia_prompt` |
| `dia-inbox-brief` | `conversation_participants`, `conversations`, `messages`, `profiles` | `get_group_conversations_for_user`, `get_group_messages` |
| `dia-hub-intelligence` | `collaboration_spaces`, `events`, `feed_posts`, `opportunities`, `profiles` | none |
| `dia-smart-chips` | `event_registrations`, `posts`, `space_members` | none |
| `dia-smart-compose`, `dia-smart-replies`, `dia-thread-summary` | `profiles` / `messages` / `conversations` | none |
| `dia-compose-read`, `dia-daily-pulse` | none | none |
| `generate-connect-nudges` | `dia_nudges` (2) | `get_suggested_connections` |
| `generate-opportunity-nudges` | `dia_nudges` (2), `dia_preferences`, `contribution_badges`, `opportunities`, `opportunity_interests`, `profiles`, `space_members` | none |
| `generate-daily-briefs` | `dia_brief_cards` (2), `connections`, `events`, `opportunities`, `profiles`, `space_members`, `spaces`, `trend_follows` | `get_trending_hashtags` |
| `src/` DIA files | `dia_brief_cards`, `dia_insights`, `dia_messaging_events`, `dia_messaging_feedback`, `dia_messaging_prefs`, `dia_nudges`, `dia_preferences`, `dia_query_log`, `dia_saved_answers`, `dia_daily_stats`, `dia_cost_tracking`, `dia_popular_queries`, `network_edges` | `get_dia_daily_brief`, `record_brief_interaction`, `purge_expired_dia_history`; `rpc_dia_recommend_people` from `src/services/connectionService.ts:389` |

Vector search: no migration contains `vector(`, `ivfflat` or `hnsw`. The only embeddings tables (`user_vectors`, `entity_vectors`) store vectors as `JSONB` with `dimension` 32 and compare them through a SQL `cosine_similarity(jsonb, jsonb)` call in `get_similar_users` / `get_similar_entities`.

#### A6.1 Summary: every DIA table

"Net policies" counts the policies a filename-order replay leaves standing. "types.ts" says whether `src/integrations/supabase/types.ts` has a `Tables` entry of that name (a generated file, recorded only as a cross-reference).

**A. `dia_*` tables created by a migration**

| Table | Created in | Altered in | Dropped in | RLS | Net policies | types.ts |
| --- | --- | --- | --- | --- | --- | --- |
| `dia_composer_suggestions` | `20260212100000_post_composer_tables.sql` | none | not dropped | enabled | 1 | no |
| `dia_feed_insights` | `20260212200000_feed_architecture_tables.sql` | none | not dropped | enabled | 2 | no |
| `dia_match_results` | `20260212300000_dia_core_engine_tables.sql` | none | not dropped | enabled | 3 | no |
| `dia_nudges` | `20260212300000_dia_core_engine_tables.sql` | none | `20260707001538_b362730b-1d85-456e-a879-58efab8c6aea.sql` | enabled | 3 at drop | yes |
| `dia_conversations` | `20260212300000_dia_core_engine_tables.sql` | none | not dropped | enabled | 1 | no |
| `dia_messages` | `20260212300000_dia_core_engine_tables.sql` | none | not dropped | enabled | 1 | no |
| `dia_rematch_queue` | `20260212600000_profile_identity_hub.sql` | `20260808100000_fix_second_pass_idor_and_policy_scope.sql` (ALTER POLICY) | not dropped | enabled | 1 | no |
| `dia_brief_cards` | `20260508000000_dna_right_rail_data_layer.sql`, again (IF NOT EXISTS) in `20260508035459_488b8b8d-f7a4-4445-bffa-8a8baafc1626.sql` | none | not dropped | enabled | 4 | yes |
| `dia_brief_interactions` | same two files as `dia_brief_cards` | none | not dropped | enabled | 2 | yes |
| `dia_messaging_prefs` | `20260511170718_9effc3a8-667d-40ee-a942-ff0ccab59bfe.sql` | `20260511205156_89ee985e-8b08-4cd2-bb5a-a634f9c29d8d.sql` | not dropped | enabled | 3 | yes |
| `dia_messaging_feedback` | `20260511170718_9effc3a8-667d-40ee-a942-ff0ccab59bfe.sql` | none | not dropped | enabled | 2 | yes |
| `dia_messaging_events` | `20260511170718_9effc3a8-667d-40ee-a942-ff0ccab59bfe.sql` | none | not dropped | enabled | 2 | yes |
| `dia_brief_snoozes` | `20260511191645_83cf98f5-39dc-4464-bf36-965a37d98a3e.sql` | none | not dropped | enabled | 4 | yes |
| `dia_saved_answers` | `20260711122719_ba85a8ae-9154-4ecd-bd68-15fd5361e049.sql` | none | not dropped | enabled | 1 | yes |

**B. DIA-owned tables without the `dia_` prefix, created by a migration**

| Table | Created in | Altered in | Dropped in | RLS | Net policies | types.ts |
| --- | --- | --- | --- | --- | --- | --- |
| `user_nudge_state` | `20260212300000_dia_core_engine_tables.sql` | none | not dropped | enabled | 1 | no |
| `network_edges` | `20260212300000_dia_core_engine_tables.sql` | none (function `update_messaging_metadata` in `20260212500000_messaging_prd_system.sql` updates it) | not dropped | enabled | 2 | yes |
| `user_vectors` (embeddings) | `20251116024358_ff2a0e6e-5958-4f7b-afcc-f3db6d41379e.sql` | policies in `20251116072447_…`, `20251116072614_…`, `20260218053744_…`, `20260713001028_…`, `20260807130000_fix_service_role_policy_scope.sql` | not dropped | enabled | 4 (plus 3 ALTER POLICY targets no migration creates) | yes |
| `entity_vectors` (embeddings) | `20251116024358_ff2a0e6e-5958-4f7b-afcc-f3db6d41379e.sql` | policies in `20251116072447_…`, `20251116072614_…`, `20260218053744_…` | not dropped | enabled | 1 | yes |

**C. `adin_*` tables created by a migration and later addressed as `dia_*`**

No migration renames any of these. `grep -inE "rename" | grep -iE "adin|dia"` over all 895 files returns nothing. From `20260104050540_5aab599a-2bd8-4411-b7a2-972d9676815d.sql` onward, migrations write policies against the `dia_` names (and functions read the `dia_` names), and no migration creates a table under a `dia_` name for any of these five.

| Table (created name / later-addressed name) | Created in | Altered in | Dropped in | RLS | Net policies, if the two names are one table | types.ts |
| --- | --- | --- | --- | --- | --- | --- |
| `adin_insights` / `dia_insights` | `20241228_adin_insights.sql` | `20260104050540_…`, `20260218053744_e5fb06ef-…` (policies only) | not dropped | enabled (on `adin_insights`) | 1 | `dia_insights` yes, `adin_insights` no |
| `adin_preferences` / `dia_preferences` | `20251107035850_919c5377-bc97-4c7d-bf10-0386ce8f5418.sql` | policies `20251111021811_…`, `20251111022450_…`, `20251111022747_…`, `20260703071325_…`, `20260713001028_47923827-…` | not dropped | enabled | 3 | `dia_preferences` yes |
| `adin_queries` / `dia_queries` | `20251228100001_adin_perplexity_integration.sql` | policies `20260104050540_…`, `20260213043530_…`, `20260213043659_…`, `20260530042302_…` | not dropped | enabled | 6 | `dia_queries` yes |
| `adin_query_log` / `dia_query_log` | `20251228100001_adin_perplexity_integration.sql` | `20260104050540_…`, `20260530042302_…`, `20260711122013_1609cc96-…` (columns, index), `20260711124129_5a4ff9eb-…` (column, index, grants, policies) | not dropped | enabled | 6 | `dia_query_log` yes |
| `adin_user_usage` / `dia_user_usage` | `20251228100001_adin_perplexity_integration.sql` | policies `20260104050540_…`, `20260530042302_…` | not dropped | enabled | 4 | `dia_user_usage` yes |

**D. DIA tables referenced by migrations or code but created by no migration**

| Table | What the migrations do with it | Dropped in | types.ts |
| --- | --- | --- | --- |
| `dia_events` | nothing; zero files mention it. dia-core `audit.ts:23` inserts into it; `delete-account/index.ts:114` lists it | n/a | yes (columns: `capability, created_at, error_code, error_message, id, latency_ms, meta, model, principal_type, provider, success, surface, tokens, user_id`) |
| `dia_tier_limits` | nothing; zero files mention it. Named as the source of truth in `dia-core/limits.ts:1` and `dia-search/index.ts:300` | n/a | yes (columns: `capability, monthly_limit, tier, updated_at`) |
| `user_dia_profile` / `user_adin_profile` | `20260218053744_…` creates policy `user_adin_profile_select_own` ON `user_adin_profile`; `20260712214923_4f3820e0-…` creates trigger `trg_user_dia_profile_prevent_priv_escalation` ON `public.user_dia_profile`; `20260713001028_…` drops and recreates `user_adin_profile_select_own` ON `public.user_dia_profile`. No `CREATE TABLE`, no `ENABLE ROW LEVEL SECURITY` for either name | n/a | `user_dia_profile` yes |
| `adin_nudges` | `ENABLE ROW LEVEL SECURITY` (`20250812034816_…`, `20250812040627_…`, `20250812040711_…`); `ADD COLUMN IF NOT EXISTS payload jsonb` (`20250812040627_…`, `20250812040711_…`); indexes `idx_adin_nudges_user_id`, `idx_adin_nudges_connection_id` (`20251011062218_…`); policies (below) | n/a | no |
| `adin_recommendations` | `ENABLE ROW LEVEL SECURITY` (`20250812040627_…`, `20250812040711_…`); policies `ar_user_owned_insert/select/update` (`20250812183915-.sql`); indexes `idx_adin_recommendations_user_id`, `idx_adin_recommendations_connection_id` (`20251011062218_…`), `idx_adin_recommendations_user_type` (`20260101_pulse_bar_rpc.sql`) | n/a | no |
| `adin_signals` | `ALTER POLICY "Users can view and update their own signals"` (`20251011060515_…`); read by `find_adin_matches(uuid, integer)` | n/a | no |
| `adin_profiles` | `DROP TABLE IF EXISTS` in `20250807050628_6ad38b64-…` and `20250807050655_b0fed187-…`; still read by `trigger_adin_prompt` and `find_adin_matches(uuid)`. The header of `20250731194617_fe85903d-…` records that the table does not exist on the project and that statements touching it were removed | `20250807050628_…` (IF EXISTS) | no |
| `adin_connection_matches`, `adin_connection_signals` | guarded `DELETE` in `20250811165142_…`; `DROP TABLE IF EXISTS … CASCADE` | `20251001163626_1116f035-5823-4fe1-8515-0f477ef26c92.sql` (IF EXISTS) | no |
| `adin_contributor_requests` | guarded `DELETE` in `20250811165142_…`; `DROP INDEX IF EXISTS idx_adin_contributor_requests_reviewed_by` in `20251011062315_…` | n/a | no |

**E. Examined and not counted as DIA**

| Table(s) | Created in | Dropped in | Why left out |
| --- | --- | --- | --- |
| `ada_policies`, `ada_cohorts`, `ada_cohort_memberships`, `ada_experiments`, `ada_experiment_variants`, `ada_experiment_assignments` | `20251116030338_43eca4d2-2d47-45e1-bff6-b735b111a05e.sql` (RLS enabled on all six; 4 net policies each at drop time) | `20260708042802_ccf53c56-efee-4d5c-ac9c-608adc71ed89.sql` (`ada_cohorts` and `ada_policies` copied to `archive.*_20260706` first; `get_user_cohorts(uuid)` dropped in the same file) | `src/types/ada.ts:2` names ADA "Adaptive Dashboard Architecture" (layout and module policy, experiments), not a DIA predecessor |
| `nudges` | `20260109045544_217f5014-…` | not dropped | Space and task nudges (`space_id`, `task_id`, `tone`) |
| `collaborate_nudges` | `20260108_collaborate_core_tables.sql` | `20260429100000_collaborate_rebuild_r1b1_cleanup_remediation.sql` | Collaborate task nudges |

#### A6.2 The named tables

| Table | Explicitly created by a migration? | Later dropped or renamed? |
| --- | --- | --- |
| `dia_match_results` | yes, `20260212300000_dia_core_engine_tables.sql` | no |
| `dia_conversations` | yes, `20260212300000_dia_core_engine_tables.sql` | no |
| `dia_messages` | yes, `20260212300000_dia_core_engine_tables.sql` | no |
| `dia_rematch_queue` | yes, `20260212600000_profile_identity_hub.sql` | no (its one policy is re-scoped to `service_role` by `20260808100000_…`) |
| `dia_feed_insights` | yes, `20260212200000_feed_architecture_tables.sql` | no |
| `dia_composer_suggestions` | yes, `20260212100000_post_composer_tables.sql` | no |
| `dia_queries` | no; created as `adin_queries` (`20251228100001_…`), policies written to `dia_queries` from `20260104050540_…` | no rename in migrations; not dropped |
| `dia_insights` | no; created as `adin_insights` (`20241228_adin_insights.sql`), policies written to `dia_insights` from `20260104050540_…` | no rename in migrations; not dropped |
| `dia_events` | no; not mentioned in any migration | n/a |
| `dia_brief_cards` | yes, `20260508000000_…` and `20260508035459_…` | no |
| `dia_tier_limits` | no; not mentioned in any migration | n/a |

None of the six tables in the first block (`dia_match_results`, `dia_conversations`, `dia_messages`, `dia_rematch_queue`, `dia_feed_insights`, `dia_composer_suggestions`) has a `Tables` entry in `src/integrations/supabase/types.ts`.

#### A6.3 Per-table detail

##### `dia_composer_suggestions`

Created `20260212100000_post_composer_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `suggestion_type` | `TEXT NOT NULL` |
| `suggestion_message` | `TEXT NOT NULL` |
| `confidence` | `FLOAT NOT NULL` |
| `accepted` | `BOOLEAN DEFAULT NULL` |
| `composer_mode` | `TEXT NOT NULL` |
| `session_id` | `TEXT NOT NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
ALTER TABLE dia_composer_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own DIA suggestions"
  ON dia_composer_suggestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No indexes beyond the primary key.
```

##### `dia_feed_insights`

Created `20260212200000_feed_architecture_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `insight_type` | `TEXT NOT NULL` |
| `headline` | `TEXT NOT NULL` |
| `body` | `TEXT NOT NULL` |
| `data_points` | `JSONB DEFAULT '[]'` |
| `action_cta` | `JSONB NOT NULL` |
| `secondary_cta` | `JSONB` |
| `related_content_ids` | `UUID[] DEFAULT '{}'` |
| `expires_at` | `TIMESTAMPTZ` |
| `shown`, `dismissed`, `acted_on` | `BOOLEAN DEFAULT FALSE` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
CREATE INDEX idx_dia_insights_user ON dia_feed_insights(user_id);
CREATE INDEX idx_dia_insights_shown ON dia_feed_insights(user_id, shown, dismissed);
CREATE INDEX idx_dia_insights_expires ON dia_feed_insights(expires_at);
ALTER TABLE dia_feed_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own DIA insights"
  ON dia_feed_insights FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own DIA insights"
  ON dia_feed_insights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- No INSERT or DELETE policy.
```

##### `dia_match_results`

Created `20260212300000_dia_core_engine_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `match_category` | `TEXT NOT NULL CHECK (match_category IN ('people', 'opportunity', 'space', 'event'))` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `matched_entity_id` | `UUID NOT NULL` |
| `match_score` | `FLOAT NOT NULL` |
| `match_type` | `TEXT NOT NULL` |
| `match_reasons` | `JSONB NOT NULL DEFAULT '[]'` |
| `signals` | `JSONB NOT NULL DEFAULT '{}'` |
| `surfaced_via` | `TEXT[] DEFAULT '{}'` |
| `priority` | `TEXT NOT NULL DEFAULT 'medium'` |
| `status` | `TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acted_on', 'dismissed', 'expired', 'connected'))` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `expires_at`, `acted_on_at`, `dismissed_at` | `TIMESTAMPTZ` |

```sql
CREATE INDEX idx_match_results_user ON dia_match_results(user_id);
CREATE INDEX idx_match_results_category ON dia_match_results(match_category, user_id);
CREATE INDEX idx_match_results_status ON dia_match_results(status, user_id);
CREATE INDEX idx_match_results_score ON dia_match_results(match_score DESC);
CREATE INDEX idx_match_results_expires ON dia_match_results(expires_at);
ALTER TABLE dia_match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own matches"
  ON dia_match_results FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own matches"
  ON dia_match_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can insert matches"
  ON dia_match_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

##### `dia_nudges` (dropped)

Created `20260212300000_dia_core_engine_tables.sql`. Dropped `20260707001538_b362730b-1d85-456e-a879-58efab8c6aea.sql`. No migration recreates it. `generate-connect-nudges`, `generate-opportunity-nudges`, `src/hooks/useDiaNudges.ts` and other `src/` DIA files still call `.from('dia_nudges')`; `types.ts` still has an entry.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `nudge_type`, `category`, `c_module`, `headline`, `body` | `TEXT NOT NULL` |
| `action` | `JSONB NOT NULL` |
| `priority` | `TEXT NOT NULL DEFAULT 'medium'` |
| `delivery_channel` | `TEXT NOT NULL` |
| `timing` | `JSONB NOT NULL DEFAULT '{}'` |
| `trigger_event` | `TEXT NOT NULL` |
| `match_id` | `UUID` |
| `status` | `TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'delivered', 'seen', 'acted_on', 'dismissed', 'expired', 'suppressed'))` |
| `delivered_at`, `acted_on_at`, `dismissed_at`, `expires_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
-- 20260212300000 (state at drop time)
CREATE INDEX idx_nudges_user ON dia_nudges(user_id);
CREATE INDEX idx_nudges_status ON dia_nudges(user_id, status);
CREATE INDEX idx_nudges_type ON dia_nudges(nudge_type);
CREATE INDEX idx_nudges_delivery ON dia_nudges(delivery_channel, status);
CREATE INDEX idx_nudges_created ON dia_nudges(created_at DESC);
ALTER TABLE dia_nudges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own nudges"
  ON dia_nudges FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own nudges"
  ON dia_nudges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can insert nudges"
  ON dia_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 20260707001538 (whole file)
BEGIN;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.dia_nudges;
  IF n <> 0 THEN
    RAISE EXCEPTION 'dia_nudges has % rows at drop time; archive was skipped on a 0-row read. Aborting for re-scope.', n;
  END IF;
END $$;
DROP POLICY IF EXISTS dia_nudges_select_own ON public.dia_nudges;
DROP POLICY IF EXISTS dia_nudges_update_own_lifecycle ON public.dia_nudges;
DROP TABLE public.dia_nudges;
COMMIT;
```

The two policy names the drop file removes (`dia_nudges_select_own`, `dia_nudges_update_own_lifecycle`) are not created by any migration.

##### `dia_conversations`

Created `20260212300000_dia_core_engine_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `title` | `TEXT` |
| `message_count` | `INTEGER DEFAULT 0` |
| `last_message_at` | `TIMESTAMPTZ` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
CREATE INDEX idx_dia_conversations_user ON dia_conversations(user_id, created_at DESC);
ALTER TABLE dia_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own DIA conversations"
  ON dia_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

##### `dia_messages`

Created `20260212300000_dia_core_engine_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `conversation_id` | `UUID NOT NULL REFERENCES dia_conversations(id) ON DELETE CASCADE` |
| `role` | `TEXT NOT NULL CHECK (role IN ('user', 'dia'))` |
| `content` | `TEXT NOT NULL` |
| `content_type` | `TEXT NOT NULL DEFAULT 'text'` |
| `attached_results`, `suggested_actions`, `entities` | `JSONB DEFAULT '[]'` |
| `intent` | `TEXT` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
CREATE INDEX idx_dia_messages_conversation ON dia_messages(conversation_id, created_at);
ALTER TABLE dia_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own DIA messages"
  ON dia_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM dia_conversations WHERE user_id = auth.uid()
    )
  );
CREATE TRIGGER dia_message_insert_trigger
  AFTER INSERT ON dia_messages
  FOR EACH ROW EXECUTE FUNCTION update_dia_conversation_on_message();
```

##### `user_nudge_state`

Created `20260212300000_dia_core_engine_tables.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `user_id` | `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` |
| `nudges_today` | `INTEGER DEFAULT 0` |
| `nudges_today_reset_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| `last_nudge_by_type`, `dismiss_count_by_type` | `JSONB DEFAULT '{}'` |
| `dia_frequency` | `TEXT DEFAULT 'normal' CHECK (dia_frequency IN ('frequent', 'normal', 'minimal', 'off'))` |
| `timezone` | `TEXT DEFAULT 'UTC'` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
ALTER TABLE user_nudge_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nudge state"
  ON user_nudge_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_nudge_state_updated_at
  BEFORE UPDATE ON user_nudge_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

##### `network_edges`

Created `20260212300000_dia_core_engine_tables.sql`. Never altered or dropped. Read from `src/services/dia/relationshipStrength.ts`.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id`, `connected_user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `connection_status` | `TEXT NOT NULL DEFAULT 'connected'` |
| `relationship_strength` | `FLOAT NOT NULL DEFAULT 0.0` |
| `strength_signals` | `JSONB NOT NULL DEFAULT '{}'` |
| `connection_date`, `last_interaction_date` | `TIMESTAMPTZ` |
| `mutual_connection_count`, `shared_space_count`, `shared_event_count` | `INTEGER DEFAULT 0` |
| `communication_frequency` | `TEXT DEFAULT 'inactive'` |
| `updated_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| constraint | `UNIQUE(user_id, connected_user_id)` |

```sql
CREATE INDEX idx_network_edges_user ON network_edges(user_id);
CREATE INDEX idx_network_edges_connected ON network_edges(connected_user_id);
CREATE INDEX idx_network_edges_strength ON network_edges(user_id, relationship_strength DESC);
CREATE INDEX idx_network_edges_status ON network_edges(connection_status);
ALTER TABLE network_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own edges"
  ON network_edges FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);
CREATE POLICY "System can manage edges"
  ON network_edges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER network_edges_updated_at
  BEFORE UPDATE ON network_edges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

##### `dia_rematch_queue`

Created `20260212600000_profile_identity_hub.sql`. Policy re-scoped by `20260808100000_fix_second_pass_idor_and_policy_scope.sql`. Not dropped.

| Column | Type |
| --- | --- |
| `user_id` | `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` |
| `reason` | `TEXT NOT NULL` |
| `queued_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
ALTER TABLE dia_rematch_queue ENABLE ROW LEVEL SECURITY;
-- 20260212600000
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dia_rematch_queue' AND policyname = 'System manages rematch queue'
  ) THEN
    CREATE POLICY "System manages rematch queue" ON dia_rematch_queue
      FOR ALL USING (TRUE);
  END IF;
END $$;
-- 20260808100000
ALTER POLICY "System manages rematch queue" ON public.dia_rematch_queue TO service_role;
-- No indexes beyond the primary key.
```

##### `dia_brief_cards`

Created by `20260508000000_dna_right_rail_data_layer.sql` and again, with `CREATE TABLE IF NOT EXISTS` and identical columns (`"position"` quoted), by `20260508035459_488b8b8d-f7a4-4445-bffa-8a8baafc1626.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` |
| `brief_date` | `DATE NOT NULL` |
| `position` | `SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3)` |
| `c_module` | `TEXT NOT NULL CHECK (c_module IN ('connect','convene','collaborate','contribute','convey'))` |
| `signal_type` | `TEXT NOT NULL` |
| `signal_strength` | `NUMERIC(4,3) NOT NULL CHECK (signal_strength BETWEEN 0 AND 1)` |
| `title`, `body`, `cta_label`, `cta_route`, `reasoning` | `TEXT NOT NULL` |
| `target_entity_type` | `TEXT` |
| `target_entity_id` | `UUID` |
| `is_fallback` | `BOOLEAN NOT NULL DEFAULT false` |
| `generated_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| `expires_at` | `TIMESTAMPTZ NOT NULL` |
| constraint | `unique_user_brief_position UNIQUE (user_id, brief_date, position)` |

```sql
-- 20260508000000
CREATE INDEX IF NOT EXISTS idx_dia_brief_cards_user_date
  ON public.dia_brief_cards(user_id, brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_dia_brief_cards_active
  ON public.dia_brief_cards(user_id, expires_at)
  WHERE expires_at > now();
-- 20260508035459 (same names, IF NOT EXISTS, no predicate)
CREATE INDEX IF NOT EXISTS idx_dia_brief_cards_user_date ON public.dia_brief_cards(user_id, brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_dia_brief_cards_active ON public.dia_brief_cards(user_id, expires_at);

ALTER TABLE public.dia_brief_cards ENABLE ROW LEVEL SECURITY;
-- Policies: same text in both files, each guarded by IF NOT EXISTS on pg_policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_cards' AND policyname='Users read their own brief cards') THEN
    CREATE POLICY "Users read their own brief cards" ON public.dia_brief_cards FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_cards' AND policyname='Service role writes brief cards') THEN
    CREATE POLICY "Service role writes brief cards" ON public.dia_brief_cards FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_cards' AND policyname='Service role updates brief cards') THEN
    CREATE POLICY "Service role updates brief cards" ON public.dia_brief_cards FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_cards' AND policyname='Service role deletes brief cards') THEN
    CREATE POLICY "Service role deletes brief cards" ON public.dia_brief_cards FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END $$;
```

The `idx_dia_brief_cards_active` predicate in `20260508000000` calls `now()`. Postgres accepts only IMMUTABLE functions in an index predicate, and `now()` is STABLE, so that statement errors when executed. The `20260508035459` file creates the same index name with no predicate.

##### `dia_brief_interactions`

Created in the same two files as `dia_brief_cards`. Never altered, never dropped. Enum `brief_interaction_type` is created (guarded by `pg_type`) in both files as `('viewed','clicked','dismissed','not_interested','saved','why_this_opened')`.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` |
| `card_id` | `UUID NOT NULL REFERENCES public.dia_brief_cards(id) ON DELETE CASCADE` |
| `interaction_type` | `brief_interaction_type NOT NULL` |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` |

```sql
CREATE INDEX IF NOT EXISTS idx_brief_interactions_user_card
  ON public.dia_brief_interactions(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_brief_interactions_type
  ON public.dia_brief_interactions(user_id, interaction_type, created_at DESC);
ALTER TABLE public.dia_brief_interactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_interactions' AND policyname='Users read their own interactions') THEN
    CREATE POLICY "Users read their own interactions" ON public.dia_brief_interactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dia_brief_interactions' AND policyname='Users record their own interactions') THEN
    CREATE POLICY "Users record their own interactions" ON public.dia_brief_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
```

##### `dia_messaging_prefs`

Created `20260511170718_9effc3a8-667d-40ee-a942-ff0ccab59bfe.sql`. Altered `20260511205156_89ee985e-8b08-4cd2-bb5a-a634f9c29d8d.sql`. Not dropped. Read by `get_email_digest_recipients()` (`20260511205433_0424b707-…`).

| Column | Type |
| --- | --- |
| `user_id` | `uuid primary key references auth.users(id) on delete cascade` |
| `smart_replies_enabled`, `summaries_enabled` | `boolean not null default true` |
| `email_digest` | `boolean NOT NULL DEFAULT true` (added `20260511205156`) |
| `created_at`, `updated_at` | `timestamptz not null default now()` |

```sql
alter table public.dia_messaging_prefs enable row level security;
create policy "prefs self select" on public.dia_messaging_prefs
  for select to authenticated using (user_id = auth.uid());
create policy "prefs self insert" on public.dia_messaging_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy "prefs self update" on public.dia_messaging_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger trg_dia_prefs_touch before update on public.dia_messaging_prefs
  for each row execute function public.dia_prefs_touch();
-- No indexes beyond the primary key.
```

##### `dia_messaging_feedback`

Created `20260511170718_9effc3a8-…`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `conversation_id` | `uuid not null` |
| `surface` | `text not null check (surface in ('smart_reply','summary','action_item'))` |
| `helpful` | `boolean not null` |
| `ref_id`, `model`, `variant` | `text` |
| `created_at` | `timestamptz not null default now()` |

```sql
alter table public.dia_messaging_feedback enable row level security;
create index if not exists idx_dia_feedback_user on public.dia_messaging_feedback(user_id, created_at desc);
create policy "feedback self insert" on public.dia_messaging_feedback
  for insert to authenticated with check (user_id = auth.uid());
create policy "feedback self select" on public.dia_messaging_feedback
  for select to authenticated using (user_id = auth.uid());
```

##### `dia_messaging_events`

Created `20260511170718_9effc3a8-…`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `conversation_id` | `uuid not null` |
| `event_type` | `text not null check (event_type in ('suggestion_shown','suggestion_picked','suggestion_sent','summary_opened','summary_refreshed','action_item_clicked','prefs_changed'))` |
| `ref_id`, `model`, `variant` | `text` |
| `metadata` | `jsonb` |
| `created_at` | `timestamptz not null default now()` |

```sql
alter table public.dia_messaging_events enable row level security;
create index if not exists idx_dia_events_user on public.dia_messaging_events(user_id, created_at desc);
create index if not exists idx_dia_events_conv on public.dia_messaging_events(conversation_id, created_at desc);
create policy "events self insert" on public.dia_messaging_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "events self select" on public.dia_messaging_events
  for select to authenticated using (user_id = auth.uid());
```

The index name `idx_dia_events_user` belongs to `dia_messaging_events`; it is unrelated to the `dia_events` table dia-core writes.

##### `dia_brief_snoozes`

Created `20260511191645_83cf98f5-39dc-4464-bf36-965a37d98a3e.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` |
| `thread_id` | `uuid not null` |
| `thread_type` | `text not null check (thread_type in ('direct','group'))` |
| `snoozed_until` | `timestamptz not null` |
| `created_at`, `updated_at` | `timestamptz not null default now()` |
| constraint | `unique (user_id, thread_id, thread_type)` |

```sql
alter table public.dia_brief_snoozes enable row level security;
create policy "snooze self select" on public.dia_brief_snoozes
  for select to authenticated using (user_id = auth.uid());
create policy "snooze self insert" on public.dia_brief_snoozes
  for insert to authenticated with check (user_id = auth.uid());
create policy "snooze self update" on public.dia_brief_snoozes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "snooze self delete" on public.dia_brief_snoozes
  for delete to authenticated using (user_id = auth.uid());
create index if not exists idx_brief_snoozes_user_active
  on public.dia_brief_snoozes(user_id, snoozed_until desc);
create trigger trg_brief_snoozes_updated_at
  before update on public.dia_brief_snoozes
  for each row execute function public.update_updated_at_column();
```

##### `dia_saved_answers`

Created `20260711122719_ba85a8ae-9154-4ecd-bd68-15fd5361e049.sql`. Never altered, never dropped.

| Column | Type |
| --- | --- |
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `query_text`, `answer` | `text NOT NULL` |
| `tool_results` | `jsonb DEFAULT '{}'::jsonb` |
| `citations` | `jsonb DEFAULT '[]'::jsonb` |
| `query_hash` | `text` |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` |

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dia_saved_answers TO authenticated;
GRANT ALL ON public.dia_saved_answers TO service_role;
ALTER TABLE public.dia_saved_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved answers"
  ON public.dia_saved_answers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS dia_saved_answers_user_created_idx
  ON public.dia_saved_answers (user_id, created_at DESC);
```

##### `adin_insights` / `dia_insights`

Created as `adin_insights` in `20241228_adin_insights.sql` (66 lines, seeds rows with `INSERT`). Policy changes under `dia_insights` in `20260104050540_…` and `20260218053744_e5fb06ef-…`. Not dropped. Read by `dia-daily-insights`, `get_random_featured_insight`, `increment_insight_click`, and three `src/` DIA files.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `title`, `description`, `query_prompt` | `TEXT NOT NULL` |
| `category` | `TEXT DEFAULT 'general'` |
| `region` | `TEXT` |
| `is_active` | `BOOLEAN DEFAULT true` |
| `is_featured` | `BOOLEAN DEFAULT false` |
| `display_order`, `click_count` | `INTEGER DEFAULT 0` |
| `start_date`, `end_date` | `DATE` |
| `created_at`, `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

```sql
-- 20241228_adin_insights.sql
CREATE INDEX IF NOT EXISTS idx_adin_insights_active ON adin_insights(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_adin_insights_featured ON adin_insights(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_adin_insights_category ON adin_insights(category, is_active);
ALTER TABLE adin_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adin_insights_select_active"
  ON adin_insights FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "adin_insights_manage_service"
  ON adin_insights FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 20260104050540
DROP POLICY IF EXISTS "adin_insights_select_active" ON public.dia_insights;
DROP POLICY IF EXISTS "dia_insights_select_policy" ON public.dia_insights;
CREATE POLICY "dia_insights_select_policy" ON public.dia_insights
  FOR SELECT USING (is_active = true);

-- 20260218053744
DROP POLICY IF EXISTS "adin_insights_manage_service" ON dia_insights;
```

Net, if `adin_insights` and `dia_insights` are one table: one policy, `dia_insights_select_policy`.

##### `adin_preferences` / `dia_preferences`

Created as `adin_preferences` in `20251107035850_919c5377-bc97-4c7d-bf10-0386ce8f5418.sql`. Not dropped. Read by dia-core `consent.ts:32`, `generate-opportunity-nudges`, `src/hooks/useDiaPreferences.ts`, `src/pages/DiaPreferences.tsx`.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE` |
| `notification_frequency` | `TEXT DEFAULT 'normal' CHECK (notification_frequency IN ('never', 'low', 'normal', 'high'))` |
| `nudge_categories` | `JSONB DEFAULT '["connection", "content", "engagement"]'::jsonb` |
| `email_enabled`, `in_app_enabled` | `BOOLEAN DEFAULT true` |
| `quiet_hours_enabled` | `BOOLEAN DEFAULT false` |
| `quiet_hours_start` | `TIME DEFAULT '22:00'` |
| `quiet_hours_end` | `TIME DEFAULT '08:00'` |
| `timezone` | `TEXT DEFAULT 'UTC'` |
| `created_at`, `updated_at` | `TIMESTAMP WITH TIME ZONE DEFAULT now()` |

Columns used by migrations but added by none: `unsubscribe_token` (`UPDATE … SET unsubscribe_token` in `20251220031816_d9db2808-…`), and `email_connections`, `email_comments`, `email_reactions`, `email_mentions`, `email_messages`, `email_events`, `email_stories`, `unsubscribe_token` (the column list of the `INSERT` in `handle_new_user_adin_preferences()`, same file).

```sql
CREATE INDEX IF NOT EXISTS idx_adin_preferences_user_id ON public.adin_preferences(user_id);
ALTER TABLE public.adin_preferences ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_adin_preferences_timestamp
  BEFORE UPDATE ON public.adin_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_adin_preferences_updated_at();
-- 20251220023714: trigger on profiles that seeds a row
CREATE TRIGGER on_profile_created_adin_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_adin_preferences();

-- Net policies (last definition of each surviving name):
-- 20251111021811
CREATE POLICY "Users can insert own ADIN preferences" ON public.adin_preferences
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own ADIN preferences" ON public.adin_preferences
FOR UPDATE USING ((select auth.uid()) = user_id);
-- 20260713001028 (addressed to dia_preferences)
DROP POLICY IF EXISTS adin_preferences_select ON public.dia_preferences;
CREATE POLICY adin_preferences_select ON public.dia_preferences AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));
```

Policy history: `20251107035850` creates "Users can view own ADIN preferences", "Users can insert own ADIN preferences", "Users can update own ADIN preferences", "Admins can view all ADIN preferences" (email `LIKE '%@diasporanetwork.africa'`); `20251111021811` recreates all four with `(select auth.uid())`; `20251111022450` adds "Users can view ADIN preferences"; `20251111022747` drops "Admins can view all ADIN preferences", "Users can view ADIN preferences", "Users can view own ADIN preferences" and creates `adin_preferences_select`; `20260703071325_1c47dc2c-…` recreates `adin_preferences_select` `TO public` using `has_role(auth.uid(), 'admin'::app_role)`; `20260713001028` recreates it on `dia_preferences` `TO authenticated`. Net, if the names are one table: 3 policies.

##### `adin_queries` / `dia_queries`

Created as `adin_queries` in `20251228100001_adin_perplexity_integration.sql` (183 lines). Not dropped. Read and written by `dia-search` (3 calls). Shared response cache keyed by `query_hash` (per the comment in `20260218053744`).

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `query_hash`, `query_text`, `normalized_query` | `TEXT NOT NULL` |
| `perplexity_response` | `JSONB NOT NULL` |
| `citations`, `network_matches` | `JSONB` |
| `model_used` | `TEXT DEFAULT 'sonar'` |
| `tokens_used` | `INTEGER` |
| `estimated_cost` | `DECIMAL(10, 6)` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `expires_at` | `TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')` |
| `cache_hits` | `INTEGER DEFAULT 0` |
| constraint | `adin_queries_query_hash_key UNIQUE (query_hash)` |

```sql
CREATE INDEX IF NOT EXISTS idx_adin_queries_hash ON public.adin_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_adin_queries_expires ON public.adin_queries(expires_at);
CREATE INDEX IF NOT EXISTS idx_adin_queries_created ON public.adin_queries(created_at DESC);
ALTER TABLE public.adin_queries ENABLE ROW LEVEL SECURITY;

-- Net policies:
-- 20251228100001
CREATE POLICY "adin_queries_all_service_role"
  ON public.adin_queries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- 20260104050540 (drops "adin_queries_select_authenticated" on dia_queries first)
CREATE POLICY "dia_queries_select_policy" ON public.dia_queries
  FOR SELECT USING (true);
-- 20260213043659 (replaces the 20260213043530 version, which was WITH CHECK (true))
CREATE POLICY "dia_queries_insert_policy"
ON public.dia_queries
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) IS NOT NULL);
-- 20260530042302
CREATE POLICY adin_queries_delete_service_role ON public.dia_queries FOR DELETE TO service_role USING ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY adin_queries_insert_service_role ON public.dia_queries FOR INSERT TO service_role WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY adin_queries_update_service_role ON public.dia_queries FOR UPDATE TO service_role USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
```

Net, if the names are one table: 6 policies.

##### `adin_query_log` / `dia_query_log`

Created as `adin_query_log` in `20251228100001_adin_perplexity_integration.sql`. Columns added under `dia_query_log` in `20260711122013_1609cc96-…` and `20260711124129_5a4ff9eb-…`. Not dropped. Written by `dia-search`; read by five `src/` DIA calls; rows purged by `purge_expired_dia_history()`.

| Column | Type | Source |
| --- | --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | create |
| `user_id` | `UUID REFERENCES auth.users(id) ON DELETE SET NULL` | create |
| `query_text` | `TEXT NOT NULL` | create |
| `cache_hit` | `BOOLEAN DEFAULT FALSE` | create |
| `response_time_ms` | `INTEGER` | create |
| `source` | `TEXT DEFAULT 'dashboard'` | create |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | create |
| `tools_fired` | `jsonb DEFAULT '[]'::jsonb` | `20260711122013` |
| `success` | `boolean DEFAULT true` | `20260711122013` |
| `error_message`, `blocked_reason` | `text` | `20260711122013` |
| `tokens_used` | `integer` | `20260711122013` |
| `archived_at` | `timestamptz` | `20260711124129` |

```sql
CREATE INDEX IF NOT EXISTS idx_adin_query_log_user ON public.adin_query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_adin_query_log_created ON public.adin_query_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adin_query_log_source ON public.adin_query_log(source);
CREATE INDEX IF NOT EXISTS dia_query_log_user_created_idx
  ON public.dia_query_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dia_query_log_archived_at_idx ON public.dia_query_log(archived_at);
ALTER TABLE public.adin_query_log ENABLE ROW LEVEL SECURITY;
GRANT UPDATE, DELETE ON public.dia_query_log TO authenticated;

-- Net policies:
-- 20251228100001
CREATE POLICY "adin_query_log_select_own"
  ON public.adin_query_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- 20260530042302
CREATE POLICY adin_query_log_all_service_role ON public.dia_query_log FOR ALL TO service_role USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
-- 20260104050540
CREATE POLICY "dia_query_log_insert_own" ON public.dia_query_log
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "dia_query_log_select_own" ON public.dia_query_log
  FOR SELECT USING (user_id = (select auth.uid()));
-- 20260711124129
CREATE POLICY dia_query_log_update_own ON public.dia_query_log
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY dia_query_log_delete_own ON public.dia_query_log
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
```

Net, if the names are one table: 6 policies.

##### `adin_user_usage` / `dia_user_usage`

Created as `adin_user_usage` in `20251228100001_adin_perplexity_integration.sql`. Not dropped. Read and written by `get_adin_user_usage` and `increment_adin_usage`. No dia-core or `dia-*` edge function names this table; dia-core's usage path is `dia_check_limit` / `dia_record_usage`, which no migration defines.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` |
| `period_start` | `DATE NOT NULL` |
| `query_count` | `INTEGER DEFAULT 0` |
| `query_limit` | `INTEGER DEFAULT 10` |
| `total_tokens_used` | `INTEGER DEFAULT 0` |
| `total_estimated_cost` | `DECIMAL(10, 4) DEFAULT 0` |
| `last_query_at` | `TIMESTAMPTZ` |
| `created_at`, `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| constraint | `adin_user_usage_user_period_key UNIQUE (user_id, period_start)` |

```sql
CREATE INDEX IF NOT EXISTS idx_adin_user_usage_user ON public.adin_user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_adin_user_usage_period ON public.adin_user_usage(period_start);
ALTER TABLE public.adin_user_usage ENABLE ROW LEVEL SECURITY;

-- Net policies:
-- 20251228100001
CREATE POLICY "adin_user_usage_select_own"
  ON public.adin_user_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
-- 20260530042302
CREATE POLICY adin_user_usage_all_service_role ON public.dia_user_usage FOR ALL TO service_role USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
-- 20260104050540
CREATE POLICY "dia_user_usage_select_own" ON public.dia_user_usage
  FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "dia_user_usage_update_own" ON public.dia_user_usage
  FOR UPDATE USING (user_id = (select auth.uid()));
```

Net, if the names are one table: 4 policies.

##### `user_vectors` (embeddings)

Created `20251116024358_ff2a0e6e-5958-4f7b-afcc-f3db6d41379e.sql`. Not dropped. Used from `src/services/embeddingService.ts` (32-dimension vectors, header "M4: Embedding Service").

| Column | Type |
| --- | --- |
| `user_id` | `UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE` |
| `vector` | `JSONB NOT NULL` |
| `dimension` | `INTEGER NOT NULL DEFAULT 32` |
| `source` | `TEXT NOT NULL CHECK (source IN ('interactions', 'profile', 'hybrid'))` |
| `updated_at`, `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |

```sql
CREATE INDEX idx_user_vectors_updated_at ON user_vectors(updated_at DESC);
ALTER TABLE user_vectors ENABLE ROW LEVEL SECURITY;

-- Net policies:
-- 20251116072614
CREATE POLICY "System can insert user vectors"
ON public.user_vectors
FOR INSERT
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "System can update user vectors"
ON public.user_vectors
FOR UPDATE
USING ((SELECT auth.uid()) IS NOT NULL)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY "System can delete user vectors"
ON public.user_vectors
FOR DELETE
USING ((SELECT auth.uid()) IS NOT NULL);
-- 20260713001028
CREATE POLICY user_vectors_select_own_or_admin ON public.user_vectors AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

-- 20260807130000: targets three policy names no migration creates
ALTER POLICY "Users insert own vectors" ON public.user_vectors TO service_role;
ALTER POLICY "Users update own vectors" ON public.user_vectors TO service_role;
ALTER POLICY "Users delete own vectors" ON public.user_vectors TO service_role;
```

##### `entity_vectors` (embeddings)

Created `20251116024358_ff2a0e6e-…`. Not dropped.

| Column | Type |
| --- | --- |
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| `entity_type` | `TEXT NOT NULL CHECK (entity_type IN ('event', 'space', 'need', 'story', 'profile', 'project', 'post', 'community'))` |
| `entity_id` | `UUID NOT NULL` |
| `vector` | `JSONB NOT NULL` |
| `dimension` | `INTEGER NOT NULL DEFAULT 32` |
| `source` | `TEXT NOT NULL CHECK (source IN ('tags', 'metadata', 'text', 'hybrid'))` |
| `updated_at`, `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| constraint | `UNIQUE(entity_type, entity_id)` |

```sql
CREATE INDEX idx_entity_vectors_entity ON entity_vectors(entity_type, entity_id);
CREATE INDEX idx_entity_vectors_updated_at ON entity_vectors(updated_at DESC);
ALTER TABLE entity_vectors ENABLE ROW LEVEL SECURITY;
-- Net policy (20251116072447); the insert/update/delete policies from 20251116072614 are dropped in 20260218053744
CREATE POLICY "Entity vectors access policy"
ON public.entity_vectors
FOR SELECT
USING ((SELECT auth.uid()) IS NOT NULL);
```

##### Referenced-not-created tables: policies the migrations write

```sql
-- adin_nudges, net from migrations
-- 20250812183915-.sql
CREATE POLICY "Nudges readable by owner"
ON public.adin_nudges
FOR SELECT
USING (user_id = (select auth.uid()));
CREATE POLICY "Nudges update by owner"
ON public.adin_nudges
FOR UPDATE
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));
-- 20260530042302 (after dropping "System can insert nudges", created in 20260213043530)
CREATE POLICY "Service role can insert nudges" ON public.adin_nudges FOR INSERT TO service_role WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- adin_recommendations, net from migrations (20250812183915-.sql)
CREATE POLICY "ar_user_owned_insert"
ON public.adin_recommendations
FOR INSERT
WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ar_user_owned_select"
ON public.adin_recommendations
FOR SELECT
USING (user_id = (select auth.uid()));
CREATE POLICY "ar_user_owned_update"
ON public.adin_recommendations
FOR UPDATE
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- adin_signals (20251011060515)
ALTER POLICY "Users can view and update their own signals" ON public.adin_signals
  USING (user_id = (SELECT auth.uid()) OR has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (user_id = (SELECT auth.uid()) OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- user_adin_profile (20260218053744)
CREATE POLICY "user_adin_profile_select_own"
ON user_adin_profile FOR SELECT
USING (
  user_id = (SELECT auth.uid() AS uid)
  OR has_role((SELECT auth.uid() AS uid), 'admin'::app_role)
);
-- user_dia_profile (20260713001028)
DROP POLICY IF EXISTS user_adin_profile_select_own ON public.user_dia_profile;
CREATE POLICY user_adin_profile_select_own ON public.user_dia_profile AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));
-- user_dia_profile (20260712214923)
CREATE TRIGGER trg_user_dia_profile_prevent_priv_escalation
  BEFORE UPDATE ON public.user_dia_profile
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_dia_profile_privilege_escalation();
```

#### A6.4 DIA SQL functions

"Default" means the function declares neither `SECURITY DEFINER` nor `SECURITY INVOKER`, so it runs as invoker. "Last redefined" is the last file with `CREATE [OR REPLACE] FUNCTION` for that signature.

**Called by dia-core, DIA edge functions or DIA services, but defined by no migration**

| Function | Caller | In migrations | types.ts |
| --- | --- | --- | --- |
| `dia_check_limit(p_user_id, p_capability)` | `dia-core/limits.ts:20` | no | yes |
| `dia_record_usage(p_user_id, p_capability, p_tokens)` | `dia-core/limits.ts:34` | no | yes |
| `trigger_dia_prompt` | `dia-trigger-prompt/index.ts` | no (`trigger_adin_prompt` exists, below) | yes |
| `rpc_dia_recommend_people()` | `src/services/connectionService.ts:389` | no (`rpc_adin_recommend_people` exists, below) | yes |
| `get_or_create_dia_preferences(uuid)` | none found in code | only `REVOKE EXECUTE … FROM anon, public` in `20260711084213_8248c919-…`; never created under this name (`get_or_create_adin_preferences` exists) | yes |

**Defined in migrations**

| Function | Returns | Security | Created in | Last redefined in | What the body does |
| --- | --- | --- | --- | --- | --- |
| `get_dia_daily_brief(p_user_id UUID DEFAULT NULL)` | `TABLE (id UUID, "position" SMALLINT, c_module TEXT, signal_type TEXT, title TEXT, body TEXT, cta_label TEXT, cta_route TEXT, target_entity_type TEXT, target_entity_id UUID, reasoning TEXT, is_fallback BOOLEAN)` | DEFINER, `search_path = public` | `20260508000000_…` | `20260508035459_…` | Returns up to 3 unexpired `dia_brief_cards` rows for `COALESCE(p_user_id, auth.uid())` that have no `dismissed`/`not_interested` interaction, ordered by position; raises if no user. `GRANT EXECUTE … TO authenticated`. |
| `record_brief_interaction(p_card_id UUID, p_interaction_type brief_interaction_type)` | `UUID` | DEFINER | `20260508000000_…` | `20260508035459_…` | Inserts a `dia_brief_interactions` row for `auth.uid()` and, for `dismissed`/`not_interested`, sets that card's `expires_at = now()`; raises if unauthenticated. `GRANT EXECUTE … TO authenticated`. |
| `purge_expired_dia_history()` | `void` | DEFINER, `LANGUAGE sql` | `20260711124129_5a4ff9eb-…` | same | `DELETE FROM public.dia_query_log WHERE archived_at IS NOT NULL AND archived_at < now() - interval '14 days'`. Anon EXECUTE revoked in `20260712212747_f09fae4b-…`. |
| `dia_prefs_touch()` | `trigger` | default | `20260511170718_9effc3a8-…` | same (`ALTER FUNCTION … SET search_path = public` in `20260530042302_…`) | Sets `new.updated_at = now()` on `dia_messaging_prefs` updates. |
| `update_dia_conversation_on_message()` | `TRIGGER` | default | `20260212300000_…` | same | After a `dia_messages` insert, increments `dia_conversations.message_count` and sets `last_message_at`. |
| `trigger_dia_rematch(p_user_id UUID, p_reason TEXT)` | `VOID` | DEFINER | `20260212600000_…` | `20260808100000_…` | Upserts `dia_rematch_queue (user_id, reason, queued_at)`; the 20260808 version first raises `Not authorized` unless `p_user_id = auth.uid()`. The 20260808 comment states it has no caller. |
| `prevent_user_dia_profile_privilege_escalation()` | `trigger` | DEFINER | `20260712214923_4f3820e0-…` | same | Blocks non-admin authenticated updates to `is_verified_contributor`, `contributor_score`, `contributor_impact_type` on `user_dia_profile`. EXECUTE revoked from PUBLIC, anon. |
| `get_random_featured_insight()` | `TABLE(id uuid, title text, description text, query_prompt text, category text, region text)` | DEFINER | `20260104065111_343c3f48-…` (drop-and-create) | same | Returns one random active, featured row from `dia_insights`. |
| `increment_insight_click(insight_id uuid)` | `void` | DEFINER | `20260104065111_343c3f48-…` (drop-and-create) | same | Increments `dia_insights.click_count` and sets `updated_at`. |
| `cleanup_expired_adin_cache()` | `integer` | DEFINER | `20251228100001_…` (reads `adin_queries`) | `20260104065151_76bcf37e-…` (reads `dia_queries`) | Deletes expired cache rows and returns the count. `GRANT EXECUTE … TO service_role` (20251228100001). |
| `get_adin_user_usage(p_user_id uuid)` | `TABLE(query_count integer, query_limit integer, queries_remaining integer, period_start date, resets_at date)` | DEFINER | `20260104065151_76bcf37e-…` (drop-and-create) | same | Returns the current month's `dia_user_usage` row for the user with remaining count and reset date. |
| `increment_adin_usage(p_user_id uuid, p_tokens_used integer DEFAULT 0, p_estimated_cost numeric DEFAULT 0)` | `boolean` | DEFINER | `20260104065151_76bcf37e-…` (drop-and-create) | same | Upserts the current month's `dia_user_usage` row, adding one query plus tokens and cost. |
| `get_or_create_adin_preferences(p_user_id UUID)` | `SETOF public.adin_preferences` | DEFINER | `20251107035850_…` | same | Inserts a default `adin_preferences` row if absent, then returns the user's row. |
| `update_adin_preferences_updated_at()` | `TRIGGER` | DEFINER | `20251107035850_…` | same | `updated_at` touch trigger for `adin_preferences`. |
| `handle_new_user_adin_preferences()` | `trigger` | DEFINER | `20251220023714_3a61d34e-…` | `20251220031816_d9db2808-…` | On profile insert, inserts an `adin_preferences` row naming the eight columns no migration adds; `ON CONFLICT (user_id) DO NOTHING`. |
| `trigger_adin_prompt(target_user_id uuid, event_type text)` | `void` | DEFINER | `20250801062316_57e6f3d5-…` | same | Sets `profiles.adin_prompt_status = 'prompted'` and upserts `adin_profiles`, a table no migration creates (the file's own header notes this). |
| `find_adin_matches(target_user_id uuid)` | `TABLE(matched_user_id uuid, match_score numeric, match_reason text, shared_regions text[], shared_sectors text[])` | default | `20250731200543_48dc610c-…` | `20251225000001_dismissed_recommendations.sql` | Scores other `adin_profiles` rows by region and sector overlap via `calculate_match_score`, excluding dismissed, blocked and connected users; returns top 10 with a text reason. |
| `find_adin_matches(user_id uuid, match_threshold integer DEFAULT 60)` | `TABLE(signal_id uuid, signal_title text, signal_type text, match_score integer, signal_created_at timestamptz)` | DEFINER | `20250731200543_48dc610c-…` | same | Returns up to 20 active `adin_signals` rows whose `calculate_match_score(user_id, s.id)` meets the threshold. |
| `rpc_adin_recommend_people()`, `rpc_adin_recommend_opportunities()`, `rpc_adin_recommend_spaces()` | people: as `find_adin_matches(uuid)`; opportunities: as `find_adin_matches(uuid, int)`; spaces: `TABLE(space_id uuid, space_name text, match_score integer)` | DEFINER | `20250809005520_8f4949f0-…` | same | People: top 5 of `find_adin_matches(auth.uid())`. Opportunities: top 20 of `find_adin_matches(auth.uid(), 60)`. Spaces: returns no rows (`WHERE false`). `20250809005801_…` grants EXECUTE to anon, authenticated. |
| `rpc_adin_recommend_people(p_limit int)`, `rpc_adin_recommend_spaces(p_limit int)`, `rpc_adin_recommend_opportunities(p_limit int)` | tables with a `score numeric` column | DEFINER | `20250808213112_f5340254-…` | `20250808223036_0f48de11-…` | Integer-argument overloads, never dropped after `20250808223036`; EXECUTE revoked from PUBLIC, anon and granted to authenticated. |
| `rpc_adin_recommendations_people(p_user_id uuid, p_limit integer DEFAULT 5)`, `rpc_adin_recommendations_opportunities(p_user_id uuid, p_threshold integer DEFAULT 60, p_limit integer DEFAULT 20)` | as `find_adin_matches` overloads | DEFINER | `20250809004813_e51aecc3-…` | `20250809004901_95c0d7c6-…` | Wrap `find_adin_matches` for a given user with a limit. |
| `resolve_nudge(p_nudge uuid, p_status text, p_snooze_until timestamptz DEFAULT NULL)` | `void` | DEFINER | `20250812034816_ce65a394-…` | `20250812040711_14964449-…` | Sets an owned `adin_nudges` row to accepted/dismissed/snoozed, upserts `connection_preferences.snoozed_until` for snoozes, and logs a connection event. |
| `get_users_needing_connection_nudges()` | `TABLE (user_id UUID, full_name TEXT, username TEXT, connections_count INT, account_age_days INT)` | DEFINER | `20251113102721_13d09474-…` | `20251113103346_95774583-…` | Lists profiles older than 3 days with `profile_completion_percentage >= 40`, no accepted connection, and no `first_connections` `adin_nudges` row in 7 days. |
| `get_suggested_connections(p_user_id uuid, p_limit integer DEFAULT 10)` (called by `generate-connect-nudges`) | `TABLE(id uuid, full_name text, username text, avatar_url text, headline text, profession text, location text, primary_origin_country text, focus_areas text[], industries text[], skills text[], match_score integer)` | DEFINER | `20251113094811_62b3fd73-…` | `20260529234713_95ab9578-…` | Returns random non-connected profiles with a constant `match_score` of 50 and the primary `member_heritage.origin_country`. |
| `get_trending_hashtags(p_time_range TEXT DEFAULT '24h', p_limit INT DEFAULT 8)` (called by `generate-daily-briefs`) | `TABLE (hashtag TEXT, post_count BIGINT, unique_authors BIGINT, is_followed BOOLEAN)` | DEFINER | earlier signatures from `20251107143319_03c80a5c-…`; this signature `20260508000000_…` | `20260508035459_…` | Counts public posts and distinct authors per `post_hashtags.hashtag` within 24h/7d/30d, flags whether the caller follows the tag in `trend_follows`. |
| `get_group_conversations_for_user(p_include_archived boolean DEFAULT false)` (called by `dia-inbox-brief`) | `TABLE(conversation_id uuid, title text, …, unread_count integer, last_message_preview text, last_sender_name text, is_pinned boolean, is_muted boolean, is_archived boolean)` | DEFINER | zero-argument form `20260325134835_3edb926c-…` | `20260511203447_090a731c-…` | Lists the caller's group conversations with unread counts and last-message preview. |
| `get_group_messages(p_conversation_id uuid, p_limit integer DEFAULT 30, p_before_id uuid DEFAULT NULL)` (called by `dia-inbox-brief`) | `TABLE(message_id uuid, sender_id uuid, …, content text, …, edited_at timestamptz)` | DEFINER | `20260325134835_3edb926c-…` | same | Pages a group conversation's messages, including `content`. |
| `get_similar_users(target_user_id UUID, limit_count INTEGER DEFAULT 10)` | `TABLE (user_id UUID, similarity_score FLOAT)` | DEFINER | `20251116024358_ff2a0e6e-…` | `20251122144254_6dccb732-…` | Orders other `user_vectors` rows by `cosine_similarity(target_vector, uv.vector)`. |
| `get_similar_entities(target_entity_type TEXT, target_entity_id UUID, limit_count INTEGER DEFAULT 10)` | `TABLE (entity_type TEXT, entity_id UUID, similarity_score FLOAT)` | DEFINER | `20251116024358_ff2a0e6e-…` | `20251122144254_6dccb732-…` | Same over `entity_vectors`. |

Function drops in migrations among these: `get_user_cohorts(uuid)` (ADA) in `20260708042802_…`; the drop-and-create pairs listed above. No migration drops `get_dia_daily_brief`, `record_brief_interaction`, `purge_expired_dia_history`, `trigger_dia_rematch`, `find_adin_matches`, `trigger_adin_prompt` or any `rpc_adin_*` function after its last redefinition.

#### A6.5 Views

`20260104065440_367591ce-cb04-4f82-bb49-d4e5cc7469c6.sql` drops and recreates three views `WITH (security_invoker = true)`: `adin_daily_stats` and `adin_popular_queries` over `dia_query_log`, and `adin_cost_tracking` over `dia_queries`. `src/` reads `dia_daily_stats`, `dia_cost_tracking` and `dia_popular_queries` (from `src/pages/admin/DiaAdminPage.tsx`); no migration creates views under those three names, and `types.ts` lists all three.

### A7. Types and scope

`src/types/dia.ts` is 478 lines (`wc -l`). It contains `DIACoreService` (lines 426 to 459). It does not contain a type named `DIACapability` or `DIAFeatureTier`: a grep of `src/` and `supabase/functions/` for `DIACapability` returns nothing. The nearest matches are `DIAFeatureTier` in `src/types/diaEngine.ts:551` (562 lines) and `DiaCapability` in `supabase/functions/_shared/dia-core/models.ts:17` (75 lines). All three are copied below.

#### From `src/types/dia.ts`

```ts
/** The Five C pillars plus system contexts */
export type FiveCModule = 'connect' | 'convene' | 'collaborate' | 'contribute' | 'convey';

/** DIA's three operational modes */
export type DIAOperationalMode = 'ambient' | 'proactive' | 'reactive';

/** User subscription tier — gates DIA capabilities */
export type SubscriptionTier = 'free' | 'pro' | 'org';

/** DIA suggestion tracking states */
export type SuggestionInteraction = 'shown' | 'accepted' | 'dismissed' | 'snoozed';

/** Trust boundary for data sharing */
export type TrustBoundary = 'self' | 'connections' | 'network' | 'public';
```

```ts
export type ProfileField =
  | 'avatar'
  | 'headline'
  | 'bio'
  | 'skills'
  | 'interests'
  | 'location'
  | 'languages'
  | 'diaspora_heritage'
  | 'professional_background'
  | 'education';
```

```ts
export type ContentSentiment = 'positive' | 'neutral' | 'negative' | 'mixed' | 'inspiring';
```

```ts
export type MatchType =
  | 'opportunity_to_profile'
  | 'profile_to_opportunity'
  | 'event_to_interests'
  | 'space_to_skills'
  | 'profile_to_profile';
```

```ts
export type TrendType =
  | 'topic'
  | 'skill'
  | 'region'
  | 'event_category'
  | 'opportunity_type'
  | 'hashtag';
```

```ts
export type NudgeType =
  | 'profile_completion'
  | 'connection_suggestion'
  | 'event_recommendation'
  | 'opportunity_match'
  | 'space_invitation'
  | 'content_prompt'
  | 'engagement_milestone'
  | 'weekly_digest'
  | 'stall_detection'
  | 'reactivation';

export type NudgePriority = 'low' | 'medium' | 'high' | 'urgent';
```

```ts
export type InsightType =
  | 'network_growth'
  | 'skill_trending'
  | 'opportunity_alert'
  | 'event_suggestion'
  | 'weekly_summary'
  | 'milestone_celebration'
  | 'regional_update'
  | 'content_performance';
```

```ts
/**
 * Tier-based limits for DIA capabilities.
 * These are enforced at the service layer.
 */
export interface DIATierLimits {
  tier: SubscriptionTier;
  ambient_intelligence: 'basic' | 'full';
  proactive_suggestions_per_session: number; // free: 2, pro/org: Infinity
  reactive_queries_per_day: number; // free: 5, pro/org: Infinity
  opportunity_match_scores: boolean;
  network_analytics: 'none' | 'personal' | 'team';
  content_performance: boolean | 'branded';
  custom_reports: boolean;
}
```

```ts
/**
 * The DIA Core Service orchestrates all intelligence services.
 * Every action on the platform feeds data into DIA, and DIA
 * returns intelligence to every module.
 */
export interface DIACoreService {
  // Profile Intelligence
  analyzeProfile(input: ProfileIntelligenceInput): Promise<ProfileIntelligenceResult>;

  // Network Intelligence
  computeConnectionStrength(userAId: string, userBId: string): Promise<ConnectionStrength>;
  getSmartIntroductions(userId: string, limit?: number): Promise<SmartIntroduction[]>;
  getCommunityCluster(userId: string): Promise<CommunityCluster[]>;

  // Content Intelligence
  analyzeContent(content: string, contentType?: string): Promise<ContentAnalysis>;

  // Matching Engine
  findMatches(request: MatchRequest): Promise<MatchResult[]>;

  // Trend Intelligence
  getTrends(query: TrendQuery): Promise<TrendItem[]>;

  // Nudge Engine
  generateNudges(userId: string, context?: FiveCModule): Promise<DIANudge[]>;
  trackNudgeInteraction(nudgeId: string, interaction: SuggestionInteraction): Promise<void>;

  // Conversation Intelligence (metadata only — never message content)
  getConversationMetadata(conversationId: string): Promise<ConversationMetadata>;

  // Regional Intelligence
  getRegionalInsight(query: RegionalQuery): Promise<RegionalInsight>;

  // Insight Cards
  getInsightCards(userId: string, limit?: number): Promise<DIAInsightCard[]>;

  // Tier enforcement
  checkTierLimit(userId: string, capability: keyof DIATierLimits): Promise<boolean>;
}
```

The other exports in the file are interfaces (`ProfileIntelligenceInput`, `ProfileIntelligenceResult`, `SkillGap`, `NetworkPosition`, `RegionalPresence`, `ProfileAction`, `ConnectionStrength`, `ConnectionStrengthFactors`, `CommunityCluster`, `SmartIntroduction`, `ContentAnalysis`, `ContentQualitySignals`, `MatchRequest`, `MatchFilters`, `MatchResult`, `MatchFactor`, `TrendItem`, `TrendQuery`, `DIANudge`, `NudgeTrigger`, `ConversationMetadata`, `MessageFrequency`, `ResponsePattern`, `RegionalInsight`, `RegionalQuery`, `DIAInsightCard`, `InsightAction`, `DIASuggestionEvent`). The file has no `enum` and no `const`.

#### `DIAFeatureTier`, from `src/types/diaEngine.ts:551`

```ts
export interface DIAFeatureTier {
  peopleMatchesPerDay: number;
  matchScoreVisible: boolean;
  matchReasonsVisible: boolean;
  opportunityMatchesPerDay: number;
  spaceRecommendations: 'basic' | 'full';
  eventRecommendations: 'basic' | 'full';
  nudgesPerDay: number;
  chatQueriesPerDay: number;
  networkAnalysis: 'count_only' | 'full' | 'org';
  weeklyDigest: 'basic' | 'detailed' | 'team';
}
```

It is re-exported from `src/services/dia/index.ts:117`. No other file references it.

#### `DiaCapability`, from `supabase/functions/_shared/dia-core/models.ts:17`

```ts
// Capability classes. Extend as functions are re-pointed and their live model is confirmed.
export type DiaCapability =
  | "reactive_query"
  | "compose_read"
  | "smart_replies"
  | "smart_compose"
  | "smart_chips"
  | "thread_summary"
  | "inbox_brief"
  | "daily_pulse"
  | "daily_insights"
  | "hub_intelligence"
  | "trigger_prompt"
  | "connect_nudges"
  | "opportunity_nudges"
  | "daily_brief"
  | "event_recommendations"
  | "suggest_usernames"
  | "curate";
```

Same file, the routing constants:

```ts
export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";

// Perplexity model for the web_search tool (Perplexity stays a tool in the loop, not a spine).
export const PERPLEXITY_MODEL = "sonar";
```

```ts
const GATEWAY_MODELS: Partial<Record<DiaCapability, string>> = {
  reactive_query: "google/gemini-2.5-flash",        // dia-search
  compose_read: "google/gemini-3-flash-preview",    // dia-compose-read
  smart_replies: "google/gemini-3-flash-preview",   // dia-smart-replies
  smart_compose: "google/gemini-3-flash-preview",   // dia-smart-compose
  thread_summary: "google/gemini-3-flash-preview",  // dia-thread-summary
  inbox_brief: "google/gemini-3-flash-preview",     // dia-inbox-brief
  daily_pulse: "google/gemini-3-flash-preview",     // dia-daily-pulse
  daily_insights: "google/gemini-2.5-flash",        // dia-daily-insights
  event_recommendations: "google/gemini-2.5-flash", // get-event-recommendations (Tier-2)
  suggest_usernames: "google/gemini-2.5-flash",     // suggest-usernames (Tier-2)
};

const FALLBACK_MODEL = "google/gemini-2.5-flash";
```

```ts
export const ANTHROPIC_ALTERNATES = {
  haiku: "anthropic/claude-haiku-4-5",
  sonnet: "anthropic/claude-sonnet-4-5",
  // opus reserved for agentic lanes (DIA3)
} as const;
```

`supabase/functions/_shared/dia-core/consent.ts:9` holds the related set:

```ts
const IMPLIED_CONSENT = new Set<string>([
  "reactive_query",
  "compose_read",
  "smart_replies",
  "smart_compose",
  "smart_chips",
  "thread_summary",
]);
```

#### Implementation map

Search: `grep -rn` over `src/` and `supabase/functions/` for `implements DIACoreService`, `: DIACoreService`, each method name as a function or property definition, and each capability string in quotes.

No class or object implements `DIACoreService`. The interface is only re-exported, from `src/services/dia/index.ts:60`. Eight of its methods exist as standalone functions in `src/services/dia/*.ts`, gathered into per-domain service objects. No file outside `src/services/dia/` imports `profileIntelligenceService`, `networkIntelligenceService`, `contentIntelligenceService`, `matchingEngineService`, `trendIntelligenceService`, `conversationIntelligenceService` or `regionalIntelligenceService`.

| `DIACoreService` method | Implemented? | By what |
| --- | --- | --- |
| `analyzeProfile` | yes, same signature | `src/services/dia/profileIntelligence.ts:50`, exported via `profileIntelligenceService` (:270) |
| `computeConnectionStrength` | yes, same signature | `src/services/dia/networkIntelligence.ts:37`, via `networkIntelligenceService` (:267). A different method of the same name, `computeConnectionStrength(connectionDegree: number, mutualCount: number): number`, is at `src/services/feedRankingService.ts:65` |
| `getSmartIntroductions` | yes (`limit = 10` default) | `src/services/dia/networkIntelligence.ts:76` |
| `getCommunityCluster` | yes, same signature | `src/services/dia/networkIntelligence.ts:192` |
| `analyzeContent` | yes, but synchronous: `function analyzeContent(content: string, contentType?: string): ContentAnalysis` with no Promise | `src/services/dia/contentIntelligence.ts:59`, via `contentIntelligenceService` (:220). An unrelated `async analyzeContent(` is at `src/services/diaComposerService.ts:20` |
| `findMatches` | yes, same signature | `src/services/dia/matchingEngine.ts:28`, via `matchingEngineService` (:287). An unrelated `findMatches(currentUserId, criteria)` is at `src/services/matchingService.ts:67` |
| `getTrends` | yes, same signature | `src/services/dia/trendIntelligence.ts:28`, via `trendIntelligenceService` (:199) |
| `generateNudges` | no implementation found | the nudge engine that exists is `diaNudgeEngine` (`src/services/dia/diaNudgeEngine.ts:634`, entry `processEvent` at :603), a different API; `generateNudgesForUser` at `supabase/functions/engagement-reminders/index.ts:57` is unrelated by name only |
| `trackNudgeInteraction` | no implementation found | nearest is `updateNudgeStatus` at `src/services/dia/diaNudgeStorage.ts:112` (client-side nudge storage) |
| `getConversationMetadata` | yes, same signature | `src/services/dia/conversationIntelligence.ts:24`, via `conversationIntelligenceService` (:205) |
| `getRegionalInsight` | yes, same signature | `src/services/dia/regionalIntelligence.ts:35`, via `regionalIntelligenceService` (:190) |
| `getInsightCards` | no implementation found | none |
| `checkTierLimit` | no implementation found under that name or signature | `supabase/functions/_shared/dia-core/limits.ts:15` `checkLimit(admin, userId, capability: string): Promise<LimitStatus>` is described in its own header (limits.ts:2) as "the checkTierLimit seam"; it calls `dia_check_limit`, which no migration defines |

Each `DiaCapability` value (the type `DIACapability` does not exist; this is `models.ts:17`):

| `DiaCapability` value | Implemented? | By what |
| --- | --- | --- |
| `reactive_query` | yes | `supabase/functions/dia-search/index.ts:26` (`const CAPABILITY = "reactive_query"`); also `dia-feedback/index.ts:44` uses `modelFor("reactive_query")` |
| `compose_read` | yes | `supabase/functions/dia-compose-read/index.ts:28` |
| `smart_replies` | yes | `supabase/functions/dia-smart-replies/index.ts:14` |
| `smart_compose` | yes | `supabase/functions/dia-smart-compose/index.ts:14` |
| `smart_chips` | no function declares it | listed only in `models.ts` and `consent.ts:14`; `dia-smart-chips/index.ts` (154 lines) does not import dia-core |
| `thread_summary` | yes | `supabase/functions/dia-thread-summary/index.ts:14` |
| `inbox_brief` | yes | `supabase/functions/dia-inbox-brief/index.ts:12` |
| `daily_pulse` | yes | `supabase/functions/dia-daily-pulse/index.ts:11` |
| `daily_insights` | yes | `supabase/functions/dia-daily-insights/index.ts:13` |
| `hub_intelligence` | no function declares it | `dia-hub-intelligence/index.ts` (357 lines) does not import dia-core |
| `trigger_prompt` | no function declares it | `dia-trigger-prompt/index.ts` (84 lines) does not import dia-core |
| `connect_nudges` | no function declares it | `generate-connect-nudges/index.ts` (116 lines) does not import dia-core |
| `opportunity_nudges` | no function declares it | `generate-opportunity-nudges/index.ts` (480 lines) does not import dia-core |
| `daily_brief` | no function declares it | `generate-daily-briefs/index.ts` (400 lines) does not import dia-core |
| `event_recommendations` | yes | `supabase/functions/get-event-recommendations/index.ts:5` |
| `suggest_usernames` | yes | `supabase/functions/suggest-usernames/index.ts:11` |
| `curate` | yes | `supabase/functions/curate-diaspora-events/index.ts:230` (`principalType: 'service', capability: 'curate'`) and :247 |

Outside `src/types/`, the only capability-shaped string in `src/` is `variant: 'smart_compose'` at `src/components/messaging/inbox/ChatThread.tsx:696`, a `variant` field value rather than a capability declaration.

#### Other DIA type files in `src/types`

`grep -rli dia src/types` lists 23 files, most of them through "diaspora" or "media". The files that declare DIA-named types (from `grep -oE "(interface|type|enum|const) …(Dia|DIA|dia)…"`):

| File | Lines (`wc -l`) | DIA-named declarations |
| --- | --- | --- |
| `src/types/dia.ts` | 478 | as above |
| `src/types/diaEngine.ts` | 562 | network graph (`NetworkEdge`, `ConnectionStatus` enum, `RelationshipSignals`), people/opportunity/space/event match results and their enums (`PeopleMatchType`, `MatchSurface`, `MatchPriority`, `MatchStatus`, `OpportunityMatchType`, `SpaceMatchType`, `EventMatchType`), nudges (`Nudge`, enums `NudgeType`, `NudgeCategory`, `NudgePriority`, `NudgeDeliveryChannel`, `NudgeFrequency`, `NudgeStatus`, `UserNudgeState`), chat (`DIAChatMessage`, `DIAChatContentType`, `DIAChatResult`, `DIAChatAction`, `DIAChatQuery`, enum `DIAChatIntent`, `DIAChatEntity`, `DIAChatContext`), `NetworkStats`, `DIAFeatureTier`. Its `NudgeType` and `NudgePriority` are enums, distinct from the same-named unions in `dia.ts` |
| `src/types/composer.ts` | 554 | `DIAAmbientConfig`, `DIAAssistRequest`, `DIAAssistResponse`, `DIASuggestion`, `DIASuggestionAction`, `DIASuggestionType`, `DIA_AMBIENT_DEFAULTS` |
| `src/types/feedTypes.ts` | 536 | `DIADataPoint`, `DIAFeedAction`, `DIAFeedInsightType`, `DIAInsightFeedContent` |
| `src/types/messagingPRD.ts` | 441 | `DIAConversationSuggestion`, `DIASmartReply` |
| `src/types/notificationSystem.ts` | 1139 | `DiaEvaluationResult` |
| `src/types/right-rail.ts` | 94 | `DiaBriefCard` |
| `src/types/ada.ts` | 304 | no DIA-named type; imports `FiveCModule`, `SubscriptionTier` from `./dia` |

`src/config/platform-architecture.ts:29` and `src/services/notificationIntelligence.ts:32` also import types from `@/types/dia`.

### A8. Cron and scheduling

**Sources searched:** every `cron.schedule` / `cron.unschedule` / `net.http_post` / `http_post` / `functions/v1/` occurrence in `supabase/migrations/*.sql`, `docs/*.sql`, `docs/*.md` and the repo root; `.github/workflows/*.yml` (three `schedule:` entries exist, `staging-auto-sync.yml:23`, `main-to-staging-sync.yml:23`, `check-links.yml:19`, none invokes a Supabase function). There is no `vercel.json`. No DB function in the migrations calls `net.http_post` against any DIA or A1 function; the only DB-function `net.http_post` is a message trigger to `send-push-notification` (`supabase/migrations/20260511205156_89ee985e-8b08-4cd2-bb5a-a634f9c29d8d.sql:17,73`), which is not a schedule.

#### Every `cron.schedule` in the tree

| # | Source file and line | Defined in | Job name | Schedule | What it invokes | Touches DIA or an A1 function |
|---|---|---|---|---|---|---|
| 1 | `supabase/migrations/20250805051355_935297c1-aebe-4b32-b568-9d418bfe2146.sql:221-225` | migration | `daily-engagement-reminders` | `0 13 * * *` | `SELECT public.enqueue_reminders_for_all_users();` (SQL function defined in the same file :7, redefined in `20260529033050_1c3d371e-ca08-4461-852a-08d51d43b950.sql:31`; writes `reminder_logs`, `user_engagement_tracking`) | No `dia_*` table and no edge function. Same job name as docs row 7. |
| 2 | `supabase/migrations/20250812054433_d03f3e3d-b58e-4c76-a368-ae94cdea2eb2.sql:6-18` | migration | `adin-nightly-health-daily` | `0 3 * * *` | `net.http_post` to `functions/v1/adin-nightly-health` (no such directory in `supabase/functions/`) | Unscheduled by `supabase/migrations/20260710185628_15e6c892-1eca-48f6-8271-0ec86db55dee.sql:3-4`. |
| 3 | `supabase/migrations/20251207001200_add_request_withdrawal.sql:82-86` (inside `DO` block :73-) | migration | `cleanup-expired-connection-requests` | `0 2 * * *` | `SELECT cleanup_expired_connection_requests()` | No |
| 4 | `supabase/migrations/20260508000000_dna_right_rail_data_layer.sql:294-298` and `supabase/migrations/20260508035459_488b8b8d-f7a4-4445-bffa-8a8baafc1626.sql:139-140` | migration | `refresh-pulse-metrics` | `*/5 * * * *` | `REFRESH MATERIALIZED VIEW CONCURRENTLY public.pulse_metrics_daily` (read by RPC `get_five_cs_pulse`, called from `src/hooks/useFiveCsPulse.ts:53`) | No (Five Cs right-rail pulse; dia-daily-pulse does not read it) |
| 5 | `supabase/migrations/20260511205433_0424b707-1dd4-4bfb-8a1e-577767368c4e.sql:47-60` | migration | `messaging-email-digest-daily` | `0 14 * * *` | `net.http_post` to `functions/v1/messaging-email-digest` | No |
| 6 | `docs/CRON-SETUP.sql:8-19` | docs only | `hourly-engagement-tracker` | `0 * * * *` | `net.http_post` to `https://ybhssuehmfnxrzneobok.supabase.co/functions/v1/engagement-tracker` | Yes (A1 engagement-tracker) |
| 7 | `docs/CRON-SETUP.sql:22-33` | docs only | `daily-engagement-reminders` | `0 10 * * *` | `net.http_post` to `.../functions/v1/engagement-reminders` | Yes (A1 engagement-reminders; writes `dia_nudges`) |
| 8 | `docs/CRON-SETUP.sql:36-47` | docs only | `weekly-curate-diaspora-events` | `0 11 * * 0` (comment: "every Sunday at 6 AM ET (11 AM UTC)") | `net.http_post` to `.../functions/v1/curate-diaspora-events` | Yes (curate-diaspora-events, Perplexity via dia-core constants) |
| 9 | `docs/EVENT-REMINDERS-CRON-SETUP.sql:26-37` | docs only | `daily-event-reminders` | `0 9 * * *` | `net.http_post` to `.../functions/v1/send-event-reminders` | No |
| 10 | `docs/M4-Recommendations-Reminders-Summary.md:44-53` (fenced SQL in markdown) | docs only | `send-event-reminders-daily` | `0 9 * * *` | `net.http_post` to `.../functions/v1/send-event-reminders` | No |

Notes on the docs-only DIA rows (6, 7, 8):
- `docs/ADIN-CRON-SETUP.md:21-29` says: "The cron setup SQL contains project-specific credentials. Do NOT run this as a migration" and instructs pasting `docs/CRON-SETUP.sql` into the SQL Editor by hand. Whether it was run on the project is not recorded in the tree.
- Each docs job sends `Authorization: Bearer <JWT>` whose payload decodes to `"role":"anon"` for project ref `ybhssuehmfnxrzneobok` (`docs/CRON-SETUP.sql:15,29,43`), and no `x-cron-secret` header. engagement-tracker (:91), engagement-reminders (:156) and curate-diaspora-events (:50) gate on `requireInternal` (`_shared/auth.ts:70-81`), which accepts only the service-role key as bearer or a matching `x-cron-secret`.
- Row 1 (migration) and row 7 (docs) share the job name `daily-engagement-reminders` with different schedules and targets.

Docs that label functions as scheduled without any `cron.schedule` definition: `docs/DIA_CODEBASE_AUDIT.md:84,85,87` ("Scheduled") and `:352,353,355` ("Cron (config)") for generate-connect-nudges, generate-opportunity-nudges, connection-health-analyzer; `docs/DNA_CONNECT_ASSESSMENT_2024-12-18.md:279` for generate-connect-nudges. `supabase/config.toml` holds no schedule keys.

#### Schedule coverage per function

| Function | Migration schedule | Docs-only schedule | Other caller (see A1 / other sections) |
|---|---|---|---|
| dia-compose-read | none | none | not traced here |
| dia-daily-insights | none | none | not traced here |
| dia-daily-pulse | none | none | not traced here |
| dia-feedback | none | none | not traced here |
| dia-hub-intelligence | none | none | not traced here |
| dia-inbox-brief | none | none | not traced here |
| dia-search | none | none | not traced here |
| dia-smart-chips | none | none | not traced here |
| dia-smart-compose | none | none | not traced here |
| dia-smart-replies | none | none | not traced here |
| dia-thread-summary | none | none | not traced here |
| dia-trigger-prompt | none | none | not traced here |
| curate-diaspora-events | none | `docs/CRON-SETUP.sql:36-47`, `weekly-curate-diaspora-events`, `0 11 * * 0` | not traced here |
| connection-health-analyzer | none | none | none (dead) |
| generate-connect-nudges | none | none | none (dead) |
| generate-daily-briefs | none | none | none (dead) |
| generate-opportunity-nudges | none | none | none (dead) |
| engagement-reminders | none | `docs/CRON-SETUP.sql:22-33`, `daily-engagement-reminders`, `0 10 * * *` | none (dead) |
| engagement-tracker | none | `docs/CRON-SETUP.sql:8-19`, `hourly-engagement-tracker`, `0 * * * *` | none (dead) |
| process-automated-nudges | none | none | none (dead) |
| watch-curated-sources | none | none | none (dead) |
| notify-window-decay | none | none | none (dead) |
| get-event-recommendations | none | none | `EventRecommendations.tsx:41`, unmounted (dead) |
| suggest-usernames | none | none | `/onboarding` (live) |
| ai-search / global-search | none | none | `searchService.ts`, unimported (dead) |
| transcribe-voice | none | none | guarded call in mounted tree (dead) |
| mcp | none | none | external MCP clients only (dead under rule) |

No `supabase/migrations/*.sql` file schedules or HTTP-invokes any dia-* function or any A1 function.

## Part B: canonical DIA, at origin/main `bf6b10c4`

Method: every file was read with `git show origin/main:PATH`; line counts are `git show ... | wc -l`. No database was queried. Status is decided only by a render chain from a mounted TanStack file route (member app `src/routes/`, admin app `admin/src/routes/`) or by a scheduled job. The admin console is a second TanStack Start app in `admin/` (24 files) whose `@` alias resolves to the root `src/` (`admin/vite.config.ts:72`, `admin/tsconfig.json:5-7`). There is no `supabase/config.toml` in the tree (`git show origin/main:supabase/config.toml` fails: "path ... does not exist"), so no function's `verify_jwt` setting is in the tree; `README.md:24` and `README.md:54` and `docs/security/PASS-02.md:254,261` state `verify_jwt` in prose only.

### Confirmations

| Claim | Confirmed / Corrected | Evidence file:line |
| --- | --- | --- |
| Edge functions `dia-compose-read`, `connect-suggest`, `admin-dia-note` exist | Confirmed | `supabase/functions/dia-compose-read/index.ts` (226 lines), `supabase/functions/connect-suggest/index.ts` (199), `supabase/functions/admin-dia-note/index.ts` (288) |
| `connect-suggest` uses model `claude-sonnet-5` | Confirmed | `supabase/functions/connect-suggest/index.ts:15` |
| `connect-suggest` writes card reasons from `connect_cards` facts | Confirmed | calls `sb.rpc("connect_cards", { p_lens: "suggested", p_limit: limit })` at `connect-suggest/index.ts:110`; sends `{id, first_name, facts}` at :135-139; strips `facts` and returns `reason` at :173-178 |
| `admin-dia-note` is company side | Confirmed | CORS answers only `ADMIN_ORIGIN` and `*.dna-admin-1oz.pages.dev` (`admin-dia-note/index.ts:33-44`); sole caller `admin/src/lib/overview.ts:222`; `admin_dia_notes` catalogued `company_side` (`20261002140000_b12b_overview.sql:877-880`) |
| Version numbers | Not in tree | No deployment version appears in any function file. Prose only: `docs/security/PASS-02.md:261` ("deployed v10" for dia-compose-read) |
| `_shared/` holds only `contact.ts`, `has-number.ts`, `mail.ts`, `origin.ts` | Confirmed | `git ls-tree -r origin/main supabase/functions/_shared` lists exactly those four |
| Functions share no core | Corrected (partly) | `admin-dia-note/index.ts:19` imports `hasNumber` from `../_shared/has-number.ts`. `dia-compose-read` and `connect-suggest` import nothing from `_shared`. No shared DIA client, prompt, schema or Anthropic wrapper exists |
| Each keeps its own `MODEL` constant | Confirmed | `dia-compose-read/index.ts:10`, `connect-suggest/index.ts:15`, `admin-dia-note/index.ts:21`, all `"claude-sonnet-5"` |
| `src/lib/dia.ts` is the composer client and also carries unfurl, place-resolve and media-upload clients | Confirmed, with one addition | `makeInfer` :54, `unfurl` :88 (link-unfurl), `resolvePlace` :150 (place-resolve), `makeUpload` :193 (media-upload); it also exports `signedMediaUrl` :217 (Storage `post-media`, not an Edge Function). Header :1 says "Client side of the four Edge Functions" |
| Components `DiaLine.tsx` and `DiaNote.tsx` | Confirmed | `src/components/strand/DiaLine.tsx` (92), `src/components/strand/DiaNote.tsx` (190). DiaNote is mounted only in the admin app |
| RPCs `messenger_dia_signals`, `messenger_dia_dismiss`, `dismiss_suggestion`, `dismiss_discovery_item`, `admin_dia_note_read`, `admin_dia_note_write` | Confirmed | `20261002130500_b14a_functions.sql:1762,1759` (public wrappers; private bodies :1541, :1499); `20260908233909_b4_connect_rpcs.sql:537`; `20260922150000_p2_discovery_schema.sql:327` (redefined `20260924100000_p2_discovery_lanes.sql:116`); `20261002140000_b12b_overview.sql:808,843` |
| Tables `post_dia`, `member_embeddings`, `dismissed_suggestions`, `discovery_dismissals`, `messenger_dia_dismissals`, `admin_dia_notes` | Confirmed | `20260906173329_b1_tables.sql:143`; `20260908233434_b4_connect_tables.sql:142,105`; `20260922150000_p2_discovery_schema.sql:295`; `20261002130500_b14a_functions.sql:1477`; `20261002140000_b12b_overview.sql:83` |
| pgvector 0.8.2 | Not in tree | `create extension if not exists vector with schema extensions;` carries no version (`20260908233434_b4_connect_tables.sql:11`); `git grep "0\.8\.2"` finds nothing |
| `member_embeddings` has no producer | Confirmed | no insert/update/upsert of the table in `src`, `admin`, `supabase/functions`, `scripts`, `.github`, or any migration; only reader is `tests/live-checks.cjs:221` |
| `admin_catalogue.dia_treatment`, under ruling 1300 | Confirmed | `20261002120000_b12c_recording_ledger.sql:914-915`; table comment :931-932 cites "rulings 1299, 1300" |

### B1. Edge functions

Grep for LLM or embedding use across `supabase/functions`, `src`, `admin`, `scripts` (`anthropic|claude-|openai|embedding|voyage|MODEL *=`) hits only these three functions. The other eight functions (`event-mail`, `event-media`, `guest-rsvp`, `link-unfurl`, `media-upload`, `onboarding`, `place-resolve`, plus `_shared`) call no model and generate no suggestion, reason or note.

| Function | Path (lines) | What it does | Model / provider | Tools | Reads | Writes | Shared core? | In config.toml (+verify_jwt) | Caller | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dia-compose-read | `supabase/functions/dia-compose-read/index.ts` (226) | Reads composer free text (8 to 4000 chars) and returns `{verb, confidence, fields, latency_ms}` or `null`; verb one of convene/collaborate/contribute/convey; confidence floor 0.6; fields filtered to a per-verb allowlist; in-memory rate limit 30 per 60 s per salted SHA-256 of JWT `sub` | Anthropic Messages API, `claude-sonnet-5` (:10), `npm:@anthropic-ai/sdk`, `effort: "low"`, `thinking: disabled`, JSON-schema structured output, `max_tokens: 300`, 3400 ms abort | none | request body only (`text`, `anchor.name`); env `ANTHROPIC_API_KEY`, `DIA_RATE_SALT` | nothing (console logs: `dia_read`, `dia_timeout`, `dia_error`, `dia_refusal`, `dia_rate_limited`, `dia_no_key`) | no `_shared` import | no config.toml in tree; not determinable from tree | `src/lib/dia.ts:63` `makeInfer` | live |
| connect-suggest | `supabase/functions/connect-suggest/index.ts` (199) | Calls `connect_cards('suggested')` as the member, sends each candidate's first name and facts to the model, keeps a reason only if 12 to 240 chars, no `%` or `!`, and every digit run appears in that candidate's facts; drops candidates without a valid reason; strips `facts` before returning `{items}` | Anthropic, `claude-sonnet-5` (:15), `effort: "low"`, thinking disabled, JSON schema `{reasons:[{id,reason}]}`, `max_tokens: 120*n+100`, 6000 ms abort | none | RPC `connect_cards(p_lens='suggested', p_limit<=12)` with caller JWT (:109-110) | nothing (logs `connect_suggest*`) | no `_shared` import | no config.toml in tree | `src/lib/connect.ts:286` `loadSuggestions` | live |
| admin-dia-note | `supabase/functions/admin-dia-note/index.ts` (288) | For the admin Overview: reads cache `admin_dia_note_read`; on miss reads five `admin_overview_*` projections, strips `series`/`points`, asks the model for at most five statements each naming one block; drops any statement that names no allowed block, has `%`/`!`, is outside 12 to 240 chars, or trips `hasNumber`; writes survivors to cache | Anthropic, `claude-sonnet-5` (:21), `effort: "low"`, thinking disabled, JSON schema with `block` enum, `max_tokens: 700`, 8000 ms abort | none | RPCs `admin_dia_note_read`, `admin_overview_window`, `admin_overview_mobilization`, `admin_overview_levers`, `admin_overview_network`, `admin_overview_company` (:135, :159-165) with caller JWT | RPC `admin_dia_note_write` (:228) | imports `hasNumber` from `../_shared/has-number.ts` (:19) | no config.toml in tree | `admin/src/lib/overview.ts:222` `readDiaNote` | live (admin app) |

#### B1.1 dia-compose-read

Caller chain: `src/routes/_shell.tsx:120` (and :98 on bare routes when signed in) renders `<ComposerShell />` -> `src/components/dna/ComposerShell.tsx:117` `const infer = useMemo(() => makeInfer(request?.anchor?.name), ...)` -> :191-206 `<Composer infer={infer} unfurl={unfurl} upload={upload} ...>` -> `src/components/strand/Composer.tsx:376-424` (debounce 700 ms, `MIN_INFER_CHARS` 8, client budget `THINK_BUDGET` 3500 at :84) -> `src/lib/dia.ts:54-85` -> `fetch(functionsUrl("dia-compose-read"))` at :63.

User message shape (:181-183): `The member is writing inside "${anchorName}".\n\nText:\n${text}` or `Text:\n${text}`.

<details><summary>System prompt: dia-compose-read SYSTEM (index.ts:72-78)</summary>

```text
You read a short post a member of DNA (Diaspora Network Africa) is typing and decide which of four acts it is, if any.

Acts (verb): convene = Host an Event (a gathering with a time or place: dinner, meetup, workshop, panel, call). collaborate = Start a Space (starting a group, project, working group, cohort, initiative and looking for people to build with). contribute = Post a Need (asking for time, skills, or in-kind help; volunteers, mentors, equipment, a venue). convey = Share a Story (a written piece, reflection, lesson, account of something that happened).

Return verb null when the text is a plain update or does not clearly fit one act. Confidence is your probability (0 to 1) that the verb is right.

Fields: include only fields that belong to the chosen verb and that the text states explicitly, copying the member's own words; never invent, infer, or complete a detail that is not there; omit anything absent. convene: title, when, place_name, doors. collaborate: title, category, roles. contribute: title, instrument, need, by. convey: title. title: a short title in the member's words (under 80 characters) when one is clearly implied. when: the date and time exactly as the member wrote them, in one string (for example "15 October at 19:00", "Thu 16 Oct, 7pm"); never a date the text does not state. place_name: the venue's name as written (for example "Front Room"), never the city, never a link, and never a city standing alone. doors: the doors-open time as written (for example "18:30"), only when the text says doors open at that time. instrument: "Skills" for expertise or professional help, "In-kind" for goods, equipment, or a venue, "Time" for hours, volunteering, or presence. roles: the people sought, as written. need: what is needed, as written. by: the deadline text as written.
```
</details>

Per-verb field allowlist (`VERB_SCHEMA`, :26-31): convene `title, when, place_name, doors`; collaborate `title, category, roles`; contribute `title, instrument, need, by`; convey `title`. The client renames convene fills to `convene.title`, `convene.when`, `convene.place_query`, `convene.doors` (`src/lib/dia.ts:33-38`).

#### B1.2 connect-suggest

Caller chain: `src/routes/_shell/connect.tsx:20` renders `<ConnectSurface>` -> `src/components/dna/ConnectSurface.tsx:303-308` `useQuery({ queryKey: ["connect","suggested",member.id], queryFn: () => loadSuggestions(12), enabled: lens === "suggested" || railWantsDia })` -> `src/lib/connect.ts:277-305` -> `fetch(functionsUrl("connect-suggest"))` at :286 (9000 ms client abort at :283). Client keeps only rows with a non-empty string `reason` (:298).

User message: `"Candidates:\n" + JSON.stringify(input)` where input is `[{id, first_name, facts}]` (:135-139, :148).

<details><summary>System prompt: connect-suggest SYSTEM (index.ts:58-65)</summary>

```text
You are DIA, the assistant inside DNA (Diaspora Network Africa). For each candidate you receive the member's first name and the facts that made the network suggest them to the reader. Write the reason the reader sees, in one or two plain sentences, addressed to the reader as "you".

Rules, all binding:
- Use only the facts given. Name the event, Space, corridor, shared value or mutual connection exactly as written. Never invent, infer, or embellish, and never speculate about what the two people could do together.
- Never use a number, a digit, a count, a percentage, a ranking word (top, best, most) or a strength word (strong, likely, close match). Say "you share" or "you were both at", never how many or how much.
- Mutual connections are named, never counted: "Lerato and Kwame are connections you share", never "two mutual connections".
- Sentence case. No exclamation marks, no em dashes, no emoji, no quotation marks around titles.
- Under two hundred characters per reason. Return one reason per candidate id, and skip a candidate rather than pad a thin fact set.
```
</details>

#### B1.3 admin-dia-note

Caller chain (admin app): `admin/src/routes/__root.tsx` -> `admin/src/routes/_console.tsx` (gate: signed in, live role, aal2; ConsoleShell) -> `admin/src/routes/_console/index.tsx:46` `createFileRoute("/_console/")({ component: Overview })` -> :147 `void readDiaNote(sb, grain, compare, tz, ctl.signal)` (on every grain/compare/tz change, after the page renders) -> `admin/src/lib/overview.ts:211-246` -> `fetch(functionsUrl("admin-dia-note"))` at :222 -> statements rendered by `<DiaNote title="DIA's note for the week" ...>` at `_console/index.tsx:834`.

User message: `"Aggregates:\n" + JSON.stringify(aggregates)` with keys `window, mobilization, levers, network, company` (:186-192, :205). Allowed blocks (:28): `Mobilization`, `By corridor`, `Source`, `The levers`, `The network`, `Controls`.

<details><summary>System prompt: admin-dia-note SYSTEM (index.ts:80-92)</summary>

```text
You are DIA, the assistant inside DNA (Diaspora Network Africa). You are reading the company's Overview: aggregate figures for one period against its comparison period, for the founder's weekly review. Write short statements that suggest what might explain a change, each resting on one block of the page.

Rules, all binding:
- Use only the aggregates given. Never name, describe or infer a person. There are no people in the data and there must be none in your words.
- Never use a number, a digit, a count, a percentage, a fraction, or a number in words (no "two", "half", "a dozen", "a third"). Say "rose", "fell", "held steady", "most of", "the rise", never how many or how much.
- Each statement is one or two plain sentences, under two hundred characters, in sentence case, with no exclamation mark, no em dash and no emoji.
- Each statement names the block it rests on in the block field: Mobilization, By corridor, Source, The levers, The network, or Controls.
- Direction, Depth and Source are part of the Mobilization block. A statement about direction, depth or source names Mobilization.
- The network block describes all joined members as of now, not the period. A statement about it never calls them new, recent or joiners in the period.
- A source or lever marked not_connected is not data; you may say that it is not yet connected, and nothing more about it.
- When the comparison is null, say once, resting on Controls, that there is no comparison period for this grain and the notes describe the period on its own.
- When the period holds no acts, say so once, resting on Mobilization, and say nothing that the figures do not support.
- Return at most five statements. Return fewer rather than pad.
```
</details>

Tests that read these functions (not callers): `tests/dia-latency.cjs` (dia-compose-read over HTTP), `tests/admin-dia-note.cjs` (static read of the prompt and preview origin), `tests/matrix.cjs:991,1252` and `tests/overview.cjs:324` (route stubs).

### B2. Shared core

`supabase/functions/_shared/` holds four files: `contact.ts` (298 lines), `has-number.ts` (11), `mail.ts` (389), `origin.ts` (24).

| Shared file | Purpose (from file) | Imported by |
| --- | --- | --- |
| `contact.ts` | Deno mirror of `src/lib/contact.ts`, company addresses and sender pairings | no `index.ts` imports it directly; `_shared/mail.ts:23` imports `NOTIFICATION_SENDER, fromHeader` from it, so it reaches `event-mail` and `guest-rsvp` through `mail.ts` |
| `has-number.ts` | `NUMBER_WORDS` regex and `hasNumber(s)` (digit or number word), ruling 1301; parity with `src/components/strand/DiaNote.tsx:38-41` enforced by `tests/strand-admin.cjs` per its header | `admin-dia-note/index.ts:19` |
| `mail.ts` | `goingEmail`, `linkEmail`, `readFacts`, `sendMail` | `event-mail/index.ts:16`, `guest-rsvp/index.ts:27` |
| `origin.ts` | `allowedOrigin`, `corsHeaders` for the app origin and `*.dna-web-application.pages.dev` | `event-mail/index.ts:17`, `guest-rsvp/index.ts:28` |

No DIA core exists. There is no shared Anthropic client, model constant, prompt module, output-schema module, validator, rate limiter or logging helper. Each of the three DIA functions constructs its own `new Anthropic({ apiKey, maxRetries: 0 })`, its own `AbortController` timer, its own `OUTPUT_SCHEMA` and `SYSTEM`, and its own CORS (dia-compose-read and connect-suggest use `Access-Control-Allow-Origin: *`; admin-dia-note uses its own admin-origin allowlist modelled on `_shared/origin.ts` but not importing it). The single shared DIA rule is `hasNumber`, used by admin-dia-note only; connect-suggest enforces its own digit rule inline (`validReason`, :78-86).

### B3. Client services and hooks

| Module | Path (lines) | Purpose | Inputs | Outputs | Consumers file:line | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `makeInfer` | `src/lib/dia.ts:54-85` (file 222) | Composer DIA read client | `anchorName?`, then `text` | `Inference \| null` (`{c, fields, confidence, latency_ms}`), convene fields namespaced; a `connect` verb is silenced (:72) | `src/components/dna/ComposerShell.tsx:117` | live (chain B1.1) |
| `unfurl` | `src/lib/dia.ts:88-109` | link-unfurl client (not DIA by behaviour) | `url` | `UnfurlMeta \| null` | `ComposerShell.tsx:205` -> `Composer.tsx:610`; `src/components/dna/MessengerThread.tsx:514` | live |
| `resolvePlace` | `src/lib/dia.ts:150-190` | place-resolve client (not DIA by behaviour) | `{action, q, session_token, proximity?, country_name?, mapbox_id?}` | `PlaceState` | `src/components/dna/ConveneForm.tsx:494,515,544` | live (ConveneForm mounted by `ComposerShell.tsx:132`) |
| `makeUpload` | `src/lib/dia.ts:193-214` | media-upload client (not DIA by behaviour) | `postId`, then `File` | `UploadedImage \| null` | `ComposerShell.tsx:118` | live |
| `signedMediaUrl` | `src/lib/dia.ts:217-222` | signed URL from Storage `post-media` (not DIA) | `storagePath` | `string \| null` | `src/lib/drafts.ts:30`, `src/lib/feed.ts:240` | live |
| `buildPayload` / `publishPost` (DIA record part) | `src/lib/publish.ts:120-129`, :134-140 (file 140) | Sends the composer's `diaRecord` as `payload.dia` to `publish_post`, which inserts `post_dia` | `ComposerState.diaRecord` | RPC `publish_post` | `ComposerShell.tsx` `onPublish` | live |
| drafts DIA record | `src/lib/drafts.ts:44` (file 81) | Restores `diaRecord` from a saved draft | draft row | `diaRecord` | ComposerShell draft restore | live |
| `loadSuggestions` | `src/lib/connect.ts:277-305` (file 381) | connect-suggest client | `limit` (12) | `ConnectCard[]` with `reason` | `src/components/dna/ConnectSurface.tsx:305` | live |
| `dismissSuggestion` | `src/lib/connect.ts:341-346` | RPC `dismiss_suggestion` | `targetId` | void / throws friendly error | `ConnectSurface.tsx:370` | live |
| `loadDiaSignals` | `src/lib/messenger.ts:200-204` (file 663) | RPC `messenger_dia_signals`, keeps first two rows | none | `DiaSignal[]` | `src/components/dna/MessengerSurface.tsx:272`, `src/components/dna/MessengerThread.tsx:255` (React Query key `SIGNALS_KEY(member.id)`) | live |
| `diaDismiss` | `src/lib/messenger.ts:349` | RPC `messenger_dia_dismiss` | `signal_key` | void | `MessengerSurface.tsx:451`, `MessengerThread.tsx:960` | live |
| `loadDiscovery` | `src/lib/discovery.ts:247-` (file 359), RPC at :253 | `convene_discovery` read (sections with `reason`, `lane_order`, `suggest`) | facets | `Discovery` incl. `laneOrder` (:295) | `src/components/dna/DiscoverySurface.tsx:458` query | live |
| `noteLaneAct` | `src/lib/discovery.ts:340-348` | RPC `note_lane_act` (learned lane order write) | `lane`, `act` open/save/follow | void, logs on failure | `DiscoverySurface.tsx:1058` (save), :1107 (follow), :1207 (open) | live |
| `dismissDiscoveryItem` | `src/lib/discovery.ts:351-359` | RPC `dismiss_discovery_item` | `eventId`, `lane` | void / throws | `DiscoverySurface.tsx:653` | live |
| `readDiaNote` | `admin/src/lib/overview.ts:211-246` (file 522) | admin-dia-note client | `sb, grain, compare, tz, signal` | `DiaStatementWire[]` (`[]` on any failure) | `admin/src/routes/_console/index.tsx:147` | live (admin) |

No React hook named for DIA exists (`git grep -E "useDia|useSuggest"` finds none); DIA state lives in component `useState` (`Composer.tsx:284-287`) and React Query keys.

### B4. Components and surfaces

| Component | Path (lines) | Mounts on | Trigger | States | Dismiss behaviour | Dismissal persists server-side? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DiaLine (Composer) | `src/components/strand/DiaLine.tsx` (92), used at `src/components/strand/Composer.tsx:1058` (file 1262) | composer sheet, every shell route via `src/routes/_shell.tsx:120` / :98 | text of 8+ chars, 700 ms debounce, not after a hand-picked verb | `null` (renders nothing), `thinking`, `done`; a disabled-chip reason replaces it in the same slot (:1040-1056) | "Not this?" clears proposal, fills from DIA, marks `diaRecord.member_overrode` (:493-502) | No dismissal table. The override is recorded in `post_dia.member_overrode` only if the post is published (`publish.ts:126`, `publish_post`), and in the draft row via `drafts.ts:44` | live |
| DiaLine (Messenger inbox) | `src/components/dna/MessengerSurface.tsx:644-649` (file 1005) | `src/routes/_shell/messages.tsx:24` | a `messenger_dia_signals` row with `request_id` | `done` only | "Dismiss" calls `diaDismiss(signal_key)` then refetches (:449-453) | Yes, `messenger_dia_dismissals` via `messenger_dia_dismiss`; anti-joined in `private.messenger_dia_signals` | live |
| DiaLine (Messenger thread) | `src/components/dna/MessengerThread.tsx:953-963` (file 1630) | `src/routes/_shell/messages.$thread.tsx:19` | a signal row whose `thread_id` is the open thread (:832) | `done` only | "Dismiss" calls `diaDismiss` then refetches | Yes, as above | live |
| DiaLine (Discovery sentence) | `src/components/dna/DiscoverySurface.tsx:1226-1228` (file 1992) | `src/routes/_shell/convene.tsx:42` | `convene_discovery.suggest` present, lens all or follow, member follows no host (:996-1006, :1372-1373, :1426) | `done` only | no escape passed (no `onNotThis`) | n/a | live |
| PostCard discovery reason row | `src/components/strand/PostCard.tsx:133,613` (file 968), fed by `DiscoverySurface.tsx:1199` `reason={reasonFor(lane, item.reason)}` | `/convene` | item in a lane in `REASON_LANES` with a named person/label | text or empty row with height held | card menu "Not this" (`DiscoverySurface.tsx:1140`) | Yes, `discovery_dismissals` via `dismiss_discovery_item`; anti-joined in `convene_discovery` | live |
| Connect "DIA suggests" rail widget | `src/components/dna/ConnectSurface.tsx:440-475` (file 954) via `setLeftRail`/`setRightRail` (:505-517) into `AppShell` | `/connect` at expanded: right rail when wide, left rail on My Network and Where otherwise (:300-302) | `suggested` query result, first three not dismissed | rows or `DIA_EMPTY` | no dismiss control in the rail; Connect button only | n/a (rows exclude cards dismissed on the lens) | live |
| MemberCard suggested reason | `src/components/dna/MemberCard.tsx:373-387` (file 499) | `/connect?lens=suggested` (`ConnectSurface.tsx:675-700`) | `context === "suggested"` and `m.reason` | reason paragraph; lens empty state; ghosts; LoadError | "Dismiss" button (`MemberCard.tsx:151-155`) -> `ConnectSurface.tsx:367-373` | Yes, `dismissed_suggestions` via `dismiss_suggestion`; anti-joined in `connect_cards` | live |
| RightRail (default) | `src/components/dna/Rails.tsx:125-132` (file 132) | `src/components/dna/AppShell.tsx:550` when no surface set a right rail | always renders empty | empty line only | none | n/a | live (always the empty state) |
| Profile visitor DIA line | `src/components/dna/ProfileSurface.tsx:2032-2046` (file 2049) inside `ProfileBody` (rendered at :951) | `src/routes/_shell/m.$handle.tsx:25` | `profile.viewer === "member"` and `profile_view.dia_line` non-null | text or nothing | none | n/a | live |
| DiaNote | `src/components/strand/DiaNote.tsx` (190) | admin only: `admin/src/routes/_console/index.tsx:834` (file 839); exported from `src/components/strand/index.ts:65` but not mounted in the member app | readDiaNote resolves | `loading` (three ghost lines), statements list with block links, none (`emptyText`) | none | n/a | live (admin); no member-app mount found |
| ConveneForm DIA tag | `src/components/dna/ConveneForm.tsx:130,573` (file 1191) | composer Convene form | a field DIA filled and the member has not edited | tag shown / hidden | editing the field | n/a | live |

Member-facing strings, verbatim:

- DiaLine (`DiaLine.tsx`): `DIA is reading` (:52); default escape `Not this?` (:24); Messenger passes `Dismiss`.
- Composer (`Composer.tsx:224-227`): `DIA read this as an Event.`, `DIA read this as a Space.`, `DIA read this as a Need.`, `DIA read this as a Story.`; field tag `DIA` (:692). Disabled-chip reason in the DiaLine slot (`ComposerShell.tsx:32-33`): `You are inside an event. Host a new one from the Feed or from Convene.`
- Messenger signal lines are built in SQL (`20261002130500_b14a_functions.sql:1555-1557, 1568-1569`): `<name> sent you a message request <age>` with `<age>` one of `today`, `yesterday`, `this week`, `last week`, `this month`, `a while ago` (`private.messenger_age_words`, :1520-1536); and `You and <name> were both at <event title> and have not spoken in a while`. Escape label `Dismiss`.
- Discovery sentence (`DiscoverySurface.tsx:1001-1006`): `You follow no host yet. <host> hosts <title>[ in <city>]; follow them and their events start here.`
- Discovery reasons (`DiscoverySurface.tsx:176-198`): `Because you follow <host>.`; `Because you follow <label, first letter lowercased>.`; `Curated by <editor>.`; `<host>, a connection, is hosting.`; `<name> is going.`; `<names joined> are going.` Menu item `Not this`; toasts `Fewer like this in your lanes.` and `That did not go through. Try again.` (:650, :659).
- Connect (`ConnectSurface.tsx`): rail title `DIA suggests` (:443, :513, :517); `DIA_EMPTY` (:84-85) `DIA has nothing to suggest yet. It suggests someone when you share an event, a Space, a corridor, or a connection with them.`; Suggested empty state (:692-693) title `No suggestions with a real reason yet.` body `DIA suggests someone when you share an event, a Space, a corridor, or a connection with them. Until then, this stays empty.` action `Browse members`; rail button `Connect`; card button `Dismiss` (`MemberCard.tsx:154`); reason text is the model's sentence.
- RightRail (`Rails.tsx:128-129`): `DIA suggests`; `DIA has nothing to suggest yet. Suggestions start once there is activity in your Feed.` AppShell fallback aria-label `DIA suggests` (`AppShell.tsx:538`).
- Profile DIA line (built in `profile_view`, `20260912090557_fix_pr_02_rulings_408_444.sql:455-466`): `<first name> fulfilled a Need in the Space you lead.` or `<first name> was at <event title>, which you hosted.`
- DiaNote (`DiaNote.tsx`): default title `DIA's note` (:45), admin passes `DIA's note for the week`; empty `DIA has nothing to add for this period.` (:48); closing (:42-43) `DIA suggests what might explain a change. It reads the same aggregates as this page and never a member. The numbers above are the record.`; loading aria-label `Loading DIA's note` (:107); block link aria-label `Go to <block>` (:165). Statements are the model's sentences.
- Feed lens (`src/lib/lens.ts:18`): For You scope `Same as All until DIA has a real signal to work from.`

### B5. Event bus and nudges

No event bus and no nudge engine exist. `git grep -iE "nudge|event ?bus|EventEmitter|pg_notify"` over `src`, `admin/src`, `supabase` finds only `src/lib/rails.ts:3` (comment: "No counts, no nudges."). What exists instead:

| Mechanism | Paths | What it carries | DIA consumer? |
| --- | --- | --- | --- |
| Window CustomEvent `PUBLISHED_EVENT` | `src/components/dna/ComposerShell.tsx:184-185` | `{id, verb}` after a publish, for the shell's toast | none found |
| Supabase Realtime Broadcast (Messenger) | `supabase/migrations/20261002130600_b14a_realtime.sql:57-187` triggers; `src/lib/messenger.ts:473-516` listeners | `thread_touch`, `request`, `invitation`, `message`, `cursor` on `inbox:{member}` / `thread:{id}` | none; DIA signals are re-read by React Query invalidation, not by broadcast |
| Behaviour log `surface_events` + `record_event` | `20261002120000_b12c_recording_ledger.sql` (table, rollups, cron) | client-recorded surface events, rolled up hourly | catalogued `dia_treatment = 'excluded'` (b12c :934-952 `surface_events` row); no DIA reader found |
| onboarding "company-facing signal" | `supabase/functions/onboarding/index.ts:1-12` (181) | console log lines only | none |
| Composer `DiaRecord` | `Composer.tsx:118-125`, `publish.ts:120-129`, `post_dia` | per-post verb, confidence, proposed fields, accepted, overrode, latency | written only; no reader in `src`/`admin`/functions; after `20261001120000_b12a_access_audit.sql:653` only `service_role` can select |

The only proactive DIA lines a member sees without typing are the Messenger signals, the Discovery sentence, the Connect suggestions and the Profile visitor line, each computed on read when the surface loads.

### B6. Schema, from the repository's migrations

#### Tables

**public.post_dia** (created `20260906173329_b1_tables.sql:143-155`)

| Column | Type |
| --- | --- |
| id | uuid pk default gen_random_uuid() |
| post_id | uuid not null references posts(id) on delete cascade, unique |
| verb | public.c_category (nullable) |
| confidence | numeric(4,3) check null or 0..1 |
| proposed_fields | jsonb not null default '{}' |
| accepted | boolean not null default false |
| member_overrode | boolean not null default false |
| latency_ms | integer check null or >= 0 |
| created_at | timestamptz not null default now() |

Grants: `insert`, `select` to authenticated; all to service_role (`20260906173427_b1_rls.sql:121-122,131-134`). Indexes: pk, unique(post_id). Writer: `publish_post` (security invoker), last defined `20260921160000_p2_event_slug.sql:75`, insert at :387-395.

```sql
create policy post_dia_member_insert on public.post_dia for insert to authenticated
with check (public.is_post_author(post_id));
create policy post_dia_admin_select on public.post_dia for select to authenticated using (public.is_admin());
create policy post_dia_service_role on public.post_dia for all to service_role using (true) with check (true);
-- 20261001120000_b12a_access_audit.sql:653
drop policy if exists post_dia_admin_select on public.post_dia;
```

**public.member_embeddings** (created `20260908233434_b4_connect_tables.sql:142-149`; extension `vector` in schema `extensions` at :11, no version pinned)

| Column | Type |
| --- | --- |
| member_id | uuid pk references members(id) on delete cascade |
| embedding | extensions.vector(1024) not null |
| updated_at | timestamptz not null default now() |

Index: `create index member_embeddings_hnsw_idx on public.member_embeddings using hnsw (embedding extensions.vector_cosine_ops);` (:147-148). Grants: none to anon/public/authenticated; all to service_role (`20260908233543_b4_connect_rls.sql:239-258`).

```sql
create policy member_embeddings_admin_select on public.member_embeddings for select to authenticated using (private.is_admin());
create policy member_embeddings_service_role on public.member_embeddings for all to service_role using (true) with check (true);
-- 20261001120000_b12a_access_audit.sql:699
drop policy if exists member_embeddings_admin_select on public.member_embeddings;
```

Producer: no producer found. Grepped `member_embeddings` and `embedding` (case-insensitive) across the whole tree excluding docs and `*.md`: hits are the creating migration, the RLS migration, the b12a policy drop, `src/lib/database.types.ts:1277`, and `tests/live-checks.cjs:221` (a select). No Edge Function, script, workflow or SQL function inserts or updates it, and no embedding provider is called anywhere.

**public.dismissed_suggestions** (created `20260908233434_b4_connect_tables.sql:105-112`)

| Column | Type |
| --- | --- |
| member_id | uuid not null references members(id) on delete cascade |
| dismissed_id | uuid not null references members(id) on delete cascade |
| created_at | timestamptz not null default now() |

pk (member_id, dismissed_id); check member_id <> dismissed_id. Grants: select, insert, delete to authenticated (`b4_connect_rls.sql:247`).

```sql
create policy dismissed_suggestions_owner_select on public.dismissed_suggestions for select to authenticated
using (member_id = (select auth.uid()));
create policy dismissed_suggestions_owner_insert on public.dismissed_suggestions for insert to authenticated
with check (member_id = (select auth.uid()) and not private.is_blocked((select auth.uid()), dismissed_id));
create policy dismissed_suggestions_owner_delete on public.dismissed_suggestions for delete to authenticated
using (member_id = (select auth.uid()));
create policy dismissed_suggestions_admin_select on public.dismissed_suggestions for select to authenticated using (private.is_admin());
create policy dismissed_suggestions_service_role on public.dismissed_suggestions for all to service_role using (true) with check (true);
-- 20261001120000_b12a_access_audit.sql:697
drop policy if exists dismissed_suggestions_admin_select on public.dismissed_suggestions;
```

Anti-join: `connect_cards` suggested branch, last defined `20260912090557_fix_pr_02_rulings_408_444.sql:619`, at :759 `and not exists (select 1 from public.dismissed_suggestions d where d.member_id = v_uid and d.dismissed_id = m.id)`.

**public.discovery_dismissals** (created `20260922150000_p2_discovery_schema.sql:295-325`)

| Column | Type |
| --- | --- |
| member_id | uuid not null references members(id) on delete cascade |
| event_id | uuid not null references events(id) on delete cascade |
| section | text not null, fk to convene_lenses(lens) at creation, check section <> 'all'; fk repointed to `convene_lanes(lane)` on update/delete cascade by `20260924100000_p2_discovery_lanes.sql:89-92` |
| created_at | timestamptz not null default now() |

pk (member_id, event_id, section); index `discovery_dismissals_event_idx (event_id)`. Grants: select to authenticated, all to service_role.

```sql
create policy discovery_dismissals_owner_select on public.discovery_dismissals
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy discovery_dismissals_admin_select on public.discovery_dismissals
  for select to authenticated
  using (private.is_admin());

create policy discovery_dismissals_service_role on public.discovery_dismissals
  for all to service_role
  using (true) with check (true);
-- 20261001120000_b12a_access_audit.sql:710
drop policy if exists discovery_dismissals_admin_select on public.discovery_dismissals;
```

Table comment: `DIA''s Not this? on Discovery (581, 1044): one event out of one section for one member, persisted server-side. Written by dismiss_discovery_item only.` Anti-join in `convene_discovery`, last defined `20260927120000_p2_discovery_without.sql:26`, at :418 and :430.

**public.messenger_dia_dismissals** (created `20261002130500_b14a_functions.sql:1477-1497`)

| Column | Type |
| --- | --- |
| member_id | uuid not null references members(id) on delete cascade |
| signal_key | text not null check length 1..120 |
| dismissed_at | timestamptz not null default now() |

pk (member_id, signal_key). Grants: select to authenticated, all to service_role.

```sql
create policy messenger_dia_dismissals_owner_select on public.messenger_dia_dismissals
  for select to authenticated
  using (member_id = (select auth.uid()));
create policy messenger_dia_dismissals_service_role on public.messenger_dia_dismissals
  for all to service_role using (true) with check (true);
```

Catalogue row: `admin_treatment 'exempt'`, `dia_treatment 'member_side'`, reason `DIA reads a dismissal to stay silent on what the member dismissed (1373).`

**public.admin_dia_notes** (created `20261002140000_b12b_overview.sql:83-100`)

| Column | Type |
| --- | --- |
| grain | text not null |
| compare | text not null |
| tz | text not null |
| period_start | timestamptz not null |
| definition_version | int not null |
| statements | jsonb not null default '[]', check jsonb_typeof = 'array' |
| written_at | timestamptz not null default now() |

pk (grain, compare, tz, period_start, definition_version). RLS enabled; `revoke all ... from public, anon, authenticated, service_role;` and no policy for any role (comment at :99-100 states this). Reached only through the two definer RPCs below. Catalogue row: `projected` / `company_side` (:877-880).

**public.member_lane_activity** (DIA by behaviour, created `20260926170100_p2_lane_activity.sql:17-44`): member_id uuid, lane text fk convene_lanes(lane), act text check in ('open','save','follow'), acted_at timestamptz default now(); pk (member_id, lane). Grants select, delete to authenticated.

```sql
create policy member_lane_activity_owner_select on public.member_lane_activity
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy member_lane_activity_owner_delete on public.member_lane_activity
  for delete to authenticated
  using (member_id = (select auth.uid()));

create policy member_lane_activity_service_role on public.member_lane_activity
  for all to service_role
  using (true) with check (true);
```

#### RPCs

| RPC | Signature | Returns | Security | Created | Last redefined | Body |
| --- | --- | --- | --- | --- | --- | --- |
| public.messenger_dia_signals | `()` | `table (signal_key text, line text, thread_id uuid, request_id uuid)` | sql, stable, security definer, search_path '' | `20261002130500_b14a_functions.sql:1762-1765` | same | Returns `private.messenger_dia_signals(auth.uid())`. |
| private.messenger_dia_signals | `(p_member uuid)` | same table | plpgsql, stable, security definer; execute revoked from public/anon/authenticated | b14a_functions :1541-1601 | same | Up to two rows: the oldest pending message request to the caller (sender name plus age in words) and the most recent quiet one-to-one thread (no message for 14 days) with a member sharing an accepted event attestation, both excluding blocked members and `messenger_dia_dismissals` keys. |
| public.messenger_dia_dismiss | `(p_key text)` | void | sql, volatile, security definer | b14a_functions :1759-1761 | same | Calls `private.messenger_dia_dismiss(p_key)`. |
| private.messenger_dia_dismiss | `(p_key text)` | void | plpgsql, volatile, security definer | b14a_functions :1499-1517 | same | Validates key length 1..120 and inserts `(require_uid(), key)` into `messenger_dia_dismissals` on conflict do nothing. |
| public.dismiss_suggestion | `(p_target uuid)` | void | plpgsql, security definer; execute to authenticated, service_role | `20260908233909_b4_connect_rpcs.sql:537-551` | same (no later `create ... dismiss_suggestion` in migrations) | Inserts `(auth.uid(), p_target)` into `dismissed_suggestions` unless target is null or self. |
| public.dismiss_discovery_item | `(p_event uuid, p_section text)` | void | plpgsql, security definer; execute to authenticated, service_role | `20260922150000_p2_discovery_schema.sql:327-353` | `20260924100000_p2_discovery_lanes.sql:116-140` | Validates section against `convene_lanes` and event existence, then inserts into `discovery_dismissals` on conflict do nothing. |
| public.admin_dia_note_read | `(p_grain text, p_compare text, p_tz text)` | jsonb | plpgsql, volatile, security definer; execute to authenticated | `20261002140000_b12b_overview.sql:808-841` | same | Runs `private.admin_overview_entry` (gate and read log), computes the window, returns `{statements, written_at, period_start, definition_version}` for the current period and definition version, or null. |
| public.admin_dia_note_write | `(p_grain text, p_compare text, p_tz text, p_statements jsonb)` | void | plpgsql, volatile, security definer; execute to authenticated | b12b_overview :843-869 | same | Same gate; refuses a non-array with 22023; upserts the row for the current period and definition version. |
| public.note_lane_act (behaviour) | `(p_lane text, p_act text)` | void | plpgsql, security definer | `20260926170100_p2_lane_activity.sql:46-72` | same | Validates lane and act, upserts the caller's `member_lane_activity` row with `now()`. |
| public.convene_discovery (behaviour) | `(p_lens, p_format, p_price, p_when, p_families, p_home, p_places, p_home_rung, p_q, p_without)` | jsonb | plpgsql, stable, no `security definer` clause (invoker) | `20260922150100_p2_discovery_projection.sql:64` | `20260927120000_p2_discovery_without.sql:26-525` | Builds lanes with per-item `reason` jsonb, removes dismissed items, applies floors, orders sections by the member's `member_lane_activity` in the last seven days then lane position, and returns `lane_order`, `suggest`, homes, follows, subscriptions. |
| public.connect_cards (behaviour) | `(p_lens text, p_filters jsonb, p_cursor text, p_limit integer)` | jsonb | plpgsql, stable, security definer | `20260908233909_b4_connect_rpcs.sql:167` | `20260912090557_fix_pr_02_rulings_408_444.sql:619` | For `suggested`: candidates with at least one shared event attestation, Space, corridor, vocabulary overlap or second-degree mutual, minus blocked, dismissed and non-`none` relationships, ordered by an internal `hits` count, each card carrying a words-only `facts` object. |

#### admin_catalogue.dia_treatment

Created with the table in `20261002120000_b12c_recording_ledger.sql:908-919`: `dia_treatment text not null default 'excluded' check (dia_treatment in ('member_side', 'company_side', 'excluded'))`, plus `dia_reason text`. Table RLS: service_role all (:926-929) and `live_arms` select (:1029-1032); no client grant. Every pre-existing public table was inserted as `unreviewed` / `excluded` with reason `Unreviewed tables are excluded until ruled (1300).` (:957-972). Rows with a non-excluded value in the tree: `mobilization_ledger` and `surface_event_rollups` (`company_side`, b12c :934-939); `threads`, `thread_members` (`member_side`, `20261002130300_b14a_threads.sql:192-198`); `message_requests` (`member_side`, `20261002130400_b14a_messages.sql`); `messenger_dia_dismissals` (`member_side`); `admin_dia_notes` (`company_side`). `messages` is `excluded` with reason `DIA never reads message text (8, 1300, 1350); structure is read through private.messenger_dia_signals.` `corridors` updated to `excluded` (b12b :882-888). Readers of the column: `tests/live-db.cjs:3047-3064` only; no function, Edge Function or app code reads it.

### B7. Types and scope

`src/lib/database.types.ts` (4563 lines) carries: tables `admin_catalogue` (:123, `dia_treatment: string`), `admin_dia_notes` (:153), `discovery_dismissals` (:453), `dismissed_suggestions` (:496), `member_embeddings` (:1277, `embedding: string`), `member_lane_activity` (:1535), `messenger_dia_dismissals` (:2456), `post_dia` (:2753); functions `admin_dia_note_read` (:3789), `admin_dia_note_write` (:3793), `connect_cards` (:3826), `convene_discovery` (:3849), `dismiss_discovery_item` (:3865), `dismiss_suggestion` (:3869), `messenger_dia_dismiss` (:3917), `messenger_dia_signals` (:3918), `note_lane_act` (:4194). `dia_treatment` is typed `string`, not a union.

```ts
// database.types.ts:3917-3926
      messenger_dia_dismiss: { Args: { p_key: string }; Returns: undefined };
      messenger_dia_signals: {
        Args: never;
        Returns: {
          line: string;
          request_id: string;
          signal_key: string;
          thread_id: string;
        }[];
      };
```

Hand-written TS types:

```ts
// src/components/strand/DiaLine.tsx:7
export type DiaLineState = "thinking" | "done" | null;

// src/components/strand/Composer.tsx:89-95
export type Inference = {
  c: ComposerVerb;
  fields: Partial<Record<FieldKey, string | boolean>>;
  line?: string | undefined;
  confidence?: number | undefined;
  latency_ms?: number | undefined;
};

// src/components/strand/Composer.tsx:118-125
export type DiaRecord = {
  verb: ComposerVerb | null;
  confidence: number | null;
  proposed_fields: Partial<Record<FieldKey, string | boolean>>;
  accepted: boolean;
  member_overrode: boolean;
  latency_ms: number | null;
};

// src/lib/messenger.ts:21
export type DiaSignal = Database["public"]["Functions"]["messenger_dia_signals"]["Returns"][number];

// admin/src/lib/overview.ts:209
export type DiaStatementWire = { text: string; block: string };

// src/lib/discovery.ts:64-76
export type DiscoveryReason =
  | { kind: "soon"; starts_at: string; mode: EventMode }
  | { kind: "weekend"; starts_at: string; mode: EventMode }
  | { kind: "online"; starts_at: string | null; mode: EventMode }
  | { kind: "filling"; starts_at: string | null; mode: EventMode }
  | { kind: "fresh"; published_at: string }
  | { kind: "curated"; editor: DiscoveryPerson; line: string }
  | { kind: "follow"; host: DiscoveryPerson }
  | { kind: "taste"; family: string; label: string }
  | { kind: "near"; home: { id: string; city: string } }
  | { kind: "near"; place: { city: string } }
  | { kind: "network"; host: DiscoveryPerson }
  | { kind: "network"; going: DiscoveryPerson[] };

// src/lib/discovery.ts:332
export type LaneAct = "open" | "save" | "follow";
```

Also: `DiaStatement` and `DiaNoteProps` (`DiaNote.tsx:8-30`); `ConnectCard.reason?: string` (`src/lib/connect.ts:136-137`); `ProfileView.dia_line?: string` (`src/lib/profile.ts:140`); the server-side `Verb` union `"convene" | "collaborate" | "contribute" | "convey"` (`dia-compose-read/index.ts:19`); `Facts` and `Card` (`connect-suggest/index.ts:32-39`); `Statement` (`admin-dia-note/index.ts:58`). No DIA enum exists in Postgres; `post_dia.verb` reuses `public.c_category`.

### B8. Cron and scheduling

None found that touches DIA. Grepped `cron.schedule(` across `supabase/` and `schedule:|cron:` across `.github/workflows/` (no workflow has a `schedule`). The seven pg_cron jobs in migrations:

| Job | Schedule | Command | Migration |
| --- | --- | --- | --- |
| dna_second_degree_nightly | `15 2 * * *` | `select private.refresh_second_degree()` | `20260908233543_b4_connect_rls.sql:190` |
| dna_introduction_expiry_nightly | `45 2 * * *` | `select private.purge_expired_introductions()` | `20260913220000_r482_485_introduction_expiry_purge.sql:101-105` |
| dna_mobilization_derive_hourly | `7 * * * *` | `private.derive_mobilization_v1(...)` | `20261002120000_b12c_recording_ledger.sql:882` |
| dna_surface_events_rollup_hourly | `12 * * * *` | `private.rollup_surface_events(...)` | b12c :886 |
| dna_surface_events_partition_monthly | `10 2 20 * *` | `private.surface_events_ensure_partitions()` | b12c :890 |
| dna_surface_events_retention_daily | `35 3 * * *` | `private.surface_events_drop_old_partitions()` | b12c :894 |
| dna_messenger_former_member_purge_daily | `50 3 * * *` | `private.messenger_purge_former_members()` | `20261002130800_b14a_retention.sql:74` |

Indirect only: `dna_second_degree_nightly` refreshes `second_degree`, which `connect_cards('suggested')` reads for the `fof`/`mutuals` fact that connect-suggest turns into a reason. No job refreshes `member_embeddings`, warms `admin_dia_notes`, or computes Messenger signals; all DIA output is computed on request.

### B9. DIA by behaviour, not by name

| Behaviour | Where it lives (paths, functions, RPCs) | Status (chain) |
| --- | --- | --- |
| Learned lane order on Discovery (ruling 1160 in code comments) | write: `public.note_lane_act` (`20260926170100_p2_lane_activity.sql:46`) into `public.member_lane_activity`; read: `convene_discovery` orders sections `order by g.learned_at desc nulls last, g.position` and returns `lane_order` (`20260927120000_p2_discovery_without.sql:436-454, 490-497`); client `src/lib/discovery.ts:295,340-348`; placement of the Communities sentence by `laneOrder` at `DiscoverySurface.tsx:1383-1389` | live: `src/routes/_shell/convene.tsx:42` -> `DiscoverySurface` -> `loadDiscovery` (:458) / `noteLaneAct` (:1058, :1107, :1207) |
| Per-item "why" reasons on Discovery cards | `convene_discovery` builds `reason` jsonb per candidate (e.g. :266); rendered to words by `reasonFor` (`DiscoverySurface.tsx:176-198`) into `PostCard`'s reason row | live: same chain, `DiscoverySurface.tsx:1199` |
| Discovery suggestion for a member who follows no host | `convene_discovery` `suggest` (`20260927120000_p2_discovery_without.sql:456-488`, earliest published upcoming event by another host); sentence composed client-side `DiscoverySurface.tsx:996-1006`; shown in `DiaLine` (:1227) | live: convene.tsx -> DiscoverySurface |
| Discovery lane floors (internal thresholds) | `private.convene_threshold(section)` read in `convene_discovery` (:454); floors seeded `20260924100000_p2_discovery_lanes.sql:84-87` | live (inside the projection) |
| Discovery dismissals as anti-join | `discovery_dismissals` via `dismiss_discovery_item`; `not exists` at `20260927120000_p2_discovery_without.sql:418,430`; client-side optimistic filter `DiscoverySurface.tsx:993,1478,1586` | live: menu "Not this" `DiscoverySurface.tsx:1140` -> `dismiss` :648 -> `dismissDiscoveryItem` |
| Composer proposal line (proposed, never selected) | `Composer.tsx:376-424` (proposal state, fills tagged DIA), `DIA_LINE` :224-227, `notThis` :493-502, publish gate `!(proposed && !verb)` :653; record to `post_dia` via `publish.ts:120-129` and `publish_post` | live: `_shell.tsx:120` -> `ComposerShell` -> `Composer` -> `makeInfer` -> dia-compose-read |
| Disabled-chip reason in the DIA slot | `ComposerShell.tsx:32-33,122-125` (`IN_EVENT_REASON`), `Composer.tsx:513-521,1040-1056` | live: composer opened with an event anchor |
| Messenger DIA signals (SQL templates, no model) | `private.messenger_dia_signals` (`20261002130500_b14a_functions.sql:1541-1601`), `messenger_age_words` (:1520-1536), dismissal anti-join via `messenger_dia_dismissals` | live: `/messages` -> `MessengerSurface.tsx:272,644`; `/messages/$thread` -> `MessengerThread.tsx:255,953` |
| Connect Suggested ranking and facts | `connect_cards('suggested')` (`20260912090557_fix_pr_02_rulings_408_444.sql:696-783`): candidate facts, internal `hits` sum ordering, `dismissed_suggestions` anti-join, `facts` object | live: via connect-suggest (B1.2) |
| Connect suggestion reasons (model-written) | `supabase/functions/connect-suggest/index.ts`; rendered `MemberCard.tsx:373-387` and `ConnectSurface.tsx:462-466` | live: `/connect` -> ConnectSurface -> loadSuggestions |
| Rail placement rules for DIA | `ConnectSurface.tsx:300-302` (comment "DIA appears once per screen (ruling 167)"; `railWantsDia = expanded && (wide \|\| lens === "network" \|\| lens === "where")`), :505-517 (`setLeftRail` / `setRightRail` with label `DIA suggests`); store `src/lib/rail-store.ts`; shell fallback `AppShell.tsx:530,538,550` renders `RightRail` (`Rails.tsx:125-132`, always empty); `Pane.tsx:27-29` comment states DIA is absent while a pane is open (ruling 612) | live: AppShell from `_shell.tsx`; Connect overrides from `/connect` |
| Profile visitor DIA line (SQL template, no model) | `profile_view` `v_dia` (`20260912090557_fix_pr_02_rulings_408_444.sql:454-466`, returned as `dia_line` :505); rendered `ProfileSurface.tsx:2032-2046` | live: `src/routes/_shell/m.$handle.tsx:25` -> ProfileSurface -> ProfileBody (:951) |
| Profile attestation rail "placed by DIA" | comments `src/components/dna/AttestationRail.tsx:2`, `src/lib/profile.ts:249`; actual order is `row_number() over (partition by a.c_category order by a.attested_at desc)`, 12 per C, in `public.public_attestations` (`20260912090557_fix_pr_02_rulings_408_444.sql:874`) | live: ProfileSurface -> `CSheetBody` (:1018) -> `AttestationRail` (`CSheetBody.tsx:111`); placement is recency, no DIA logic found |
| Feed "For You" lens | `src/lib/lens.ts:14-19` scope string; header :2 says it renders identically to All | live (no personalization code found) |
| Admin Overview note (company side) | B1.3; `admin_dia_notes`, `admin_dia_note_read/write`, `DiaNote` | live (admin app) |
| No-number rule shared between DiaNote and functions | `supabase/functions/_shared/has-number.ts`, `src/components/strand/DiaNote.tsx:38-41` (dev console warning only), `connect-suggest` `validReason` :78-86 (own inline rule) | live in admin-dia-note and DiaNote; inline in connect-suggest |
| DIA treatment catalogue | `admin_catalogue.dia_treatment` (B6) | no runtime reader found; read by `tests/live-db.cjs:3047` |
| Embeddings | `member_embeddings` + hnsw index; CLAUDE.md:330 names a separate provider | dead: no producer and no reader found |
| "help me reply" carve-out | CLAUDE.md:92 | no implementation found (`git grep -i "help me reply"` over `src`, `admin`, `supabase` returns nothing) |
| onboarding signal | `supabase/functions/onboarding/index.ts:1-12` emits console log shapes "to the same place connect-suggest already logs" | live as logging; no DIA consumer found |

DIA references in CLAUDE.md (origin/main): line 79 (Discovery lanes, dismissals and learned order: `convene_discovery` answers the lanes in it and names it as `lane_order`, from `public.member_lane_activity`, which `note_lane_act` alone writes); line 91 (confirmed flags never set "by inference or by DIA"); line 92 ("DIA reads message metadata only; no query it runs may select message body content unless the member invoked a \"help me reply\" action in that thread."); line 330 ("Embeddings come from a separate provider (Anthropic has no embedding model); DIA on Claude writes explanations only. Matching may rank internally and must display only words ... Dismissals persist and are applied as an anti-join. If the rules stage yields nothing real, render nothing."); line 341 (Suggested reaches the client through `connect-suggest` with the member's own JWT "so nothing the member may not see becomes a fact DIA reasons over"). `docs/GAPS.md` mentions DIA 12 times (e.g. :187 DIA rail rows inheriting `connect_cards('suggested')`).

## Part C: the crosswalk

One row per capability, covering Part A and Part B. Locations and statuses repeat the chains given in
the tables above; "proto" paths are in `jodombrown/dna` at `b6cd764b`, "canon" paths in
`jodombrown/dna-web-application` at `bf6b10c4`. Where both codebases hold a capability by different
mechanisms, both are named and the row reads "in both".

| Capability | Prototype location and status | Canonical location and status | Presence |
| --- | --- | --- | --- |
| Model access layer | `supabase/functions/_shared/dia-core/model-call.ts` and `models.ts`: Lovable gateway `https://ai.gateway.lovable.dev/v1/chat/completions`, `google/gemini-2.5-flash` and `google/gemini-3-flash-preview`; live through every `callModel` function (A1, A2) | each function's own `new Anthropic(...)`, `MODEL = "claude-sonnet-5"` in `dia-compose-read/index.ts:10`, `connect-suggest/index.ts:15`, `admin-dia-note/index.ts:21`; live (B1, B2) | in both |
| Shared DIA core (identity, limits, audit, model routing) | `supabase/functions/_shared/dia-core/` (7 files); live, imported by 12 functions (A2) | none; `_shared/` holds `contact.ts`, `has-number.ts`, `mail.ts`, `origin.ts` (B2) | prototype only |
| Per-call audit log | `dia-core/audit.ts` `writeEvent` into `dia_events`; live as code, table created by no migration (A2, A6) | console log lines only (`dia_read`, `connect_suggest*`); no table (B1) | prototype only |
| Per-member usage limit | `dia-core/limits.ts` `checkLimit`/`recordUsage` via RPCs `dia_check_limit`, `dia_record_usage`, which no migration defines (A2, A6) | in-memory 30 per 60 s per hashed `sub`, `dia-compose-read` only (B1) | in both |
| Consent check before a model call | `dia-core/consent.ts` `checkConsent` reading `dia_preferences.in_app_enabled`; dead, zero call sites (A2) | none found | prototype only |
| Composer verb and field read | `dia-compose-read` via `src/hooks/useDIACompose.ts:127` in `UniversalComposer`; live (A1, A3, A4) | `dia-compose-read` via `src/lib/dia.ts:63` `makeInfer` in `Composer`/`DiaLine`; live (B1, B3, B4) | in both |
| Per-post record of the composer proposal | none found; the read writes only `dia_events` (A1) | `post_dia` written by `publish_post`; live write, no reader (B5, B6) | canonical only |
| Ask DIA: question answering with platform tools and web search | `dia-search` with 9 tools in `_shared/dia-tools.ts`, Perplexity `sonar`; `DiaSheet`/`DiaSearch` from header "Ask DIA" and `AskDiaCta`; live (A1, A4) | none found | prototype only |
| Ask DIA answer feedback | `dia-feedback` from `DiaSearch.tsx:327` into `dia_messaging_feedback`; live (A1) | none found | prototype only |
| Ask DIA history and saved answers | `DiaHistory` (`dia_query_log`), `DiaSaved` (`dia_saved_answers`) in `DiaSheet`; live (A4) | none found | prototype only |
| Ask DIA prompt chips | `dia-smart-chips` (rule-based, no model) from `AskDiaCta.tsx:66` and `DiaSheet.tsx:37`; live, desktop rail and sheet (A1, A3) | none found | prototype only |
| Daily global insight topics | `dia-daily-insights` into `dia_insights`, called from `DiaInsights.tsx:70`; chain exists, the call is rejected 401 by `requireInternal`, no schedule (A1) | none found | prototype only |
| Daily brief cards in the right rail | `DiaDailyBrief` via RPC `get_dia_daily_brief`, interactions via `record_brief_interaction`, table `dia_brief_cards`; live, desktop `/dna/feed`. Generator `generate-daily-briefs` dead (A1, A3, A4) | none found | prototype only |
| Cross-module daily pulse narrative | `dia-daily-pulse` via `useDailyPulseBrief` on `/dna/convey` Daily tab; live (A1, A3) | none found | prototype only |
| Morning inbox brief | `dia-inbox-brief` via `MorningBriefBanner` and `InboxDigestSheet` on `/dna/feed`; live, sends message bodies to the model (A1, A3) | none found | prototype only |
| Inbox digest with snooze and mark read | `useInboxDigest`, `useBriefActions`, table `dia_brief_snoozes`; live (A3) | none found | prototype only |
| Smart replies in a thread | `dia-smart-replies` via `useDiaSmartReplies` in `ChatThread`; live only through the profile message overlay, `MESSAGING_ENABLED = false` (A1, A3) | none found | prototype only |
| Opening-message suggestions | `dia-smart-compose` via `useDiaSmartCompose`; live only through the overlay (A1, A3) | none found | prototype only |
| Thread summary and action items | `dia-thread-summary` via `useThreadSummary` and `MessageSummaryDrawer`; live only through the overlay (A1, A3, A4) | none found | prototype only |
| Messaging DIA preferences and telemetry | `dia_messaging_prefs`, `dia_messaging_events`, `dia_messaging_feedback`; live (A3) | none found | prototype only |
| Messenger signals from metadata (waiting request, quiet tie with a co-attendee) | none found | `private.messenger_dia_signals` (SQL template, no model), `DiaLine` in `/messages` and `/messages/$thread`; live (B4, B6, B9) | canonical only |
| Prompt to reconnect a dormant tie | `connectCards.ts` `connection_reactivation` via `DIAHubSection` on `/dna/connect`; live, desktop (A3) | quiet-thread line in `private.messenger_dia_signals`; live (B6) | in both |
| Member suggestions | `connectCards.ts` (skill_suggestion, network_growth, mutual_bridge) via `DIAHubSection`; live, desktop. `rpc_dia_recommend_people` dead (A3) | `connect_cards('suggested')` via `connect-suggest`, `MemberCard`, "DIA suggests" rail; live (B1, B4, B9) | in both |
| Model-written reason for a suggestion | none found; prototype card copy is templated (A4) | `connect-suggest` with output filter `validReason`; live (B1) | canonical only |
| Suggestion dismissal | localStorage `dia_dismissed_cards`, 7-day expiry, `diaCardService.ts:82-83`; live (A3, A4) | `dismissed_suggestions` via `dismiss_suggestion`, anti-joined in `connect_cards`; live (B6) | in both |
| Event suggestions on the Convene surface | `conveneCards.ts` via `DIAHubSection` on `/dna/convene`; `ConveneDIADiscoveryCard`; live (A3, A4) | `convene_discovery` lanes with per-item `reason`; live (B3, B9) | in both |
| Model-scored event recommendations | `get-event-recommendations` (0 to 100 `score`); dead, only caller `EventRecommendations.tsx` is unimported (A1) | none found | prototype only |
| Discovery item "Not this" | localStorage `dia_dismissed_cards` for discovery cards; live (A4) | `discovery_dismissals` via `dismiss_discovery_item`, anti-joined; live (B6) | in both |
| Learned lane order | none found | `note_lane_act`, `member_lane_activity`, `convene_discovery.lane_order`; live (B9) | canonical only |
| Suggestion for a member who follows no host | none found | `convene_discovery.suggest`, sentence in `DiscoverySurface.tsx:1001-1006`; live (B9) | canonical only |
| Event page DIA insight (cross-C bridge) | `DIADetailInsight` with `crossCCards.ts` on `/dna/convene/events/:id`; live (A3, A4) | none found | prototype only |
| Post-event and hosting prompts | `conveneCards.ts` post_event_follow_up and hosting_nudge (live via `convene_hub`); `PastEventDiaNudge` on `/dna/convene/mine`, `share_story` variant only (A3, A4) | none found | prototype only |
| Curated diaspora events from web search | `curate-diaspora-events` (Perplexity `sonar`); schedule only in `docs/CRON-SETUP.sql:36-46`, request would be rejected 401 (A1, A8) | none found | prototype only |
| Curated source change watching | `watch-curated-sources`; dead, no caller (A1) | none found | prototype only |
| Client event bus and nudge engine | `diaEventBus.ts`, `diaNudgeEngine.ts` (18 templates); live, writes browser localStorage `dia_nudges`, output never read (A5) | none found (B5) | prototype only |
| Periodic client checks | `diaPeriodicCheck.ts`, every 30 minutes; one of four checks live (`checkUpcomingEvents`) (A5) | none found | prototype only |
| Server nudge inbox | `/dna/nudges` `NudgeCenter` via `useDiaNudges` on table `dia_nudges`; live read, table dropped by `20260707001538_...` in migrations; server generators all dead (A1, A3, A6) | none found | prototype only |
| Post-connection nudge card | `PostConnectionNudgeCard`; live, mobile `/dna/connect/network` (A4) | none found | prototype only |
| DIA preferences page and notification preferences | `/dna/preferences` (`dia_preferences`), `NotificationPreferencesPanel`; live (A3, A4) | none found | prototype only |
| Email unsubscribe through DIA preferences | `unsubscribe-email` on `dia_preferences`; live through email links (A1) | none found | prototype only |
| Engagement scoring and reminders | `engagement-tracker`, `engagement-reminders`; dead, schedules only in docs (A1, A8) | none found | prototype only |
| Connection health scoring | `connection-health-analyzer`; dead, no caller (A1) | none found | prototype only |
| Opportunity matching nudges | `generate-opportunity-nudges`, `generate-connect-nudges`, `process-automated-nudges`; dead, no caller (A1) | none found | prototype only |
| Onboarding username suggestions | `suggest-usernames` from `UsernameStep.tsx:71` on `/onboarding`; live (A1) | none found | prototype only |
| Model-assisted platform search | `ai-search`, `global-search`; dead, `searchService.ts` unimported (A1) | none found | prototype only |
| Voice message transcription | `transcribe-voice` (OpenAI `whisper-1`); dead, guarded by `transcriptionEnabled = false` (A1) | none found | prototype only |
| MCP server for external agents | `mcp`; dead under the tracing rule, listed in `.lovable/mcp/manifest.json` (A1) | none found | prototype only |
| Region and hub intelligence feed | `dia-hub-intelligence` (no model); dead, no caller (A1) | none found | prototype only |
| Server-triggered DIA prompt | `dia-trigger-prompt` calling `trigger_dia_prompt`, which no migration defines; dead (A1) | none found | prototype only |
| Profile insight on a member's profile | `DiaUniqueInsight` on `/dna/:username`, teaser branch only (A4) | none found | prototype only |
| Profile visitor shared-history line | none found | `profile_view.dia_line` (SQL template), `ProfileSurface.tsx:2032-2046`; live (B4, B9) | canonical only |
| Pulse bar count of DIA connection recommendations | `usePulseBar.ts:70-76` reading `dia_recommendations`; live (A3) | none found | prototype only |
| DIA in the right rail | `AskDiaCta` and `DiaDailyBrief` in `DnaRightRail`, desktop `/dna/feed`; live (A4) | "DIA suggests" rail from `ConnectSurface.tsx:440-517`; default `RightRail` always empty (B4, B9) | in both |
| Embeddings | `user_vectors`, `entity_vectors` (JSONB, 32 dimensions, SQL `cosine_similarity`); producer `src/services/embeddingService.ts` has no importer, dead (A6) | `member_embeddings` (`vector(1024)`, hnsw); no producer and no reader, dead (B6) | in both |
| Intelligence services (profile, network, relationship strength, content, trend, regional, event matching, matching engine, conversation) | nine modules under `src/services/dia/`, only re-exported by an unimported `index.ts`; dead (A3) | none found | prototype only |
| Stubbed Collaborate, Contribute and Convey cards | `collaborateCards.ts`, `contributeCards.ts` (canned), `conveyCards.ts`; dead (A3) | none found | prototype only |
| `DIACoreService` interface and capability types | `src/types/dia.ts`, `src/types/diaEngine.ts`, `DiaCapability` in `dia-core/models.ts:17`; interface not implemented (A7) | none; DIA types are per-component (B7) | prototype only |
| Admin DIA usage and cost analytics | `/admin/dia` `DiaAdminPage` reading `dia_daily_stats`, `dia_popular_queries`, `dia_cost_tracking` (views created under `adin_` names only); live, admin (A3, A4, A6) | none found | prototype only |
| Company Overview note | none found | `admin-dia-note`, `admin_dia_notes`, `DiaNote` on the admin Overview; live, admin app (B1, B4, B6) | canonical only |
| Output filter against numbers in DIA text | none found as a validator; prompts forbid em-dashes and `dia-smart-compose/index.ts:164` replaces U+2014 (A1) | `_shared/has-number.ts` in `admin-dia-note`; `validReason` in `connect-suggest`; live (B2) | canonical only |
| DIA treatment catalogue per table | none found | `admin_catalogue.dia_treatment`; no runtime reader, read by `tests/live-db.cjs` (B6) | canonical only |
| Feed "For You" lens | none found | `src/lib/lens.ts:14-19`, renders as All, no personalisation code (B9) | canonical only |
| Demo DIA section | `DemoDIA` on `/demo`, static copy; live (A4) | none found | prototype only |

## Appendix: session code check on canonical main (Guardrail 2)

Run before branching, on `origin/main` at `bf6b10c49e1dbd51d9292ff37fb6f94410be5982`, last 20
commits, identities read from the GitHub API (ruling 379), classified by how they landed (920).

| Class | Commits |
| --- | --- |
| Merge of a `claude/*` branch through the GitHub button (author `jodombrown` 214720153, committer `web-flow` 19864447) | `bf6b10c4` (#92, `claude/handoff-41-c-messenger-surfaces`), `bf3af708` (#93, `claude/tender-dijkstra-hmzds3`), `c859d540` (#90, `claude/handoff-45-b-migration-u0ud0b`) |
| Commits by `claude` (81847) carried inside those merges | `94aaadc4`, `a4623c70`, `0941b153`, `17ffdf09`, `eb2f40eb`, `a7cfb3d0`, `0567f3e2`, `63640ff3`, `076b5e48`, `7aa4be02`, `0042dca9`, `e47af8ed`, `4d424f82`, `49b6b8d9`, `1bf81b12`, `18127be3`, `ff0c91e2` |
| Arrived outside a `claude/*` merge | none |
| Touched `.lovable/` | none (the last `.lovable/` change on main is `b5798d6`, 2026-09-26, outside the window) |
| `gpt-engineer-app[bot]` (159125892) | none |

Main's first-parent chain over the window is the three merges only. Result: clean.
