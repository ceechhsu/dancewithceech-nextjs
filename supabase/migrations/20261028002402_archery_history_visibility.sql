-- List windows must not hide a selected calendar day or unfinished activity.
-- Leave authentication, locks, automatic draws, disputes and every write in the
-- existing implementation; extend only its authorized list response.
alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_disputes;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb;cid uuid;me uuid;owner boolean;selected_date date;
 tournament_ids uuid[];tournaments jsonb;matches jsonb;challenges jsonb;days jsonb;
begin
 if p_action is distinct from 'list' then
  return archery_private.archery_api_disputes(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 -- This validates identity, enrollment, subject and selected date and holds the
 -- class row lock until the entire request commits. Reuse its clock and private
 -- round arrays rather than calculating or widening them here.
 data:=archery_private.archery_api_disputes(p_actor,p_sub,p_instructor,p_action,p_body);
 cid:=(data->>'classId')::uuid;me:=(data->>'me')::uuid;owner:=(data->>'instructor')::boolean;
 selected_date:=case when p_body ? 'date' then (p_body->>'date')::date else (data->>'today')::date end;

 -- Registration that closed without enough players is finished history. Only
 -- registration and active draws bypass the history window on other dates.
 select coalesce(array_agg(tt.id),'{}'::uuid[]) into tournament_ids
 from archery_tournaments tt where tt.class_id=cid and (
  tt.event_date=selected_date or tt.status in ('registration','active') or tt.id in (
   select recent.id from archery_tournaments recent where recent.class_id=cid order by recent.created_at desc,recent.id desc limit 30
  )
 );
 select coalesce(jsonb_agg(to_jsonb(tt)||jsonb_build_object('players',(
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(ee.name,'Instructor')) order by p.position),'[]')
  from unnest(tt.participants) with ordinality p(id,position)
  left join archery_competitors cp on cp.id=p.id and cp.class_id=cid
  left join attendance_enrollments ee on ee.id=coalesce(cp.enrollment_id,p.id) and ee.class_id=cid
  where cp.id is not null or ee.id is not null
 )) order by tt.created_at desc,tt.id desc),'[]') into tournaments
 from archery_tournaments tt where tt.class_id=cid and tt.id=any(tournament_ids);

 select coalesce(jsonb_agg((to_jsonb(mm)-'reported_by')||jsonb_build_object(
  'reported_by_me',coalesce(mm.reported_by=p_actor,false),
  'dispute',case when d.id is not null then archery_private.dispute_summary(d) end
 ) order by mm.round,mm.position,mm.id),'[]') into matches
 from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id and tt.class_id=cid
 left join archery_result_disputes d on d.match_id=mm.id and d.class_id=cid
 where tt.id=any(tournament_ids);

 -- Apply participant scope before the terminal history limit. Another student's
 -- unfinished invitation must never enter this response or its history window.
 with authorized as (
  select ch.* from archery_challenges ch where ch.class_id=cid and (owner or me in (ch.challenger,ch.opponent))
 ), visible as (
  select a.* from authorized a where a.status in ('pending','accepted') or a.id in (
   select terminal.id from authorized terminal where terminal.status not in ('pending','accepted')
   order by terminal.created_at desc,terminal.id desc limit 100
  )
 )
 select coalesce(jsonb_agg((to_jsonb(ch)-'reported_by')||jsonb_build_object(
  'challenger_name',ca.name,'opponent_name',op.name,'reported_by_me',coalesce(ch.reported_by=p_actor,false),
  'dispute',case when d.id is not null then archery_private.dispute_summary(d) end
 ) order by ch.created_at desc,ch.id desc),'[]') into challenges
 from visible ch join attendance_enrollments ca on ca.id=ch.challenger and ca.class_id=cid
 join attendance_enrollments op on op.id=ch.opponent and op.class_id=cid
 left join archery_result_disputes d on d.challenge_id=ch.id and d.class_id=cid;

 select coalesce(jsonb_object_agg(event_date,n),'{}') into days from (
  select event_date,count(*) n from archery_tournaments where class_id=cid group by event_date
 ) counts;
 return data||jsonb_build_object('tournaments',tournaments,'matches',matches,'challenges',challenges,'tournamentDays',days);
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_disputes(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_disputes(text,text,boolean,text,jsonb) to service_role;
