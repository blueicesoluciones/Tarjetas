-- Recompensas intermedias en la misma tarjeta (planes Medium y Pro).
-- Ej.: a los 5 sellos un descuento y a los 10 (stamps_required) el premio final.
-- Cobrar una intermedia no resta sellos: se marca como cobrada en el ciclo
-- actual (cards.claimed_milestones). Al canjear el premio final el ciclo se
-- reinicia y las intermedias vuelven a estar disponibles.
--
-- El plan que las incluye se repite aquí (plan <> 'standard') y en
-- src/lib/plans.ts (milestoneRewards): mantenerlos iguales.

create table public.program_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  stamps_at int not null check (stamps_at between 1 and 29),
  description text not null check (char_length(description) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (program_id, stamps_at)
);

create index program_rewards_program_idx on public.program_rewards (program_id, stamps_at);

alter table public.program_rewards enable row level security;

grant select on public.program_rewards to authenticated;

create policy program_rewards_select on public.program_rewards for select to authenticated
  using (public.is_super_admin() or (public.auth_role() is not null and business_id = public.auth_business_id()));
-- Escrituras solo desde el servidor (service role) tras validar plan y rol.

alter table public.cards add column claimed_milestones int[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Estado de la tarjeta: ahora incluye las recompensas intermedias.
-- ---------------------------------------------------------------------------
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
    'undo_window_minutes', p.undo_window_minutes,
    'milestones', coalesce((
      select jsonb_agg(jsonb_build_object(
               'stamps_at', r.stamps_at,
               'description', r.description,
               'claimed', r.stamps_at = any (c.claimed_milestones),
               'available', c.stamps_count >= r.stamps_at and not (r.stamps_at = any (c.claimed_milestones))
             ) order by r.stamps_at)
      from public.program_rewards r
      where r.program_id = c.program_id
        and r.stamps_at < p.stamps_required
        and b.plan <> 'standard'
    ), '[]'::jsonb)
  )
  from public.cards c
  join public.programs p on p.id = c.program_id
  join public.customers cu on cu.id = c.customer_id
  join public.businesses b on b.id = c.business_id
  where c.id = p_card_id;
$$;

-- ---------------------------------------------------------------------------
-- redeem_reward: el premio final reinicia también las intermedias.
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
         total_redemptions = total_redemptions + 1,
         claimed_milestones = '{}'
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
-- redeem_milestone: cobra una recompensa intermedia sin restar sellos.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_milestone(p_card_id uuid, p_stamps_at int)
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
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  perform public._assert_staff_for_business(v_card.business_id);
  perform public._assert_card_operable(v_card.id);

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

  insert into public.stamp_events (business_id, card_id, type, delta, stamps_after, performed_by, note)
  values (v_card.business_id, v_card.id, 'redeem', 0, v_card.stamps_count, auth.uid(),
          'Premio de ' || p_stamps_at || ' sellos: ' || v_description)
  returning id into v_event_id;

  perform public._write_audit(v_card.business_id, 'card.redeem_milestone', 'card', v_card.id,
    jsonb_build_object('event_id', v_event_id, 'stamps_at', p_stamps_at));

  return public._card_state(v_card.id) || jsonb_build_object('event_id', v_event_id);
end;
$$;

revoke all on function public.redeem_milestone(uuid, int) from public, anon;
grant execute on function public.redeem_milestone(uuid, int) to authenticated;
