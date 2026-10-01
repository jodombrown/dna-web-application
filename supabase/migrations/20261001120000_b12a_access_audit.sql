-- Brief 12 12A, access and audit (Session 40, Lane C, handoff 40-A). The database half of admin
-- access: the gate moves off the JWT's app_metadata and into one role table read at AAL2, every
-- admin read and write is logged, and the sixty-six row policies that cited private.is_admin() are
-- gone, so nothing reads a member's row as an admin except through an audited definer function.
-- Governed by rulings 1176 to 1180 as amended by 1265 to 1269, 1289 and 1292, with 1116, 1177, 1178,
-- 1266, 1267 and 382. Committed before it is applied (ruling 225). Applied by Chat through the
-- Supabase MCP's execute_sql with its supabase_migrations.schema_migrations row in the same
-- transaction, never by apply_migration (rulings 553, 963, 965). Runs after 20260929120000.
--
-- Read live on 1 October 2026 before this file was written: private.is_admin() reads
-- auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' and is cited by 66 row policies on 45 tables in
-- public and on storage.objects, and by one function, public.event_alias_check(uuid, text);
-- private.is_editor(uuid) reads public.editors, one row (owner-test), whose only policy is
-- editors_service_role and whose only grants are to service_role; public.vocabularies() is security
-- invoker, executable by authenticated and service_role, and serves nineteen keys; auth.users holds
-- exactly one account at the founder's admin-only address, the one handoff 40-A section 1 names,
-- confirmed and never onboarded, with a public.members row under the placeholder handle member; the live_arms role exists under ruling 382
-- with usage on schema private; and the ensure_rls event trigger enables row security on every table
-- created in public, which this file does again explicitly rather than rely on.
--
-- What this adds.
--   public.platform_role_kinds     the role vocabulary, six rows, served by vocabularies() (1177).
--   public.platform_roles          who holds which role, with its grant and its revocation, never
--                                  deleted. No client grant; read and written only through the
--                                  definer functions below.
--   public.admin_actions           every admin write, one row per act, append-only for every role,
--                                  the service role included (1178).
--   public.admin_reads             every admin read of a projection, actor and projection and time,
--                                  no payload, append-only the same way (1178). Nothing calls
--                                  private.log_admin_read yet; every admin_* projection of 12B does.
--   private.has_platform_role(text), private.is_admin(), private.is_editor(uuid),
--   private.log_admin_read(text)   the helpers. The two gates require auth.jwt() ->> 'aal' = 'aal2'
--                                  and a live row (1265); nothing reads app_metadata (1267).
--   public.admin_session_state(), public.admin_grant_role(uuid, text, text),
--   public.admin_revoke_role(uuid, text, text)
--                                  the three RPCs, each writing its admin_actions row in the same
--                                  transaction as the change it records.
--   public.live_arms_admin_member() the one id the arms set as sub to act as the admin persona (382).
--   public.vocabularies()          gains platform_role_kinds; every other key is byte for byte the
--                                  live definition.
--
-- What this folds and drops.
--   public.editors and editors_service_role, after each row becomes a live editor row in
--   platform_roles with a role.migrated action (1177). public.convene_picks.picked_by referenced
--   editors(member_id) on delete restrict, the one object outside the table that depended on it (read
--   through pg_depend after a first apply was refused on the drop and rolled back whole); its key now
--   references public.members(id) on delete restrict, and the rule the old key enforced, that only an
--   editor can be named as a pick's picker, moves to a before insert or update of picked_by trigger
--   that raises 23503 unless private.is_editor(new.picked_by).
--   The 66 is_admin() policies, by name (1266), and a guard that fails the apply if any policy
--   anywhere still cites is_admin. public.event_alias_check is a function, not a policy, and keeps
--   its call; it now requires AAL2 through is_admin() like everything else.
--
-- The founder's grant (1289, 1292): the founder's admin-only account, found through auth.users by its
-- lower-cased, trimmed address and never by a pasted id or a handle, receives admin and editor, each
-- with its admin_actions row. An address matching no account or more than one raises and writes
-- nothing. The address itself is not spelled in this file: ruling 387's absolute keeps every address
-- on the company domain out of the repository except the two contact modules, and tests/contact.cjs
-- scans the whole tree for one, so the account is matched on the md5 of its lower-cased, trimmed
-- address, which handoff 40-A section 1 states in clear. owner-test keeps editor through the fold and
-- is not an admin.
--
-- Neither log carries a foreign key: a key would cascade or null on a member's deletion, which is an
-- update or delete the triggers refuse, so an erasure would fail at the log. How audit rows are
-- treated under erasure (479) is a counsel item, reported in the handoff's closing report and not
-- built here.
--
-- What this file does not touch: any member surface's projection or write path, any policy that does
-- not cite is_admin, any grant on an existing table, any row of convene_picks, auth.mfa_factors or the project's Auth settings,
-- surface_events (12C), any admin_* projection (12B), src/, tests/, docs/GAPS.md and CLAUDE.md.

-- ---------------------------------------------------------------------------------------------------
-- 1. The role vocabulary (1177), in public.event_block_kinds' shape.
-- ---------------------------------------------------------------------------------------------------

create table public.platform_role_kinds (
  role text primary key,
  label text not null,
  position int not null unique
);

alter table public.platform_role_kinds enable row level security;

revoke all on table public.platform_role_kinds from anon, authenticated;
grant select on table public.platform_role_kinds to authenticated;
grant all on table public.platform_role_kinds to service_role;

create policy platform_role_kinds_member_select on public.platform_role_kinds
  for select to authenticated
  using (true);

create policy platform_role_kinds_service_role on public.platform_role_kinds
  for all to service_role
  using (true)
  with check (true);

comment on table public.platform_role_kinds is
  'The platform roles a member can hold and the label each shows (Brief 12 12A, ruling 1177). Read by every signed-in persona (member, Space lead, event host, admin) through one select-all policy and served by public.vocabularies() as platform_role_kinds, so no surface keeps a role label map. Signed out reads nothing here: the vocabulary is executable by authenticated only. Writes are service role only; a role is added by a migration.';

insert into public.platform_role_kinds (role, label, position) values
  ('admin', 'Admin', 1),
  ('editor', 'Editor', 2),
  ('moderator', 'Moderator', 3),
  ('support', 'Support', 4),
  ('finance', 'Finance', 5),
  ('analyst', 'Analyst', 6);

-- ---------------------------------------------------------------------------------------------------
-- 2. Who holds which role (1177, 1265). A revocation is a timestamp, never a delete, so the history of
--    every grant stays in the table; one live row per member and role.
-- ---------------------------------------------------------------------------------------------------

create table public.platform_roles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  role text not null references public.platform_role_kinds (role),
  granted_by uuid references public.members (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.members (id) on delete set null
);

create unique index platform_roles_live_member_role_key
  on public.platform_roles (member_id, role)
  where revoked_at is null;

alter table public.platform_roles enable row level security;

revoke all on table public.platform_roles from anon, authenticated;
grant all on table public.platform_roles to service_role;

create policy platform_roles_service_role on public.platform_roles
  for all to service_role
  using (true)
  with check (true);

comment on table public.platform_roles is
  'Who holds which platform role, with the grant and, once revoked, the revocation (Brief 12 12A, rulings 1177, 1265). No client grant: a member, a Space lead and an event host hold no privilege on this table and cannot read even their own row directly, because the one read is public.admin_session_state() and the two writes are public.admin_grant_role and public.admin_revoke_role, each a definer that writes its admin_actions row in the same transaction. An admin reads and writes it only through those three. Service role holds the table for the migration that seeds it and for nothing in the app. private.has_platform_role(text) is the only gate that reads it, and only at AAL2.';

-- ---------------------------------------------------------------------------------------------------
-- 3. The two logs (1178), append-only for every role.
-- ---------------------------------------------------------------------------------------------------

create table public.admin_actions (
  id bigint generated always as identity primary key,
  actor uuid,
  role_at_time text,
  action text not null,
  target_kind text not null,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

revoke all on table public.admin_actions from anon, authenticated, service_role;
grant select, insert on table public.admin_actions to service_role;

create policy admin_actions_service_role_select on public.admin_actions
  for select to service_role
  using (true);

create policy admin_actions_service_role_insert on public.admin_actions
  for insert to service_role
  with check (true);

comment on table public.admin_actions is
  'Every admin write, one row per act, append-only (Brief 12 12A, ruling 1178): actor (null means a migration wrote it), the role the actor held, the action, the target, the reason given, and the row before and after. No client grant: a member, a Space lead and an event host never read or write it; an admin writes it only through the RPC that makes the change, in the same transaction, and reads it only through a 12B admin_* projection. Service role may select and insert and nothing else, and the update, delete and truncate triggers refuse every role, the service role included. actor carries no foreign key by design: a key would cascade or null on a member''s deletion, which the triggers refuse.';

create table public.admin_reads (
  id bigint generated always as identity primary key,
  actor uuid not null,
  projection text not null,
  occurred_at timestamptz not null default now()
);

alter table public.admin_reads enable row level security;

revoke all on table public.admin_reads from anon, authenticated, service_role;
grant select, insert on table public.admin_reads to service_role;

create policy admin_reads_service_role_select on public.admin_reads
  for select to service_role
  using (true);

create policy admin_reads_service_role_insert on public.admin_reads
  for insert to service_role
  with check (true);

comment on table public.admin_reads is
  'Every admin read of a member projection, append-only (Brief 12 12A, ruling 1178): who, which projection, when, and no payload by design. No client grant: a member, a Space lead and an event host never read or write it; an admin writes it only through private.log_admin_read, which every admin_* projection calls, and reads it only through a 12B projection. Service role may select and insert and nothing else, and the update, delete and truncate triggers refuse every role, the service role included. actor carries no foreign key by design, as on admin_actions.';

-- The refusal, one function for both logs. Statement-level for truncate, row-level for the rest.
create function private.refuse_audit_change()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception '%: % is append-only for every role (ruling 1178)', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

revoke all on function private.refuse_audit_change() from public;

create trigger admin_actions_append_only
  before update or delete on public.admin_actions
  for each row execute function private.refuse_audit_change();

create trigger admin_actions_no_truncate
  before truncate on public.admin_actions
  for each statement execute function private.refuse_audit_change();

create trigger admin_reads_append_only
  before update or delete on public.admin_reads
  for each row execute function private.refuse_audit_change();

create trigger admin_reads_no_truncate
  before truncate on public.admin_reads
  for each statement execute function private.refuse_audit_change();

-- ---------------------------------------------------------------------------------------------------
-- 4. The helpers (1265, 1267). The two gates require AAL2 and a live row; is_editor states a fact
--    about a member and is not a gate, so it carries no AAL check.
-- ---------------------------------------------------------------------------------------------------

create function private.has_platform_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from public.platform_roles r
       where r.member_id = auth.uid()
         and r.role = p_role
         and r.revoked_at is null
     );
$$;

revoke all on function private.has_platform_role(text) from public, anon;
grant execute on function private.has_platform_role(text) to authenticated, service_role;

comment on function private.has_platform_role(text) is
  'True only when the caller''s JWT is at aal2 and the caller holds a live public.platform_roles row for the role (Brief 12 12A, ruling 1265). The one gate every admin function and private.is_admin() reads. Reads nothing from app_metadata (1267).';

-- Same signature as before, so public.event_alias_check keeps working; it now requires AAL2.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select private.has_platform_role('admin');
$$;

comment on function private.is_admin() is
  'private.has_platform_role(''admin''): a live admin row at aal2 (Brief 12 12A, rulings 1265, 1267). Cited by no row policy since this migration (1266); public.event_alias_check is its one caller.';

create or replace function private.is_editor(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select p_member is not null and exists (
    select 1 from public.platform_roles r
    where r.member_id = p_member
      and r.role = 'editor'
      and r.revoked_at is null
  );
$$;

comment on function private.is_editor(uuid) is
  'Whether the member holds a live editor row in public.platform_roles (Brief 12 12A, ruling 1177, folding public.editors in). A fact about a member, not a gate, so no AAL check. No caller today.';

create function private.log_admin_read(p_projection text)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'log_admin_read: not signed in' using errcode = '42501';
  end if;
  insert into public.admin_reads (actor, projection) values (auth.uid(), p_projection);
end;
$$;

revoke all on function private.log_admin_read(text) from public, anon, authenticated;
grant execute on function private.log_admin_read(text) to service_role;

comment on function private.log_admin_read(text) is
  'Writes one public.admin_reads row for the caller and the projection named (Brief 12 12A, ruling 1178). Called by every admin_* definer projection as its first statement, running as the projection''s owner, so no client role holds execute on it and a member cannot write a read they did not make; nothing calls it in 12A.';

-- ---------------------------------------------------------------------------------------------------
-- 5. The RPCs. Each refuses with 42501 when the caller is not an admin at AAL2 and with 22023 on a bad
--    argument, and writes its admin_actions row in the transaction that makes the change.
-- ---------------------------------------------------------------------------------------------------

create function public.admin_session_state()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select jsonb_build_object(
    'holds_role', exists (
      select 1 from public.platform_roles r
      where r.member_id = auth.uid() and r.revoked_at is null
    ),
    'aal', auth.jwt() ->> 'aal',
    'roles', case
      when coalesce(auth.jwt() ->> 'aal', '') = 'aal2' then (
        select coalesce(jsonb_agg(r.role order by k.position), '[]'::jsonb)
        from public.platform_roles r
        join public.platform_role_kinds k on k.role = r.role
        where r.member_id = auth.uid() and r.revoked_at is null
      )
      else '[]'::jsonb
    end
  );
$$;

revoke all on function public.admin_session_state() from public, anon;
grant execute on function public.admin_session_state() to authenticated;

comment on function public.admin_session_state() is
  'The caller''s own standing and nothing about any other member (Brief 12 12A, ruling 1265): holds_role is whether any live platform_roles row exists for the caller at any AAL, so the admin app can tell enrolment from refusal; aal is the JWT''s claim; roles is the caller''s live roles in the vocabulary''s order at aal2 and an empty array otherwise.';

create function public.admin_grant_role(p_member uuid, p_role text, p_reason text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row public.platform_roles;
  v_action_id bigint;
begin
  if not private.has_platform_role('admin') then
    raise exception 'admin_grant_role: admin at aal2 required' using errcode = '42501';
  end if;
  if p_role is null or not exists (select 1 from public.platform_role_kinds k where k.role = p_role) then
    raise exception 'admin_grant_role: unknown role %', coalesce(p_role, '(null)') using errcode = '22023';
  end if;
  if p_member is null or not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'admin_grant_role: unknown member' using errcode = '22023';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'admin_grant_role: a reason is required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.platform_roles r
    where r.member_id = p_member and r.role = p_role and r.revoked_at is null
  ) then
    raise exception 'admin_grant_role: the member already holds %', p_role using errcode = '22023';
  end if;

  insert into public.platform_roles (member_id, role, granted_by)
  values (p_member, p_role, auth.uid())
  returning * into v_row;

  insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
  values (auth.uid(), 'admin', 'role.granted', 'member', p_member::text, btrim(p_reason), null, to_jsonb(v_row))
  returning id into v_action_id;

  return v_action_id;
end;
$$;

revoke all on function public.admin_grant_role(uuid, text, text) from public, anon;
grant execute on function public.admin_grant_role(uuid, text, text) to authenticated;

comment on function public.admin_grant_role(uuid, text, text) is
  'The one write that grants a platform role (Brief 12 12A, rulings 1177, 1178, 1265). Refuses with 42501 unless the caller is an admin at aal2, and with 22023 an unknown role, an unknown member, a blank reason or a role the member already holds live. Inserts the platform_roles row and its admin_actions row (role.granted) in one transaction and returns the action id.';

create function public.admin_revoke_role(p_member uuid, p_role text, p_reason text)
returns bigint
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_before public.platform_roles;
  v_after public.platform_roles;
  v_live_admins int;
  v_action_id bigint;
begin
  if not private.has_platform_role('admin') then
    raise exception 'admin_revoke_role: admin at aal2 required' using errcode = '42501';
  end if;
  if p_role is null or not exists (select 1 from public.platform_role_kinds k where k.role = p_role) then
    raise exception 'admin_revoke_role: unknown role %', coalesce(p_role, '(null)') using errcode = '22023';
  end if;
  if p_member is null or not exists (select 1 from public.members m where m.id = p_member) then
    raise exception 'admin_revoke_role: unknown member' using errcode = '22023';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'admin_revoke_role: a reason is required' using errcode = '22023';
  end if;

  select * into v_before
  from public.platform_roles r
  where r.member_id = p_member and r.role = p_role and r.revoked_at is null
  for update;
  if not found then
    raise exception 'admin_revoke_role: the member does not hold %', p_role using errcode = '22023';
  end if;

  if p_role = 'admin' then
    select count(*) into v_live_admins
    from public.platform_roles r
    where r.role = 'admin' and r.revoked_at is null;
    if v_live_admins <= 1 then
      raise exception 'admin_revoke_role: the last live admin cannot be revoked' using errcode = '22023';
    end if;
  end if;

  update public.platform_roles
  set revoked_at = now(), revoked_by = auth.uid()
  where id = v_before.id
  returning * into v_after;

  insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
  values (auth.uid(), 'admin', 'role.revoked', 'member', p_member::text, btrim(p_reason), to_jsonb(v_before), to_jsonb(v_after))
  returning id into v_action_id;

  return v_action_id;
end;
$$;

revoke all on function public.admin_revoke_role(uuid, text, text) from public, anon;
grant execute on function public.admin_revoke_role(uuid, text, text) to authenticated;

comment on function public.admin_revoke_role(uuid, text, text) is
  'The one write that revokes a platform role (Brief 12 12A, rulings 1177, 1178, 1265). The same refusals as admin_grant_role, 22023 when the member does not hold the role live, and 22023 for the last live admin row, so the company cannot lock itself out. Sets revoked_at and revoked_by, never deletes, writes its admin_actions row (role.revoked) with before and after in one transaction, and returns the action id.';

-- ---------------------------------------------------------------------------------------------------
-- 6. Fold public.editors in and drop it (1177). The helpers above already read platform_roles.
--    convene_picks' key on editors is re-pointed at members first, with its rule kept by a trigger.
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_editor record;
  v_row public.platform_roles;
begin
  for v_editor in select e.member_id, e.granted_at from public.editors e order by e.granted_at loop
    insert into public.platform_roles (member_id, role, granted_by, granted_at)
    values (v_editor.member_id, 'editor', null, v_editor.granted_at)
    returning * into v_row;

    insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
    values (null, null, 'role.migrated', 'member', v_editor.member_id::text,
            'Ruling 1177: public.editors folded into platform_roles', null, to_jsonb(v_row));
  end loop;
end;
$$;

-- The one dependent outside the table (1177): the picker's key moves from editors to members, same
-- name, same on delete restrict, so a pick keeps naming a member who cannot be deleted under it.
alter table public.convene_picks drop constraint convene_picks_picked_by_fkey;
alter table public.convene_picks
  add constraint convene_picks_picked_by_fkey
  foreign key (picked_by) references public.members (id) on delete restrict;

-- Ruling 1177's replacement for the editors key: the old key let only an editor be named as a pick's
-- picker, and a key to members alone would not. Fires on insert and on a change of picked_by only, so
-- a pick already made is not re-judged when its line or withdrawal changes. Definer, so the editor
-- read does not depend on the writing role's own grant on private.is_editor.
create function private.convene_pick_picker_is_editor()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not private.is_editor(new.picked_by) then
    raise exception 'convene_picks: picked_by % holds no live editor role (ruling 1177)', new.picked_by
      using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function private.convene_pick_picker_is_editor() from public;

create trigger convene_picks_picker_is_editor
  before insert or update of picked_by on public.convene_picks
  for each row execute function private.convene_pick_picker_is_editor();

comment on trigger convene_picks_picker_is_editor on public.convene_picks is
  'Ruling 1177''s replacement for the foreign key convene_picks.picked_by held on public.editors: only a member with a live editor row in public.platform_roles can be named as a pick''s picker. Raises 23503, as the key did.';

drop policy if exists editors_service_role on public.editors;
drop table public.editors;

-- ---------------------------------------------------------------------------------------------------
-- 7. The founder's grant (1289, 1292): by address through auth.users, never by a pasted id or a handle.
--    The address is matched by md5 so that no address literal enters the repository (ruling 387).
-- ---------------------------------------------------------------------------------------------------

do $$
declare
  v_matches int;
  v_founder uuid;
  v_role text;
  v_row public.platform_roles;
begin
  select count(*) into v_matches
  from auth.users u
  where md5(lower(btrim(u.email))) = '9dcfa24b63ef323c6590a8d4aa4fa8f1';

  if v_matches <> 1 then
    raise exception 'b12a: the founder''s address matches % auth.users rows, expected exactly one; nothing written', v_matches
      using errcode = '22023';
  end if;

  select u.id into strict v_founder
  from auth.users u
  where md5(lower(btrim(u.email))) = '9dcfa24b63ef323c6590a8d4aa4fa8f1';
  if not exists (select 1 from public.members m where m.id = v_founder) then
    raise exception 'b12a: the founder''s account has no public.members row; nothing written'
      using errcode = '22023';
  end if;

  foreach v_role in array array['admin', 'editor'] loop
    insert into public.platform_roles (member_id, role, granted_by)
    values (v_founder, v_role, null)
    returning * into v_row;

    insert into public.admin_actions (actor, role_at_time, action, target_kind, target_id, reason, before, after)
    values (null, null, 'role.granted', 'member', v_founder::text,
            'Ruling 1177, Brief 12 12A and ruling 1289: the founder''s first grant', null, to_jsonb(v_row));
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- 8. The arms' admin persona (382). live_arms may already set any sub in its claims; this only lets
--    the arms find the one id worth setting.
-- ---------------------------------------------------------------------------------------------------

create function public.live_arms_admin_member()
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select r.member_id
  from public.platform_roles r
  where r.role = 'admin' and r.revoked_at is null
  order by r.granted_at, r.id
  limit 1;
$$;

revoke all on function public.live_arms_admin_member() from public, anon, authenticated;
grant execute on function public.live_arms_admin_member() to live_arms;

comment on function public.live_arms_admin_member() is
  'The earliest-granted live admin''s member id, for the live arms to set as sub when they act as the admin persona (ruling 382, Brief 12 12A). Executable by live_arms only; it gives that role nothing it cannot already do.';

-- ---------------------------------------------------------------------------------------------------
-- 9. vocabularies() gains platform_role_kinds (1177). Every other key is the live definition byte for
--    byte, read through pg_get_functiondef on 1 October 2026.
-- ---------------------------------------------------------------------------------------------------

create or replace function public.vocabularies()
returns jsonb
language sql
stable
set search_path to ''
as $$
  select jsonb_build_object(
    'focus', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.focus_areas),
    'industries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.industries),
    'regions', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.regional_expertise),
    'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.skills),
    'languages', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.languages),
    'intent', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.intents),
    'interests', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.interests),
    'countries', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.countries),
    'world', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.world_countries),
    -- Ruling 187: the stance labels come from the table, here as everywhere else.
    'stances', (select coalesce(jsonb_agg(jsonb_build_object('value', s.stance, 'label', s.label)
                                           order by s.position), '[]'::jsonb)
                 from public.member_stances s),
    'heritage', (select jsonb_agg(x) from unnest(enum_range(null::public.heritage_kind)) x),
    'pathway', (select jsonb_agg(x) from unnest(enum_range(null::public.return_pathway)) x),
    'timeline', (select jsonb_agg(x) from unnest(enum_range(null::public.return_timeline)) x),
    -- Ruling 193: the Contribute instrument, in enum order, with its label derived from its value.
    'instrument', (select coalesce(jsonb_agg(jsonb_build_object(
                            'value', x,
                            'label', upper(left(replace(x::text, '_', '-'), 1))
                                     || substr(replace(x::text, '_', '-'), 2)) order by x), '[]'::jsonb)
                   from unnest(enum_range(null::public.contribute_instrument)) x),
    -- Ruling 1018: the roles a host can name on an event, with the verb the invitation reads.
    'event_roles', (select coalesce(jsonb_agg(jsonb_build_object('value', k.role, 'label', k.label, 'verb', k.verb)
                                               order by k.position), '[]'::jsonb)
                    from public.event_role_kinds k),
    -- Rulings 657, 1037 and 1038: Convene's category families, in the report's order.
    'convene_families', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'value', f.family, 'label', f.label, 'schema_org', to_jsonb(f.schema_org))
                                  order by f.position), '[]'::jsonb)
                         from public.convene_families f),
    -- Rulings 693, 925, 729, 1041 and 1093: Convene's lens set, All then the four who-lenses.
    'convene_lenses', (select coalesce(jsonb_agg(jsonb_build_object(
                                'value', l.lens, 'name', l.name, 'short', l.short, 'icon', l.icon, 'scope', l.scope)
                                order by l.position), '[]'::jsonb)
                       from public.convene_lenses l),
    -- Rulings 1092 and 1105: Discovery's nine lanes, in their one fixed order.
    'convene_lanes', (select coalesce(jsonb_agg(jsonb_build_object('value', n.lane, 'name', n.name)
                                order by n.position), '[]'::jsonb)
                      from public.convene_lanes n),
    -- Ruling 1186: the kinds of host-written block and the heading each shows.
    'event_block_kinds', (select coalesce(jsonb_agg(jsonb_build_object('value', k.kind, 'label', k.label)
                                                     order by k.position), '[]'::jsonb)
                          from public.event_block_kinds k),
    -- Ruling 1177: the platform roles a member can hold, in the vocabulary's order.
    'platform_role_kinds', (select coalesce(jsonb_agg(jsonb_build_object('value', k.role, 'label', k.label)
                                                       order by k.position), '[]'::jsonb)
                            from public.platform_role_kinds k)
  );
$$;

-- ---------------------------------------------------------------------------------------------------
-- 10. The 66 is_admin() policies (1266), by name, in the handoff's order. The two on storage.objects
--     belong to a table owned by supabase_storage_admin; the creating migration ran as postgres and
--     the drop is expected to succeed. If the apply is refused there, Chat reports it and applies
--     those two in a separate file.
-- ---------------------------------------------------------------------------------------------------

drop policy if exists space_roles_admin_select on public.space_roles;
drop policy if exists space_roles_admin_delete on public.space_roles;
drop policy if exists posts_admin_select on public.posts;
drop policy if exists posts_admin_delete on public.posts;
drop policy if exists post_media_admin_select on public.post_media;
drop policy if exists post_media_admin_delete on public.post_media;
drop policy if exists post_links_admin_select on public.post_links;
drop policy if exists post_links_admin_delete on public.post_links;
drop policy if exists post_dia_admin_select on public.post_dia;
drop policy if exists spaces_admin_select on public.spaces;
drop policy if exists spaces_admin_update on public.spaces;
drop policy if exists spaces_admin_delete on public.spaces;
drop policy if exists events_admin_select on public.events;
drop policy if exists events_admin_update on public.events;
drop policy if exists events_admin_delete on public.events;
drop policy if exists post_media_objects_admin_select on storage.objects;
drop policy if exists profile_media_objects_admin_select on storage.objects;
drop policy if exists opportunities_admin_select on public.opportunities;
drop policy if exists opportunities_admin_delete on public.opportunities;
drop policy if exists connection_requests_admin_select on public.connection_requests;
drop policy if exists connection_requests_admin_delete on public.connection_requests;
drop policy if exists event_blocks_admin_select on public.event_blocks;
drop policy if exists stories_admin_select on public.stories;
drop policy if exists stories_admin_delete on public.stories;
drop policy if exists notifications_admin_select on public.notifications;
drop policy if exists notifications_admin_delete on public.notifications;
drop policy if exists post_saves_admin_select on public.post_saves;
drop policy if exists post_saves_admin_delete on public.post_saves;
drop policy if exists post_reactions_admin_select on public.post_reactions;
drop policy if exists post_reactions_admin_delete on public.post_reactions;
drop policy if exists members_admin_delete on public.members;
drop policy if exists member_about_admin_select on public.member_about;
drop policy if exists member_origin_admin_select on public.member_origin;
drop policy if exists member_intent_admin_select on public.member_intent;
drop policy if exists member_focus_areas_admin_select on public.member_focus_areas;
drop policy if exists member_industries_admin_select on public.member_industries;
drop policy if exists member_regional_expertise_admin_select on public.member_regional_expertise;
drop policy if exists member_skills_admin_select on public.member_skills;
drop policy if exists member_languages_admin_select on public.member_languages;
drop policy if exists member_intents_admin_select on public.member_intents;
drop policy if exists member_interests_admin_select on public.member_interests;
drop policy if exists member_links_admin_select on public.member_links;
drop policy if exists member_visibility_admin_select on public.member_visibility;
drop policy if exists member_follows_admin_select on public.member_follows;
drop policy if exists member_follows_admin_delete on public.member_follows;
drop policy if exists attestations_admin_select on public.attestations;
drop policy if exists attestations_admin_delete on public.attestations;
drop policy if exists edges_admin_select on public.edges;
drop policy if exists edges_admin_delete on public.edges;
drop policy if exists member_connections_admin_select on public.member_connections;
drop policy if exists member_connections_admin_delete on public.member_connections;
drop policy if exists second_degree_admin_select on public.second_degree;
drop policy if exists dismissed_suggestions_admin_select on public.dismissed_suggestions;
drop policy if exists member_corridors_admin_select on public.member_corridors;
drop policy if exists member_embeddings_admin_select on public.member_embeddings;
drop policy if exists member_blocks_admin_select on public.member_blocks;
drop policy if exists member_blocks_admin_delete on public.member_blocks;
drop policy if exists media_admin_select on public.media;
drop policy if exists member_stance_details_admin_select on public.member_stance_details;
drop policy if exists event_delivery_admin_select on public.event_delivery;
drop policy if exists event_host_settings_admin_select on public.event_host_settings;
drop policy if exists event_registrations_admin_select on public.event_registrations;
drop policy if exists event_parties_admin_select on public.event_parties;
drop policy if exists member_subscriptions_admin_select on public.member_subscriptions;
drop policy if exists convene_picks_admin_select on public.convene_picks;
drop policy if exists discovery_dismissals_admin_select on public.discovery_dismissals;

-- The guard (1266): a list that missed one fails the apply rather than leaving it.
do $$
declare
  v_left text;
begin
  select string_agg(p.schemaname || '.' || p.tablename || '.' || p.policyname, ', ' order by p.tablename, p.policyname)
  into v_left
  from pg_policies p
  where p.qual ilike '%is_admin%' or p.with_check ilike '%is_admin%';

  if v_left is not null then
    raise exception 'b12a: policies still cite is_admin (ruling 1266): %', v_left;
  end if;
end;
$$;
