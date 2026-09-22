-- Convene Pass 2 (Brief 10, Attend): the guest path. Rulings 1026, 1033, 1034 and 1035, on 532, 571,
-- 626, 653, 1002 and 1028. Committed before it is applied (ruling 225). Applied to the canonical project
-- by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration
-- (rulings 553, 269). Runs after 20260921160100.
--
-- The guest's one write path (1026). The guest-rsvp Edge Function is the only caller of the two
-- service-role functions here, and every guest row is written by them:
--   guest_link_request  checks the address and the event, throttles, records the request, and hands
--                       the function the facts for the link email. It answers send false when
--                       throttled, and the function says "Check your email" either way, so the
--                       endpoint never tells a caller whether an address has asked before.
--   guest_rsvp          after the function has verified the signed link, which binds one event to
--                       one address for seven days: open writes the going row the first time and
--                       reports the row after that; going and not_going write the answer. An
--                       unconfirmed address never registers, because only a followed link writes.
-- The event must be one whose public page exists (1028): published, not cancelled, its post to
-- everyone. Answering going needs it free, not over, and not full, as rsvp_write requires of members.
-- Withdrawing is never gated. A guest row never carries an edge (1002): edges.from_id is a member.
--
-- The throttle. public.guest_link_requests keeps a hash of the address, never the address, with the
-- event and the time, and nothing older than a day. One link per address per event in ten minutes, and
-- ten a day per address across events. No client role reads or writes it.
--
-- The conversion offer (1034). event_registrations.conversion_offered_at records that the declinable
-- on-return offer was shown, once per registration. guest_rsvp stamps it in the call that reports
-- the offer. 712's invitation to attended guests is Brief 8's and is not here.
--
-- The claim (1033). public.claim_guest_registrations is its own write path, called by the app after
-- every sign-in, and never by private.handle_new_user, which is a trigger (1002) and fires before an
-- address is confirmed. It reads the member's address from auth.users only when email_confirmed_at is
-- set, converts each guest row for that address into the member's row, and writes the event_rsvp edge
-- for each converted going row in the same transaction. Where the member already answered that event,
-- their own row stands and the guest row is deleted. It does nothing when there is nothing to claim.
--
-- The emails (1035) are sent by the Edge Functions, not here: the link, and the going confirmation to
-- guests and members that carries the door. guest_rsvp returns the meeting link only for a going row,
-- because a going guest is a going registrant (1025, 1032).

alter table public.event_registrations add column conversion_offered_at timestamptz;

create table public.guest_link_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  email_hash text not null,
  requested_at timestamptz not null default now(),
  constraint guest_link_requests_hash_check check (email_hash ~ '^[0-9a-f]{64}$')
);

create index guest_link_requests_hash_idx on public.guest_link_requests (email_hash, requested_at);

alter table public.guest_link_requests enable row level security;

revoke all on table public.guest_link_requests from anon, authenticated;
grant all on table public.guest_link_requests to service_role;

create policy guest_link_requests_service_role on public.guest_link_requests
  for all to service_role
  using (true)
  with check (true);

-- The event a guest may answer by its public link (1028), or nothing.
create function private.guest_event(p_slug text)
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select e.id
  from public.events e
  where e.slug = p_slug
    and e.status = 'published'
    and e.cancelled_at is null
    and exists (
      select 1 from public.posts p
      where p.created_object_kind = 'event' and p.created_object_id = e.id
        and p.status = 'published' and p.audience = 'everyone'
    );
$$;

revoke execute on function private.guest_event(text) from public, anon, authenticated;
grant execute on function private.guest_event(text) to service_role;

-- What the emails say about the event. The meeting link only when p_going (1025, 1032).
create function private.guest_mail_facts(p_event uuid, p_going boolean)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'event_id', e.id,
    'slug', e.slug,
    'title', e.title,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'doors_at', e.doors_at,
    'timezone', e.timezone,
    'when_text', e.when_text,
    'mode', e.mode,
    'place', (
      select jsonb_build_object(
        'place_name', d.place_name, 'place_text', d.place_text, 'city', d.city,
        'region', d.region, 'country', d.country
      )
      from public.event_delivery d
      where d.event_id = e.id and d.kind = 'physical'
      order by d.position
      limit 1
    ),
    'meeting_url', case when p_going then (
      select d.url
      from public.event_delivery d
      where d.event_id = e.id and d.kind = 'meeting_link' and d.url is not null
      order by d.position
      limit 1
    ) end
  )
  from public.events e
  where e.id = p_event;
$$;

revoke execute on function private.guest_mail_facts(uuid, boolean) from public, anon, authenticated;
grant execute on function private.guest_mail_facts(uuid, boolean) to service_role;

-- 1026: a guest asks for the link.
create function public.guest_link_request(p_slug text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_event public.events%rowtype;
  v_hash text;
  v_when timestamptz;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'That is not an email address.' using errcode = '22023';
  end if;

  select * into v_event from public.events e where e.id = private.guest_event(p_slug);
  if not found then
    raise exception 'This event is not taking answers here.' using errcode = '22023';
  end if;
  v_when := coalesce(v_event.ends_at, v_event.starts_at);
  if v_when is not null and v_when <= now() then
    raise exception 'This event has already happened.' using errcode = '22023';
  end if;
  if v_event.ticket_kind <> 'free' then
    raise exception 'This event takes tickets, and tickets are not open yet.' using errcode = '22023';
  end if;

  v_hash := encode(sha256(convert_to(v_email, 'UTF8')), 'hex');
  delete from public.guest_link_requests r where r.requested_at < now() - interval '1 day';

  if exists (
       select 1 from public.guest_link_requests r
       where r.email_hash = v_hash and r.event_id = v_event.id
         and r.requested_at > now() - interval '10 minutes'
     )
     or (
       select count(*) from public.guest_link_requests r
       where r.email_hash = v_hash and r.requested_at > now() - interval '1 day'
     ) >= 10 then
    return jsonb_build_object('send', false);
  end if;

  insert into public.guest_link_requests (event_id, email_hash) values (v_event.id, v_hash);

  return jsonb_build_object('send', true, 'email', v_email, 'facts', private.guest_mail_facts(v_event.id, false));
end;
$$;

revoke execute on function public.guest_link_request(text, text) from public, anon, authenticated;
grant execute on function public.guest_link_request(text, text) to service_role;

-- 1026 and 1034: the guest's answer, after the function has verified the signed link.
create function public.guest_rsvp(p_event uuid, p_email text, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_event public.events%rowtype;
  v_row public.event_registrations%rowtype;
  v_to public.registration_status;
  v_state text;
  v_capacity integer;
  v_going bigint;
  v_offer boolean := false;
  v_when timestamptz;
begin
  if p_action is null or p_action not in ('open', 'going', 'not_going') then
    raise exception 'guest_rsvp: open, going or not_going' using errcode = '22023';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email) > 254 then
    raise exception 'That is not an email address.' using errcode = '22023';
  end if;

  select * into v_event from public.events e where e.id = p_event for update;
  if not found or private.guest_event(v_event.slug) is distinct from v_event.id then
    raise exception 'This event is not taking answers here.' using errcode = '22023';
  end if;

  select * into v_row
  from public.event_registrations r
  where r.event_id = p_event and r.guest_email = v_email;

  if p_action = 'open' then
    if v_row.id is not null then
      v_to := null;
      v_state := 'existing';
    else
      v_to := 'going';
      v_state := 'returned';
    end if;
  else
    v_to := p_action::public.registration_status;
    v_state := 'answered';
  end if;

  if v_to = 'going' and v_row.status is distinct from 'going' then
    v_when := coalesce(v_event.ends_at, v_event.starts_at);
    if v_when is not null and v_when <= now() then
      raise exception 'This event has already happened.' using errcode = '22023';
    end if;
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

  if v_to is not null and v_row.status is distinct from v_to then
    insert into public.event_registrations as r (event_id, guest_email, status)
    values (p_event, v_email, v_to)
    on conflict (event_id, guest_email) where guest_email is not null do update
      set status = excluded.status, updated_at = now()
    returning r.* into v_row;
  end if;

  if v_row.id is not null and v_row.conversion_offered_at is null and v_row.status = 'going' then
    update public.event_registrations r
    set conversion_offered_at = now()
    where r.id = v_row.id
    returning r.* into v_row;
    v_offer := true;
  end if;

  return jsonb_build_object(
    'state', v_state,
    'status', v_row.status,
    'offer_conversion', v_offer,
    'email', v_email,
    'facts', private.guest_mail_facts(p_event, v_row.status = 'going')
  );
end;
$$;

revoke execute on function public.guest_rsvp(uuid, text, text) from public, anon, authenticated;
grant execute on function public.guest_rsvp(uuid, text, text) to service_role;

-- 1033: a member with a confirmed address takes their guest rows, with their edges.
create function public.claim_guest_registrations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_row record;
  v_claimed integer := 0;
  v_kept integer := 0;
begin
  if v_uid is null then
    raise exception 'claim_guest_registrations: not signed in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = v_uid) then
    return jsonb_build_object('claimed', 0, 'kept', 0);
  end if;

  select lower(btrim(u.email)) into v_email
  from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null and u.email is not null;
  if v_email is null then
    return jsonb_build_object('claimed', 0, 'kept', 0);
  end if;

  for v_row in
    select r.id, r.event_id, r.status
    from public.event_registrations r
    where r.guest_email = v_email and r.member_id is null
    for update
  loop
    if exists (
      select 1 from public.event_registrations m
      where m.event_id = v_row.event_id and m.member_id = v_uid
    ) then
      delete from public.event_registrations r where r.id = v_row.id;
      v_kept := v_kept + 1;
    else
      update public.event_registrations r
      set member_id = v_uid, guest_email = null, audience_override = null, updated_at = now()
      where r.id = v_row.id;
      if v_row.status = 'going' then
        insert into public.edges (from_id, to_id, edge_type)
        values (v_uid, v_row.event_id, 'event_rsvp')
        on conflict (from_id, to_id) where edge_type = 'event_rsvp' and revoked_at is null do nothing;
      end if;
      v_claimed := v_claimed + 1;
    end if;
  end loop;

  return jsonb_build_object('claimed', v_claimed, 'kept', v_kept);
end;
$$;

revoke execute on function public.claim_guest_registrations() from public, anon;
grant execute on function public.claim_guest_registrations() to authenticated, service_role;
