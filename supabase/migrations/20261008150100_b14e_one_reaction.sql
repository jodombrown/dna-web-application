-- Brief 14 Messenger, handoff 56-41E, item 1.2 (rulings 1590, 1577, 1576).
-- One reaction per member per message. The rows of the five words are prototype data and go; the
-- latest row per (message_id, member_id) is kept; the key becomes (message_id, member_id) and the
-- foreign key to message_reaction_kinds goes, because a reaction is now a character the
-- message_reaction_emoji vocabulary holds, with at most one skin tone modifier where its base takes
-- one. private.message_react keeps not_a_member and deleted, raises bad_reaction for a base the
-- vocabulary does not hold or a modifier on a base that takes none, and upserts the member's one
-- row. private.message_unreact is unchanged: it keeps its signature and deletes the member's row when
-- the reaction matches.
--
-- This file carries a delete, which the execute_sql guard refuses (1528): it reaches the project by
-- the founder's SQL Editor paste of these bytes, recording this version in the same transaction.
-- Committed before it is applied (225).

delete from public.message_reactions r
where r.reaction in (select k.value from public.message_reaction_kinds k);

delete from public.message_reactions r
using public.message_reactions later
where later.message_id = r.message_id
  and later.member_id = r.member_id
  and (later.created_at > r.created_at
       or (later.created_at = r.created_at and later.reaction > r.reaction));

alter table public.message_reactions drop constraint message_reactions_reaction_fkey;
alter table public.message_reactions drop constraint message_reactions_pkey;
alter table public.message_reactions add constraint message_reactions_pkey primary key (message_id, member_id);

comment on table public.message_reactions is
  'One reaction per member per message (Brief 14, rulings 1577 and 1590): the emoji character, with its skin tone modifier where the member has one, whose base message_reaction_emoji holds. Written only by private.message_react and private.message_unreact. Personas (1116): a member reads the rows of messages they can see; service role writes; anon deliberately absent.';

create or replace function private.message_react(p_message uuid, p_reaction text)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_row public.messages;
  v_reaction text := coalesce(p_reaction, '');
  v_modifier text := substring(v_reaction from '[\U0001F3FB-\U0001F3FF]$');
  v_base text;
  v_takes_tone boolean;
begin
  select * into v_row from public.messages m where m.id = p_message;
  if v_row.id is null or not private.message_visible(v_row.thread_id, v_row.seq, v_row.author_id, v_uid) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if v_row.deleted_at is not null then
    raise exception 'deleted' using errcode = 'P0001';
  end if;
  -- At most one modifier, U+1F3FB to U+1F3FF, and only at the end; what is left is the base.
  v_base := case when v_modifier is null then v_reaction
                 else left(v_reaction, char_length(v_reaction) - 1) end;
  if v_base = '' or v_base ~ '[\U0001F3FB-\U0001F3FF]' then
    raise exception 'bad_reaction' using errcode = '22023';
  end if;
  -- The dataset writes some bases with a variation selector the toned form drops (U+1F44D U+FE0F
  -- against U+1F44D U+1F3FD), so the base is looked up as sent and then with the selector.
  select e.takes_tone into v_takes_tone from public.message_reaction_emoji e where e.emoji = v_base;
  if v_takes_tone is null and v_modifier is not null then
    select e.takes_tone into v_takes_tone from public.message_reaction_emoji e
    where e.emoji = v_base || chr(65039);
  end if;
  if v_takes_tone is null or (v_modifier is not null and not v_takes_tone) then
    raise exception 'bad_reaction' using errcode = '22023';
  end if;
  insert into public.message_reactions (message_id, member_id, reaction)
  values (p_message, v_uid, v_reaction)
  on conflict (message_id, member_id) do update
    set reaction = excluded.reaction, created_at = now();
end;
$$;

revoke all on function private.message_react(uuid, text) from public;
