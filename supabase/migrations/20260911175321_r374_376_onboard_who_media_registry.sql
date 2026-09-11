-- ---------------------------------------------------------------------------
-- Hotfix 01, rulings 374 to 376: onboard_who checks the media registry, not a path shape.
--
-- Committed before it is applied (ruling 225). One function replacement, no table change, no
-- change to media-upload, the storage path format or public.media's policies.
--
-- Since PR #24 (ruling 346) media-upload stores an avatar master at {uid}/{mediaId}.{ext} and
-- records it in public.media, the single record of every stored master. onboard_who still
-- required the path to start with {uid}/avatar/, a second and weaker copy of the same fact, so
-- from 08:18 UTC on 11 September every sign-up stopped at screen one behind the generic alert.
-- The check now asks the registry: the path is accepted only when it is a public.media row
-- owned by the caller with kind = 'avatar'. Anything else is refused with the same 22023 and
-- the same message the function raised before.
--
-- Every other branch is unchanged: not signed in, no profile row, already complete, the name,
-- username, invalid and taken branches, the username_changes logic, and the rule that a missing
-- photo keeps the existing one. Proven by tests/fixtures/hotfix01-onboard-who.sql through
-- tests/live-checks.cjs, against the real function in a rolled-back transaction.
-- ---------------------------------------------------------------------------

create or replace function public.onboard_who(p_name text, p_username text default null, p_avatar_path text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_suggestion text;
  v_user text;
  v_avatar text := nullif(trim(coalesce(p_avatar_path, '')), '');
  v_changed boolean;
begin
  if v_uid is null then
    raise exception 'onboarding: not signed in' using errcode = '42501';
  end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then
    raise exception 'onboarding: no profile row' using errcode = 'P0002';
  end if;
  if m.onboarded_at is not null then
    raise exception 'onboarding: already complete' using errcode = 'P0001';
  end if;
  if v_name = '' then
    raise exception 'A name is required.' using errcode = '22023';
  end if;
  v_suggestion := private.derive_username(v_name);
  v_user := coalesce(nullif(lower(trim(coalesce(p_username, ''))), ''), v_suggestion);
  -- The handle column's shape, three to forty characters (ruling 334). A null here is a name that
  -- folded to nothing and no username typed: nothing to write, so invalid, never a placeholder.
  if v_user is null or v_user !~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' then
    return jsonb_build_object('status', 'invalid', 'suggestion', v_suggestion);
  end if;
  if exists (select 1 from public.members x where x.handle = v_user and x.id <> v_uid) then
    return jsonb_build_object('status', 'taken', 'suggestion', v_suggestion);
  end if;
  -- Rulings 374 to 376: the photo is this member's avatar when public.media, the single record of
  -- every stored master (ruling 346), holds it for this caller with kind avatar. Not a path shape.
  if v_avatar is not null and not exists (
    select 1 from public.media md
    where md.owner_id = v_uid and md.kind = 'avatar' and md.storage_path = v_avatar
  ) then
    raise exception 'onboarding: photo path is not this member''s avatar' using errcode = '22023';
  end if;
  v_changed := v_suggestion is not null and v_user <> v_suggestion and v_user <> m.handle;

  update public.members set
    name = v_name,
    handle = v_user,
    -- No photo offered keeps the one the member already has (a provider photo, or a resume after
    -- one was set); onboarding never removes a photo, the profile does.
    avatar_path = coalesce(v_avatar, m.avatar_path),
    username_changes = case when v_changed then m.username_changes + 1 else m.username_changes end,
    who_completed_at = coalesce(m.who_completed_at, now()),
    updated_at = now()
  where id = v_uid;

  return jsonb_build_object(
    'status', 'ok',
    'name', v_name,
    'username', v_user,
    'avatar_path', coalesce(v_avatar, m.avatar_path),
    'suggestion', v_suggestion,
    'username_changes', case when v_changed then m.username_changes + 1 else m.username_changes end);
end;
$$;
