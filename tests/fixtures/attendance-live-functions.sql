CREATE OR REPLACE FUNCTION public.attendance_api(p_actor text, p_sub text, p_instructor boolean, p_resource text, p_action text, p_body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 c attendance_classes; m attendance_meetings; e attendance_enrollments; rr attendance_roster; rec attendance_records; audit attendance_corrections;
 cid uuid; mid uuid; rowdata jsonb; result jsonb; items jsonb; reason text; n timestamptz; dt date; raw_token text;
begin
 if p_resource is null or p_action is null or not (
  (p_resource='classes' and p_action in ('list','create','update')) or
  (p_resource='enrollments' and p_action in ('list','import','update','drop')) or
  (p_resource='meetings' and p_action in ('list','open','token','close','extend','cancel')) or
  (p_resource='history' and p_action='list') or
  (p_resource='check-in' and p_action='check_in') or
  (p_resource in ('corrections','sync') and p_action='save')
 ) then raise exception 'Unknown attendance resource or action'; end if;
 if p_actor is null or p_actor<>lower(trim(p_actor)) or coalesce(p_sub,'')='' then raise exception 'Verified Google identity required'; end if;
 -- Serialize all writes by instructor and student identity. Meeting row locks additionally
 -- serialize check-in with close/correction/token rotation across different actors.
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 if p_resource not in ('classes','history','check-in','push') and not p_instructor then raise exception 'Instructor access required'; end if;
 for m in select * from attendance_meetings where status='open' and expires_at<=clock_timestamp() and
  (instructor_email=p_actor or p_resource='check-in' or exists(select 1 from attendance_roster s join attendance_enrollments ee on ee.id=s.enrollment_id where s.meeting_id=attendance_meetings.id and ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub))) for update loop
  perform attendance_finalize(m.id);
 end loop;
 m:=null;
 if p_resource in ('classes','history') then update attendance_enrollments set google_sub=p_sub where email=p_actor and google_sub is null; end if;
 if p_resource='classes' and p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
   select cc.* from attendance_classes cc where
    (p_instructor and cc.instructor_email=p_actor) or
    (not cc.archived and (clock_timestamp() at time zone cc.timezone)::date between cc.start_date and cc.end_date and exists(select 1 from attendance_enrollments ee where ee.class_id=cc.id and ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub)
      and ee.effective_from <= (clock_timestamp() at time zone cc.timezone)::date and (ee.effective_to is null or ee.effective_to >= (clock_timestamp() at time zone cc.timezone)::date)))
   order by cc.year desc,cc.name
  ) x;
  return jsonb_build_object('classes',result,'instructor',p_instructor);
 elsif p_resource='history' and p_action='list' then
  select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('name',s.name,'class_id',mm.class_id,'meeting_date',mm.meeting_date,'class_name',cc.name)),'[]') into result
   from attendance_records r join attendance_roster s using(meeting_id,enrollment_id) join attendance_meetings mm on mm.id=r.meeting_id
   join attendance_classes cc on cc.id=mm.class_id join attendance_enrollments ee on ee.id=s.enrollment_id where ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub) and mm.status <> 'cancelled'
   and (nullif(p_body->>'classId','') is null or mm.class_id=(p_body->>'classId')::uuid);
  select coalesce(jsonb_agg(to_jsonb(cc)),'[]') into items from attendance_classes cc where exists
   (select 1 from attendance_meetings mm join attendance_roster s on s.meeting_id=mm.id join attendance_enrollments ee on ee.id=s.enrollment_id where mm.class_id=cc.id and ee.email=p_actor and (ee.google_sub is null or ee.google_sub=p_sub));
  return jsonb_build_object('records',result,'classes',items);
 elsif p_resource='check-in' and p_action='check_in' then
  if (select count(*) from attendance_attempts where actor_email=p_actor and created_at>clock_timestamp()-interval '1 minute')>=20 then
   return jsonb_build_object('error','Too many attempts. Wait one minute.');
  end if;
  select * into m from attendance_meetings where token=encode(sha256(convert_to(p_body->>'token','UTF8')),'hex') for update;
  n:=clock_timestamp();
  if m.id is null then reason:='This QR code has expired. Scan the current code.';
  elsif m.status<>'open' or m.expires_at<=n or (m.token_slot is null or n>=to_timestamp(m.token_slot)+interval '10 minutes') then reason:='This QR code has expired. Scan the current code.';
  else
   select s.* into rr from attendance_roster s join attendance_enrollments ee on ee.id=s.enrollment_id where s.meeting_id=m.id and ee.email=p_actor;
   select * into e from attendance_enrollments where id=rr.enrollment_id for update;
   select * into c from attendance_classes where id=m.class_id;
   dt:=(n at time zone c.timezone)::date;
   if rr.enrollment_id is null or e.email is distinct from p_actor or e.effective_from>dt or (e.effective_to is not null and e.effective_to<dt) then reason:='Your verified Google email is not actively enrolled in this class. Ask your instructor.';
   elsif c.archived then reason:='This class is archived. Ask your instructor.';
   elsif e.google_sub is not null and e.google_sub<>p_sub then reason:='This enrollment is linked to another Google account. Ask your instructor.';
   end if;
  end if;
  if reason is not null then
   insert into attendance_attempts(actor_email,google_sub,meeting_id,reason) values(p_actor,p_sub,m.id,reason);
   return jsonb_build_object('error',reason,'attemptId',(select id from attendance_attempts where actor_email=p_actor order by created_at desc limit 1));
  end if;
  -- Recheck the authoritative clock immediately before mutation. Never accept a prior slot.
  if m.expires_at<=clock_timestamp() or (m.token_slot is null or clock_timestamp()>=to_timestamp(m.token_slot)+interval '10 minutes') then
   insert into attendance_attempts(actor_email,google_sub,meeting_id,reason) values(p_actor,p_sub,m.id,'expired');
   return jsonb_build_object('error','This QR code has expired. Scan the current code.');
  end if;
  update attendance_enrollments set google_sub=p_sub where id=e.id and google_sub is null;
  insert into attendance_records(meeting_id,enrollment_id,status,source) values(m.id,rr.enrollment_id,'present','check_in') on conflict do nothing;
  select * into rec from attendance_records where meeting_id=m.id and enrollment_id=rr.enrollment_id;
  if rec.source='manual' and rec.status='absent' then
   reason:='Your instructor has marked this record absent. Ask them to review it.';
   insert into attendance_attempts(actor_email,google_sub,meeting_id,reason) values(p_actor,p_sub,m.id,reason);
   return jsonb_build_object('error',reason,'attemptId',(select id from attendance_attempts where actor_email=p_actor order by created_at desc limit 1));
  end if;
  return jsonb_build_object('record',to_jsonb(rec),'name',rr.name,'className',(select name from attendance_classes where id=m.class_id));
 end if;
 if not p_instructor then raise exception 'Instructor access required'; end if;
 if p_resource='classes' and p_action='create' then
  if not exists(select 1 from pg_timezone_names where name=p_body->>'timezone') then raise exception 'Choose a valid timezone'; end if;
  insert into attendance_classes(instructor_email,name,college,location_label,term,year,start_date,end_date,timezone,days,start_time,end_time)
  values(p_actor,trim(p_body->>'name'),coalesce(p_body->>'college',''),coalesce(p_body->>'location_label',''),p_body->>'term',(p_body->>'year')::int,
   (p_body->>'start_date')::date,(p_body->>'end_date')::date,p_body->>'timezone',array(select jsonb_array_elements_text(p_body->'days')::int),(p_body->>'start_time')::time,(p_body->>'end_time')::time) returning * into c;
  return jsonb_build_object('class',to_jsonb(c));
 end if;
 cid:=nullif(p_body->>'classId','')::uuid; mid:=nullif(p_body->>'meetingId','')::uuid;
 if mid is not null then
  select * into m from attendance_meetings where id=mid for update;
  if cid is not null and cid is distinct from m.class_id then raise exception 'Meeting does not belong to the selected class'; end if;
  cid:=m.class_id;
 end if;
 if p_resource in ('corrections','sync') then
  if p_resource='sync' then
   if jsonb_array_length(p_body->'operations')>200 then raise exception 'Sync at most 200 edits at a time'; end if;
   result:='[]';
   for rowdata in select value from jsonb_array_elements(p_body->'operations') loop
    begin
     result:=result||jsonb_build_array(attendance_api(p_actor,p_sub,p_instructor,'corrections','save',rowdata));
    exception when others then
     result:=result||jsonb_build_array(jsonb_build_object('operationId',rowdata->>'operationId','error',case when sqlstate='P0001' then sqlerrm else 'This change could not be saved. Review the meeting and try again.' end,'code','invalid'));
    end;
   end loop;
   return jsonb_build_object('results',result);
  end if;
 end if;
 select * into c from attendance_classes where id=cid and instructor_email=p_actor for update;
 if c.id is null then raise exception 'Class not found or access denied'; end if;
 dt:=(clock_timestamp() at time zone c.timezone)::date;
 if p_resource='classes' and p_action='update' then
  if p_body ? 'timezone' and not exists(select 1 from pg_timezone_names where name=p_body->>'timezone') then raise exception 'Choose a valid timezone'; end if;
  update attendance_classes set name=coalesce(p_body->>'name',name),college=coalesce(p_body->>'college',college),location_label=coalesce(p_body->>'location_label',location_label),archived=coalesce((p_body->>'archived')::boolean,archived),
   term=coalesce(p_body->>'term',term),year=coalesce((p_body->>'year')::integer,year),start_date=coalesce((p_body->>'start_date')::date,start_date),end_date=coalesce((p_body->>'end_date')::date,end_date),
   timezone=coalesce(p_body->>'timezone',timezone),days=case when p_body ? 'days' then array(select jsonb_array_elements_text(p_body->'days')::int) else days end,
   start_time=coalesce((p_body->>'start_time')::time,start_time),end_time=coalesce((p_body->>'end_time')::time,end_time) where id=c.id returning * into c;
  return jsonb_build_object('class',to_jsonb(c));
 elsif p_resource='enrollments' then
  if p_action='import' then
   if jsonb_array_length(p_body->'rows')>1000 then raise exception 'Import at most 1000 students'; end if;
   for rowdata in select value from jsonb_array_elements(p_body->'rows') loop
    if exists(select 1 from attendance_enrollments ee where ee.class_id=c.id and
     (ee.email=nullif(lower(trim(rowdata->>'email')),'') or ee.college_id=nullif(trim(coalesce(rowdata->>'college_id',rowdata->>'collegeId')),'')) and
     (ee.effective_to is null or ee.effective_to>=coalesce((rowdata->>'effective_from')::date,dt))) then raise exception 'An overlapping enrollment already uses this email or college ID'; end if;
    insert into attendance_enrollments(class_id,name,first_name,last_name,college_id,email,effective_from) values(c.id,trim(rowdata->>'name'),nullif(trim(rowdata->>'first_name'),''),nullif(trim(rowdata->>'last_name'),''),nullif(trim(coalesce(rowdata->>'college_id',rowdata->>'collegeId')),''),nullif(lower(trim(rowdata->>'email')),''),coalesce((rowdata->>'effective_from')::date,dt));
   end loop;
  elsif p_action in ('update','drop') then
   select * into e from attendance_enrollments where id=(p_body->>'enrollmentId')::uuid and class_id=c.id for update;
   if e.id is null then raise exception 'Enrollment not found'; end if;
   if p_action='update' and exists(select 1 from attendance_enrollments ee where ee.class_id=c.id and ee.id<>e.id and
    (ee.email=case when p_body ? 'email' then nullif(lower(trim(p_body->>'email')),'') else e.email end or ee.college_id=case when p_body ? 'college_id' then nullif(trim(p_body->>'college_id'),'') else e.college_id end) and
    (ee.effective_to is null or ee.effective_to>=e.effective_from) and (e.effective_to is null or e.effective_to>=ee.effective_from)) then raise exception 'An overlapping enrollment already uses this email or college ID'; end if;
   update attendance_enrollments set first_name=case when p_body ? 'first_name' then nullif(trim(p_body->>'first_name'),'') else first_name end, last_name=case when p_body ? 'last_name' then nullif(trim(p_body->>'last_name'),'') else last_name end, name=coalesce(p_body->>'name',name), email=case when p_body ? 'email' then nullif(lower(trim(p_body->>'email')),'') else email end,
    google_sub=case when p_body ? 'email' and nullif(lower(trim(p_body->>'email')),'') is distinct from email then null else google_sub end,
    college_id=case when p_body ? 'college_id' then nullif(trim(p_body->>'college_id'),'') else college_id end,
    effective_to=case when p_action='drop' then coalesce((p_body->>'effective_to')::date,dt) else effective_to end where id=e.id;
  elsif p_action<>'list' then raise exception 'Unknown enrollment action'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]') into result from attendance_enrollments x where class_id=c.id;
  return jsonb_build_object('enrollments',result);
 elsif p_resource='meetings' then
  if p_action='open' then
   if c.archived or dt<c.start_date or dt>c.end_date then raise exception 'This class is outside its active date range'; end if;
   n:=clock_timestamp();
   if exists(select 1 from attendance_meetings where instructor_email=p_actor and status='open') then raise exception 'End the open meeting before changing classes'; end if;
   insert into attendance_meetings(class_id,instructor_email,meeting_date) values(c.id,p_actor,dt) returning * into m;
   insert into attendance_roster select m.id,id,name,college_id,email from attendance_enrollments where class_id=c.id and effective_from<=dt and (effective_to is null or effective_to>=dt);
  elsif p_action in ('close','cancel') then
   if m.id is null then raise exception 'Meeting required'; end if;
   if p_action='cancel' and m.status<>'cancelled' then
    insert into attendance_meeting_events(meeting_id,actor_email,action,note) values(m.id,p_actor,'cancel',left(coalesce(p_body->>'note',''),2000));
   end if;
   perform attendance_finalize(m.id,p_action='cancel');
  elsif p_action='extend' then
   if m.id is null or m.status<>'open' or m.extended or m.expires_at<=clock_timestamp() then raise exception 'This meeting cannot be extended'; end if;
   update attendance_meetings set expires_at=expires_at+interval '5 minutes',extended=true where id=m.id;
  elsif p_action='token' then
   if m.id is null or m.status<>'open' or m.expires_at<=clock_timestamp() then raise exception 'No open check-in window'; end if;
   n:=clock_timestamp();
   raw_token:=gen_random_uuid()::text;
   update attendance_meetings set token=encode(sha256(convert_to(raw_token,'UTF8')),'hex'),token_slot=floor(extract(epoch from n))::bigint where id=m.id returning * into m;
   return jsonb_build_object('token',raw_token,'expiresAt',least(m.expires_at,to_timestamp(m.token_slot)+interval '10 minutes'),'meeting',to_jsonb(m)-'token'-'token_slot'-'latitude'-'longitude');
  elsif p_action<>'list' then raise exception 'Unknown meeting action'; end if;
  if m.id is null then select * into m from attendance_meetings where class_id=c.id order by opened_at desc limit 1; else select * into m from attendance_meetings where id=m.id; end if;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from attendance_records x where meeting_id=m.id;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from attendance_roster x where meeting_id=m.id;
  return jsonb_build_object('meeting',case when m.id is null then null else to_jsonb(m)-'token'-'token_slot'-'latitude'-'longitude' end,'records',result,'roster',items,'corrections',(select coalesce(jsonb_agg(to_jsonb(x)-'request_payload'),'[]') from attendance_corrections x where meeting_id=m.id),
   'failures',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select a.id,a.actor_email,a.reason,a.created_at from attendance_attempts a where a.meeting_id=m.id order by a.created_at desc limit 100) x));
 elsif p_resource='corrections' then
  if m.id is null or m.status='cancelled' then raise exception 'Choose a non-cancelled meeting'; end if;
  select * into audit from attendance_corrections where operation_id=(p_body->>'operationId')::uuid;
  if audit.id is not null then
   if audit.actor_email<>p_actor or audit.request_payload<>p_body then raise exception 'Operation ID was already used for a different edit'; end if;
   return jsonb_build_object('operationId',p_body->>'operationId','saved',true,'duplicate',true);
  end if;
  select * into rr from attendance_roster where meeting_id=m.id and enrollment_id=(p_body->>'enrollmentId')::uuid;
  if rr.enrollment_id is null then raise exception 'Student is not in this meeting snapshot'; end if;
  select * into rec from attendance_records where meeting_id=m.id and enrollment_id=rr.enrollment_id for update;
  if coalesce(rec.revision,0)<>coalesce((p_body->>'expectedRevision')::int,-1) then return jsonb_build_object('operationId',p_body->>'operationId','error','This attendance record changed. Review the current value.','code','conflict','record',to_jsonb(rec)); end if;
  if p_body->>'status' not in ('present','absent') then raise exception 'Attendance status is required'; end if;
  if p_body ? 'recordedAt' and ((p_body->>'recordedAt')::timestamptz>clock_timestamp()+interval '5 minutes' or (p_body->>'recordedAt')::timestamptz<m.opened_at-interval '5 minutes') then raise exception 'Offline edit time is outside this meeting timeline'; end if;
  insert into attendance_corrections(meeting_id,enrollment_id,old_status,new_status,actor_email,note,operation_id,request_payload,recorded_at)
   values(m.id,rr.enrollment_id,rec.status,p_body->>'status',p_actor,coalesce(p_body->>'note',''),(p_body->>'operationId')::uuid,p_body,(p_body->>'recordedAt')::timestamptz);
  insert into attendance_records(meeting_id,enrollment_id,status,source) values(m.id,rr.enrollment_id,p_body->>'status','manual')
   on conflict(meeting_id,enrollment_id) do update set status=excluded.status,source='manual',revision=attendance_records.revision+1,updated_at=clock_timestamp() returning * into rec;
  return jsonb_build_object('operationId',p_body->>'operationId','saved',true,'record',to_jsonb(rec));
 end if;
 raise exception 'Unknown attendance action';
end $function$
;
CREATE OR REPLACE FUNCTION public.attendance_calendar_api(p_actor text, p_sub text, p_instructor boolean, p_resource text, p_action text, p_body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end $function$
;
CREATE OR REPLACE FUNCTION public.attendance_class_summary(p_actor text, p_class_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
end $function$
;
CREATE OR REPLACE FUNCTION public.attendance_finalize(p_id uuid, p_cancel boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare m attendance_meetings; begin
 select * into m from attendance_meetings where id=p_id for update;
 if m.status='cancelled' or (m.status<>'open' and not p_cancel) then return; end if;
 if not p_cancel then
  insert into attendance_records(meeting_id,enrollment_id,status,source)
   select meeting_id,enrollment_id,'absent','finalized' from attendance_roster where meeting_id=p_id on conflict do nothing;
 end if;
 update attendance_meetings set status=case when p_cancel then 'cancelled' else 'closed' end,closed_at=clock_timestamp(),token=null,token_slot=null,latitude=null,longitude=null,location_timestamp=null where id=p_id;
end $function$
;
