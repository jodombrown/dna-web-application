-- Convene Pass 1: the event object the composer produces (P1-SPEC section 4), rulings 520, 521,
-- 623, 633, 634, 705. Committed before it is applied (ruling 225); reaches the canonical project by
-- `supabase db push` from the founder's machine, never by apply_migration (rulings 553, 269).
--
-- events.location and events.virtual_url are dropped rather than left orphaned (Pass 1 handoff,
-- ruling owed 1, default: drop; prototype posture, ruling 140: the project holds no real member
-- data). Where an event happens now lives in event_delivery, one row per endpoint, so a hybrid
-- event is two rows (521) and the meeting link sits on a row the public reader never selects.
--
-- Every column added here with a default is `not null`, so the single-statement form is the right
-- one under ruling 564: reaching every existing row is what makes the constraint hold.

create type public.event_status as enum ('draft', 'published', 'cancelled');
create type public.delivery_kind as enum ('physical', 'meeting_link', 'to_be_announced');

alter table public.events
  drop column location,
  drop column virtual_url,
  add column status public.event_status not null default 'published',
  add column timezone text,                       -- IANA, derived from the physical place or the host's home zone; never asked (SPEC 4)
  add column doors_at timestamptz,
  add column time_confirmed boolean not null default false,   -- 520
  add column date_confirmed boolean not null default false,   -- 520
  add column expected_window_start date,                      -- 520
  add column expected_window_end date,                        -- 520
  add column window_basis text,                               -- 520: the member's words, e.g. 'November'
  add column delivery_intent text not null default '',        -- the sentence the card and page render
  add column cancelled_at timestamptz,
  add column cancelled_reason text,
  add column attachments jsonb not null default '[]'::jsonb;  -- 705: Hub-written, never compose-time

-- Timing invariants (634: no end invented; 520: a window is honest).
alter table public.events add constraint events_ends_after_starts
  check (ends_at is null or starts_at is null or ends_at > starts_at);
alter table public.events add constraint events_window_or_start
  check (starts_at is not null or window_basis is not null);
alter table public.events add constraint events_cancel_pair
  check ((status = 'cancelled') = (cancelled_at is not null));

-- 521: delivery endpoints, several per event; hybrid is two rows.
create table public.event_delivery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind public.delivery_kind not null,
  position smallint not null default 0,
  -- physical (resolved through place-resolve, or the member's words when unresolved)
  place_id text,          -- Mapbox feature id (mapbox_id); null when place_text stands
  place_name text,
  place_text text,        -- the words as written when zero or several results (publishable)
  city text,
  country text,
  lng double precision,
  lat double precision,
  -- meeting_link
  url text,
  external_link boolean not null default true,  -- 521: no embed, no telemetry
  created_at timestamptz not null default now(),
  unique (event_id, kind),
  check (
    (kind = 'physical' and (place_id is not null or place_text is not null) and url is null)
    or (kind = 'meeting_link' and url is not null and place_id is null and place_text is null)
    or (kind = 'to_be_announced' and url is null and place_id is null and place_text is null)
  )
);
create index event_delivery_event_idx on public.event_delivery (event_id);
alter table public.event_delivery enable row level security;

-- 623, 506: host-only numbers live off the readable row, enforced as row policy.
create table public.event_host_settings (
  event_id uuid primary key references public.events (id) on delete cascade,
  capacity integer check (capacity is null or capacity > 0),
  updated_at timestamptz not null default now()
);
alter table public.event_host_settings enable row level security;

-- 633: a member holds multiple homes. Empty until Profile's editor lands; nothing renders without rows.
create table public.member_homes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  position smallint not null default 0,
  place_id text not null,
  place_name text not null,
  city text not null,
  country text not null,
  lng double precision not null,
  lat double precision not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  unique (member_id, position)
);
create index member_homes_member_idx on public.member_homes (member_id);
alter table public.member_homes enable row level security;

-- Grants follow b1_rls: authenticated reaches the tables only through the policies below, and
-- service_role holds all.
grant select, insert, update, delete on table public.event_delivery, public.event_host_settings, public.member_homes to authenticated;
grant all on table public.event_delivery, public.event_host_settings, public.member_homes to service_role;

-- Policies. Reader of the event = the existing events select policies (b1_rls lines 247 to 254):
-- the subquery on public.events runs under the caller's own row policies, which is how Postgres
-- evaluates RLS on a referenced table, so a member who may not select the event sees no delivery
-- row either. The reader definition (is_space_member and the posts join) is not widened here.
create policy event_delivery_physical_select on public.event_delivery for select to authenticated
using (
  kind <> 'meeting_link'
  and exists (select 1 from public.events e where e.id = event_delivery.event_id)
);
-- 521: the link is read on a role or a going attendance. Attendance is Pass 2; until then host only.
create policy event_delivery_host_all on public.event_delivery for all to authenticated
using (exists (select 1 from public.events e where e.id = event_delivery.event_id and e.host_member_id = (select auth.uid())))
with check (exists (select 1 from public.events e where e.id = event_delivery.event_id and e.host_member_id = (select auth.uid())));
create policy event_delivery_service_role on public.event_delivery for all to service_role using (true) with check (true);

create policy event_host_settings_host_all on public.event_host_settings for all to authenticated
using (exists (select 1 from public.events e where e.id = event_host_settings.event_id and e.host_member_id = (select auth.uid())))
with check (exists (select 1 from public.events e where e.id = event_host_settings.event_id and e.host_member_id = (select auth.uid())));
create policy event_host_settings_service_role on public.event_host_settings for all to service_role using (true) with check (true);

create policy member_homes_owner_all on public.member_homes for all to authenticated
using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy member_homes_service_role on public.member_homes for all to service_role using (true) with check (true);

-- Admin (the fifth persona in the RLS absolute): the same read the admin already holds on events,
-- for the two event-scoped tables. Homes stay owner-only; an admin has no reason to read a home.
create policy event_delivery_admin_select on public.event_delivery for select to authenticated using (public.is_admin());
create policy event_host_settings_admin_select on public.event_host_settings for select to authenticated using (public.is_admin());
