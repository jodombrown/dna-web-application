-- Ruling 459 (W49, item 27): an account that has not finished onboarding is not a member anyone can
-- find or write to. W49 saw the other half of it: a half-created account appearing in Connect with a
-- placeholder name, and an introduction that could be sent to it.
--
-- private.admit_member is the one predicate the three surfaces ruling 459 names already read:
-- public.connect_cards (Members, Suggested and Network), public.connect_where (the country mosaic)
-- and public.send_introduction. The condition goes there rather than into each of them, because a
-- fourth copy of an audience rule is how the surfaces drift apart (the one-projection absolute).
-- private.can_see_core reads it too; that is inert, because an account that has not onboarded has
-- no posts and no profile anyone can reach.
--
-- A member always admits themselves, before the new condition: the onboarding screens read their
-- own row while onboarded_at is still null.
--
-- send_introduction refuses an un-onboarded recipient in the same words as every other condition it
-- refuses on ('send_introduction: not available'), deliberately. Rulings 213 and 229 made that one
-- message indistinguishable so the write path cannot be used to learn which condition fired; a
-- refusal naming this condition would turn it into an oracle for accounts that exist but have not
-- onboarded. The refusal is named in the sense that matters: it raises, with a message, and never
-- writes.
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
    -- Ruling 459: an account that has not finished onboarding is admitted to nothing.
    when not exists (
      select 1 from public.members m where m.id = p_member and m.onboarded_at is not null
    ) then false
    when exists (select 1 from public.members m where m.id = p_member and m.profile_private)
      then p_viewer is not null and private.is_connected(p_viewer, p_member)
    when p_viewer is not null then true
    else exists (select 1 from public.members m where m.id = p_member and m.profile_shared)
  end;
$$;

do $do$
begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public','private') and p.prokind = 'f'
        and p.proname in ('connect_cards','connect_where','send_introduction')
        and pg_get_functiondef(p.oid) like '%admit_member%') <> 3 then
    raise exception 'r459: connect_cards, connect_where and send_introduction must all read admit_member';
  end if;
end
$do$;
