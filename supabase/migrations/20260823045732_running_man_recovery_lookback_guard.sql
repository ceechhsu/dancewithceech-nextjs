-- The cron lists only the same recent window. Older unattached holds are
-- preserved for manual review rather than incorrectly treated as missing.
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
    and r.created_at >= now() - interval '7 days'
    and r.created_at <= now() - make_interval(secs => greatest(p_grace_seconds, 300));
$$;

revoke all on function private.list_recoverable_running_man_holds(text, integer) from public, anon, authenticated;
grant execute on function private.list_recoverable_running_man_holds(text, integer) to service_role;
