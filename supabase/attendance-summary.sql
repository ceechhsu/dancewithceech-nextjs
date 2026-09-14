-- Private instructor summary; callable only by the authenticated server.
create or replace function public.attendance_class_summary(p_actor text, p_class_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare c attendance_classes; result jsonb; today date;
begin
 select * into c from attendance_classes where id=p_class_id and instructor_email=p_actor;
 if c.id is null then raise exception 'Instructor access required'; end if;
 today := (clock_timestamp() at time zone c.timezone)::date;
 select coalesce(jsonb_agg(to_jsonb(x) order by lower(x.last_name) nulls last,lower(x.first_name) nulls last,x.name,x.id),'[]') into result from (
  select e.id,e.name,e.email,e.first_name,e.last_name,e.photo_url,
   count(r.meeting_id) filter(where r.status='present' and m.id is not null) as present,
   count(r.meeting_id) filter(where r.status='absent' and m.id is not null) as absent
  from attendance_enrollments e
  left join attendance_records r on r.enrollment_id=e.id
  left join attendance_meetings m on m.id=r.meeting_id and m.class_id=c.id and m.status='closed'
   -- Saved meetings remain history even when the planned class range changes.
   and m.meeting_date>=e.effective_from and (e.effective_to is null or m.meeting_date<=e.effective_to)
  where e.class_id=c.id and e.effective_from<=today and (e.effective_to is null or e.effective_to>=today)
  group by e.id
 ) x;
 return jsonb_build_object('classId',c.id,'students',result);
end $$;
revoke all on function public.attendance_class_summary(text,uuid) from public,anon,authenticated;
grant execute on function public.attendance_class_summary(text,uuid) to service_role;
