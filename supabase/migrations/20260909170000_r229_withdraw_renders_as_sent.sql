-- ---------------------------------------------------------------------------
-- Ruling 229 (closing G6, opened by ruling 227): withdraw renders identically for a pending
-- request and for one inside the decline window.
--
-- Ruling 214 made the two states return byte-identical payloads. What it did not settle is what
-- happens after the sender presses Request sent. withdraw_request updates a pending row and matches
-- nothing else, so inside the window it was already a silent server-side no-op — and that was the
-- leak: a pending request became none and the Connect action came back, while a request inside the
-- window stayed sent. One click separated the two states ruling 157 exists to keep together.
--
-- Option 1 of three, chosen deliberately. private.relationship_display maps a withdrawn request to
-- sent for the rest of the window, exactly as it already maps window to sent. Server behaviour
-- inside the window is untouched and stays a literal no-op; there is no schema change; and because
-- no Connect action comes back in either case, the sender cannot re-send from the surface and so
-- cannot use the send path as an oracle either.
--
-- Accepted cost, recorded rather than discovered: a sender who withdraws a genuine pending request
-- does not get the Connect action back for that member until the window elapses, even though the
-- withdrawal really happened and the recipient's Requests row really did leave. They gave up their
-- turn.
--
-- The button was not the only surface. Three others separated the states and are closed here with
-- it: the Suggested lens, which reads relationship_state and would have readmitted a withdrawn
-- candidate while keeping a window one out; the Sent section of My Network, whose row vanishes on
-- withdrawal and stays for the window; and send_introduction, which would have accepted a re-send
-- from the withdrawn sender and refused the window one. All four now say the same thing.
--
-- No table, column, policy or grant changes. One helper body and two function bodies replaced.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The outward state: what leaves the database about a relationship, for every surface and for the
-- one write path that gates on one. private.relationship_state stays the raw state machine and is
-- unchanged; "display" here means "what exists outside this database", not what a component styles.
-- ---------------------------------------------------------------------------
create or replace function private.relationship_display(p_viewer uuid, p_target uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v text := private.relationship_state(p_viewer, p_target);
begin
  if v = 'window' then return 'sent'; end if;
  -- Ruling 229: a request the sender withdrew reads sent for the rest of the window, so the two
  -- cases the ruling joins cannot be told apart by withdrawing and watching what changes.
  if v = 'none' and exists (
    select 1 from public.connection_requests c
    where c.from_member_id = p_viewer
      and c.to_member_id = p_target
      and c.status = 'withdrawn'
      and c.responded_at > now() - make_interval(days => private.setting_int('decline_window_days', 90))
  ) then
    return 'sent';
  end if;
  return v;
end;
$$;
revoke execute on function private.relationship_display(uuid, uuid) from public, anon;
grant execute on function private.relationship_display(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The Suggested lens and the Sent section of My Network.
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
        -- Ruling 213: a Private member is not in Members for anyone but an existing connection.
        and private.admit_member(m.id, v_uid)
        -- Ruling 212 (F5): every axis over a section-gated attribute checks the audience first, or
        -- the filter is a searchable index over what the member withheld. segment, location and
        -- origin join heritage, pathway, focus, industry, skill and region, which already did.
        and (f ->> 'segment' is null or (private.admit_section(m.id, 'segment', v_uid) and m.segment::text = f ->> 'segment'))
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

revoke execute on function public.connect_cards(text, jsonb, text, integer) from public, anon;
grant execute on function public.connect_cards(text, jsonb, text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The write path, so it cannot be used as an oracle for a state the surfaces have made identical.
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
  values (v_uid, p_recipient, v_name, v_msg, v_msg, 'pending')
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.send_introduction(uuid, text) from public, anon;
grant execute on function public.send_introduction(uuid, text) to authenticated, service_role;
