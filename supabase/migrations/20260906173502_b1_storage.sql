-- B1 Composer: Storage bucket post-media. Private; images only; paths {member_id}/{post_id}/{file}.
-- Uploads go through the media-upload Edge Function (service role) after a Tinify pass, so
-- authenticated members never insert objects directly. Reads follow posts RLS via the post id in the path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- member: own folder, or any image whose post they can see.
create policy post_media_objects_member_select on storage.objects for select to authenticated
using (
  bucket_id = 'post-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[2]
    )
  )
);
-- member: may remove an image from their own folder (composer thumbnail remove before publish).
create policy post_media_objects_member_delete on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Space lead and event host: read through the post visibility branch above; no direct writes.
-- admin: read all.
create policy post_media_objects_admin_select on storage.objects for select to authenticated
using (bucket_id = 'post-media' and private.is_admin());
-- service role: the upload path.
create policy post_media_objects_service_role on storage.objects for all to service_role
using (bucket_id = 'post-media') with check (bucket_id = 'post-media');
