-- Brief 14 Messenger, handoff 41-A, file 3 of 9: the reachability setting's storage (ruling 450,
-- finding F2: nothing in the tree stored Open, Connections of connections, Off) and the per-member
-- messaging settings row (F4: receipts 1345, link previews 1343, the one-time media notice 1346).
--
-- Committed before it is applied (ruling 225). Applied by Chat through execute_sql (963, 965), never
-- by apply_migration (553, 269).
--
-- members.reachability is `not null default 'open'`, so the single statement reaches every existing
-- row by design: the constraint is what makes the default right (ruling 564's not-null exemption).
-- The Connect request sheet that edits it stays W40's; nothing here writes it.

alter table public.members add column reachability public.reachability not null default 'open';
comment on column public.members.reachability is
  'Who may send this member a message request (ruling 450, Brief 14 F2): open, connections_of_connections or off. Connections message without a request whatever the value (1330). Edited by the Connect request sheet (W40); read by private.message_request_send and private.thread_create_group.';

-- ---------------------------------------------------------------------------------------------------
-- public.member_messaging_settings: one row per member, created on first touch by
-- private.messaging_settings_touch and written by private.messaging_settings_set. The member reads
-- their own row; no other member reads it, because receipts visibility is resolved inside the
-- projections through private.receipts_on (file 6).
--
-- Personas (1116): member reads own row; Space lead, event host and admin are deliberately absent,
-- because a settings row is the member's own and no surface shows another's; service role holds all
-- for migrations. No client role inserts, updates or deletes: the two private functions are the
-- writers (one write path per surface).
-- ---------------------------------------------------------------------------------------------------
create table public.member_messaging_settings (
  member_id uuid primary key references public.members (id) on delete cascade,
  receipts_enabled boolean not null default false,
  receipts_chosen_at timestamptz,
  link_previews_enabled boolean not null default false,
  media_notice_seen_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.member_messaging_settings enable row level security;
revoke all on table public.member_messaging_settings from public, anon, authenticated;
grant select on table public.member_messaging_settings to authenticated;
grant all on table public.member_messaging_settings to service_role;

create policy member_messaging_settings_owner_select on public.member_messaging_settings
  for select to authenticated
  using (member_id = (select auth.uid()));
create policy member_messaging_settings_service_role on public.member_messaging_settings
  for all to service_role using (true) with check (true);

comment on table public.member_messaging_settings is
  'A member''s Messenger settings (Brief 14, rulings 1343, 1345, 1346): read receipts (off until the one-time choice, receipts_chosen_at), link previews (off by default), and when the one-time media notice was seen. One row per member, made on first touch by private.messaging_settings_touch and written only by private.messaging_settings_set. Personas (1116): member reads own; Space lead, event host and admin deliberately absent (the row is the member''s own and no surface shows another''s); service role all. No client role writes.';
comment on column public.member_messaging_settings.receipts_enabled is
  'Ruling 1345: read receipts, off by default. A tick reaches 3 only when the viewer''s receipts are on and, for a one_to_one thread, the other member''s are on.';
comment on column public.member_messaging_settings.receipts_chosen_at is
  'Ruling 1345: when the member made the one-time neutral choice on first open; null until then, so the surface shows the choice once and never again.';
comment on column public.member_messaging_settings.link_previews_enabled is
  'Ruling 1343: link previews, off by default; the client calls link-unfurl only when this is on, and private.message_send stores a preview only when it is on.';
comment on column public.member_messaging_settings.media_notice_seen_at is
  'Ruling 1346: when the one-time "location and camera data are removed" notice was seen on first upload; null until then.';

-- The first touch: every Messenger function calls this before reading a setting, so a member who has
-- never opened a setting reads the defaults rather than no row.
create function private.messaging_settings_touch(p_member uuid)
returns void
language sql
volatile
security definer
set search_path to ''
as $$
  insert into public.member_messaging_settings (member_id)
  values (p_member)
  on conflict (member_id) do nothing;
$$;
revoke execute on function private.messaging_settings_touch(uuid) from public, anon, authenticated;
comment on function private.messaging_settings_touch(uuid) is
  'Ensures the member''s public.member_messaging_settings row exists (Brief 14 F4). Called by every Messenger function before it reads a setting; no client role holds execute.';

-- The one writer. Each argument null means leave that setting as it is; receipts_chosen_at is
-- stamped the first time receipts are set either way, so the one-time choice is recorded as made.
create function private.messaging_settings_set(
  p_receipts boolean,
  p_link_previews boolean,
  p_media_notice_seen boolean
)
returns public.member_messaging_settings
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.member_messaging_settings;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  perform private.messaging_settings_touch(v_uid);
  update public.member_messaging_settings s
  set receipts_enabled = coalesce(p_receipts, s.receipts_enabled),
      receipts_chosen_at = case when p_receipts is not null then coalesce(s.receipts_chosen_at, now()) else s.receipts_chosen_at end,
      link_previews_enabled = coalesce(p_link_previews, s.link_previews_enabled),
      media_notice_seen_at = case when p_media_notice_seen then coalesce(s.media_notice_seen_at, now()) else s.media_notice_seen_at end,
      updated_at = now()
  where s.member_id = v_uid
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function private.messaging_settings_set(boolean, boolean, boolean) from public, anon, authenticated;
comment on function private.messaging_settings_set(boolean, boolean, boolean) is
  'The one writer of public.member_messaging_settings (Brief 14, rulings 1343, 1345, 1346): receipts, link previews and the media notice, each left alone when null. Reached by members through public.messenger_settings_set; no client role holds execute here.';

-- ---------------------------------------------------------------------------------------------------
-- The catalogue (1299).
-- ---------------------------------------------------------------------------------------------------
insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'member_messaging_settings', 'exempt',
   'A member''s own Messenger settings; no console shows them (1345).',
   'excluded', 'Settings are the member''s own and carry nothing DIA reasons over (1350).');
