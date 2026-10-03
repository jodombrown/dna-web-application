-- Brief 14 Messenger, handoff 41-D, Part A5 (ruling 1396): Messenger accepts video/quicktime.
-- The founder's .mov screen recording (ftyp brand 'qt  ', H.264) was refused by the route and by
-- media_mime_check, which allowed mp4 and webm video only; every iPhone camera video is a .mov.
-- HEVC inside .mov plays reliably on Apple devices only and nothing converts it in v1 (1374), an
-- invite-boundary gap; 1408's probe decides whether 1374 is amended.
--
-- The constraint is replaced with the same list plus one mime. private.message_media_record is
-- replaced whole with the same body as 20261002150000 plus 'video/quicktime' in its list and
-- nothing else changed. Committed before it is applied (225); applied by Chat through
-- execute_sql (963).

alter table public.media drop constraint media_mime_check;
alter table public.media add constraint media_mime_check check (
  mime = any (array[
    'image/jpeg'::text, 'image/png'::text, 'image/webp'::text,
    'video/mp4'::text, 'video/webm'::text, 'video/quicktime'::text,
    'audio/webm'::text, 'audio/mp4'::text
  ])
);

create or replace function private.message_media_record(
  p_thread uuid,
  p_storage_path text,
  p_mime text,
  p_byte_size integer,
  p_width integer,
  p_height integer
)
returns public.media
language plpgsql
security definer
set search_path to ''
as $function$
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
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/webm', 'audio/mp4'
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
$function$;
