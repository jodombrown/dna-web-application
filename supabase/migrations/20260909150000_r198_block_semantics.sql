-- ---------------------------------------------------------------------------
-- Ruling 198: what a block means.
--
-- A block removes discovery and contact, drops the blocked party to the lowest audience scope, and
-- revokes the relationship in both directions. It does not hide the profile.
--
-- docs/GAPS.md G2 recorded the finding PR #10 confirmed live and correctly refused to guess at: with
-- a block in place, profile_view returned the subject's full profile to the blocked member. Every
-- projection inside the payload already behaved; the subject itself was unfiltered. Two answers were
-- defensible and the rulings did not settle it, so it waited for one.
--
-- What is enforced here, when A blocks B (and symmetrically, because private.is_blocked is
-- symmetric and every projection that returns a member already filters on the pair in both
-- directions):
--
--   1. Discovery and contact are gone. Already true across Connect (ruling 186's audit) and, from
--      here, on Profile: no relationship object at all, so the surface renders no Connect action and
--      no Follow, in either direction.
--   2. B's audience scope on A's profile is the lowest one. B sees what a signed-out stranger sees:
--      the public projection, no connections-scoped section, no anchored-scoped section, whatever
--      the prior relationship, shared Space or attested event. Enforced here as row policy, by the
--      same private.admit_section predicate the Digital Trust Layer already uses for every other
--      viewer, given a null viewer. Not client-side filtering: a section B may not see is a section
--      B is not sent.
--   3. The connect and follow edges are revoked, both directions, and the adjacency and follow
--      projections lose their rows. Without this, B keeps connections-scoped access through an edge
--      A has repudiated, and A keeps surfacing in B's mutuals. Revoked, not deleted: edges.revoked_at
--      exists for exactly this, so the history stays auditable.
--   4. The profile shell still loads for B. This is the part that feels wrong and is the reason for
--      the rule. Hiding it discloses the block, because a page that resolved yesterday and fails
--      today says exactly what happened, and B can sign out and read the public page anyway. Hiding
--      is therefore both leaky and legible; this is neither.
--
-- Rejected, recorded so this is not reopened by accident. Hiding the profile outright: discloses the
-- block and is trivially circumvented by signing out. Removing discovery and contact only, without
-- the scope drop: leaves a blocked member reading connections-scoped content on a profile whose
-- owner has repudiated them.
--
-- Accepted cost: a member who blocks someone will find the blocked person can still read their
-- public page, and that will feel like the block did less than they asked for.
--
-- G1 stays open: public.member_blocks still has no writer in the app, so this settles the semantics
-- of a table nothing yet writes to. The trigger below is where the semantics live, so the writer,
-- when the chassis brief builds it, inherits them rather than restating them.
--
-- No table, column, policy or grant changes. Two new private functions, one trigger, one function
-- body replaced.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Second degree after an edge is removed. private.second_degree_on_connect maintains the set
-- incrementally on a new connection; a removed connection needs the mirror of that, and a
-- decrement of via_count cannot be trusted to be exact once sample_via_ids has been trimmed.
-- Recompute instead, for the only members whose rows the removed pair can appear on: the pair and
-- their neighbours. Bounded by their degree, never a full rebuild, and private.refresh_second_degree
-- still corrects any drift overnight.
-- ---------------------------------------------------------------------------
create or replace function private.rebuild_second_degree_for(p_members uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scope uuid[];
begin
  if p_members is null or array_length(p_members, 1) is null then return; end if;
  select array_agg(distinct x) into v_scope from (
    select unnest(p_members) as x
    union
    select c.other_id from public.member_connections c where c.member_id = any(p_members)
  ) s;
  delete from public.second_degree s where s.member_id = any(v_scope);
  insert into public.second_degree (member_id, fof_id, via_count, sample_via_ids, refreshed_at)
  select a.member_id, b.other_id, count(*)::integer, (array_agg(a.other_id))[1:3], now()
  from public.member_connections a
  join public.member_connections b on b.member_id = a.other_id
  where a.member_id = any(v_scope)
    and b.other_id <> a.member_id
    and not exists (select 1 from public.member_connections d
                    where d.member_id = a.member_id and d.other_id = b.other_id)
  group by a.member_id, b.other_id
  on conflict (member_id, fof_id) do update set
    via_count = excluded.via_count, sample_via_ids = excluded.sample_via_ids, refreshed_at = now();
end;
$$;
revoke execute on function private.rebuild_second_degree_for(uuid[]) from public, anon, authenticated;
grant execute on function private.rebuild_second_degree_for(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Ruling 198 item 3: the block revokes the relationship, in both directions, at the moment the block
-- is written. The trigger is the enforcement point rather than a write path, so every future writer
-- of member_blocks (G1's block surface, an admin action, a service-role repair) inherits it.
-- ---------------------------------------------------------------------------
create or replace function private.on_member_blocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Revoke, never delete: the edge stays as history (ruling 198). The follow mirror trigger on
  -- edges removes the member_follows row as its revoked_at is set.
  update public.edges e set revoked_at = now()
  where e.edge_type in ('connect', 'follow')
    and e.revoked_at is null
    and ((e.from_id = new.blocker_id and e.to_id = new.blocked_id)
      or (e.from_id = new.blocked_id and e.to_id = new.blocker_id));

  -- The adjacency projection carries no history of its own; it is the live set, so the rows go.
  delete from public.member_connections c
  where (c.member_id = new.blocker_id and c.other_id = new.blocked_id)
     or (c.member_id = new.blocked_id and c.other_id = new.blocker_id);

  -- A follow row without a live edge (a row predating the edge backfill) leaves too.
  delete from public.member_follows f
  where (f.follower_id = new.blocker_id and f.member_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.member_id = new.blocker_id);

  perform private.rebuild_second_degree_for(array[new.blocker_id, new.blocked_id]);
  return new;
end;
$$;
revoke execute on function private.on_member_blocked() from public, anon, authenticated;

drop trigger if exists on_member_block_revokes_relationship on public.member_blocks;
create trigger on_member_block_revokes_relationship
  after insert on public.member_blocks
  for each row execute function private.on_member_blocked();

-- ---------------------------------------------------------------------------
-- profile_view(): ruling 198 items 1, 2 and 4. Everything else is the ruling 187 definition,
-- carried forward unchanged.
-- ---------------------------------------------------------------------------
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
  -- Ruling 187: the label for this member's segment, read from the one vocabulary table.
  v_segment_label text;
  -- Ruling 198: a blocked pair, in either direction. private.is_blocked is symmetric.
  v_blocked boolean := false;
  -- The viewer the audience rules see. It is v_viewer for everyone except a blocked viewer, who is
  -- scoped to the anonymous rule: the lowest audience, the same rows a signed-out stranger gets.
  v_scope uuid;
  v_rows jsonb;
  v_obj jsonb;
  v_tmp text;
begin
  if p_handle is null then
    if v_caller is null then return null; end if;
    select * into m from public.members where id = v_caller;
  else
    select * into m from public.members where handle = lower(p_handle);
  end if;
  if m.id is null then return null; end if;
  select s.label into v_segment_label from public.member_segments s where s.segment = m.segment;

  v_owner := v_caller is not null and v_caller = m.id and not coalesce(p_as_public, false);
  v_viewer := case when v_owner then v_caller when v_caller = m.id then null else v_caller end;
  -- Ruling 198: the block drops the viewer's scope; it does not hide the page. Hiding it would
  -- disclose the block (a page that opened yesterday and 404s today says exactly what happened) and
  -- be circumvented by signing out anyway. So the gate below still reads v_viewer, and a blocked
  -- member who could open this profile before can still open it, seeing what the public sees.
  v_blocked := v_caller is not null and v_caller <> m.id and private.is_blocked(v_caller, m.id);
  v_scope := case when v_blocked then null else v_viewer end;
  if v_viewer is null and not v_owner and not m.profile_shared then return null; end if;
  v_private := m.profile_private and not v_owner;
  v_first := split_part(m.name, ' ', 1);
  v_tier := case
    when exists (select 1 from public.attestations a where a.member_id = m.id) then 'attested'
    when m.identified_at is not null then 'identified'
    else 'account' end;

  -- A section is admitted when the owner is looking, or when private.admit_section allows the
  -- viewer (null viewer = the anonymous rule, which is what "View as public" renders).

  -- About
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_scope)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Segment: the current variant's fields; the owner also gets every variant.
  if v_owner or (not v_private and private.admit_section(m.id, 'segment', v_scope)) then
    select jsonb_strip_nulls(jsonb_build_object(
      'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))
    into v_seg_fields from public.member_segment_details d where d.member_id = m.id and d.segment = m.segment;
    v_seg_fields := coalesce(v_seg_fields, '{}'::jsonb);
    if m.segment = 'exploring' then
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_seg_fields := v_seg_fields || jsonb_build_object('interests', v_rows);
    end if;
    if v_owner then
      select coalesce(jsonb_object_agg(d.segment, jsonb_strip_nulls(jsonb_build_object(
        'timeline', d.return_timeline, 'needs', d.needs, 'base', d.base, 'offer', d.offer, 'support', d.support))), '{}'::jsonb)
      into v_variants from public.member_segment_details d where d.member_id = m.id;
      select coalesce(jsonb_agg(i.name order by t.position), '[]'::jsonb) into v_rows
      from public.member_interests i join public.interests t on t.name = i.name where i.member_id = m.id;
      v_variants := v_variants || jsonb_build_object('exploring', coalesce(v_variants -> 'exploring', '{}'::jsonb) || jsonb_build_object('interests', v_rows));
      v_sections := v_sections || jsonb_build_object('segment', jsonb_build_object('segment', m.segment, 'fields', v_seg_fields, 'variants', v_variants));
    elsif m.segment is not null and (
      v_seg_fields - 'interests' <> '{}'::jsonb or jsonb_array_length(coalesce(v_seg_fields -> 'interests', '[]'::jsonb)) > 0) then
      v_sections := v_sections || jsonb_build_object('segment', jsonb_build_object('segment', m.segment, 'fields', v_seg_fields));
    end if;
  end if;

  -- Origin and heritage
  if v_owner or (not v_private and private.admit_section(m.id, 'origin', v_scope)) then
    select jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country, 'heritage', o.heritage, 'pathway', o.pathway))
    into v_obj from (select 1) s left join public.member_origin o on o.member_id = m.id;
    v_obj := coalesce(v_obj, jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country)));
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('origin', v_obj); end if;
  end if;

  -- Where I am
  if v_owner or (not v_private and private.admit_section(m.id, 'where', v_scope)) then
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
    where a.member_id = m.id and a.c_category = 'convene';
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
    where a.member_id = m.id and a.c_category = 'contribute';
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
      where a.member_id = m.id
      group by a.c_category
    ) g;
  end if;

  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136), and
  -- never for a blocked pair (ruling 198): no Connect action, no follow, no mutual name, no shared
  -- Space, no anchored qualification and no DIA line, in either direction. The relationship object
  -- is absent rather than 'none', so the surface renders no action at all.
  if v_viewer is not null and not v_owner and not v_blocked then
    -- Brief 4 (rulings 157, 168): one relationship rule for every surface, window included.
    v_rel := private.relationship_state(v_viewer, m.id);
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
      where a.member_id = m.id and a.c_category = 'contribute' and o.space_id is not null
        and exists (select 1 from public.space_roles r where r.space_id = o.space_id and r.member_id = v_viewer and r.role = 'lead' and r.status = 'active')
      order by a.attested_at desc limit 1;
      if v_dia is not null then
        v_dia := v_first || ' fulfilled a Need in the Space you lead.';
      else
        select v_first || ' was at ' || e.title || ', which you hosted.' into v_dia
        from public.attestations a join public.events e on e.id = a.object_id and a.object_kind = 'event'
        where a.member_id = m.id and e.host_member_id = v_viewer
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
    'member', jsonb_build_object(
      'id', m.id, 'handle', m.handle, 'name', m.name, 'headline', m.headline,
      'avatar_path', m.avatar_path, 'cover_path', m.cover_path, 'cover_focus', m.cover_focus,
      'origin_country', m.origin_country, 'current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz,
      'segment', m.segment, 'segment_label', v_segment_label, 'pattern', m.pattern, 'tier', v_tier),
    'switches', case when v_owner then jsonb_build_object('private', m.profile_private, 'shared', m.profile_shared) end,
    'private', v_private,
    'sections', v_sections,
    'badges', v_badges,
    'visibility', v_vis,
    'relationship', case when v_viewer is not null and not v_owner and not v_blocked
                         then jsonb_build_object('state', v_rel, 'following', v_following) end,
    'mutuals', v_mutuals,
    'shared_spaces', v_shared_spaces,
    'anchored', v_anchored,
    'dia_line', v_dia
  ));
end;
$$;

revoke execute on function public.profile_view(text, boolean) from public;
grant execute on function public.profile_view(text, boolean) to anon, authenticated, service_role;
