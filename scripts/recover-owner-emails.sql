-- One-time owner-authorized recovery. No personal data is returned or committed.
-- Optional live guard: SET LOCAL dwc.recovery_expected_count='44' after BEGIN.
begin;
-- Serialize imports with sign-in, erasure and cleanup before reading eligibility.
lock table public.owner_account_directory,public.owner_account_email_matches,public.owner_email_recovery_exclusions in share row exclusive mode;
create temp table owner_recovery_directory_before on commit drop as
select user_id,first_sign_in_at,last_sign_in_at,expires_at from public.owner_account_directory;
create temp table owner_recovery_candidates on commit drop as
with observed as (
 select user_id as id from public.beatfirst_preview_attempts
 union select account from public.trainer_scores
 union select user_id from public.owner_account_directory where expires_at>now()
), missing as (
 select id,case when left(id,7)='google:' then substr(id,8) else id end as sub
 from observed o where not exists(select 1 from public.owner_account_directory d where d.user_id=o.id)
), evidence as (
 select case when left(google_sub,7)='google:' then substr(google_sub,8) else google_sub end as sub,lower(trim(email)) as email
 from public.attendance_enrollments where google_sub is not null and trim(email)<>''
 union all
 select case when left(google_sub,7)='google:' then substr(google_sub,8) else google_sub end,lower(trim(actor_email))
 from public.attendance_attempts where google_sub is not null and trim(actor_email)<>''
)
select m.id as user_id,min(e.email) as email,count(distinct e.email) as distinct_emails
from missing m join evidence e on e.sub=m.sub
group by m.id;
do $$
declare expected text:=current_setting('dwc.recovery_expected_count',true); eligible bigint;
begin
 if exists(select 1 from owner_recovery_candidates where distinct_emails<>1) then raise exception 'Ambiguous historical email evidence; no recovery applied'; end if;
 select count(*) into eligible from owner_recovery_candidates c
 where not exists(select 1 from public.owner_email_recovery_exclusions x where x.account_hash=encode(sha256(convert_to(c.user_id,'UTF8')),'hex'));
 if expected is not null and expected<>'' and eligible<>expected::bigint then raise exception 'Recovery count changed; recheck before applying'; end if;
end;
$$;
with matched_time as (select clock_timestamp() as t)
insert into public.owner_account_email_matches(user_id,email,matched_at,expires_at)
select c.user_id,c.email,t,t+interval '90 days' from owner_recovery_candidates c cross join matched_time
where c.distinct_emails=1
 and not exists(select 1 from public.owner_email_recovery_exclusions x where x.account_hash=encode(sha256(convert_to(c.user_id,'UTF8')),'hex'))
on conflict(user_id) do nothing;
do $$
begin
 if exists(
  (select user_id,first_sign_in_at,last_sign_in_at,expires_at from public.owner_account_directory except select * from owner_recovery_directory_before)
  union all
  (select * from owner_recovery_directory_before except select user_id,first_sign_in_at,last_sign_in_at,expires_at from public.owner_account_directory)
 ) then raise exception 'Recorded sign-in data changed'; end if;
end;
$$;
commit;
