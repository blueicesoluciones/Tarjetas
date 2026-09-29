-- Datos de prueba para desarrollo local (supabase db reset).
-- Contraseña de todos los usuarios staff: Password123!
-- PIN de todos los clientes: 2580

-- ---------------------------------------------------------------------------
-- Usuarios de Auth
-- ---------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@tarjetas.test'),
      ('00000000-0000-0000-0000-00000000a001'::uuid, 'owner@cafeluna.test'),
      ('00000000-0000-0000-0000-00000000a002'::uuid, 'cajero@cafeluna.test'),
      ('00000000-0000-0000-0000-00000000b001'::uuid, 'owner@barberiasol.test'),
      ('00000000-0000-0000-0000-00000000b002'::uuid, 'cajero@barberiasol.test')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Negocios y programas
-- ---------------------------------------------------------------------------
insert into public.businesses (id, name, slug, primary_color, text_color, status, contact_whatsapp) values
  ('11111111-1111-1111-1111-111111111111', 'Café Luna', 'cafe-luna', '#3B2F2F', '#FFF8E7', 'active', '+56911111111'),
  ('22222222-2222-2222-2222-222222222222', 'Barbería Sol', 'barberia-sol', '#0F4C81', '#FFFFFF', 'trial', null);

insert into public.programs (id, business_id, card_title, stamps_required, reward_description, stamp_cooldown_minutes) values
  ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tarjeta Café Luna', 10, 'Un café gratis', 60),
  ('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Club Barbería Sol', 6, 'Un corte gratis', 0);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, role, business_id) values
  ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'super_admin', null),
  ('00000000-0000-0000-0000-00000000a001', 'Laura (dueña Café Luna)', 'owner', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-00000000a002', 'Pedro (cajero Café Luna)', 'cashier', '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0000-00000000b001', 'Martín (dueño Barbería Sol)', 'owner', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-00000000b002', 'Ana (cajera Barbería Sol)', 'cashier', '22222222-2222-2222-2222-222222222222');

-- ---------------------------------------------------------------------------
-- Clientes y tarjetas
-- ---------------------------------------------------------------------------
insert into public.customers (id, business_id, full_name, phone_e164, email, pin_hash, privacy_accepted_at) values
  ('11111111-0000-0000-0000-00000000c001', '11111111-1111-1111-1111-111111111111', 'Camila Rojas', '+56912345601', 'camila@example.com', extensions.crypt('2580', extensions.gen_salt('bf', 10)), now()),
  ('11111111-0000-0000-0000-00000000c002', '11111111-1111-1111-1111-111111111111', 'Diego Muñoz', '+56912345602', null, extensions.crypt('2580', extensions.gen_salt('bf', 10)), now()),
  ('22222222-0000-0000-0000-00000000c001', '22222222-2222-2222-2222-222222222222', 'Camila Rojas', '+56912345601', null, extensions.crypt('2580', extensions.gen_salt('bf', 10)), now());

insert into public.cards (id, business_id, program_id, customer_id, public_code, access_token, stamps_count, total_stamps) values
  ('11111111-0000-0000-0000-0000000ca001', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-00000000c001', 'LUNACAMILA000001', 'demo-token-cafe-luna-camila-000000000001', 7, 7),
  ('11111111-0000-0000-0000-0000000ca002', '11111111-1111-1111-1111-111111111111', '11111111-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-00000000c002', 'LUNADIEGO0000002', 'demo-token-cafe-luna-diego-0000000000002', 10, 10),
  ('22222222-0000-0000-0000-0000000ca001', '22222222-2222-2222-2222-222222222222', '22222222-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-00000000c001', 'SOLCAMILA0000001', 'demo-token-barberia-sol-camila-000000001', 2, 2);
