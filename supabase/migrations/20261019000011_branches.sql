-- Multisede (plan Pro): sedes de un negocio, cajeros asignados a una sede y la
-- sede en cada movimiento. La tarjeta del cliente es una sola para todas las sedes.

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  address text check (address is null or char_length(address) <= 120),
  -- Desactivar en vez de borrar: el historial conserva la sede.
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_name_unique unique (business_id, name)
);

create index branches_business_idx on public.branches (business_id);

create trigger branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();

alter table public.branches enable row level security;
grant select on public.branches to authenticated;
create policy branches_select on public.branches for select to authenticated
  using (public.is_super_admin() or business_id = public.auth_business_id());
-- Altas y cambios: solo el super admin desde el servidor (service role).

-- Sede del cajero (dueños y super admin no tienen sede fija).
alter table public.profiles add column branch_id uuid references public.branches (id) on delete set null;
alter table public.profiles add constraint profiles_branch_cashier_only check (branch_id is null or role = 'cashier');
create index profiles_branch_idx on public.profiles (branch_id) where branch_id is not null;

-- Sede donde ocurrió cada movimiento.
alter table public.stamp_events add column branch_id uuid references public.branches (id) on delete set null;
create index stamp_events_branch_idx on public.stamp_events (branch_id, created_at desc) where branch_id is not null;

-- ---------------------------------------------------------------------------
-- Sede del movimiento: la del cajero (no la puede elegir); el dueño o el super
-- admin la indican desde el escáner (opcional).
-- ---------------------------------------------------------------------------
create or replace function public._resolve_branch(p_business_id uuid, p_branch_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_branch uuid;
begin
  if public.auth_role() = 'cashier' then
    select branch_id into v_branch from public.profiles where id = auth.uid();
    return v_branch;
  end if;
  if p_branch_id is null then
    return null;
  end if;
  if not exists (
    select 1 from public.branches where id = p_branch_id and business_id = p_business_id and is_active
  ) then
    raise exception 'BRANCH_NOT_FOUND';
  end if;
  return p_branch_id;
end;
$$;

revoke all on function public._resolve_branch(uuid, uuid) from public, anon, authenticated;

-- Las firmas cambian (parámetro nuevo con default): se reemplazan las anteriores.
drop function public.add_stamp(text);
drop function public.redeem_reward(uuid);
drop function public.redeem_milestone(uuid, int);

-- ---------------------------------------------------------------------------
-- add_stamp
-- ---------------------------------------------------------------------------
create function public.add_stamp(p_public_code text, p_branch_id uuid default null)
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
  v_branch uuid;
begin
  select * into v_card from public.cards where public_code = p_public_code for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);
  v_branch := public._resolve_branch(v_card.business_id, p_branch_id);

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

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, branch_id)
  values (v_card.business_id, v_card.id, 'stamp', 1, v_card.stamps_count + 1, auth.uid(), v_branch)
  returning id into v_event_id;

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_reward: el premio final reinicia también las intermedias.
-- ---------------------------------------------------------------------------
create function public.redeem_reward(p_card_id uuid, p_branch_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_required int;
  v_event_id uuid;
  v_branch uuid;
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);
  v_branch := public._resolve_branch(v_card.business_id, p_branch_id);

  select stamps_required into v_required from public.programs where id = v_card.program_id;

  if v_card.stamps_count < v_required then
    raise exception 'REWARD_NOT_AVAILABLE';
  end if;

  update public.cards
     set stamps_count = stamps_count - v_required,
         total_redemptions = total_redemptions + 1,
         claimed_milestones = '{}'
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, branch_id)
  values (v_card.business_id, v_card.id, 'redeem', -v_required, v_card.stamps_count - v_required, auth.uid(), v_branch)
  returning id into v_event_id;

  perform public._write_audit(v_card.business_id, 'card.redeem', 'card', v_card.id,
    jsonb_build_object('event_id', v_event_id, 'stamps_used', v_required));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_milestone: cobra una recompensa intermedia sin restar sellos.
-- ---------------------------------------------------------------------------
create function public.redeem_milestone(p_card_id uuid, p_stamps_at int, p_branch_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_plan public.business_plan;
  v_required int;
  v_description text;
  v_event_id uuid;
  v_branch uuid;
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);
  v_branch := public._resolve_branch(v_card.business_id, p_branch_id);

  select plan into v_plan from public.businesses where id = v_card.business_id;
  select stamps_required into v_required from public.programs where id = v_card.program_id;
  select description into v_description
  from public.program_rewards
  where program_id = v_card.program_id and stamps_at = p_stamps_at;

  if v_plan = 'standard' or v_description is null or p_stamps_at >= v_required then
    raise exception 'MILESTONE_NOT_FOUND';
  end if;
  if p_stamps_at = any (v_card.claimed_milestones) then
    raise exception 'MILESTONE_ALREADY_CLAIMED';
  end if;
  if v_card.stamps_count < p_stamps_at then
    raise exception 'REWARD_NOT_AVAILABLE';
  end if;

  update public.cards
     set claimed_milestones = array_append(claimed_milestones, p_stamps_at)
   where id = v_card.id;

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, note, branch_id)
  values (v_card.business_id, v_card.id, 'redeem', 0, v_card.stamps_count, auth.uid(),
          'Premio de ' || p_stamps_at || ' sellos: ' || v_description, v_branch)
  returning id into v_event_id;

  perform public._write_audit(v_card.business_id, 'card.redeem_milestone', 'card', v_card.id,
    jsonb_build_object('event_id', v_event_id, 'stamps_at', p_stamps_at));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- undo_stamp_event: el movimiento «deshacer» queda en la misma sede del sello.
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

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, note, branch_id)
  values (v_card.business_id, v_card.id, 'undo', v_new_count - v_card.stamps_count, v_new_count, auth.uid(),
          'Deshace ' || v_event.id::text, v_event.branch_id)
  returning id into v_undo_event_id;

  perform public._write_audit(v_card.business_id, 'card.undo', 'stamp_event', v_event.id,
    jsonb_build_object('card_id', v_card.id, 'undo_event_id', v_undo_event_id));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_undo_event_id);
end;
$$;

revoke all on function public.add_stamp(text, uuid) from public, anon;
revoke all on function public.redeem_reward(uuid, uuid) from public, anon;
revoke all on function public.redeem_milestone(uuid, int, uuid) from public, anon;
grant execute on function public.add_stamp(text, uuid) to authenticated;
grant execute on function public.redeem_reward(uuid, uuid) to authenticated;
grant execute on function public.redeem_milestone(uuid, int, uuid) to authenticated;
