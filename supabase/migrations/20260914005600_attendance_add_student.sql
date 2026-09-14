-- Service-only operation: authorization and live-roster insertion are atomic.
create function public.attendance_add_student(p_actor text,p_sub text,p_instructor boolean,p_class_id uuid,p_email text,p_first text,p_last text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c attendance_classes; e attendance_enrollments; m attendance_meetings; dt date; normalized text; existed boolean;
begin
 if not coalesce(p_instructor,false) or coalesce(p_sub,'')='' or p_actor is null then raise exception 'Instructor access required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 select * into c from attendance_classes where id=p_class_id and instructor_email=p_actor for update;
 if c.id is null then raise exception 'Class not found or access denied'; end if;
 if c.archived then raise exception 'Restore this class before adding students'; end if;
 dt:=(clock_timestamp() at time zone c.timezone)::date;
 if dt>c.end_date then raise exception 'This class has ended'; end if;
 normalized:=lower(trim(p_email));
 if normalized is null or length(normalized)>200 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid Google sign-in email'; end if;
 if length(coalesce(p_first,''))>80 or length(coalesce(p_last,''))>80 then raise exception 'Names must be 80 characters or fewer'; end if;
 select * into e from attendance_enrollments where class_id=c.id and email=normalized and (effective_to is null or effective_to>=dt) order by effective_from limit 1;
 existed:=e.id is not null;
 if not existed then
  insert into attendance_enrollments(class_id,name,first_name,last_name,email,effective_from)
  values(c.id,coalesce(nullif(trim(concat_ws(' ',nullif(trim(p_first),''),nullif(trim(p_last),''))),''),normalized),nullif(trim(p_first),''),nullif(trim(p_last),''),normalized,greatest(dt,c.start_date)) returning * into e;
 end if;
 -- Lock the meeting before its snapshot, like check-in/finalization. No past records are created.
 for m in select * from attendance_meetings where class_id=c.id and status='open' and expires_at>clock_timestamp() and meeting_date>=e.effective_from and (e.effective_to is null or meeting_date<=e.effective_to) for update loop
  if m.expires_at>clock_timestamp() then
   insert into attendance_roster(meeting_id,enrollment_id,name,college_id,email) values(m.id,e.id,e.name,e.college_id,e.email) on conflict do nothing;
  end if;
 end loop;
 return jsonb_build_object('student',to_jsonb(e),'alreadyEnrolled',existed);
end $$;
revoke all on function public.attendance_add_student(text,text,boolean,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.attendance_add_student(text,text,boolean,uuid,text,text,text) to service_role;
