-- M4: fotos dos serviços. Bucket público (as fotos aparecem na página), escrita só admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('servicos', 'servicos', true, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists servicos_fotos_admin on storage.objects;
create policy servicos_fotos_admin on storage.objects for all to authenticated
  using (bucket_id = 'servicos' and (select public.is_admin()))
  with check (bucket_id = 'servicos' and (select public.is_admin()));
