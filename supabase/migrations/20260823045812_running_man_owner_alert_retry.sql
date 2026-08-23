-- Pending alerts are deliberately claimed again on every retry. A failed
-- webhook must not acknowledge Stripe while an owner alert remains unsent.
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
  v_status text;
begin
  if length(trim(p_dedupe_key)) = 0 or length(trim(p_kind)) = 0 then
    raise exception 'owner alert key and kind are required' using errcode = '22023';
  end if;
  insert into private.running_man_owner_alerts (dedupe_key, kind, payload, attempt_count, last_attempt_at)
  values (p_dedupe_key, p_kind, p_payload, 1, now())
  on conflict (dedupe_key) do nothing;
  if found then
    return jsonb_build_object('action', 'send');
  end if;

  select status into v_status
  from private.running_man_owner_alerts
  where dedupe_key = p_dedupe_key
  for update;
  if v_status = 'sent' then
    return jsonb_build_object('action', 'sent');
  end if;
  update private.running_man_owner_alerts
  set attempt_count = attempt_count + 1, last_attempt_at = now(), updated_at = now()
  where dedupe_key = p_dedupe_key and status = 'pending';
  return jsonb_build_object('action', 'send');
end;
$$;

revoke all on function private.claim_running_man_owner_alert(text, text, jsonb) from public, anon, authenticated;
grant execute on function private.claim_running_man_owner_alert(text, text, jsonb) to service_role;
