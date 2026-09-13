-- B4 Connect: the one read projection and the write paths (rulings 111, 113, 115, 117 to 120, 153,
-- 154, 157, 161, 168, 173, 178). Everything SECURITY DEFINER with an empty search_path, viewer
-- scoped through auth.uid(), default-deny helpers deciding every row and every section.
--
-- Reads: connect_cards(lens, filters, cursor, limit) returns the card shape for a lens: name,
-- handle, avatar path, identity tier, headline, segment label, place, origin, heritage, corridor
-- label, chips, badges, up to three mutual names, viewer-scoped rel and following, the sender's
-- message on Requests, and for Suggested the structured facts DIA writes the reason from. It returns
-- no count, no via_count, no distance, no score, and no field a client could sum into one.
-- connect_where() returns country names above the floor, grouped; the count never leaves the
-- database. connect_filter_options() returns the ten vocabularies (corridors empty until seeded).
-- Writes: send_introduction, respond_to_request, withdraw_request, set_follow, dismiss_suggestion.
--
-- The window (rulings 157, 161, 168): the decliner returns to none at once. The sender whose
-- introduction was declined sees the Sent row as Pending for the window and the member's card with
-- nothing in its primary slot (rel window); after the window the pair returns to none and one more
-- introduction is permitted; a second decline is terminal in that direction (window for good).
-- No declined status, timestamp or differentiated state ever reaches the sender.

insert into private.connect_settings (key, value_int) values ('decline_window_days', 90)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Relationship state for a viewer and a target: none | sent | received | connected | window.
-- ---------------------------------------------------------------------------
create or replace function private.relationship_state(p_viewer uuid, p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_n integer;
  v_last timestamptz;
  v_window interval := make_interval(days => private.setting_int('decline_window_days', 90));
begin
  if p_viewer is null or p_target is null or p_viewer = p_target then return 'none'; end if;
  if private.is_connected(p_viewer, p_target) then return 'connected'; end if;
  if exists (select 1 from public.connection_requests c
             where c.from_member_id = p_viewer and c.to_member_id = p_target and c.status = 'pending') then
    return 'sent';
  end if;
  if exists (select 1 from public.connection_requests c
             where c.from_member_id = p_target and c.to_member_id = p_viewer and c.status = 'pending') then
    return 'received';
  end if;
  select count(*), max(c.responded_at) into v_n, v_last
  from public.connection_requests c
  where c.from_member_id = p_viewer and c.to_member_id = p_target and c.status = 'declined';
  if v_n >= 2 then return 'window'; end if;
  if v_n = 1 and v_last > now() - v_window then return 'window'; end if;
  return 'none';
end;
$$;
revoke execute on function private.relationship_state(uuid, uuid) from public, anon;
grant execute on function private.relationship_state(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- One card. Sections gated by the same private.admit_section the profile uses, so a hidden
-- attribute never reaches a card or a chip. Chips (Members only, ruling 178): the member's work
-- and skills values with any that match the active filters first; the component shows two.
-- ---------------------------------------------------------------------------
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
  v_chips jsonb := '[]'::jsonb;
  v_badges jsonb := '[]'::jsonb;
  v_mutuals jsonb := '[]'::jsonb;
begin
  select * into m from public.members where id = p_member;
  if m.id is null then return null; end if;
  v_rel := private.relationship_state(p_viewer, p_member);
  v_following := exists (select 1 from public.edges e
    where e.from_id = p_viewer and e.to_id = p_member and e.edge_type = 'follow' and e.revoked_at is null);
  select s.label into v_seg from public.member_segments s where s.segment = m.segment;
  if private.admit_section(m.id, 'origin', p_viewer) then
    select o.heritage::text into v_heritage from public.member_origin o where o.member_id = m.id;
  end if;
  select c.continental_place || ' to ' || c.diaspora_place into v_corridor
  from public.member_corridors mc join public.corridors c on c.id = mc.corridor_id
  where mc.member_id = m.id and c.status = 'active'
  order by mc.created_at limit 1;
  v_place := case
    when m.current_place is not null and m.current_country is not null
      and position(lower(m.current_country) in lower(m.current_place)) = 0
      then m.current_place || ', ' || m.current_country
    else coalesce(m.current_place, m.current_country) end;

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
      where a.member_id = m.id
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
    'headline', m.headline, 'segment_label', v_seg, 'place', v_place, 'origin', m.origin_country,
    'heritage', v_heritage, 'corridor_label', v_corridor,
    'chips', v_chips, 'badges', v_badges, 'mutuals', v_mutuals,
    'rel', v_rel, 'following', v_following
  ));
end;
$$;
revoke execute on function private.connect_card(uuid, uuid, text, text[]) from public, anon, authenticated;
grant execute on function private.connect_card(uuid, uuid, text, text[]) to service_role;

-- ---------------------------------------------------------------------------
-- connect_cards(lens, filters, cursor, limit)
--   members   -> { items, next_cursor }   filters apply here and only here (ruling 173)
--   suggested -> { items }                each item carries facts (words only) for DIA's reason
--   network   -> { requests, sent, connections, following }
-- Excludes self and blocked pairs everywhere; Suggested also excludes any relationship other than
-- none and dismissed rows (anti-join), and ranks on rule hits internally without returning them.
-- ---------------------------------------------------------------------------
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
        and (f ->> 'segment' is null or m.segment::text = f ->> 'segment')
        and (f ->> 'location' is null or m.current_country = f ->> 'location')
        and (f ->> 'origin' is null or m.origin_country = f ->> 'origin')
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
          and not exists (select 1 from public.dismissed_suggestions d where d.member_id = v_uid and d.dismissed_id = m.id)
          and private.relationship_state(v_uid, m.id) = 'none'
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
        and (c.status = 'pending' or (c.status = 'declined' and c.responded_at > now() - v_window))
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
revoke execute on function public.connect_cards(text, jsonb, text, integer) from public, anon;
grant execute on function public.connect_cards(text, jsonb, text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- connect_where(): countries by where members are now, above the floor, names only, grouped by
-- continent (the African list is public.countries; everything else is the diaspora). The count
-- never leaves the database; the floor is configuration (ruling 154; doctrine default five).
-- ---------------------------------------------------------------------------
create or replace function public.connect_where()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_floor integer := private.setting_int('where_floor', 5);
  v_out jsonb;
begin
  if v_uid is null then return null; end if;
  select jsonb_build_object(
    'continent', coalesce((select jsonb_agg(c.name order by c.name) from (
       select m.current_country as name from public.members m
       where m.current_country is not null and not private.is_blocked(v_uid, m.id)
       group by m.current_country having count(*) >= v_floor) c
       where exists (select 1 from public.countries k where k.name = c.name)), '[]'::jsonb),
    'diaspora', coalesce((select jsonb_agg(c.name order by c.name) from (
       select m.current_country as name from public.members m
       where m.current_country is not null and not private.is_blocked(v_uid, m.id)
       group by m.current_country having count(*) >= v_floor) c
       where not exists (select 1 from public.countries k where k.name = c.name)), '[]'::jsonb))
  into v_out;
  return v_out;
end;
$$;
revoke execute on function public.connect_where() from public, anon;
grant execute on function public.connect_where() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- connect_filter_options(): the ten axes, every value from its table (never an array in code).
-- corridors is empty until the seed lands, and the client hides the axis (ruling 154).
-- ---------------------------------------------------------------------------
create or replace function public.connect_filter_options()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'segments', (select coalesce(jsonb_agg(jsonb_build_object('value', s.segment, 'label', s.label) order by s.position), '[]'::jsonb) from public.member_segments s),
    'locations', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    'origins', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.countries),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'corridors', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'label', c.continental_place || ' to ' || c.diaspora_place) order by c.id), '[]'::jsonb)
                  from public.corridors c where c.status = 'active'),
    'focus', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.focus_areas),
    'industries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.industries),
    'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.skills),
    'regions', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.regional_expertise)
  ) end;
$$;
revoke execute on function public.connect_filter_options() from public, anon;
grant execute on function public.connect_filter_options() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Write paths. Every rule of the state machine is enforced here; the client renders what the
-- projection returns and never computes eligibility. Refusals share one wording so a refusal
-- during the window is indistinguishable from any other.
-- ---------------------------------------------------------------------------
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
  if length(v_msg) < 1 or length(v_msg) > 300 then
    raise exception 'An introduction needs a message of up to 300 characters.' using errcode = '22023';
  end if;
  select m.name into v_name from public.members m where m.id = p_recipient;
  if v_name is null then raise exception 'send_introduction: not available' using errcode = '42501'; end if;
  if private.is_blocked(v_uid, p_recipient) or private.relationship_state(v_uid, p_recipient) <> 'none' then
    raise exception 'send_introduction: not available' using errcode = '42501';
  end if;
  insert into public.connection_requests (from_member_id, to_member_id, to_name, why, message, status)
  values (v_uid, p_recipient, v_name, v_msg, v_msg, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.send_introduction(uuid, text) from public, anon;
grant execute on function public.send_introduction(uuid, text) to authenticated, service_role;

create or replace function public.respond_to_request(p_sender uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'respond_to_request: not signed in' using errcode = '42501'; end if;
  update public.connection_requests c
  set status = case when coalesce(p_accept, false) then 'accepted'::public.request_status else 'declined'::public.request_status end,
      responded_at = now()
  where c.from_member_id = p_sender and c.to_member_id = v_uid and c.status = 'pending'
  returning c.id into v_id;
  if v_id is null then raise exception 'respond_to_request: no request waiting' using errcode = 'P0002'; end if;
end;
$$;
revoke execute on function public.respond_to_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated, service_role;

create or replace function public.withdraw_request(p_recipient uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'withdraw_request: not signed in' using errcode = '42501'; end if;
  update public.connection_requests c
  set status = 'withdrawn', responded_at = now()
  where c.from_member_id = v_uid and c.to_member_id = p_recipient and c.status = 'pending';
end;
$$;
revoke execute on function public.withdraw_request(uuid) from public, anon;
grant execute on function public.withdraw_request(uuid) to authenticated, service_role;

create or replace function public.set_follow(p_target uuid, p_on boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'set_follow: not signed in' using errcode = '42501'; end if;
  if p_target is null or p_target = v_uid then return; end if;
  if coalesce(p_on, false) then
    if private.is_blocked(v_uid, p_target) then return; end if;
    if not exists (select 1 from public.members m where m.id = p_target) then return; end if;
    insert into public.edges (from_id, to_id, edge_type) values (v_uid, p_target, 'follow')
    on conflict (from_id, to_id) where edge_type = 'follow' and revoked_at is null do nothing;
  else
    update public.edges e set revoked_at = now()
    where e.from_id = v_uid and e.to_id = p_target and e.edge_type = 'follow' and e.revoked_at is null;
  end if;
end;
$$;
revoke execute on function public.set_follow(uuid, boolean) from public, anon;
grant execute on function public.set_follow(uuid, boolean) to authenticated, service_role;

create or replace function public.dismiss_suggestion(p_target uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'dismiss_suggestion: not signed in' using errcode = '42501'; end if;
  if p_target is null or p_target = v_uid then return; end if;
  insert into public.dismissed_suggestions (member_id, dismissed_id) values (v_uid, p_target)
  on conflict do nothing;
end;
$$;
revoke execute on function public.dismiss_suggestion(uuid) from public, anon;
grant execute on function public.dismiss_suggestion(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- connection_request_intros: what a Connect post's card needs from its request (who, why) for
-- either party, with no status column. Owner-privileged view (not security_invoker) because the
-- sender has no select on the table (ruling 157); the WHERE clause is the whole audience.
-- ---------------------------------------------------------------------------
create or replace view public.connection_request_intros
with (security_invoker = false)
as
  select c.id, c.from_member_id, c.to_member_id, c.to_name, c.why, c.message, c.created_at
  from public.connection_requests c
  where c.from_member_id = auth.uid() or c.to_member_id = auth.uid();
revoke all on public.connection_request_intros from anon, public;
grant select on public.connection_request_intros to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profile_view: the relationship block now reads private.relationship_state (window included) and
-- mutuals come from member_connections. Everything else is unchanged from ruling 144's copy.
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
      'segment', m.segment, 'pattern', m.pattern, 'tier', v_tier),
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

-- ---------------------------------------------------------------------------
-- publish_post: the composer's Connect verb writes the request's message (ruling 119). Everything
-- else is unchanged from Brief 3's copy.
-- ---------------------------------------------------------------------------
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
    -- B3: a member anchor names the request's recipient (a Connect from that member's profile).
    v_to_member := case when v_anchor_kind = 'member' and v_anchor_id <> v_uid
      and exists (select 1 from public.members mm where mm.id = v_anchor_id) then v_anchor_id end;
    -- B4 (ruling 119): the request carries its message; a request is never sent empty.
    v_message := left(btrim(coalesce(nullif(f ->> 'why', ''), nullif(v_body, ''), '')), 300);
    if v_message = '' then
      raise exception 'An introduction needs a message.' using errcode = '22023';
    end if;
    insert into public.connection_requests (from_member_id, to_member_id, to_name, why, message, status)
    values (v_uid, v_to_member, coalesce(f ->> 'who', ''), v_message, v_message, 'pending')
    returning id into v_obj_id;
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

  insert into public.posts (id, author_kind, author_id, created_by, c_category, body, anchor_kind, anchor_id,
                            created_object_kind, created_object_id, audience, status, published_at)
  values (v_post_id, v_author_kind, v_author_id, v_uid, v_c, v_body, v_anchor_kind, v_anchor_id,
          v_obj_kind, v_obj_id, v_audience, 'published', now());

  for m in select * from jsonb_array_elements(coalesce(payload -> 'media', '[]'::jsonb)) loop
    insert into public.post_media (post_id, storage_path, width, height, position)
    values (v_post_id, m ->> 'storage_path', (m ->> 'width')::int, (m ->> 'height')::int, coalesce((m ->> 'position')::int, 0));
  end loop;

  if nullif(payload -> 'link' ->> 'url', '') is not null then
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
