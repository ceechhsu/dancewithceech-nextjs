begin;
-- Historical associations have their own processing timestamp; never sign-in timestamps.
create table public.owner_account_email_matches (
  user_id text primary key check (user_id ~ '^google:[a-zA-Z0-9_-]{1,255}$'),
  email text not null check (email = lower(trim(email)) and length(email)<=320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  source text not null default 'attendance-google-id' check (source='attendance-google-id'),
  matched_at timestamptz not null,
  expires_at timestamptz not null check (expires_at=matched_at+interval '90 days')
);
-- Only a one-way account marker remains after removal, solely to prevent reimport.
create table public.owner_email_recovery_exclusions (
  account_hash text primary key check (account_hash ~ '^[a-f0-9]{64}$'),
  excluded_at timestamptz not null default clock_timestamp()
);
alter table public.owner_account_email_matches enable row level security;
alter table public.owner_email_recovery_exclusions enable row level security;
revoke all on public.owner_account_email_matches,public.owner_email_recovery_exclusions from public,anon,authenticated,service_role;
grant select,insert,delete on public.owner_account_email_matches to service_role;
grant select,insert on public.owner_email_recovery_exclusions to service_role;
create index owner_email_matches_expiry on public.owner_account_email_matches(expires_at);
create function public.owner_email_exclude_removed_account()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.owner_email_recovery_exclusions(account_hash)
  values(encode(sha256(convert_to(old.user_id,'UTF8')),'hex')) on conflict do nothing;
  return old;
end;
$$;
revoke all on function public.owner_email_exclude_removed_account() from public,anon,authenticated;
grant execute on function public.owner_email_exclude_removed_account() to service_role;
create trigger owner_directory_prevent_recovery before delete on public.owner_account_directory
for each row execute function public.owner_email_exclude_removed_account();
create trigger owner_email_matches_prevent_recovery before delete on public.owner_account_email_matches
for each row execute function public.owner_email_exclude_removed_account();
create function public.owner_directory_erase_account(p_user_id text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_user_id !~ '^google:[a-zA-Z0-9_-]{1,255}$' or p_user_id is null then raise exception 'Invalid account'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id,0));
  insert into public.owner_email_recovery_exclusions(account_hash)
  values(encode(sha256(convert_to(p_user_id,'UTF8')),'hex')) on conflict do nothing;
  delete from public.owner_account_directory where user_id=p_user_id;
  delete from public.owner_account_email_matches where user_id=p_user_id;
end;
$$;
revoke all on function public.owner_directory_erase_account(text) from public,anon,authenticated;
grant execute on function public.owner_directory_erase_account(text) to service_role;
create or replace function public.owner_directory_record_signin(p_user_id text,p_email text)
returns void language plpgsql security invoker set search_path='' as $$
declare t timestamptz:=clock_timestamp();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id,0));
  insert into public.owner_account_directory(user_id,email,first_sign_in_at,last_sign_in_at,expires_at)
  values(p_user_id,p_email,t,t,t+interval '90 days')
  on conflict(user_id) do update set email=excluded.email,
    first_sign_in_at=case when owner_account_directory.expires_at<=t then t else owner_account_directory.first_sign_in_at end,
    last_sign_in_at=greatest(owner_account_directory.last_sign_in_at,t),
    expires_at=greatest(owner_account_directory.last_sign_in_at,t)+interval '90 days';
  -- A real new sign-in supersedes historical recovery, without reviving it later.
  delete from public.owner_account_email_matches where user_id=p_user_id;
end;
$$;
revoke all on function public.owner_directory_record_signin(text,text) from public,anon,authenticated;
grant execute on function public.owner_directory_record_signin(text,text) to service_role;
create or replace function public.owner_directory_purge_expired()
returns bigint language sql security invoker set search_path='' as $$
  with directory_removed as (delete from public.owner_account_directory where expires_at<=now() returning 1),
       matches_removed as (delete from public.owner_account_email_matches where expires_at<=now() returning 1)
  select (select count(*) from directory_removed)+(select count(*) from matches_removed);
$$;
revoke all on function public.owner_directory_purge_expired() from public,anon,authenticated;
grant execute on function public.owner_directory_purge_expired() to service_role;
commit;
