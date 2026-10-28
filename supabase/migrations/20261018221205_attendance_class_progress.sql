-- Additive private classroom tools. Existing classes remain attendance-only until configured.
alter table public.attendance_classes add column progress_tool text not null default 'none'
 check (progress_tool in ('none','archery','weight_training'));

-- Composite FK prevents even privileged code from attaching an enrollment to another class.
alter table public.attendance_enrollments add constraint attendance_enrollment_class_key unique(id,class_id);
create table public.attendance_progress_entries (
 id uuid primary key,
 class_id uuid not null references public.attendance_classes(id),
 enrollment_id uuid not null,
 subject text not null check(subject in ('archery','weight_training')),
 entry_date date not null,
 activity text not null check(length(trim(activity)) between 1 and 160),
 result text not null check(length(trim(result)) between 1 and 1000),
 notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(enrollment_id,class_id) references public.attendance_enrollments(id,class_id)
);
create index attendance_progress_history on public.attendance_progress_entries(class_id,subject,entry_date desc,created_at desc);
create index attendance_progress_student on public.attendance_progress_entries(enrollment_id,entry_date desc);
alter table public.attendance_progress_entries enable row level security;
revoke all on public.attendance_progress_entries from public,anon,authenticated;
grant select,insert on public.attendance_progress_entries to service_role;

-- SECURITY INVOKER, like attendance_api. Only the trusted server service role can call it.
create function public.attendance_progress_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql set search_path=public as $$
declare
 c attendance_classes; e attendance_enrollments; saved attendance_progress_entries;
 cid uuid; entry_id uuid; dt date; today date; owner boolean; result jsonb; items jsonb; meetings jsonb; records jsonb;
 activity_value text; result_value text; notes_value text;
begin
 if coalesce(p_actor,'')='' or p_actor<>lower(trim(p_actor)) or coalesce(p_sub,'')='' then raise exception 'Verified Google identity required'; end if;
 if p_action not in ('list','save','configure','workspace') or p_action is null then raise exception 'Unknown progress action'; end if;
 if p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'Invalid progress request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor,0));
 cid:=nullif(p_body->>'classId','')::uuid;
 if p_action='list' and cid is null then
  -- Bind first use to the verified provider identity, following existing attendance behavior.
  update attendance_enrollments set google_sub=p_sub where email=p_actor and google_sub is null;
  select coalesce(jsonb_agg(to_jsonb(cc) order by cc.name),'[]') into result from attendance_classes cc
  where cc.progress_tool<>'none' and (
   (coalesce(p_instructor,false) and cc.instructor_email=p_actor) or
   (not cc.archived and (clock_timestamp() at time zone cc.timezone)::date between cc.start_date and cc.end_date and
    exists(select 1 from attendance_enrollments ee where ee.removed_at is null and ee.class_id=cc.id and ee.email=p_actor and ee.google_sub=p_sub
     and (clock_timestamp() at time zone cc.timezone)::date>=ee.effective_from
     and (ee.effective_to is null or (clock_timestamp() at time zone cc.timezone)::date<=ee.effective_to))));
  return jsonb_build_object('classes',result);
 end if;
 select * into c from attendance_classes where id=cid for update;
 if c.id is null then raise exception 'Class not found or access denied'; end if;
 owner:=coalesce(p_instructor,false) and c.instructor_email=p_actor;
 today:=(clock_timestamp() at time zone c.timezone)::date;
 if p_action in ('configure','workspace') then
  if not coalesce(p_instructor,false) then raise exception 'Instructor access required'; end if;
  if not owner then raise exception 'Class not found or access denied'; end if;
  if p_action='configure' then
   if coalesce(p_body->>'tool','') not in ('none','archery','weight_training') then raise exception 'Choose a valid progress tool'; end if;
   update attendance_classes set progress_tool=p_body->>'tool' where id=c.id returning * into c;
   return jsonb_build_object('class',to_jsonb(c));
  end if;
  -- Finalize expired rolls through the existing routine before displaying records.
  perform attendance_finalize(id) from attendance_meetings where class_id=c.id and status='open' and expires_at<=clock_timestamp();
  select coalesce(jsonb_agg(to_jsonb(ee)-'google_sub' order by ee.name),'[]') into result from attendance_enrollments ee where ee.class_id=c.id;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.meeting_date desc,x.opened_at desc),'[]') into meetings from
   (select id,meeting_date,status,opened_at from attendance_meetings where class_id=c.id order by meeting_date desc,opened_at desc limit 100) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.meeting_date desc,x.name),'[]') into records from
   (select r.meeting_id,r.enrollment_id,r.status,r.source,r.checked_in_at,m.meeting_date,s.name
    from attendance_records r join attendance_meetings m on m.id=r.meeting_id
    join attendance_roster s on s.meeting_id=r.meeting_id and s.enrollment_id=r.enrollment_id
    where m.id in (select (value->>'id')::uuid from jsonb_array_elements(meetings))) x;
  return jsonb_build_object('class',to_jsonb(c),'roster',result,'meetings',meetings,'records',records,'today',today);
 end if;
 if not owner then
  if c.archived or today<c.start_date or today>c.end_date then raise exception 'Class not found or access denied'; end if;
  select * into e from attendance_enrollments where removed_at is null and class_id=c.id and email=p_actor
   and (google_sub is null or google_sub=p_sub) and today>=effective_from and (effective_to is null or today<=effective_to)
   order by effective_from desc limit 1 for update;
  if e.id is null then raise exception 'Class not found or access denied'; end if;
  update attendance_enrollments set google_sub=p_sub where id=e.id and google_sub is null;
 end if;
 if c.progress_tool='none' then raise exception 'No progress tool is enabled for this class'; end if;
 if p_action='save' then
  -- Teachers review entries; only a currently enrolled student can write their own journal.
  if e.id is null then raise exception 'Only an enrolled student can save a progress entry'; end if;
  entry_id:=nullif(p_body->>'entryId','')::uuid;
  dt:=nullif(p_body->>'date','')::date;
  activity_value:=trim(p_body->>'activity'); result_value:=trim(p_body->>'result'); notes_value:=trim(coalesce(p_body->>'notes',''));
  if entry_id is null then raise exception 'An entry ID is required'; end if;
  if dt is null or dt>today or dt<c.start_date or dt>c.end_date or dt<e.effective_from or (e.effective_to is not null and dt>e.effective_to) then raise exception 'Choose a date within your enrollment and class dates, up to today'; end if;
  if coalesce(length(activity_value),0) not between 1 and 160 then raise exception 'Enter an activity of at most 160 characters'; end if;
  if coalesce(length(result_value),0) not between 1 and 1000 then raise exception 'Enter a result of at most 1000 characters'; end if;
  if length(notes_value)>2000 then raise exception 'Keep notes to 2000 characters'; end if;
  select * into saved from attendance_progress_entries where id=entry_id;
  if saved.id is not null then
   if saved.class_id<>c.id or saved.enrollment_id<>e.id or saved.subject<>c.progress_tool or saved.entry_date<>dt or saved.activity<>activity_value or saved.result<>result_value or saved.notes<>notes_value then raise exception 'This entry was already saved. Refresh before adding a new entry'; end if;
   return jsonb_build_object('entry',to_jsonb(saved),'duplicate',true);
  end if;
  insert into attendance_progress_entries(id,class_id,enrollment_id,subject,entry_date,activity,result,notes)
   values(entry_id,c.id,e.id,c.progress_tool,dt,activity_value,result_value,notes_value) returning * into saved;
  return jsonb_build_object('entry',to_jsonb(saved));
 end if;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.entry_date desc,x.created_at desc),'[]') into result from
  (select pe.*,ee.name as student_name from attendance_progress_entries pe join attendance_enrollments ee on ee.id=pe.enrollment_id
   where pe.class_id=c.id and pe.subject=c.progress_tool and (owner or (ee.email=p_actor and ee.google_sub=p_sub))
   order by pe.entry_date desc,pe.created_at desc limit 500) x;
 return jsonb_build_object('class',to_jsonb(c),'entries',result,'instructor',owner,'today',today,
  'earliestDate',greatest(c.start_date,coalesce(e.effective_from,c.start_date)));
end $$;
revoke all on function public.attendance_progress_api(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.attendance_progress_api(text,text,boolean,text,jsonb) to service_role;
