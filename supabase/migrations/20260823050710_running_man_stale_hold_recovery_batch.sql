-- Recent sessions are bounded in Stripe, while this bounded database batch
-- audits and releases old, unattached creating holds after a seven-day grace.
create or replace function private.list_stale_unattached_running_man_holds(
  p_cohort_slug text,
  p_age_seconds integer default 604800,
  p_limit integer default 100
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('reservation_id', candidate.id) order by candidate.created_at), '[]'::jsonb)
  from (
    select r.id, r.created_at
    from private.running_man_reservations r
    join private.running_man_cohorts c on c.id = r.cohort_id
    where c.slug = p_cohort_slug
      and r.state = 'creating_checkout'
      and r.stripe_session_id is null
      and r.created_at <= now() - make_interval(secs => greatest(p_age_seconds, 604800))
    order by r.created_at
    limit least(greatest(p_limit, 1), 100)
  ) candidate;
$$;

create or replace function private.release_stale_unattached_running_man_hold(
  p_reservation_id uuid,
  p_age_seconds integer default 604800
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
begin
  select * into v_reservation from private.running_man_reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation not found' using errcode = 'P0002'; end if;
  if v_reservation.state <> 'creating_checkout'
    or v_reservation.stripe_session_id is not null
    or v_reservation.created_at > now() - make_interval(secs => greatest(p_age_seconds, 604800)) then
    return jsonb_build_object('result_code', 'preserved', 'state', v_reservation.state);
  end if;
  update private.running_man_reservations
  set state = 'released', released_at = now(), updated_at = now()
  where id = v_reservation.id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, evidence)
  values (
    v_reservation.cohort_id, v_reservation.id, 'cron_released_stale_unattached_hold',
    'creating_checkout', 'released', jsonb_build_object('ageSeconds', greatest(p_age_seconds, 604800))
  );
  return jsonb_build_object('result_code', 'released', 'state', 'released');
end;
$$;

revoke all on function private.list_stale_unattached_running_man_holds(text, integer, integer) from public, anon, authenticated;
revoke all on function private.release_stale_unattached_running_man_hold(uuid, integer) from public, anon, authenticated;
grant execute on function private.list_stale_unattached_running_man_holds(text, integer, integer) to service_role;
grant execute on function private.release_stale_unattached_running_man_hold(uuid, integer) to service_role;
