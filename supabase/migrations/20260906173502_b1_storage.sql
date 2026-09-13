insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

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
create policy post_media_objects_member_delete on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy post_media_objects_admin_select on storage.objects for select to authenticated
using (bucket_id = 'post-media' and public.is_admin());
create policy post_media_objects_service_role on storage.objects for all to service_role
using (bucket_id = 'post-media') with check (bucket_id = 'post-media');