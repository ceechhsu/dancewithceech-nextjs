-- Student attendance uses a short-lived email code, not a password or Google account.
create table public.attendance_email_challenges (
 id uuid primary key default gen_random_uuid(),
 email text not null check(email=lower(trim(email))),
 code_hash text not null,
 expires_at timestamptz not null,
 attempts integer not null default 0 check(attempts between 0 and 5),
 consumed_at timestamptz,
 created_at timestamptz not null default clock_timestamp()
);
create index attendance_email_challenges_lookup on public.attendance_email_challenges(email,created_at desc);
alter table public.attendance_email_challenges enable row level security;
revoke all on public.attendance_email_challenges from anon, authenticated;
grant all on public.attendance_email_challenges to service_role;

create function public.attendance_email_code(p_action text,p_email text,p_code_hash text default null)
returns jsonb language plpgsql set search_path=public as $$
declare c attendance_email_challenges; eligible boolean; enrollment_end date; begin
 if p_email is null or p_email<>lower(trim(p_email)) then raise exception 'Enter a valid email address'; end if;
 eligible:=exists(select 1 from attendance_enrollments e join attendance_classes cl on cl.id=e.class_id
  where e.email=p_email and not cl.archived and e.effective_from<=((clock_timestamp() at time zone cl.timezone)::date)
  and (e.effective_to is null or e.effective_to>=((clock_timestamp() at time zone cl.timezone)::date)));
 select max(least(cl.end_date,coalesce(e.effective_to,cl.end_date))) into enrollment_end from attendance_enrollments e join attendance_classes cl on cl.id=e.class_id
  where e.email=p_email and not cl.archived and e.effective_from<=((clock_timestamp() at time zone cl.timezone)::date)
  and (e.effective_to is null or e.effective_to>=((clock_timestamp() at time zone cl.timezone)::date));
 if p_action='request' then
  if exists(select 1 from attendance_email_challenges where email=p_email and created_at>clock_timestamp()-interval '60 seconds') then
   return jsonb_build_object('ok',true,'cooldown',true);
  end if;
  update attendance_email_challenges set consumed_at=clock_timestamp() where email=p_email and consumed_at is null;
  insert into attendance_email_challenges(email,code_hash,expires_at) values(p_email,p_code_hash,clock_timestamp()+interval '10 minutes');
  -- Always return the same result so this endpoint does not reveal roster membership.
  return jsonb_build_object('ok',true,'eligible',eligible);
 elsif p_action='verify' then
  select * into c from attendance_email_challenges where email=p_email and consumed_at is null order by created_at desc limit 1 for update;
  if c.id is null or c.expires_at<=clock_timestamp() or c.attempts>=5 or not eligible then return jsonb_build_object('ok',false); end if;
  if c.code_hash<>p_code_hash then update attendance_email_challenges set attempts=attempts+1 where id=c.id; return jsonb_build_object('ok',false); end if;
  update attendance_email_challenges set consumed_at=clock_timestamp() where id=c.id;
  return jsonb_build_object('ok',true,'expiresOn',enrollment_end);
 end if;
 raise exception 'Unknown email-code action';
end $$;
revoke all on function public.attendance_email_code(text,text,text) from public,anon,authenticated;
grant execute on function public.attendance_email_code(text,text,text) to service_role;
