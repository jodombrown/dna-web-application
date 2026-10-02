-- Brief 14 Messenger, handoff 41-A, file 1 of 9: the six enum types, values only. Nothing in this file
-- uses them; a value added by create type or alter type ... add value cannot be used in the transaction
-- that adds it, so the files that use them follow in their own transactions (CLAUDE.md, the two-file
-- enum rule; 20260921140000 and 20260921140100 are the standing instance).
--
-- Committed before it is applied (ruling 225). Applied to the canonical project by Chat through the
-- Supabase MCP's execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations
-- row in the same transaction, and never by apply_migration (rulings 553, 269).
--
-- Rulings: 450 (reachability), 1331 (thread kinds, served from a table in file 2), 1332 (thread
-- roles), 1341 (request states), 1346 (message kinds), 1349 (report states).

create type public.reachability as enum ('open', 'connections_of_connections', 'off');
create type public.thread_member_role as enum ('lead', 'co_lead', 'member');
create type public.thread_member_state as enum ('invited', 'active', 'left', 'removed');
create type public.message_kind as enum ('text', 'voice', 'media', 'system');
create type public.message_request_state as enum ('pending', 'accepted', 'declined', 'blocked');
create type public.message_report_state as enum ('open', 'reviewed', 'dismissed');

comment on type public.reachability is
  'Who may send a member a message request (ruling 450, Brief 14 F2): open, connections of connections, or off. Connections message without a request whatever the value (1330).';
comment on type public.thread_member_role is
  'A thread member''s role (1332): lead, co_lead or member. A one_to_one thread holds two members and no lead.';
comment on type public.thread_member_state is
  'A thread member''s state (1342): invited, active, left or removed. Only active members read messages.';
comment on type public.message_kind is
  'What a message carries (1346): text, voice, media or system. Clients send text, voice and media; system is reserved for the server.';
comment on type public.message_request_state is
  'A message request''s state (1341): pending, accepted, declined (recoverable) or blocked.';
comment on type public.message_report_state is
  'A message report''s state (1349): open, reviewed or dismissed. Written by staff through the admin app.';
