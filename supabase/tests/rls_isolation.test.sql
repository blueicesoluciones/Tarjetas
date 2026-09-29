-- Tests de aislamiento multi-tenant y funciones de sellos.
-- Ejecutar con: npx supabase test db  (requiere `supabase start` y el seed cargado)
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- Helper: actuar como un usuario autenticado
create or replace function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

-- ---------------------------------------------------------------------------
-- Owner de Café Luna (negocio A)
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');

select is((select count(*)::int from public.businesses), 1, 'owner A ve solo su negocio');
select is((select count(*)::int from public.businesses where slug = 'barberia-sol'), 0, 'owner A no ve el negocio B');
select is((select count(*)::int from public.programs where business_id = '22222222-2222-2222-2222-222222222222'), 0, 'owner A no ve programas de B');
select is((select count(*)::int from public.customers where business_id = '22222222-2222-2222-2222-222222222222'), 0, 'owner A no ve clientes de B');
select is((select count(*)::int from public.customers), 2, 'owner A ve sus 2 clientes');
select is((select count(*)::int from public.cards where business_id = '22222222-2222-2222-2222-222222222222'), 0, 'owner A no ve tarjetas de B');
select is((select count(*)::int from public.profiles where business_id = '22222222-2222-2222-2222-222222222222'), 0, 'owner A no ve staff de B');
select is((select count(*)::int from public.audit_logs where business_id = '22222222-2222-2222-2222-222222222222'), 0, 'owner A no ve auditoría de B');

select throws_ok(
  $$ select pin_hash from public.customers limit 1 $$,
  '42501', null, 'pin_hash no es legible por authenticated'
);
select throws_ok(
  $$ select access_token from public.cards limit 1 $$,
  '42501', null, 'access_token no es legible por authenticated'
);
select throws_ok(
  $$ update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-00000000a001' $$,
  '42501', null, 'nadie puede cambiar su rol'
);
select throws_ok(
  $$ update public.businesses set status = 'active' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'owner no puede cambiar status del negocio'
);
select throws_ok(
  $$ update public.cards set stamps_count = 99 $$,
  '42501', null, 'no se escribe cards directamente'
);

-- Update del negocio B no afecta filas
update public.businesses set name = 'hackeado' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is((select name from public.businesses where id = '22222222-2222-2222-2222-222222222222'), 'Barbería Sol', 'owner A no puede editar el negocio B');

-- Sellar tarjeta del negocio B falla
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select throws_ok($$ select public.add_stamp('SOLCAMILA0000001') $$, 'P0001', 'CARD_NOT_FOUND', 'owner A no puede sellar tarjeta de B');

-- ---------------------------------------------------------------------------
-- Cajero de Café Luna
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000a002');

select is((select count(*)::int from public.customers), 0, 'cajero no lee la tabla customers directamente');
select is(
  (select count(*)::int from public.staff_search_customers('Camila')),
  1, 'cajero encuentra solo clientes de su negocio'
);
select is(
  (public.add_stamp('LUNACAMILA000001') ->> 'stamps_count')::int, 8, 'cajero suma sello (7 → 8)'
);
select throws_ok($$ select public.add_stamp('LUNACAMILA000001') $$, 'P0001', 'COOLDOWN_ACTIVE', 'cooldown impide doble sello');
select throws_ok(
  $$ select public.manual_adjust('11111111-0000-0000-0000-0000000ca001', 2, 'x') $$,
  'P0001', 'NOT_AUTHORIZED', 'cajero no puede hacer ajuste manual'
);
select is(
  (public.undo_stamp_event((public.staff_card_summary('LUNACAMILA000001') -> 'undoable_event' ->> 'event_id')::uuid) ->> 'stamps_count')::int,
  7, 'cajero deshace su propio sello (8 → 7)'
);
select is(
  (public.redeem_reward('11111111-0000-0000-0000-0000000ca002') ->> 'stamps_count')::int,
  0, 'canje resta stamps_required (10 → 0)'
);
select throws_ok(
  $$ select public.redeem_reward('11111111-0000-0000-0000-0000000ca002') $$,
  'P0001', 'REWARD_NOT_AVAILABLE', 'no se puede canjear sin sellos suficientes'
);

-- ---------------------------------------------------------------------------
-- Owner de Café Luna: ajuste manual no baja de 0
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select lives_ok($$ select public.manual_adjust('11111111-0000-0000-0000-0000000ca002', 3, 'promo') $$, 'owner hace ajuste manual +3');
select is(
  (public.manual_adjust('11111111-0000-0000-0000-0000000ca002', -5, 'corrección') ->> 'stamps_count')::int,
  0, 'ajuste manual no baja de 0'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
select pg_temp.act_as_anon();
select throws_ok($$ select count(*) from public.businesses $$, '42501', null, 'anon no accede a businesses');
select throws_ok($$ select public.add_stamp('LUNACAMILA000001') $$, '42501', null, 'anon no puede ejecutar add_stamp');

select * from finish();
rollback;
