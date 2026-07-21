-- Bucket público para imagens de produtos, gerenciado somente via service role
-- (uploads acontecem por server function autenticada por senha de admin)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Leitura pública das imagens (bucket já é público, mas garantimos a policy)
create policy "Public read product images"
on storage.objects for select
using (bucket_id = 'product-images');
