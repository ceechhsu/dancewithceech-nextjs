-- Private archery tools. No grants to browser roles; identity comes from the trusted server.
create table public.archery_rounds (
 id uuid primary key, class_id uuid not null references attendance_classes(id), enrollment_id uuid not null,
 entry_date date not null, distance numeric not null check(distance>0 and distance<=1000), unit text not null check(unit in ('m','yd')),
 scores integer[] not null check(cardinality(scores) between 1 and 100 and 0<=all(scores) and 10>=all(scores)),
 total integer not null, notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default clock_timestamp(),
 foreign key(enrollment_id,class_id) references attendance_enrollments(id,class_id)
);
create index archery_round_history on archery_rounds(class_id,enrollment_id,entry_date desc);
create table public.archery_challenges (
 id uuid primary key, class_id uuid not null references attendance_classes(id), challenger uuid not null, opponent uuid not null,
 game text not null check(length(trim(game)) between 1 and 160), status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled','completed')),
 proposed_winner uuid, reported_by text, winner_id uuid, notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default clock_timestamp(),
 check(challenger<>opponent), check(proposed_winner is null or proposed_winner in (challenger,opponent)), check(winner_id is null or winner_id in (challenger,opponent)),
 foreign key(challenger,class_id) references attendance_enrollments(id,class_id), foreign key(opponent,class_id) references attendance_enrollments(id,class_id)
);
create unique index archery_active_challenge on archery_challenges(class_id,least(challenger,opponent),greatest(challenger,opponent)) where status in ('pending','accepted');
create table public.archery_tournaments (
 id uuid primary key, class_id uuid not null references attendance_classes(id), title text not null check(length(trim(title)) between 1 and 120),
 game text not null check(length(trim(game)) between 1 and 160), participants uuid[] not null, bracket_size integer not null check(bracket_size in (2,4,8,16,32,64)),
 status text not null default 'active' check(status in ('active','completed','cancelled')), winner_id uuid references attendance_enrollments(id),
 created_at timestamptz not null default clock_timestamp()
);
create table public.archery_matches (
 id uuid primary key default gen_random_uuid(), tournament_id uuid not null references archery_tournaments(id), round integer not null, position integer not null,
 a uuid references attendance_enrollments(id), b uuid references attendance_enrollments(id), winner_id uuid references attendance_enrollments(id),
 bye boolean not null default false, notes text not null default '' check(length(notes)<=2000),
 unique(tournament_id,round,position), check(a is null or b is null or a<>b), check(winner_id is null or winner_id in (a,b))
);
do $$ declare t text; begin
 foreach t in array array['archery_rounds','archery_challenges','archery_tournaments','archery_matches'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end $$;
revoke update on public.archery_rounds from service_role;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 c attendance_classes; e attendance_enrollments; opponent_row attendance_enrollments; owner boolean; today date;
 cr archery_rounds; ch archery_challenges; t archery_tournaments; m archery_matches;
 ids uuid[]; shuffled uuid[]; slots integer[]; next_slots integer[]; scores_value integer[];
 size integer; n integer; r integer; pos integer; seed integer; i integer; w uuid;
 payload_id uuid; result jsonb; roster jsonb; rounds jsonb; challenges jsonb; tournaments jsonb; matches jsonb;
begin
 if coalesce(p_actor,'')='' or p_actor<>lower(trim(p_actor)) or coalesce(p_sub,'')='' then raise exception 'Verified Google identity required'; end if;
 if p_action is null or p_action not in ('list','round_save','challenge_create','challenge_respond','challenge_result','challenge_confirm','challenge_cancel','tournament_create','tournament_cancel','match_result') then raise exception 'Unknown archery action'; end if;
 if p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'Invalid archery request'; end if;
 -- One class lock serializes invitations, results, draws and advancement across actors.
 select * into c from attendance_classes where id=(p_body->>'classId')::uuid for update;
 if c.id is null then raise exception 'Class not found or access denied'; end if;
 owner:=coalesce(p_instructor,false) and c.instructor_email=p_actor;
 today:=(clock_timestamp() at time zone c.timezone)::date;
 if c.progress_tool<>'archery' then raise exception 'Archery is not enabled for this class'; end if;
 if not owner then
  if c.archived or today not between c.start_date and c.end_date then raise exception 'Class not found or access denied'; end if;
  select * into e from attendance_enrollments where class_id=c.id and email=p_actor and removed_at is null
   and (google_sub is null or google_sub=p_sub) and effective_from<=today and (effective_to is null or effective_to>=today)
   order by effective_from desc limit 1 for update;
  if e.id is null then raise exception 'Class not found or access denied'; end if;
  update attendance_enrollments set google_sub=p_sub where id=e.id and google_sub is null;
 end if;
 if p_action in ('tournament_create','tournament_cancel','match_result') and not owner then raise exception 'Instructor access required'; end if;
 if p_action<>'list' and c.archived then raise exception 'Restore this class before recording new activity'; end if;
 payload_id:=nullif(p_body->>'id','')::uuid;
 if p_action<>'list' and payload_id is null then raise exception 'A request ID is required'; end if;
 if p_action='round_save' then
  if e.id is null then raise exception 'Only an enrolled student can record a round'; end if;
  if coalesce(jsonb_typeof(p_body->'scores'),'')<>'array' then raise exception 'Enter arrow scores'; end if;
  if jsonb_array_length(p_body->'scores') not between 1 and 100 or exists(select 1 from jsonb_array_elements(p_body->'scores') v where jsonb_typeof(v)<>'number' or v::text !~ '^(10|[0-9])$') then raise exception 'Use 1 to 100 arrow scores, each a whole number from 0 to 10'; end if;
  scores_value:=array(select jsonb_array_elements_text(p_body->'scores')::integer);
  if coalesce((p_body->>'date')::date>today,true) or (p_body->>'date')::date<greatest(c.start_date,e.effective_from) or (p_body->>'date')::date>c.end_date then raise exception 'Choose a date within your enrollment, up to today'; end if;
  if coalesce((p_body->>'distance')::numeric<=0,true) or (p_body->>'distance')::numeric>1000 or coalesce(p_body->>'unit','') not in ('m','yd') or length(coalesce(p_body->>'notes',''))>2000 then raise exception 'Enter a valid distance, unit and notes'; end if;
  select * into cr from archery_rounds where id=payload_id;
  if cr.id is not null then
   if cr.class_id<>c.id or cr.enrollment_id<>e.id or cr.entry_date<>(p_body->>'date')::date or cr.distance<>(p_body->>'distance')::numeric or cr.unit<>p_body->>'unit' or cr.scores<>scores_value or cr.notes<>coalesce(p_body->>'notes','') then raise exception 'This round was already saved'; end if;
   return jsonb_build_object('round',to_jsonb(cr),'duplicate',true);
  end if;
  insert into archery_rounds(id,class_id,enrollment_id,entry_date,distance,unit,scores,total,notes)
   values(payload_id,c.id,e.id,(p_body->>'date')::date,(p_body->>'distance')::numeric,p_body->>'unit',scores_value,(select sum(x) from unnest(scores_value) x),coalesce(p_body->>'notes','')) returning * into cr;
  return jsonb_build_object('round',to_jsonb(cr));
 elsif p_action='challenge_create' then
  if e.id is null then raise exception 'Only an enrolled student can send a challenge'; end if;
  select * into opponent_row from attendance_enrollments where id=(p_body->>'opponentId')::uuid and class_id=c.id and removed_at is null and effective_from<=today and (effective_to is null or effective_to>=today);
  if opponent_row.id is null or opponent_row.id=e.id then raise exception 'Choose another enrolled classmate'; end if;
  if coalesce(length(trim(p_body->>'game')),0) not between 1 and 160 then raise exception 'Enter a game name'; end if;
  select * into ch from archery_challenges where id=payload_id;
  if ch.id is not null then
   if ch.class_id<>c.id or ch.challenger<>e.id or ch.opponent<>opponent_row.id or ch.game<>trim(p_body->>'game') then raise exception 'This challenge was already saved'; end if;
   return jsonb_build_object('challenge',to_jsonb(ch)-'reported_by');
  end if;
  if exists(select 1 from archery_challenges where class_id=c.id and least(challenger,opponent)=least(e.id,opponent_row.id) and greatest(challenger,opponent)=greatest(e.id,opponent_row.id) and status in ('pending','accepted')) then raise exception 'You already have an active challenge with this classmate'; end if;
  if (select count(*) from archery_challenges where challenger=e.id and created_at>clock_timestamp()-interval '5 minutes')>=5 then raise exception 'Wait a few minutes before sending more challenges'; end if;
  insert into archery_challenges(id,class_id,challenger,opponent,game) values(payload_id,c.id,e.id,opponent_row.id,trim(p_body->>'game')) returning * into ch;
  return jsonb_build_object('challenge',to_jsonb(ch)-'reported_by');
 elsif p_action like 'challenge_%' then
  select * into ch from archery_challenges where id=payload_id and class_id=c.id for update;
  if ch.id is null or (not owner and e.id not in (ch.challenger,ch.opponent)) then raise exception 'Challenge not found or access denied'; end if;
  if p_action='challenge_respond' then
   if e.id is distinct from ch.opponent then raise exception 'Only the opponent can accept or decline'; end if;
   if jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Accept or decline the challenge'; end if;
   if ch.status<>'pending' then raise exception 'This invitation is no longer pending'; end if;
   update archery_challenges set status=case when (p_body->>'accept')::boolean then 'accepted' else 'declined' end where id=ch.id;
  elsif p_action='challenge_cancel' then
   if not owner and e.id is distinct from ch.challenger then raise exception 'Only the challenger can cancel'; end if;
   if ch.status not in ('pending','accepted') then raise exception 'This challenge is already closed'; end if;
   update archery_challenges set status='cancelled' where id=ch.id;
  elsif p_action='challenge_result' then
   if ch.status='completed' then raise exception 'This challenge is completed'; end if;
   if ch.status<>'accepted' then raise exception 'The challenge must be accepted first'; end if;
   w:=(p_body->>'winnerId')::uuid;
   if w is null or w not in (ch.challenger,ch.opponent) then raise exception 'Winner must be a participant'; end if;
   if length(coalesce(p_body->>'notes',''))>2000 then raise exception 'Keep result notes to 2000 characters'; end if;
   if ch.proposed_winner is not null and not owner then raise exception 'A result is awaiting confirmation'; end if;
   update archery_challenges set proposed_winner=case when owner then null else w end,reported_by=p_actor,
    winner_id=case when owner then w else null end,status=case when owner then 'completed' else 'accepted' end,notes=coalesce(p_body->>'notes','') where id=ch.id;
  elsif p_action='challenge_confirm' then
   if ch.status<>'accepted' or ch.proposed_winner is null then raise exception 'There is no result to confirm'; end if;
   if ch.reported_by=p_actor then raise exception 'The other player must confirm this result'; end if;
   if jsonb_typeof(p_body->'accept') is distinct from 'boolean' then raise exception 'Confirm or dispute the result'; end if;
   update archery_challenges set status=case when (p_body->>'accept')::boolean then 'completed' else 'accepted' end,
    winner_id=case when (p_body->>'accept')::boolean then proposed_winner else null end,proposed_winner=null,reported_by=null where id=ch.id;
  end if;
  select * into ch from archery_challenges where id=payload_id;
  return jsonb_build_object('challenge',to_jsonb(ch)-'reported_by');
 elsif p_action='tournament_create' then
  if jsonb_typeof(p_body->'participants') is distinct from 'array' then raise exception 'Choose participants'; end if;
  ids:=array(select jsonb_array_elements_text(p_body->'participants')::uuid);n:=cardinality(ids);
  if n not between 2 and 64 or (select count(distinct x) from unnest(ids) x)<>n then raise exception 'Choose 2 to 64 unique participants'; end if;
  if (select count(*) from attendance_enrollments where id=any(ids) and class_id=c.id and removed_at is null and effective_from<=today and (effective_to is null or effective_to>=today))<>n then raise exception 'All participants must be actively enrolled in this class'; end if;
  if coalesce(length(trim(p_body->>'title')),0) not between 1 and 120 or coalesce(length(trim(p_body->>'game')),0) not between 1 and 160 then raise exception 'Enter a tournament title and game'; end if;
  select * into t from archery_tournaments where id=payload_id;
  if t.id is not null then
   if t.class_id<>c.id or t.participants<>ids or t.title<>trim(p_body->>'title') or t.game<>trim(p_body->>'game') then raise exception 'This tournament was already saved'; end if;
   return jsonb_build_object('tournament',to_jsonb(t));
  end if;
  size:=2;while size<n loop size:=size*2;end loop;
  -- Random seed order, then mirrored slots distribute the empty slots evenly.
  shuffled:=array(select x from unnest(ids) x order by random());slots:=array[1,2];
  while cardinality(slots)<size loop
   next_slots:='{}';foreach seed in array slots loop next_slots:=next_slots||seed||(2*cardinality(slots)+1-seed);end loop;slots:=next_slots;
  end loop;
  insert into archery_tournaments(id,class_id,title,game,participants,bracket_size) values(payload_id,c.id,trim(p_body->>'title'),trim(p_body->>'game'),ids,size) returning * into t;
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
  return jsonb_build_object('tournament',to_jsonb(t));
 elsif p_action='tournament_cancel' then
  update archery_tournaments set status='cancelled' where id=payload_id and class_id=c.id and status='active';
  if not found then raise exception 'Active tournament not found'; end if;
  return jsonb_build_object('saved',true);
 elsif p_action='match_result' then
  select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=payload_id and tt.class_id=c.id for update of mm;
  if m.id is null then raise exception 'Match not found or access denied'; end if;
  select * into t from archery_tournaments where id=m.tournament_id;
  w:=(p_body->>'winnerId')::uuid;
  if w is null or (w is distinct from m.a and w is distinct from m.b) then raise exception 'Winner must be a participant'; end if;
  if m.winner_id is not null then
   if m.winner_id=w then return jsonb_build_object('saved',true,'duplicate',true);end if;
   raise exception 'This match is completed';
  end if;
  if t.status<>'active' or m.a is null or m.b is null then raise exception 'This match is not ready'; end if;
  if length(coalesce(p_body->>'notes',''))>2000 then raise exception 'Keep result notes to 2000 characters'; end if;
  update archery_matches set winner_id=w,notes=coalesce(p_body->>'notes','') where id=m.id;
  if 2^m.round=t.bracket_size then update archery_tournaments set status='completed',winner_id=w where id=t.id;
  elsif m.position%2=1 then update archery_matches set a=w where tournament_id=t.id and round=m.round+1 and position=(m.position+1)/2;
  else update archery_matches set b=w where tournament_id=t.id and round=m.round+1 and position=(m.position+1)/2;end if;
  return jsonb_build_object('saved',true);
 end if;
 -- Only the class-visible names/IDs are shared with peers. Personal rounds stay private.
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]') into roster from attendance_enrollments
  where class_id=c.id and removed_at is null and effective_from<=today and (effective_to is null or effective_to>=today);
 select coalesce(jsonb_agg(to_jsonb(x) order by entry_date desc,created_at desc),'[]') into rounds from
  (select ar.*,ee.name as student_name from archery_rounds ar join attendance_enrollments ee on ee.id=ar.enrollment_id
   where ar.class_id=c.id and (owner or (ee.email=p_actor and ee.google_sub=p_sub)) order by entry_date desc,created_at desc limit 500) x;
 select coalesce(jsonb_agg(to_jsonb(x)-'reported_by' order by created_at desc),'[]') into challenges from
  (select inv.*,ca.name as challenger_name,op.name as opponent_name,(inv.reported_by=p_actor) as reported_by_me
   from archery_challenges inv join attendance_enrollments ca on ca.id=inv.challenger join attendance_enrollments op on op.id=inv.opponent
   where inv.class_id=c.id and (owner or e.id in (inv.challenger,inv.opponent)) order by inv.created_at desc limit 100) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by created_at desc),'[]') into tournaments from
  (select tt.*,(select jsonb_agg(jsonb_build_object('id',ee.id,'name',ee.name)) from attendance_enrollments ee where ee.id=any(tt.participants)) as players
   from archery_tournaments tt where tt.class_id=c.id order by tt.created_at desc limit 30) x;
 select coalesce(jsonb_agg(to_jsonb(mm) order by mm.round,mm.position),'[]') into matches from archery_matches mm where mm.tournament_id in (select (v->>'id')::uuid from jsonb_array_elements(tournaments) v);
 return jsonb_build_object('className',c.name,'classId',c.id,'today',today,'earliestDate',greatest(c.start_date,coalesce(e.effective_from,c.start_date)),
  'instructor',owner,'me',e.id,'roster',roster,'rounds',rounds,'challenges',challenges,'tournaments',tournaments,'matches',matches);
end $$;
revoke all on function public.archery_api(text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb) to service_role;
