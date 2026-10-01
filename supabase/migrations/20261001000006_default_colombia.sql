-- País de operación: Colombia. Nuevos negocios quedan con teléfonos de Colombia
-- (10 dígitos, se guardan como +57XXXXXXXXXX) y hora de Bogotá.
alter table public.businesses alter column default_country set default 'CO';
alter table public.businesses alter column timezone set default 'America/Bogota';
