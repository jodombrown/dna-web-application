-- Ruling 469: the onboarding name field starts empty and is never prefilled from the email local
-- part. Two places carried the prefill.
--
-- private.handle_new_user minted a placeholder name from split_part(email, '@', 1) when the sign-up
-- carried no full_name, so a member who signed up with an address alone arrived at screen one with
-- the local part of their address already typed into the name field (and their handle minted from
-- it). Ruling 432 removed the name field from sign-up, so that fallback is now the common path, not
-- the rare one. The placeholder is 'Member' from here: the column is not null, nothing else about
-- the row changes, and no part of an address becomes a name or a handle.
--
-- public.onboarding_state returned m.name whether or not the member had ever set it, which is what
-- the surface renders into the field. It now returns the stored name only once the Who screen is
-- completed; before that the field is empty and the username suggestion follows what is typed.
--
-- Existing rows are not rewritten: a member who already holds an address-derived name keeps it
-- until they set their own, and no surface shows it because ruling 459 excludes members who have
-- not onboarded. Rewriting names already in use is a data change no ruling asks for.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    'Member');
begin
  insert into public.members (id, handle, name)
  values (new.id, private.mint_handle(v_name), left(v_name, 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $do$
declare
  src text := pg_get_functiondef('public.onboarding_state()'::regprocedure);
  out text;
begin
  out := replace(src,
$q$      'name', m.name,$q$,
$q$      'name', case when m.who_completed_at is null then '' else m.name end,$q$);
  if out = src then
    raise exception 'r469: onboarding_state does not carry the name the surface prefills';
  end if;

  out := replace(out,
$q$      'suggestion', private.derive_username(m.name),$q$,
$q$      'suggestion', case when m.who_completed_at is null then null else private.derive_username(m.name) end,$q$);
  if position('who_completed_at is null then null else private.derive_username' in out) = 0 then
    raise exception 'r469: the username suggestion still derives from a name the member never set';
  end if;

  execute out;
end
$do$;
