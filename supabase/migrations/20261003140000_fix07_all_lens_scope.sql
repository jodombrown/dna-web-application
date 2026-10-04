-- Fix PR 07 (handoff 44 item 4, W65), ruling 1451 (D1553): Discovery's All lens reads
-- "Every event open to you." on its scope line. The row's text was seeded by 20260922150000 as
-- "Everything happening, as lanes."; that seed is left as it was applied (466), and this file
-- changes the one row's scope and nothing else.
--
-- Guarded: the update reaches only the `all` row, and only when its scope is not already the
-- ruled line, so the file is a no-op where it has run. If no `all` row exists the block raises
-- rather than recording a change that did not happen.
--
-- Committed before it is applied (225); applied by Chat through execute_sql (963).

do $$
begin
  if not exists (select 1 from public.convene_lenses where lens = 'all') then
    raise exception 'convene_lenses has no all row; 1451 has nothing to set';
  end if;

  update public.convene_lenses
     set scope = 'Every event open to you.'
   where lens = 'all'
     and scope is distinct from 'Every event open to you.';
end
$$;
