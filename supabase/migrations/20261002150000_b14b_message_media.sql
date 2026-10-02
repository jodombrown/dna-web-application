-- Brief 14 Messenger, handoff 41-B (Path 2): Messenger media on Cloudflare R2. public.media widens to
-- hold a Messenger row, and the two server routes in src/routes/api/messages/ reach the database
-- through the functions below and nothing else: one writer for the row, one access question for the
-- delivery route, one locate for the object's key, and the sweep pair for the objects a
-- delete-for-everyone or the former-member purge leaves marked. No presigned URL and no access key
-- exist anywhere (1374); the routes hold the member's own JWT and the R2 binding.
--
-- Rulings: 1340 (post-media and profile-media keep Supabase Storage), 1346 and 1374 (R2 behind a
-- membership-checked route, upload and delivery through the app's routes against the binding), 346
-- and 347 (the client normalises and strips images), 1343 (delete-for-everyone marks the row), 1352
-- (the purge marks the rows), 1353 (rate_limit_check message_media). Committed before it is applied
-- (225); applied by Chat through execute_sql (963, 965), never apply_migration (553, 269).
--
-- Findings against the handoff, named in the closing report and carried here as stated assumptions:
--   - public.media.width and public.media.height are NOT NULL on the live catalog. The audio row the
--     handoff describes carries neither, so both columns drop their not-null here and
--     media_dimensions_check is what holds the rule from now on (audio null, everything else positive).
--   - the live catalog carries a fifth check the handoff did not list, media_byte_size_check
--     (byte_size >= 0); it stands as it is.
--   - messenger_media_access cannot read public.messenger_messages_view: the view is security
--     invoker, and inside a security definer function the invoker is the function's owner, which
--     bypasses row security, so the view would answer true for every member. It reads public.messages
--     through private.message_visible directly, the alternative the handoff names, and withholds a
--     blocked author's media in a group exactly as the view withholds media_id.
--   - the delivery route needs the object's key for a member who does not own the row, and the
--     owner-only select policy cannot give it; messenger_media_locate answers it, the key only where
--     messenger_media_access is true, and a row with allowed false where the media exists and the
--     caller may not have it, so the route tells 403 from 404.
--
-- Personas (1116) on public.media, unchanged by this file: owner reads own (media_member_select);
-- Space lead and event host read as owners of their own uploads and nothing else; admin deliberately
-- absent, because a message's media reaches staff only beside the reported message (1350); service
-- role all; live_arms inserts for the two test accounts. No client role inserts: the Messenger row's
-- one writer is private.message_media_record through public.messenger_media_record, as media-upload is
-- for the Storage buckets.

-- ---------------------------------------------------------------------------------------------------
-- 1. The checks: a third bucket, a fourth kind, four more mimes, and dimensions that may be null for
--    audio. Constraint names read from pg_constraint on the live project (media_bucket_check,
--    media_kind_check, media_mime_check, media_width_check, media_height_check).
-- ---------------------------------------------------------------------------------------------------
alter table public.media drop constraint media_bucket_check;
alter table public.media add constraint media_bucket_check
  check (bucket in ('profile-media', 'post-media', 'r2:message-media'));
alter table public.media drop constraint media_kind_check;
alter table public.media add constraint media_kind_check
  check (kind in ('avatar', 'cover', 'post', 'message'));
alter table public.media drop constraint media_mime_check;
alter table public.media add constraint media_mime_check
  check (mime in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp4'));
alter table public.media drop constraint media_width_check;
alter table public.media drop constraint media_height_check;
alter table public.media alter column width drop not null;
alter table public.media alter column height drop not null;
alter table public.media add constraint media_dimensions_check
  check ((mime like 'audio/%' and width is null and height is null)
      or (mime not like 'audio/%' and width > 0 and height > 0));

comment on column public.media.width is
  'Pixels. Null only for audio (handoff 41-B, media_dimensions_check); positive for every image and video.';
comment on column public.media.height is
  'Pixels. Null only for audio (handoff 41-B, media_dimensions_check); positive for every image and video.';

-- ---------------------------------------------------------------------------------------------------
-- 2. The writer: the one insert path for a Messenger media row (1374, Brief 14 Guardrail 1). Called
--    by the upload route after the object is in R2, with the member's own JWT; the route deletes the
--    object when this refuses. Refusals are the 41-A words with the 41-A codes.
-- ---------------------------------------------------------------------------------------------------
create function private.message_media_record(
  p_thread uuid,
  p_storage_path text,
  p_mime text,
  p_byte_size integer,
  p_width integer,
  p_height integer
)
returns public.media
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_me public.thread_members := private.thread_require_active(p_thread, v_uid);
  v_audio boolean;
  v_row public.media;
begin
  if p_storage_path is null
    or char_length(p_storage_path) > 240
    or char_length(p_storage_path) <= char_length(p_thread::text) + 1
    or left(p_storage_path, char_length(p_thread::text) + 1) <> p_thread::text || '/'
  then
    raise exception 'bad_media' using errcode = '22023';
  end if;
  if p_mime is null or p_mime not in (
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mp4'
  ) then
    raise exception 'bad_media' using errcode = '22023';
  end if;
  v_audio := p_mime like 'audio/%';
  if p_byte_size is null or p_byte_size < 1 then
    raise exception 'bad_media' using errcode = '22023';
  end if;
  -- 104857600 bytes for every mime; audio's ten-minute bound is the route's, read from the
  -- container's duration, because a byte count does not know a duration.
  if p_byte_size > 104857600 then
    raise exception 'too_large' using errcode = '22023';
  end if;
  if v_audio then
    if p_width is not null or p_height is not null then
      raise exception 'bad_media' using errcode = '22023';
    end if;
  elsif p_width is null or p_height is null or p_width < 1 or p_height < 1 then
    raise exception 'bad_media' using errcode = '22023';
  end if;
  if not public.rate_limit_check('message_media') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.media (owner_id, bucket, storage_path, kind, mime, width, height, byte_size, optimized)
  values (v_uid, 'r2:message-media', p_storage_path, 'message', p_mime, p_width, p_height, p_byte_size, p_mime like 'image/%')
  returning * into v_row;
  return v_row;
end;
$$;
revoke execute on function private.message_media_record(uuid, text, text, integer, integer, integer) from public, anon, authenticated;
comment on function private.message_media_record(uuid, text, text, integer, integer, integer) is
  'The one writer of a Messenger media row (handoff 41-B; rulings 1346, 1374, 1353): the caller must be active in the thread, the key must sit under the thread''s own prefix and within 240 characters, the mime must be one of the seven, the size within 104857600 bytes, dimensions null for audio and positive otherwise, and rate_limit_check(message_media) must allow it. Writes bucket r2:message-media, kind message, optimized for images (the client normalised them, 346 and 347). Reached through public.messenger_media_record; no client role holds execute here.';

create function public.messenger_media_record(
  p_thread uuid,
  p_storage_path text,
  p_mime text,
  p_byte_size integer,
  p_width integer default null,
  p_height integer default null
)
returns public.media
language sql
volatile
security definer
set search_path to ''
as $$ select private.message_media_record(p_thread, p_storage_path, p_mime, p_byte_size, p_width, p_height); $$;
revoke execute on function public.messenger_media_record(uuid, text, text, integer, integer, integer) from public, anon;
grant execute on function public.messenger_media_record(uuid, text, text, integer, integer, integer) to authenticated, service_role;
comment on function public.messenger_media_record(uuid, text, text, integer, integer, integer) is
  'The upload route''s record call (handoff 41-B): private.message_media_record for the caller. Granted to authenticated and service_role only.';

-- ---------------------------------------------------------------------------------------------------
-- 3. The access question the delivery route asks, one boolean (1346): the caller owns an unmarked
--    row, or a message the caller may read carries it. Read against public.messages through
--    private.message_visible, never through the security-invoker view (see the header), and a blocked
--    author's media in a group is withheld as the view withholds its media_id.
-- ---------------------------------------------------------------------------------------------------
create function public.messenger_media_access(p_media uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select (select auth.uid()) is not null
    and p_media is not null
    and (
      exists (
        select 1 from public.media md
        where md.id = p_media
          and md.bucket = 'r2:message-media'
          and md.owner_id = (select auth.uid())
          and md.delete_requested_at is null
      )
      or exists (
        select 1
        from public.messages m
        join public.threads t on t.id = m.thread_id
        where m.media_id = p_media
          and m.deleted_at is null
          and private.message_visible(m.thread_id, m.seq, m.author_id, (select auth.uid()))
          and not (t.kind <> 'one_to_one' and private.viewer_blocks(m.author_id))
      )
    );
$$;
revoke execute on function public.messenger_media_access(uuid) from public, anon;
grant execute on function public.messenger_media_access(uuid) to authenticated, service_role;
comment on function public.messenger_media_access(uuid) is
  'Whether the caller may be served this Messenger media object (handoff 41-B; rulings 1346, 1349): true when the caller owns the row and it is not marked for removal, or when a message the caller may read (private.message_visible) carries it and the author is not one the caller blocks in a group. False signed out, false for a third member, false once the message is deleted. Granted to authenticated and service_role only.';

-- The key for the delivery route: one row where the media exists, the key and mime only where
-- messenger_media_access is true, so the route answers 403 to a member who may not have it and 404
-- where there is no row at all.
create function public.messenger_media_locate(p_media uuid)
returns table (allowed boolean, storage_path text, mime text, byte_size integer)
language sql
stable
security definer
set search_path to ''
as $$
  select
    public.messenger_media_access(md.id) as allowed,
    case when public.messenger_media_access(md.id) then md.storage_path end as storage_path,
    case when public.messenger_media_access(md.id) then md.mime end as mime,
    case when public.messenger_media_access(md.id) then md.byte_size end as byte_size
  from public.media md
  where md.id = p_media
    and md.bucket = 'r2:message-media'
    and (select auth.uid()) is not null;
$$;
revoke execute on function public.messenger_media_locate(uuid) from public, anon;
grant execute on function public.messenger_media_locate(uuid) to authenticated, service_role;
comment on function public.messenger_media_locate(uuid) is
  'The delivery route''s locate (handoff 41-B): for a signed-in caller, one row per existing Messenger media id with allowed from messenger_media_access and the key, mime and size only where allowed; no row where no such media exists. Granted to authenticated and service_role only.';

-- ---------------------------------------------------------------------------------------------------
-- 4. The sweep (F4): the rows a delete-for-everyone (1343) or the former-member purge (1352) left
--    marked, oldest first, for the delete route to remove the objects of, and the forget that drops
--    the row once its object is gone. Pages has no cron, so the delete route sweeps up to twenty on
--    every call; a Worker cron is an invite-boundary gate. Only marked rows are ever returned or
--    forgotten, so the sweep removes nothing a member could not already have deleted.
-- ---------------------------------------------------------------------------------------------------
create function private.message_media_marked(p_limit integer)
returns table (media_id uuid, storage_path text)
language sql
stable
security definer
set search_path to ''
as $$
  select md.id, md.storage_path
  from public.media md
  where md.bucket = 'r2:message-media' and md.delete_requested_at is not null
  order by md.delete_requested_at asc, md.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;
revoke execute on function private.message_media_marked(integer) from public, anon, authenticated;
comment on function private.message_media_marked(integer) is
  'Messenger media rows marked for removal (handoff 41-B F4; rulings 1343, 1352), oldest first, at most p_limit and never more than 100. Reached through public.messenger_media_marked; no client role holds execute here.';

create function private.message_media_forget(p_media uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
  v_n integer;
begin
  delete from public.media md
  where md.id = p_media
    and md.bucket = 'r2:message-media'
    and md.delete_requested_at is not null;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke execute on function private.message_media_forget(uuid) from public, anon, authenticated;
comment on function private.message_media_forget(uuid) is
  'Drops one marked Messenger media row once its object is gone from R2 (handoff 41-B F4). A row that is not marked, or not a Messenger row, is left alone and the answer is false. Reached through public.messenger_media_forget; no client role holds execute here.';

create function public.messenger_media_marked(p_limit integer default 20)
returns table (media_id uuid, storage_path text)
language plpgsql
stable
security definer
set search_path to ''
as $$
begin
  perform private.require_uid();
  return query select m.media_id, m.storage_path from private.message_media_marked(p_limit) m;
end;
$$;
revoke execute on function public.messenger_media_marked(integer) from public, anon;
grant execute on function public.messenger_media_marked(integer) to authenticated, service_role;
comment on function public.messenger_media_marked(integer) is
  'The delete route''s sweep read (handoff 41-B F4): marked Messenger media rows for a signed-in caller. Granted to authenticated and service_role only.';

create function public.messenger_media_forget(p_media uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
  perform private.require_uid();
  return private.message_media_forget(p_media);
end;
$$;
revoke execute on function public.messenger_media_forget(uuid) from public, anon;
grant execute on function public.messenger_media_forget(uuid) to authenticated, service_role;
comment on function public.messenger_media_forget(uuid) is
  'The delete route''s forget (handoff 41-B F4): drops one marked Messenger media row for a signed-in caller once its object is gone. Granted to authenticated and service_role only.';

-- Catalogue (1299): no new table; public.media's existing row stands.
