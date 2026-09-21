-- Convene Pass 2 (Brief 10, Attend): attendance gets its table. Rulings 1002, 1003, 1009, 1011 and
-- 1012, on 515, 518, 653 and 680. Committed before it is applied (ruling 225). Applied to the
-- canonical project by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269). Runs after 20260921120000, whose private.admit_audience it reads.
--
-- The model (1002). A registration row is the truth for attendance. The event_rsvp edge that the
-- Connection Engine reads is derived from it inside the one write path, private.rsvp_write, in the
-- same transaction and never by a trigger, and private.rsvp_edge_drift() names every place the two
-- disagree so that an arm can enforce it. Direct client writes are refused: authenticated holds
-- select only on the table, and no policy admits an insert, an update or a delete.
--
-- The row. status is 1009's enum, going and not_going: not yet responded is no row, withdrawing lands
-- on not_going, and maybe is absent until a brief draws it. audience_override is 680's per-event
-- override; null means the member's own default, which is their member_visibility row for 'convene'
-- (1003) and connections when they have none (1004). contact_consent is 653's per-event consent,
-- default off. A guest is a row with no member_id and one field, guest_email (532, 653). A guest
-- produces no edge, because edges.from_id is foreign-keyed to members, and no guest write path exists
-- yet: the guest return and conversion arrive with Brief 10's build. The invited state is not here
-- (1012). The ticket and its currency, which 1002 also places on this row, arrive with the ticketing
-- pass, whose amounts and Stripe references are not decided; they will be new columns under 466.
--
-- Who reads what, by persona:
--   member      their own row in any status; another member's row only when it is going, the
--               registrant's audience admits them (1010's admit_audience, over the override or the
--               default), neither has blocked the other (1011), and the viewer can see the event under
--               the events table's own row policy. A guest row is never shown to a member, and a
--               signed-out viewer reads nothing (680).
--   event host  every row of their own events, guests included (653: the host sees the list whole).
--   Space lead  nothing beyond what a member reads; a lead is not a host, and delegated roles arrive
--               with the named-parties table.
--   admin       every row, read only; a write outside rsvp_write would break 1002's derivation.
--   service     everything.
--
-- The write path. public.rsvp_event is security invoker, so the events table's own policy decides
-- whether this member can see the event: that policy reads posts under their own policies, and a
-- definer function would bypass exactly that. It then calls private.rsvp_write, security definer,
-- which acts only for auth.uid(), locks the event row so that two answers cannot overrun capacity,
-- and refuses an event that is not published, is cancelled or has ended (515: completion is derived
-- from the end time). ONE ASSUMPTION TO CHECK: a ticket writes going (518) and ticketing is not built,
-- so an event whose ticket_kind is not 'free' takes no going answer yet. That includes 'donation',
-- which 20260916120000 records as a ticket kind whose amounts come later.

create type public.registration_status as enum ('going', 'not_going');

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  guest_email text,
  status public.registration_status not null,
  audience_override public.audience,
  contact_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registrations_party_check check (
    (member_id is not null and guest_email is null)
    or (
      member_id is null
      and guest_email is not null
      and guest_email = lower(btrim(guest_email))
      and guest_email like '%_@_%'
    )
  ),
  constraint event_registrations_guest_override_check check (member_id is not null or audience_override is null)
);

create unique index event_registrations_member_uidx
  on public.event_registrations (event_id, member_id) where member_id is not null;
create unique index event_registrations_guest_uidx
  on public.event_registrations (event_id, guest_email) where guest_email is not null;
create index event_registrations_event_status_idx on public.event_registrations (event_id, status);
create index event_registrations_member_idx
  on public.event_registrations (member_id) where member_id is not null;

-- One live RSVP edge per member and event, the shape follow and connect already carry.
create unique index edges_event_rsvp_live_uidx
  on public.edges (from_id, to_id) where edge_type = 'event_rsvp' and revoked_at is null;

alter table public.event_registrations enable row level security;

revoke all on table public.event_registrations from anon, authenticated;
grant select on table public.event_registrations to authenticated;
grant all on table public.event_registrations to service_role;

-- The member read: the registrant's audience over the viewer, with blocks in both directions.
create function private.can_see_registrant(p_member uuid, p_override public.audience)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_member is not null
    and not private.is_blocked(auth.uid(), p_member)
    and private.admit_audience(
      p_member,
      coalesce(p_override, private.section_audience(p_member, 'convene')),
      auth.uid()
    );
$$;

revoke execute on function private.can_see_registrant(uuid, public.audience) from public, anon;
grant execute on function private.can_see_registrant(uuid, public.audience) to authenticated, service_role;

create policy event_registrations_member_select on public.event_registrations
  for select to authenticated
  using (
    member_id = (select auth.uid())
    or (
      status = 'going'
      and private.can_see_registrant(member_id, audience_override)
      and exists (select 1 from public.events e where e.id = event_registrations.event_id)
    )
  );

create policy event_registrations_event_host_select on public.event_registrations
  for select to authenticated
  using (private.is_event_host(event_id));

create policy event_registrations_admin_select on public.event_registrations
  for select to authenticated
  using (private.is_admin());

create policy event_registrations_service_role on public.event_registrations
  for all to service_role
  using (true)
  with check (true);

-- The one write path. Acts only for auth.uid(); the derived edge is written in this transaction.
create function private.rsvp_write(
  p_event uuid,
  p_member uuid,
  p_status public.registration_status,
  p_audience_override public.audience,
  p_contact_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_prior public.registration_status;
  v_capacity integer;
  v_going bigint;
  v_row public.event_registrations%rowtype;
begin
  if p_member is null or p_member is distinct from auth.uid() then
    raise exception 'rsvp_write: a member answers only for themselves' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'Finish joining DNA before you answer an event.' using errcode = '22023';
  end if;

  select * into v_event from public.events e where e.id = p_event for update;
  if not found then
    raise exception 'That event is not one you can answer.' using errcode = '22023';
  end if;
  if v_event.status <> 'published' or v_event.cancelled_at is not null then
    raise exception 'This event is not taking answers.' using errcode = '22023';
  end if;
  if coalesce(v_event.ends_at, v_event.starts_at) is not null
     and coalesce(v_event.ends_at, v_event.starts_at) <= now() then
    raise exception 'This event has already happened.' using errcode = '22023';
  end if;

  select r.status into v_prior
  from public.event_registrations r
  where r.event_id = p_event and r.member_id = p_member;

  if p_status = 'going' and v_prior is distinct from 'going' then
    if v_event.ticket_kind <> 'free' then
      raise exception 'This event takes tickets, and tickets are not open yet.' using errcode = '22023';
    end if;
    select s.capacity into v_capacity from public.event_host_settings s where s.event_id = p_event;
    if v_capacity is not null then
      select count(*) into v_going
      from public.event_registrations r
      where r.event_id = p_event and r.status = 'going';
      if v_going >= v_capacity then
        raise exception 'This event is full.' using errcode = '22023';
      end if;
    end if;
  end if;

  insert into public.event_registrations as r (event_id, member_id, status, audience_override, contact_consent)
  values (p_event, p_member, p_status, p_audience_override, coalesce(p_contact_consent, false))
  on conflict (event_id, member_id) where member_id is not null do update
    set status = excluded.status,
        audience_override = excluded.audience_override,
        contact_consent = excluded.contact_consent,
        updated_at = now()
  returning r.* into v_row;

  if v_row.status = 'going' then
    insert into public.edges (from_id, to_id, edge_type)
    values (p_member, p_event, 'event_rsvp')
    on conflict (from_id, to_id) where edge_type = 'event_rsvp' and revoked_at is null do nothing;
  else
    update public.edges e
    set revoked_at = now()
    where e.from_id = p_member and e.to_id = p_event
      and e.edge_type = 'event_rsvp' and e.revoked_at is null;
  end if;

  return jsonb_build_object(
    'event_id', v_row.event_id,
    'status', v_row.status,
    'audience_override', v_row.audience_override,
    'contact_consent', v_row.contact_consent,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke execute on function private.rsvp_write(uuid, uuid, public.registration_status, public.audience, boolean) from public, anon;
grant execute on function private.rsvp_write(uuid, uuid, public.registration_status, public.audience, boolean) to authenticated;

-- The client's entry point. Invoker, so the events table's policy answers "can this member see it".
create function public.rsvp_event(
  p_event uuid,
  p_status public.registration_status,
  p_audience_override public.audience default null,
  p_contact_consent boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'rsvp_event: not signed in' using errcode = '42501';
  end if;
  if p_event is null or p_status is null then
    raise exception 'An answer needs an event and a choice.' using errcode = '22023';
  end if;
  perform 1 from public.events e where e.id = p_event;
  if not found then
    raise exception 'That event is not one you can answer.' using errcode = '22023';
  end if;
  return private.rsvp_write(p_event, v_uid, p_status, p_audience_override, p_contact_consent);
end;
$$;

revoke execute on function public.rsvp_event(uuid, public.registration_status, public.audience, boolean) from public, anon;
grant execute on function public.rsvp_event(uuid, public.registration_status, public.audience, boolean) to authenticated, service_role;

-- 1002's enforcement: every going member registration has exactly one live edge, and every live edge
-- has a going registration. An empty result is agreement.
create function private.rsvp_edge_drift()
returns table (kind text, event_id uuid, member_id uuid)
language sql
stable
security definer
set search_path to ''
as $$
  select 'going without an edge'::text, r.event_id, r.member_id
  from public.event_registrations r
  where r.member_id is not null
    and r.status = 'going'
    and not exists (
      select 1 from public.edges e
      where e.edge_type = 'event_rsvp' and e.revoked_at is null
        and e.from_id = r.member_id and e.to_id = r.event_id
    )
  union all
  select 'edge without going'::text, e.to_id, e.from_id
  from public.edges e
  where e.edge_type = 'event_rsvp' and e.revoked_at is null
    and not exists (
      select 1 from public.event_registrations r
      where r.member_id = e.from_id and r.event_id = e.to_id and r.status = 'going'
    );
$$;

revoke execute on function private.rsvp_edge_drift() from public, anon, authenticated;
grant usage on schema private to live_arms;
grant execute on function private.rsvp_edge_drift() to service_role, live_arms;
