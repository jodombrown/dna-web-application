-- Handoff 44-MC-R3 (Session 59), the MemberCard port: the projection, still the one read (CLAUDE.md's
-- absolute; Brief 4's four projections). Rulings 1531 and 1449 with 1530, under 466 (a change is a new
-- file) and 225 (committed before it is applied).
--
-- Two functions, each written from its live body on the canonical project, read through
-- pg_get_functiondef at 01:20 PDT (08:20 UTC) on 10 October 2026 (the handoff's rule: the live body, and say
-- which):
--
--   private.connect_card   live md5(prosrc) a4632338f471c92e23afafd2e16ed392, 5,123 characters. The
--                          handoff named 20260912090557_fix_pr_02_rulings_408_444.sql as its definer
--                          at moderate confidence; the live body is that file's body with ruling 467's
--                          substitution applied (20260913065103_r467_corridor_label_order.sql
--                          rewrote the corridor label in place by `execute`), which the md5 proves.
--                          Change: mutuals are returned for a connected member too (1531). The
--                          `if v_rel <> 'connected'` guard around the mutuals read is gone; the read
--                          itself, its cap of three and its name order are unchanged.
--   public.connect_cards   live md5(prosrc) a0c98d8be7892bccf5905d7c9720b87c, 14,517 characters,
--                          byte-identical to 20261009120300_fix10_members_cursor.sql's body (Chat
--                          applied it with the recorded md5 equal to the file). Change: each received
--                          request carries `since`, the request's created_at, raw (1449, 1530); the
--                          lib formats it. The requests loop selects created_at and adds the key.
--                          1483's tier order, private.members_order_tier and the W94 cursor are
--                          byte-for-byte as 20261009120300 wrote them; the generator that wrote this
--                          file asserted the Members branch unchanged.
--
-- `handle` was already returned by private.connect_card (confirmed on the live body) and is unchanged.
-- No signature change, no grant change, no table change: nothing here needs an admin_catalogue row.
--
-- Applied by Chat through execute_sql (963) after this commit and before the enforcing run, guarded on
-- the two live md5s above, with its supabase_migrations.schema_migrations row in the same transaction.

CREATE OR REPLACE FUNCTION private.connect_card(p_viewer uuid, p_member uuid, p_context text, p_matched text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  select c.diaspora_place || ' to ' || c.continental_place into v_corridor
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

  -- Mutuals as names, up to three, never a count (ruling 120). Ruling 1531 (handoff 44-MC-R3): a
  -- connected member's card shows them too, so the guard that withheld them once connected is gone.
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
$function$;

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
    -- The cursor is the last emitted row's key (W94): the row fetched at limit + 1 is the next
    -- page's first row, and a cursor taken from it skipped that member at every boundary.
    declare
      v_cur_tier smallint;
      v_last_tier smallint;
      v_last_name text;
      v_last_id uuid;
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
          -- W94 (Fix PR 10): this row, fetched at limit + 1, is the next page's first row, so the
          -- cursor is the key of the last row this page consumed, never this row's own key.
          v_next := v_last_tier::text || '|' || v_last_name || '|' || v_last_id::text;
          exit;
        end if;
        v_last_tier := r.tier;
        v_last_name := r.name;
        v_last_id := r.id;
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
      select c.id, c.from_member_id, c.message, c.created_at
      from public.connection_requests c
      where c.to_member_id = v_uid and c.status = 'pending' and not private.is_blocked(v_uid, c.from_member_id)
      order by c.created_at desc
    loop
      v_card := private.connect_card(v_uid, r.from_member_id, 'requests', '{}');
      -- Rulings 1449 and 1530 (handoff 44-MC-R3): the request's arrival travels raw as since; the app's
      -- lib formats it, never the part and never this projection.
      if v_card is not null then
        v_requests := v_requests || (v_card || jsonb_build_object('message', r.message, 'since', r.created_at));
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
$function$;
