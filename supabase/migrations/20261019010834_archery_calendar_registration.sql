-- Calendar dates, self-registration, and peer-confirmed match results.
alter table public.archery_tournaments add column event_date date;
update public.archery_tournaments tt set event_date=(tt.created_at at time zone cc.timezone)::date from public.attendance_classes cc where cc.id=tt.class_id;
alter table public.archery_tournaments alter column event_date set not null;
alter table public.archery_tournaments add column registration_ends_at timestamptz;
alter table public.archery_tournaments add column registration_closed_at timestamptz;
alter table public.archery_tournaments add column instructions text not null default '' check(length(instructions)<=1000);
alter table public.archery_tournaments alter column bracket_size drop not null;
alter table public.archery_tournaments drop constraint archery_tournaments_status_check;
alter table public.archery_tournaments add constraint archery_tournaments_status_check check(status in ('registration','registration_closed','active','completed','cancelled'));
alter table public.archery_matches add column proposed_winner uuid references public.attendance_enrollments(id);
alter table public.archery_matches add column reported_by text;
alter table public.archery_matches add constraint archery_match_proposed_participant check(proposed_winner is null or proposed_winner in (a,b));

-- Keep the old implementation behind a non-exposed schema. The public endpoint
-- continues to receive only the server-verified identity, never a client role.
create schema if not exists archery_private;
revoke all on schema archery_private from public,anon,authenticated;
grant usage on schema archery_private to service_role;
alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_legacy;

create function archery_private.lock_draw(p_id uuid) returns boolean language plpgsql security invoker set search_path=public as $$
declare t archery_tournaments; c attendance_classes; ids uuid[]; shuffled uuid[]; slots integer[]:=array[1,2]; next_slots integer[]; n integer; size integer:=2; r integer; pos integer; i integer; seed integer; m archery_matches; w uuid; today date;
begin
 select * into t from archery_tournaments where id=p_id for update;
 if t.id is null or t.status='cancelled' then raise exception 'Tournament not found or cancelled'; end if;
 if t.status in ('active','completed') then return true; end if;
 select * into c from attendance_classes where id=t.class_id;
 today:=(clock_timestamp() at time zone c.timezone)::date;
 ids:=array(select ee.id from attendance_enrollments ee where ee.id=any(t.participants) and ee.class_id=c.id and ee.removed_at is null and ee.effective_from<=today and (ee.effective_to is null or ee.effective_to>=today) order by array_position(t.participants,ee.id));
 n:=cardinality(ids);
 update archery_tournaments set participants=ids,status='registration_closed',registration_closed_at=coalesce(registration_closed_at,clock_timestamp()) where id=t.id;
 if n<2 then return false; end if;
 while size<n loop size:=size*2; end loop;
 shuffled:=array(select x from unnest(ids) x order by random());
 while cardinality(slots)<size loop
  next_slots:='{}';foreach seed in array slots loop next_slots:=next_slots||seed||(2*cardinality(slots)+1-seed);end loop;slots:=next_slots;
 end loop;
 update archery_tournaments set bracket_size=size,status='active' where id=t.id;
 r:=1;pos:=size/2;
 while pos>=1 loop
  for i in 1..pos loop insert into archery_matches(tournament_id,round,position) values(t.id,r,i);end loop;
  pos:=pos/2;r:=r+1;
 end loop;
 for i in 1..size/2 loop
  update archery_matches set a=shuffled[slots[2*i-1]],b=shuffled[slots[2*i]] where tournament_id=t.id and round=1 and position=i returning * into m;
  if m.a is null or m.b is null then
   w:=coalesce(m.a,m.b);update archery_matches set bye=true,winner_id=w where id=m.id;
   if i%2=1 then update archery_matches set a=w where tournament_id=t.id and round=2 and position=(i+1)/2;
   else update archery_matches set b=w where tournament_id=t.id and round=2 and position=(i+1)/2;end if;
  end if;
 end loop;
 return true;
end $$;

create function archery_private.record_match(p_id uuid,p_winner uuid,p_notes text) returns void language plpgsql security invoker set search_path=public as $$
declare m archery_matches;t archery_tournaments;
begin
 select * into m from archery_matches where id=p_id for update;
 select * into t from archery_tournaments where id=m.tournament_id;
 if m.id is null then raise exception 'Match not found'; end if;
 if p_winner is null or (p_winner is distinct from m.a and p_winner is distinct from m.b) then raise exception 'Winner must be a participant'; end if;
 if m.winner_id is not null then
  if m.winner_id=p_winner then return;end if;
  raise exception 'This match is completed';
 end if;
 if t.status<>'active' or m.a is null or m.b is null or m.bye then raise exception 'This match is not ready'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Keep result notes to 2000 characters'; end if;
 update archery_matches set winner_id=p_winner,notes=coalesce(p_notes,''),proposed_winner=null,reported_by=null where id=m.id;
 if 2^m.round=t.bracket_size then update archery_tournaments set status='completed',winner_id=p_winner where id=t.id;
 elsif m.position%2=1 then update archery_matches set a=p_winner where tournament_id=t.id and round=m.round+1 and position=(m.position+1)/2;
 else update archery_matches set b=p_winner where tournament_id=t.id and round=m.round+1 and position=(m.position+1)/2;end if;
end $$;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb; c attendance_classes; me uuid; owner boolean; today date; t archery_tournaments; m archery_matches; id_value uuid; winner uuid; deadline timestamptz; normalized_matches jsonb; drawn boolean;
begin
 -- The legacy list performs verified-identity, active-enrollment and subject checks
 -- and holds the class row lock until this entire transaction commits.
 data:=archery_private.archery_api_legacy(p_actor,p_sub,p_instructor,'list',p_body);
 me:=(data->>'me')::uuid;owner:=(data->>'instructor')::boolean;today:=(data->>'today')::date;
 select * into c from attendance_classes where id=(data->>'classId')::uuid;
 if p_action is null then raise exception 'Unknown archery action';end if;
 if p_action='tournament_create' then raise exception 'Open registration and let students join before creating a draw';end if;
 if p_action in ('tournament_open','tournament_close','tournament_cancel') and not owner then raise exception 'Instructor access required'; end if;
 if p_action<>'list' and c.archived then raise exception 'Restore this class before recording new activity';end if;
 if p_action='list' then
  update archery_tournaments set status='registration_closed',registration_closed_at=coalesce(registration_closed_at,registration_ends_at) where class_id=c.id and status='registration' and registration_ends_at<=clock_timestamp();
  data:=archery_private.archery_api_legacy(p_actor,p_sub,p_instructor,'list',p_body);
  select coalesce(jsonb_agg(value-'reported_by'||jsonb_build_object('reported_by_me',coalesce(value->>'reported_by'=p_actor,false))),'[]') into normalized_matches from jsonb_array_elements(data->'matches');
  return data||jsonb_build_object('matches',normalized_matches,'serverNow',clock_timestamp(),'timezone',c.timezone,'classEndDate',c.end_date);
 end if;
 if p_action not in ('tournament_open','tournament_join','tournament_leave','tournament_close','tournament_cancel','match_result','match_confirm') then
  return archery_private.archery_api_legacy(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 id_value:=nullif(p_body->>'id','')::uuid;
 if id_value is null then raise exception 'A request ID is required';end if;
 if p_action='tournament_open' then
  if (p_body->>'date')::date is distinct from today then raise exception 'Open registration for today';end if;
  if p_body ? 'participants' then raise exception 'Students must opt in to registration themselves';end if;
  if coalesce(length(trim(p_body->>'title')),0) not between 1 and 120 or coalesce(length(trim(p_body->>'game')),0) not between 1 and 160 or length(coalesce(p_body->>'instructions',''))>1000 then raise exception 'Enter a title, game and valid instructions';end if;
  select * into t from archery_tournaments where id=id_value;
  if t.id is not null then
   if t.class_id<>c.id or t.event_date<>today or t.title<>trim(p_body->>'title') or t.game<>trim(p_body->>'game') or t.instructions<>coalesce(p_body->>'instructions','') then raise exception 'This tournament was already saved';end if;
   return jsonb_build_object('tournament',to_jsonb(t));
  end if;
  deadline:=clock_timestamp()+interval '5 minutes';
  insert into archery_tournaments(id,class_id,title,game,instructions,event_date,participants,bracket_size,status,registration_ends_at)
   values(id_value,c.id,trim(p_body->>'title'),trim(p_body->>'game'),coalesce(p_body->>'instructions',''),today,'{}',null,'registration',deadline) returning * into t;
  return jsonb_build_object('tournament',to_jsonb(t));
 elsif p_action in ('tournament_join','tournament_leave','tournament_close','tournament_cancel') then
  select * into t from archery_tournaments where id=id_value and class_id=c.id for update;
  if t.id is null then raise exception 'Tournament not found or access denied';end if;
  if p_action='tournament_cancel' then
   if t.status not in ('registration','registration_closed','active') then raise exception 'This tournament is already closed';end if;
   update archery_tournaments set status='cancelled',registration_closed_at=coalesce(registration_closed_at,clock_timestamp()) where id=t.id returning * into t;
  elsif p_action='tournament_close' then
   drawn:=archery_private.lock_draw(t.id);
   select * into t from archery_tournaments where id=id_value;
   return jsonb_build_object('tournament',to_jsonb(t),'drawn',drawn);
  else
   if me is null then raise exception 'Only an enrolled student can join or leave';end if;
   if t.status<>'registration' or t.registration_ends_at<=clock_timestamp() then raise exception 'Registration is closed';end if;
   if p_action='tournament_join' then
    if not(me=any(t.participants)) then
     if cardinality(t.participants)>=64 then raise exception 'This tournament is full';end if;
     update archery_tournaments set participants=participants||me where id=t.id returning * into t;
    end if;
   else update archery_tournaments set participants=array_remove(participants,me) where id=t.id returning * into t;
   end if;
  end if;
  return jsonb_build_object('tournament',to_jsonb(t));
 else
  select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=id_value and tt.class_id=c.id for update of mm;
  if m.id is null or (not owner and me is distinct from m.a and me is distinct from m.b) then raise exception 'Match not found or access denied';end if;
  select * into t from archery_tournaments where id=m.tournament_id;
  if p_action='match_result' and owner then
   perform archery_private.record_match(m.id,(p_body->>'winnerId')::uuid,p_body->>'notes');
   return jsonb_build_object('saved',true);
  end if;
  if t.status<>'active' or m.a is null or m.b is null or m.bye then raise exception 'This match is not ready or completed';end if;
  if p_action='match_result' then
   winner:=(p_body->>'winnerId')::uuid;
   if winner is null or winner not in (m.a,m.b) then raise exception 'Winner must be a participant';end if;
   if length(coalesce(p_body->>'notes',''))>2000 then raise exception 'Keep result notes to 2000 characters';end if;
   if m.winner_id is not null then
    if m.winner_id=winner then return jsonb_build_object('saved',true,'duplicate',true);end if;
    raise exception 'This match is completed';
   end if;
   if m.proposed_winner is not null then
    if m.reported_by=p_actor and m.proposed_winner=winner and m.notes=coalesce(p_body->>'notes','') then return jsonb_build_object('saved',true,'duplicate',true);end if;
    raise exception 'A result is awaiting the other player confirmation';
   end if;
   update archery_matches set proposed_winner=winner,reported_by=p_actor,notes=coalesce(p_body->>'notes','') where id=m.id;
  else
   if m.proposed_winner is null then raise exception 'There is no result to confirm';end if;
   if m.reported_by=p_actor then raise exception 'The other player must confirm';end if;
   if jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Confirm or dispute the result';end if;
   if (p_body->>'accept')::boolean then perform archery_private.record_match(m.id,m.proposed_winner,m.notes);
   else update archery_matches set proposed_winner=null,reported_by=null,notes='' where id=m.id;end if;
  end if;
  return jsonb_build_object('saved',true);
 end if;
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb) to service_role;
revoke all on function archery_private.lock_draw(uuid),archery_private.record_match(uuid,uuid,text),archery_private.archery_api_legacy(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function archery_private.lock_draw(uuid),archery_private.record_match(uuid,uuid,text),archery_private.archery_api_legacy(text,text,boolean,text,jsonb) to service_role;
