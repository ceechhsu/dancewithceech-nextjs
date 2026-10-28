-- Preserve the target mark independently from its point value (X and 10 both score ten).
alter table public.archery_rounds add column score_marks text[];
update public.archery_rounds set score_marks=array(select case when s=0 then 'M' else s::text end from unnest(scores) s);
alter table public.archery_rounds alter column score_marks set not null;

create function archery_private.valid_score_marks(p_scores integer[],p_marks text[]) returns boolean
language sql immutable set search_path=public as $$
 select coalesce(array_ndims(p_marks)=1,false) and cardinality(p_scores)=cardinality(p_marks)
 and not exists(select 1 from unnest(p_scores,p_marks) as x(score,mark) where mark is null or mark not in ('M','1','2','3','4','5','6','7','8','9','10','X')
  or score is distinct from case when mark='M' then 0 when mark='X' then 10 when mark ~ '^(10|[1-9])$' then mark::integer else null end)
$$;
alter table public.archery_rounds add constraint archery_round_marks_match check(archery_private.valid_score_marks(scores,score_marks));

-- Existing numeric clients can continue inserting rounds. A legacy ten remains a ten;
-- an inner X is never inferred from history that did not retain that distinction.
create function archery_private.default_score_marks() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.score_marks is null then new.score_marks:=array(select case when s=0 then 'M' else s::text end from unnest(new.scores) s);end if;
 return new;
end $$;
create trigger archery_round_default_marks before insert on public.archery_rounds for each row execute function archery_private.default_score_marks();
grant update(score_marks) on public.archery_rounds to service_role;
create index archery_round_day on public.archery_rounds(class_id,entry_date,created_at);

alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_calendar;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare result jsonb;marks_value text[];scores_value integer[];saved archery_rounds;day_date date;days jsonb;day_rounds jsonb;own_id uuid;is_owner boolean;cid uuid;
begin
 if p_action='round_save' then
  if p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'Invalid archery request';end if;
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
  -- The existing implementation verifies identity/enrollment, locks this class,
  -- validates all other fields, and inserts or checks the immutable round.
  result:=archery_private.archery_api_calendar(p_actor,p_sub,p_instructor,p_action,p_body||jsonb_build_object('scores',scores_value));
  if coalesce((result->>'duplicate')::boolean,false) then
   if result->'round'->'score_marks' is distinct from to_jsonb(marks_value) then raise exception 'This round was already saved';end if;
   return result;
  end if;
  update archery_rounds set score_marks=marks_value where id=(result->'round'->>'id')::uuid returning * into saved;
  return result||jsonb_build_object('round',to_jsonb(saved));
 end if;
 result:=archery_private.archery_api_calendar(p_actor,p_sub,p_instructor,p_action,p_body);
 if p_action='list' then
  cid:=(result->>'classId')::uuid;own_id:=(result->>'me')::uuid;is_owner:=(result->>'instructor')::boolean;
  select coalesce(jsonb_object_agg(entry_date,n),'{}') into days from (select entry_date,count(*) n from archery_rounds where class_id=cid and (is_owner or enrollment_id=own_id) group by entry_date) x;
  result:=result||jsonb_build_object('roundDays',days);
  if p_body ? 'date' then
   day_date:=(p_body->>'date')::date;
   if day_date is null then raise exception 'Choose a date';end if;
   select coalesce(jsonb_agg(to_jsonb(rr)||jsonb_build_object('student_name',ee.name) order by rr.created_at,rr.id),'[]') into day_rounds
    from archery_rounds rr join attendance_enrollments ee on ee.id=rr.enrollment_id
    where rr.class_id=cid and rr.entry_date=day_date and (is_owner or rr.enrollment_id=own_id);
   result:=result||jsonb_build_object('roundDate',day_date,'dayRounds',day_rounds);
  end if;
 end if;
 return result;
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb) to service_role;
revoke all on function archery_private.valid_score_marks(integer[],text[]),archery_private.default_score_marks(),archery_private.archery_api_calendar(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function archery_private.valid_score_marks(integer[],text[]),archery_private.default_score_marks(),archery_private.archery_api_calendar(text,text,boolean,text,jsonb) to service_role;
