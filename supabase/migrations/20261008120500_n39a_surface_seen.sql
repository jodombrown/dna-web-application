-- Handoff 55-A (39-A), File F: Connect's for-you dot (rulings 1481, 1522).
--
--   private.member_surface_seen      when the member last opened My Network.
--   public.mark_surface_seen         the caller's row for a surface, upserted at now(). My Network
--                                    calls it when it opens.
--   public.connect_requests_pending  existence only (82): a pending request to the caller, sent after
--                                    the caller last opened My Network (or any, when they never have),
--                                    from a member the caller does not block either way. The shell
--                                    reads it on the bell's interval and gives Connect's slot its
--                                    for-you state in the header and the dock.
--
-- The file closes with the catalogue guard of 20261002120000 run again, extended to the private tables
-- this PR creates, so a table without its row fails the apply (1299).
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create table private.member_surface_seen (
  member_id uuid not null references auth.users (id) on delete cascade,
  surface text not null,
  seen_at timestamptz not null,
  primary key (member_id, surface),
  constraint member_surface_seen_surface_check check (surface = 'my_network')
);

alter table private.member_surface_seen enable row level security;
revoke all on table private.member_surface_seen from public, anon, authenticated;

comment on table private.member_surface_seen is
  'When each member last opened a surface whose dot depends on it (handoff 55-A, rulings 1481, 1522); today My Network alone. Personas (1116): a member, a Space lead, an event host and an admin each write only their own row, and read nothing back, through mark_surface_seen and connect_requests_pending; no client role touches the table; anon is deliberately absent because the dot is a signed-in surface''s.';

create function public.mark_surface_seen(p_surface text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'mark_surface_seen: not signed in' using errcode = '42501';
  end if;
  if p_surface is distinct from 'my_network' then
    raise exception 'mark_surface_seen: unknown surface' using errcode = '22023';
  end if;
  insert into private.member_surface_seen as s (member_id, surface, seen_at)
  values (v_uid, p_surface, now())
  on conflict (member_id, surface) do update set seen_at = excluded.seen_at;
end;
$$;

revoke all on function public.mark_surface_seen(text) from public, anon;
grant execute on function public.mark_surface_seen(text) to authenticated;

comment on function public.mark_surface_seen(text) is
  'The caller opened a surface whose dot it clears (handoff 55-A, 1522): today my_network, which My Network calls on open. Refuses any other surface with 22023.';

create function public.connect_requests_pending()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.connection_requests c
    where c.to_member_id = auth.uid()
      and c.status = 'pending'
      and c.created_at > coalesce(
        (select s.seen_at from private.member_surface_seen s
         where s.member_id = auth.uid() and s.surface = 'my_network'),
        '-infinity'::timestamptz)
      and not private.is_blocked(auth.uid(), c.from_member_id)
  );
$$;

revoke all on function public.connect_requests_pending() from public, anon;
grant execute on function public.connect_requests_pending() to authenticated;

comment on function public.connect_requests_pending() is
  'Whether Connect''s slot carries its for-you dot (handoff 55-A, rulings 82, 1481, 1522): a pending request to the caller, created after the caller last opened My Network or at any time when they never have, from a member the caller does not block either way. Existence only, never a count.';

-- ---------------------------------------------------------------------------------------------------
-- The catalogue (1299, 1300), then the guard.
-- ---------------------------------------------------------------------------------------------------

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('private', 'member_surface_seen', 'exempt',
   'A member''s own last visit to My Network, written by mark_surface_seen and read only inside connect_requests_pending (handoff 55-A, 1522); no console reads it.',
   'excluded', 'DIA treatment for notifications is unruled (1300).');

do $$
declare
  v_missing text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname)
  into v_missing
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and not c.relispartition
    and (
      n.nspname = 'public'
      or (n.nspname = 'private' and c.relname in (
        'notification_outbox', 'email_suppressions', 'resend_webhook_events', 'member_surface_seen'))
    )
    and not exists (
      select 1 from public.admin_catalogue a where a.schema_name = n.nspname and a.table_name = c.relname);
  if v_missing is not null then
    raise exception 'n39a: tables with no admin_catalogue row (1299): %', v_missing;
  end if;
  if exists (
    select 1 from public.admin_catalogue a
    where a.schema_name = 'public' and a.table_name = 'notifications' and a.admin_treatment = 'unreviewed'
  ) then
    raise exception 'n39a: notifications is still unreviewed in admin_catalogue (1299)';
  end if;
end;
$$;
