-- Fondo de la tarjeta: color sólido (primary_color) o imagen personalizada.
alter table public.businesses add column card_background_url text;

grant update (card_background_url) on public.businesses to authenticated;

-- Los fondos pueden pesar más que un logo.
update storage.buckets set file_size_limit = 5242880 where id = 'logos';
