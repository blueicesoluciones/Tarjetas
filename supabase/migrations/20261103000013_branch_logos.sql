-- Logo de cada sede (multisede, plan Pro): cada sello de la tarjeta muestra el
-- logo de la sede donde se puso. Se guarda ya recortado en círculo (PNG).
alter table public.branches add column logo_url text;
