-- public.rls_auto_enable() is created by Supabase's "automatic RLS" project setting as an event
-- trigger function. Event triggers run it as the system, never as a caller, so it needs no EXECUTE
-- privilege from API roles; the security advisor flagged it as callable over REST by anon and
-- authenticated. Revoke rather than move it: the platform owns the function and its trigger.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
