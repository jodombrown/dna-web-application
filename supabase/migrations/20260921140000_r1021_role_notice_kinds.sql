-- Convene Pass 2 (Brief 10, Attend): the notice kinds a role invitation needs, and the anchor its
-- notice points at. Rulings 1021 and 1018, on 678, 736, 749 and 752. Committed before it is applied
-- (ruling 225). Applied to the canonical project by Chat through the Supabase MCP's execute_sql under
-- rulings 963 and 965, with its supabase_migrations.schema_migrations row in the same transaction,
-- and never by apply_migration (rulings 553, 269).
--
-- Why this file stands alone. A value added by ALTER TYPE ... ADD VALUE cannot be used in the
-- transaction that adds it. 20260921140100 names both notice kinds at parse time, in the generated
-- expression of public.notifications.c_category, and its functions write all three values. So this
-- file is applied and committed in its own transaction first, and 20260921140100 runs in a second.
--
-- role_invitation is the named member's notice that a host has invited them to a role (736, Strand
-- correction 15 under 749). role_accepted is that same notice after the member accepts: the row stays,
-- Convene-badged, with the sentence and no act (752). event_party is the anchor both point at, the
-- one public.event_parties row the notice is about, the way connection_request is the anchor of
-- connection_accepted. Nothing here writes a row.

alter type public.notification_kind add value 'role_invitation' after 'event_reminder';
alter type public.notification_kind add value 'role_accepted' after 'role_invitation';
alter type public.anchor_kind add value 'event_party' after 'story';
