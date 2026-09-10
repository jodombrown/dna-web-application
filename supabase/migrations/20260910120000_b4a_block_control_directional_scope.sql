-- ---------------------------------------------------------------------------
-- Brief 4A, the block control: profile_view's audience resolution, made directional.
--
-- B4A section 6 settles what ruling 198 left symmetric in the implementation. `private.is_blocked`
-- is symmetric and stays so: it is the discovery-and-contact filter, and both parties lose the
-- Connect action and the Follow. The *audience scope* drop is not symmetric. Ruling 198 drops
-- "the blocked party" to the lowest scope; it says nothing about the blocker, and ruling 220 says a
-- block does not end an anchor. The r198 body read one symmetric boolean for both jobs, so the
-- blocker also fell to the anonymous rule: their own Anchored sections on the blocked member's
-- profile vanished, against 220, and their mutuals, shared Spaces and DIA line went with them.
--
-- B4A section 6, both branches, is what this body now implements:
--
--   Dropped-scope viewer (the viewer is blocked BY this member): a section renders only when its
--   audience is Everyone. Connections and Anchored do not render. Unchanged from r198 for this
--   party, which is the party ruling 198 is about.
--
--   Every other viewer, the blocker included: Everyone renders; Connections renders only while the
--   connection edge exists, and the ruling 198 trigger has already revoked it, so after a block
--   neither party reads the other's Connections sections; Anchored renders regardless of edges
--   (ruling 220).
--
-- B4A section 7's Done Means 5 is the visible consequence: the blocker's own view of the member
-- they blocked keeps its mutuals line, its rail rows and its DIA line, because a block does not
-- remove them for the blocker.
--
-- One new key, `viewer_blocked`: has the caller blocked this member. The control needs it to read
-- "Block {first}" or "Unblock {first}", and it discloses nothing, because the blocker may already
-- select their own member_blocks rows under member_blocks_owner_select. The converse is deliberately
-- not in the payload and must never be: nothing that reaches the blocked party may separate a block
-- from a stranger, which is B4A section 7's acceptance test. `viewer_blocked` is false for them and
-- false for every unblocked viewer alike.
--
-- No table, column, policy, grant, trigger or enum changes. One function body replaced. Everything
-- outside the four edits named above is the ruling 212/213 definition, carried forward verbatim.
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
  v_see_segment boolean;
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
    when exists (select 1 from public.attestations a where a.member_id = m.id) then 'attested'
    when m.identified_at is not null then 'identified'
    else 'account' end;
  v_see_origin  := v_owner or (not v_private and private.admit_section(m.id, 'origin', v_scope));
  v_see_where   := v_owner or (not v_private and private.admit_section(m.id, 'where', v_scope));
  v_see_segment := v_owner or (not v_private and private.admit_section(m.id, 'segment', v_scope));

  -- A section is admitted when the owner is looking, or when private.admit_section allows the
  -- viewer (null viewer = the anonymous rule, which is what "View as public" renders).

  -- About
  if v_owner or (not v_private and private.admit_section(m.id, 'about', v_scope)) then
    select jsonb_build_object('about', a.about) into v_obj from public.member_about a where a.member_id = m.id;
    if v_owner or v_obj is not null then v_sections := v_sections || jsonb_build_object('about', coalesce(v_obj, '{}'::jsonb)); end if;
  end if;

  -- Segment: the current variant's fields; the owner also gets every variant.
  if v_see_segment then
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
      'segment', case when v_see_segment then m.segment end,
      'segment_label', case when v_see_segment then v_segment_label end,
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

revoke execute on function public.profile_view(text, boolean) from public;
grant execute on function public.profile_view(text, boolean) to anon, authenticated, service_role;
