-- Convene Discovery rebuild (handoff 32-B), file 2 of 2: the event's alias and its short path. Rulings
-- 1024, 1080, 1081, 1100, 1108 and 1109, read together as D1182, D1183 and D1202 record them.
-- Committed before it is applied (ruling 225). Applied to the canonical project by Chat through the
-- Supabase MCP's execute_sql under rulings 963 and 965, with its supabase_migrations.schema_migrations
-- row in the same transaction, and never by apply_migration (rulings 553, 269).
--
-- What stays. events.slug is 1024's: written once at publish with its six-character suffix, never
-- changed (the events_slug_unchanged trigger is untouched), and /e/{slug} is the canonical page.
--
-- What is added.
--   events.custom_slug  the alias (1080), the shareable link behind a QR code. Derived from the
--                       title when the event is created, suffixed -2, -3 and so on only on
--                       collision (1100), editable by whoever may edit the event.
--   events.short_code   six characters from lowercase letters and digits without 0, 1, i, l and o,
--                       minted when the event is created and never changed (1081, 1109).
--   event_aliases       every alias an event has held. The primary key keeps an alias with its first
--                       event forever, so an old alias always redirects to the event that held it
--                       (1100 replaces 1080's ninety days). One row per event is current.
--   reserved_link_words the words an alias may not take (1108): the app's route segments read from
--                       src/routes on 24 September 2026, plus admin, api, new, edit and settings.
--
-- One write path. The events update policies let a host, a space lead and an admin update the row
-- directly, so the rules live in triggers on events rather than in a function a caller could step
-- around: a BEFORE trigger derives, validates and freezes, an AFTER trigger keeps event_aliases.
-- public.event_alias_check(event, alias) is the Hub's live preview and returns a status word, never
-- member-facing copy; the triggers' messages are a backstop the Hub does not show when it checks
-- first. The alias and slug share /e/, so each is checked against the other in both directions, and
-- private.new_event_slug gains the alias check.
--
-- Resolution. public.resolve_event_link(kind, segment) takes 'e' with an alias or 'x' with a short
-- code and returns the canonical slug only when public.event_public_page(slug) returns a page for the
-- caller, so an alias or code for an event without a public page resolves to nothing, exactly as its
-- slug does today. It is callable signed out, like the page.

-- ---------------------------------------------------------------------------------------------
-- The reserved words (1108)
-- ---------------------------------------------------------------------------------------------

create table public.reserved_link_words (
  word text primary key check (word ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

comment on table public.reserved_link_words is
  'Words an event alias may not take (1080, 1108). Seeded from src/routes and five system words; added by row, never by code.';

alter table public.reserved_link_words enable row level security;

revoke all on table public.reserved_link_words from anon, authenticated;
grant all on table public.reserved_link_words to service_role;

create policy reserved_link_words_service_role on public.reserved_link_words
  for all to service_role
  using (true) with check (true);

insert into public.reserved_link_words (word) values
  ('collaborate'), ('connect'), ('contribute'), ('convene'), ('convey'), ('e'), ('events'), ('feed'),
  ('m'), ('new'), ('password'), ('posts'), ('relationship'), ('reset'), ('sign-in'), ('welcome'),
  ('where'), ('x'), ('admin'), ('api'), ('edit'), ('settings');

-- ---------------------------------------------------------------------------------------------
-- The alias history (1080, 1100)
-- ---------------------------------------------------------------------------------------------

create table public.event_aliases (
  alias text primary key check (alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(alias) <= 64),
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  retired_at timestamptz
);

create index event_aliases_event_id_idx on public.event_aliases (event_id);
create unique index event_aliases_one_current on public.event_aliases (event_id) where retired_at is null;

comment on table public.event_aliases is
  'Every alias an event has held (1080, 1100). An alias stays with its first event forever and redirects to it; one row per event is current. Written only by the events triggers.';

alter table public.event_aliases enable row level security;

revoke all on table public.event_aliases from anon, authenticated;
grant all on table public.event_aliases to service_role;

create policy event_aliases_service_role on public.event_aliases
  for all to service_role
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- The two columns
-- ---------------------------------------------------------------------------------------------

alter table public.events
  add column custom_slug text check (custom_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(custom_slug) <= 64),
  add column short_code text check (short_code ~ '^[a-hjkmnp-z2-9]{6}$');

create unique index events_custom_slug_key on public.events (custom_slug);
create unique index events_short_code_key on public.events (short_code);

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- Why an alias cannot be taken by this event: null when it can, else format, reserved or taken.
create function private.event_alias_problem(p_event uuid, p_alias text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_alias is null or p_alias !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_alias) > 64 then 'format'
    when exists (select 1 from public.reserved_link_words w where w.word = p_alias) then 'reserved'
    when exists (select 1 from public.events e where e.slug = p_alias and e.id is distinct from p_event) then 'taken'
    when exists (select 1 from public.events e where e.custom_slug = p_alias and e.id is distinct from p_event) then 'taken'
    when exists (select 1 from public.event_aliases a where a.alias = p_alias and a.event_id is distinct from p_event) then 'taken'
    else null
  end;
$$;

revoke execute on function private.event_alias_problem(uuid, text) from public, anon, authenticated;
grant execute on function private.event_alias_problem(uuid, text) to service_role;

-- The title's words, cut at sixty characters, and the first free form of them: bare, then -2, -3.
create function private.new_event_alias(p_event uuid, p_title text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_words text := coalesce(
    nullif(btrim(left(regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g'), 60), '-'), ''),
    'event'
  );
  v_alias text := v_words;
  v_n integer := 1;
begin
  while private.event_alias_problem(p_event, v_alias) is not null loop
    v_n := v_n + 1;
    v_alias := v_words || '-' || v_n;
  end loop;
  return v_alias;
end;
$$;

revoke execute on function private.new_event_alias(uuid, text) from public, anon, authenticated;
grant execute on function private.new_event_alias(uuid, text) to service_role;

-- Six characters from the thirty-one that are never misread (1109). The code points only at a public
-- page, so it is not a secret and random() is enough.
create function private.new_short_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code text;
begin
  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * 31)::integer, 1), '')
    into v_code
    from generate_series(1, 6);
    exit when not exists (select 1 from public.events e where e.short_code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke execute on function private.new_short_code() from public, anon, authenticated;
grant execute on function private.new_short_code() to service_role;

-- 1024's slug, unchanged except that it now also steps around every alias ever held.
create or replace function private.new_event_slug(p_title text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_words text := coalesce(
    nullif(btrim(left(regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g'), 60), '-'), ''),
    'event'
  );
  v_slug text;
begin
  loop
    v_slug := v_words || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
    exit when not exists (select 1 from public.events e where e.slug = v_slug or e.custom_slug = v_slug)
      and not exists (select 1 from public.event_aliases a where a.alias = v_slug);
  end loop;
  return v_slug;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- The existing events (1109: backfilled), in creation order so the oldest keeps the bare alias
-- ---------------------------------------------------------------------------------------------

do $backfill$
declare
  r record;
  v_alias text;
begin
  for r in select e.id, e.title from public.events e order by e.created_at, e.id loop
    v_alias := private.new_event_alias(r.id, r.title);
    update public.events set custom_slug = v_alias, short_code = private.new_short_code() where id = r.id;
    insert into public.event_aliases (alias, event_id) values (v_alias, r.id);
  end loop;
end;
$backfill$;

alter table public.events alter column custom_slug set not null;
alter table public.events alter column short_code set not null;

-- ---------------------------------------------------------------------------------------------
-- The triggers: one write path for the alias and the code
-- ---------------------------------------------------------------------------------------------

create function private.events_link_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problem text;
begin
  if tg_op = 'INSERT' then
    if new.custom_slug is null then
      new.custom_slug := private.new_event_alias(new.id, new.title);
    end if;
    if new.short_code is null then
      new.short_code := private.new_short_code();
    elsif exists (select 1 from public.events e where e.short_code = new.short_code) then
      raise exception 'That short link is taken.' using errcode = '23505';
    end if;
  else
    if new.short_code is distinct from old.short_code then
      raise exception 'An event''s short link never changes.' using errcode = '22023';
    end if;
    if new.custom_slug is not distinct from old.custom_slug then
      return new;
    end if;
  end if;

  v_problem := private.event_alias_problem(new.id, new.custom_slug);
  if v_problem = 'format' then
    raise exception 'A link uses lowercase letters, digits and single hyphens.' using errcode = '22023';
  elsif v_problem = 'reserved' then
    raise exception 'That link is reserved.' using errcode = '22023';
  elsif v_problem = 'taken' then
    raise exception 'That link is taken.' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger events_link_fields
  before insert or update of custom_slug, short_code on public.events
  for each row execute function private.events_link_fields();

create function private.events_alias_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.custom_slug is not distinct from old.custom_slug then
      return null;
    end if;
    update public.event_aliases set retired_at = now()
    where event_id = new.id and retired_at is null;
  end if;
  insert into public.event_aliases (alias, event_id) values (new.custom_slug, new.id)
  on conflict (alias) do update set retired_at = null
  where public.event_aliases.event_id = excluded.event_id;
  return null;
end;
$$;

create trigger events_alias_history
  after insert or update of custom_slug on public.events
  for each row execute function private.events_alias_history();

revoke execute on function private.events_link_fields() from public, anon, authenticated;
revoke execute on function private.events_alias_history() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- The Hub's live preview (1100)
-- ---------------------------------------------------------------------------------------------

create function public.event_alias_check(p_event uuid, p_alias text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_alias text := lower(btrim(coalesce(p_alias, '')));
  v_current text;
begin
  if v_uid is null then
    raise exception 'event_alias_check: not signed in' using errcode = '42501';
  end if;
  select e.custom_slug into v_current
  from public.events e
  where e.id = p_event
    and (
      e.host_member_id = v_uid
      or (e.space_id is not null and private.is_space_lead(e.space_id))
      or private.is_admin()
    );
  if not found then
    raise exception 'That is not an event you can edit.' using errcode = '42501';
  end if;
  if v_alias = v_current then
    return 'current';
  end if;
  return coalesce(private.event_alias_problem(p_event, v_alias), 'available');
end;
$$;

revoke execute on function public.event_alias_check(uuid, text) from public, anon;
grant execute on function public.event_alias_check(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Resolution for /e/{alias} and /x/{code} (1080, 1081, 1100)
-- ---------------------------------------------------------------------------------------------

create function public.resolve_event_link(p_kind text, p_segment text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_segment text := lower(btrim(coalesce(p_segment, '')));
  v_slug text;
begin
  if p_kind = 'e' then
    select e.slug into v_slug
    from public.event_aliases a
    join public.events e on e.id = a.event_id
    where a.alias = v_segment;
  elsif p_kind = 'x' then
    select e.slug into v_slug from public.events e where e.short_code = v_segment;
  else
    raise exception 'That is not a link kind.' using errcode = '22023';
  end if;
  if v_slug is null or public.event_public_page(v_slug) is null then
    return null;
  end if;
  return v_slug;
end;
$$;

revoke execute on function public.resolve_event_link(text, text) from public;
grant execute on function public.resolve_event_link(text, text) to anon, authenticated, service_role;
