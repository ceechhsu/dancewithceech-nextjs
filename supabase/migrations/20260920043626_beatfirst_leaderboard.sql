-- Participation is explicit: saved attempts never create public profiles.
create table public.beatfirst_leaderboard_profiles (
  user_id text primary key,
  display_name text not null,
  listed boolean not null default true,
  constraint beatfirst_leaderboard_display_name_check check (
    char_length(display_name) between 3 and 20
    and display_name ~ '^[A-Za-z0-9 ._-]+$'
    and display_name = btrim(display_name)
    and display_name not like '%  %'
  )
);

-- Hidden profiles retain their chosen name; renaming releases the old name.
create unique index beatfirst_leaderboard_profiles_name_idx
  on public.beatfirst_leaderboard_profiles (lower(display_name));

alter table public.beatfirst_leaderboard_profiles enable row level security;
revoke all on table public.beatfirst_leaderboard_profiles from public, anon, authenticated, service_role;
grant select, insert, update on table public.beatfirst_leaderboard_profiles to service_role;

create index beatfirst_preview_attempts_level_best_idx
  on public.beatfirst_preview_attempts (level_id, user_id, score desc, saved_at, attempt_id);

-- Only the server may see account IDs. The HTTP response strips those IDs.
create function public.beatfirst_level_top_ten(p_level_id integer)
returns table (user_id text, display_name text, score smallint, rank bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with best as (
    select distinct on (a.user_id)
      a.user_id, p.display_name, a.score, a.saved_at
    from public.beatfirst_preview_attempts as a
    join public.beatfirst_leaderboard_profiles as p on p.user_id = a.user_id and p.listed
    where a.level_id = p_level_id
    order by a.user_id, a.score desc, a.saved_at, a.attempt_id
  )
  select best.user_id, best.display_name, best.score,
    rank() over (order by best.score desc) as rank
  from best
  order by best.score desc, best.saved_at, best.user_id
  limit 10;
$$;

revoke all on function public.beatfirst_level_top_ten(integer) from public, anon, authenticated, service_role;
grant execute on function public.beatfirst_level_top_ten(integer) to service_role;
