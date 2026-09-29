-- Funciones transaccionales de sellos, canjes, ajustes y deshacer (CLAUDE.md §8.4)
--
-- Errores: se lanzan con errcode 'P0001' y un message estable en MAYÚSCULAS
-- que el servidor traduce a texto en español (src/lib/stamps/errors.ts).
-- El campo detail puede llevar datos adicionales (ej. minutos del cooldown).

-- ---------------------------------------------------------------------------
-- Helpers internos (no expuestos)
-- ---------------------------------------------------------------------------

-- Valida que el llamante sea staff activo con acceso al negocio indicado.
create or replace function public._assert_staff_for_business(p_business_id uuid)
returns public.staff_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.staff_role := public.auth_role();
begin
  if v_role is null then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_role <> 'super_admin' and p_business_id is distinct from public.auth_business_id() then
    raise exception 'CARD_NOT_FOUND';
  end if;
  return v_role;
end;
$$;

-- Estado de la tarjeta devuelto por todas las funciones.
create or replace function public._card_state(p_card_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'card_id', c.id,
    'business_id', c.business_id,
    'public_code', c.public_code,
    'customer_id', cu.id,
    'customer_name', cu.full_name,
    'stamps_count', c.stamps_count,
    'stamps_required', p.stamps_required,
    'reward_description', p.reward_description,
    'reward_available', c.stamps_count >= p.stamps_required,
    'total_stamps', c.total_stamps,
    'total_redemptions', c.total_redemptions,
    'last_stamp_at', c.last_stamp_at,
    'card_status', c.status,
    'business_status', b.status,
    'business_name', b.name,
    'stamp_cooldown_minutes', p.stamp_cooldown_minutes,
    'undo_window_minutes', p.undo_window_minutes
  )
  from public.cards c
  join public.programs p on p.id = c.program_id
  join public.customers cu on cu.id = c.customer_id
  join public.businesses b on b.id = c.business_id
  where c.id = p_card_id;
$$;

create or replace function public._write_audit(
  p_business_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (business_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_business_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
      || case when public.is_super_admin() then jsonb_build_object('impersonating', true) else '{}'::jsonb end
  );
$$;

-- Valida negocio y tarjeta operables.
create or replace function public._assert_card_operable(p_card_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_card_status public.card_status;
  v_business_status public.business_status;
begin
  select c.status, b.status into v_card_status, v_business_status
  from public.cards c join public.businesses b on b.id = c.business_id
  where c.id = p_card_id;

  if v_business_status = 'suspended' then
    raise exception 'BUSINESS_SUSPENDED';
  end if;
  if v_card_status <> 'active' then
    raise exception 'CARD_BLOCKED';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_stamp
-- ---------------------------------------------------------------------------
create or replace function public.add_stamp(p_public_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_program public.programs%rowtype;
  v_minutes_since int;
  v_event_id uuid;
begin
  select * into v_card from public.cards where public_code = p_public_code for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);

  select * into v_program from public.programs where id = v_card.program_id;

  if v_program.stamp_cooldown_minutes > 0 and v_card.last_stamp_at is not null
     and v_card.last_stamp_at > now() - make_interval(mins => v_program.stamp_cooldown_minutes) then
    v_minutes_since := floor(extract(epoch from (now() - v_card.last_stamp_at)) / 60);
    raise exception 'COOLDOWN_ACTIVE' using detail = jsonb_build_object(
      'minutes_since', v_minutes_since,
      'cooldown_minutes', v_program.stamp_cooldown_minutes
    )::text;
  end if;

  update public.cards
     set stamps_count = stamps_count + 1,
         total_stamps = total_stamps + 1,
         last_stamp_at = now()
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by)
  values (v_card.business_id, v_card.id, 'stamp', 1, v_card.stamps_count + 1, auth.uid())
  returning id into v_event_id;

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_reward
-- ---------------------------------------------------------------------------
create or replace function public.redeem_reward(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_required int;
  v_event_id uuid;
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);

  select stamps_required into v_required from public.programs where id = v_card.program_id;

  if v_card.stamps_count < v_required then
    raise exception 'REWARD_NOT_AVAILABLE';
  end if;

  update public.cards
     set stamps_count = stamps_count - v_required,
         total_redemptions = total_redemptions + 1
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by)
  values (v_card.business_id, v_card.id, 'redeem', -v_required, v_card.stamps_count - v_required, auth.uid())
  returning id into v_event_id;

  perform public._write_audit(v_card.business_id, 'card.redeem', 'card', v_card.id,
    jsonb_build_object('event_id', v_event_id, 'stamps_used', v_required));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- manual_adjust (solo owner / super_admin, sin cooldown, nunca baja de 0)
-- ---------------------------------------------------------------------------
create or replace function public.manual_adjust(p_card_id uuid, p_delta int, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_role public.staff_role;
  v_new_count int;
  v_applied int;
  v_event_id uuid;
begin
  if p_note is null or char_length(trim(p_note)) = 0 then
    raise exception 'NOTE_REQUIRED';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 100 then
    raise exception 'INVALID_DELTA';
  end if;

  select * into v_card from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  v_role := public._assert_staff_for_business(v_card.business_id);
  if v_role not in ('owner', 'super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  v_new_count := greatest(0, v_card.stamps_count + p_delta);
  v_applied := v_new_count - v_card.stamps_count;

  if v_applied = 0 then
    raise exception 'INVALID_DELTA';
  end if;

  update public.cards
     set stamps_count = v_new_count,
         total_stamps = total_stamps + greatest(v_applied, 0)
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, note)
  values (v_card.business_id, v_card.id, 'manual_adjust', v_applied, v_new_count, auth.uid(), trim(p_note))
  returning id into v_event_id;

  perform public._write_audit(v_card.business_id, 'card.manual_adjust', 'card', v_card.id,
    jsonb_build_object('event_id', v_event_id, 'delta', v_applied, 'requested_delta', p_delta, 'note', trim(p_note)));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- undo_stamp_event
-- Solo eventos 'stamp', dentro de la ventana del programa, y solo si es el
-- último evento vigente de la tarjeta. Cajero: solo sus propios sellos.
-- ---------------------------------------------------------------------------
create or replace function public.undo_stamp_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.stamp_events%rowtype;
  v_card public.cards%rowtype;
  v_role public.staff_role;
  v_window int;
  v_latest_id uuid;
  v_new_count int;
  v_undo_event_id uuid;
begin
  select * into v_event from public.stamp_events where id = p_event_id;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  select * into v_card from public.cards where id = v_event.card_id for update;

  v_role := public._assert_staff_for_business(v_card.business_id);

  if v_event.type <> 'stamp' then
    raise exception 'UNDO_NOT_ALLOWED';
  end if;
  if v_event.undone_at is not null then
    raise exception 'ALREADY_UNDONE';
  end if;
  if v_role = 'cashier' and v_event.performed_by is distinct from auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select undo_window_minutes into v_window from public.programs where id = v_card.program_id;
  if v_event.created_at < now() - make_interval(mins => v_window) then
    raise exception 'UNDO_WINDOW_EXPIRED';
  end if;

  select id into v_latest_id
  from public.stamp_events
  where card_id = v_card.id and undone_at is null and type <> 'undo'
  order by created_at desc
  limit 1;
  if v_latest_id is distinct from v_event.id then
    raise exception 'UNDO_NOT_LATEST';
  end if;

  v_new_count := greatest(0, v_card.stamps_count - 1);

  update public.stamp_events set undone_at = now(), undone_by = auth.uid() where id = v_event.id;

  update public.cards
     set stamps_count = v_new_count,
         total_stamps = greatest(0, total_stamps - 1),
         last_stamp_at = (
           select max(created_at) from public.stamp_events
           where card_id = v_card.id and type = 'stamp' and undone_at is null
         )
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, note)
  values (v_card.business_id, v_card.id, 'undo', v_new_count - v_card.stamps_count, v_new_count, auth.uid(),
          'Deshace ' || v_event.id::text)
  returning id into v_undo_event_id;

  perform public._write_audit(v_card.business_id, 'card.undo', 'stamp_event', v_event.id,
    jsonb_build_object('card_id', v_card.id, 'undo_event_id', v_undo_event_id));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_undo_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- staff_card_summary: resumen para el cajero (por public_code o card_id)
-- Incluye el último sello deshacible por el llamante, si existe.
-- ---------------------------------------------------------------------------
create or replace function public.staff_card_summary(p_public_code text default null, p_card_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_role public.staff_role;
  v_undoable jsonb;
begin
  if p_public_code is not null then
    select * into v_card from public.cards where public_code = p_public_code;
  else
    select * into v_card from public.cards where id = p_card_id;
  end if;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  v_role := public._assert_staff_for_business(v_card.business_id);

  select jsonb_build_object('event_id', e.id, 'created_at', e.created_at)
    into v_undoable
  from public.stamp_events e
  join public.programs p on p.id = v_card.program_id
  where e.card_id = v_card.id
    and e.type = 'stamp'
    and e.undone_at is null
    and e.created_at >= now() - make_interval(mins => p.undo_window_minutes)
    and (v_role <> 'cashier' or e.performed_by = auth.uid())
    and e.id = (
      select e2.id from public.stamp_events e2
      where e2.card_id = v_card.id and e2.undone_at is null and e2.type <> 'undo'
      order by e2.created_at desc limit 1
    );

  return public._card_state(v_card.id) || jsonb_build_object('undoable_event', v_undoable);
end;
$$;

-- ---------------------------------------------------------------------------
-- staff_search_customers: búsqueda por teléfono o nombre (parcial)
-- p_business_id solo lo usa el super_admin ("ver como"); para el resto se
-- fuerza el negocio del usuario.
-- ---------------------------------------------------------------------------
create or replace function public.staff_search_customers(p_query text, p_business_id uuid default null)
returns table (
  card_id uuid,
  public_code text,
  customer_name text,
  phone_e164 text,
  stamps_count int,
  stamps_required int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.staff_role := public.auth_role();
  v_business uuid;
  v_q text := trim(coalesce(p_query, ''));
  v_digits text := regexp_replace(coalesce(p_query, ''), '\D', '', 'g');
begin
  if v_role is null then
    raise exception 'NOT_AUTHORIZED';
  end if;
  v_business := case when v_role = 'super_admin' then p_business_id else public.auth_business_id() end;
  if v_business is null then
    raise exception 'BUSINESS_REQUIRED';
  end if;
  if char_length(v_q) < 2 then
    return;
  end if;

  return query
    select c.id, c.public_code, cu.full_name, cu.phone_e164, c.stamps_count, p.stamps_required
    from public.customers cu
    join public.cards c on c.customer_id = cu.id
    join public.programs p on p.id = c.program_id and p.is_active
    where cu.business_id = v_business
      and cu.deleted_at is null
      and (
        (char_length(v_digits) >= 3 and regexp_replace(cu.phone_e164, '\D', '', 'g') like '%' || v_digits || '%')
        or cu.full_name ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
      )
    order by cu.full_name
    limit 20;
end;
$$;

-- ---------------------------------------------------------------------------
-- rate_limit_hit: contador atómico por ventana. Devuelve true si se permite.
-- Solo service role.
-- ---------------------------------------------------------------------------
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
                  else r.count + 1
                end,
        window_start = case
                  when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
                  else r.window_start
                end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------------
revoke all on function public._assert_staff_for_business(uuid) from public, anon, authenticated;
revoke all on function public._card_state(uuid) from public, anon, authenticated;
revoke all on function public._write_audit(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public._assert_card_operable(uuid) from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

revoke all on function public.add_stamp(text) from public, anon;
revoke all on function public.redeem_reward(uuid) from public, anon;
revoke all on function public.manual_adjust(uuid, int, text) from public, anon;
revoke all on function public.undo_stamp_event(uuid) from public, anon;
revoke all on function public.staff_card_summary(text, uuid) from public, anon;
revoke all on function public.staff_search_customers(text, uuid) from public, anon;

grant execute on function public.add_stamp(text) to authenticated;
grant execute on function public.redeem_reward(uuid) to authenticated;
grant execute on function public.manual_adjust(uuid, int, text) to authenticated;
grant execute on function public.undo_stamp_event(uuid) to authenticated;
grant execute on function public.staff_card_summary(text, uuid) to authenticated;
grant execute on function public.staff_search_customers(text, uuid) to authenticated;
