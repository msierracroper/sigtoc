
-- Bucket privado para los PDF de pedidos (pedido + RUT)
insert into storage.buckets (id, name, public)
values ('pedido-pdfs', 'pedido-pdfs', false)
on conflict (id) do nothing;

-- Solo usuarios autenticados pueden subir y leer los PDFs
drop policy if exists "pdfs_authenticated_read" on storage.objects;
create policy "pdfs_authenticated_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'pedido-pdfs');

drop policy if exists "pdfs_authenticated_insert" on storage.objects;
create policy "pdfs_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'pedido-pdfs');

drop policy if exists "pdfs_authenticated_update" on storage.objects;
create policy "pdfs_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'pedido-pdfs');
