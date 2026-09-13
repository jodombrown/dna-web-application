-- B2 Shell/Feed: the feed read. A view over posts, no new table, no additional columns.
--
-- security_invoker: every row passes through the caller's own posts policies, so the audience
-- predicate (everyone / connections with an accepted connection / anchored membership) is enforced
-- by RLS on posts, never re-derived here or filtered client-side. Strict reverse-chronological,
-- no scoring (ruling 80). Lens filters (Mine, My Network, Saved) are PostgREST filters on this
-- view; For You is identical to All until a real personalization signal exists.

create view public.feed
with (security_invoker = true)
as
  select p.*
  from public.posts p
  where p.status = 'published'
  order by p.published_at desc, p.id desc;

revoke all on public.feed from anon;
grant select on public.feed to authenticated, service_role;
