-- Brief 14 Messenger, handoff 41-A, file 5 of 9: public.messages and the tables around it
-- (reactions, mentions, requests, reports, the view audit), with the policies that make 1349 and
-- 1350 true. Message text and its search vector live in public.messages only.
--
-- Rulings: 1338 and 1347 (search), 1341 (requests), 1343 (edit, delete, previews), 1346 (media),
-- 1349 (reports, blocked authors), 1350 (staff reach text only through a report), 1351 (seq and
-- idempotency), 1352 (10,000 characters), 1371 (one pin per thread), 446 (a request is 240
-- characters). Committed before it is applied (225); applied by Chat through execute_sql (963, 965),
-- never apply_migration (553, 269).
--
-- Finding against the handoff, named in the closing report: the handoff writes messages.author_id as
-- not null. public.members is deleted by the auth.users cascade and nothing in the tree keeps a
-- tombstone row, so a not-null key would refuse every account deletion that has ever sent a message.
-- The column is nullable with on delete set null, and file 9 stamps author_deleted_at before the
-- cascade reaches it, which is the branch the handoff's retention item names.

-- ---------------------------------------------------------------------------------------------------
-- 1. public.messages
-- ---------------------------------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  seq bigint not null,
  client_id uuid not null,
  author_id uuid references public.members (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text,
  reply_to uuid references public.messages (id) on delete set null,
  media_id uuid references public.media (id) on delete set null,
  link_preview jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  pinned_by uuid references public.members (id) on delete set null,
  author_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('simple', coalesce(body, ''))) stored,
  constraint messages_seq_unique unique (thread_id, seq),
  constraint messages_client_unique unique (thread_id, client_id),
  constraint messages_seq_positive check (seq > 0),
  constraint messages_body_len check (body is null or char_length(body) <= 10000),
  constraint messages_author_or_former check (author_id is not null or author_deleted_at is not null)
);
create index messages_thread_seq_idx on public.messages (thread_id, seq desc);
create index messages_search_idx on public.messages using gin (search);
create index messages_author_idx on public.messages (author_id);
create index messages_pinned_idx on public.messages (thread_id) where pinned_by is not null;
alter table public.messages enable row level security;
revoke all on table public.messages from public, anon, authenticated;
grant select on table public.messages to authenticated;
grant all on table public.messages to service_role;

comment on table public.messages is
  'A message (Brief 14, rulings 1343, 1346, 1351, 1352): seq assigned by private.message_send under a lock on the thread row, client_id for idempotency, body at most 10,000 characters and null after delete-for-everyone, one media object, a link preview only when the author''s setting was on, edit and delete stamps, and the lead''s pin (one per thread, 1371). author_id is null once that member''s account is gone (file 9). Personas (1116): a member reads a message only through live active membership, past their joined_seq unless history is visible, and never a blocked author''s in a one_to_one; Space lead and event host the same as members; admin deliberately absent, because staff reach one message only through private.report_message_view (1350); service role all. No client role writes: private.message_send is the one write path.';
comment on column public.messages.author_deleted_at is
  'Ruling 1352: stamped by file 9''s trigger when the author''s account is deleted, before the cascade sets author_id null; the projections render "a former member" where it is set and the daily purge removes the row 30 days on.';
comment on column public.messages.search is
  'Ruling 1338: the search vector, in public.messages only, read by private.message_search inside the viewer''s policy scope.';

-- ---------------------------------------------------------------------------------------------------
-- 2. The visibility predicate (1342, 1349): the one question the messages policy asks. A definer, so
--    it reads thread_members and threads outside row security and answers a boolean; executable by
--    authenticated because the policy evaluates it as the viewer. For a one_to_one thread a blocked
--    author's rows are withheld; for every other kind they are returned, and the projection (file 6)
--    renders them blocked with the body withheld, so the thread stays readable. In a one_to_one the
--    block is read against the thread's other member, so the whole thread goes dark for both sides,
--    the viewer's own rows included (1349: a blocked pair sees each other nowhere in one-to-one).
-- ---------------------------------------------------------------------------------------------------
create function private.message_visible(p_thread uuid, p_seq bigint, p_author uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_viewer is not null and exists (
    select 1
    from public.thread_members tm
    join public.threads t on t.id = tm.thread_id
    where tm.thread_id = p_thread
      and tm.member_id = p_viewer
      and tm.state = 'active'
      and (t.history_visible_to_new or p_seq > tm.joined_seq)
      and (t.kind <> 'one_to_one' or not exists (
        select 1 from public.thread_members o
        where o.thread_id = p_thread and o.member_id <> p_viewer and private.is_blocked(p_viewer, o.member_id)))
  );
$$;
revoke execute on function private.message_visible(uuid, bigint, uuid, uuid) from public, anon;
grant execute on function private.message_visible(uuid, bigint, uuid, uuid) to authenticated, service_role;
comment on function private.message_visible(uuid, bigint, uuid, uuid) is
  'Whether the viewer may read a message of this thread, seq and author (Brief 14, rulings 1342, 1349): active membership, past joined_seq unless history is visible, and in a one_to_one no block between the viewer and the other member. The messages select policy and private.message_search both ask it.';

create policy messages_member_select on public.messages
  for select to authenticated
  using (private.message_visible(thread_id, seq, author_id, (select auth.uid())));
create policy messages_service_role on public.messages
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------------------------------
-- 3. Reactions and mentions: readable where the message is, written by file 6.
-- ---------------------------------------------------------------------------------------------------
create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  reaction text not null references public.message_reaction_kinds (value),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, reaction)
);
alter table public.message_reactions enable row level security;
revoke all on table public.message_reactions from public, anon, authenticated;
grant select on table public.message_reactions to authenticated;
grant all on table public.message_reactions to service_role;
create policy message_reactions_member_select on public.message_reactions
  for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));
create policy message_reactions_service_role on public.message_reactions
  for all to service_role using (true) with check (true);
comment on table public.message_reactions is
  'A member''s reaction to a message (Brief 14, ruling 1370), one row per word. Readable wherever the message is; toggled by private.message_react and private.message_unreact; no notification (1316). Personas (1116): member, Space lead and event host read as members of the thread; admin deliberately absent (1350); service role all. No client role writes.';

create table public.message_mentions (
  message_id uuid not null references public.messages (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (message_id, member_id)
);
create index message_mentions_member_idx on public.message_mentions (member_id);
alter table public.message_mentions enable row level security;
revoke all on table public.message_mentions from public, anon, authenticated;
grant select on table public.message_mentions to authenticated;
grant all on table public.message_mentions to service_role;
create policy message_mentions_member_select on public.message_mentions
  for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));
create policy message_mentions_service_role on public.message_mentions
  for all to service_role using (true) with check (true);
comment on table public.message_mentions is
  'An @mention in a message (Brief 14, ruling 1333), written by private.message_send for members active in the thread. Readable wherever the message is. The mention notification and the mute it breaks are 41-D''s (1348). Personas (1116): member, Space lead and event host read as members of the thread; admin deliberately absent; service role all. No client role writes.';

-- ---------------------------------------------------------------------------------------------------
-- 4. public.message_requests (1330, 1341, 446): text only, 240 characters, one per pair, declined
--    recoverable. The sender reads their own; the recipient reads theirs. No read state exists.
-- ---------------------------------------------------------------------------------------------------
create table public.message_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.members (id) on delete cascade,
  recipient_id uuid not null references public.members (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 240),
  state public.message_request_state not null default 'pending',
  thread_id uuid references public.threads (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint message_requests_pair unique (sender_id, recipient_id),
  constraint message_requests_not_self check (sender_id <> recipient_id)
);
create index message_requests_recipient_idx on public.message_requests (recipient_id, state, created_at desc);
alter table public.message_requests enable row level security;
revoke all on table public.message_requests from public, anon, authenticated;
grant select on table public.message_requests to authenticated;
grant all on table public.message_requests to service_role;
create policy message_requests_sender_select on public.message_requests
  for select to authenticated
  using (sender_id = (select auth.uid()));
create policy message_requests_recipient_select on public.message_requests
  for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy message_requests_service_role on public.message_requests
  for all to service_role using (true) with check (true);
comment on table public.message_requests is
  'A message request from a member who is not a connection (Brief 14, rulings 1330, 1341, 446): one text of at most 240 characters, pending until accepted, declined (recoverable) or blocked; thread_id is set on accept. No read state. Personas (1116): sender reads own, recipient reads theirs; Space lead and event host deliberately absent, because a request is between two members; admin deliberately absent (1350); service role all. No client role writes: private.message_request_send, _accept, _decline and _block are the writers.';

-- ---------------------------------------------------------------------------------------------------
-- 5. public.message_reports (1349) and public.message_view_audit (1350). The reporter reads their own
--    report; staff reach the reported message through private.report_message_view alone, which writes
--    the audit row. No policy grants staff a report or a message.
-- ---------------------------------------------------------------------------------------------------
create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages (id) on delete set null,
  reporter_id uuid references public.members (id) on delete set null,
  reason text not null references public.message_report_reasons (value),
  note text check (note is null or char_length(note) <= 500),
  state public.message_report_state not null default 'open',
  created_at timestamptz not null default now()
);
create index message_reports_state_idx on public.message_reports (state, created_at);
create index message_reports_message_idx on public.message_reports (message_id);
alter table public.message_reports enable row level security;
revoke all on table public.message_reports from public, anon, authenticated;
grant select on table public.message_reports to authenticated;
grant all on table public.message_reports to service_role;
create policy message_reports_reporter_select on public.message_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));
create policy message_reports_service_role on public.message_reports
  for all to service_role using (true) with check (true);
comment on table public.message_reports is
  'A member''s report of a message (Brief 14, rulings 1349, 1350; the handoff''s F1: no reports table existed), with a reason from message_report_reasons and an optional note. reporter_id is null once that account is gone, and message_id is null once the message is purged (1352), because the report and its append-only audit outlive the message. Personas (1116): reporter reads own; Space lead and event host deliberately absent; admin deliberately absent from policy, because staff read a report only through private.report_message_view, which writes message_view_audit (1350); service role all. No client role writes: private.message_report is the writer.';

create table public.message_view_audit (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.message_reports (id) on delete cascade,
  staff_id uuid references public.members (id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index message_view_audit_report_idx on public.message_view_audit (report_id, viewed_at desc);
alter table public.message_view_audit enable row level security;
revoke all on table public.message_view_audit from public, anon, authenticated;
grant all on table public.message_view_audit to service_role;
create policy message_view_audit_service_role on public.message_view_audit
  for all to service_role using (true) with check (true);
comment on table public.message_view_audit is
  'One row per staff view of a reported message through private.report_message_view (Brief 14, ruling 1350). Personas (1116): member, Space lead, event host and admin are deliberately absent, because the audit is written by the function and read by no surface in 41-A (the admin console that lists it is 12E''s); service role all. No client role reads or writes.';

-- Append-only, as admin_actions and admin_reads are (1178): the audit refuses update, delete and
-- truncate from every role, the service role included.
create function private.message_view_audit_append_only()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  raise exception 'message_view_audit is append-only (1350)' using errcode = '42501';
end;
$$;
revoke execute on function private.message_view_audit_append_only() from public, anon, authenticated;
create trigger message_view_audit_no_update
  before update on public.message_view_audit
  for each row execute function private.message_view_audit_append_only();
create trigger message_view_audit_no_delete
  before delete on public.message_view_audit
  for each row execute function private.message_view_audit_append_only();
create trigger message_view_audit_no_truncate
  before truncate on public.message_view_audit
  for each statement execute function private.message_view_audit_append_only();

-- ---------------------------------------------------------------------------------------------------
-- 6. public.media: the mark a delete-for-everyone leaves on a message's media row (1343). The R2
--    object's removal is 41-B's; until then the row is marked and the object stays, recorded as an
--    invite-boundary gate. Added bare: nullable, no default, no backfill (564).
-- ---------------------------------------------------------------------------------------------------
alter table public.media add column delete_requested_at timestamptz;
comment on column public.media.delete_requested_at is
  'Ruling 1343: set by private.message_delete_for_everyone and the former-member purge when the message that carried this object is gone; the server route that removes the object (41-B) reads it. Null for every row that is still referenced.';

-- ---------------------------------------------------------------------------------------------------
-- 7. The live arms (382): messages of the test accounts' threads, requests between them, and their
--    own reports. Nothing on the audit.
-- ---------------------------------------------------------------------------------------------------
grant select on table public.messages to live_arms;
create policy messages_live_arms_select on public.messages
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.handle in ('owner-test', 'member-test')
      and private.thread_member_in(thread_id, m.id, enum_range(null::public.thread_member_state))
  ));
grant select on table public.message_requests to live_arms;
create policy message_requests_live_arms_select on public.message_requests
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.id in (sender_id, recipient_id) and m.handle in ('owner-test', 'member-test')
  ));
grant select on table public.message_reports to live_arms;
create policy message_reports_live_arms_select on public.message_reports
  for select to live_arms
  using (exists (
    select 1 from public.members m
    where m.id = reporter_id and m.handle in ('owner-test', 'member-test')
  ));

-- ---------------------------------------------------------------------------------------------------
-- 8. The catalogue (1299).
-- ---------------------------------------------------------------------------------------------------
insert into public.admin_catalogue (schema_name, table_name, admin_treatment, admin_reason, dia_treatment, dia_reason) values
  ('public', 'messages', 'projected',
   'Message text reaches staff only through private.report_message_view for the one reported message, every view audited (1350).',
   'excluded', 'DIA never reads message text (8, 1300, 1350); structure is read through private.messenger_dia_signals.'),
  ('public', 'message_reactions', 'exempt',
   'Reactions are the thread''s own; no console shows them.',
   'excluded', 'A reaction is content, not structure DIA reasons over (1350).'),
  ('public', 'message_mentions', 'exempt',
   'Mentions are the thread''s own; no console shows them.',
   'excluded', 'A mention is content, not structure DIA reasons over (1350).'),
  ('public', 'message_requests', 'exempt',
   'A request is between two members; no console shows its text.',
   'member_side', 'DIA reads a request''s age and sender as structure, never its body (1350).'),
  ('public', 'message_reports', 'operated',
   'The admin app''s moderation queue reads reports through private.report_message_view and writes state (1349, 1350); the console is Lane C''s.',
   'excluded', 'Moderation is staff work, not DIA''s (1350).'),
  ('public', 'message_view_audit', 'operated',
   'Append-only record of every staff view of a reported message (1350), listed by a 12E console.',
   'excluded', 'Staff audit, not member data.');
