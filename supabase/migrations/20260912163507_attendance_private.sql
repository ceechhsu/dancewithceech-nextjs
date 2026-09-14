-- Attendance is a private server API. No browser role can read tables or invoke RPCs.
create table public.attendance_classes (
 id uuid primary key default gen_random_uuid(), instructor_email text not null, name text not null check(length(name) between 1 and 120),
 college text not null default '', location_label text not null default '', term text not null, year integer not null check(year between 2000 and 2200),
 start_date date not null, end_date date not null, timezone text not null default 'America/Los_Angeles', days integer[] not null default '{}',
 start_time time not null, end_time time not null, archived boolean not null default false, check(end_date >= start_date)
);
create table public.attendance_enrollments (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.attendance_classes(id), name text not null check(length(name) between 1 and 200),
 college_id text, email text check(email is null or (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')), google_sub text, effective_from date not null, effective_to date,
 check(effective_to is null or effective_to >= effective_from)
);
create unique index attendance_enrollment_email on public.attendance_enrollments(class_id,email) where email is not null and effective_to is null;
create unique index attendance_enrollment_college_id on public.attendance_enrollments(class_id,college_id) where college_id is not null and effective_to is null;
create table public.attendance_meetings (
 id uuid primary key default gen_random_uuid(), class_id uuid not null references public.attendance_classes(id), instructor_email text not null,
 meeting_date date not null, status text not null default 'open' check(status in ('open','closed','cancelled')),
 opened_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null default clock_timestamp()+interval '10 minutes',
 extended boolean not null default false, closed_at timestamptz, latitude double precision, longitude double precision, location_timestamp timestamptz,
 token text, token_slot bigint
);
create unique index attendance_one_open on public.attendance_meetings(instructor_email) where status='open';
create table public.attendance_roster (
 meeting_id uuid not null references public.attendance_meetings(id), enrollment_id uuid not null references public.attendance_enrollments(id),
 name text not null, college_id text, email text, primary key(meeting_id,enrollment_id)
);
create table public.attendance_records (
 meeting_id uuid not null, enrollment_id uuid not null, status text not null check(status in ('present','absent')),
 source text not null check(source in ('check_in','manual','finalized')), revision integer not null default 1,
 updated_at timestamptz not null default clock_timestamp(), primary key(meeting_id,enrollment_id),
 foreign key(meeting_id,enrollment_id) references public.attendance_roster(meeting_id,enrollment_id)
);
create table public.attendance_corrections (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null, enrollment_id uuid not null,
 old_status text, new_status text not null, actor_email text not null, note text not null default '' check(length(note)<=2000),
 operation_id uuid not null unique, request_payload jsonb not null, recorded_at timestamptz, created_at timestamptz not null default clock_timestamp(),
 foreign key(meeting_id,enrollment_id) references public.attendance_roster(meeting_id,enrollment_id)
);
create table public.attendance_attempts (
 id uuid primary key default gen_random_uuid(), actor_email text not null, google_sub text not null, meeting_id uuid references public.attendance_meetings(id),
 reason text not null, created_at timestamptz not null default clock_timestamp(), notified_at timestamptz
);
create index attendance_attempt_rate on public.attendance_attempts(actor_email,created_at);
create table public.attendance_push_subscriptions (
 endpoint text primary key, actor_email text not null, subscription jsonb not null, created_at timestamptz not null default clock_timestamp()
);
create table public.attendance_meeting_events (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null references attendance_meetings(id), actor_email text not null,
 action text not null, note text not null default '', created_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
 foreach t in array array['attendance_classes','attendance_enrollments','attendance_meetings','attendance_roster','attendance_records','attendance_corrections','attendance_attempts','attendance_push_subscriptions','attendance_meeting_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.attendance_immutable_audit() returns trigger language plpgsql set search_path = public as $$
begin raise exception 'Attendance audit entries are immutable'; end $$;
create trigger attendance_audit_immutable before update or delete on public.attendance_corrections for each row execute function public.attendance_immutable_audit();
create trigger attendance_meeting_audit_immutable before update or delete on public.attendance_meeting_events for each row execute function public.attendance_immutable_audit();
revoke all on function public.attendance_immutable_audit() from public,anon,authenticated;

create function public.attendance_finalize(p_id uuid, p_cancel boolean default false) returns void language plpgsql set search_path = public as $$
declare m attendance_meetings; begin
 select * into m from attendance_meetings where id=p_id for update;
 if m.status='cancelled' or (m.status<>'open' and not p_cancel) then return; end if;
 if not p_cancel then
  insert into attendance_records(meeting_id,enrollment_id,status,source)
   select meeting_id,enrollment_id,'absent','finalized' from attendance_roster where meeting_id=p_id on conflict do nothing;
 end if;
 update attendance_meetings set status=case when p_cancel then 'cancelled' else 'closed' end,closed_at=clock_timestamp(),token=null,token_slot=null,latitude=null,longitude=null,location_timestamp=null where id=p_id;
end $$;
revoke all on function public.attendance_finalize(uuid,boolean) from public,anon,authenticated;
grant execute on function public.attendance_finalize(uuid,boolean) to service_role;

create function public.attendance_api(p_actor text,p_sub text,p_instructor boolean,p_resource text,p_action text,p_body jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
 c attendance_classes; m attendance_meetings; e attendance_enrollments; rr attendance_roster; rec attendance_records; audit attendance_corrections;
 cid uuid; mid uuid; rowdata jsonb; result jsonb; items jsonb; loc jsonb; reason text; n timestamptz; dt date; distance double precision; raw_token text;
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
  n:=clock_timestamp(); loc:=p_body->'location';
  if m.id is null then reason:='This QR code has expired. Scan the current code.';
  elsif m.status<>'open' or m.expires_at<=n or m.token_slot<>floor(extract(epoch from n)/60)::bigint then reason:='This QR code has expired. Scan the current code.';
  elsif abs(extract(epoch from (n-m.location_timestamp)))>60 then reason:='Your instructor must refresh their location and QR code.';
  else
   select s.* into rr from attendance_roster s join attendance_enrollments ee on ee.id=s.enrollment_id where s.meeting_id=m.id and ee.email=p_actor;
   select * into e from attendance_enrollments where id=rr.enrollment_id for update;
   select * into c from attendance_classes where id=m.class_id;
   dt:=(n at time zone c.timezone)::date;
   if rr.enrollment_id is null or e.email is distinct from p_actor or e.effective_from>dt or (e.effective_to is not null and e.effective_to<dt) then reason:='Your verified Google email is not actively enrolled in this class. Ask your instructor.';
   elsif c.archived then reason:='This class is archived. Ask your instructor.';
   elsif e.google_sub is not null and e.google_sub<>p_sub then reason:='This enrollment is linked to another Google account. Ask your instructor.';
   elsif loc is null or jsonb_typeof(loc)<>'object' then reason:='Location permission is required.';
   elsif coalesce((loc->>'accuracy')::double precision,9999)>50 or coalesce((loc->>'accuracy')::double precision,-1)<0 then reason:='Location accuracy is too low. Move near a window and try again.';
   elsif abs(extract(epoch from n)*1000-coalesce((loc->>'timestamp')::double precision,0))>30000 then reason:='Location is stale. Get a fresh location and retry.';
   elsif coalesce((loc->>'latitude')::double precision,999) not between -90 and 90 or coalesce((loc->>'longitude')::double precision,999) not between -180 and 180 then reason:='Valid location is required.';
   else
    distance:=6371000*2*asin(sqrt(least(1,power(sin(radians((loc->>'latitude')::double precision-m.latitude)/2),2)+cos(radians(m.latitude))*cos(radians((loc->>'latitude')::double precision))*power(sin(radians((loc->>'longitude')::double precision-m.longitude)/2),2))));
    if distance>50 then reason:='You must be within 50 meters of your instructor.'; end if;
   end if;
  end if;
  if reason is not null then
   insert into attendance_attempts(actor_email,google_sub,meeting_id,reason) values(p_actor,p_sub,m.id,reason);
   return jsonb_build_object('error',reason,'attemptId',(select id from attendance_attempts where actor_email=p_actor order by created_at desc limit 1));
  end if;
  -- Recheck the authoritative clock immediately before mutation. Never accept a prior slot.
  if m.expires_at<=clock_timestamp() or m.token_slot<>floor(extract(epoch from clock_timestamp())/60)::bigint or abs(extract(epoch from (clock_timestamp()-m.location_timestamp)))>60 then
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
    insert into attendance_enrollments(class_id,name,college_id,email,effective_from) values(c.id,trim(rowdata->>'name'),nullif(trim(coalesce(rowdata->>'college_id',rowdata->>'collegeId')),''),nullif(lower(trim(rowdata->>'email')),''),coalesce((rowdata->>'effective_from')::date,dt));
   end loop;
  elsif p_action in ('update','drop') then
   select * into e from attendance_enrollments where id=(p_body->>'enrollmentId')::uuid and class_id=c.id for update;
   if e.id is null then raise exception 'Enrollment not found'; end if;
   if p_action='update' and exists(select 1 from attendance_enrollments ee where ee.class_id=c.id and ee.id<>e.id and
    (ee.email=case when p_body ? 'email' then nullif(lower(trim(p_body->>'email')),'') else e.email end or ee.college_id=case when p_body ? 'college_id' then nullif(trim(p_body->>'college_id'),'') else e.college_id end) and
    (ee.effective_to is null or ee.effective_to>=e.effective_from) and (e.effective_to is null or e.effective_to>=ee.effective_from)) then raise exception 'An overlapping enrollment already uses this email or college ID'; end if;
   update attendance_enrollments set name=coalesce(p_body->>'name',name), email=case when p_body ? 'email' then nullif(lower(trim(p_body->>'email')),'') else email end,
    google_sub=case when p_body ? 'email' and nullif(lower(trim(p_body->>'email')),'') is distinct from email then null else google_sub end,
    college_id=case when p_body ? 'college_id' then nullif(trim(p_body->>'college_id'),'') else college_id end,
    effective_to=case when p_action='drop' then coalesce((p_body->>'effective_to')::date,dt) else effective_to end where id=e.id;
  elsif p_action<>'list' then raise exception 'Unknown enrollment action'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.name),'[]') into result from attendance_enrollments x where class_id=c.id;
  return jsonb_build_object('enrollments',result);
 elsif p_resource='meetings' then
  if p_action='open' then
   if c.archived or dt<c.start_date or dt>c.end_date then raise exception 'This class is outside its active date range'; end if;
   loc:=p_body->'location'; n:=clock_timestamp();
   if loc is null or coalesce((loc->>'accuracy')::double precision,9999)>50 or coalesce((loc->>'accuracy')::double precision,-1)<0 or
    abs(extract(epoch from n)*1000-coalesce((loc->>'timestamp')::double precision,0))>30000 or
    coalesce((loc->>'latitude')::double precision,999) not between -90 and 90 or coalesce((loc->>'longitude')::double precision,999) not between -180 and 180 then
    raise exception 'A fresh location with accuracy within 50 meters is required';
   end if;
   if exists(select 1 from attendance_meetings where instructor_email=p_actor and status='open') then raise exception 'End the open meeting before changing classes'; end if;
   insert into attendance_meetings(class_id,instructor_email,meeting_date,latitude,longitude,location_timestamp) values(c.id,p_actor,dt,(loc->>'latitude')::double precision,(loc->>'longitude')::double precision,to_timestamp((loc->>'timestamp')::double precision/1000)) returning * into m;
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
   n:=clock_timestamp(); loc:=p_body->'location';
   if loc is null or coalesce((loc->>'accuracy')::double precision,9999)>50 or coalesce((loc->>'accuracy')::double precision,-1)<0 or
    abs(extract(epoch from n)*1000-coalesce((loc->>'timestamp')::double precision,0))>30000 or
    coalesce((loc->>'latitude')::double precision,999) not between -90 and 90 or coalesce((loc->>'longitude')::double precision,999) not between -180 and 180 then
    raise exception 'A fresh location with accuracy within 50 meters is required';
   end if;
   raw_token:=gen_random_uuid()::text;
   update attendance_meetings set token=encode(sha256(convert_to(raw_token,'UTF8')),'hex'),token_slot=floor(extract(epoch from n)/60)::bigint,
    latitude=(loc->>'latitude')::double precision,longitude=(loc->>'longitude')::double precision,location_timestamp=to_timestamp((loc->>'timestamp')::double precision/1000) where id=m.id returning * into m;
   return jsonb_build_object('token',raw_token,'expiresAt',least(m.expires_at,to_timestamp((m.token_slot+1)*60)),'meeting',to_jsonb(m)-'token'-'token_slot'-'latitude'-'longitude');
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
end $$;
revoke all on function public.attendance_api(text,text,boolean,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.attendance_api(text,text,boolean,text,text,jsonb) to service_role;

create function public.attendance_claim_failure_notice(p_attempt uuid) returns text language plpgsql set search_path=public as $$
declare owner_email text; mid uuid; begin
 select m.instructor_email,m.id into owner_email,mid from attendance_attempts a join attendance_meetings m on m.id=a.meeting_id where a.id=p_attempt;
 if owner_email is null then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_email,1));
 if exists(select 1 from attendance_attempts where meeting_id=mid and notified_at>clock_timestamp()-interval '5 minutes') then return null; end if;
 update attendance_attempts set notified_at=clock_timestamp() where id=p_attempt;
 return owner_email;
end $$;
revoke all on function public.attendance_claim_failure_notice(uuid) from public,anon,authenticated;
grant execute on function public.attendance_claim_failure_notice(uuid) to service_role;
