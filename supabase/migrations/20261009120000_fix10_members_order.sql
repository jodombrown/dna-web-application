-- Fix PR 10, item 2 (handoff 59-FIX-10; ruling 1483, under 212, 213 and 241): the Members order.
-- A request waiting on the viewer comes first, then a member who shares an anchor, then a second
-- degree member, then one who shares an active corridor or an attribute, then everyone else; within
-- a tier the order is the name. The tier is internal and is never shown (no score, no label).
-- Filters narrow and never reorder.
--
-- private.members_order_tier(viewer, member) answers the first tier that holds, reading the tables
-- the Suggested branch already reads and gating every attribute overlap with private.admit_section
-- exactly as that branch gates it (work for focus areas, industries and regional expertise; skills;
-- languages), so a tier never reveals an attribute the viewer's audience scope withholds (212).
-- Second degree stays the materialized public.second_degree table (doctrine): the tier reads it and
-- never computes it. The tier is computed inline here; ruling 1483 names a materialized ordering key
-- at Moderate confidence, and the register entry this PR writes names the cohort at which the
-- inline plan should give way to it.
--
-- public.connect_cards is a full create or replace of the live body as read by Chat on 9 October
-- 2026 (pg_get_functiondef, md5(prosrc) f1c6af07d430f3ea9172c19564724d5a, 12,708 characters; no
-- migration file in the tree held it verbatim, 20260913072642 and 20260921120000 having rewritten
-- it in place from pg_get_functiondef). The Members branch alone is changed: the cursor parses as
-- {tier}|{name}|{id}, the candidate set carries the branch's filter block unchanged, the page is
-- ordered by (tier, name, id) with a keyset on the same triple, and a cursor that does not parse
-- starts from the first page. The cursor variable the new form needs is declared in a block inside
-- the branch so the function's own declare section is untouched. Chat diffs this file against the
-- attachment before applying it.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963), with its
-- supabase_migrations.schema_migrations row in the same transaction. No signature changes, so
-- src/lib/database.types.ts is expected to regenerate without a diff.

create function private.members_order_tier(p_viewer uuid, p_member uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    -- 0: a request from the member waiting on the viewer.
    when exists (
      select 1 from public.connection_requests c
      where c.from_member_id = p_member and c.to_member_id = p_viewer and c.status = 'pending'
    ) then 0
    -- 1: anchored, a shared active Space role or a shared attested event (private.shares_anchor).
    when private.shares_anchor(p_viewer, p_member) then 1
    -- 2: second degree, from the materialized set, never computed here.
    when exists (
      select 1 from public.second_degree s where s.member_id = p_viewer and s.fof_id = p_member
    ) then 2
    -- 3: a shared active corridor, or an overlap on focus areas, industries, regional expertise,
    --    skills or languages, each gated by private.admit_section as the Suggested branch gates it.
    when exists (
      select 1 from public.member_corridors a
      join public.member_corridors b on b.corridor_id = a.corridor_id
      join public.corridors c on c.id = a.corridor_id
      where a.member_id = p_viewer and b.member_id = p_member and c.status = 'active'
    )
    or (private.admit_section(p_member, 'work', p_viewer) and (
      exists (
        select 1 from public.member_focus_areas a join public.member_focus_areas b on b.name = a.name
        where a.member_id = p_viewer and b.member_id = p_member
      )
      or exists (
        select 1 from public.member_industries a join public.member_industries b on b.name = a.name
        where a.member_id = p_viewer and b.member_id = p_member
      )
      or exists (
        select 1 from public.member_regional_expertise a
        join public.member_regional_expertise b on b.name = a.name
        where a.member_id = p_viewer and b.member_id = p_member
      )
    ))
    or (private.admit_section(p_member, 'skills', p_viewer) and exists (
      select 1 from public.member_skills a join public.member_skills b on b.name = a.name
      where a.member_id = p_viewer and b.member_id = p_member
    ))
    or (private.admit_section(p_member, 'languages', p_viewer) and exists (
      select 1 from public.member_languages a join public.member_languages b on b.name = a.name
      where a.member_id = p_viewer and b.member_id = p_member
    )) then 3
    -- 4: everyone else.
    else 4
  end::smallint;
$$;

comment on function private.members_order_tier(uuid, uuid) is
  'Ruling 1483: the Members lens''s ordering tier for one viewer and one member, 0 a pending request from the member to the viewer, 1 a shared anchor, 2 second degree (the materialized set), 3 a shared active corridor or an attribute overlap the viewer may see (212), 4 otherwise. Internal: read by connect_cards(''members'') for its order and its cursor, and never shown.';

revoke execute on function private.members_order_tier(uuid, uuid) from public, anon, authenticated;
-- Ruling 382: the live arm reads the tier directly to prove the fallback order, and nothing wider.
grant execute on function private.members_order_tier(uuid, uuid) to live_arms;

CREATE OR REPLACE FUNCTION public.connect_cards(p_lens text, p_filters jsonb DEFAULT '{}'::jsonb, p_cursor text DEFAULT NULL::text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- Ruling 1483 (Fix PR 10): the Members order is a request waiting on the viewer, then anchored,
    -- then second degree, then a shared corridor or an attribute overlap, then name. The tier is
    -- private.members_order_tier, computed inline for every admitted member and never shown; the
    -- page is ordered by (tier, name, id) and the cursor is {tier}|{name}|{id}. The client treats
    -- the cursor as opaque (src/lib/connect.ts); one that does not parse in this form starts from
    -- the first page rather than raising. Filters narrow and never reorder: the filter block below
    -- is the one the branch carried before this ruling, moved into the candidate set unchanged.
    declare
      v_cur_tier smallint;
    begin
      if p_cursor ~ '^[0-4]\|.+\|[0-9a-fA-F-]{36}$' then
        v_cur_tier := left(p_cursor, 1)::smallint;
        v_cur_id := private.uuid_or_null(right(p_cursor, 36));
        v_cur_name := substr(p_cursor, 3, length(p_cursor) - 39);
      end if;
      v_matched := array_remove(array[f ->> 'focus', f ->> 'industry', f ->> 'skill', f ->> 'region'], null);
      for r in
        -- Materialized so the tier is computed once per candidate, for the keyset and the order alike.
        with cand as materialized (
          select m.id, m.name, private.members_order_tier(v_uid, m.id) as tier
          from public.members m
          where m.id <> v_uid
            and not private.is_blocked(v_uid, m.id)
            -- Ruling 213: a Private member is not in Members for anyone but an existing connection.
            and private.admit_member(m.id, v_uid) and private.is_onboarded(m.id)
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
        )
        select c.id, c.name, c.tier
        from cand c
        where v_cur_id is null or (c.tier, c.name, c.id) > (v_cur_tier, v_cur_name, v_cur_id)
        order by c.tier, c.name, c.id
        limit v_limit + 1
      loop
        v_n := v_n + 1;
        if v_n > v_limit then
          v_next := r.tier::text || '|' || r.name || '|' || r.id::text;
          exit;
        end if;
        v_card := private.connect_card(v_uid, r.id, 'members', v_matched);
        if v_card is not null then v_items := v_items || v_card; end if;
      end loop;
      return jsonb_build_object('items', v_items, 'next_cursor', v_next);
    end;

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
          (select coalesce(jsonb_agg(distinct (c.diaspora_place || ' to ' || c.continental_place)), '[]'::jsonb)
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
          and private.admit_member(m.id, v_uid) and private.is_onboarded(m.id)
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
$function$
