-- B2 Shell/Feed: notifications (in-app record only; no email or push delivery in this brief).
--
-- Personas: recipient (the member the row is for), actor (the member whose action produced it;
-- read-only on rows they caused), Space lead (no access: a role approval is written by the engine,
-- not read back by the lead), event host (no access: reminders are written by the engine), admin
-- (read all, remove any), service role (the only writer until the engines ship their own RPCs).
-- No engine writes real rows in this brief; the table and policies exist ready for Connect,
-- Convene, Collaborate and Contribute to write to as they ship.
--
-- Doctrine (CLAUDE.md): every notification carries a C tag or the system category, NOT NULL.
-- c_category is derived from kind so the two can never disagree.

create type public.notification_kind as enum (
  'connection_accepted',
  'attestation_received',
  'space_role_approved',
  'event_reminder'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_member_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  c_category public.c_category not null generated always as (
    case kind
      when 'connection_accepted' then 'connect'::public.c_category
      when 'attestation_received' then 'contribute'::public.c_category
      when 'space_role_approved' then 'collaborate'::public.c_category
      when 'event_reminder' then 'convene'::public.c_category
    end
  ) stored,
  actor_kind public.anchor_kind,
  actor_id uuid,
  object_kind public.anchor_kind,
  object_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((actor_kind is null) = (actor_id is null)),
  check ((object_kind is null) = (object_id is null)),
  check (actor_kind is null or actor_kind in ('member', 'space'))
);
create index notifications_recipient_idx on public.notifications (recipient_member_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_member_id) where read_at is null;
create index notifications_actor_idx on public.notifications (actor_kind, actor_id);
alter table public.notifications enable row level security;

-- Privileges. anon: nothing. authenticated: read, and update of read_at only (column grant, so the
-- recipient cannot rewrite kind, actor or object even through their own row). service_role: all.
revoke all on table public.notifications from anon;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

-- recipient: reads and marks read their own rows.
create policy notifications_recipient_select on public.notifications for select to authenticated
using (recipient_member_id = (select auth.uid()));
create policy notifications_recipient_update on public.notifications for update to authenticated
using (recipient_member_id = (select auth.uid()))
with check (recipient_member_id = (select auth.uid()));

-- actor: read-only on rows their own action produced (never the recipient's read state of others).
create policy notifications_actor_select on public.notifications for select to authenticated
using (actor_kind = 'member' and actor_id = (select auth.uid()));

-- Space lead, event host: no access. Rows about their Space or event are the recipient's.

-- admin: read everything, remove anything.
create policy notifications_admin_select on public.notifications for select to authenticated
using (private.is_admin());
create policy notifications_admin_delete on public.notifications for delete to authenticated
using (private.is_admin());

-- service role: the writer (engine RPCs come later and run as invoker through their own policies).
create policy notifications_service_role on public.notifications for all to service_role
using (true) with check (true);
