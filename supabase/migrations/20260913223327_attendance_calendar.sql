-- Additive calendar API: deliberately leaves the deployed attendance_api unchanged.
alter table public.attendance_records add column checked_in_at timestamptz;
update public.attendance_records r set checked_in_at=r.updated_at
 where source='check_in' and revision=1 and not exists
 (select 1 from public.attendance_corrections a where a.meeting_id=r.meeting_id and a.enrollment_id=r.enrollment_id);
create function public.attendance_check_in_time() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='UPDATE' then new.checked_in_at:=old.checked_in_at;
 else new.checked_in_at:=case when new.source='check_in' then clock_timestamp() else null end;
 end if;
 return new;
end $$;
create trigger attendance_check_in_time before insert or update on public.attendance_records for each row execute function public.attendance_check_in_time();

alter table public.attendance_classes add column schedule_revision integer not null default 1;
create function public.attendance_schedule_revision() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 new.schedule_revision:=old.schedule_revision+case when (new.start_date,new.end_date,new.days,new.timezone,new.start_time,new.end_time) is distinct from (old.start_date,old.end_date,old.days,old.timezone,old.start_time,old.end_time) then 1 else 0 end;
 return new;
end $$;
create trigger attendance_schedule_revision before update on public.attendance_classes for each row execute function public.attendance_schedule_revision();
create table public.attendance_schedule_exceptions (
 class_id uuid not null references public.attendance_classes(id), date date not null,
 kind text not null check(kind in ('holiday','cancelled')), reason text not null default '' check(length(reason)<=2000),
 primary key(class_id,date)
);
create table public.attendance_schedule_events (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.attendance_classes(id),
 actor_email text not null, action text not null, payload jsonb not null, created_at timestamptz not null default clock_timestamp()
);
create trigger attendance_schedule_audit_immutable before update or delete on public.attendance_schedule_events for each row execute function public.attendance_immutable_audit();
create table public.attendance_change_requests (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null, enrollment_id uuid not null,
 requested_status text not null check(requested_status in ('present','absent')),
 explanation text not null check(length(trim(explanation)) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','kept')),
 record_revision integer not null, response text check(length(response)<=2000),
 created_at timestamptz not null default clock_timestamp(), reviewed_at timestamptz, reviewer_email text,
 foreign key(meeting_id,enrollment_id) references public.attendance_roster(meeting_id,enrollment_id)
);
create unique index attendance_one_pending_request on public.attendance_change_requests(meeting_id,enrollment_id) where status='pending';
create function public.attendance_request_immutable() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if tg_op='DELETE' then raise exception 'Request history is immutable'; end if;
 if old.status<>'pending' or new.status='pending' or
 (new.id,new.meeting_id,new.enrollment_id,new.requested_status,new.explanation,new.record_revision,new.created_at) is distinct from
 (old.id,old.meeting_id,old.enrollment_id,old.requested_status,old.explanation,old.record_revision,old.created_at)
 then raise exception 'Request history is immutable'; end if;
 return new;
end $$;
create trigger attendance_request_immutable before update or delete on public.attendance_change_requests for each row execute function public.attendance_request_immutable();

-- The class lock is shared with schedule changes, including legacy opening of QR sessions.
create function public.attendance_exception_gate() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.status='open' then
  perform 1 from attendance_classes where id=new.class_id for update;
  if exists(select 1 from attendance_schedule_exceptions where class_id=new.class_id and date=new.meeting_date) then raise exception 'This date is excluded from attendance'; end if;
 end if;
 return new;
end $$;
create trigger attendance_exception_gate before insert or update on public.attendance_meetings for each row execute function public.attendance_exception_gate();

do $$ declare t text; begin
 foreach t in array array['attendance_schedule_exceptions','attendance_schedule_events','attendance_change_requests'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.attendance_calendar_api(p_actor text,p_sub text,p_instructor boolean,p_resource text,p_action text,p_body jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 c attendance_classes; m attendance_meetings; e attendance_enrollments; rec attendance_records; req attendance_change_requests;
 cid uuid; mid uuid; eid uuid; rid uuid; dt date; from_date date; to_date date; weekdays integer[];
 result jsonb; exceptions jsonb; enrollments jsonb; meetings jsonb; requests jsonb; owner boolean; n timestamptz;
begin
 if p_actor is null or p_actor<>lower(trim(p_actor)) or coalesce(p_sub,'')='' then raise exception 'Verified Google identity required'; end if;
 if not coalesce((p_resource='calendar' and p_action='list') or (p_resource='schedule' and p_action in ('list','save','exclude','restore')) or (p_resource='requests' and p_action in ('list','create','review')),false) then raise exception 'Unknown calendar action'; end if;
 cid:=(p_body->>'classId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 select * into c from attendance_classes where id=cid;
 owner:=coalesce(p_instructor,false) and c.instructor_email=p_actor;
 if c.id is null or (not coalesce(owner,false) and not exists(select 1 from attendance_enrollments where class_id=cid and email=p_actor and (google_sub is null or google_sub=p_sub))) then raise exception 'Class not found or access denied'; end if;
 if (p_resource='schedule' or p_action='review') and not coalesce(owner,false) then raise exception 'Instructor access required'; end if;
 if p_resource='calendar' then
  for m in select * from attendance_meetings mm where mm.class_id=cid and mm.status='open' and mm.expires_at<=clock_timestamp() order by mm.id for update loop
   perform attendance_finalize(m.id);
  end loop;
 end if;
 n:=clock_timestamp(); dt:=(n at time zone c.timezone)::date;

 if p_resource='schedule' and p_action<>'list' then
  select * into c from attendance_classes where id=cid for update;
  if p_action='save' then
   if (p_body->>'expectedRevision')::integer is distinct from c.schedule_revision then return jsonb_build_object('error','The schedule changed. Reload and review the current dates.','code','conflict'); end if;
   from_date:=(p_body->>'start_date')::date; to_date:=(p_body->>'end_date')::date;
   if from_date is null or to_date is null or to_date<from_date or to_date>(from_date+interval '2 years')::date then raise exception 'Choose a valid date range of at most two years'; end if;
   if jsonb_typeof(p_body->'days') is distinct from 'array' then raise exception 'Choose meeting weekdays'; end if;
   weekdays:=array(select jsonb_array_elements_text(p_body->'days')::integer);
   if cardinality(weekdays) not between 1 and 7 or exists(select 1 from unnest(weekdays) d where d is null or d not between 0 and 6) or cardinality(weekdays)<>(select count(distinct d) from unnest(weekdays) d) then raise exception 'Choose unique weekdays between 0 and 6'; end if;
   if (from_date>c.start_date or to_date<c.end_date) and coalesce((p_body->>'confirmShorten')::boolean,false) is not true then raise exception 'Confirm shortening the class date range'; end if;
   update attendance_classes set start_date=from_date,end_date=to_date,days=weekdays where id=cid returning * into c;
  else
   dt:=(p_body->>'date')::date;
   if dt is null or (dt not between c.start_date and c.end_date and not exists(select 1 from attendance_meetings where class_id=cid and meeting_date=dt)) then raise exception 'Choose a date in the class range or an existing meeting'; end if;
   if p_action='exclude' then
    if p_body->>'kind' is null or p_body->>'kind' not in ('holiday','cancelled') or length(coalesce(p_body->>'reason',''))>2000 then raise exception 'Choose an exception kind and a reason of at most 2000 characters'; end if;
    insert into attendance_schedule_exceptions(class_id,date,kind,reason) values(cid,dt,p_body->>'kind',coalesce(p_body->>'reason','')) on conflict(class_id,date) do update set kind=excluded.kind,reason=excluded.reason;
    for m in select * from attendance_meetings where class_id=cid and meeting_date=dt order by id for update loop
     if m.status<>'cancelled' then
      insert into attendance_meeting_events(meeting_id,actor_email,action,note) values(m.id,p_actor,'cancel',coalesce(p_body->>'reason',''));
      perform attendance_finalize(m.id,true);
     end if;
    end loop;
   else
    delete from attendance_schedule_exceptions where class_id=cid and date=dt;
    for m in select * from attendance_meetings where class_id=cid and meeting_date=dt and status='cancelled' order by id for update loop
     update attendance_meetings set status='closed',closed_at=coalesce(closed_at,clock_timestamp()),token=null,token_slot=null,latitude=null,longitude=null,location_timestamp=null where id=m.id;
     insert into attendance_meeting_events(meeting_id,actor_email,action,note) values(m.id,p_actor,'restore','Restored as closed; existing attendance preserved');
    end loop;
   end if;
  end if;
  insert into attendance_schedule_events(class_id,actor_email,action,payload) values(cid,p_actor,p_action,p_body);
 end if;

 if p_resource='requests' and p_action in ('create','review') then
  if p_action='review' then
   rid:=(p_body->>'requestId')::uuid;
   select * into req from attendance_change_requests where id=rid;
   mid:=req.meeting_id; eid:=req.enrollment_id;
  else mid:=(p_body->>'meetingId')::uuid; eid:=(p_body->>'enrollmentId')::uuid;
  end if;
  select * into m from attendance_meetings where id=mid and class_id=cid for update;
  if m.id is null then raise exception 'Meeting not found or access denied'; end if;
  select * into e from attendance_enrollments where id=eid and class_id=cid;
  if p_action='create' and (e.id is null or e.email is distinct from p_actor or (e.google_sub is not null and e.google_sub<>p_sub)) then raise exception 'Enrollment not found or access denied'; end if;
  select * into rec from attendance_records where meeting_id=mid and enrollment_id=eid for update;
  if p_action='create' then
   if m.status<>'closed' or rec.meeting_id is null then raise exception 'Choose a completed, non-cancelled attendance record'; end if;
   if p_body->>'requested_status' is null or p_body->>'requested_status' not in ('present','absent') or p_body->>'requested_status'=rec.status then raise exception 'Choose a different attendance status'; end if;
   if length(trim(coalesce(p_body->>'explanation',''))) not between 1 and 2000 then raise exception 'Explain the request in 1 to 2000 characters'; end if;
   if exists(select 1 from attendance_change_requests where meeting_id=mid and enrollment_id=eid and status='pending') then raise exception 'A pending request already exists for this meeting'; end if;
   insert into attendance_change_requests(meeting_id,enrollment_id,requested_status,explanation,record_revision) values(mid,eid,p_body->>'requested_status',trim(p_body->>'explanation'),rec.revision) returning * into req;
  else
   select * into req from attendance_change_requests where id=rid for update;
   if p_body->>'decision' is null or p_body->>'decision' not in ('approved','kept') or length(coalesce(p_body->>'response',''))>2000 then raise exception 'Choose a review decision and response of at most 2000 characters'; end if;
   if req.status<>'pending' then
    if req.status=p_body->>'decision' and coalesce(req.response,'')=coalesce(p_body->>'response','') then return jsonb_build_object('request',to_jsonb(req)-'reviewer_email','duplicate',true); end if;
    return jsonb_build_object('error','This request has already been reviewed.','code','conflict');
   end if;
   if m.status<>'closed' or rec.meeting_id is null then raise exception 'Choose a completed, non-cancelled attendance record'; end if;
   if (p_body->>'expectedRevision')::integer is distinct from rec.revision then return jsonb_build_object('error','This attendance record changed. Review its current status before resolving the request.','code','conflict','record',to_jsonb(rec)); end if;
   if p_body->>'decision'='approved' then
    insert into attendance_corrections(meeting_id,enrollment_id,old_status,new_status,actor_email,note,operation_id,request_payload) values(mid,eid,rec.status,req.requested_status,p_actor,coalesce(p_body->>'response',''),req.id,p_body);
    update attendance_records set status=req.requested_status,source='manual',revision=revision+1,updated_at=clock_timestamp() where meeting_id=mid and enrollment_id=eid returning * into rec;
   end if;
   update attendance_change_requests set status=p_body->>'decision',response=coalesce(p_body->>'response',''),reviewed_at=clock_timestamp(),reviewer_email=p_actor where id=rid returning * into req;
  end if;
  return jsonb_build_object('request',to_jsonb(req)-'reviewer_email','record',to_jsonb(rec));
 end if;

 select coalesce(jsonb_agg(jsonb_build_object('date',x.date,'kind',x.kind,'reason',x.reason) order by x.date),'[]') into exceptions from attendance_schedule_exceptions x where class_id=cid;
 if p_resource='schedule' then return jsonb_build_object('class',to_jsonb(c),'exceptions',exceptions); end if;
 select coalesce(jsonb_agg((to_jsonb(r)-'reviewer_email') || case when owner then jsonb_build_object('student_name',ee.name,'email',ee.email,'meeting_date',mm.meeting_date,'current_status',ar.status,'current_revision',ar.revision) else '{}'::jsonb end order by r.created_at desc),'[]') into requests
 from attendance_change_requests r join attendance_enrollments ee on ee.id=r.enrollment_id join attendance_meetings mm on mm.id=r.meeting_id
 left join attendance_records ar on ar.meeting_id=r.meeting_id and ar.enrollment_id=r.enrollment_id
 where mm.class_id=cid and ((owner and p_resource='requests') or (ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub)));
 if p_resource='requests' then return jsonb_build_object('requests',requests); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'effective_from',effective_from,'effective_to',effective_to) order by effective_from),'[]') into enrollments
 from attendance_enrollments where class_id=cid and email=p_actor and (google_sub is null or google_sub=p_sub);
 select coalesce(jsonb_agg(jsonb_build_object('id',mm.id,'meeting_date',mm.meeting_date,'status',mm.status,'record',
  (select to_jsonb(ar) from attendance_records ar join attendance_enrollments ee on ee.id=ar.enrollment_id where ar.meeting_id=mm.id and ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub) order by ee.effective_from desc limit 1)) order by mm.meeting_date,mm.opened_at),'[]') into meetings
 from attendance_meetings mm where mm.class_id=cid;
 return jsonb_build_object('class',to_jsonb(c)-'location_label','today',(n at time zone c.timezone)::date,'now',n,'enrollments',enrollments,'exceptions',exceptions,'meetings',meetings,'requests',requests);
end $$;
revoke all on function public.attendance_calendar_api(text,text,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.attendance_calendar_api(text,text,boolean,text,text,jsonb) to service_role;
revoke all on function public.attendance_check_in_time(),public.attendance_schedule_revision(),public.attendance_request_immutable(),public.attendance_exception_gate() from public,anon,authenticated;

-- Schedule edits change future planning, never completed attendance history.
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
   and m.meeting_date>=e.effective_from and (e.effective_to is null or m.meeting_date<=e.effective_to)
  where e.class_id=c.id and e.effective_from<=today and (e.effective_to is null or e.effective_to>=today)
  group by e.id
 ) x;
 return jsonb_build_object('classId',c.id,'students',result);
end $$;
revoke all on function public.attendance_class_summary(text,uuid) from public,anon,authenticated;
grant execute on function public.attendance_class_summary(text,uuid) to service_role;
