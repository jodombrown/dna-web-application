-- Convene Pass 2 (Brief 10, Attend) and the Hub's Relationships (Brief 8): named parties get their
-- table. Rulings 1018, 1019, 1020, 1021 and 1022, on 678, 679, 737, 752 and 1002. Committed before it
-- is applied (ruling 225). Applied to the canonical project by Chat through the Supabase MCP's
-- execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations row in the
-- same transaction, and never by apply_migration (rulings 553, 269). Runs after 20260921140000, in a
-- second transaction, because it uses the notice kinds and the anchor that file adds.
--
-- The vocabulary (1018, 678). public.event_role_kinds is the one runtime vocabulary of the roles a
-- host can name on an event, in public.member_stances' shape: a machine value, the label a surface
-- shows, the verb the invitation reads (Brief 10 draws "invited you to moderate this event"), and a
-- position. public.vocabularies() serves it as event_roles. It seeds the five people-shaped roles.
-- Partner and exhibitor are organizations the host names on Brief 8's portfolio record (1019, 630,
-- 776) and are not rows here. The permission roles join this table with Brief 8's Team migration,
-- together with the one permission helper (1018, 516). No row here grants authority, co-host
-- included: private.is_event_host still resolves from events.host_member_id until then. Only
-- moderate is drawn copy; the other four verbs are data a later edit may change.
--
-- The row (1018, 678, 1020). public.event_parties names one member in one role on one event, with a
-- status of invited, accepted or declined. Acceptance is the member's own opt-in to render with image
-- and name on every projection of that event (678). One row per role, so a member can speak and
-- moderate. Members only: a non-member invited by email arrives with Brief 8's invitations migration,
-- so role and attendance invitations share one email mechanism (1020, 1012).
--
-- Who reads what, by persona:
--   named member  their own rows in every status.
--   event host    every row of their own events, which the Hub renders (Brief 8).
--   member        accepted rows of any event the events table's own policy lets them see. A pending
--                 or declined row reaches nobody else, which is 737 on the signed-in page.
--   signed out    nothing from this table. The public page's accepted names and its pending roles
--                 come from the event page's projection in Brief 10's build, not from these policies.
--   admin         every row, read only.
--   service       everything.
-- A block does not hide an accepted party. 1011 is the registration policy's alone, and an accepted
-- party has opted into the signed-out page, which a block cannot reach.
--
-- The event, for the member named on it. events_named_party_select lets a member read an event they
-- are named on, through private.is_event_party, so an invitation to an event they could not otherwise
-- see can still be read and answered. It is the one change to an existing table's policies.
--
-- The write paths. Direct writes are refused: authenticated holds select only, and no policy admits
-- an insert, an update or a delete. Three functions write, each acting only for auth.uid():
--   invite_event_party       the host, through private.is_event_host, names a member in a role on a
--                            published event that is not cancelled. It refuses the host themself, a
--                            member either side has blocked, and a role not in the vocabulary. A second
--                            invitation to the same member in the same role returns the existing row
--                            and writes no second notice.
--   respond_to_event_role    the named member accepts or declines, and withdraws an acceptance by
--                            declining. Accepting needs the event published and not cancelled;
--                            declining is always open, because withdrawing consent is never gated.
--   remove_event_party       the host removes an invited or accepted row. A declined row is the
--                            member's answer and stays, so removal cannot be used to ask again.
--
-- The notice (1021, 752). The invitation writes the member's role_invitation notice in the same
-- transaction. Accepting turns that same row into role_accepted, read; declining deletes it; accepting
-- again after a decline writes a fresh role_accepted. Removal deletes the row's notices. No notice goes
-- to the host, because none is drawn. G56 records why a notification is not a derived row under 1002,
-- so no drift function follows it; it is still written by the write path and never by a trigger. Both
-- kinds resolve to Convene through the table's generated c_category (736).
--
-- The count behind the RSVP drift arm's PASS (1022, G57). private.rsvp_going_member_count() returns
-- the number of going member registrations and nothing else. live_arms may execute it and still reads
-- no registration row: it does not bypass row security (382), and a policy admitting it would show it
-- real members' rows.

-- The vocabulary (1018, 678).
create table public.event_role_kinds (
  role text primary key,
  label text not null,
  verb text not null,
  position smallint not null,
  constraint event_role_kinds_role_check check (role ~ '^[a-z][a-z_]*[a-z]$'),
  constraint event_role_kinds_label_check check (label = btrim(label) and label <> ''),
  constraint event_role_kinds_verb_check check (verb = btrim(verb) and verb <> ''),
  constraint event_role_kinds_label_key unique (label),
  constraint event_role_kinds_position_key unique (position)
);

alter table public.event_role_kinds enable row level security;

revoke all on table public.event_role_kinds from anon, authenticated;
grant select on table public.event_role_kinds to authenticated;
grant all on table public.event_role_kinds to service_role;

create policy event_role_kinds_member_select on public.event_role_kinds
  for select to authenticated
  using (true);

create policy event_role_kinds_service_role on public.event_role_kinds
  for all to service_role
  using (true)
  with check (true);

insert into public.event_role_kinds (role, label, verb, position) values
  ('speaker', 'Speaker', 'speak at', 1),
  ('panelist', 'Panelist', 'join the panel at', 2),
  ('moderator', 'Moderator', 'moderate', 3),
  ('performer', 'Performer', 'perform at', 4),
  ('co_host', 'Co-host', 'co-host', 5);

-- The row (1018, 678, 1020).
create type public.event_party_status as enum ('invited', 'accepted', 'declined');

create table public.event_parties (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role text not null references public.event_role_kinds (role),
  status public.event_party_status not null default 'invited',
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_parties_event_member_role_key unique (event_id, member_id, role),
  constraint event_parties_responded_check check ((status = 'invited') = (responded_at is null))
);

create index event_parties_event_status_idx on public.event_parties (event_id, status);
create index event_parties_member_idx on public.event_parties (member_id);
create index event_parties_role_idx on public.event_parties (role);

alter table public.event_parties enable row level security;

revoke all on table public.event_parties from anon, authenticated;
grant select on table public.event_parties to authenticated;
grant all on table public.event_parties to service_role;

create policy event_parties_named_member_select on public.event_parties
  for select to authenticated
  using (member_id = (select auth.uid()));

create policy event_parties_event_host_select on public.event_parties
  for select to authenticated
  using (private.is_event_host(event_id));

create policy event_parties_accepted_select on public.event_parties
  for select to authenticated
  using (
    status = 'accepted'
    and exists (select 1 from public.events e where e.id = event_parties.event_id)
  );

create policy event_parties_admin_select on public.event_parties
  for select to authenticated
  using (private.is_admin());

create policy event_parties_service_role on public.event_parties
  for all to service_role
  using (true)
  with check (true);

-- The event, for the member named on it. Definer, so the read of event_parties does not re-enter the
-- events policy that calls it.
create function private.is_event_party(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.event_parties p
      where p.event_id = p_event and p.member_id = auth.uid()
    );
$$;

revoke execute on function private.is_event_party(uuid) from public, anon;
grant execute on function private.is_event_party(uuid) to authenticated, service_role;

create policy events_named_party_select on public.events
  for select to authenticated
  using (private.is_event_party(id));

-- The notice's C (736): both role kinds resolve to Convene.
alter table public.notifications
  alter column c_category set expression as (
    case kind
      when 'connection_accepted' then 'connect'::public.c_category
      when 'attestation_received' then 'contribute'::public.c_category
      when 'space_role_approved' then 'collaborate'::public.c_category
      when 'event_reminder' then 'convene'::public.c_category
      when 'role_invitation' then 'convene'::public.c_category
      when 'role_accepted' then 'convene'::public.c_category
    end
  );

-- The host names a member in a role. The notice is written in this transaction (1021).
create function public.invite_event_party(p_event uuid, p_member uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events%rowtype;
  v_row public.event_parties%rowtype;
begin
  if v_uid is null then
    raise exception 'invite_event_party: not signed in' using errcode = '42501';
  end if;
  if p_event is null or p_member is null or p_role is null then
    raise exception 'An invitation needs an event, a member and a role.' using errcode = '22023';
  end if;
  if not private.is_event_host(p_event) then
    raise exception 'Only the host names people on this event.' using errcode = '42501';
  end if;

  select * into v_event from public.events e where e.id = p_event;
  if v_event.status <> 'published' or v_event.cancelled_at is not null then
    raise exception 'This event is not taking new names.' using errcode = '22023';
  end if;
  if p_member = v_event.host_member_id then
    raise exception 'You host this event, and the page already names you as its host.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.event_role_kinds k where k.role = p_role) then
    raise exception 'That is not a role an event can name.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'That member is not on DNA.' using errcode = '22023';
  end if;
  if private.is_blocked(v_uid, p_member) then
    raise exception 'That member cannot be named on your event.' using errcode = '22023';
  end if;

  insert into public.event_parties as p (event_id, member_id, role)
  values (p_event, p_member, p_role)
  on conflict on constraint event_parties_event_member_role_key do nothing
  returning p.* into v_row;

  if v_row.id is null then
    select * into v_row
    from public.event_parties p
    where p.event_id = p_event and p.member_id = p_member and p.role = p_role;
  else
    insert into public.notifications (recipient_member_id, kind, actor_kind, actor_id, object_kind, object_id)
    values (p_member, 'role_invitation', 'member', v_uid, 'event_party', v_row.id);
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'event_id', v_row.event_id,
    'member_id', v_row.member_id,
    'role', v_row.role,
    'status', v_row.status,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke execute on function public.invite_event_party(uuid, uuid, text) from public, anon;
grant execute on function public.invite_event_party(uuid, uuid, text) to authenticated, service_role;

-- The named member answers. Accepting is gated by the event; declining never is.
create function public.respond_to_event_role(p_party uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.event_parties%rowtype;
  v_event public.events%rowtype;
  v_to public.event_party_status;
begin
  if v_uid is null then
    raise exception 'respond_to_event_role: not signed in' using errcode = '42501';
  end if;
  if p_party is null or p_accept is null then
    raise exception 'An answer needs an invitation and a choice.' using errcode = '22023';
  end if;

  select * into v_row from public.event_parties p where p.id = p_party for update;
  if not found or v_row.member_id is distinct from v_uid then
    raise exception 'That invitation is not yours to answer.' using errcode = '42501';
  end if;

  v_to := case when p_accept then 'accepted'::public.event_party_status
               else 'declined'::public.event_party_status end;

  if v_to = 'accepted' then
    select * into v_event from public.events e where e.id = v_row.event_id;
    if v_event.status <> 'published' or v_event.cancelled_at is not null then
      raise exception 'This event is not taking new names.' using errcode = '22023';
    end if;
  end if;

  if v_row.status is distinct from v_to then
    update public.event_parties p
    set status = v_to, responded_at = now(), updated_at = now()
    where p.id = p_party
    returning p.* into v_row;

    if v_to = 'accepted' then
      update public.notifications n
      set kind = 'role_accepted', read_at = coalesce(n.read_at, now())
      where n.recipient_member_id = v_uid
        and n.object_kind = 'event_party'
        and n.object_id = p_party;
      if not found then
        insert into public.notifications
          (recipient_member_id, kind, actor_kind, actor_id, object_kind, object_id, read_at)
        select v_uid, 'role_accepted', 'member', e.host_member_id, 'event_party', p_party, now()
        from public.events e
        where e.id = v_row.event_id;
      end if;
    else
      delete from public.notifications n
      where n.recipient_member_id = v_uid
        and n.object_kind = 'event_party'
        and n.object_id = p_party;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'event_id', v_row.event_id,
    'role', v_row.role,
    'status', v_row.status,
    'responded_at', v_row.responded_at
  );
end;
$$;

revoke execute on function public.respond_to_event_role(uuid, boolean) from public, anon;
grant execute on function public.respond_to_event_role(uuid, boolean) to authenticated, service_role;

-- The host removes an invited or accepted name. A decline stays.
create function public.remove_event_party(p_party uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.event_parties%rowtype;
begin
  if auth.uid() is null then
    raise exception 'remove_event_party: not signed in' using errcode = '42501';
  end if;
  if p_party is null then
    raise exception 'A removal needs a named party.' using errcode = '22023';
  end if;

  select * into v_row from public.event_parties p where p.id = p_party for update;
  if not found or not private.is_event_host(v_row.event_id) then
    raise exception 'Only the host removes a name from this event.' using errcode = '42501';
  end if;
  if v_row.status = 'declined' then
    raise exception 'A declined invitation is the member''s answer, and it stays.' using errcode = '22023';
  end if;

  delete from public.notifications n
  where n.recipient_member_id = v_row.member_id
    and n.object_kind = 'event_party'
    and n.object_id = p_party;
  delete from public.event_parties p where p.id = p_party;

  return jsonb_build_object('id', p_party, 'removed', true);
end;
$$;

revoke execute on function public.remove_event_party(uuid) from public, anon;
grant execute on function public.remove_event_party(uuid) to authenticated, service_role;

-- The one vocabulary read gains event_roles (1018). Every other key is unchanged.
create or replace function public.vocabularies()
returns jsonb
language sql
stable
set search_path to ''
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
    -- Ruling 187: the stance labels come from the table, here as everywhere else.
    'stances', (select coalesce(jsonb_agg(jsonb_build_object('value', s.stance, 'label', s.label)
                                           order by s.position), '[]'::jsonb)
                 from public.member_stances s),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x),
    -- Ruling 193: the Contribute instrument, in enum order, with its label derived from its value.
    'instrument', (select coalesce(jsonb_agg(jsonb_build_object(
                            'value', x,
                            'label', upper(left(replace(x::text, '_', '-'), 1))
                                     || substr(replace(x::text, '_', '-'), 2)) order by x), '[]'::jsonb)
                   from unnest(enum_range(null::public.contribute_instrument)) x),
    -- Ruling 1018: the roles a host can name on an event, with the verb the invitation reads.
    'event_roles', (select coalesce(jsonb_agg(jsonb_build_object('value', k.role, 'label', k.label, 'verb', k.verb)
                                               order by k.position), '[]'::jsonb)
                    from public.event_role_kinds k)
  );
$$;

-- G57 under 1022: the denominator, and nothing else.
create function private.rsvp_going_member_count()
returns integer
language sql
stable
security definer
set search_path to ''
as $$
  select count(*)::integer
  from public.event_registrations r
  where r.member_id is not null and r.status = 'going';
$$;

revoke execute on function private.rsvp_going_member_count() from public, anon, authenticated;
grant execute on function private.rsvp_going_member_count() to service_role, live_arms;
