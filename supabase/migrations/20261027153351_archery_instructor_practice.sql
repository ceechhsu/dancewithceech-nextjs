-- Instructor practice belongs to the verified class owner, without a student enrollment.
create function archery_private.instructor_score_total(p_scores integer[]) returns integer
language sql immutable set search_path=public as $$ select coalesce(sum(v),0)::integer from unnest(p_scores) v $$;
create table public.archery_instructor_rounds (
 id uuid primary key,
 class_id uuid not null references public.attendance_classes(id),
 instructor_email text not null check(length(instructor_email)>0),
 instructor_sub text not null check(length(instructor_sub)>0),
 entry_date date not null,
 distance numeric not null check(distance>0 and distance<=1000),
 unit text not null check(unit in ('m','yd')),
 scores integer[] not null check(cardinality(scores) between 1 and 100 and array_position(scores,null) is null and 0<=all(scores) and 10>=all(scores)),
 score_marks text[] not null check(archery_private.valid_score_marks(scores,score_marks)),
 total integer generated always as (archery_private.instructor_score_total(scores)) stored,
 notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default clock_timestamp()
);
create index archery_instructor_round_history on public.archery_instructor_rounds(class_id,instructor_email,instructor_sub,entry_date desc,created_at desc);
alter table public.archery_instructor_rounds enable row level security;
revoke all on public.archery_instructor_rounds from public,anon,authenticated;
grant select,insert on public.archery_instructor_rounds to service_role;
revoke all on function archery_private.instructor_score_total(integer[]) from public,anon,authenticated;
grant execute on function archery_private.instructor_score_total(integer[]) to service_role;

alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_scores;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb;c attendance_classes;ir archery_instructor_rounds;marks_value text[];scores_value integer[];rid uuid;day_date date;distance_value numeric;notes_value text;recent jsonb;day_rounds jsonb;days jsonb;
begin
 if p_action is null or p_action not in ('list','round_save') or (p_action='round_save' and not coalesce(p_instructor,false)) then
  return archery_private.archery_api_scores(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 -- This verifies the server identity, class ownership/enrollment and subject,
 -- and holds the existing class row lock through this entire transaction.
 data:=archery_private.archery_api_scores(p_actor,p_sub,p_instructor,'list',p_body);
 if p_action='round_save' and not (data->>'instructor')::boolean then
  return archery_private.archery_api_scores(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 if p_action='list' then
  data:=data||jsonb_build_object('personalRounds','[]'::jsonb,'personalDayRounds','[]'::jsonb,'personalRoundDays','{}'::jsonb);
  if not (data->>'instructor')::boolean then return data;end if;
  select coalesce(jsonb_agg(to_jsonb(x)-'instructor_email'-'instructor_sub'||jsonb_build_object('enrollment_id',null) order by x.entry_date desc,x.created_at desc,x.id desc),'[]') into recent
   from (select * from archery_instructor_rounds where class_id=(data->>'classId')::uuid and instructor_email=p_actor and instructor_sub=p_sub order by entry_date desc,created_at desc,id desc limit 500) x;
  select coalesce(jsonb_object_agg(entry_date,n),'{}') into days from
   (select entry_date,count(*) n from archery_instructor_rounds where class_id=(data->>'classId')::uuid and instructor_email=p_actor and instructor_sub=p_sub group by entry_date) x;
  day_rounds:='[]';
  if p_body ? 'date' then
   day_date:=(p_body->>'date')::date;
   select coalesce(jsonb_agg(to_jsonb(x)-'instructor_email'-'instructor_sub'||jsonb_build_object('enrollment_id',null) order by x.created_at,x.id),'[]') into day_rounds
    from archery_instructor_rounds x where x.class_id=(data->>'classId')::uuid and x.instructor_email=p_actor and x.instructor_sub=p_sub and x.entry_date=day_date;
  end if;
  return data||jsonb_build_object('personalRounds',recent,'personalDayRounds',day_rounds,'personalRoundDays',days);
 end if;
 select * into c from attendance_classes where id=(data->>'classId')::uuid;
 if c.archived then raise exception 'Restore this class before recording new activity';end if;
 rid:=nullif(p_body->>'id','')::uuid;if rid is null then raise exception 'A request ID is required';end if;
 if p_body ? 'marks' then
  if jsonb_typeof(p_body->'marks') is distinct from 'array' then raise exception 'Enter valid arrow marks';end if;
  if jsonb_array_length(p_body->'marks') not between 1 and 100 or exists(select 1 from jsonb_array_elements(p_body->'marks') v where jsonb_typeof(v)<>'string' or (v#>>'{}') not in ('M','1','2','3','4','5','6','7','8','9','10','X')) then raise exception 'Use 1 to 100 arrow marks: M, 1–10 or X';end if;
  marks_value:=array(select jsonb_array_elements_text(p_body->'marks'));
  scores_value:=array(select case when m='M' then 0 when m='X' then 10 else m::integer end from unnest(marks_value) m);
  if p_body ? 'scores' and p_body->'scores' is distinct from to_jsonb(scores_value) then raise exception 'Arrow scores must match their target marks';end if;
 else
  if jsonb_typeof(p_body->'scores') is distinct from 'array' then raise exception 'Enter arrow scores';end if;
  if jsonb_array_length(p_body->'scores') not between 1 and 100 or exists(select 1 from jsonb_array_elements(p_body->'scores') v where jsonb_typeof(v)<>'number' or v::text !~ '^(10|[0-9])$') then raise exception 'Use 1 to 100 whole-number arrow scores from 0 to 10';end if;
  scores_value:=array(select jsonb_array_elements_text(p_body->'scores')::integer);
  marks_value:=array(select case when s=0 then 'M' else s::text end from unnest(scores_value) s);
 end if;
 day_date:=(p_body->>'date')::date;
 if day_date is null or day_date<(data->>'earliestDate')::date or day_date>(data->>'today')::date or day_date>c.end_date then raise exception 'Choose a date within your class, up to today';end if;
 if jsonb_typeof(p_body->'distance') is distinct from 'number' or coalesce(p_body->>'unit','') not in ('m','yd') then raise exception 'Enter a valid distance and unit';end if;
 distance_value:=(p_body->>'distance')::numeric;
 if distance_value<=0 or distance_value>1000 then raise exception 'Enter a distance between 0 and 1000';end if;
 if p_body ? 'notes' and jsonb_typeof(p_body->'notes') not in ('string','null') then raise exception 'Enter valid notes';end if;
 notes_value:=coalesce(p_body->>'notes','');if length(notes_value)>2000 then raise exception 'Keep notes to 2000 characters';end if;
 select * into ir from archery_instructor_rounds where id=rid;
 if ir.id is not null then
  if ir.class_id<>c.id or ir.instructor_email<>p_actor or ir.instructor_sub<>p_sub or ir.entry_date<>day_date or ir.distance<>distance_value or ir.unit<>p_body->>'unit' or ir.scores<>scores_value or ir.score_marks<>marks_value or ir.notes<>notes_value then raise exception 'This round was already saved';end if;
  return jsonb_build_object('round',to_jsonb(ir)-'instructor_email'-'instructor_sub'||jsonb_build_object('enrollment_id',null),'duplicate',true);
 end if;
 insert into archery_instructor_rounds(id,class_id,instructor_email,instructor_sub,entry_date,distance,unit,scores,score_marks,notes)
  values(rid,c.id,p_actor,p_sub,day_date,distance_value,p_body->>'unit',scores_value,marks_value,notes_value) returning * into ir;
 return jsonb_build_object('round',to_jsonb(ir)-'instructor_email'-'instructor_sub'||jsonb_build_object('enrollment_id',null));
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_scores(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_scores(text,text,boolean,text,jsonb) to service_role;
