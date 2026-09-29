-- Esquema inicial: tipos, tablas, índices y triggers updated_at (CLAUDE.md §8.1, §8.2)

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.staff_role as enum ('super_admin', 'owner', 'cashier');
create type public.business_status as enum ('trial', 'active', 'suspended');
create type public.card_status as enum ('active', 'blocked');
create type public.stamp_event_type as enum ('stamp', 'manual_adjust', 'redeem', 'undo');

-- ---------------------------------------------------------------------------
-- Trigger genérico updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  logo_url text,
  primary_color text not null default '#111827' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  text_color text not null default '#FFFFFF' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  default_country text not null default 'CL' check (default_country ~ '^[A-Z]{2}$'),
  timezone text not null default 'America/Santiago',
  contact_whatsapp text,
  status public.business_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  card_title text not null check (char_length(card_title) between 1 and 80),
  stamps_required int not null check (stamps_required between 2 and 30),
  reward_description text not null check (char_length(reward_description) between 1 and 200),
  stamp_cooldown_minutes int not null default 60 check (stamp_cooldown_minutes >= 0),
  undo_window_minutes int not null default 5 check (undo_window_minutes between 0 and 1440),
  is_active boolean not null default true,
  google_class_id text,
  design_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index programs_one_active_per_business
  on public.programs (business_id) where is_active;

create trigger programs_updated_at before update on public.programs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles (staff, 1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.staff_role not null,
  business_id uuid references public.businesses (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_business_required check (
    (role = 'super_admin' and business_id is null)
    or (role <> 'super_admin' and business_id is not null)
  )
);

create index profiles_business_idx on public.profiles (business_id);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null,
  phone_e164 text not null,
  email text,
  pin_hash text not null,
  pin_must_change boolean not null default false,
  pin_temp_expires_at timestamptz,
  pin_failed_attempts int not null default 0,
  pin_locked_until timestamptz,
  pin_lockout_count int not null default 0,
  marketing_consent boolean not null default false,
  privacy_accepted_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_business_phone_unique unique (business_id, phone_e164)
);

create index customers_full_name_trgm on public.customers
  using gin (full_name extensions.gin_trgm_ops);

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  public_code text not null unique check (char_length(public_code) >= 12),
  access_token text not null unique check (char_length(access_token) >= 32),
  stamps_count int not null default 0 check (stamps_count >= 0),
  total_stamps int not null default 0,
  total_redemptions int not null default 0,
  last_stamp_at timestamptz,
  status public.card_status not null default 'active',
  google_object_id text,
  google_saved boolean not null default false,
  apple_serial_number text unique,
  apple_auth_token text check (apple_auth_token is null or char_length(apple_auth_token) >= 16),
  wallet_sync_error text,
  wallet_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cards_customer_program_unique unique (customer_id, program_id)
);

create index cards_business_idx on public.cards (business_id);
create index cards_program_idx on public.cards (program_id);

create trigger cards_updated_at before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- stamp_events (historial inmutable)
-- ---------------------------------------------------------------------------
create table public.stamp_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  type public.stamp_event_type not null,
  delta int not null,
  stamps_after int not null,
  performed_by uuid references public.profiles (id) on delete set null,
  note text,
  undone_at timestamptz,
  undone_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stamp_events_manual_note check (type <> 'manual_adjust' or (note is not null and char_length(trim(note)) > 0))
);

create index stamp_events_card_created_idx on public.stamp_events (card_id, created_at desc);
create index stamp_events_business_created_idx on public.stamp_events (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_business_created_idx on public.audit_logs (business_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- rate_limits (solo service role)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

-- ---------------------------------------------------------------------------
-- apple_device_registrations (futuro, solo service role)
-- ---------------------------------------------------------------------------
create table public.apple_device_registrations (
  id uuid primary key default gen_random_uuid(),
  device_library_identifier text not null,
  push_token text not null,
  pass_type_identifier text not null,
  serial_number text not null,
  created_at timestamptz not null default now(),
  constraint apple_device_registrations_unique
    unique (device_library_identifier, pass_type_identifier, serial_number)
);

create index apple_device_registrations_serial_idx
  on public.apple_device_registrations (pass_type_identifier, serial_number);
