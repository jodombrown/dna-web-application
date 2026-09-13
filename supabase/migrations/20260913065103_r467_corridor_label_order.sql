-- Ruling 467: a corridor label reads diaspora city first, continental city second, so the row
-- ruling 243 named renders as "Los Angeles to Accra" and not "Accra to Los Angeles". Three
-- projections build the label from the same two columns: private.connect_card (the card's corridor
-- line), public.connect_cards (the distinct corridor list a lens returns) and
-- public.connect_filter_options (the Corridor axis). Nothing else reads the pair.
--
-- The functions are rewritten by substitution on their current definitions rather than restated,
-- so this migration carries the label change and nothing else, and it fails loudly if a definition
-- has moved on. Ruling 466: the migrations that created them are applied and are not edited.
do $do$
declare
  r record;
  src text;
  out text;
  n int := 0;
begin
  for r in
    select p.oid, n.nspname || '.' || p.proname as fn
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%continental_place || '' to '' || %'
    order by 2
  loop
    src := pg_get_functiondef(r.oid);
    out := replace(src,
      'c.continental_place || '' to '' || c.diaspora_place',
      'c.diaspora_place || '' to '' || c.continental_place');
    if out = src then
      raise exception 'r467: % carries the label but no substitution applied', r.fn;
    end if;
    execute out;
    n := n + 1;
  end loop;

  if n <> 3 then
    raise exception 'r467: expected three projections to carry the corridor label, rewrote %', n;
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname in ('public', 'private') and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%c.continental_place || '' to '' || c.diaspora_place%'
  ) then
    raise exception 'r467: a projection still builds the label continental city first';
  end if;
end
$do$;
