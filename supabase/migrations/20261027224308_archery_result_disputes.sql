-- Disputed results remain pending until the verified owning instructor decides.
-- Audit identities are stored separately and never serialized to players.
create table public.archery_result_disputes (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.attendance_classes(id),
 kind text not null check(kind in ('challenge','match')),
 challenge_id uuid unique references public.archery_challenges(id),
 match_id uuid unique references public.archery_matches(id),
 status text not null default 'pending' check(status in ('pending','resolved','cancelled')),
 reported_winner uuid not null,
 reported_notes text not null default '' check(length(reported_notes)<=2000),
 reported_by text not null,
 raised_by text not null,
 raised_sub text not null,
 created_at timestamptz not null default clock_timestamp(),
 winner_id uuid,
 decision_notes text not null default '' check(length(decision_notes)<=2000),
 resolved_by text,
 resolved_sub text,
 resolved_at timestamptz,
 check(num_nonnulls(challenge_id,match_id)=1),
 check((kind='challenge')=(challenge_id is not null)),
 check((status='resolved')=(winner_id is not null)),
 check((status='pending')=(resolved_at is null)),
 check((status='pending')=(resolved_by is null and resolved_sub is null))
);
create index archery_pending_disputes on public.archery_result_disputes(class_id,created_at) where status='pending';
alter table public.archery_result_disputes enable row level security;
revoke all on public.archery_result_disputes from public,anon,authenticated;
grant select,insert,update on public.archery_result_disputes to service_role;

create function archery_private.dispute_summary(d public.archery_result_disputes) returns jsonb
language sql immutable security invoker set search_path=public as $$
 select jsonb_build_object('id',d.id,'status',d.status,'reported_winner',d.reported_winner,'reported_notes',d.reported_notes,
  'created_at',d.created_at,'winner_id',d.winner_id,'decision_notes',d.decision_notes,'resolved_at',d.resolved_at)
$$;

alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_tournaments;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb;result jsonb;c attendance_classes;owner boolean;me uuid;tournament_me uuid;
 ch archery_challenges;m archery_matches;t archery_tournaments;d archery_result_disputes;
 id_value uuid;winner uuid;pa uuid;pb uuid;proposed uuid;reporter text;notes_value text;kind_value text;
 items jsonb;item jsonb;queue jsonb:='[]';players jsonb;game_value text;title_value text;
begin
 if p_action is null or p_action not in ('list','challenge_result','challenge_confirm','challenge_cancel','match_result','match_confirm','tournament_cancel','dispute_resolve') then
  return archery_private.archery_api_tournaments(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 -- Validates identity/class/enrollment and holds the existing class lock for
 -- the entire transaction, including disputes, decisions and cancellations.
 data:=archery_private.archery_api_tournaments(p_actor,p_sub,p_instructor,'list',p_body);
 owner:=(data->>'instructor')::boolean;me:=(data->>'me')::uuid;tournament_me:=(data->>'tournamentMe')::uuid;
 select * into c from attendance_classes where id=(data->>'classId')::uuid;
 if p_action='list' then
  items:='[]';
  for item in select value from jsonb_array_elements(data->'challenges') loop
   select * into d from archery_result_disputes where class_id=c.id and challenge_id=(item->>'id')::uuid;
   items:=items||jsonb_build_array(item||jsonb_build_object('dispute',case when d.id is not null then archery_private.dispute_summary(d) end));
  end loop;
  data:=data||jsonb_build_object('challenges',items);items:='[]';
  for item in select value from jsonb_array_elements(data->'matches') loop
   select * into d from archery_result_disputes where class_id=c.id and match_id=(item->>'id')::uuid;
   items:=items||jsonb_build_array(item||jsonb_build_object('dispute',case when d.id is not null then archery_private.dispute_summary(d) end));
  end loop;
  -- Do not derive the queue from the ordinary 30-tournament / 100-challenge
  -- history windows. Older pending disputes must remain visible to the owner.
  if owner then
   for d in select * from archery_result_disputes where class_id=c.id and status='pending' order by created_at,id loop
    title_value:=null;
    if d.kind='challenge' then
     select * into ch from archery_challenges where id=d.challenge_id and class_id=c.id;
     pa:=ch.challenger;pb:=ch.opponent;game_value:=ch.game;
     select jsonb_agg(jsonb_build_object('id',ee.id,'name',ee.name) order by array_position(array[pa,pb],ee.id)) into players
      from attendance_enrollments ee where ee.class_id=c.id and ee.id in (pa,pb);
    else
     select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=d.match_id and tt.class_id=c.id;
     select * into t from archery_tournaments where id=m.tournament_id;
     pa:=m.a;pb:=m.b;game_value:=t.game;title_value:=t.title;
     select jsonb_agg(jsonb_build_object('id',cp.id,'name',coalesce(ee.name,'Instructor')) order by array_position(array[pa,pb],cp.id)) into players
      from archery_competitors cp left join attendance_enrollments ee on ee.id=cp.enrollment_id where cp.class_id=c.id and cp.id in (pa,pb);
    end if;
    queue:=queue||jsonb_build_array(archery_private.dispute_summary(d)||jsonb_build_object('kind',d.kind,'result_id',coalesce(d.challenge_id,d.match_id),'players',players,'game',game_value,'tournament_title',title_value));
   end loop;
  end if;
  return data||jsonb_build_object('matches',items,'disputes',queue);
 end if;
 if c.archived then raise exception 'Restore this class before recording new activity';end if;
 id_value:=nullif(p_body->>'id','')::uuid;
 if id_value is null then raise exception 'A request ID is required';end if;
 if p_action='dispute_resolve' then
  if not owner then raise exception 'Instructor access required';end if;
  select * into d from archery_result_disputes where id=id_value and class_id=c.id for update;
  if d.id is null then raise exception 'Dispute not found or access denied';end if;
  winner:=(p_body->>'winnerId')::uuid;notes_value:=coalesce(p_body->>'notes','');
  if d.status='cancelled' then raise exception 'This dispute is cancelled';end if;
  if d.kind='challenge' then
   select * into ch from archery_challenges where id=d.challenge_id and class_id=c.id for update;
   pa:=ch.challenger;pb:=ch.opponent;
  else
   select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=d.match_id and tt.class_id=c.id for update of mm;
   select * into t from archery_tournaments where id=m.tournament_id;
   pa:=m.a;pb:=m.b;
   if exists(select 1 from archery_competitors cp where cp.class_id=c.id and cp.id in (pa,pb) and cp.instructor_email=p_actor and cp.instructor_sub<>p_sub) then
    raise exception 'Use the same verified instructor identity that joined this tournament';
   end if;
  end if;
  if winner is null or (winner is distinct from pa and winner is distinct from pb) then raise exception 'Winner must be a participant';end if;
  if length(notes_value)>2000 then raise exception 'Keep decision notes to 2000 characters';end if;
  if d.status='resolved' then
   if d.winner_id=winner and d.decision_notes=notes_value then return jsonb_build_object('saved',true,'duplicate',true);end if;
   raise exception 'This dispute was already resolved';
  end if;
  if d.kind='challenge' then
   if ch.status<>'accepted' or ch.winner_id is not null then raise exception 'This challenge is closed';end if;
   update archery_challenges set status='completed',winner_id=winner,proposed_winner=null,reported_by=null,notes=notes_value where id=ch.id;
  else
   if t.status<>'active' or m.winner_id is not null or m.bye then raise exception 'This match is closed';end if;
   -- Explicit resolution is also available when the instructor opted in as a
   -- competitor. Ordinary self-reported results still need peer confirmation.
   perform archery_private.record_match(m.id,winner,notes_value);
  end if;
  update archery_result_disputes set status='resolved',winner_id=winner,decision_notes=notes_value,resolved_by=p_actor,resolved_sub=p_sub,resolved_at=clock_timestamp() where id=d.id;
  return jsonb_build_object('saved',true);
 end if;
 if p_action='tournament_cancel' then
  result:=archery_private.archery_api_tournaments(p_actor,p_sub,p_instructor,p_action,p_body);
  update archery_result_disputes dd set status='cancelled',resolved_by=p_actor,resolved_sub=p_sub,resolved_at=clock_timestamp()
   from archery_matches mm where dd.match_id=mm.id and mm.tournament_id=id_value and dd.class_id=c.id and dd.status='pending';
  return result;
 end if;
 kind_value:=case when p_action like 'challenge_%' then 'challenge' else 'match' end;
 if kind_value='challenge' then
  select * into ch from archery_challenges where id=id_value and class_id=c.id for update;
  pa:=ch.challenger;pb:=ch.opponent;proposed:=ch.proposed_winner;reporter:=ch.reported_by;notes_value:=ch.notes;
  if ch.id is null or (not owner and me is distinct from pa and me is distinct from pb) then raise exception 'Challenge not found or access denied';end if;
  select * into d from archery_result_disputes where challenge_id=ch.id and class_id=c.id for update;
 else
  select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=id_value and tt.class_id=c.id for update of mm;
  select * into t from archery_tournaments where id=m.tournament_id;
  pa:=m.a;pb:=m.b;proposed:=m.proposed_winner;reporter:=m.reported_by;notes_value:=m.notes;me:=tournament_me;
  if m.id is null or (not owner and me is distinct from pa and me is distinct from pb) then raise exception 'Match not found or access denied';end if;
  select * into d from archery_result_disputes where match_id=m.id and class_id=c.id for update;
 end if;
 if p_action in ('challenge_confirm','match_confirm') and jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Confirm or dispute the result';end if;
 if d.status='pending' then
  if p_action='challenge_cancel' and owner then
   result:=archery_private.archery_api_tournaments(p_actor,p_sub,p_instructor,p_action,p_body);
   update archery_result_disputes set status='cancelled',resolved_by=p_actor,resolved_sub=p_sub,resolved_at=clock_timestamp() where id=d.id;
   return result;
  end if;
  if p_action in ('challenge_confirm','match_confirm') and not (p_body->>'accept')::boolean and d.raised_by=p_actor and d.raised_sub=p_sub then
   return jsonb_build_object('saved',true,'duplicate',true);
  end if;
  raise exception 'Result disputed. Find your instructor for a decision';
 end if;
 if p_action in ('challenge_confirm','match_confirm') and not (p_body->>'accept')::boolean then
  if d.id is not null then raise exception 'This dispute is already resolved or cancelled';end if;
  if me is null or (me is distinct from pa and me is distinct from pb) then raise exception 'Only a match participant can dispute';end if;
  if proposed is null then raise exception 'There is no result to confirm';end if;
  if reporter=p_actor then raise exception 'The other player must confirm or dispute';end if;
  if kind_value='challenge' and (ch.status<>'accepted' or ch.winner_id is not null) then raise exception 'This challenge is completed';end if;
  if kind_value='match' and (t.status<>'active' or m.winner_id is not null or m.bye or pa is null or pb is null) then raise exception 'This match is completed or not ready';end if;
  insert into archery_result_disputes(class_id,kind,challenge_id,match_id,reported_winner,reported_notes,reported_by,raised_by,raised_sub)
   values(c.id,kind_value,case when kind_value='challenge' then ch.id end,case when kind_value='match' then m.id end,proposed,coalesce(notes_value,''),reporter,p_actor,p_sub);
  return jsonb_build_object('saved',true);
 end if;
 return archery_private.archery_api_tournaments(p_actor,p_sub,p_instructor,p_action,p_body);
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_tournaments(text,text,boolean,text,jsonb),archery_private.dispute_summary(public.archery_result_disputes) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_tournaments(text,text,boolean,text,jsonb),archery_private.dispute_summary(public.archery_result_disputes) to service_role;
