-- Protected cron recovery. These functions are service-role-only and never
-- expose reservation IDs to browser or authenticated roles.
create or replace function private.list_recoverable_running_man_holds(
  p_cohort_slug text,
  p_grace_seconds integer default 300
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('reservation_id', r.id) order by r.created_at), '[]'::jsonb)
  from private.running_man_reservations r
  join private.running_man_cohorts c on c.id = r.cohort_id
  where c.slug = p_cohort_slug
    and r.state = 'creating_checkout'
    and r.stripe_session_id is null
    and r.created_at <= now() - make_interval(secs => greatest(p_grace_seconds, 300));
$$;

create or replace function private.release_missing_running_man_hold(
  p_reservation_id uuid,
  p_grace_seconds integer default 300
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
begin
  select * into v_reservation
  from private.running_man_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation not found' using errcode = 'P0002';
  end if;
  if v_reservation.state <> 'creating_checkout'
    or v_reservation.stripe_session_id is not null
    or v_reservation.created_at > now() - make_interval(secs => greatest(p_grace_seconds, 300)) then
    return jsonb_build_object('result_code', 'preserved', 'state', v_reservation.state);
  end if;

  update private.running_man_reservations
  set state = 'released', released_at = now(), updated_at = now()
  where id = p_reservation_id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, evidence)
  values (
    v_reservation.cohort_id,
    v_reservation.id,
    'cron_released_missing_checkout_hold',
    'creating_checkout',
    'released',
    jsonb_build_object('graceSeconds', greatest(p_grace_seconds, 300))
  );
  return jsonb_build_object('result_code', 'released', 'state', 'released');
end;
$$;

create or replace function private.find_running_man_reservation_by_stripe(
  p_charge_id text,
  p_payment_intent_id text
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'reservation_id', r.id,
    'session_id', r.stripe_session_id,
    'payment_intent_id', r.stripe_payment_intent_id,
    'charge_id', r.stripe_charge_id
  )
  from private.running_man_reservations r
  where (p_charge_id is not null and r.stripe_charge_id = p_charge_id)
     or (p_payment_intent_id is not null and r.stripe_payment_intent_id = p_payment_intent_id)
  order by case when p_charge_id is not null and r.stripe_charge_id = p_charge_id then 0 else 1 end,
           r.created_at desc
  limit 1;
$$;

revoke all on function private.list_recoverable_running_man_holds(text, integer) from public, anon, authenticated;
revoke all on function private.release_missing_running_man_hold(uuid, integer) from public, anon, authenticated;
revoke all on function private.find_running_man_reservation_by_stripe(text, text) from public, anon, authenticated;
grant execute on function private.list_recoverable_running_man_holds(text, integer) to service_role;
grant execute on function private.release_missing_running_man_hold(uuid, integer) to service_role;
grant execute on function private.find_running_man_reservation_by_stripe(text, text) to service_role;
