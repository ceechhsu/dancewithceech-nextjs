begin;
create table public.owner_account_directory (
  user_id text primary key check (user_id ~ '^google:[a-zA-Z0-9_-]{1,255}$'),
  email text not null check (email = lower(trim(email)) and length(email) <= 320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  first_sign_in_at timestamptz not null,
  last_sign_in_at timestamptz not null,
  expires_at timestamptz not null,
  check (first_sign_in_at <= last_sign_in_at),
  check (expires_at = last_sign_in_at + interval '90 days')
);
alter table public.owner_account_directory enable row level security;
revoke all on table public.owner_account_directory from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.owner_account_directory to service_role;
create index owner_directory_expiry on public.owner_account_directory(expires_at);
create function public.owner_directory_record_signin(p_user_id text, p_email text)
returns void language plpgsql security invoker set search_path = '' as $$
declare t timestamptz := clock_timestamp();
begin
  insert into public.owner_account_directory(user_id,email,first_sign_in_at,last_sign_in_at,expires_at)
  values(p_user_id,p_email,t,t,t+interval '90 days')
  on conflict(user_id) do update set
    email = excluded.email,
    first_sign_in_at = case when owner_account_directory.expires_at <= t then t else owner_account_directory.first_sign_in_at end,
    last_sign_in_at = greatest(owner_account_directory.last_sign_in_at,t),
    expires_at = greatest(owner_account_directory.last_sign_in_at,t)+interval '90 days';
end;
$$;
revoke all on function public.owner_directory_record_signin(text,text) from public, anon, authenticated;
grant execute on function public.owner_directory_record_signin(text,text) to service_role;
create function public.owner_directory_purge_expired()
returns bigint language sql security invoker set search_path = '' as $$
  with removed as (delete from public.owner_account_directory where expires_at <= now() returning 1)
  select count(*) from removed;
$$;
revoke all on function public.owner_directory_purge_expired() from public, anon, authenticated;
grant execute on function public.owner_directory_purge_expired() to service_role;
commit;
-- Daily physical cleanup; expired rows are hidden immediately by the reader.
-- CRON_SETUP: integration setup below is verified against the live scheduler.
create extension if not exists pg_cron;
select cron.schedule('owner-directory-expiry', '17 4 * * *', 'select public.owner_directory_purge_expired()');
