-- Convene Discovery, first Discovery handoff (Session 34), file 3 of 4: the going row's names for a list
-- of events, resolved as the event page resolves them. Rulings 1124, 1128, 1138, 1158, 508, 645 and 680.
-- Runs after 20260926170100. Committed before it is applied (ruling 225). Applied to the canonical project
-- by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269).
--
-- public.event_page counts the going rows the viewer's own row policy returns on
-- public.event_registrations (event_registrations_member_select: the viewer's own row, and any going row
-- private.can_see_registrant admits) and names attendees only at five or more (645). This function runs
-- as the caller too, reads the same rows under the same policy, and applies the same floor, so the card
-- and the page agree on every event. The viewer's own row counts toward the floor and is never named
-- (1158). The others are ordered as event_page orders them: connections first, then members who share an
-- anchor with the viewer, then RSVP order. It returns the first three first names only (1138); the words
-- around them are the app's. An event under the floor, or with fewer than three names to give, is absent
-- from the answer, and the card's row stays empty. Real names only, never a count: the answer carries no
-- number. Anon cannot execute it, so no signed-out surface changes. A call names at most 200 events.
--
-- A first name is the member's name up to its first space, trimmed, as the app has no separate given-name
-- field; the lookup is here so that no name is derived in TypeScript (B9-SPEC, Card).

create function public.event_going_names(p_events uuid[])
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'event_going_names: not signed in' using errcode = '42501';
  end if;
  if p_events is null or cardinality(p_events) = 0 then
    return '{}'::jsonb;
  end if;
  if cardinality(p_events) > 200 then
    raise exception 'At most 200 events at a time.' using errcode = '22023';
  end if;

  return (
    with visible as (
      select r.event_id, r.member_id, r.created_at
      from public.event_registrations r
      where r.event_id = any (p_events)
        and r.status = 'going'
        and r.member_id is not null
    ),
    floored as (
      select v.event_id
      from visible v
      group by v.event_id
      having count(*) >= 5
    ),
    others as (
      select v.event_id,
        nullif(split_part(btrim(d.name), ' ', 1), '') as first_name,
        row_number() over (
          partition by v.event_id
          order by private.is_connected(v_uid, v.member_id) desc,
                   private.shares_anchor(v_uid, v.member_id) desc,
                   v.created_at, v.member_id
        ) as rn
      from visible v
      join floored f on f.event_id = v.event_id
      cross join lateral private.member_display(array[v.member_id]) d
      where v.member_id <> v_uid
        and nullif(split_part(btrim(d.name), ' ', 1), '') is not null
    ),
    named as (
      select o.event_id, jsonb_agg(o.first_name order by o.rn) as names
      from others o
      where o.rn <= 3
      group by o.event_id
      having count(*) = 3
    )
    select coalesce(jsonb_object_agg(n.event_id::text, n.names), '{}'::jsonb)
    from named n
  );
end;
$$;

revoke execute on function public.event_going_names(uuid[]) from public, anon;
grant execute on function public.event_going_names(uuid[]) to authenticated, service_role;
