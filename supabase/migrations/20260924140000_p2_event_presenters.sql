-- Discovery follow-up (handoff 32-B, Addendum 4 item 1): the presenter of a published event, for a list of
-- events, resolved exactly as the event pane resolves it. Rulings 674, 1079 and 1121, narrowing 416 for the
-- presenter line only. Committed before it is applied (ruling 225). Applied to the canonical project by Chat
-- through the Supabase MCP's execute_sql under rulings 963 and 965, with its
-- supabase_migrations.schema_migrations row in the same transaction, and never by apply_migration (rulings
-- 553, 269).
--
-- public.event_page names the presenter from private.event_post_facts(event)->'presented_by' (the latest
-- published post's author: a member's name, handle and avatar, or a Space's title) and falls back to the
-- host through private.member_display. This function returns those same two values for many events at once,
-- keyed by event id, by calling the same two private functions, so the card, the card menu and the Feed's
-- "Presented by" read what the pane reads. It runs as the caller: the row policy on public.events decides
-- which ids answer, as it does for event_page. Anon cannot execute it, so no signed-out surface changes
-- (1121). A post's author line and every other name keep 416's rule; this read serves the presenter line
-- only. A call names at most 200 events.

create function public.event_presenters(p_events uuid[])
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'event_presenters: not signed in' using errcode = '42501';
  end if;
  if p_events is null or cardinality(p_events) = 0 then
    return '{}'::jsonb;
  end if;
  if cardinality(p_events) > 200 then
    raise exception 'At most 200 events at a time.' using errcode = '22023';
  end if;

  return (
    select coalesce(jsonb_object_agg(e.id::text, jsonb_build_object(
      'presented_by', private.event_post_facts(e.id) -> 'presented_by',
      'host', (
        select jsonb_build_object('id', d.id, 'name', d.name, 'handle', d.handle, 'avatar_path', d.avatar_path)
        from private.member_display(array[e.host_member_id]) d
      )
    )), '{}'::jsonb)
    from public.events e
    where e.id = any (p_events)
  );
end;
$$;

revoke execute on function public.event_presenters(uuid[]) from public, anon;
grant execute on function public.event_presenters(uuid[]) to authenticated, service_role;

comment on function public.event_presenters(uuid[]) is
  'The presenter line for many events at once, as the event pane resolves it (674, 1079, 1121): presented_by from private.event_post_facts, host from private.member_display, keyed by event id. Security invoker; events row policy decides which ids answer; authenticated only.';
