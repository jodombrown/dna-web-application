-- Brief 14 Messenger, handoff 41-A, file 4 of 9: public.threads and public.thread_members, the
-- membership helper every Messenger policy reads, and the community-group cap trigger.
--
-- Rulings: 1331 (kinds), 1332 (cap and roles), 1335 (pins), 1336 and 1351 (cursors), 1339 (digest
-- suppression, archive), 1342 (history, cap exemptions), 1348 (mute). Committed before it is applied
-- (225); applied by Chat through execute_sql (963, 965), never apply_migration (553, 269).
--
-- Personas (1116), both tables: a member reads the threads they are active or invited in and the
-- member rows of those threads; a Space lead and an event host read their Space's or event's thread
-- the same way, as active members, and hold nothing on a thread they are not in; admin is deliberately
-- absent, because no policy grants staff a thread (1350: staff reach a message only through a report,
-- file 5 and file 6); service role holds all for migrations and the retention job. No client role
-- inserts, updates or deletes: every write is a private function (file 6). live_arms (382) reads the
-- rows of threads the two ruling 218 test accounts are in, for the arms, and nothing broader.

-- ---------------------------------------------------------------------------------------------------
-- 1. public.threads
-- ---------------------------------------------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.thread_kinds (value),
  anchor_kind public.anchor_kind,
  anchor_id uuid,
  parent_thread_id uuid references public.threads (id) on delete cascade,
  name text check (name is null or length(trim(name)) between 1 and 80),
  created_by uuid references public.members (id) on delete set null,
  history_visible_to_new boolean not null default false,
  pair_key text,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint threads_pair_key_unique unique (pair_key),
  constraint threads_anchor_pair check ((anchor_kind is null) = (anchor_id is null)),
  constraint threads_anchor_kind check (anchor_kind is null or anchor_kind in ('space', 'event')),
  constraint threads_one_to_one_pair check ((kind = 'one_to_one') = (pair_key is not null))
);
create index threads_anchor_idx on public.threads (anchor_kind, anchor_id);
create index threads_parent_idx on public.threads (parent_thread_id);
alter table public.threads enable row level security;
revoke all on table public.threads from public, anon, authenticated;
grant select on table public.threads to authenticated;
grant all on table public.threads to service_role;

comment on table public.threads is
  'A Messenger thread (Brief 14, rulings 1331, 1342): one_to_one keyed by pair_key, community_group, space_thread and space_topic anchored to a space, event_thread anchored to an event, respond and introduction present in schema only. created_by is null once that member''s account is gone. Personas (1116): member reads threads they are active or invited in; Space lead and event host read theirs as members; admin deliberately absent (1350); service role all. No client role writes; file 6''s functions are the writers.';
comment on column public.threads.history_visible_to_new is
  'Ruling 1342: whether a member who joins later reads messages from before their joined_seq. Set by the lead through private.thread_set_history.';
comment on column public.threads.pair_key is
  'one_to_one only: least(a, b) || '':'' || greatest(a, b), unique, so a pair has one thread.';

-- ---------------------------------------------------------------------------------------------------
-- 2. public.thread_members
-- ---------------------------------------------------------------------------------------------------
create table public.thread_members (
  thread_id uuid not null references public.threads (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  role public.thread_member_role not null default 'member',
  state public.thread_member_state not null default 'active',
  invited_by uuid references public.members (id) on delete set null,
  joined_at timestamptz,
  joined_seq bigint not null default 0,
  delivered_seq bigint not null default 0,
  read_seq bigint not null default 0,
  muted_until timestamptz,
  archived_at timestamptz,
  pinned_at timestamptz,
  last_opened_at timestamptz,
  primary key (thread_id, member_id)
);
create index thread_members_member_idx on public.thread_members (member_id, archived_at, pinned_at);
alter table public.thread_members enable row level security;
revoke all on table public.thread_members from public, anon, authenticated;
grant select on table public.thread_members to authenticated;
grant all on table public.thread_members to service_role;

comment on table public.thread_members is
  'A member''s row in a thread (Brief 14, rulings 1332, 1335, 1336, 1339, 1342, 1348, 1351): role, state, who invited them, the seq they joined at (what history_visible_to_new false hides before), their delivered and read cursors, mute, archive, pin and the last open that suppresses the digest. Personas (1116): member reads the rows of threads they are active or invited in; Space lead and event host the same as members; admin deliberately absent (1350); service role all. The member''s own cursors, mute, archive and pin change only through file 6''s functions; no client role writes.';
comment on column public.thread_members.joined_seq is
  'Ruling 1342: the thread''s max seq when this member became active; with history_visible_to_new false the select policy admits only messages past it.';
comment on column public.thread_members.muted_until is
  'Ruling 1348: null is not muted; infinity is always; set by private.thread_mute from message_mute_durations.';
comment on column public.thread_members.last_opened_at is
  'Ruling 1339: when the member last read the thread to its end; the digest line is suppressed when it is newer than the newest unread message.';

-- ---------------------------------------------------------------------------------------------------
-- 3. The membership helper. A policy on thread_members that selected from thread_members would
--    recurse into itself, so the question is asked of a definer that the table's owner answers
--    outside row security. Executable by authenticated because the policies evaluate it as the
--    viewer; it answers only whether a member holds one of the states named, never a row.
-- ---------------------------------------------------------------------------------------------------
create function private.thread_member_in(
  p_thread uuid,
  p_member uuid,
  p_states public.thread_member_state[]
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_thread is not null and p_member is not null and exists (
    select 1 from public.thread_members tm
    where tm.thread_id = p_thread and tm.member_id = p_member and tm.state = any (p_states)
  );
$$;
revoke execute on function private.thread_member_in(uuid, uuid, public.thread_member_state[]) from public, anon;
grant execute on function private.thread_member_in(uuid, uuid, public.thread_member_state[]) to authenticated, service_role;
comment on function private.thread_member_in(uuid, uuid, public.thread_member_state[]) is
  'Whether the member holds a thread_members row in one of the states named (Brief 14). The one predicate every Messenger policy reads for membership; a definer so a policy on thread_members does not recurse.';

-- ---------------------------------------------------------------------------------------------------
-- 4. Policies.
-- ---------------------------------------------------------------------------------------------------
create policy threads_member_select on public.threads
  for select to authenticated
  using (private.thread_member_in(id, (select auth.uid()), array['active', 'invited']::public.thread_member_state[]));
create policy threads_service_role on public.threads
  for all to service_role using (true) with check (true);

create policy thread_members_member_select on public.thread_members
  for select to authenticated
  using (private.thread_member_in(thread_id, (select auth.uid()), array['active', 'invited']::public.thread_member_state[]));
create policy thread_members_service_role on public.thread_members
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------------------------------
-- 5. The cap (1332, 1342): a community_group holds at most 256 active members. The number lives here
--    and in no column a client reads. space_thread, space_topic and event_thread are exempt; a
--    one_to_one holds two by construction. Checked on insert and on the update that makes an
--    invited member active, because acceptance is where a group fills.
-- ---------------------------------------------------------------------------------------------------
create function private.thread_members_cap()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_kind text;
  v_active integer;
begin
  if new.state <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.state = 'active' then
    return new;
  end if;
  select t.kind into v_kind from public.threads t where t.id = new.thread_id for update;
  if v_kind <> 'community_group' then
    return new;
  end if;
  select count(*) into v_active
  from public.thread_members tm
  where tm.thread_id = new.thread_id and tm.state = 'active' and tm.member_id <> new.member_id;
  if v_active >= 256 then
    raise exception 'group_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function private.thread_members_cap() from public, anon, authenticated;
create trigger on_thread_members_cap
  before insert or update of state on public.thread_members
  for each row execute function private.thread_members_cap();
comment on function private.thread_members_cap() is
  'Refuses the 257th active member of a community_group with group_full (Brief 14, rulings 1332, 1342). Space and event threads are exempt. The ceiling is internal and never rendered.';

-- ---------------------------------------------------------------------------------------------------
-- 6. The live arms (382): the rows of threads the two test accounts are in.
-- ---------------------------------------------------------------------------------------------------
grant execute on function private.thread_member_in(uuid, uuid, public.thread_member_state[]) to live_arms;
grant select on table public.threads to live_arms;
create policy threads_live_arms_select on public.threads
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.handle in ('owner-test', 'member-test')
      and private.thread_member_in(id, m.id, enum_range(null::public.thread_member_state))
  ));
grant select on table public.thread_members to live_arms;
create policy thread_members_live_arms_select on public.thread_members
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.handle in ('owner-test', 'member-test')
      and private.thread_member_in(thread_id, m.id, enum_range(null::public.thread_member_state))
  ));

-- ---------------------------------------------------------------------------------------------------
-- 7. The catalogue (1299).
-- ---------------------------------------------------------------------------------------------------
insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'threads', 'projected',
   'Thread metadata reaches staff only through private.report_message_view for a reported message (1350).',
   'member_side', 'DIA reads structure only: kind, membership and timestamps, never text (1350).'),
  ('public', 'thread_members', 'projected',
   'Membership reaches staff only through private.report_message_view for a reported message (1350).',
   'member_side', 'DIA reads membership and cursors as structure, never text (1350).');
