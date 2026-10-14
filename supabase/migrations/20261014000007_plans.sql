-- Planes por negocio (Standard / Medium / Pro), campañas por Wallet y aviso
-- automático «Te extrañamos». Los límites se aplican en el servidor
-- (src/lib/plans.ts); aquí solo se guardan los datos.

create type public.business_plan as enum ('standard', 'medium', 'pro');

alter table public.businesses
  add column plan public.business_plan not null default 'standard';
-- El owner no puede cambiar su plan: la columna no se concede a authenticated.

-- «Te extrañamos» (Pro): días sin venir para enviar el aviso, y su texto.
alter table public.programs
  add column winback_days int check (winback_days is null or winback_days between 7 and 365),
  add column winback_message text check (winback_message is null or char_length(winback_message) between 1 and 200);

grant update (winback_days, winback_message) on public.programs to authenticated;

-- Último aviso «Te extrañamos» enviado a la tarjeta (para no repetirlo).
alter table public.cards add column winback_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Campañas por Wallet
-- ---------------------------------------------------------------------------
create table public.wallet_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  message text not null check (char_length(message) between 1 and 300),
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  recipients int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index wallet_campaigns_business_created_idx on public.wallet_campaigns (business_id, created_at desc);

alter table public.wallet_campaigns enable row level security;

grant select on public.wallet_campaigns to authenticated;

create policy wallet_campaigns_select on public.wallet_campaigns for select to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  );
-- Escrituras solo desde el servidor (service role) tras validar plan y rol.
