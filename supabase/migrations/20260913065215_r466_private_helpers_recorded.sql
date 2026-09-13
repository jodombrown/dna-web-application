-- Rulings 466 and 444: the seven RLS helpers live in the private schema on the canonical project,
-- and no migration ever said so. b1_rls (20260906173427) created them in public on 6 September; the
-- move to private was made afterwards by editing that applied file instead of writing a migration,
-- which is the amendment ruling 466 now forbids and the drift ruling 444's arm reported. The second
-- amendment restores b1_rls to the statements the project recorded, so the intended change becomes
-- this migration: the definitions and grants exactly as the canonical project holds them today.
--
-- Applying this to the canonical project is a no-op: every function below already exists with this
-- body, and create or replace leaves the existing grants untouched. It is written so the repository
-- states the change rather than carrying it as an unrecorded edit.
--
-- private.is_connected is not here: 20260908233543_b4_connect_rls.sql already records it.

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function private.is_space_member(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_roles r
    where r.space_id = p_space and r.member_id = auth.uid() and r.status = 'active'
  );
$$;

create or replace function private.is_space_lead(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.space_roles r
    where r.space_id = p_space and r.member_id = auth.uid()
      and r.status = 'active' and r.role = 'lead'
  );
$$;

create or replace function private.is_event_host(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.events e where e.id = p_event and e.host_member_id = auth.uid());
$$;

create or replace function private.is_post_author(p_post uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post
      and (p.created_by = auth.uid()
        or (p.author_kind = 'member' and p.author_id = auth.uid())
        or (p.author_kind = 'space' and private.is_space_lead(p.author_id)))
  );
$$;

create or replace function private.can_see_anchor(p_kind public.anchor_kind, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_kind
    when 'member' then p_id = auth.uid() or private.is_connected(auth.uid(), p_id)
    when 'space' then private.is_space_member(p_id)
    when 'event' then private.is_event_host(p_id) or exists (
      select 1 from public.events e
      where e.id = p_id and e.space_id is not null and private.is_space_member(e.space_id))
    when 'opportunity' then exists (
      select 1 from public.opportunities o
      where o.id = p_id and (o.receiver_member_id = auth.uid()
        or (o.space_id is not null and private.is_space_member(o.space_id))))
    when 'connection_request' then exists (
      select 1 from public.connection_requests c
      where c.id = p_id and (c.from_member_id = auth.uid() or c.to_member_id = auth.uid()))
    when 'story' then exists (
      select 1 from public.stories s where s.id = p_id and s.author_member_id = auth.uid())
    else false
  end;
$$;

create or replace function private.can_author_as(p_kind public.anchor_kind, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_kind
    when 'member' then p_id = auth.uid()
    when 'space' then private.is_space_member(p_id)
    else false
  end;
$$;

-- The grants the canonical project holds: execute to authenticated and service_role, nothing to
-- anon and nothing to public. A policy body runs as the querying role, so authenticated needs it.
revoke execute on function
  private.is_admin(), private.is_space_member(uuid), private.is_space_lead(uuid),
  private.is_event_host(uuid), private.is_post_author(uuid),
  private.can_see_anchor(public.anchor_kind, uuid), private.can_author_as(public.anchor_kind, uuid)
from public, anon;

grant execute on function
  private.is_admin(), private.is_space_member(uuid), private.is_space_lead(uuid),
  private.is_event_host(uuid), private.is_post_author(uuid),
  private.can_see_anchor(public.anchor_kind, uuid), private.can_author_as(public.anchor_kind, uuid)
to authenticated, service_role;
