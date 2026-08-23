create table if not exists private.running_man_owner_alerts (
  dedupe_key text primary key,
  kind text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.running_man_owner_alerts enable row level security;
revoke all on table private.running_man_owner_alerts from public, anon, authenticated;
grant select, insert, update, delete on private.running_man_owner_alerts to service_role;

create or replace function private.claim_running_man_owner_alert(
  p_dedupe_key text,
  p_kind text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claimed boolean := false;
begin
  if length(trim(p_dedupe_key)) = 0 or length(trim(p_kind)) = 0 then
    raise exception 'owner alert key and kind are required' using errcode = '22023';
  end if;
  insert into private.running_man_owner_alerts (dedupe_key, kind, payload, attempt_count, last_attempt_at)
  values (p_dedupe_key, p_kind, p_payload, 1, now())
  on conflict (dedupe_key) do nothing;
  if found then
    return jsonb_build_object('should_notify', true);
  end if;

  update private.running_man_owner_alerts
  set attempt_count = attempt_count + 1, last_attempt_at = now(), updated_at = now()
  where dedupe_key = p_dedupe_key
    and status = 'pending'
    and (last_attempt_at is null or last_attempt_at <= now() - interval '10 minutes')
  returning true into v_claimed;
  return jsonb_build_object('should_notify', coalesce(v_claimed, false));
end;
$$;

create or replace function private.mark_running_man_owner_alert_sent(p_dedupe_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.running_man_owner_alerts
  set status = 'sent', sent_at = now(), updated_at = now()
  where dedupe_key = p_dedupe_key and status = 'pending';
end;
$$;

revoke all on function private.claim_running_man_owner_alert(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.mark_running_man_owner_alert_sent(text) from public, anon, authenticated;
grant execute on function private.claim_running_man_owner_alert(text, text, jsonb) to service_role;
grant execute on function private.mark_running_man_owner_alert_sent(text) to service_role;
