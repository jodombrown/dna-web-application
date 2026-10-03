-- Brief 14 Messenger, handoff 41-D, Part A1 (ruling 1384): an attendee joins the event thread.
-- At bf6b10c only the host could open or join the thread (private.event_thread_open), nothing
-- invited a going registrant, and RLS hid the thread from a non-member, so the event page never
-- drew Message for an attendee. Who may join: a going registrant, an accepted named party, or the
-- host. A removed member does not rejoin. Leaving and rejoining is allowed; switching to not going
-- does not remove a member (1384). The 256 cap does not apply: private.thread_members_cap applies
-- it to community_group only (1385 records that existing behaviour).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create or replace function private.event_thread_eligible(p_event uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_event is not null and p_member is not null and (
    exists (
      select 1 from public.events e
      where e.id = p_event and e.host_member_id = p_member
    )
    or exists (
      select 1 from public.event_registrations r
      where r.event_id = p_event and r.member_id = p_member and r.status = 'going'
    )
    or exists (
      select 1 from public.event_parties p
      where p.event_id = p_event and p.member_id = p_member and p.status = 'accepted'
    )
  );
$$;

revoke all on function private.event_thread_eligible(uuid, uuid) from public;

create or replace function private.event_thread_available(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.threads t
    where t.kind = 'event_thread'
      and t.anchor_kind = 'event'
      and t.anchor_id = p_event
      and not private.thread_member_in(t.id, auth.uid(), array['removed']::public.thread_member_state[])
      and (
        private.thread_member_in(t.id, auth.uid(), array['active']::public.thread_member_state[])
        or private.event_thread_eligible(p_event, auth.uid())
      )
  );
$$;

revoke all on function private.event_thread_available(uuid) from public;

create or replace function private.event_thread_join(p_event uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_thread uuid;
  v_state public.thread_member_state;
begin
  select t.id into v_thread
  from public.threads t
  where t.kind = 'event_thread' and t.anchor_kind = 'event' and t.anchor_id = p_event
  for update;
  if v_thread is null then
    raise exception 'no_thread' using errcode = 'P0001';
  end if;

  select tm.state into v_state
  from public.thread_members tm
  where tm.thread_id = v_thread and tm.member_id = v_uid;

  if v_state = 'active' then
    return v_thread;
  end if;
  if v_state = 'removed' then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if not private.event_thread_eligible(p_event, v_uid) then
    raise exception 'not_going' using errcode = '42501';
  end if;

  insert into public.thread_members as tm (thread_id, member_id, role, state, joined_at)
  values (v_thread, v_uid, 'member', 'active', now())
  on conflict (thread_id, member_id) do update
    set state = 'active', joined_at = coalesce(tm.joined_at, now())
    where tm.state in ('invited', 'left');

  return v_thread;
end;
$$;

revoke all on function private.event_thread_join(uuid) from public;

create or replace function public.messenger_event_thread_join(p_event uuid)
returns uuid
language sql
volatile
security definer
set search_path to ''
as $$ select private.event_thread_join(p_event); $$;

create or replace function public.messenger_event_thread_available(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$ select private.event_thread_available(p_event); $$;

revoke all on function public.messenger_event_thread_join(uuid) from public, anon;
revoke all on function public.messenger_event_thread_available(uuid) from public, anon;
grant execute on function public.messenger_event_thread_join(uuid) to authenticated, service_role;
grant execute on function public.messenger_event_thread_available(uuid) to authenticated, service_role;
