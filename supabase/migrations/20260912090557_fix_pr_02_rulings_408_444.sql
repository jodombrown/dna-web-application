-- ---------------------------------------------------------------------------
-- Fix PR 02, Session 15: the triage findings routed to Code. Rulings 415, 416, 424, 435, 436, 439,
-- 442 and 444, with 225 (committed before applied), 269 (no persistent write to canonical data
-- outside this migration's own seed), 382 (live_arms gets the arms' grants and nothing more).
--
-- Applied to the canonical project only after the commit carrying this file is pushed (ruling
-- 225). The filename takes the version the project records when it is applied.
--
-- A. Schema, RLS and functions
--   415, IB-18   connection_requests has one writer at the API as well as the app: the insert grant
--                to authenticated and the B1 insert policy go; send_introduction (SECURITY DEFINER)
--                remains the only path; service_role keeps its grant.
--   416          public.feed carries author_name, author_handle and author_avatar_path, null unless
--                private.can_see_core admits the author to the viewer.
--   435          attestations.accepted_at; every projection over attestations reads only accepted
--                rows. Existing rows are backfilled from created_at. No writer changes (143).
--   436, 243     The cold-start corridor row: Los Angeles to Accra, in agriculture.
--   439, F20     publish_post refuses a post_links.url that does not start with http:// or https://.
--   442, F23     private.rate_limit over private.rate_limit_hits; callers send_introduction,
--                onboard_who, the member_blocks insert (trigger) and media-upload (through
--                public.rate_limit_check; the private schema is not routable over PostgREST, which
--                PASS-02 proved, so the RPC the Edge Function calls lives in public and is granted
--                to authenticated and service_role only). Ceilings are internal and never rendered.
--   424, W30     save_profile_section's media section checks the media registry, not a path shape.
--   401, 417     send_introduction's message is optional (the profile's Connect entry sends none).
--   444, F25     live_arms may read supabase_migrations.schema_migrations for the drift arm.
--   218, 382     live_arms may build the new arms' fixtures on the two ruling 218 test accounts:
--                an attestation row for the accepted_at arm, and nothing else.
--
-- Ceilings set here (per member): send_introduction 20 per hour; onboard_who 10 per hour;
-- member_blocks insert 30 per hour; media-upload 60 per hour. They are reported in the closing
-- report and appear nowhere a member can read.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 415, IB-18: one writer into connection_requests, at the API too.
-- ---------------------------------------------------------------------------
revoke insert on table public.connection_requests from authenticated;
drop policy if exists connection_requests_member_insert on public.connection_requests;

-- ---------------------------------------------------------------------------
-- 435: an attestation renders only once accepted. Backfill every existing row.
-- ---------------------------------------------------------------------------
alter table public.attestations add column if not exists accepted_at timestamptz;
update public.attestations set accepted_at = created_at where accepted_at is null;
comment on column public.attestations.accepted_at is 'Ruling 435 (guardrail 5 of ruling 47): the attested member accepts before it renders. Null is unaccepted and invisible to every projection.';

-- ---------------------------------------------------------------------------
-- 436, 243: the corridor row. The sector must match a row of the industries vocabulary.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.industries i where i.name = 'Agriculture') then
    raise exception 'corridor seed: the industries vocabulary has no Agriculture row (ruling 243)';
  end if;
end $$;
insert into public.corridors (id, diaspora_place, continental_place, sector, status)
values ('los-angeles-accra-agriculture', 'Los Angeles', 'Accra', 'Agriculture', 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 442: the rate-limit store and function. RLS on, no grant to any API role; the function is
-- SECURITY DEFINER and is the only reader and writer. Pruning happens inside the call.
-- ---------------------------------------------------------------------------
create table if not exists private.rate_limit_hits (
  member_id uuid not null,
  action text not null,
  at timestamptz not null default now()
);
create index if not exists rate_limit_hits_member_action_at_idx
  on private.rate_limit_hits (member_id, action, at);
alter table private.rate_limit_hits enable row level security;
revoke all on table private.rate_limit_hits from public, anon, authenticated, service_role;
comment on table private.rate_limit_hits is 'Ruling 442: one row per counted call. Read and written only by private.rate_limit; no API role holds any grant.';

create or replace function private.rate_limit(p_member uuid, p_action text, p_window interval, p_ceiling integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_member is null or p_action is null or p_ceiling is null or p_ceiling < 1 then
    return false;
  end if;
  delete from private.rate_limit_hits h
  where h.member_id = p_member and h.action = p_action and h.at < now() - p_window;
  select count(*) into v_hits from private.rate_limit_hits h
  where h.member_id = p_member and h.action = p_action;
  if v_hits >= p_ceiling then
    return false;
  end if;
  insert into private.rate_limit_hits (member_id, action) values (p_member, p_action);
  return true;
end;
$$;
revoke execute on function private.rate_limit(uuid, text, interval, integer) from public, anon, authenticated, service_role;

-- The one RPC an Edge Function may call. The action names the ceiling; the client never supplies
-- a window or a count, and the answer is a boolean the function turns into words.
create or replace function public.rate_limit_check(p_action text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'rate_limit_check: not signed in' using errcode = '42501';
  end if;
  if p_action = 'media_upload' then
    return private.rate_limit(v_uid, 'media_upload', interval '1 hour', 60);
  end if;
  raise exception 'rate_limit_check: unknown action' using errcode = '22023';
end;
$$;
revoke execute on function public.rate_limit_check(text) from public, anon;
grant execute on function public.rate_limit_check(text) to authenticated, service_role;

-- The member_blocks insert, bounded by a trigger so the plain insert under
-- member_blocks_owner_insert (ruling 216) stays the one writer.
create or replace function private.rate_limit_block_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.rate_limit(new.blocker_id, 'block', interval '1 hour', 30) then
    raise exception 'Too many blocks for now. Try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.rate_limit_block_insert() from public, anon, authenticated;
drop trigger if exists on_member_block_rate_limit on public.member_blocks;
create trigger on_member_block_rate_limit
  before insert on public.member_blocks
  for each row execute function private.rate_limit_block_insert();

-- ---------------------------------------------------------------------------
-- 416: the feed view carries the author's core row, under private.can_see_core. security_invoker
-- stays, so the audience predicate is still the posts RLS and the members join runs as the viewer.
-- ---------------------------------------------------------------------------
create or replace view public.feed
with (security_invoker = true)
as
select p.id,
  p.author_kind,
  p.author_id,
  p.created_by,
  p.c_category,
  p.body,
  p.anchor_kind,
  p.anchor_id,
  p.created_object_kind,
  p.created_object_id,
  p.audience,
  p.status,
  p.published_at,
  p.created_at,
  case when p.author_kind = 'member' and private.can_see_core(p.author_id) then mm.name end as author_name,
  case when p.author_kind = 'member' and private.can_see_core(p.author_id) then mm.handle end as author_handle,
  case when p.author_kind = 'member' and private.can_see_core(p.author_id) then mm.avatar_path end as author_avatar_path
from public.posts p
left join public.members mm on p.author_kind = 'member' and mm.id = p.author_id
where p.status = 'published'
order by p.published_at desc, p.id desc;

-- ---------------------------------------------------------------------------
-- 435 continued: every projection over attestations reads accepted rows only. Bodies are the last
-- committed definitions with the one predicate added; nothing else changes in them.
-- ---------------------------------------------------------------------------
-- ---- profile_view (B4A rebuild, B5 stance; ruling 435) ----
create or replace function public.profile_view(p_handle text default null, p_as_public boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_viewer uuid;
  m public.members%rowtype;
  v_owner boolean;
  v_private boolean;
  v_first text;
  v_tier text;
  v_sections jsonb := '{}'::jsonb;
  v_seg_fields jsonb;
  v_variants jsonb;
  v_rel text := 'none';
  v_following boolean := false;
  v_mutuals jsonb := '[]'::jsonb;
  v_shared_spaces jsonb := '[]'::jsonb;
  v_anchored boolean := false;
  v_badges jsonb := '[]'::jsonb;
  v_dia text;
  v_vis jsonb;
  -- Ruling 187: the label for this member's stance, read from the one vocabulary table.
  v_stance_label text;
  -- Ruling 198 and B4A section 6. The two directions are separate facts and do separate work.
  -- v_blocked_by_me: the caller has blocked this member. It is the caller's own row, so it may be
  -- told to them (viewer_blocked), and it does not touch their audience scope.
  -- v_blocked_by_them: this member has blocked the caller. This is ruling 198's "blocked party",
  -- and the only case that drops a viewer to the anonymous rule.
  -- v_blocked: either direction, which is private.is_blocked. It governs discovery and contact,
  -- symmetric by ruling 198, so neither party gets a relationship object.
  v_blocked_by_me boolean := false;
  v_blocked_by_them boolean := false;
  v_blocked boolean := false;
  -- The viewer the audience rules see. It is v_viewer for everyone except a viewer this member has
  -- blocked, who is scoped to the anonymous rule: the lowest audience, the same rows a signed-out
  -- stranger gets.
  v_scope uuid;
  v_rows jsonb;
  v_obj jsonb;
  v_tmp text;
  -- Ruling 212: the three audiences that decide the five core-row attributes. One
  -- evaluation each, used by both the section and the member object, so the two can
  -- never disagree the way F2 found them disagreeing.
  v_see_origin boolean;
  v_see_where boolean;
  v_see_stance boolean;
begin
  if p_handle is null then
    if v_caller is null then return null; end if;
    select * into m from public.members where id = v_caller;
  else
    select * into m from public.members where handle = lower(p_handle);
  end if;
  if m.id is null then return null; end if;
  select s.label into v_stance_label from public.member_stances s where s.stance = m.stance;

  v_owner := v_caller is not null and v_caller = m.id and not coalesce(p_as_public, false);
  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  -- Ruling 198: the block drops the viewer's scope; it does not hide the page. Hiding it would
  -- disclose the block (a page that opened yesterday and 404s today says exactly what happened) and
  -- be circumvented by signing out anyway. So the gate below still reads v_viewer, and a blocked
  -- member who could open this profile before can still open it, seeing what the public sees.
  -- Read directly rather than through private.is_blocked, which cannot tell the two apart. The
  -- lookup is the (blocker_id, blocked_id) primary key both ways round.
  if v_caller is not null and v_caller <> m.id then
    v_blocked_by_me := exists (
      select 1 from public.member_blocks b where b.blocker_id = v_caller and b.blocked_id = m.id);
    v_blocked_by_them := exists (
      select 1 from public.member_blocks b where b.blocker_id = m.id and b.blocked_id = v_caller);
  end if;
  v_blocked := v_blocked_by_me or v_blocked_by_them;
  -- B4A section 6: only the party who was blocked falls to the anonymous rule. The blocker keeps
  -- their own viewer, so ruling 220's anchor still admits Anchored sections to them, and the
  -- revoked edge is what removes Connections sections from both sides rather than a scope drop.
  v_scope := case when v_blocked_by_them then null else v_viewer end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;
  v_private := m.profile_private and not v_owner;
  -- Ruling 213: a Private member's row is the owner's and their existing connections', and nobody
  -- else's. A non-connection's handle lookup returns the same NULL an unshared profile already
  -- returns anonymously, so the two cases are indistinguishable and existence is not disclosed.
  -- The owner's own "View as public" evaluates the same rule and gets the same NULL.
  if v_private and not private.is_connected(v_caller, m.id) then return null; end if;
  v_first := split_part(m.name, ' ', 1);
  v_tier := case
    when exists (select 1 from public.attestations a where a.member_id = m.id and a.accepted_at is not null) then 'attested'
    when m.identified_at is not null then 'identified'
    else 'account' end;
  v_see_origin  := v_owner or (not v_private and private.admit_section(m.id, 'origin', v_scope));
  v_see_where   := v_owner or (not v_private and private.admit_section(m.id, 'where', v_scope));
  v_see_stance := v_owner or (not v_private and private.admit_section(m.id, 'stance', v_scope));

  -- A section is admitted when the owner is looking, or when private.admit_section allows the
  -- viewer (null viewer = the anonymous rule, which is what "View as public" renders).

  -- About
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_scope)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Stance: the current variant's fields; the owner also gets every variant.
  if v_see_stance then
    select jsonb_strip_nulls(jsonb_build_object(
      'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))
    into v_seg_fields from public.member_stance_details d where d.member_id = m.id and d.stance = m.stance;
    v_seg_fields := coalesce(v_seg_fields, '{}'::jsonb);
    if m.stance = 'exploring' then
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_seg_fields := v_seg_fields || jsonb_build_object('interests', v_rows);
    end if;
    if v_owner then
      select coalesce(jsonb_object_agg(d.stance, jsonb_strip_nulls(jsonb_build_object(
        'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))), '{}'::jsonb)
      into v_variants from public.member_stance_details d where d.member_id = m.id;
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_variants := v_variants || jsonb_build_object('exploring', coalesce(v_variants -> 'exploring', '{}'::jsonb) || jsonb_build_object('interests', v_rows));
      v_sections := v_sections || jsonb_build_object('stance', jsonb_build_object('stance', m.stance, 'fields', v_seg_fields, 'variants', v_variants));
    elsif m.stance is not null and (
      v_seg_fields - 'interests' <> '{}'::jsonb or jsonb_array_length(coalesce(v_seg_fields -> 'interests', '[]'::jsonb)) > 0) then
      v_sections := v_sections || jsonb_build_object('stance', jsonb_build_object('stance', m.stance, 'fields', v_seg_fields));
    end if;
  end if;

  -- Origin and heritage
  if v_see_origin then
    select jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country, 'heritage', o.heritage, 'pathway', o.pathway))
    into v_obj from (select 1) s left join public.member_origin o on o.member_id = m.id;
    v_obj := coalesce(v_obj, jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country)));
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('origin', v_obj); end if;
  end if;

  -- Where I am
  if v_see_where then
    v_obj := jsonb_strip_nulls(jsonb_build_object('current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz));
    if v_owner or m.current_place is not null or m.current_country is not null then v_sections := v_sections || jsonb_build_object('where', v_obj); end if;
  end if;

  -- What I work on
  if v_owner or (not v_private and private.admit_section(m.id, 'work', v_scope)) then
    v_obj := jsonb_build_object(
      'focus', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_focus_areas j join public.focus_areas t on t.name = j.name where j.member_id = m.id),
      'industries', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_industries j join public.industries t on t.name = j.name where j.member_id = m.id),
      'regions', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name where j.member_id = m.id));
    if v_owner or jsonb_array_length(v_obj -> 'focus') + jsonb_array_length(v_obj -> 'industries') + jsonb_array_length(v_obj -> 'regions') > 0 then
      v_sections := v_sections || jsonb_build_object('work', v_obj);
    end if;
  end if;

  -- Skills
  if v_owner or (not v_private and private.admit_section(m.id, 'skills', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_skills j join public.skills t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('skills', jsonb_build_object('skills', v_rows)); end if;
  end if;

  -- Languages
  if v_owner or (not v_private and private.admit_section(m.id, 'languages', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_languages j join public.languages t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('languages', jsonb_build_object('languages', v_rows)); end if;
  end if;

  -- What I am here for
  if v_owner or (not v_private and private.admit_section(m.id, 'intent', v_scope)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_intents j join public.intents t on t.name = j.name where j.member_id = m.id;
    select n.note into v_tmp from public.member_intent n where n.member_id = m.id;
    v_obj := jsonb_strip_nulls(jsonb_build_object('intent', v_rows, 'note', v_tmp));
    if v_owner or jsonb_array_length(v_rows) > 0 or v_tmp is not null then v_sections := v_sections || jsonb_build_object('intent', v_obj); end if;
  end if;

  -- Links
  if v_owner or (not v_private and private.admit_section(m.id, 'links', v_scope)) then
    select coalesce(jsonb_object_agg(l.kind, l.url), '{}'::jsonb) into v_obj from public.member_links l where l.member_id = m.id;
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('links', v_obj); end if;
  end if;

  -- Activity (ruling 125): grounded-or-empty, projections over attestations, space_roles, stories.
  if v_owner or (not v_private and private.admit_section(m.id, 'convene', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', e.title,
      'sub', 'Attested by ' || private.third_party_label(am.id, a.attester_role, v_scope is null)
        || case when v_scope is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,
      'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.events e on e.id = a.object_id and a.object_kind = 'event'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'convene' and a.accepted_at is not null;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convene', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'collaborate', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', s.title,
      'sub', (case r.role when 'lead' then 'Lead' else 'Member' end) || ' since ' || to_char(r.created_at, 'Mon YYYY'),
      'completed', s.status = 'completed', 'when', r.created_at) order by r.created_at desc), '[]'::jsonb)
    into v_rows from public.space_roles r join public.spaces s on s.id = r.space_id
    where r.member_id = m.id and r.status = 'active';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('collaborate', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'contribute', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', o.title, 'sub', 'Fulfilled a Need from ' || private.third_party_label(am.id, a.attester_role, v_scope is null), 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'contribute' and a.accepted_at is not null;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('contribute', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'convey', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object('title', s.title, 'sub', 'Story', 'when', s.created_at, 'post_id', p.id) order by s.created_at desc), '[]'::jsonb)
    into v_rows from public.stories s
    left join public.posts p on p.created_object_kind = 'story' and p.created_object_id = s.id and p.status = 'published'
    where s.author_member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convey', v_rows); end if;
  end if;

  -- Badges (ruling 123): one per attested context, in order Convene, Collaborate, Contribute.
  if v_owner or (not v_private and private.admit_section(m.id, 'badges', v_scope)) then
    select coalesce(jsonb_agg(jsonb_build_object('c', g.c, 'items', g.items) order by g.ord), '[]'::jsonb) into v_badges
    from (
      select a.c_category as c,
        case a.c_category when 'convene' then 1 when 'collaborate' then 2 else 3 end as ord,
        jsonb_agg(jsonb_build_object(
          'object', coalesce(e.title, s.title, o.title, 'Attested'),
          'attester', private.third_party_label(am.id, a.attester_role, v_scope is null),
          'role', case when v_scope is not null or private.named_publicly(am.id) then a.attester_role end,
          'when', a.attested_at) order by a.attested_at desc) as items
      from public.attestations a
      join public.members am on am.id = a.attester_member_id
      left join public.events e on a.object_kind = 'event' and e.id = a.object_id
      left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
      left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
      where a.member_id = m.id and a.accepted_at is not null
      group by a.c_category
    ) g;
  end if;

  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136).
  -- The blocked party gets none of it (ruling 198): no mutual name, no shared Space, no anchored
  -- qualification and no DIA line, which is B4A section 7's "does not render" list. The blocker
  -- keeps all of it (B4A section 7, Done Means 5): a block does not remove them for the blocker.
  -- The relationship object itself is withheld from both, on v_blocked below, so neither party is
  -- offered a Connect action or a Follow, and it is absent rather than 'none' so the surface
  -- renders no action at all.
  if v_viewer is not null and not v_owner and not v_blocked_by_them then
    -- Brief 4 (rulings 157, 168, 214): one relationship rule for every surface, and the window
    -- reaches no surface as itself. private.relationship_display maps it to sent.
    v_rel := private.relationship_display(v_viewer, m.id);
    v_following := exists (select 1 from public.member_follows f where f.follower_id = v_viewer and f.member_id = m.id);
    v_anchored := private.shares_anchor(v_viewer, m.id);
    if not v_private then
      -- Up to three connections in common, as names (never a count).
      with mine as (
        select c.other_id as other from public.member_connections c
        where c.member_id = v_viewer and not private.is_blocked(v_viewer, c.other_id)
      ), theirs as (
        select c.other_id as other from public.member_connections c where c.member_id = m.id
      )
      select coalesce(jsonb_agg(jsonb_build_object('name', mm.name, 'handle', mm.handle, 'avatar_path', mm.avatar_path) order by mm.name), '[]'::jsonb)
      into v_mutuals
      from (select other from mine intersect select other from theirs limit 3) x
      join public.members mm on mm.id = x.other;
      select coalesce(jsonb_agg(s.title order by s.title), '[]'::jsonb) into v_shared_spaces
      from public.space_roles ra join public.space_roles rb on rb.space_id = ra.space_id
      join public.spaces s on s.id = ra.space_id
      where ra.member_id = v_viewer and rb.member_id = m.id and ra.status = 'active' and rb.status = 'active';
      -- DIA's line (ruling 125): only with a real reason, in words.
      select 'Fulfilled a Need in the Space you lead.' into v_dia
      from public.attestations a join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
      where a.member_id = m.id and a.c_category = 'contribute' and a.accepted_at is not null and o.space_id is not null
        and exists (select 1 from public.space_roles r where r.space_id = o.space_id and r.member_id = v_viewer and r.role = 'lead' and r.status = 'active')
      order by a.attested_at desc limit 1;
      if v_dia is not null then
        v_dia := v_first || ' fulfilled a Need in the Space you lead.';
      else
        select v_first || ' was at ' || e.title || ', which you hosted.' into v_dia
        from public.attestations a join public.events e on e.id = a.object_id and a.object_kind = 'event'
        where a.member_id = m.id and e.host_member_id = v_viewer and a.accepted_at is not null
        order by a.attested_at desc limit 1;
      end if;
    end if;
  end if;

  -- The owner's audience settings, every section with its default.
  if v_owner then
    select jsonb_object_agg(s.section, private.section_audience(m.id, s.section)) into v_vis
    from unnest(enum_range(null::public.profile_section)) as s(section);
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'viewer', case when v_owner then 'owner' when v_viewer is null then 'anon' else 'member' end,
    -- Ruling 212 (F2a, F2b): the five section-gated attributes are admitted or omitted by the same
    -- predicate the sections use, with the explicit viewer already in scope, anonymous callers
    -- included. Omit, never blank: a withheld attribute produces no key at all.
    'member', jsonb_strip_nulls(jsonb_build_object(
      'id', m.id, 'handle', m.handle, 'name', m.name, 'headline', m.headline,
      'avatar_path', m.avatar_path, 'cover_path', m.cover_path, 'cover_focus', m.cover_focus,
      'origin_country', case when v_see_origin then m.origin_country end,
      'current_place', case when v_see_where then m.current_place end,
      'current_country', case when v_see_where then m.current_country end,
      'local_tz', case when v_see_where then m.local_tz end,
      'stance', case when v_see_stance then m.stance end,
      'stance_label', case when v_see_stance then v_stance_label end,
      'pattern', m.pattern, 'tier', v_tier)),
    'switches', case when v_owner then jsonb_build_object('private', m.profile_private, 'shared', m.profile_shared) end,
    'private', v_private,
    'sections', v_sections,
    'badges', v_badges,
    'visibility', v_vis,
    'relationship', case when v_viewer is not null and not v_owner and not v_blocked
                         then jsonb_build_object('state', v_rel, 'following', v_following) end,
    -- B4A section 4: the overflow reads Block or Unblock from the caller's own block, and nothing
    -- in this payload says whether this member has blocked the caller.
    'viewer_blocked', v_blocked_by_me,
    'mutuals', v_mutuals,
    'shared_spaces', v_shared_spaces,
    'anchored', v_anchored,
    'dia_line', v_dia
  ));
end;
$$;

-- ---- private.connect_card (ruling 435) ----
create or replace function private.connect_card(p_viewer uuid, p_member uuid, p_context text, p_matched text[])
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  m public.members%rowtype;
  v_rel text;
  v_following boolean;
  v_seg text;
  v_heritage text;
  v_corridor text;
  v_place text;
  v_origin text;
  v_chips jsonb := '[]'::jsonb;
  v_badges jsonb := '[]'::jsonb;
  v_mutuals jsonb := '[]'::jsonb;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then return null; end if;
  -- Ruling 214: window is sender-side state and renders as sent everywhere. The
  -- distinction stays inside private.relationship_state, which the write paths read.
  v_rel := private.relationship_display(p_viewer, p_member);
  v_following := exists (select 1 from public.edges e
    where e.from_id = p_viewer and e.to_id = p_member and e.edge_type = 'follow' and e.revoked_at is null);
  -- Ruling 212 (F2b): stance, origin and place are section-gated attributes, read through the
  -- same predicate the Work and Skills chips already use. The card that showed Work chips obeying
  -- the audience while origin and place ignored it is the finding this closes.
  if private.admit_section(m.id, 'stance', p_viewer) then
    select s.label into v_seg from public.member_stances s where s.stance = m.stance;
  end if;
  if private.admit_section(m.id, 'origin', p_viewer) then
    v_origin := m.origin_country;
    select o.heritage::text into v_heritage from public.member_origin o where o.member_id = m.id;
  end if;
  select c.continental_place || ' to ' || c.diaspora_place into v_corridor
  from public.member_corridors mc join public.corridors c on c.id = mc.corridor_id
  where mc.member_id = m.id and c.status = 'active'
  order by mc.created_at limit 1;
  if private.admit_section(m.id, 'where', p_viewer) then
    v_place := case
      when m.current_place is not null and m.current_country is not null
        and position(lower(m.current_country) in lower(m.current_place)) = 0
        then m.current_place || ', ' || m.current_country
      else coalesce(m.current_place, m.current_country) end;
  end if;

  if private.admit_section(m.id, 'badges', p_viewer) then
    select coalesce(jsonb_agg(jsonb_build_object('c', g.c, 'items', g.items) order by g.ord), '[]'::jsonb) into v_badges
    from (
      select a.c_category as c,
        case a.c_category when 'convene' then 1 when 'collaborate' then 2 else 3 end as ord,
        jsonb_agg(jsonb_build_object(
          'object', coalesce(e.title, s.title, o.title, 'Attested'),
          'attester', am.name, 'role', a.attester_role, 'when', a.attested_at) order by a.attested_at desc) as items
      from public.attestations a
      join public.members am on am.id = a.attester_member_id
      left join public.events e on a.object_kind = 'event' and e.id = a.object_id
      left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
      left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
      where a.member_id = m.id and a.accepted_at is not null
      group by a.c_category
    ) g;
  end if;

  -- Mutuals as names, up to three, never a count (ruling 120); not shown once connected.
  if v_rel <> 'connected' then
    select coalesce(jsonb_agg(jsonb_build_object('name', x.name, 'avatar_path', x.avatar_path) order by x.name), '[]'::jsonb)
    into v_mutuals
    from (
      select mm.name, mm.avatar_path
      from public.member_connections c1
      join public.member_connections c2 on c2.member_id = m.id and c2.other_id = c1.other_id
      join public.members mm on mm.id = c1.other_id
      where c1.member_id = p_viewer and not private.is_blocked(p_viewer, c1.other_id)
      order by mm.name limit 3
    ) x;
  end if;

  if p_context = 'members' then
    with vals as (
      select j.name, 1 as ax, t.position from public.member_focus_areas j join public.focus_areas t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 2, t.position from public.member_industries j join public.industries t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 3, t.position from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'work', p_viewer)
      union all
      select j.name, 4, t.position from public.member_skills j join public.skills t on t.name = j.name
      where j.member_id = m.id and private.admit_section(m.id, 'skills', p_viewer)
    )
    select coalesce(jsonb_agg(v.name order by (v.name = any (coalesce(p_matched, '{}'))) desc, v.ax, v.position), '[]'::jsonb)
    into v_chips from vals v;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'id', m.id, 'handle', m.handle, 'name', m.name, 'avatar_path', m.avatar_path,
    'identified', m.identified_at is not null,
    'headline', m.headline, 'stance_label', v_seg, 'place', v_place, 'origin', v_origin,
    'heritage', v_heritage, 'corridor_label', v_corridor,
    'chips', v_chips, 'badges', v_badges, 'mutuals', v_mutuals,
    'rel', v_rel, 'following', v_following
  ));
end;
$$;

-- ---- connect_cards (ruling 435: a shared attested event counts once both sides are accepted) ----
create or replace function public.connect_cards(
  p_lens text,
  p_filters jsonb default '{}'::jsonb,
  p_cursor text default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 40);
  v_cur_name text;
  v_cur_id uuid;
  v_next text;
  v_items jsonb := '[]'::jsonb;
  v_requests jsonb := '[]'::jsonb;
  v_sent jsonb := '[]'::jsonb;
  v_connections jsonb := '[]'::jsonb;
  v_following jsonb := '[]'::jsonb;
  v_matched text[];
  v_window interval := make_interval(days => private.setting_int('decline_window_days', 90));
  v_n integer := 0;
  v_card jsonb;
  r record;
begin
  if v_uid is null then return null; end if;

  if p_lens = 'members' then
    if p_cursor is not null and length(p_cursor) > 37 then
      v_cur_id := private.uuid_or_null(right(p_cursor, 36));
      v_cur_name := left(p_cursor, length(p_cursor) - 37);
    end if;
    v_matched := array_remove(array[f ->> 'focus', f ->> 'industry', f ->> 'skill', f ->> 'region'], null);
    for r in
      select m.id, m.name
      from public.members m
      where m.id <> v_uid
        and not private.is_blocked(v_uid, m.id)
        -- Ruling 213: a Private member is not in Members for anyone but an existing connection.
        and private.admit_member(m.id, v_uid)
        -- Ruling 212 (F5): every axis over a section-gated attribute checks the audience first, or
        -- the filter is a searchable index over what the member withheld. stance, location and
        -- origin join heritage, pathway, focus, industry, skill and region, which already did.
        and (f ->> 'stance' is null or (private.admit_section(m.id, 'stance', v_uid) and m.stance::text = f ->> 'stance'))
        and (f ->> 'location' is null or (private.admit_section(m.id, 'where', v_uid) and m.current_country = f ->> 'location'))
        and (f ->> 'origin' is null or (private.admit_section(m.id, 'origin', v_uid) and m.origin_country = f ->> 'origin'))
        and (f ->> 'heritage' is null or (private.admit_section(m.id, 'origin', v_uid) and exists (
          select 1 from public.member_origin o where o.member_id = m.id and o.heritage::text = f ->> 'heritage')))
        and (f ->> 'pathway' is null or (private.admit_section(m.id, 'origin', v_uid) and exists (
          select 1 from public.member_origin o where o.member_id = m.id and o.pathway::text = f ->> 'pathway')))
        and (f ->> 'corridor' is null or exists (
          select 1 from public.member_corridors mc join public.corridors c on c.id = mc.corridor_id
          where mc.member_id = m.id and mc.corridor_id = f ->> 'corridor' and c.status = 'active'))
        and (f ->> 'focus' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_focus_areas j where j.member_id = m.id and j.name = f ->> 'focus')))
        and (f ->> 'industry' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_industries j where j.member_id = m.id and j.name = f ->> 'industry')))
        and (f ->> 'skill' is null or (private.admit_section(m.id, 'skills', v_uid) and exists (
          select 1 from public.member_skills j where j.member_id = m.id and j.name = f ->> 'skill')))
        and (f ->> 'region' is null or (private.admit_section(m.id, 'work', v_uid) and exists (
          select 1 from public.member_regional_expertise j where j.member_id = m.id and j.name = f ->> 'region')))
        and (v_cur_id is null or (m.name, m.id) > (v_cur_name, v_cur_id))
      order by m.name, m.id
      limit v_limit + 1
    loop
      v_n := v_n + 1;
      if v_n > v_limit then
        v_next := r.name || '|' || r.id::text;
        exit;
      end if;
      v_card := private.connect_card(v_uid, r.id, 'members', v_matched);
      if v_card is not null then v_items := v_items || v_card; end if;
    end loop;
    return jsonb_build_object('items', v_items, 'next_cursor', v_next);

  elsif p_lens = 'suggested' then
    for r in
      with cand as (
        select m.id, m.name,
          (select coalesce(jsonb_agg(distinct e.title), '[]'::jsonb)
             from public.attestations xa
             join public.attestations xb on xb.object_kind = 'event' and xb.object_id = xa.object_id
             join public.events e on e.id = xa.object_id
             where xa.object_kind = 'event'
               and xa.accepted_at is not null and xb.accepted_at is not null
               and v_uid in (xa.member_id, xa.attester_member_id)
               and m.id in (xb.member_id, xb.attester_member_id)) as events,
          (select coalesce(jsonb_agg(distinct s.title), '[]'::jsonb)
             from public.space_roles ra
             join public.space_roles rb on rb.space_id = ra.space_id
             join public.spaces s on s.id = ra.space_id
             where ra.member_id = v_uid and rb.member_id = m.id
               and ra.status = 'active' and rb.status = 'active') as spaces,
          (select coalesce(jsonb_agg(distinct (c.continental_place || ' to ' || c.diaspora_place)), '[]'::jsonb)
             from public.member_corridors a
             join public.member_corridors b on b.corridor_id = a.corridor_id
             join public.corridors c on c.id = a.corridor_id
             where a.member_id = v_uid and b.member_id = m.id and c.status = 'active') as corridors,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_focus_areas a join public.member_focus_areas b on b.name = a.name
               join public.focus_areas t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as focus,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_industries a join public.member_industries b on b.name = a.name
               join public.industries t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as industries,
          case when private.admit_section(m.id, 'work', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_regional_expertise a join public.member_regional_expertise b on b.name = a.name
               join public.regional_expertise t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as regions,
          case when private.admit_section(m.id, 'skills', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_skills a join public.member_skills b on b.name = a.name
               join public.skills t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as skills,
          case when private.admit_section(m.id, 'languages', v_uid) then
            (select coalesce(jsonb_agg(a.name order by t.position), '[]'::jsonb)
               from public.member_languages a join public.member_languages b on b.name = a.name
               join public.languages t on t.name = a.name
               where a.member_id = v_uid and b.member_id = m.id) else '[]'::jsonb end as languages,
          (select coalesce(jsonb_agg(x.name order by x.name), '[]'::jsonb)
             from (
               select mm.name
               from public.member_connections c1
               join public.member_connections c2 on c2.member_id = m.id and c2.other_id = c1.other_id
               join public.members mm on mm.id = c1.other_id
               where c1.member_id = v_uid and not private.is_blocked(v_uid, c1.other_id)
               order by mm.name limit 3
             ) x) as mutuals,
          exists (select 1 from public.second_degree s where s.member_id = v_uid and s.fof_id = m.id) as fof
        from public.members m
        where m.id <> v_uid
          and not private.is_blocked(v_uid, m.id)
          -- Ruling 213: and not a Private member the viewer is not already connected to.
          and private.admit_member(m.id, v_uid)
          and not exists (select 1 from public.dismissed_suggestions d where d.member_id = v_uid and d.dismissed_id = m.id)
          -- Ruling 229: Suggested reads the outward state, not the raw one. A withdrawn request
          -- inside the window reads sent everywhere else, so a candidate reappearing here would be
          -- the probe the ruling closes: present means it was pending, absent means it was declined.
          and private.relationship_display(v_uid, m.id) = 'none'
      ),
      scored as (
        select c.*,
          (jsonb_array_length(c.events) > 0)::integer
          + (jsonb_array_length(c.spaces) > 0)::integer
          + (jsonb_array_length(c.corridors) > 0)::integer
          + (jsonb_array_length(c.focus) + jsonb_array_length(c.industries) + jsonb_array_length(c.regions)
             + jsonb_array_length(c.skills) + jsonb_array_length(c.languages) > 0)::integer
          + (c.fof and jsonb_array_length(c.mutuals) > 0)::integer as hits
        from cand c
      )
      select * from scored s
      where s.hits > 0
      order by s.hits desc, s.name, s.id
      limit v_limit
    loop
      v_card := private.connect_card(v_uid, r.id, 'suggested', '{}');
      if v_card is null then continue; end if;
      v_items := v_items || (v_card || jsonb_build_object('facts', jsonb_strip_nulls(jsonb_build_object(
        'events', nullif(r.events, '[]'::jsonb),
        'spaces', nullif(r.spaces, '[]'::jsonb),
        'corridors', nullif(r.corridors, '[]'::jsonb),
        'overlap', nullif(jsonb_strip_nulls(jsonb_build_object(
          'focus', nullif(r.focus, '[]'::jsonb),
          'industries', nullif(r.industries, '[]'::jsonb),
          'regions', nullif(r.regions, '[]'::jsonb),
          'skills', nullif(r.skills, '[]'::jsonb),
          'languages', nullif(r.languages, '[]'::jsonb))), '{}'::jsonb),
        'mutuals', case when r.fof then nullif(r.mutuals, '[]'::jsonb) end
      ))));
    end loop;
    return jsonb_build_object('items', v_items);

  elsif p_lens = 'network' then
    for r in
      select c.id, c.from_member_id, c.message
      from public.connection_requests c
      where c.to_member_id = v_uid and c.status = 'pending' and not private.is_blocked(v_uid, c.from_member_id)
      order by c.created_at desc
    loop
      v_card := private.connect_card(v_uid, r.from_member_id, 'requests', '{}');
      if v_card is not null then
        v_requests := v_requests || (v_card || jsonb_build_object('message', r.message));
      end if;
    end loop;
    for r in
      select distinct on (c.to_member_id) c.to_member_id
      from public.connection_requests c
      where c.from_member_id = v_uid and c.to_member_id is not null
        and not private.is_blocked(v_uid, c.to_member_id)
        -- Ruling 229: a withdrawn request keeps its Sent row for the rest of the window, for the
        -- same reason. Without it, withdrawing and watching the row vanish separates a pending
        -- request from one inside the window in a single click.
        and (c.status = 'pending'
          or (c.status in ('declined', 'withdrawn') and c.responded_at > now() - v_window))
      order by c.to_member_id, c.created_at desc
    loop
      v_card := private.connect_card(v_uid, r.to_member_id, 'sent', '{}');
      -- Pending until the window elapses (ruling 157): the projection never says declined.
      if v_card is not null then v_sent := v_sent || (v_card || jsonb_build_object('rel', 'sent')); end if;
    end loop;
    for r in
      select c.other_id from public.member_connections c
      where c.member_id = v_uid and not private.is_blocked(v_uid, c.other_id)
      order by c.created_at desc, c.other_id
    loop
      v_card := private.connect_card(v_uid, r.other_id, 'connections', '{}');
      if v_card is not null then v_connections := v_connections || v_card; end if;
    end loop;
    for r in
      select e.to_id from public.edges e
      where e.from_id = v_uid and e.edge_type = 'follow' and e.revoked_at is null
        and not private.is_blocked(v_uid, e.to_id)
      order by e.created_at desc, e.to_id
    loop
      v_card := private.connect_card(v_uid, r.to_id, 'following', '{}');
      if v_card is not null then v_following := v_following || v_card; end if;
    end loop;
    return jsonb_build_object('requests', v_requests, 'sent', v_sent, 'connections', v_connections, 'following', v_following);
  end if;

  raise exception 'connect_cards: unknown lens %', p_lens using errcode = '22023';
end;
$$;

-- ---- private.shares_anchor (ruling 435: anchored qualifies on an accepted attestation) ----
create or replace function private.shares_anchor(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_a is not null and p_b is not null and p_a <> p_b and (
    exists (
      select 1 from public.space_roles ra
      join public.space_roles rb on rb.space_id = ra.space_id
      where ra.member_id = p_a and rb.member_id = p_b
        and ra.status = 'active' and rb.status = 'active'
    )
    or exists (
      select 1 from public.attestations xa
      join public.attestations xb
        on xb.object_kind = 'event' and xb.object_id = xa.object_id
      where xa.object_kind = 'event'
        and xa.accepted_at is not null and xb.accepted_at is not null
        and p_a in (xa.member_id, xa.attester_member_id)
        and p_b in (xb.member_id, xb.attester_member_id)
    )
  );
$$;

-- ---- public_attestations (ruling 435) ----
create or replace function public.public_attestations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select a.*, mm.name as member_name, mm.handle as member_handle, mm.avatar_path,
      private.third_party_label(am.id, a.attester_role, true) as attester_name,
      case when private.named_publicly(am.id) then a.attester_role end as attester_role_public,
      coalesce(e.title, s.title, o.title, 'Attested') as object_title,
      row_number() over (partition by a.c_category order by a.attested_at desc) as rn
    from public.attestations a
    join public.members mm on mm.id = a.member_id and mm.profile_shared and not mm.profile_private
    join public.members am on am.id = a.attester_member_id
    left join public.events e on a.object_kind = 'event' and e.id = a.object_id
    left join public.spaces s on a.object_kind = 'space' and s.id = a.object_id
    left join public.opportunities o on a.object_kind = 'opportunity' and o.id = a.object_id
    where a.accepted_at is not null
      and private.section_audience(a.member_id, 'badges') = 'everyone'
  )
  select coalesce(jsonb_object_agg(c, items), '{}'::jsonb)
  from (
    select c_category::text as c, jsonb_agg(jsonb_build_object(
      'member', member_name, 'handle', member_handle, 'avatar_path', avatar_path,
      'object', object_title, 'attester', attester_name, 'role', attester_role_public, 'when', attested_at,
      'c', c_category, 'object_kind', object_kind, 'object_id', object_id) order by attested_at desc) as items
    from eligible where rn <= 12 group by c_category
  ) g;
$$;

-- ---- publish_post (ruling 439) ----
create or replace function public.publish_post(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_post_id uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  v_verb text := nullif(payload ->> 'verb', '');
  v_c public.c_category;
  v_body text := coalesce(payload ->> 'body', '');
  v_author_kind public.anchor_kind := (payload ->> 'author_kind')::public.anchor_kind;
  v_author_id uuid := (payload ->> 'author_id')::uuid;
  v_anchor_kind public.anchor_kind := nullif(payload -> 'anchor' ->> 'kind', '')::public.anchor_kind;
  v_anchor_id uuid := nullif(payload -> 'anchor' ->> 'id', '')::uuid;
  v_audience public.audience := coalesce(nullif(payload ->> 'audience', ''), 'everyone')::public.audience;
  v_host_context text := coalesce(payload ->> 'host_context', 'feed');
  f jsonb := coalesce(payload -> 'fields', '{}'::jsonb);
  v_title text;
  v_space_id uuid;
  v_event_id uuid;
  v_obj_kind public.anchor_kind;
  v_obj_id uuid;
  v_place text;
  v_mode public.event_mode;
  v_roles jsonb;
  v_instrument public.contribute_instrument;
  v_to_member uuid;
  v_message text;
  m jsonb;
begin
  if v_uid is null then
    raise exception 'publish_post: not signed in' using errcode = '42501';
  end if;
  if v_verb is not null and v_verb not in ('connect', 'convene', 'collaborate', 'contribute', 'convey') then
    raise exception 'publish_post: unknown verb %', v_verb using errcode = '22023';
  end if;
  v_c := coalesce(v_verb, 'convey')::public.c_category;
  if v_c = 'system' then
    raise exception 'publish_post: system is platform-only' using errcode = '22023';
  end if;
  if v_author_kind is null or v_author_id is null or v_author_kind not in ('member', 'space') then
    raise exception 'publish_post: author required' using errcode = '22023';
  end if;
  if not private.can_author_as(v_author_kind, v_author_id) then
    raise exception 'publish_post: no right to author as this %', v_author_kind using errcode = '42501';
  end if;
  if (v_anchor_kind is null) <> (v_anchor_id is null) then
    raise exception 'publish_post: anchor needs kind and id' using errcode = '22023';
  end if;
  if v_audience = 'anchored' and v_anchor_kind is null then
    raise exception 'publish_post: anchored audience needs an anchor' using errcode = '22023';
  end if;
  if length(trim(v_body)) = 0
     and jsonb_array_length(coalesce(payload -> 'media', '[]'::jsonb)) = 0
     and nullif(payload -> 'link' ->> 'url', '') is null
     and v_verb is null then
    raise exception 'publish_post: nothing to publish' using errcode = '22023';
  end if;

  v_title := coalesce(nullif(trim(f ->> 'title'), ''), nullif(left(split_part(trim(v_body), E'\n', 1), 80), ''), 'Untitled');
  v_space_id := case when v_anchor_kind = 'space' then v_anchor_id else null end;
  v_event_id := case when v_anchor_kind = 'event' then v_anchor_id else null end;

  if v_verb = 'connect' then
    -- Ruling 215 (F16): one writer into connection_requests. The composer's Connect verb is ruling
    -- 119's self-introduction, so it is send_introduction, which is the only path that enforces the
    -- block, the decline window and ruling 213's Private rule, and which refuses with one message
    -- whichever condition fired. A Connect post that names no member is not an introduction and is
    -- refused with that same message rather than writing a request addressed to nobody.
    v_to_member := case when v_anchor_kind = 'member' and v_anchor_id <> v_uid then v_anchor_id end;
    -- B4 (ruling 119): the request carries its message; a request is never sent empty.
    v_message := left(btrim(coalesce(nullif(f ->> 'why', ''), nullif(v_body, ''), '')), 300);
    if v_message = '' then
      raise exception 'An introduction needs a message.' using errcode = '22023';
    end if;
    if v_to_member is null then
      raise exception 'send_introduction: not available' using errcode = '42501';
    end if;
    v_obj_id := public.send_introduction(v_to_member, v_message);
    v_obj_kind := 'connection_request';

  elsif v_verb = 'convene' then
    v_place := nullif(trim(f ->> 'place'), '');
    v_mode := (case
      when coalesce((f ->> 'hybrid')::boolean, false) then 'hybrid'
      when v_place ~* '^(https?://|www\.)' then 'virtual'
      else 'in_person' end)::public.event_mode;
    insert into public.events (host_member_id, title, starts_at, when_text, mode, location, virtual_url, ticket_kind, space_id)
    values (
      v_uid, v_title,
      nullif(payload ->> 'starts_at', '')::timestamptz,
      concat_ws(E'\n', nullif(trim(f ->> 'date'), ''), nullif(trim(f ->> 'time'), '')),
      v_mode,
      case when v_place is not null and v_mode <> 'virtual' then jsonb_build_object('text', v_place) else null end,
      case when v_mode = 'virtual' then v_place else null end,
      (case when lower(coalesce(f ->> 'ticket', 'Free')) = 'paid' then 'paid' else 'free' end)::public.ticket_kind,
      v_space_id
    ) returning id into v_obj_id;
    v_obj_kind := 'event';

  elsif v_verb = 'collaborate' then
    select coalesce(jsonb_agg(trim(r)), '[]'::jsonb) into v_roles
    from unnest(string_to_array(coalesce(f ->> 'roles', ''), ',')) as r
    where length(trim(r)) > 0;
    insert into public.spaces (owner_member_id, title, category, description, roles_sought, status)
    values (v_uid, v_title, nullif(trim(f ->> 'category'), ''), nullif(v_body, ''), v_roles, 'active')
    returning id into v_obj_id;
    insert into public.space_roles (space_id, member_id, role, status) values (v_obj_id, v_uid, 'lead', 'active');
    v_obj_kind := 'space';

  elsif v_verb = 'contribute' then
    v_instrument := (case lower(coalesce(f ->> 'instrument', ''))
      when 'skills' then 'skills' when 'in-kind' then 'in_kind' when 'in_kind' then 'in_kind' else 'time' end)::public.contribute_instrument;
    insert into public.opportunities (receiver_member_id, title, instrument, need, by_date, by_text, space_id, event_id)
    values (
      v_uid, v_title, v_instrument,
      coalesce(nullif(f ->> 'need', ''), nullif(v_body, '')),
      nullif(payload ->> 'by_date', '')::date,
      coalesce(f ->> 'by', ''),
      v_space_id, v_event_id
    ) returning id into v_obj_id;
    v_obj_kind := 'opportunity';

  elsif v_verb = 'convey' then
    insert into public.stories (author_member_id, title, body, origin_kind, origin_id)
    values (v_uid, v_title, v_body, v_anchor_kind, v_anchor_id)
    returning id into v_obj_id;
    v_obj_kind := 'story';
  end if;

  -- Ruling 288: a client-minted post id is a proposal, not an authority. The nested block opens a
  -- subtransaction, so a collision is caught here and re-raised as a named refusal instead of
  -- reaching the caller as `duplicate key value violates unique constraint "posts_pkey"`. It reads
  -- no row and needs no new grant, so nothing here answers "does post <uuid> exist" for
  -- `authenticated`. The verb's object row inserted immediately above is rolled back with the
  -- subtransaction when this exception propagates, which is correct: a collision must leave no
  -- orphan story, event, space or opportunity behind.
  begin
    insert into public.posts (id, author_kind, author_id, created_by, c_category, body, anchor_kind, anchor_id,
                              created_object_kind, created_object_id, audience, status, published_at)
    values (v_post_id, v_author_kind, v_author_id, v_uid, v_c, v_body, v_anchor_kind, v_anchor_id,
            v_obj_kind, v_obj_id, v_audience, 'published', now());
  exception
    when unique_violation then
      raise exception 'publish_post: this post has already been published' using errcode = '23505';
  end;

  for m in select * from jsonb_array_elements(coalesce(payload -> 'media', '[]'::jsonb)) loop
    insert into public.post_media (post_id, storage_path, width, height, position)
    values (v_post_id, m ->> 'storage_path', (m ->> 'width')::int, (m ->> 'height')::int, coalesce((m ->> 'position')::int, 0));
  end loop;

  if nullif(payload -> 'link' ->> 'url', '') is not null then
    -- Ruling 439 (F20): a link is a web address or it is not a link. Anything without an http or
    -- https scheme (javascript:, data:, a bare host) is refused by name and never stored.
    if payload -> 'link' ->> 'url' !~* '^https?://' then
      raise exception 'publish_post: a link must start with http:// or https://' using errcode = '22023';
    end if;
    insert into public.post_links (post_id, url, title, description, image_url, fetched_at)
    values (v_post_id, payload -> 'link' ->> 'url', payload -> 'link' ->> 'title',
            payload -> 'link' ->> 'description', payload -> 'link' ->> 'image_url',
            case when payload -> 'link' ->> 'title' is not null then now() else null end);
  end if;

  if payload ? 'dia' and jsonb_typeof(payload -> 'dia') = 'object' then
    insert into public.post_dia (post_id, verb, confidence, proposed_fields, accepted, member_overrode, latency_ms)
    values (
      v_post_id,
      nullif(payload -> 'dia' ->> 'verb', '')::public.c_category,
      nullif(payload -> 'dia' ->> 'confidence', '')::numeric,
      coalesce(payload -> 'dia' -> 'proposed_fields', '{}'::jsonb),
      coalesce((payload -> 'dia' ->> 'accepted')::boolean, false),
      coalesce((payload -> 'dia' ->> 'member_overrode')::boolean, false),
      nullif(payload -> 'dia' ->> 'latency_ms', '')::int
    );
  end if;

  delete from public.post_drafts where member_id = v_uid and host_context = v_host_context;

  return v_post_id;
end;
$$;

-- ---- send_introduction (rulings 401, 417, 442) ----
create or replace function public.send_introduction(p_recipient uuid, p_message text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_msg text := btrim(coalesce(p_message, ''));
  v_name text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'send_introduction: not signed in' using errcode = '42501'; end if;
  if p_recipient is null or p_recipient = v_uid then
    raise exception 'send_introduction: recipient required' using errcode = '22023';
  end if;
  -- Ruling 401 (under 417): the message is one short optional note. The profile's Connect entry
  -- sends none; Connect's own sheet still asks for one on the client. The cap stands.
  if length(v_msg) > 300 then
    raise exception 'An introduction needs a message of up to 300 characters.' using errcode = '22023';
  end if;
  -- Ruling 442 (F23): a ceiling per member on introductions, in words, never a number to the client.
  if not private.rate_limit(v_uid, 'send_introduction', interval '1 hour', 20) then
    raise exception 'Too many introductions for now. Try again later.' using errcode = 'P0001';
  end if;
  select m.name into v_name from public.members m where m.id = p_recipient;
  if v_name is null then raise exception 'send_introduction: not available' using errcode = '42501'; end if;
  -- Ruling 213: a Private member who is not already a connection has no card to send from, so an
  -- introduction to them is refused. It joins the block and the window in the one refusal every
  -- other condition already shares, so the caller cannot work out which condition fired.
  -- Ruling 229: the gate reads the outward state too. A sender who withdrew inside the window gave
  -- up their turn, so a re-send is refused with the same one message, and the write path cannot be
  -- used as an oracle for a state the surfaces have made identical.
  if private.is_blocked(v_uid, p_recipient)
     or not private.admit_member(p_recipient, v_uid)
     or private.relationship_display(v_uid, p_recipient) <> 'none' then
    raise exception 'send_introduction: not available' using errcode = '42501';
  end if;
  insert into public.connection_requests (from_member_id, to_member_id, to_name, why, message, status)
  values (v_uid, p_recipient, v_name, nullif(v_msg, ''), v_msg, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

-- ---- onboard_who (ruling 442) ----
create or replace function public.onboard_who(p_name text, p_username text default null, p_avatar_path text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_suggestion text;
  v_user text;
  v_avatar text := nullif(trim(coalesce(p_avatar_path, '')), '');
  v_changed boolean;
begin
  if v_uid is null then
    raise exception 'onboarding: not signed in' using errcode = '42501';
  end if;
  -- Ruling 442 (F22, F23): the username-existence check below is an oracle unless it is bounded.
  -- The bound is per member and internal; the refusal is words.
  if not private.rate_limit(v_uid, 'onboard_who', interval '1 hour', 10) then
    raise exception 'Too many attempts for now. Try again later.' using errcode = 'P0001';
  end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then
    raise exception 'onboarding: no profile row' using errcode = 'P0002';
  end if;
  if m.onboarded_at is not null then
    raise exception 'onboarding: already complete' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'A name is required.' using errcode = '22023';
  end if;
  v_suggestion := private.derive_username(v_name);
  v_user := coalesce(nullif(lower(trim(coalesce(p_username, ''))), ''), v_suggestion);
  -- The handle column's shape, three to forty characters (ruling 334). A null here is a name that
  -- folded to nothing and no username typed: nothing to write, so invalid, never a placeholder.
  if v_user is null or v_user !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    return jsonb_build_object('status', 'invalid', 'suggestion', v_suggestion);
  end if;
  if exists (select 1 from public.members x where x.handle = v_user and x.id <> v_uid) then
    return jsonb_build_object('status', 'taken', 'suggestion', v_suggestion);
  end if;
  -- Rulings 374 to 376: the photo is this member's avatar when public.media, the single record of
  -- every stored master (ruling 346), holds it for this caller with kind avatar. Not a path shape.
  if v_avatar is not null and not exists (
    select 1 from public.media md
    where md.owner_id = v_uid and md.kind = 'avatar' and md.storage_path = v_avatar
  ) then
    raise exception 'onboarding: photo path is not this member''s avatar' using errcode = '22023';
  end if;
  v_changed := v_suggestion is not null and v_user <> v_suggestion and v_user <> m.handle;

  update public.members set
    name = v_name,
    handle = v_user,
    -- No photo offered keeps the one the member already has (a provider photo, or a resume after
    -- one was set); onboarding never removes a photo, the profile does.
    avatar_path = coalesce(v_avatar, m.avatar_path),
    username_changes = case when v_changed then m.username_changes + 1 else m.username_changes end,
    who_completed_at = coalesce(m.who_completed_at, now()),
    updated_at = now()
  where id = v_uid;

  return jsonb_build_object(
    'status', 'ok',
    'name', v_name,
    'username', v_user,
    'avatar_path', coalesce(v_avatar, m.avatar_path),
    'suggestion', v_suggestion,
    'username_changes', case when v_changed then m.username_changes + 1 else m.username_changes end);
end;
$$;

-- ---- save_profile_section (ruling 424, W30) ----
create or replace function public.save_profile_section(section text, payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  p jsonb := coalesce(payload, '{}'::jsonb);
  v_name text;
  v_headline text;
  v_text text;
  v_seg public.stance;
  v_arr text[];
  v_tz text;
  v_place text;
  v_country text;
  v_kind public.link_kind;
  v_url text;
  v_section public.profile_section;
  v_aud public.audience;
  v_path text;
  v_priv boolean;
  v_shared boolean;
begin
  if v_uid is null then
    raise exception 'save_profile_section: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = v_uid) then
    raise exception 'save_profile_section: no profile row' using errcode = 'P0002';
  end if;

  if section = 'core' then
    v_name := left(trim(coalesce(p ->> 'name', '')), 80);
    if v_name = '' then
      raise exception 'A name is required.' using errcode = '22023';
    end if;
    v_headline := nullif(left(trim(coalesce(p ->> 'headline', '')), 140), '');
    update public.members set name = v_name, headline = v_headline, updated_at = now() where id = v_uid;

  elsif section = 'about' then
    v_text := nullif(left(trim(coalesce(p ->> 'about', '')), 500), '');
    if v_text is null then
      delete from public.member_about where member_id = v_uid;
    else
      insert into public.member_about (member_id, about) values (v_uid, v_text)
      on conflict (member_id) do update set about = excluded.about, updated_at = now();
    end if;

  elsif section = 'stance' then
    v_seg := nullif(p ->> 'stance', '')::public.stance;
    if v_seg is null then
      raise exception 'save_profile_section: stance required' using errcode = '22023';
    end if;
    update public.members set stance = v_seg, updated_at = now() where id = v_uid;
    insert into public.member_stance_details (member_id, stance, return_timeline, needs, base, offer, support)
    values (
      v_uid, v_seg,
      case when v_seg = 'returnee' then nullif(p ->> 'timeline', '')::public.return_timeline end,
      case when v_seg = 'returnee' then nullif(left(trim(coalesce(p ->> 'needs', '')), 500), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'base', '')), 120), '') end,
      case when v_seg = 'anchor' then nullif(left(trim(coalesce(p ->> 'offer', '')), 500), '') end,
      case when v_seg = 'ally' then nullif(left(trim(coalesce(p ->> 'support', '')), 500), '') end
    )
    on conflict (member_id, stance) do update set
      return_timeline = excluded.return_timeline, needs = excluded.needs, base = excluded.base,
      offer = excluded.offer, support = excluded.support, updated_at = now();
    if v_seg = 'exploring' then
      select coalesce(array_agg(distinct x), '{}') into v_arr
      from jsonb_array_elements_text(coalesce(p -> 'interests', '[]'::jsonb)) x;
      if array_length(v_arr, 1) > 5 then raise exception 'Interests: up to 5' using errcode = '23514'; end if;
      delete from public.member_interests where member_id = v_uid;
      insert into public.member_interests (member_id, name) select v_uid, unnest(v_arr);
    end if;

  elsif section = 'origin' then
    update public.members set origin_country = nullif(p ->> 'origin_country', ''), updated_at = now() where id = v_uid;
    if nullif(p ->> 'heritage', '') is null and nullif(p ->> 'pathway', '') is null then
      delete from public.member_origin where member_id = v_uid;
    else
      insert into public.member_origin (member_id, heritage, pathway)
      values (v_uid, nullif(p ->> 'heritage', '')::public.heritage_kind, nullif(p ->> 'pathway', '')::public.return_pathway)
      on conflict (member_id) do update set heritage = excluded.heritage, pathway = excluded.pathway, updated_at = now();
    end if;

  elsif section = 'where' then
    v_place := nullif(left(trim(coalesce(p ->> 'current_place', '')), 120), '');
    v_tz := nullif(p ->> 'local_tz', '');
    if v_tz is not null and not exists (select 1 from pg_catalog.pg_timezone_names n where n.name = v_tz) then
      raise exception 'save_profile_section: unknown time zone' using errcode = '22023';
    end if;
    if v_tz is null and v_place is not null then v_tz := private.tz_from_place(v_place); end if;
    if v_place is null then v_tz := null; end if;
    v_country := nullif(trim(coalesce(p ->> 'current_country', '')), '');
    if v_country is not null and not exists (select 1 from public.world_countries w where w.name = v_country) then
      raise exception 'save_profile_section: Current country: that value is not in the list' using errcode = '23503';
    end if;
    update public.members set current_place = v_place, current_country = v_country, local_tz = v_tz, updated_at = now() where id = v_uid;

  elsif section = 'work' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'focus', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Focus areas: up to 3' using errcode = '23514'; end if;
    delete from public.member_focus_areas where member_id = v_uid;
    insert into public.member_focus_areas (member_id, name) select v_uid, unnest(v_arr);
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'industries', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Industries: up to 3' using errcode = '23514'; end if;
    delete from public.member_industries where member_id = v_uid;
    insert into public.member_industries (member_id, name) select v_uid, unnest(v_arr);
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'regions', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Regional expertise: up to 3' using errcode = '23514'; end if;
    delete from public.member_regional_expertise where member_id = v_uid;
    insert into public.member_regional_expertise (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'skills' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'skills', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 5 then raise exception 'Skills: up to 5' using errcode = '23514'; end if;
    delete from public.member_skills where member_id = v_uid;
    insert into public.member_skills (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'languages' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'languages', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 6 then raise exception 'Languages: up to 6' using errcode = '23514'; end if;
    delete from public.member_languages where member_id = v_uid;
    insert into public.member_languages (member_id, name) select v_uid, unnest(v_arr);

  elsif section = 'intent' then
    select coalesce(array_agg(distinct x), '{}') into v_arr from jsonb_array_elements_text(coalesce(p -> 'intent', '[]'::jsonb)) x;
    if array_length(v_arr, 1) > 3 then raise exception 'Intent: up to 3' using errcode = '23514'; end if;
    delete from public.member_intents where member_id = v_uid;
    insert into public.member_intents (member_id, name) select v_uid, unnest(v_arr);
    v_text := nullif(left(trim(coalesce(p ->> 'note', '')), 200), '');
    if v_text is null then
      delete from public.member_intent where member_id = v_uid;
    else
      insert into public.member_intent (member_id, note) values (v_uid, v_text)
      on conflict (member_id) do update set note = excluded.note, updated_at = now();
    end if;

  elsif section = 'links' then
    for v_kind in select unnest(enum_range(null::public.link_kind)) loop
      v_url := nullif(left(trim(coalesce(p ->> v_kind::text, '')), 200), '');
      if v_kind <> 'website' and v_url is not null then v_url := ltrim(v_url, '@'); end if;
      if v_url is null then
        delete from public.member_links where member_id = v_uid and kind = v_kind;
      else
        insert into public.member_links (member_id, kind, url) values (v_uid, v_kind, v_url)
        on conflict (member_id, kind) do update set url = excluded.url;
      end if;
    end loop;

  elsif section = 'media' then
    -- Ruling 424 (W30), the ruling 374 shape again: the path checks below read a folder shape
    -- ({uid}/avatar/… and {uid}/cover/…) that media-upload has not written since ruling 346, which
    -- stores every master at {uid}/{mediaId}.{ext}. Every profile avatar and cover save therefore
    -- failed with 42501 and the surface toasted "That did not save. Try again." The authority is
    -- the media registry (rulings 374 to 376): public.media holds the path for this owner at that
    -- kind, or the path is not this member's.
    if p ? 'avatar_path' then
      v_path := nullif(p ->> 'avatar_path', '');
      if v_path is not null and not exists (
        select 1 from public.media md
        where md.owner_id = v_uid and md.kind = 'avatar' and md.storage_path = v_path
      ) then
        raise exception 'save_profile_section: photo path is not this member''s avatar' using errcode = '42501';
      end if;
      update public.members set avatar_path = v_path, updated_at = now() where id = v_uid;
    end if;
    if p ? 'cover_path' then
      v_path := nullif(p ->> 'cover_path', '');
      if v_path is not null and not exists (
        select 1 from public.media md
        where md.owner_id = v_uid and md.kind = 'cover' and md.storage_path = v_path
      ) then
        raise exception 'save_profile_section: image path is not this member''s cover' using errcode = '42501';
      end if;
      update public.members set cover_path = v_path, updated_at = now() where id = v_uid;
    end if;
    if p ? 'cover_focus' then
      update public.members set cover_focus = coalesce(nullif(left(p ->> 'cover_focus', 40), ''), 'center 35%'), updated_at = now() where id = v_uid;
    end if;

  elsif section = 'pattern' then
    update public.members set pattern = (p ->> 'pattern')::public.masthead_pattern, updated_at = now() where id = v_uid;

  elsif section = 'switches' then
    -- F1: profile_private and profile_shared left the authenticated column grant, and this
    -- function is SECURITY INVOKER, so it can no longer read the switch the caller did not send
    -- from the row it is updating. private.own_switches() returns the caller's own two values and
    -- nobody else's, so the partial save keeps working without widening the grant.
    select s.profile_private, s.profile_shared into v_priv, v_shared from private.own_switches() s;
    update public.members set
      profile_private = coalesce((p ->> 'private')::boolean, v_priv),
      profile_shared = coalesce((p ->> 'shared')::boolean, v_shared),
      updated_at = now()
    where id = v_uid;

  elsif section = 'visibility' then
    v_section := (p ->> 'section')::public.profile_section;
    v_aud := (p ->> 'audience')::public.audience;
    insert into public.member_visibility (member_id, section, audience) values (v_uid, v_section, v_aud)
    on conflict (member_id, section) do update set audience = excluded.audience;

  else
    raise exception 'save_profile_section: unknown section %', section using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 444, F25 and 218: the live_arms role (ruling 382) gains exactly what the new arms need.
-- ---------------------------------------------------------------------------
grant usage on schema supabase_migrations to live_arms;
grant select on table supabase_migrations.schema_migrations to live_arms;

-- The accepted_at arm builds its own fixture (ruling 241): one attestation row on a ruling 218 test
-- account, inside a rolled-back transaction. The role gets insert and update (accepted_at) under
-- policies that admit those two accounts and nothing else.
grant insert, update (accepted_at) on table public.attestations to live_arms;
drop policy if exists attestations_live_arms_insert on public.attestations;
create policy attestations_live_arms_insert on public.attestations
  for insert to live_arms
  with check (exists (
    select 1 from public.members m
    where m.id = member_id and m.handle in ('owner-test', 'member-test')
  ));
drop policy if exists attestations_live_arms_update on public.attestations;
create policy attestations_live_arms_update on public.attestations
  for update to live_arms
  using (exists (
    select 1 from public.members m
    where m.id = member_id and m.handle in ('owner-test', 'member-test')
  ))
  with check (exists (
    select 1 from public.members m
    where m.id = member_id and m.handle in ('owner-test', 'member-test')
  ));
