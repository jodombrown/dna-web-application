-- Brief 14 Messenger, handoff 56-41E, item 1.4 (rulings 1576, 1404).
-- The member's skin tone, stored server-side and never defaulted: null is unchosen, which means no
-- modifier (1576); a value is one of the five emoji modifier characters U+1F3FB to U+1F3FF. The
-- column is added bare with no default, so no existing row is touched (564). messenger_settings_set
-- gains p_skin_tone: null leaves the value as it is, 'none' sets it to null, and a modifier sets it.
-- The settings read, public.messenger_settings(), returns the row and so the column with it.
-- A function's argument list cannot change under create or replace, so the two settings writers
-- are dropped and created again with the new argument.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

alter table public.member_messaging_settings add column reaction_skin_tone text;
alter table public.member_messaging_settings add constraint member_messaging_settings_skin_tone_modifier
  check (reaction_skin_tone is null
         or reaction_skin_tone in (chr(127995), chr(127996), chr(127997), chr(127998), chr(127999)));
comment on column public.member_messaging_settings.reaction_skin_tone is
  'Ruling 1576: the skin tone modifier the member chose for emoji reactions, U+1F3FB to U+1F3FF, or null for unchosen, which means no modifier. Never defaulted.';

drop function public.messenger_settings_set(boolean, boolean, boolean);
drop function private.messaging_settings_set(boolean, boolean, boolean);

create function private.messaging_settings_set(
  p_receipts boolean,
  p_link_previews boolean,
  p_media_notice_seen boolean,
  p_skin_tone text
)
returns public.member_messaging_settings
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.member_messaging_settings;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if p_skin_tone is not null and p_skin_tone <> 'none'
     and p_skin_tone not in (chr(127995), chr(127996), chr(127997), chr(127998), chr(127999)) then
    raise exception 'bad_skin_tone' using errcode = '22023';
  end if;
  perform private.messaging_settings_touch(v_uid);
  update public.member_messaging_settings s
  set receipts_enabled = coalesce(p_receipts, s.receipts_enabled),
      receipts_chosen_at = case when p_receipts is not null then coalesce(s.receipts_chosen_at, now()) else s.receipts_chosen_at end,
      link_previews_enabled = coalesce(p_link_previews, s.link_previews_enabled),
      media_notice_seen_at = case when p_media_notice_seen then coalesce(s.media_notice_seen_at, now()) else s.media_notice_seen_at end,
      reaction_skin_tone = case
        when p_skin_tone is null then s.reaction_skin_tone
        when p_skin_tone = 'none' then null
        else p_skin_tone end,
      updated_at = now()
  where s.member_id = v_uid
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function private.messaging_settings_set(boolean, boolean, boolean, text) from public;

create function public.messenger_settings_set(
  p_receipts boolean default null,
  p_link_previews boolean default null,
  p_media_notice_seen boolean default null,
  p_skin_tone text default null
)
returns public.member_messaging_settings
language sql
volatile
security definer
set search_path to ''
as $$ select private.messaging_settings_set(p_receipts, p_link_previews, coalesce(p_media_notice_seen, false), p_skin_tone); $$;

revoke all on function public.messenger_settings_set(boolean, boolean, boolean, text) from public, anon;
grant execute on function public.messenger_settings_set(boolean, boolean, boolean, text) to authenticated, service_role;
