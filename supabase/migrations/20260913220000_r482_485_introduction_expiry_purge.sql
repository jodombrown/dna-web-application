-- Ruling 485's expires_at purge, with ruling 482's semantics. Fix PR 03 item 7.
--
-- WHAT WAS NOT THERE. At b4b21ab no table in public or private carried an expires_at column and
-- nothing in the schema treated a pending introduction as expiring: the only expiry-shaped thing in
-- Connect is the 90-day decline window, which counts from responded_at and is a different rule. The
-- only trace of 482 in the tree was the Sent empty state, which already tells a member their
-- introductions "wait here until they are accepted, or until they quietly expire". This migration is
-- what makes that sentence true. It adds the column the purge needs and the purge, and nothing else.
--
-- WHY DELETE. Ruling 482 makes expiry silence rather than rejection, and reopens requesting
-- immediately. Removing the row is both at once and needs no read projection to change:
--   * no declined row is written, so no decline window starts and nothing renders as refused;
--   * connection_requests_pending_uidx is free again, so send_introduction accepts the next one;
--   * private.relationship_state finds no row and answers 'none' for the pair, on Connect and on
--     Profile alike (ruling 188), because both already read that one source;
--   * the recipient's Requests list is read from the same table and simply no longer holds it.
-- A status value would have needed every projection to learn it, which is the shape ruling 544 moved
-- out of this PR. No surface, no projection and no write path changes here.
--
-- WHAT THE FOUNDER STILL DECIDES. The window itself. No ruling in the Fix PR 03 handoff supplies a
-- number, so it is seeded as a setting rather than written into a predicate: one UPDATE changes it and
-- no migration is needed. Thirty days is the seed, and it is deliberately shorter than the 90-day
-- decline window, because silence should clear faster than a refusal blocks.
--
-- WHAT IS DELIBERATELY NOT PURGED. The column is nullable with no backfill, so every row written
-- before this migration has a null expires_at and can never be purged. Ruling 400 removed Connect
-- from the composer, so the only connection_requests a Feed post can point at are older ones; leaving
-- them alone is what keeps a published Connect card from losing the who and why it renders through
-- connection_request_intros (ruling 157). Only introductions sent after this migration expire.

-- ---------------------------------------------------------------------------
-- The window, as a setting (the same table and helper the decline window uses).
-- ---------------------------------------------------------------------------
insert into private.connect_settings (key, value_int) values ('introduction_expiry_days', 30)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- expires_at: when a pending introduction lapses into silence. Read at insert time from the setting,
-- so send_introduction is untouched and stays the one write path into this table (rulings 215, 415).
-- ---------------------------------------------------------------------------
alter table public.connection_requests
  add column expires_at timestamptz
  default (now() + make_interval(days => private.setting_int('introduction_expiry_days', 30)));

comment on column public.connection_requests.expires_at is
  'Ruling 482: when a pending introduction lapses into silence. Null on any row written before the '
  'column existed, and those are never purged. Set from private.connect_settings '
  '(introduction_expiry_days) at insert time.';

-- The recipient already selects their own non-withdrawn rows, and column grants are explicit, so
-- without this a select * by the recipient would be refused. The sender still reads nothing from this
-- table at all (ruling 157): they hold no policy on it, and a lapse must reach them as silence.
grant select (expires_at) on public.connection_requests to authenticated;
grant select (expires_at), insert (expires_at), update (expires_at)
  on public.connection_requests to service_role;

-- The purge reads this every night; the partial index keeps it to the pending rows.
create index connection_requests_pending_expiry_idx
  on public.connection_requests (expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- The purge. Deletes the pending rows whose window has passed and returns how many, so an operator
-- running it by hand sees the number; nothing renders it, and nothing counts it to a member.
-- ---------------------------------------------------------------------------
create or replace function private.purge_expired_introductions()
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_n integer;
begin
  delete from public.connection_requests
  where status = 'pending'
    and expires_at is not null
    and expires_at <= now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

comment on function private.purge_expired_introductions() is
  'Ruling 482 and 485: removes pending introductions past expires_at. Deletion is the silence: no '
  'declined row, no decline window, and the pair returns to none so requesting reopens at once.';

revoke all on function private.purge_expired_introductions() from public;
grant execute on function private.purge_expired_introductions() to service_role;

-- Nightly through pg_cron where the platform allows it; otherwise the function stands ready for an
-- operator schedule. Guarded exactly as private.refresh_second_degree()'s schedule is, and at 02:45
-- so the two nightly jobs do not start together.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron not available here (%); schedule private.purge_expired_introductions() by hand', sqlerrm;
    return;
  end;
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'dna_introduction_expiry_nightly';
    perform cron.schedule(
      'dna_introduction_expiry_nightly',
      '45 2 * * *',
      'select private.purge_expired_introductions()'
    );
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped (%)', sqlerrm;
end $$;
