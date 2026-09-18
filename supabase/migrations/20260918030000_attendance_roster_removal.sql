alter table public.attendance_enrollments add column removed_at timestamptz;
create function public.attendance_remove_student(p_actor text,p_class_id uuid,p_enrollment_id uuid,p_confirmation text)
returns jsonb language plpgsql set search_path=public as $$
declare target attendance_enrollments;
begin
 if p_confirmation is distinct from 'delete' then raise exception 'Please type delete to confirm'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 if not exists(select 1 from attendance_classes where id=p_class_id and instructor_email=p_actor) then raise exception 'Class not found or access denied'; end if;
 -- Match check-in's meeting-before-enrollment lock order.
 perform id from attendance_meetings where class_id=p_class_id and status='open' order by id for update;
 select * into target from attendance_enrollments where id=p_enrollment_id and class_id=p_class_id for update;
 if target.id is null then raise exception 'Student not found'; end if;
 -- User-approved eligibility is missing profile fields, not proof of never signing in.
 if nullif(trim(target.first_name),'') is not null or nullif(trim(target.last_name),'') is not null or nullif(trim(target.photo_url),'') is not null then
  raise exception 'This student now has profile information and cannot be deleted from this control. Refresh the roster.';
 end if;
 if target.removed_at is null then
  update attendance_enrollments set removed_at=clock_timestamp() where id=target.id;
  insert into attendance_schedule_events(class_id,actor_email,action,payload) values(p_class_id,p_actor,'remove_student',jsonb_build_object('enrollment_id',target.id,'email',target.email,'history_preserved',true));
 end if;
 return jsonb_build_object('removed',true);
end $$;
revoke all on function public.attendance_remove_student(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.attendance_remove_student(text,uuid,uuid,text) to service_role;

-- Extend the current deployed functions, retaining previous fixes and grants.
do $$ declare definition text;
begin
 definition:=pg_get_functiondef('public.attendance_class_summary(text,uuid)'::regprocedure);
 if position('where e.class_id=c.id and e.effective_from<=today' in definition)=0 then raise exception 'Unexpected summary definition'; end if;
 execute replace(definition,'where e.class_id=c.id and e.effective_from<=today','where e.removed_at is null and e.class_id=c.id and e.effective_from<=today');
 definition:=pg_get_functiondef('public.attendance_api(text,text,boolean,text,text,jsonb)'::regprocedure);
 if position('if rr.enrollment_id is null or e.email' in definition)=0 then raise exception 'Unexpected check-in definition'; end if;
 definition:=replace(definition,'if rr.enrollment_id is null or e.email','if e.removed_at is not null or rr.enrollment_id is null or e.email');
 definition:=replace(definition,'from attendance_enrollments where class_id=c.id and effective_from<=dt','from attendance_enrollments where removed_at is null and class_id=c.id and effective_from<=dt');
 execute definition;
 definition:=pg_get_functiondef('public.attendance_add_student(text,text,boolean,uuid,text,text,text)'::regprocedure);
 if position('-- Lock the meeting before its snapshot' in definition)=0 then raise exception 'Unexpected add-student definition'; end if;
 definition:=replace(definition,'-- Lock the meeting before its snapshot',E'if e.removed_at is not null then\n update attendance_enrollments set removed_at=null where id=e.id returning * into e;\n insert into attendance_schedule_events(class_id,actor_email,action,payload) values(c.id,p_actor,\'restore_student\',jsonb_build_object(\'enrollment_id\',e.id));\n end if;\n -- Lock the meeting before its snapshot');
 execute definition;
end $$;
