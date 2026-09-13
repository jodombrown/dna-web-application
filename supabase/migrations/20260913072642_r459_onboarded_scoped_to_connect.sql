-- Ruling 459 (W49), narrowed to the three surfaces the ruling names. Ruling 466: the migration
-- that applied it an hour ago is not edited; this is the change.
--
-- 20260913065126 put the condition in private.admit_member, reasoning that a fourth copy of an
-- audience rule is how surfaces drift apart. That predicate is read by more than Connect:
-- private.can_see_core reads it, and members_anon_select and members_member_select are both
-- `using (private.can_see_core(id))`. So the condition also took every account with onboarded_at
-- null out of the members table for every reader, signed out and signed in, and the Brief 3 seed
-- cast (thandiwe-dube and the four beside them, inserted directly and never onboarded) went dark:
-- run 174 caught it as `check 1: anon reads the shared profile's core row`, returning no row.
--
-- Ruling 459 names connect_cards in every lens, connect_where and send_introduction. Those three
-- get the condition and nothing else does. It is still one rule in one place, private.is_onboarded,
-- referenced by the three surfaces rather than copied into them, so the one-projection absolute
-- holds and the public profile is left as ruling 141 and the Brief 3 arms built it.
--
-- The three are rewritten by substitution on their current definitions, so this migration carries
-- the condition and nothing else and fails loudly if a definition has moved on.

create or replace function private.is_onboarded(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m where m.id = p_member and m.onboarded_at is not null
  );
$$;

comment on function private.is_onboarded(uuid) is
  'Ruling 459 (W49): an account that has not finished onboarding is not a member Connect may offer or write to. Read by connect_cards, connect_where and send_introduction, and by nothing else: the profile surfaces are governed by private.can_see_core and ruling 141.';

revoke execute on function private.is_onboarded(uuid) from public, anon;
grant execute on function private.is_onboarded(uuid) to authenticated, service_role;

-- private.admit_member returns to the body the project recorded before 20260913065126.
create or replace function private.admit_member(p_member uuid, p_viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_member is null then false
    when p_viewer is not null and p_viewer = p_member then true
    when exists (select 1 from public.members m where m.id = p_member and m.profile_private)
      then p_viewer is not null and private.is_connected(p_viewer, p_member)
    when p_viewer is not null then true
    else exists (select 1 from public.members m where m.id = p_member and m.profile_shared)
  end;
$$;

do $do$
declare
  src text;
  out text;
begin
  -- connect_cards: both member-producing paths, the Members lens and the candidate set Suggested
  -- and Network read, filter on the same predicate pair.
  src := pg_get_functiondef('public.connect_cards(text, jsonb, text, integer)'::regprocedure);
  out := replace(src,
    'and private.admit_member(m.id, v_uid)',
    'and private.admit_member(m.id, v_uid) and private.is_onboarded(m.id)');
  if out = src then
    raise exception 'r459: connect_cards no longer filters on admit_member(m.id, v_uid)';
  end if;
  execute out;

  src := pg_get_functiondef('public.connect_where()'::regprocedure);
  out := replace(src,
    'and private.admit_member(m.id, v_uid)',
    'and private.admit_member(m.id, v_uid) and private.is_onboarded(m.id)');
  if out = src then
    raise exception 'r459: connect_where no longer filters on admit_member(m.id, v_uid)';
  end if;
  execute out;

  -- send_introduction refuses in the same words as every other condition it refuses on, on purpose:
  -- rulings 213 and 229 made that message indistinguishable so the write path cannot be used to
  -- learn which condition fired.
  src := pg_get_functiondef('public.send_introduction(uuid, text)'::regprocedure);
  out := replace(src,
    'or not private.admit_member(p_recipient, v_uid)',
    'or not private.admit_member(p_recipient, v_uid)'
      || E'\n     or not private.is_onboarded(p_recipient)');
  if out = src then
    raise exception 'r459: send_introduction no longer refuses on admit_member(p_recipient, v_uid)';
  end if;
  execute out;
end
$do$;

do $do$
declare
  n int;
begin
  select count(*) into n
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname in ('public', 'private') and p.prokind = 'f'
    and p.proname in ('connect_cards', 'connect_where', 'send_introduction')
    and pg_get_functiondef(p.oid) like '%is_onboarded%';
  if n <> 3 then
    raise exception 'r459: expected three surfaces to read is_onboarded, found %', n;
  end if;

  if pg_get_functiondef('private.admit_member(uuid, uuid)'::regprocedure) like '%onboarded_at%' then
    raise exception 'r459: admit_member still carries the onboarding condition';
  end if;

  select count(*) into n
  from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname in ('public', 'private') and p.prokind = 'f'
    and p.proname not in ('connect_cards', 'connect_where', 'send_introduction', 'is_onboarded')
    and pg_get_functiondef(p.oid) like '%is_onboarded%';
  if n <> 0 then
    raise exception 'r459: is_onboarded reached % function(s) outside the three ruling 459 names', n;
  end if;
end
$do$;
