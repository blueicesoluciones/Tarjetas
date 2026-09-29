-- Row Level Security, privilegios de columnas y funciones auxiliares (CLAUDE.md §7.5, §8.3)

-- ---------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.auth_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.auth_business_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.business_id from public.profiles p where p.id = auth.uid() and p.is_active;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() = 'super_admin', false);
$$;

revoke all on function public.auth_role() from public, anon;
revoke all on function public.auth_business_id() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_business_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Privilegios base: anon no toca ninguna tabla. authenticated solo lo que se
-- concede explícitamente abajo (además de las políticas RLS).
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

alter table public.businesses enable row level security;
alter table public.programs enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.cards enable row level security;
alter table public.stamp_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.apple_device_registrations enable row level security;

-- ---------------------------------------------------------------------------
-- businesses
-- Las escrituras de super_admin (alta, status) pasan por el servidor con
-- service role después de verificar el rol; el owner solo edita su marca.
-- ---------------------------------------------------------------------------
grant select on public.businesses to authenticated;
grant update (name, logo_url, primary_color, text_color, default_country, timezone, contact_whatsapp)
  on public.businesses to authenticated;

create policy businesses_select on public.businesses for select to authenticated
  using (public.is_super_admin() or id = public.auth_business_id());

create policy businesses_update on public.businesses for update to authenticated
  using (public.is_super_admin() or (public.auth_role() = 'owner' and id = public.auth_business_id()))
  with check (public.is_super_admin() or (public.auth_role() = 'owner' and id = public.auth_business_id()));

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
grant select on public.programs to authenticated;
grant update (card_title, stamps_required, reward_description, stamp_cooldown_minutes, undo_window_minutes, design_version)
  on public.programs to authenticated;

create policy programs_select on public.programs for select to authenticated
  using (public.is_super_admin() or business_id = public.auth_business_id());

create policy programs_update on public.programs for update to authenticated
  using (public.is_super_admin() or (public.auth_role() = 'owner' and business_id = public.auth_business_id()))
  with check (public.is_super_admin() or (public.auth_role() = 'owner' and business_id = public.auth_business_id()));

-- ---------------------------------------------------------------------------
-- profiles
-- role y business_id no son actualizables por authenticated (nadie se
-- auto-promueve). Altas de staff vía servidor (invitación) con service role.
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, is_active) on public.profiles to authenticated;

create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  );

create policy profiles_update_owner on public.profiles for update to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id() and role = 'cashier')
  )
  with check (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id() and role = 'cashier')
  );

-- ---------------------------------------------------------------------------
-- customers
-- pin_hash y los campos de bloqueo nunca se conceden a authenticated.
-- El cajero no lee esta tabla: usa staff_search_customers / staff_card_summary.
-- ---------------------------------------------------------------------------
grant select (
  id, business_id, full_name, phone_e164, email, pin_must_change, pin_locked_until,
  pin_lockout_count, marketing_consent, privacy_accepted_at, deleted_at, created_at, updated_at
) on public.customers to authenticated;
grant update (full_name, email, marketing_consent) on public.customers to authenticated;

create policy customers_select on public.customers for select to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  );

create policy customers_update on public.customers for update to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  )
  with check (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  );

-- ---------------------------------------------------------------------------
-- cards: lectura por negocio; access_token y apple_auth_token no se exponen.
-- Escrituras solo mediante funciones security definer.
-- ---------------------------------------------------------------------------
grant select (
  id, business_id, program_id, customer_id, public_code, stamps_count, total_stamps,
  total_redemptions, last_stamp_at, status, google_object_id, google_saved,
  wallet_sync_error, wallet_synced_at, updated_at, created_at
) on public.cards to authenticated;

create policy cards_select on public.cards for select to authenticated
  using (public.is_super_admin() or business_id = public.auth_business_id());

-- ---------------------------------------------------------------------------
-- stamp_events
-- ---------------------------------------------------------------------------
grant select on public.stamp_events to authenticated;

create policy stamp_events_select on public.stamp_events for select to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
    or (public.auth_role() = 'cashier' and business_id = public.auth_business_id() and performed_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- audit_logs: solo lectura (super_admin todo, owner su negocio)
-- ---------------------------------------------------------------------------
grant select on public.audit_logs to authenticated;

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (
    public.is_super_admin()
    or (public.auth_role() = 'owner' and business_id = public.auth_business_id())
  );

-- rate_limits y apple_device_registrations: RLS activo, sin políticas ni grants
-- → solo service role.
