alter table private.running_man_owner_alerts
  drop constraint if exists running_man_owner_alerts_status_check;
alter table private.running_man_owner_alerts
  add constraint running_man_owner_alerts_status_check check (status in ('pending', 'leased', 'sent'));
alter table private.running_man_owner_alerts
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz;

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
  v_alert private.running_man_owner_alerts%rowtype;
  v_token uuid := gen_random_uuid();
begin
  if length(trim(p_dedupe_key)) = 0 or length(trim(p_kind)) = 0 then
    raise exception 'owner alert key and kind are required' using errcode = '22023';
  end if;
  insert into private.running_man_owner_alerts (
    dedupe_key, kind, payload, status, attempt_count, last_attempt_at, lease_token, lease_expires_at
  ) values (
    p_dedupe_key, p_kind, p_payload, 'leased', 1, now(), v_token, now() + interval '5 minutes'
  ) on conflict (dedupe_key) do nothing;
  if found then
    return jsonb_build_object('action', 'leased', 'lease_token', v_token);
  end if;

  select * into v_alert
  from private.running_man_owner_alerts
  where dedupe_key = p_dedupe_key
  for update;
  if v_alert.status = 'sent' then
    return jsonb_build_object('action', 'sent');
  end if;
  if v_alert.status = 'leased' and v_alert.lease_expires_at > now() then
    return jsonb_build_object('action', 'leased_by_other');
  end if;
  update private.running_man_owner_alerts
  set status = 'leased', attempt_count = attempt_count + 1, last_attempt_at = now(),
      lease_token = v_token, lease_expires_at = now() + interval '5 minutes', updated_at = now()
  where dedupe_key = p_dedupe_key;
  return jsonb_build_object('action', 'leased', 'lease_token', v_token);
end;
$$;

drop function if exists private.mark_running_man_owner_alert_sent(text);
create or replace function private.mark_running_man_owner_alert_sent(
  p_dedupe_key text,
  p_lease_token uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.running_man_owner_alerts
  set status = 'sent', sent_at = now(), lease_token = null, lease_expires_at = null, updated_at = now()
  where dedupe_key = p_dedupe_key and status = 'leased' and lease_token = p_lease_token;
end;
$$;

create or replace function private.release_running_man_owner_alert_lease(
  p_dedupe_key text,
  p_lease_token uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.running_man_owner_alerts
  set status = 'pending', lease_token = null, lease_expires_at = null, updated_at = now()
  where dedupe_key = p_dedupe_key and status = 'leased' and lease_token = p_lease_token;
end;
$$;

revoke all on function private.claim_running_man_owner_alert(text, text, jsonb) from public, anon, authenticated;
revoke all on function private.mark_running_man_owner_alert_sent(text, uuid) from public, anon, authenticated;
revoke all on function private.release_running_man_owner_alert_lease(text, uuid) from public, anon, authenticated;
grant execute on function private.claim_running_man_owner_alert(text, text, jsonb) to service_role;
grant execute on function private.mark_running_man_owner_alert_sent(text, uuid) to service_role;
grant execute on function private.release_running_man_owner_alert_lease(text, uuid) to service_role;
