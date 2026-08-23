-- Running Man Method: private, service-role-only enrollment inventory.
-- The `private` schema must be added to the project Data API's exposed schemas
-- during deployment so the server-only Supabase client can call these RPCs.
-- No browser key receives schema, table, or function privileges.

create schema if not exists private;

create table if not exists private.running_man_cohorts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  starts_at timestamptz not null,
  graduation_at timestamptz not null,
  checkout_cutoff_at timestamptz not null,
  seat_capacity smallint not null check (seat_capacity = 12),
  coaching_seat_capacity smallint not null check (coaching_seat_capacity = 3),
  terms_version text not null,
  minimum_evaluated_at timestamptz,
  minimum_active_paid_at_evaluation smallint,
  minimum_owner_notified_at timestamptz,
  last_owner_action_at timestamptz,
  last_owner_action_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.running_man_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references private.running_man_cohorts(id) on delete restrict,
  attempt_hash text not null,
  network_hash text not null,
  selected_coaching boolean not null default false,
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  request_window_started_at timestamptz not null default now(),
  request_count_in_window integer not null default 1 check (request_count_in_window > 0),
  active_reservation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, attempt_hash)
);

create table if not exists private.running_man_reservations (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references private.running_man_cohorts(id) on delete restrict,
  checkout_attempt_id uuid not null references private.running_man_checkout_attempts(id) on delete restrict,
  attempt_hash text not null,
  tier_index smallint not null check (tier_index between 1 and 3),
  base_amount_cents integer not null check (base_amount_cents in (19700, 24700, 29700)),
  include_coaching boolean not null default false,
  coaching_amount_cents integer not null default 0 check (coaching_amount_cents in (0, 10000)),
  accepted_terms_version text not null,
  accepted_terms_at timestamptz not null default now(),
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text unique,
  state text not null check (state in (
    'creating_checkout', 'checkout_open', 'paid', 'refund_review', 'disputed', 'released', 'failed'
  )),
  expires_at timestamptz,
  fully_refunded_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((include_coaching and coaching_amount_cents = 10000) or (not include_coaching and coaching_amount_cents = 0))
);

alter table private.running_man_checkout_attempts
  add constraint running_man_checkout_attempts_active_reservation_fkey
  foreign key (active_reservation_id)
  references private.running_man_reservations(id)
  on delete set null;

create table if not exists private.running_man_stripe_events (
  stripe_event_id text primary key,
  cohort_id uuid references private.running_man_cohorts(id) on delete set null,
  reservation_id uuid references private.running_man_reservations(id) on delete set null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists private.running_man_audit_events (
  id bigint generated always as identity primary key,
  cohort_id uuid references private.running_man_cohorts(id) on delete set null,
  reservation_id uuid references private.running_man_reservations(id) on delete set null,
  stripe_event_id text references private.running_man_stripe_events(stripe_event_id) on delete set null,
  action text not null,
  old_state text,
  new_state text,
  actor_email text,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists running_man_one_open_reservation_per_attempt
  on private.running_man_reservations (checkout_attempt_id)
  where state in ('creating_checkout', 'checkout_open');
create index if not exists running_man_reservations_inventory_idx
  on private.running_man_reservations (cohort_id, tier_index, state, expires_at);
create index if not exists running_man_reservations_stripe_lookup_idx
  on private.running_man_reservations (stripe_payment_intent_id, stripe_charge_id);
create index if not exists running_man_stripe_events_reservation_idx
  on private.running_man_stripe_events (reservation_id, received_at desc);

alter table private.running_man_cohorts enable row level security;
alter table private.running_man_checkout_attempts enable row level security;
alter table private.running_man_reservations enable row level security;
alter table private.running_man_stripe_events enable row level security;
alter table private.running_man_audit_events enable row level security;

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke all on sequences from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;

insert into private.running_man_cohorts (
  slug, starts_at, graduation_at, checkout_cutoff_at, seat_capacity, coaching_seat_capacity, terms_version
) values (
  'running-man-method-fall-2026',
  '2026-09-25T03:00:00.000Z',
  '2026-10-23T03:00:00.000Z',
  '2026-09-18T06:59:00.000Z',
  12,
  3,
  'running-man-2026-08-22'
) on conflict (slug) do nothing;

create or replace function private.reserve_running_man_checkout(
  p_cohort_slug text,
  p_expected_tier smallint,
  p_include_coaching boolean,
  p_terms_version text,
  p_attempt_hash text,
  p_network_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_cohort private.running_man_cohorts%rowtype;
  v_attempt_id uuid;
  v_existing private.running_man_reservations%rowtype;
  v_tier smallint;
  v_capacity integer;
  v_allocations integer;
  v_holds integer;
  v_under_review integer;
  v_active_tier smallint := null;
  v_active_paid integer;
  v_coaching_paid integer;
  v_coaching_under_review integer;
  v_coaching_holds integer;
  v_network_request_count integer;
  v_reservation_id uuid;
  v_price integer;
begin
  if p_expected_tier not between 1 and 3
    or length(trim(p_attempt_hash)) < 32
    or length(trim(p_network_hash)) < 32 then
    raise exception 'invalid checkout reservation request' using errcode = '22023';
  end if;

  select * into v_cohort
  from private.running_man_cohorts
  where slug = p_cohort_slug
  for update;
  if not found then
    raise exception 'unknown cohort' using errcode = 'P0002';
  end if;
  if p_terms_version <> v_cohort.terms_version then
    return jsonb_build_object('result_code', 'stale', 'enrollment_state', jsonb_build_object('termsVersion', v_cohort.terms_version));
  end if;

  insert into private.running_man_checkout_attempts (
    cohort_id, attempt_hash, network_hash, selected_coaching, last_requested_at, request_window_started_at, request_count_in_window
  ) values (v_cohort.id, p_attempt_hash, p_network_hash, p_include_coaching, v_now, v_now, 1)
  on conflict (cohort_id, attempt_hash) do update
  set network_hash = excluded.network_hash,
      selected_coaching = excluded.selected_coaching,
      last_requested_at = v_now,
      request_count_in_window = case
        when private.running_man_checkout_attempts.request_window_started_at <= v_now - interval '5 minutes'
          then 1
        else private.running_man_checkout_attempts.request_count_in_window + 1
      end,
      request_window_started_at = case
        when private.running_man_checkout_attempts.request_window_started_at <= v_now - interval '5 minutes'
          then v_now
        else private.running_man_checkout_attempts.request_window_started_at
      end,
      updated_at = v_now
  returning id into v_attempt_id;

  select * into v_existing
  from private.running_man_reservations
  where checkout_attempt_id = v_attempt_id
    and state in ('creating_checkout', 'checkout_open')
  for update;
  if found and v_existing.expires_at > v_now
    and v_existing.include_coaching = p_include_coaching then
    return jsonb_build_object(
      'result_code', 'existing_open',
      'reservation_id', v_existing.id,
      'expires_at', v_existing.expires_at
    );
  end if;
  if found and v_existing.expires_at > v_now
    and v_existing.include_coaching <> p_include_coaching then
    return jsonb_build_object(
      'result_code', 'selection_change_required',
      'enrollment_state', jsonb_build_object('activeTier', v_existing.tier_index)
    );
  end if;
  if found and v_existing.expires_at <= v_now then
    if v_existing.state = 'creating_checkout' and v_existing.stripe_session_id is null then
      update private.running_man_reservations
      set state = 'released', released_at = v_now, updated_at = v_now
      where id = v_existing.id;
      insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state)
      values (v_cohort.id, v_existing.id, 'expired_unattached_reservation_released', 'creating_checkout', 'released');
    else
      return jsonb_build_object(
        'result_code', 'stripe_expiry_verification_required',
        'enrollment_state', jsonb_build_object('activeTier', v_existing.tier_index)
      );
    end if;
  end if;
  if v_now >= v_cohort.checkout_cutoff_at then
    return jsonb_build_object('result_code', 'closed', 'enrollment_state', jsonb_build_object('status', 'closed'));
  end if;

  select coalesce(sum(request_count_in_window), 0) into v_network_request_count
  from private.running_man_checkout_attempts
  where cohort_id = v_cohort.id
    and network_hash = p_network_hash
    and request_window_started_at > v_now - interval '5 minutes';
  if v_network_request_count > 12 then
    return jsonb_build_object('result_code', 'rate_limited', 'enrollment_state', jsonb_build_object('status', 'unavailable'));
  end if;

  for v_tier in 1..3 loop
    v_capacity := case v_tier when 1 then 3 when 2 then 3 else 6 end;
    select
      count(*) filter (where state in ('paid', 'refund_review', 'disputed')),
      count(*) filter (where state in ('refund_review', 'disputed')),
      count(*) filter (where state in ('creating_checkout', 'checkout_open') and expires_at > v_now)
    into v_allocations, v_under_review, v_holds
    from private.running_man_reservations
    where cohort_id = v_cohort.id and tier_index = v_tier;

    if v_allocations + v_holds = v_capacity and v_allocations < v_capacity then
      if v_under_review > 0 then
        return jsonb_build_object('result_code', 'capacity_under_review', 'enrollment_state', jsonb_build_object('activeTier', v_tier));
      end if;
      return jsonb_build_object('result_code', 'tier_held', 'enrollment_state', jsonb_build_object('activeTier', v_tier));
    end if;
    if v_allocations + v_holds < v_capacity then
      v_active_tier := v_tier;
      exit;
    end if;
  end loop;

  select count(*) into v_active_paid
  from private.running_man_reservations
  where cohort_id = v_cohort.id and state = 'paid';

  if v_active_tier is null then
    if v_active_paid = v_cohort.seat_capacity then
      return jsonb_build_object('result_code', 'sold_out', 'enrollment_state', jsonb_build_object('status', 'sold_out'));
    end if;
    return jsonb_build_object('result_code', 'capacity_under_review', 'enrollment_state', jsonb_build_object('status', 'capacity_under_review'));
  end if;

  if p_expected_tier <> v_active_tier then
    return jsonb_build_object('result_code', 'stale', 'enrollment_state', jsonb_build_object('activeTier', v_active_tier));
  end if;

  v_capacity := case v_active_tier when 1 then 3 when 2 then 3 else 6 end;
  select
    count(*) filter (where state in ('paid', 'refund_review', 'disputed')),
    count(*) filter (where state in ('refund_review', 'disputed')),
    count(*) filter (where state in ('creating_checkout', 'checkout_open') and expires_at > v_now)
  into v_allocations, v_under_review, v_holds
  from private.running_man_reservations
  where cohort_id = v_cohort.id and tier_index = v_active_tier;
  if v_allocations + v_holds >= v_capacity then
    if v_under_review > 0 then
      return jsonb_build_object('result_code', 'capacity_under_review', 'enrollment_state', jsonb_build_object('activeTier', v_active_tier));
    end if;
    return jsonb_build_object('result_code', 'tier_held', 'enrollment_state', jsonb_build_object('activeTier', v_active_tier));
  end if;

  if p_include_coaching then
    select
      count(*) filter (where state = 'paid'),
      count(*) filter (where state in ('refund_review', 'disputed')),
      count(*) filter (where state in ('creating_checkout', 'checkout_open') and expires_at > v_now)
    into v_coaching_paid, v_coaching_under_review, v_coaching_holds
    from private.running_man_reservations
    where cohort_id = v_cohort.id
      and include_coaching
      and (
        state in ('paid', 'refund_review', 'disputed')
        or (state in ('creating_checkout', 'checkout_open') and expires_at > v_now)
      );
    if v_coaching_paid >= v_cohort.coaching_seat_capacity then
      return jsonb_build_object('result_code', 'coaching_sold_out', 'enrollment_state', jsonb_build_object('coachingStatus', 'sold_out'));
    end if;
    if v_coaching_under_review > 0 and v_coaching_paid + v_coaching_under_review >= v_cohort.coaching_seat_capacity then
      return jsonb_build_object('result_code', 'coaching_under_review', 'enrollment_state', jsonb_build_object('coachingStatus', 'under_review'));
    end if;
    if v_coaching_holds > 0 and v_coaching_paid + v_coaching_holds >= v_cohort.coaching_seat_capacity then
      return jsonb_build_object('result_code', 'coaching_held', 'enrollment_state', jsonb_build_object('coachingStatus', 'held'));
    end if;
  end if;

  v_price := case v_active_tier when 1 then 19700 when 2 then 24700 else 29700 end;
  insert into private.running_man_reservations (
    cohort_id, checkout_attempt_id, attempt_hash, tier_index, base_amount_cents,
    include_coaching, coaching_amount_cents, accepted_terms_version, state, expires_at
  ) values (
    v_cohort.id, v_attempt_id, p_attempt_hash, v_active_tier, v_price,
    p_include_coaching, case when p_include_coaching then 10000 else 0 end,
    p_terms_version, 'creating_checkout', v_now + interval '30 minutes'
  ) returning id into v_reservation_id;

  update private.running_man_checkout_attempts
  set active_reservation_id = v_reservation_id, updated_at = v_now
  where id = v_attempt_id;

  insert into private.running_man_audit_events (cohort_id, reservation_id, action, new_state, evidence)
  values (v_cohort.id, v_reservation_id, 'reservation_created', 'creating_checkout', jsonb_build_object('tier', v_active_tier));

  return jsonb_build_object('result_code', 'reserved', 'reservation_id', v_reservation_id, 'expires_at', v_now + interval '30 minutes');
end;
$$;

create or replace function private.attach_running_man_session(
  p_reservation_id uuid,
  p_session_id text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
begin
  select * into v_reservation from private.running_man_reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation not found' using errcode = 'P0002'; end if;
  if v_reservation.stripe_session_id is not null and v_reservation.stripe_session_id <> p_session_id then
    raise exception 'reservation already belongs to another Stripe session' using errcode = '23505';
  end if;
  if v_reservation.state not in ('creating_checkout', 'checkout_open') then
    raise exception 'reservation is no longer checkout eligible' using errcode = 'P0001';
  end if;
  update private.running_man_reservations
  set stripe_session_id = p_session_id, state = 'checkout_open', updated_at = now()
  where id = p_reservation_id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state)
  values (v_reservation.cohort_id, p_reservation_id, 'stripe_session_attached', v_reservation.state, 'checkout_open');
end;
$$;

create or replace function private.get_or_create_running_man_checkout_attempt(
  p_cohort_slug text,
  p_attempt_hash text,
  p_network_hash text,
  p_include_coaching boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_cohort private.running_man_cohorts%rowtype;
  v_attempt private.running_man_checkout_attempts%rowtype;
  v_network_request_count integer;
begin
  if length(trim(p_attempt_hash)) < 32 or length(trim(p_network_hash)) < 32 then
    raise exception 'invalid checkout attempt' using errcode = '22023';
  end if;
  select * into v_cohort from private.running_man_cohorts where slug = p_cohort_slug for update;
  if not found then raise exception 'unknown cohort' using errcode = 'P0002'; end if;
  insert into private.running_man_checkout_attempts (
    cohort_id, attempt_hash, network_hash, selected_coaching, last_requested_at, request_window_started_at, request_count_in_window
  ) values (v_cohort.id, p_attempt_hash, p_network_hash, p_include_coaching, v_now, v_now, 1)
  on conflict (cohort_id, attempt_hash) do update
  set network_hash = excluded.network_hash,
      selected_coaching = excluded.selected_coaching,
      last_requested_at = v_now,
      request_count_in_window = case when private.running_man_checkout_attempts.request_window_started_at <= v_now - interval '5 minutes' then 1 else private.running_man_checkout_attempts.request_count_in_window + 1 end,
      request_window_started_at = case when private.running_man_checkout_attempts.request_window_started_at <= v_now - interval '5 minutes' then v_now else private.running_man_checkout_attempts.request_window_started_at end,
      updated_at = v_now
  returning * into v_attempt;
  select coalesce(sum(request_count_in_window), 0) into v_network_request_count
  from private.running_man_checkout_attempts
  where cohort_id = v_cohort.id and network_hash = p_network_hash and request_window_started_at > v_now - interval '5 minutes';
  if v_network_request_count > 12 then
    return jsonb_build_object('result_code', 'rate_limited');
  end if;
  return jsonb_build_object('result_code', 'attempt_ready', 'attempt_id', v_attempt.id, 'selected_coaching', v_attempt.selected_coaching);
end;
$$;

create or replace function private.replace_running_man_unpaid_attempt_selection(
  p_cohort_slug text,
  p_attempt_hash text,
  p_network_hash text,
  p_include_coaching boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort private.running_man_cohorts%rowtype;
  v_attempt private.running_man_checkout_attempts%rowtype;
  v_reservation private.running_man_reservations%rowtype;
begin
  select * into v_cohort from private.running_man_cohorts where slug = p_cohort_slug for update;
  if not found then raise exception 'unknown cohort' using errcode = 'P0002'; end if;
  select * into v_attempt from private.running_man_checkout_attempts
  where cohort_id = v_cohort.id and attempt_hash = p_attempt_hash for update;
  if not found then raise exception 'checkout attempt not found' using errcode = 'P0002'; end if;
  select * into v_reservation from private.running_man_reservations
  where checkout_attempt_id = v_attempt.id and state in ('creating_checkout', 'checkout_open') for update;
  if found and v_reservation.include_coaching = p_include_coaching then
    return jsonb_build_object('result_code', 'unchanged', 'reservation_id', v_reservation.id);
  end if;
  if found and v_reservation.state = 'checkout_open' then
    return jsonb_build_object('result_code', 'stripe_expiry_verification_required', 'reservation_id', v_reservation.id);
  end if;
  if found then
    update private.running_man_reservations
    set state = 'released', released_at = now(), updated_at = now()
    where id = v_reservation.id;
    insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, evidence)
    values (v_cohort.id, v_reservation.id, 'unattached_reservation_replaced', v_reservation.state, 'released', jsonb_build_object('includeCoaching', p_include_coaching));
  end if;
  update private.running_man_checkout_attempts
  set network_hash = p_network_hash, selected_coaching = p_include_coaching, active_reservation_id = null, last_requested_at = now(), updated_at = now()
  where id = v_attempt.id;
  return jsonb_build_object('result_code', 'selection_updated');
end;
$$;

create or replace function private.recover_running_man_creating_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
begin
  select * into v_reservation from private.running_man_reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation not found' using errcode = 'P0002'; end if;
  if v_reservation.state <> 'creating_checkout' then
    return jsonb_build_object('result_code', 'not_creating', 'state', v_reservation.state);
  end if;
  if v_reservation.stripe_session_id is not null then
    return jsonb_build_object('result_code', 'session_attached', 'session_id', v_reservation.stripe_session_id);
  end if;
  if v_reservation.created_at > now() - interval '5 minutes' then
    return jsonb_build_object('result_code', 'scan_required');
  end if;
  update private.running_man_reservations set state = 'released', released_at = now(), updated_at = now() where id = p_reservation_id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state)
  values (v_reservation.cohort_id, p_reservation_id, 'creating_reservation_recovery_failed', 'creating_checkout', 'released');
  return jsonb_build_object('result_code', 'released_after_recovery_grace');
end;
$$;

create or replace function private.get_running_man_enrollment_aggregate(p_cohort_slug text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with cohort as (
    select * from private.running_man_cohorts where slug = p_cohort_slug
  ), reservation_counts as (
    select r.tier_index,
      count(*) filter (where r.state = 'paid') as active_paid,
      count(*) filter (where r.state in ('paid', 'refund_review', 'disputed')) as allocation_consumed,
      count(*) filter (where r.state in ('refund_review', 'disputed')) as under_review,
      count(*) filter (where r.state in ('creating_checkout', 'checkout_open') and r.expires_at > now()) as active_holds
    from private.running_man_reservations r join cohort c on c.id = r.cohort_id
    group by r.tier_index
  ), coaching_counts as (
    select count(*) filter (where r.state = 'paid' and r.include_coaching) as active_paid,
      count(*) filter (where r.state in ('refund_review', 'disputed') and r.include_coaching) as under_review,
      count(*) filter (where r.state in ('creating_checkout', 'checkout_open') and r.expires_at > now() and r.include_coaching) as active_holds
    from private.running_man_reservations r join cohort c on c.id = r.cohort_id
  )
  select jsonb_build_object(
    'now', now(),
    'activePaidStudents', coalesce((select sum(active_paid) from reservation_counts), 0),
    'capacityConsumed', coalesce((select sum(allocation_consumed) from reservation_counts), 0),
    'tiers', jsonb_build_object(
      '1', jsonb_build_object('activePaid', coalesce((select active_paid from reservation_counts where tier_index = 1), 0), 'allocationConsumed', coalesce((select allocation_consumed from reservation_counts where tier_index = 1), 0), 'underReview', coalesce((select under_review from reservation_counts where tier_index = 1), 0), 'activeHolds', coalesce((select active_holds from reservation_counts where tier_index = 1), 0)),
      '2', jsonb_build_object('activePaid', coalesce((select active_paid from reservation_counts where tier_index = 2), 0), 'allocationConsumed', coalesce((select allocation_consumed from reservation_counts where tier_index = 2), 0), 'underReview', coalesce((select under_review from reservation_counts where tier_index = 2), 0), 'activeHolds', coalesce((select active_holds from reservation_counts where tier_index = 2), 0)),
      '3', jsonb_build_object('activePaid', coalesce((select active_paid from reservation_counts where tier_index = 3), 0), 'allocationConsumed', coalesce((select allocation_consumed from reservation_counts where tier_index = 3), 0), 'underReview', coalesce((select under_review from reservation_counts where tier_index = 3), 0), 'activeHolds', coalesce((select active_holds from reservation_counts where tier_index = 3), 0))
    ),
    'coaching', jsonb_build_object('activePaid', (select active_paid from coaching_counts), 'underReview', (select under_review from coaching_counts), 'activeHolds', (select active_holds from coaching_counts))
  );
$$;

create or replace function private.apply_running_man_stripe_event(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_payment_intent_id text,
  p_charge_id text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
  v_old_state text;
  v_new_state text;
  v_event_inserted boolean;
  v_full_refund boolean := false;
begin
  select * into v_reservation
  from private.running_man_reservations
  where (p_session_id is not null and stripe_session_id = p_session_id)
     or (p_payment_intent_id is not null and stripe_payment_intent_id = p_payment_intent_id)
     or (p_charge_id is not null and stripe_charge_id = p_charge_id)
  order by created_at desc limit 1 for update;
  if not found then raise exception 'event reservation not found' using errcode = 'P0002'; end if;

  insert into private.running_man_stripe_events (stripe_event_id, cohort_id, reservation_id, event_type, payload)
  values (p_event_id, v_reservation.cohort_id, v_reservation.id, p_event_type, p_payload)
  on conflict (stripe_event_id) do nothing
  returning true into v_event_inserted;
  if not coalesce(v_event_inserted, false) then
    return jsonb_build_object('result_code', 'duplicate', 'reservation_id', v_reservation.id);
  end if;

  v_old_state := v_reservation.state;
  v_new_state := v_old_state;
  if p_event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded') then
    if v_old_state in ('creating_checkout', 'checkout_open', 'released') then v_new_state := 'paid'; end if;
  elsif p_event_type = 'checkout.session.expired' then
    if v_old_state in ('creating_checkout', 'checkout_open') then v_new_state := 'released'; end if;
  elsif p_event_type = 'charge.refunded' then
    v_full_refund := coalesce((p_payload ->> 'amount_refunded')::bigint, -1)
      = coalesce((p_payload ->> 'amount')::bigint, -2)
      and coalesce((p_payload ->> 'amount')::bigint, 0) > 0;
    if v_full_refund and v_old_state in ('creating_checkout', 'checkout_open', 'paid', 'released') then
      v_new_state := 'refund_review';
    end if;
  elsif p_event_type in ('charge.dispute.created', 'charge.dispute.closed') then
    if v_old_state in ('creating_checkout', 'checkout_open', 'paid', 'refund_review') then v_new_state := 'disputed'; end if;
  else
    raise exception 'unsupported Stripe event type' using errcode = '22023';
  end if;

  update private.running_man_reservations
  set stripe_session_id = coalesce(p_session_id, stripe_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      stripe_charge_id = coalesce(p_charge_id, stripe_charge_id),
      state = v_new_state,
      fully_refunded_at = case when p_event_type = 'charge.refunded' and v_full_refund and v_new_state = 'refund_review' then now() else fully_refunded_at end,
      released_at = case when v_new_state = 'released' then now() else released_at end,
      updated_at = now()
  where id = v_reservation.id;

  insert into private.running_man_audit_events (cohort_id, reservation_id, stripe_event_id, action, old_state, new_state, evidence)
  values (v_reservation.cohort_id, v_reservation.id, p_event_id, 'stripe_event_applied', v_old_state, v_new_state, p_payload);
  return jsonb_build_object('result_code', 'applied', 'reservation_id', v_reservation.id, 'state', v_new_state);
end;
$$;

create or replace function private.reconcile_running_man_reservation(
  p_reservation_id uuid,
  p_stripe_status text,
  p_payment_status text,
  p_session_id text,
  p_payment_intent_id text,
  p_charge_id text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
  v_new_state text;
begin
  select * into v_reservation from private.running_man_reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation not found' using errcode = 'P0002'; end if;
  v_new_state := v_reservation.state;
  if p_payment_status = 'paid' and v_reservation.state in ('creating_checkout', 'checkout_open', 'released') then v_new_state := 'paid';
  elsif p_stripe_status = 'expired' and p_payment_status = 'unpaid' and v_reservation.state in ('creating_checkout', 'checkout_open') then v_new_state := 'released';
  end if;
  update private.running_man_reservations
  set stripe_session_id = coalesce(p_session_id, stripe_session_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      stripe_charge_id = coalesce(p_charge_id, stripe_charge_id),
      state = v_new_state,
      released_at = case when v_new_state = 'released' then now() else released_at end,
      updated_at = now()
  where id = p_reservation_id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, evidence)
  values (v_reservation.cohort_id, p_reservation_id, 'reservation_reconciled', v_reservation.state, v_new_state,
    jsonb_build_object('stripeStatus', p_stripe_status, 'paymentStatus', p_payment_status));
  return jsonb_build_object('result_code', 'reconciled', 'state', v_new_state);
end;
$$;

create or replace function private.evaluate_running_man_minimum(p_cohort_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cohort private.running_man_cohorts%rowtype;
  v_active_paid integer;
  v_open_sessions integer;
begin
  select * into v_cohort from private.running_man_cohorts where slug = p_cohort_slug for update;
  if not found then raise exception 'unknown cohort' using errcode = 'P0002'; end if;
  select count(*) into v_open_sessions from private.running_man_reservations
  where cohort_id = v_cohort.id and state in ('creating_checkout', 'checkout_open') and expires_at > now();
  if now() < v_cohort.checkout_cutoff_at or v_open_sessions > 0 then
    return jsonb_build_object('result_code', 'pending');
  end if;
  select count(*) into v_active_paid from private.running_man_reservations where cohort_id = v_cohort.id and state = 'paid';
  if v_cohort.minimum_evaluated_at is null then
    update private.running_man_cohorts
    set minimum_evaluated_at = now(), minimum_active_paid_at_evaluation = v_active_paid, updated_at = now()
    where id = v_cohort.id;
    insert into private.running_man_audit_events (cohort_id, action, evidence)
    values (v_cohort.id, 'minimum_enrollment_evaluated', jsonb_build_object('activePaid', v_active_paid, 'minimum', 8));
  end if;
  return jsonb_build_object('result_code', case when v_active_paid >= 8 then 'minimum_met' else 'owner_notification_required' end, 'activePaid', v_active_paid);
end;
$$;

create or replace function private.reopen_running_man_reservation(
  p_reservation_id uuid,
  p_actor_email text,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation private.running_man_reservations%rowtype;
begin
  if length(trim(p_actor_email)) = 0 or length(trim(p_reason)) = 0 then raise exception 'actor and reason are required' using errcode = '22023'; end if;
  select * into v_reservation from private.running_man_reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation not found' using errcode = 'P0002'; end if;
  if v_reservation.state <> 'refund_review' or v_reservation.fully_refunded_at is null then
    raise exception 'only a fully refunded refund-review reservation may be reopened' using errcode = 'P0001';
  end if;
  update private.running_man_reservations
  set state = 'released', released_at = now(), updated_at = now()
  where id = p_reservation_id;
  update private.running_man_cohorts
  set last_owner_action_at = now(), last_owner_action_by = p_actor_email, updated_at = now()
  where id = v_reservation.cohort_id;
  insert into private.running_man_audit_events (cohort_id, reservation_id, action, old_state, new_state, actor_email, reason)
  values (v_reservation.cohort_id, p_reservation_id, 'owner_reopened_refunded_reservation', 'refund_review', 'released', p_actor_email, p_reason);
end;
$$;

revoke all on function private.reserve_running_man_checkout(text, smallint, boolean, text, text, text) from public, anon, authenticated;
revoke all on function private.attach_running_man_session(uuid, text) from public, anon, authenticated;
revoke all on function private.get_or_create_running_man_checkout_attempt(text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.replace_running_man_unpaid_attempt_selection(text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.recover_running_man_creating_reservation(uuid) from public, anon, authenticated;
revoke all on function private.get_running_man_enrollment_aggregate(text) from public, anon, authenticated;
revoke all on function private.apply_running_man_stripe_event(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.reconcile_running_man_reservation(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function private.evaluate_running_man_minimum(text) from public, anon, authenticated;
revoke all on function private.reopen_running_man_reservation(uuid, text, text) from public, anon, authenticated;

grant execute on function private.reserve_running_man_checkout(text, smallint, boolean, text, text, text) to service_role;
grant execute on function private.attach_running_man_session(uuid, text) to service_role;
grant execute on function private.get_or_create_running_man_checkout_attempt(text, text, text, boolean) to service_role;
grant execute on function private.replace_running_man_unpaid_attempt_selection(text, text, text, boolean) to service_role;
grant execute on function private.recover_running_man_creating_reservation(uuid) to service_role;
grant execute on function private.get_running_man_enrollment_aggregate(text) to service_role;
grant execute on function private.apply_running_man_stripe_event(text, text, text, text, text, jsonb) to service_role;
grant execute on function private.reconcile_running_man_reservation(uuid, text, text, text, text, text) to service_role;
grant execute on function private.evaluate_running_man_minimum(text) to service_role;
grant execute on function private.reopen_running_man_reservation(uuid, text, text) to service_role;
