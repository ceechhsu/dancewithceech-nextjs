-- Shared, service-role-only fixed-window limits for the public interest form.
-- Subject values are HMAC fingerprints so raw IP addresses and emails are not retained.
create schema if not exists private;

create table if not exists private.running_man_waitlist_rate_limits (
  bucket text not null check (bucket in ('network', 'email')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (bucket, subject_hash)
);

create index if not exists running_man_waitlist_rate_limits_updated_idx
  on private.running_man_waitlist_rate_limits (updated_at);

alter table private.running_man_waitlist_rate_limits enable row level security;
revoke all on table private.running_man_waitlist_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.running_man_waitlist_rate_limits to service_role;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.check_running_man_waitlist_rate_limit(
  p_bucket text,
  p_subject_hash text,
  p_limit integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket is null or p_bucket not in ('network', 'email')
    or p_subject_hash is null or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null or p_limit not between 1 and 100
    or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid waitlist rate-limit request' using errcode = '22023';
  end if;

  with stale as (
    select bucket, subject_hash
    from private.running_man_waitlist_rate_limits
    where updated_at < v_now - interval '1 day'
    order by updated_at
    limit 100
    for update skip locked
  )
  delete from private.running_man_waitlist_rate_limits limits
  using stale
  where limits.bucket = stale.bucket and limits.subject_hash = stale.subject_hash;

  insert into private.running_man_waitlist_rate_limits as limits (
    bucket, subject_hash, window_started_at, request_count, updated_at
  ) values (
    p_bucket, p_subject_hash, v_now, 1, v_now
  )
  on conflict (bucket, subject_hash) do update
  set window_started_at = case
        when limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
        else least(limits.request_count + 1, p_limit + 1)
      end,
      updated_at = v_now
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  return jsonb_build_object(
    'allowed', v_request_count <= p_limit,
    'retry_after_seconds', case
      when v_request_count > p_limit then greatest(
        1,
        ceil(extract(epoch from (v_window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer
      )
      else null
    end
  );
end;
$$;

revoke all on function private.check_running_man_waitlist_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function private.check_running_man_waitlist_rate_limit(text, text, integer, integer) to service_role;
