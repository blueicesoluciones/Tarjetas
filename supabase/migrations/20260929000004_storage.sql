-- Bucket público de logos. Lectura pública (Google Wallet descarga las imágenes);
-- las subidas se hacen desde el servidor con service role tras validar el rol.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
