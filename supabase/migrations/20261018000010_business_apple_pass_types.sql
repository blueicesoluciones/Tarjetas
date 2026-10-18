-- Pass Type ID propio por negocio (Apple Wallet agrupa en una sola pila los pases
-- que comparten identificador). La clave privada se genera en el servidor y se
-- guarda cifrada (AES-256-GCM con APPLE_PASS_KEYS_SECRET); el certificado lo emite
-- Apple a partir de la solicitud (CSR) y lo sube el super admin.
create table public.business_apple_pass_types (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  pass_type_id text not null unique check (pass_type_id ~ '^pass\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$' and char_length(pass_type_id) <= 120),
  key_encrypted text not null,
  csr_pem text not null,
  cert_pem text,
  cert_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_apple_pass_types_updated_at
  before update on public.business_apple_pass_types
  for each row execute function public.set_updated_at();

-- Solo service role: RLS activo, sin políticas ni grants.
alter table public.business_apple_pass_types enable row level security;
revoke all on public.business_apple_pass_types from anon, authenticated;
