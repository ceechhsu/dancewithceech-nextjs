-- Challenge players include the class owner without inventing student enrollment.
create table public.archery_challenge_players (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.attendance_classes(id),
 enrollment_id uuid,
 instructor_email text,
 instructor_sub text,
 unique(id,class_id),
 unique(class_id,instructor_email),
 foreign key(enrollment_id,class_id) references public.attendance_enrollments(id,class_id),
 check ((enrollment_id is not null and id=enrollment_id and instructor_email is null and instructor_sub is null)
  or (enrollment_id is null and instructor_email is not null))
);
alter table public.archery_challenge_players enable row level security;
revoke all on public.archery_challenge_players from public,anon,authenticated;
grant select,insert,update on public.archery_challenge_players to service_role;
insert into public.archery_challenge_players(id,class_id,enrollment_id) select id,class_id,id from public.attendance_enrollments;
-- An invitation can address the instructor before their first visit. Only a
-- verified owner request may bind this slot to a Google provider subject.
insert into public.archery_challenge_players(class_id,instructor_email)
 select id,instructor_email from public.attendance_classes where progress_tool='archery';
do $$ declare constraint_row record;begin
 for constraint_row in select conname from pg_constraint where conrelid='public.archery_challenges'::regclass and contype='f' and confrelid='public.attendance_enrollments'::regclass loop
  execute format('alter table public.archery_challenges drop constraint %I',constraint_row.conname);
 end loop;
end $$;
alter table public.archery_challenges add constraint archery_challenger_player_class_fk foreign key(challenger,class_id) references public.archery_challenge_players(id,class_id);
alter table public.archery_challenges add constraint archery_opponent_player_class_fk foreign key(opponent,class_id) references public.archery_challenge_players(id,class_id);

create function archery_private.challenge_player_name(p_class uuid,p_player uuid) returns text
language sql stable security invoker set search_path=public as $$
 select coalesce(ee.name,'Instructor') from archery_challenge_players cp
 left join attendance_enrollments ee on ee.id=cp.enrollment_id and ee.class_id=cp.class_id
 where cp.id=p_player and cp.class_id=p_class
$$;
create function archery_private.challenge_view(ch public.archery_challenges,p_actor text) returns jsonb
language sql stable security invoker set search_path=public as $$
 select (to_jsonb(ch)-'reported_by')||jsonb_build_object(
  'challenger_name',archery_private.challenge_player_name(ch.class_id,ch.challenger),
  'opponent_name',archery_private.challenge_player_name(ch.class_id,ch.opponent),
  'reported_by_me',coalesce(ch.reported_by=p_actor,false),
  'dispute',(select archery_private.dispute_summary(d) from archery_result_disputes d where d.class_id=ch.class_id and d.challenge_id=ch.id))
$$;
alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_history;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb;c attendance_classes;owner boolean;me uuid;host archery_challenge_players;op archery_challenge_players;
 ch archery_challenges;d archery_result_disputes;id_value uuid;winner uuid;today date;participant boolean;
 notes_value text;game_value text;challenges jsonb;people jsonb;queue jsonb;entry jsonb;players jsonb;
begin
 if p_action is null or p_action not in ('list','challenge_create','challenge_respond','challenge_result','challenge_confirm','challenge_cancel','dispute_resolve') then
  return archery_private.archery_api_history(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 -- Reuse verified identity, enrollment dates, class/tool checks and the class
 -- row lock. Practice, tournament and legacy history rules stay unchanged.
 data:=archery_private.archery_api_history(p_actor,p_sub,p_instructor,'list',p_body);
 select * into c from attendance_classes where id=(data->>'classId')::uuid;
 owner:=(data->>'instructor')::boolean;today:=(data->>'today')::date;me:=(data->>'me')::uuid;
 insert into archery_challenge_players(id,class_id,enrollment_id)
  select id,class_id,id from attendance_enrollments where class_id=c.id on conflict(id) do nothing;
 insert into archery_challenge_players(class_id,instructor_email) values(c.id,c.instructor_email) on conflict(class_id,instructor_email) do nothing;
 select * into host from archery_challenge_players where class_id=c.id and instructor_email=c.instructor_email for update;
 if owner then
  if host.instructor_sub is null then
   update archery_challenge_players set instructor_sub=p_sub where id=host.id returning * into host;
  end if;
  me:=case when host.instructor_sub=p_sub then host.id else null end;
 end if;
 if p_action='list' then
  with authorized as (select ch0.* from archery_challenges ch0 where ch0.class_id=c.id and (owner or me in (ch0.challenger,ch0.opponent))),
  visible as (select a.* from authorized a where a.status in ('pending','accepted') or a.id in (
   select z.id from authorized z where z.status not in ('pending','accepted') order by z.created_at desc,z.id desc limit 100))
  select coalesce(jsonb_agg(archery_private.challenge_view(v,p_actor) order by v.created_at desc,v.id desc),'[]') into challenges from visible v;
  select coalesce(jsonb_agg(jsonb_build_object('id',cp.id,'name',coalesce(ee.name,'Instructor')) order by cp.enrollment_id is null desc,ee.name,cp.id),'[]') into people
   from archery_challenge_players cp left join attendance_enrollments ee on ee.id=cp.enrollment_id and ee.class_id=c.id
   where cp.class_id=c.id and (cp.id=host.id or (ee.removed_at is null and ee.id is not null and ee.effective_from<=today and (ee.effective_to is null or ee.effective_to>=today)));
  queue:='[]';
  if owner then
   -- Preserve match queues from the existing implementation, replacing only
   -- challenge entries so instructor names and both players are included.
   for entry in select value from jsonb_array_elements(coalesce(data->'disputes','[]')) where value->>'kind'<>'challenge' loop queue:=queue||jsonb_build_array(entry);end loop;
   for d in select * from archery_result_disputes where class_id=c.id and kind='challenge' and status='pending' order by created_at,id loop
    select * into ch from archery_challenges where class_id=c.id and id=d.challenge_id;
    players:=jsonb_build_array(jsonb_build_object('id',ch.challenger,'name',archery_private.challenge_player_name(c.id,ch.challenger)),jsonb_build_object('id',ch.opponent,'name',archery_private.challenge_player_name(c.id,ch.opponent)));
    queue:=queue||jsonb_build_array(archery_private.dispute_summary(d)||jsonb_build_object('kind','challenge','result_id',ch.id,'players',players,'game',ch.game,'tournament_title',null));
   end loop;
  end if;
  return data||jsonb_build_object('challengeMe',me,'challengeRoster',people,'challenges',challenges,'disputes',queue);
 end if;
 if c.archived then raise exception 'Restore this class before recording new activity';end if;
 id_value:=nullif(p_body->>'id','')::uuid;
 if id_value is null then raise exception 'A request ID is required';end if;
 if p_action='challenge_create' then
  if me is null then raise exception 'Use the same verified instructor identity for challenges';end if;
  if today not between c.start_date and c.end_date then raise exception 'Challenges require a current class term';end if;
  select cp.* into op from archery_challenge_players cp left join attendance_enrollments ee on ee.id=cp.enrollment_id and ee.class_id=c.id
   where cp.class_id=c.id and cp.id=(p_body->>'opponentId')::uuid and
    (cp.id=host.id or (ee.id is not null and ee.removed_at is null and ee.effective_from<=today and (ee.effective_to is null or ee.effective_to>=today)));
  if op.id is null then raise exception 'Choose an active enrolled classmate or the instructor';end if;
  if op.id=me or op.instructor_email=p_actor or exists(select 1 from attendance_enrollments ee where ee.id=op.enrollment_id and ee.email=p_actor) then raise exception 'Choose another player, not yourself';end if;
  game_value:=trim(p_body->>'game');if coalesce(length(game_value),0) not between 1 and 160 then raise exception 'Enter a game name';end if;
  select * into ch from archery_challenges where id=id_value;
  if ch.id is not null then
   if ch.class_id<>c.id or ch.challenger<>me or ch.opponent<>op.id or ch.game<>game_value then raise exception 'This challenge was already saved';end if;
   return jsonb_build_object('challenge',archery_private.challenge_view(ch,p_actor),'duplicate',true);
  end if;
  if exists(select 1 from archery_challenges x where x.class_id=c.id and least(x.challenger,x.opponent)=least(me,op.id) and greatest(x.challenger,x.opponent)=greatest(me,op.id) and x.status in ('pending','accepted')) then raise exception 'You already have an active challenge with this player';end if;
  if (select count(*) from archery_challenges where class_id=c.id and challenger=me and created_at>clock_timestamp()-interval '5 minutes')>=5 then raise exception 'Wait a few minutes before sending more challenges';end if;
  insert into archery_challenges(id,class_id,challenger,opponent,game) values(id_value,c.id,me,op.id,game_value) returning * into ch;
  return jsonb_build_object('challenge',archery_private.challenge_view(ch,p_actor));
 end if;
 if p_action='dispute_resolve' then
  select * into d from archery_result_disputes where id=id_value and class_id=c.id for update;
  if d.id is null or d.kind<>'challenge' then return archery_private.archery_api_history(p_actor,p_sub,p_instructor,p_action,p_body);end if;
  if not owner then raise exception 'Instructor access required';end if;
  select * into ch from archery_challenges where id=d.challenge_id and class_id=c.id for update;
 else
  select * into ch from archery_challenges where id=id_value and class_id=c.id for update;
  select * into d from archery_result_disputes where challenge_id=ch.id and class_id=c.id for update;
 end if;
 if ch.id is null or (not owner and (me is null or me not in (ch.challenger,ch.opponent))) then raise exception 'Challenge not found or access denied';end if;
 -- A replacement owner can referee history, but cannot impersonate a former
 -- owner or silently reuse a player bound to another Google subject.
 if owner and exists(select 1 from archery_challenge_players cp where cp.class_id=c.id and cp.id in (ch.challenger,ch.opponent) and cp.instructor_email=p_actor and cp.instructor_sub is distinct from p_sub) then raise exception 'Use the same verified instructor identity for this challenge';end if;
 -- An email rename or a former student becoming class owner must never turn
 -- that same verified person into an automatic referee of their own result.
 -- Historical identity changes require explicit dispute review/cancellation.
 if owner and p_action not in ('dispute_resolve','challenge_cancel') and exists(
  select 1 from archery_challenge_players cp left join attendance_enrollments ee on ee.id=cp.enrollment_id and ee.class_id=cp.class_id
  where cp.class_id=c.id and cp.id in (ch.challenger,ch.opponent) and cp.id is distinct from me and
   (cp.instructor_sub=p_sub or ee.google_sub=p_sub or (ee.email=p_actor and ee.google_sub is null))
 ) then raise exception 'Your challenge identity changed. Use explicit instructor review or cancel this historical challenge';end if;
 participant:=me is not null and me in (ch.challenger,ch.opponent);
 notes_value:=coalesce(p_body->>'notes','');
 if length(notes_value)>2000 then raise exception 'Keep result notes to 2000 characters';end if;
 if p_action='dispute_resolve' then
  winner:=(p_body->>'winnerId')::uuid;
  if winner is null or winner not in (ch.challenger,ch.opponent) then raise exception 'Winner must be a participant';end if;
  if d.status='resolved' then
   if d.winner_id=winner and d.decision_notes=notes_value then return jsonb_build_object('saved',true,'duplicate',true);end if;
   raise exception 'This dispute was already resolved';
  end if;
  if d.status<>'pending' then raise exception 'This dispute is cancelled';end if;
  if ch.status<>'accepted' or ch.winner_id is not null then raise exception 'This challenge is closed';end if;
  update archery_challenges set status='completed',winner_id=winner,proposed_winner=null,reported_by=null,notes=notes_value where id=ch.id;
  update archery_result_disputes set status='resolved',winner_id=winner,decision_notes=notes_value,resolved_by=p_actor,resolved_sub=p_sub,resolved_at=clock_timestamp() where id=d.id;
  return jsonb_build_object('saved',true);
 end if;
 if d.status='pending' then
  if p_action='challenge_cancel' and owner then
   update archery_challenges set status='cancelled' where id=ch.id;
   update archery_result_disputes set status='cancelled',resolved_by=p_actor,resolved_sub=p_sub,resolved_at=clock_timestamp() where id=d.id;
   return jsonb_build_object('saved',true);
  end if;
  if p_action='challenge_confirm' and p_body->'accept'='false'::jsonb and d.raised_by=p_actor and d.raised_sub=p_sub then return jsonb_build_object('saved',true,'duplicate',true);end if;
  raise exception 'Result disputed. Find your instructor for a decision';
 end if;
 if p_action='challenge_respond' then
  if me is distinct from ch.opponent then raise exception 'Only the opponent can accept or decline';end if;
  if jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Accept or decline the challenge';end if;
  if ch.status<>'pending' then raise exception 'This invitation is no longer pending';end if;
  update archery_challenges set status=case when (p_body->>'accept')::boolean then 'accepted' else 'declined' end where id=ch.id;
 elsif p_action='challenge_cancel' then
  if not owner and me is distinct from ch.challenger then raise exception 'Only the challenger can cancel';end if;
  if ch.status not in ('pending','accepted') then raise exception 'This challenge is already closed';end if;
  update archery_challenges set status='cancelled' where id=ch.id;
 elsif p_action='challenge_result' then
  if ch.status<>'accepted' then raise exception 'This challenge is completed or not accepted';end if;
  winner:=(p_body->>'winnerId')::uuid;
  if winner is null or winner not in (ch.challenger,ch.opponent) then raise exception 'Winner must be a participant';end if;
  if ch.proposed_winner is not null and (not owner or participant) then raise exception 'A result is awaiting confirmation';end if;
  update archery_challenges set proposed_winner=case when owner and not participant then null else winner end,reported_by=p_actor,
   winner_id=case when owner and not participant then winner else null end,status=case when owner and not participant then 'completed' else 'accepted' end,notes=notes_value where id=ch.id;
 elsif p_action='challenge_confirm' then
  if jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Confirm or dispute the result';end if;
  if ch.status<>'accepted' or ch.proposed_winner is null then raise exception 'There is no result to confirm';end if;
  if ch.reported_by=p_actor then raise exception 'The other player must confirm or dispute';end if;
  if (p_body->>'accept')::boolean then
   update archery_challenges set status='completed',winner_id=proposed_winner,proposed_winner=null,reported_by=null where id=ch.id;
  else
   if not participant then raise exception 'Only a match participant can dispute';end if;
   if d.id is not null then raise exception 'This dispute is already resolved or cancelled';end if;
   insert into archery_result_disputes(class_id,kind,challenge_id,reported_winner,reported_notes,reported_by,raised_by,raised_sub)
    values(c.id,'challenge',ch.id,ch.proposed_winner,ch.notes,ch.reported_by,p_actor,p_sub);
  end if;
 end if;
 select * into ch from archery_challenges where id=ch.id;
 return jsonb_build_object('challenge',archery_private.challenge_view(ch,p_actor));
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_history(text,text,boolean,text,jsonb),archery_private.challenge_view(public.archery_challenges,text),archery_private.challenge_player_name(uuid,uuid) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_history(text,text,boolean,text,jsonb),archery_private.challenge_view(public.archery_challenges,text),archery_private.challenge_player_name(uuid,uuid) to service_role;
