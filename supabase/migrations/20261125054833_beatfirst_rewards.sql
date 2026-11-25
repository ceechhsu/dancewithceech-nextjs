create table public.beatfirst_daily_check_ins (
  user_id text not null,
  check_in_date date not null,
  primary key (user_id, check_in_date)
);

alter table public.beatfirst_daily_check_ins enable row level security;
revoke all on table public.beatfirst_daily_check_ins from public, anon, authenticated, service_role;
grant select, insert on table public.beatfirst_daily_check_ins to service_role;

-- The server resolves p_user_id from its verified account session. Existing
-- saved attempts always count toward rewards. Daily history starts at first claim.
create function public.beatfirst_check_in(p_user_id text, p_claim boolean default false)
returns table (
  points bigint,
  current_streak integer,
  best_streak integer,
  check_in_date date,
  checked_in_today boolean,
  check_in_awarded boolean,
  restarted boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  today date := (statement_timestamp() at time zone 'America/Los_Angeles')::date;
  inserted integer := 0;
begin
  if p_claim then
    insert into public.beatfirst_daily_check_ins (user_id, check_in_date)
    values (p_user_id, today)
    on conflict on constraint beatfirst_daily_check_ins_pkey do nothing;
    get diagnostics inserted = row_count;
  end if;

  -- A separate read sees the winning same-day insert after a conflicting claim.
  return query
    with dated_visits as (
      select visit.check_in_date,
        visit.check_in_date - row_number() over (order by visit.check_in_date)::integer as streak_group
      from public.beatfirst_daily_check_ins as visit
      where visit.user_id = p_user_id and visit.check_in_date <= today
    ),
    streaks as (
      select count(*) as days, max(visit.check_in_date) as last_day
      from dated_visits as visit
      group by visit.streak_group
    ),
    daily_summary as (
      select coalesce(sum(streak.days), 0)::bigint as days,
        coalesce(max(streak.days) filter (where streak.last_day >= today - 1), 0)::integer as current_days,
        coalesce(max(streak.days), 0)::integer as best_days,
        coalesce(bool_or(streak.last_day = today), false) as has_today
      from streaks as streak
    ),
    round_summary as (
      select count(*) as rounds,
        count(distinct attempt.level_id) filter (where attempt.score >= 80) as passed_levels
      from public.beatfirst_preview_attempts as attempt
      where attempt.user_id = p_user_id
    )
    select round_summary.rounds * 10 + round_summary.passed_levels * 20 + daily_summary.days * 25,
      daily_summary.current_days,
      daily_summary.best_days,
      today,
      daily_summary.has_today,
      inserted = 1,
      daily_summary.has_today and daily_summary.current_days = 1 and daily_summary.days > 1
    from round_summary cross join daily_summary;
end;
$$;

revoke all on function public.beatfirst_check_in(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.beatfirst_check_in(text, boolean) to service_role;
