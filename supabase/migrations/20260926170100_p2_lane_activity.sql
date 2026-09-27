-- Convene Discovery, first Discovery handoff (Session 34), file 2 of 4: the member's recent acts per lane,
-- which order that member's lanes. Rulings 1124 (reversing 1091), 1160, 581 and the one-write-path rule.
-- Runs after 20260926170000. Committed before it is applied (ruling 225). Applied to the canonical project
-- by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269).
--
-- public.member_lane_activity holds one row per member and lane: the latest act the member took from a
-- card in that lane (open, save or follow) and when. convene_discovery reads the rows from the last seven
-- days and moves those lanes up, most recent first, the base order holding beneath (1124). Nothing hides.
--
-- One write path (1160): the table grants no insert or update to authenticated. public.note_lane_act is
-- the only writer, runs with definer rights, and writes the caller's own row alone. The app calls it from
-- the three acts only, never on load and never from the pane (B9-SPEC). The member reads and deletes
-- their own rows under row policy; nobody else reads them, and no row is ever shown as a number.

create table public.member_lane_activity (
  member_id uuid not null references public.members (id) on delete cascade,
  lane text not null references public.convene_lanes (lane) on update cascade on delete cascade,
  act text not null check (act in ('open', 'save', 'follow')),
  acted_at timestamptz not null default now(),
  primary key (member_id, lane)
);

comment on table public.member_lane_activity is
  'A member''s latest act (open, save, follow) from a Discovery lane, one row per lane (1124, 1160). Orders that member''s lanes; never shown. Written only by note_lane_act.';

alter table public.member_lane_activity enable row level security;

revoke all on table public.member_lane_activity from public, anon, authenticated;
grant select, delete on table public.member_lane_activity to authenticated;
grant all on table public.member_lane_activity to service_role;

create policy member_lane_activity_owner_select on public.member_lane_activity
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy member_lane_activity_owner_delete on public.member_lane_activity
  for delete to authenticated
  using (member_id = (select auth.uid()));

create policy member_lane_activity_service_role on public.member_lane_activity
  for all to service_role
  using (true) with check (true);

create function public.note_lane_act(p_lane text, p_act text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'note_lane_act: not signed in' using errcode = '42501';
  end if;
  if p_lane is null or not exists (select 1 from public.convene_lanes l where l.lane = p_lane) then
    raise exception 'That is not a lane.' using errcode = '22023';
  end if;
  if p_act is null or p_act not in ('open', 'save', 'follow') then
    raise exception 'That is not an act.' using errcode = '22023';
  end if;
  insert into public.member_lane_activity (member_id, lane, act, acted_at)
  values (v_uid, p_lane, p_act, now())
  on conflict (member_id, lane) do update
    set act = excluded.act, acted_at = excluded.acted_at;
end;
$$;

revoke execute on function public.note_lane_act(text, text) from public, anon;
grant execute on function public.note_lane_act(text, text) to authenticated, service_role;
