-- Handoff 55-A (39-A), File E: preferences, the outbox, suppression and retention (rulings 1320,
-- 1321, 1324, 1520; 477). The data side of N7 and N8, and N12.
--
--   public.notification_preferences   a member's email mode per C (1320): off, immediate or digest.
--                                     Read by the member alone; written only through
--                                     set_notification_preference. Its labels and its control are
--                                     the Path 1 Settings work (1521), held.
--   private.notification_outbox       one row per mail private.notify enqueues (1321): a row is sent
--                                     only once Resend returns an id. Under 1520 no kind carries copy,
--                                     so nothing is enqueued today and notify-deliver drains an empty
--                                     queue.
--   private.email_suppressions        an address Resend reported as a hard bounce or a complaint;
--                                     notify-deliver marks a row for it suppressed and sends nothing.
--   private.resend_webhook_events     the svix-id of every webhook resend-webhook has taken, so a
--                                     redelivery is a no-op. No payload is stored.
--   public.notify_deliver_token_ok    the cron token check notify-deliver makes with the service role.
--                                     The token is the vault secret notify_deliver_token, which Chat
--                                     creates at apply and which no migration holds.
--   private.notify_deliver_kick       posts to notify-deliver once a minute, only when a queued row is
--                                     due and the token exists; the URL is the canonical project's
--                                     function endpoint, public by design (src/lib/supabase.ts).
--   public.notify_outbox_claim/_settle the function's two reads and writes on the outbox, service role
--                                     only: claim takes due queued rows under for update skip locked
--                                     and marks them sending; settle records sent, failed, suppressed
--                                     or skipped, one row at a time. A row claimed and never settled
--                                     stays in sending (no claim time is kept), which is a gap.
--   public.notify_webhook_take        the webhook's one write: records the event id once, and on a
--                                     hard bounce or a complaint suppresses the address and marks the
--                                     outbox row that carried the Resend id. Service role only.
--   private.purge_read_notifications  deletes rows read more than 180 days ago (1324); an unread row is
--                                     never purged, and outbox rows go with their row by cascade.
--   cron                              dna_notify_deliver_minutely and dna_notifications_purge_daily.
--                                     cron.job held seven jobs at the Session 55 read, neither name
--                                     among them.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------------------------------
-- 1. Preferences (1320).
-- ---------------------------------------------------------------------------------------------------

create table public.notification_preferences (
  member_id uuid not null references auth.users (id) on delete cascade,
  c public.c_category not null,
  channel text not null,
  mode text not null,
  updated_at timestamptz not null default now(),
  primary key (member_id, c, channel),
  constraint notification_preferences_channel_check check (channel = 'email'),
  constraint notification_preferences_mode_check check (mode in ('off', 'immediate', 'digest'))
);

alter table public.notification_preferences enable row level security;

revoke all on table public.notification_preferences from public, anon, authenticated;
grant select on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;

create policy notification_preferences_owner_select on public.notification_preferences
  for select to authenticated using (member_id = (select auth.uid()));

create policy notification_preferences_service_role on public.notification_preferences
  for all to service_role using (true) with check (true);

comment on table public.notification_preferences is
  'A member''s email mode for each C (handoff 55-A, ruling 1320): off, immediate or digest. private.notify reads it when a kind carries copy (1520); a transactional kind ignores it. Personas (1116): a member, a Space lead, an event host and an admin each read only their own rows as authenticated and write them only through set_notification_preference; service role holds all; anon is deliberately absent because a preference belongs to a signed-in member.';

create function public.set_notification_preference(p_c public.c_category, p_channel text, p_mode text)
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
    raise exception 'set_notification_preference: not signed in' using errcode = '42501';
  end if;
  if p_c is null or p_channel is distinct from 'email'
     or p_mode is null or p_mode not in ('off', 'immediate', 'digest') then
    raise exception 'set_notification_preference: a C, the email channel and off, immediate or digest are required'
      using errcode = '22023';
  end if;
  insert into public.notification_preferences as p (member_id, c, channel, mode, updated_at)
  values (v_uid, p_c, p_channel, p_mode, now())
  on conflict (member_id, c, channel) do update
    set mode = excluded.mode, updated_at = now()
    where p.mode is distinct from excluded.mode;
end;
$$;

revoke all on function public.set_notification_preference(public.c_category, text, text) from public, anon;
grant execute on function public.set_notification_preference(public.c_category, text, text) to authenticated;

comment on function public.set_notification_preference(public.c_category, text, text) is
  'The one writer of public.notification_preferences (handoff 55-A, 1320): the caller''s own mode for one C on the email channel. Refuses anything else with 22023.';

-- ---------------------------------------------------------------------------------------------------
-- 2. The outbox (1321), suppressions and the webhook ledger.
-- ---------------------------------------------------------------------------------------------------

create table private.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  member_id uuid not null,
  channel text not null,
  mode text not null,
  due_at timestamptz not null,
  state text not null default 'queued',
  attempts integer not null default 0,
  resend_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint notification_outbox_mode_check check (mode in ('immediate', 'digest')),
  constraint notification_outbox_state_check
    check (state in ('queued', 'sending', 'sent', 'failed', 'suppressed', 'skipped'))
);

create index notification_outbox_due_idx on private.notification_outbox (due_at)
  where state = 'queued';
create index notification_outbox_resend_idx on private.notification_outbox (resend_id)
  where resend_id is not null;
create index notification_outbox_notification_idx on private.notification_outbox (notification_id);

alter table private.notification_outbox enable row level security;
revoke all on table private.notification_outbox from public, anon, authenticated;

comment on table private.notification_outbox is
  'One row per mail private.notify enqueues (handoff 55-A, ruling 1321): queued, then sending under a claim, then sent once Resend returns an id, or failed, suppressed or skipped with its reason. Personas (1116): member, Space lead, event host and admin are deliberately absent, because a delivery record is the company''s and no surface shows it; service role reaches it only through notify_outbox_claim, notify_outbox_settle and notify_webhook_take; the delivery-health projection for the console is held (1299).';

create table private.email_suppressions (
  email text primary key,
  reason text not null,
  resend_event_id text not null,
  created_at timestamptz not null default now(),
  constraint email_suppressions_lower_check check (email = lower(email)),
  constraint email_suppressions_reason_check check (reason in ('bounce', 'complaint'))
);

alter table private.email_suppressions enable row level security;
revoke all on table private.email_suppressions from public, anon, authenticated;

comment on table private.email_suppressions is
  'Addresses Resend reported as a hard bounce or a complaint (handoff 55-A, 1321), lowercased; notify-deliver sends nothing to one. Personas (1116): member, Space lead, event host and admin are deliberately absent, because an address''s delivery standing is the company''s record; written by notify_webhook_take and read by notify_outbox_claim, both service role only.';

create table private.resend_webhook_events (
  event_id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table private.resend_webhook_events enable row level security;
revoke all on table private.resend_webhook_events from public, anon, authenticated;

comment on table private.resend_webhook_events is
  'The svix-id of every Resend webhook taken (handoff 55-A), so a redelivery changes nothing. The id and the type only, never the payload. Personas (1116): member, Space lead, event host and admin are deliberately absent, because it describes a vendor''s deliveries; written by notify_webhook_take, service role only.';

-- ---------------------------------------------------------------------------------------------------
-- 3. The token and the kick.
-- ---------------------------------------------------------------------------------------------------

create function public.notify_deliver_token_ok(p_token text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_secret text;
begin
  if p_token is null or p_token = '' then
    return false;
  end if;
  select s.decrypted_secret into v_secret
  from vault.decrypted_secrets s
  where s.name = 'notify_deliver_token';
  return v_secret is not null and v_secret <> ''
         and extensions.digest(p_token, 'sha256') = extensions.digest(v_secret, 'sha256');
end;
$$;

revoke all on function public.notify_deliver_token_ok(text) from public, anon, authenticated;
grant execute on function public.notify_deliver_token_ok(text) to service_role;

comment on function public.notify_deliver_token_ok(text) is
  'Whether a caller''s x-cron-token is the vault secret notify_deliver_token (handoff 55-A). False when either is absent. Compared as digests so the comparison does not run over the secret''s own bytes. Service role only.';

create function private.notify_deliver_kick()
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from private.notification_outbox o where o.state = 'queued' and o.due_at <= now()
  ) then
    return;
  end if;
  select s.decrypted_secret into v_token
  from vault.decrypted_secrets s
  where s.name = 'notify_deliver_token';
  if v_token is null or v_token = '' then
    return;
  end if;
  perform net.http_post(
    url := 'https://dgspjevjoblujcoljvkn.supabase.co/functions/v1/notify-deliver',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', v_token),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.notify_deliver_kick() from public, anon, authenticated;

comment on function private.notify_deliver_kick() is
  'Wakes notify-deliver (handoff 55-A): one POST through pg_net with the vault token in x-cron-token, only when a queued outbox row is due and the token exists. Called by dna_notify_deliver_minutely.';

-- ---------------------------------------------------------------------------------------------------
-- 4. The function's claim and settle, and the webhook's take. Service role only.
-- ---------------------------------------------------------------------------------------------------

create function public.notify_outbox_claim(p_limit integer default 50)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_rows jsonb;
begin
  with due as (
    select o.id
    from private.notification_outbox o
    where o.state = 'queued' and o.due_at <= now()
    order by o.due_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update skip locked
  ),
  claimed as (
    update private.notification_outbox o
    set state = 'sending', attempts = o.attempts + 1
    from due
    where o.id = due.id
    returning o.id, o.notification_id, o.member_id, o.mode, o.due_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'mode', c.mode,
           'member_id', c.member_id,
           'email', lower(u.email),
           'suppressed', exists (select 1 from private.email_suppressions s where s.email = lower(u.email)),
           'kind', n.kind,
           'c', n.c_category,
           'subject', k.email_subject,
           'line', k.email_line,
           'transactional', k.transactional,
           'created_at', n.created_at)
         order by c.member_id, c.due_at), '[]'::jsonb)
  into v_rows
  from claimed c
  join public.notifications n on n.id = c.notification_id
  join public.notification_kinds k on k.kind = n.kind
  left join auth.users u on u.id = c.member_id;
  return v_rows;
end;
$$;

revoke all on function public.notify_outbox_claim(integer) from public, anon, authenticated;
grant execute on function public.notify_outbox_claim(integer) to service_role;

comment on function public.notify_outbox_claim(integer) is
  'notify-deliver''s claim (handoff 55-A, 1321): due queued outbox rows, taken under for update skip locked and marked sending, each with its recipient''s address, whether the address is suppressed, and its kind''s copy. A row a run claimed and never settled stays in sending: the table carries no claim time, so nothing can tell it from a row another run holds, and re-queueing it would risk a second send. Service role only.';

create function public.notify_outbox_settle(
  p_id uuid,
  p_state text,
  p_resend_id text default null,
  p_error text default null
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  if p_state not in ('sent', 'failed', 'suppressed', 'skipped', 'queued') then
    raise exception 'notify_outbox_settle: unknown state %', coalesce(p_state, '(null)') using errcode = '22023';
  end if;
  -- 1321: sent only with the id Resend returned.
  if p_state = 'sent' and (p_resend_id is null or p_resend_id = '') then
    raise exception 'notify_outbox_settle: sent needs the Resend id' using errcode = '22023';
  end if;
  update private.notification_outbox o
  set state = p_state,
      resend_id = coalesce(p_resend_id, o.resend_id),
      last_error = left(p_error, 500),
      sent_at = case when p_state = 'sent' then now() else o.sent_at end
  where o.id = p_id and o.state = 'sending';
end;
$$;

revoke all on function public.notify_outbox_settle(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.notify_outbox_settle(uuid, text, text, text) to service_role;

comment on function public.notify_outbox_settle(uuid, text, text, text) is
  'notify-deliver''s settle (handoff 55-A, 1321): a row it holds in sending becomes sent (only with the Resend id), failed, suppressed or skipped with its reason, or queued again. Service role only.';

create function public.notify_webhook_take(
  p_event_id text,
  p_type text,
  p_email text,
  p_resend_id text,
  p_reason text
)
returns boolean
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_new integer;
begin
  if p_event_id is null or p_event_id = '' or p_type is null or p_type = '' then
    raise exception 'notify_webhook_take: an event id and a type are required' using errcode = '22023';
  end if;
  insert into private.resend_webhook_events (event_id, type)
  values (p_event_id, p_type)
  on conflict (event_id) do nothing;
  get diagnostics v_new = row_count;
  if v_new = 0 then
    return false;
  end if;
  if p_reason in ('bounce', 'complaint') then
    if p_email is not null and p_email <> '' then
      insert into private.email_suppressions (email, reason, resend_event_id)
      values (lower(p_email), p_reason, p_event_id)
      on conflict (email) do nothing;
    end if;
    if p_resend_id is not null and p_resend_id <> '' then
      update private.notification_outbox o
      set state = 'suppressed', last_error = p_reason
      where o.resend_id = p_resend_id;
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.notify_webhook_take(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.notify_webhook_take(text, text, text, text, text) to service_role;

comment on function public.notify_webhook_take(text, text, text, text, text) is
  'resend-webhook''s one write (handoff 55-A): records the svix-id once and answers false for a redelivery; for a reason of bounce or complaint, suppresses the lowercased address and marks the outbox row that carried the Resend id. Service role only.';

-- ---------------------------------------------------------------------------------------------------
-- 5. Retention (1324, N12).
-- ---------------------------------------------------------------------------------------------------

create function private.purge_read_notifications()
returns integer
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_n integer;
begin
  delete from public.notifications n
  where n.read_at is not null
    and n.read_at < now() - interval '180 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function private.purge_read_notifications() from public, anon, authenticated;
grant execute on function private.purge_read_notifications() to live_arms;

comment on function private.purge_read_notifications() is
  'Deletes notifications read more than 180 days ago (handoff 55-A, 1324); an unread row is never purged, and its outbox rows go by cascade. Called by dna_notifications_purge_daily; live_arms may execute it inside a rolled-back transaction to prove it leaves unread rows (382).';

-- ---------------------------------------------------------------------------------------------------
-- 6. Cron. Neither name was in cron.job at the Session 55 read; a re-run unschedules its own name first.
-- ---------------------------------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from cron.job where jobname = 'dna_notify_deliver_minutely') then
    perform cron.unschedule('dna_notify_deliver_minutely');
  end if;
  if exists (select 1 from cron.job where jobname = 'dna_notifications_purge_daily') then
    perform cron.unschedule('dna_notifications_purge_daily');
  end if;
end;
$$;

select cron.schedule('dna_notify_deliver_minutely', '* * * * *', 'select private.notify_deliver_kick()');
select cron.schedule('dna_notifications_purge_daily', '5 4 * * *', 'select private.purge_read_notifications()');

-- ---------------------------------------------------------------------------------------------------
-- 7. The catalogue (1299, 1300).
-- ---------------------------------------------------------------------------------------------------

insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'notification_preferences', 'exempt',
   'Each member''s own email modes, read by the member and written only through set_notification_preference (handoff 55-A, 1320); no console reads them.',
   'excluded', 'DIA treatment for notifications is unruled (1300).'),
  ('private', 'notification_outbox', 'operated',
   'The delivery record notify-deliver works through notify_outbox_claim and notify_outbox_settle (1321). The console''s delivery-health projection is held for Brief 12''s next revision (1299).',
   'excluded', 'DIA treatment for notifications is unruled (1300).'),
  ('private', 'email_suppressions', 'operated',
   'Addresses Resend reported as a hard bounce or a complaint, written by notify_webhook_take; the console counterpart is held with the delivery-health projection (1299).',
   'excluded', 'An address''s delivery standing; DIA treatment for notifications is unruled (1300).'),
  ('private', 'resend_webhook_events', 'operated',
   'The svix-id ledger that makes resend-webhook idempotent; no payload. The console counterpart is held (1299).',
   'excluded', 'A vendor''s delivery ids, not member data (1300).');
