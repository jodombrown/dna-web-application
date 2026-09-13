-- Ruling 343: the username derivation transliterates rather than deletes. Committed as
-- supabase/migrations/20260911120000_r343_username_fold.sql before this apply (ruling 225).

create or replace function private.derive_username(p_name text)
returns text
language sql immutable strict set search_path = ''
as $$
  select nullif(trim(both '-' from left(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(
            regexp_replace(
              normalize(trim(p_name), NFKD),
              '[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]', '', 'g')),
          '[^a-z0-9 -]', '', 'g'),
        ' ', '-', 'g'),
      '-+', '-', 'g'),
    40)), '');
$$;
revoke execute on function private.derive_username(text) from public, anon, authenticated;
comment on function private.derive_username(text) is 'Ruling 343: trim, NFKD, strip combining marks, then SPEC section 9: lowercase, keep a-z 0-9 space hyphen, spaces to hyphens, collapse, trim hyphens, forty. Null when nothing survives. Mirrored by deriveUsername in src/lib/onboarding.ts.';

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
  if v_avatar is not null and v_avatar not like v_uid::text || '/avatar/%' then
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

create or replace function public.onboarding_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  m public.members%rowtype;
  v_label text;
begin
  if v_uid is null then return null; end if;
  select * into m from public.members where id = v_uid;
  if m.id is null then return null; end if;
  select s.label into v_label from public.member_stances s where s.stance = m.stance;
  return jsonb_build_object(
    'next', case
      when m.who_completed_at is null then 'who'
      when m.current_place is null then 'where'
      when m.onboarded_at is null then 'relationship'
      else null end,
    'who', jsonb_build_object(
      'name', m.name,
      'username', case when m.who_completed_at is null then null else m.handle end,
      'suggestion', private.derive_username(m.name),
      'avatar_path', m.avatar_path,
      'completed', m.who_completed_at is not null),
    'where', jsonb_build_object(
      'city', m.current_place,
      'country', m.current_country,
      'completed', m.current_place is not null),
    'relationship', jsonb_build_object(
      'stance', m.stance,
      'stance_label', v_label,
      'declared', m.stance_declared_at is not null,
      'completed', m.onboarded_at is not null),
    'onboarded_at', m.onboarded_at);
end;
$$;
