-- Supabase CLI unavailable in this worktree; reviewed SQL migration tested with PGlite.
alter table public.attendance_classes add column credit_before date;
alter table public.attendance_enrollments add column nickname text check(length(nickname)<=80);
alter table public.attendance_records drop constraint attendance_records_source_check;
alter table public.attendance_records add constraint attendance_records_source_check check(source in ('check_in','manual','finalized','instructor_credit'));

create function public.attendance_set_nickname(p_actor text,p_class_id uuid,p_enrollment_id uuid,p_nickname text)
returns jsonb language plpgsql set search_path=public as $$
begin
 if not exists(select 1 from attendance_classes where id=p_class_id and instructor_email=p_actor) then raise exception 'Class not found or access denied'; end if;
 if length(coalesce(p_nickname,''))>80 then raise exception 'Nickname must be 80 characters or fewer'; end if;
 update attendance_enrollments set nickname=nullif(trim(p_nickname),'') where id=p_enrollment_id and class_id=p_class_id;
 if not found then raise exception 'Student not found'; end if;
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.attendance_set_nickname(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.attendance_set_nickname(text,uuid,uuid,text) to service_role;

create function public.attendance_grant_transition_credit(p_enrollment_id uuid)
returns void language plpgsql set search_path=public as $$
declare e attendance_enrollments; c attendance_classes; dt date; mid uuid; old_record attendance_records;
begin
 select * into e from attendance_enrollments where id=p_enrollment_id for update;
 select * into c from attendance_classes where id=e.class_id for update;
 if c.credit_before is null or e.effective_to is not null then return; end if;
 -- Instructor policy: the roster-entry date is not the class-attendance start date.
 update attendance_enrollments set effective_from=least(e.effective_from,c.start_date) where id=e.id;
 for dt in select d::date from generate_series(c.start_date::timestamp,least(c.end_date,c.credit_before-1,((clock_timestamp() at time zone c.timezone)::date)-1)::timestamp,interval '1 day') d
  where extract(dow from d)::int=any(c.days)
  and not exists(select 1 from attendance_schedule_exceptions x where x.class_id=c.id and x.date=d::date)
 loop
  -- A cancellation stays a cancellation; never recreate its meeting.
  if exists(select 1 from attendance_meetings where class_id=c.id and meeting_date=dt and status='cancelled' and merged_into is null) then continue; end if;
  select id into mid from attendance_meetings where class_id=c.id and meeting_date=dt and status<>'cancelled' and merged_into is null for update;
  if mid is null then
   insert into attendance_meetings(class_id,instructor_email,meeting_date,status,opened_at,expires_at,closed_at)
   values(c.id,c.instructor_email,dt,'closed',(dt+c.start_time) at time zone c.timezone,(dt+c.end_time) at time zone c.timezone,clock_timestamp()) returning id into mid;
   insert into attendance_meeting_events(meeting_id,actor_email,action,note) values(mid,c.instructor_email,'transition_credit','Instructor-granted credit; not a QR roll call');
  end if;
  if exists(select 1 from attendance_meetings where id=mid and status<>'closed') then raise exception 'Close the earlier attendance window before granting credit'; end if;
  insert into attendance_roster(meeting_id,enrollment_id,name,college_id,email) values(mid,e.id,e.name,e.college_id,e.email) on conflict do nothing;
  select * into old_record from attendance_records where meeting_id=mid and enrollment_id=e.id;
  if old_record.status='absent' then
   insert into attendance_corrections(meeting_id,enrollment_id,old_status,new_status,actor_email,note,operation_id,request_payload)
   values(mid,e.id,'absent','present',c.instructor_email,'Instructor-granted credit before September 14, 2026',gen_random_uuid(),jsonb_build_object('previous',to_jsonb(old_record),'policy','transition_credit'));
  end if;
  insert into attendance_records(meeting_id,enrollment_id,status,source) values(mid,e.id,'present','instructor_credit')
  on conflict(meeting_id,enrollment_id) do update set status='present',source='instructor_credit',revision=attendance_records.revision+1,updated_at=clock_timestamp()
  where attendance_records.status='absent';
 end loop;
end $$;
revoke all on function public.attendance_grant_transition_credit(uuid) from public,anon,authenticated;
grant execute on function public.attendance_grant_transition_credit(uuid) to service_role;
create function public.attendance_new_student_credit() returns trigger language plpgsql set search_path=public as $$
begin perform attendance_grant_transition_credit(new.id); return new; end $$;
revoke all on function public.attendance_new_student_credit() from public,anon,authenticated;
create trigger attendance_new_student_credit after insert on public.attendance_enrollments for each row execute function public.attendance_new_student_credit();

create or replace function public.attendance_class_summary(p_actor text,p_class_id uuid)
returns jsonb language plpgsql set search_path=public as $$
declare c attendance_classes; result jsonb; today date;
begin
 select * into c from attendance_classes where id=p_class_id and instructor_email=p_actor;
 if c.id is null then raise exception 'Instructor access required'; end if;
 today := (clock_timestamp() at time zone c.timezone)::date;
 select coalesce(jsonb_agg(to_jsonb(x) order by lower(x.last_name) nulls last,lower(x.first_name) nulls last,x.name,x.id),'[]') into result from (
  select e.id,e.name,e.email,e.first_name,e.last_name,e.photo_url,e.nickname,
   count(r.meeting_id) filter(where r.status='present' and m.id is not null) as present,
   count(r.meeting_id) filter(where r.status='absent' and m.id is not null) as absent
  from attendance_enrollments e
  left join attendance_records r on r.enrollment_id=e.id
  left join attendance_meetings m on m.id=r.meeting_id and m.class_id=c.id and m.merged_into is null and (m.status='closed' or (m.status='open' and r.status='present'))
   and m.meeting_date>=e.effective_from and (e.effective_to is null or m.meeting_date<=e.effective_to)
  where e.class_id=c.id and e.effective_from<=today and (e.effective_to is null or e.effective_to>=today)
  group by e.id
 ) x;
 return jsonb_build_object('classId',c.id,'students',result);
end $$;
