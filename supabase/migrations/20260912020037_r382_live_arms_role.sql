-- ---------------------------------------------------------------------------
-- Housekeeping 01, ruling 382: one least-privilege role for the live arms in CI.
--
-- Committed before it is applied (ruling 225). One role, its grants, and three policies that
-- admit that role only. No table changes, no function changes, no change to any existing policy
-- or grant.
--
-- CI holds one database secret, LIVE_DB_URL, a connection string for this role on the canonical
-- project. It replaces the Management API token (account-wide, and covering the r17ghana
-- project) and is never the service role key. The role is live_arms.
--
-- What the arms need, and therefore what the role gets, and nothing else:
--
--   connect             LOGIN. CONNECT and TEMP on the database and USAGE on schema public are
--                       PUBLIC's defaults on this project and are not re-granted here. No
--                       password is set in this file: the founder sets it by hand
--                       (alter role live_arms password '...'), so no secret enters the repo.
--
--   set local role      membership in anon and authenticated with SET and without INHERIT, so an
--                       arm may `set local role authenticated` (or anon) and back, and carries
--                       neither role's privileges until it does. The ruling 218 arms and the
--                       conformance audit's live method run this way: begin; set local role;
--                       set local request.jwt.claims; ...; rollback.
--
--   request.jwt.claims  any role may set_config a custom setting; nothing to grant.
--
--   Hotfix 01 fixture   tests/fixtures/hotfix01-onboard-who.sql (H1a, H1b, H1c) builds its own
--                       scaffolding as the connecting role before calling the function: it reads
--                       the two ruling 218 test accounts by handle, clears onboarded_at and
--                       who_completed_at on the caller, registers one media row per account, then
--                       calls public.onboard_who with the caller's claims set. So the role gets:
--                         select (id, name, handle) on public.members,
--                         update (onboarded_at, who_completed_at) on public.members,
--                         insert on public.media,
--                         execute on public.onboard_who(text, text, text),
--                       each under a policy of its own that admits only the rows of the two
--                       ruling 218 test accounts (handles owner-test and member-test). The role
--                       does not bypass RLS, so these policies are the whole of its reach on those
--                       tables; a real member's row is never visible to it. onboard_who is
--                       SECURITY DEFINER and runs as its owner, exactly as it does for a signed-in
--                       member. The temp result table is the role's own.
--
--   not granted         SUPERUSER, BYPASSRLS, CREATEDB, CREATEROLE, REPLICATION, ownership of
--                       anything, service_role membership, any grant on any other table, function
--                       or schema. Connection limit 5; statement_timeout and
--                       idle_in_transaction_session_timeout 60 s, so a hung arm cannot hold the
--                       pooler.
--
-- Verified after the apply (ruling 225): pg_roles for the attributes, pg_auth_members for the two
-- memberships, information_schema.role_table_grants and column_privileges for the grants,
-- pg_policies for the three policies, and the Hotfix 01 fixture run as live_arms inside a
-- rolled-back transaction, reported in the Housekeeping 01 closing report.
-- ---------------------------------------------------------------------------

create role live_arms
  login noinherit nosuperuser nobypassrls nocreatedb nocreaterole noreplication
  connection limit 5;

comment on role live_arms is
  'Ruling 382: the role CI connects as through LIVE_DB_URL for the live arms. Membership in anon and authenticated (SET, no INHERIT) plus the Hotfix 01 fixture''s own grants, scoped to the two ruling 218 test accounts. Password set by the founder by hand, never in a migration.';

alter role live_arms set statement_timeout = '60s';
alter role live_arms set idle_in_transaction_session_timeout = '60s';

-- SET LOCAL role to anon or authenticated and back; no inherited privileges.
grant anon to live_arms with inherit false, set true;
grant authenticated to live_arms with inherit false, set true;

-- The Hotfix 01 fixture's scaffolding, as the connecting role.
grant select (id, name, handle), update (onboarded_at, who_completed_at)
  on table public.members to live_arms;
grant insert on table public.media to live_arms;
grant execute on function public.onboard_who(text, text, text) to live_arms;

-- Policies for live_arms only. Nothing outside the two ruling 218 test accounts is ever a row to it.
create policy members_live_arms_select on public.members
  for select to live_arms
  using (handle in ('owner-test', 'member-test'));

create policy members_live_arms_update on public.members
  for update to live_arms
  using (handle in ('owner-test', 'member-test'))
  with check (handle in ('owner-test', 'member-test'));

create policy media_live_arms_insert on public.media
  for insert to live_arms
  with check (exists (
    select 1 from public.members m
    where m.id = owner_id and m.handle in ('owner-test', 'member-test')
  ));
