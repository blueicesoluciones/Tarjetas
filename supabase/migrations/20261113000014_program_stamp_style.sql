-- Diseño del sello (planes Medium y Pro): ícono o imagen propia dentro de cada
-- sello puesto. Con 'image' se usa stamp_image_url (PNG ya recortado en círculo).
-- En Pro, el logo de la sede (branches.logo_url) tiene prioridad sobre esto.
alter table public.programs
  add column stamp_icon text not null default 'check'
    check (stamp_icon in ('check', 'star', 'heart', 'image')),
  add column stamp_image_url text;
