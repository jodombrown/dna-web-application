-- Ruling 187: segment has one source.
-- members.segment is the axis; member_segment_details holds ruling 122's per-variant fields;
-- member_segments (segment, label, position) has no member_id and is the label vocabulary only.
-- The axis was never duplicated. The label vocabulary was: Connect read it from the table while
-- Profile read it from SEGMENT_LABEL and SEG[].label in SegmentBlock.tsx. The collapse makes
-- public.member_segments the one label source; no data moves.

create or replace function public.profile_vocabularies()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'focus', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.focus_areas),
    'industries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.industries),
    'regions', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.regional_expertise),
    'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.skills),
    'languages', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.languages),
    'intent', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.intents),
    'interests', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.interests),
    'countries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.countries),
    'world', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    -- Ruling 187: the segment labels come from the table, here as everywhere else.
    'segments', (select coalesce(jsonb_agg(jsonb_build_object('value', s.segment, 'label', s.label)
                                           order by s.position), '[]'::jsonb)
                 from public.member_segments s),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x)
  );
$$;

revoke execute on function public.profile_vocabularies() from public, anon;
grant execute on function public.profile_vocabularies() to authenticated, service_role;

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
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_viewer)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Segment: the current variant's fields; the owner also gets every variant.
  if v_owner or (not v_private and private.admit_section(m.id, 'segment', v_viewer)) then
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
  if v_owner or (not v_private and private.admit_section(m.id, 'origin', v_viewer)) then
    select jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country, 'heritage', o.heritage, 'pathway', o.pathway))
    into v_obj from (select 1) s left join public.member_origin o on o.member_id = m.id;
    v_obj := coalesce(v_obj, jsonb_strip_nulls(jsonb_build_object('origin_country', m.origin_country)));
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('origin', v_obj); end if;
  end if;

  -- Where I am
  if v_owner or (not v_private and private.admit_section(m.id, 'where', v_viewer)) then
    v_obj := jsonb_strip_nulls(jsonb_build_object('current_place', m.current_place, 'current_country', m.current_country, 'local_tz', m.local_tz));
    if v_owner or m.current_place is not null or m.current_country is not null then v_sections := v_sections || jsonb_build_object('where', v_obj); end if;
  end if;

  -- What I work on
  if v_owner or (not v_private and private.admit_section(m.id, 'work', v_viewer)) then
    v_obj := jsonb_build_object(
      'focus', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_focus_areas j join public.focus_areas t on t.name = j.name where j.member_id = m.id),
      'industries', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_industries j join public.industries t on t.name = j.name where j.member_id = m.id),
      'regions', (select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) from public.member_regional_expertise j join public.regional_expertise t on t.name = j.name where j.member_id = m.id));
    if v_owner or jsonb_array_length(v_obj -> 'focus') + jsonb_array_length(v_obj -> 'industries') + jsonb_array_length(v_obj -> 'regions') > 0 then
      v_sections := v_sections || jsonb_build_object('work', v_obj);
    end if;
  end if;

  -- Skills
  if v_owner or (not v_private and private.admit_section(m.id, 'skills', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_skills j join public.skills t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('skills', jsonb_build_object('skills', v_rows)); end if;
  end if;

  -- Languages
  if v_owner or (not v_private and private.admit_section(m.id, 'languages', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_languages j join public.languages t on t.name = j.name where j.member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('languages', jsonb_build_object('languages', v_rows)); end if;
  end if;

  -- What I am here for
  if v_owner or (not v_private and private.admit_section(m.id, 'intent', v_viewer)) then
    select coalesce(jsonb_agg(j.name order by t.position), '[]'::jsonb) into v_rows
    from public.member_intents j join public.intents t on t.name = j.name where j.member_id = m.id;
    select n.note into v_tmp from public.member_intent n where n.member_id = m.id;
    v_obj := jsonb_strip_nulls(jsonb_build_object('intent', v_rows, 'note', v_tmp));
    if v_owner or jsonb_array_length(v_rows) > 0 or v_tmp is not null then v_sections := v_sections || jsonb_build_object('intent', v_obj); end if;
  end if;

  -- Links
  if v_owner or (not v_private and private.admit_section(m.id, 'links', v_viewer)) then
    select coalesce(jsonb_object_agg(l.kind, l.url), '{}'::jsonb) into v_obj from public.member_links l where l.member_id = m.id;
    if v_owner or v_obj <> '{}'::jsonb then v_sections := v_sections || jsonb_build_object('links', v_obj); end if;
  end if;

  -- Activity (ruling 125): grounded-or-empty, projections over attestations, space_roles, stories.
  if v_owner or (not v_private and private.admit_section(m.id, 'convene', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', e.title,
      'sub', 'Attested by ' || private.third_party_label(am.id, a.attester_role, v_viewer is null)
        || case when v_viewer is not null or private.named_publicly(am.id) then ', ' || a.attester_role else '' end,
      'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.events e on e.id = a.object_id and a.object_kind = 'event'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'convene';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convene', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'collaborate', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', s.title,
      'sub', (case r.role when 'lead' then 'Lead' else 'Member' end) || ' since ' || to_char(r.created_at, 'Mon YYYY'),
      'completed', s.status = 'completed', 'when', r.created_at) order by r.created_at desc), '[]'::jsonb)
    into v_rows from public.space_roles r join public.spaces s on s.id = r.space_id
    where r.member_id = m.id and r.status = 'active';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('collaborate', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'contribute', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object(
      'title', o.title, 'sub', 'Fulfilled a Need from ' || private.third_party_label(am.id, a.attester_role, v_viewer is null), 'when', a.attested_at) order by a.attested_at desc), '[]'::jsonb)
    into v_rows from public.attestations a
    join public.opportunities o on o.id = a.object_id and a.object_kind = 'opportunity'
    join public.members am on am.id = a.attester_member_id
    where a.member_id = m.id and a.c_category = 'contribute';
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('contribute', v_rows); end if;
  end if;
  if v_owner or (not v_private and private.admit_section(m.id, 'convey', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object('title', s.title, 'sub', 'Story', 'when', s.created_at, 'post_id', p.id) order by s.created_at desc), '[]'::jsonb)
    into v_rows from public.stories s
    left join public.posts p on p.created_object_kind = 'story' and p.created_object_id = s.id and p.status = 'published'
    where s.author_member_id = m.id;
    if v_owner or jsonb_array_length(v_rows) > 0 then v_sections := v_sections || jsonb_build_object('convey', v_rows); end if;
  end if;

  -- Badges (ruling 123): one per attested context, in order Convene, Collaborate, Contribute.
  if v_owner or (not v_private and private.admit_section(m.id, 'badges', v_viewer)) then
    select coalesce(jsonb_agg(jsonb_build_object('c', g.c, 'items', g.items) order by g.ord), '[]'::jsonb) into v_badges
    from (
      select a.c_category as c,
        case a.c_category when 'convene' then 1 when 'collaborate' then 2 else 3 end as ord,
        jsonb_agg(jsonb_build_object(
          'object', coalesce(e.title, s.title, o.title, 'Attested'),
          'attester', private.third_party_label(am.id, a.attester_role, v_viewer is null),
          'role', case when v_viewer is not null or private.named_publicly(am.id) then a.attester_role end,
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

  -- Relationship, mutuals and shared Spaces: a signed-in visitor only (rulings 118 to 120, 136).
  if v_viewer is not null and not v_owner then
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
    'relationship', case when v_viewer is not null and not v_owner then jsonb_build_object('state', v_rel, 'following', v_following) end,
    'mutuals', v_mutuals,
    'shared_spaces', v_shared_spaces,
    'anchored', v_anchored,
    'dia_line', v_dia
  ));
end;
$$;

revoke execute on function public.profile_view(text, boolean) from public;
grant execute on function public.profile_view(text, boolean) to anon, authenticated, service_role;
