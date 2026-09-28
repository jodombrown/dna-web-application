-- G61, Session 35, handoff 35-A: the four table privileges Supabase's default privileges hand anon and
-- authenticated on every table postgres creates in public, taken back from every table and from every table to
-- come. Runs after 20260927120000. Committed before it is applied (ruling 225). Applied to the canonical project
-- by Chat through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration (rulings 553,
-- 269).
--
-- Read live on 27 September 2026 before this file was written: pg_default_acl carries, for tables postgres
-- creates in public, anon=Dxtm and authenticated=Dxtm (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN); 53 of the 67
-- tables in public carry the four for authenticated and 29 for anon. Row security governs none of them. Every
-- table in public is owned by postgres, so the default for role postgres is the one that matters; the
-- supabase_admin default in the same catalogue applies only to tables that role creates, and none exists here.
--
-- What this file does not touch: SELECT, INSERT, UPDATE and DELETE anywhere, service_role, and the direct
-- INSERT, UPDATE and DELETE authenticated holds on public.event_delivery and public.event_host_settings.
-- public.publish_post is security invoker and writes both tables as the member, so those grants are the one
-- write path's own permission today; closing them is a separate ruling (Session 35).

revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;
