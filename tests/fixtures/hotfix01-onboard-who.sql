-- Hotfix 01 (rulings 374 to 376): onboard_who accepts an avatar path only when it is a
-- public.media row owned by the caller with kind = 'avatar'.
--
-- One rolled-back transaction against the real function. The fixture is built here and never
-- relied on from hand-set rows: onboarded_at and who_completed_at are cleared on the caller
-- (Owner Test), one media row is registered for the caller and one for another member
-- (Member Test), each at the shape media-upload stores ({uid}/{mediaId}.{ext}), and the whole
-- transaction rolls back at the end whatever happened. auth.uid() reads request.jwt.claims, so
-- the caller is set the way PostgREST sets it, transaction-local.
--
-- Three directions, each an explicit row so a case that did not run cannot read as one that
-- passed (ruling 228):
--   H1a  a registered avatar path is accepted;
--   H1b  an unregistered path under the caller's folder is refused, at the legacy
--        {uid}/avatar/{id}.jpg shape, so the registry and not a path prefix is the authority;
--   H1c  a registered path owned by another member is refused.
-- A refusal is the 22023 the function already raises. The DO block catches everything, so the
-- batch never errors and the final ROLLBACK always runs.
begin;
create temp table hotfix01_result (ord int, step text, expect text, got text, ok boolean) on commit drop;
do $arm$
declare
  v_caller uuid;
  v_other uuid;
  v_name text;
  v_handle text;
  v_reg text;
  v_unreg text;
  v_theirs text;
  v_out jsonb;
  v_msg text;
  v_code text;
begin
  select id, name, handle into v_caller, v_name, v_handle from public.members where handle = 'owner-test';
  select id into v_other from public.members where handle = 'member-test';
  if v_caller is null or v_other is null then
    insert into hotfix01_result values (0, 'fixture: owner-test and member-test exist', 'both', 'missing', false);
    return;
  end if;

  update public.members set onboarded_at = null, who_completed_at = null where id = v_caller;
  v_reg := v_caller::text || '/' || gen_random_uuid()::text || '.jpg';
  v_unreg := v_caller::text || '/avatar/' || gen_random_uuid()::text || '.jpg';
  v_theirs := v_other::text || '/' || gen_random_uuid()::text || '.jpg';
  insert into public.media (owner_id, bucket, storage_path, kind, mime, width, height, byte_size)
  values
    (v_caller, 'profile-media', v_reg, 'avatar', 'image/jpeg', 640, 640, 125092),
    (v_other, 'profile-media', v_theirs, 'avatar', 'image/jpeg', 640, 640, 125092);
  perform set_config('request.jwt.claims', json_build_object('sub', v_caller, 'role', 'authenticated')::text, true);

  -- H1a: the path media-upload stored and registered for this caller.
  begin
    v_out := public.onboard_who(v_name, v_handle, v_reg);
    insert into hotfix01_result values (1, 'H1a: a registered avatar path is accepted', 'status ok, avatar_path = registered path',
      'status ' || coalesce(v_out->>'status', 'null') || ', avatar_path ' || coalesce(v_out->>'avatar_path', 'null'),
      (v_out->>'status') = 'ok' and (v_out->>'avatar_path') = v_reg);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate;
    insert into hotfix01_result values (1, 'H1a: a registered avatar path is accepted', 'status ok, avatar_path = registered path',
      'raised ' || v_code || ' ' || v_msg, false);
  end;

  -- H1b: under the caller's folder, never registered.
  begin
    v_out := public.onboard_who(v_name, v_handle, v_unreg);
    insert into hotfix01_result values (2, 'H1b: an unregistered path under the caller''s folder is refused', '22023 photo path is not this member''s avatar',
      'accepted, status ' || coalesce(v_out->>'status', 'null'), false);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate;
    insert into hotfix01_result values (2, 'H1b: an unregistered path under the caller''s folder is refused', '22023 photo path is not this member''s avatar',
      'raised ' || v_code || ' ' || v_msg,
      v_code = '22023' and v_msg = 'onboarding: photo path is not this member''s avatar');
  end;

  -- H1c: registered, but to another member.
  begin
    v_out := public.onboard_who(v_name, v_handle, v_theirs);
    insert into hotfix01_result values (3, 'H1c: a registered path owned by another member is refused', '22023 photo path is not this member''s avatar',
      'accepted, status ' || coalesce(v_out->>'status', 'null'), false);
  exception when others then
    get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate;
    insert into hotfix01_result values (3, 'H1c: a registered path owned by another member is refused', '22023 photo path is not this member''s avatar',
      'raised ' || v_code || ' ' || v_msg,
      v_code = '22023' and v_msg = 'onboarding: photo path is not this member''s avatar');
  end;
exception when others then
  get stacked diagnostics v_msg = message_text, v_code = returned_sqlstate;
  insert into hotfix01_result values (0, 'fixture: built without error', 'no error', 'raised ' || v_code || ' ' || v_msg, false);
end;
$arm$;
select ord, step, expect, got, ok from hotfix01_result order by ord;
rollback;
