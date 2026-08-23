-- A cron scan has independently verified the session metadata and line items.
-- This RPC locks the hold so a late attach or a terminal Stripe event wins
-- safely, without reopening released or reviewed capacity.
create or replace function private.attach_recovered_running_man_session(
  p_reservation_id uuid,
  p_session_id text
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

  if v_reservation.state = 'creating_checkout' and v_reservation.stripe_session_id is null then
    update private.running_man_reservations
    set stripe_session_id = p_session_id, state = 'checkout_open', updated_at = now()
    where id = v_reservation.id;
    insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, evidence)
    values (
      v_reservation.cohort_id,
      v_reservation.id,
      'cron_recovered_stripe_session',
      'creating_checkout',
      'checkout_open',
      jsonb_build_object('sessionId', p_session_id)
    );
    return jsonb_build_object('result_code', 'attached', 'state', 'checkout_open');
  end if;

  if v_reservation.stripe_session_id = p_session_id then
    return jsonb_build_object('result_code', 'unchanged', 'state', v_reservation.state);
  end if;
  return jsonb_build_object('result_code', 'preserved', 'state', v_reservation.state);
end;
$$;

revoke all on function private.attach_recovered_running_man_session(uuid, text) from public, anon, authenticated;
grant execute on function private.attach_recovered_running_man_session(uuid, text) to service_role;
