-- New tournaments use a fixed winner/loser source graph. Earlier draws retain
-- their original engine and IDs. No instructor enrollment is fabricated.
create table public.archery_competitors (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.attendance_classes(id),
 enrollment_id uuid,
 instructor_email text,
 instructor_sub text,
 check ((enrollment_id is not null and id=enrollment_id and instructor_email is null and instructor_sub is null)
     or (enrollment_id is null and instructor_email is not null and instructor_sub is not null)),
 foreign key(enrollment_id,class_id) references public.attendance_enrollments(id,class_id)
);
create unique index archery_instructor_competitor on public.archery_competitors(class_id,instructor_email,instructor_sub) where enrollment_id is null;
alter table public.archery_competitors enable row level security;
revoke all on public.archery_competitors from public,anon,authenticated;
grant select,insert on public.archery_competitors to service_role;
insert into public.archery_competitors(id,class_id,enrollment_id) select id,class_id,id from public.attendance_enrollments;

alter table public.archery_tournaments add column engine_version integer not null default 1 check(engine_version in (1,2));
alter table public.archery_tournaments add column format text not null default 'single' check(format in ('single','double'));
alter table public.archery_tournaments add column signup_minutes integer default 5 check(signup_minutes between 1 and 120);
alter table public.archery_tournaments drop constraint archery_tournaments_winner_id_fkey;
alter table public.archery_tournaments add foreign key(winner_id) references public.archery_competitors(id);
alter table public.archery_matches drop constraint archery_matches_a_fkey;
alter table public.archery_matches drop constraint archery_matches_b_fkey;
alter table public.archery_matches drop constraint archery_matches_winner_id_fkey;
alter table public.archery_matches drop constraint archery_matches_proposed_winner_fkey;
alter table public.archery_matches add foreign key(a) references public.archery_competitors(id);
alter table public.archery_matches add foreign key(b) references public.archery_competitors(id);
alter table public.archery_matches add foreign key(winner_id) references public.archery_competitors(id);
alter table public.archery_matches add foreign key(proposed_winner) references public.archery_competitors(id);
alter table public.archery_matches add column bracket text not null default 'upper' check(bracket in ('upper','lower','final','reset'));
alter table public.archery_matches add column a_source uuid references public.archery_matches(id);
alter table public.archery_matches add column b_source uuid references public.archery_matches(id);
alter table public.archery_matches add column a_loser boolean not null default false;
alter table public.archery_matches add column b_loser boolean not null default false;
alter table public.archery_matches add column a_ready boolean not null default false;
alter table public.archery_matches add column b_ready boolean not null default false;
alter table public.archery_matches add column resolved boolean not null default false;
update public.archery_matches set resolved=(winner_id is not null or bye),a_ready=(a is not null or bye),b_ready=(b is not null or bye);
alter table public.archery_matches drop constraint archery_matches_tournament_id_round_position_key;
alter table public.archery_matches add unique(tournament_id,bracket,round,position);

alter function archery_private.lock_draw(uuid) rename to lock_draw_legacy;
alter function archery_private.record_match(uuid,uuid,text) rename to record_match_legacy;

create function archery_private.settle_bracket(p_id uuid) returns void
language plpgsql security invoker set search_path=public as $$
declare m archery_matches; feed archery_matches; changed boolean; value uuid;
begin
 -- A resolved empty feed differs from a match still waiting to be played.
 -- In particular a bye has a winner, but never a loser.
 loop
  changed:=false;
  for m in select * from archery_matches where tournament_id=p_id and not resolved order by bracket,round,position loop
   if m.a_source is not null and not m.a_ready then
    select * into feed from archery_matches where id=m.a_source;
    if feed.resolved then
     value:=case when not m.a_loser then feed.winner_id when feed.bye then null when feed.winner_id=feed.a then feed.b else feed.a end;
     update archery_matches set a=value,a_ready=true where id=m.id;changed:=true;
    end if;
   end if;
   if m.b_source is not null and not m.b_ready then
    select * into feed from archery_matches where id=m.b_source;
    if feed.resolved then
     value:=case when not m.b_loser then feed.winner_id when feed.bye then null when feed.winner_id=feed.a then feed.b else feed.a end;
     update archery_matches set b=value,b_ready=true where id=m.id;changed:=true;
    end if;
   end if;
   select * into m from archery_matches where id=m.id;
   if m.a_ready and m.b_ready and (m.a is null or m.b is null) then
    update archery_matches set bye=true,resolved=true,winner_id=coalesce(m.a,m.b) where id=m.id;changed:=true;
   end if;
  end loop;
  exit when not changed;
 end loop;
end $$;

create function archery_private.lock_draw(p_id uuid) returns boolean
language plpgsql security invoker set search_path=public as $$
declare t archery_tournaments;c attendance_classes; ids uuid[]; shuffled uuid[];slots integer[]:=array[1,2];next_slots integer[];
 n integer;size integer:=2;k integer:=1;r integer;i integer;seed integer;count_matches integer;src_a uuid;src_b uuid;
begin
 select * into t from archery_tournaments where id=p_id for update;
 if t.id is null or t.status='cancelled' then raise exception 'Tournament not found or cancelled';end if;
 select * into c from attendance_classes where id=t.class_id;
 insert into archery_competitors(id,class_id,enrollment_id)
 select ee.id,ee.class_id,ee.id from attendance_enrollments ee where ee.class_id=c.id on conflict(id) do nothing;
 if t.engine_version=1 then return archery_private.lock_draw_legacy(p_id);end if;
 if t.status in ('active','completed') then return true;end if;
 ids:=array(select pp.id from unnest(t.participants) with ordinality pp(id,ord)
  join archery_competitors cp on cp.id=pp.id and cp.class_id=c.id
  left join attendance_enrollments ee on ee.id=cp.enrollment_id
  where (ee.id is not null and ee.removed_at is null and ee.effective_from<=(clock_timestamp() at time zone c.timezone)::date and (ee.effective_to is null or ee.effective_to>=(clock_timestamp() at time zone c.timezone)::date))
     or (cp.enrollment_id is null and cp.instructor_email=c.instructor_email)
  order by pp.ord);
 n:=cardinality(ids);
 update archery_tournaments set participants=ids,status='registration_closed',registration_closed_at=coalesce(registration_closed_at,clock_timestamp()) where id=t.id;
 if n<2 then return false;end if;
 while size<n loop size:=size*2;k:=k+1;end loop;
 shuffled:=array(select x from unnest(ids) x order by random());
 while cardinality(slots)<size loop
  next_slots:='{}';foreach seed in array slots loop next_slots:=next_slots||seed||(2*cardinality(slots)+1-seed);end loop;slots:=next_slots;
 end loop;
 update archery_tournaments set bracket_size=size,status='active' where id=t.id;
 for r in 1..k loop
  count_matches:=size/(2^r)::integer;
  for i in 1..count_matches loop
   if r=1 then
    insert into archery_matches(tournament_id,bracket,round,position,a,b,a_ready,b_ready)
     values(t.id,'upper',r,i,shuffled[slots[2*i-1]],shuffled[slots[2*i]],true,true);
   else
    select id into src_a from archery_matches where tournament_id=t.id and bracket='upper' and round=r-1 and position=2*i-1;
    select id into src_b from archery_matches where tournament_id=t.id and bracket='upper' and round=r-1 and position=2*i;
    insert into archery_matches(tournament_id,bracket,round,position,a_source,b_source) values(t.id,'upper',r,i,src_a,src_b);
   end if;
  end loop;
 end loop;
 if t.format='double' then
  if k>1 then
   for r in 1..2*k-2 loop
    count_matches:=size/(2^(2+(r-1)/2))::integer;
    for i in 1..count_matches loop
     if r=1 then
      select id into src_a from archery_matches where tournament_id=t.id and bracket='upper' and round=1 and position=2*i-1;
      select id into src_b from archery_matches where tournament_id=t.id and bracket='upper' and round=1 and position=2*i;
     elsif r%2=0 then
      select id into src_a from archery_matches where tournament_id=t.id and bracket='lower' and round=r-1 and position=i;
      -- Cross the incoming upper losers to reduce immediate rematches.
      select id into src_b from archery_matches where tournament_id=t.id and bracket='upper' and round=r/2+1 and position=count_matches-i+1;
     else
      select id into src_a from archery_matches where tournament_id=t.id and bracket='lower' and round=r-1 and position=2*i-1;
      select id into src_b from archery_matches where tournament_id=t.id and bracket='lower' and round=r-1 and position=2*i;
     end if;
     insert into archery_matches(tournament_id,bracket,round,position,a_source,b_source,a_loser,b_loser)
      values(t.id,'lower',r,i,src_a,src_b,r=1,r=1 or r%2=0);
    end loop;
   end loop;
  end if;
  select id into src_a from archery_matches where tournament_id=t.id and bracket='upper' and round=k;
  if k=1 then src_b:=src_a;
  else select id into src_b from archery_matches where tournament_id=t.id and bracket='lower' and round=2*k-2;end if;
  insert into archery_matches(tournament_id,bracket,round,position,a_source,b_source,b_loser) values(t.id,'final',1,1,src_a,src_b,k=1);
 end if;
 perform archery_private.settle_bracket(t.id);
 return true;
end $$;

create function archery_private.record_match(p_id uuid,p_winner uuid,p_notes text) returns void
language plpgsql security invoker set search_path=public as $$
declare m archery_matches;t archery_tournaments;
begin
 select tt.* into t from archery_tournaments tt join archery_matches mm on mm.tournament_id=tt.id where mm.id=p_id for update of tt;
 if t.engine_version=1 then perform archery_private.record_match_legacy(p_id,p_winner,p_notes);return;end if;
 select * into m from archery_matches where id=p_id for update;
 if m.id is null then raise exception 'Match not found';end if;
 if p_winner is null or (p_winner is distinct from m.a and p_winner is distinct from m.b) then raise exception 'Winner must be a participant';end if;
 if m.resolved then
  if m.winner_id=p_winner then return;end if;raise exception 'This match is completed';
 end if;
 if t.status<>'active' or m.a is null or m.b is null or m.bye or not m.a_ready or not m.b_ready then raise exception 'This match is not ready';end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Keep result notes to 2000 characters';end if;
 update archery_matches set winner_id=p_winner,resolved=true,notes=coalesce(p_notes,''),proposed_winner=null,reported_by=null where id=m.id;
 if m.bracket='reset' or (m.bracket='final' and p_winner=m.a) or (t.format='single' and m.bracket='upper' and 2^m.round=t.bracket_size) then
  update archery_tournaments set status='completed',winner_id=p_winner where id=t.id;
 elsif m.bracket='final' then
  -- Both finalists now have one loss. A second championship decides the winner.
  insert into archery_matches(tournament_id,bracket,round,position,a,b,a_ready,b_ready) values(t.id,'reset',1,1,m.a,m.b,true,true);
 else perform archery_private.settle_bracket(t.id);
 end if;
end $$;

alter function public.archery_api(text,text,boolean,text,jsonb) set schema archery_private;
alter function archery_private.archery_api(text,text,boolean,text,jsonb) rename to archery_api_practice;

create function public.archery_api(p_actor text,p_sub text,p_instructor boolean,p_action text,p_body jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare data jsonb;c attendance_classes;me uuid;owner boolean;today date;t archery_tournaments;m archery_matches;
 id_value uuid;winner uuid;format_value text;minutes integer;deadline timestamptz;drawn boolean;items jsonb;item jsonb;players jsonb;
begin
 -- Trusted identity and the class row lock come from the existing wrapper chain.
 data:=archery_private.archery_api_practice(p_actor,p_sub,p_instructor,'list',p_body);
 owner:=(data->>'instructor')::boolean;today:=(data->>'today')::date;me:=(data->>'me')::uuid;
 select * into c from attendance_classes where id=(data->>'classId')::uuid;
 if owner then select id into me from archery_competitors where class_id=c.id and instructor_email=p_actor and instructor_sub=p_sub;end if;
 -- Legacy list already marks deadlines closed. Include those rows here so the
 -- automatic draw cannot be stranded between wrapper versions.
 if not c.archived then
  for t in select * from archery_tournaments where class_id=c.id and engine_version=2 and bracket_size is null
    and status in ('registration','registration_closed') and registration_ends_at<=clock_timestamp() loop
   perform archery_private.lock_draw(t.id);
  end loop;
 end if;
 if p_action='list' then
  data:=archery_private.archery_api_practice(p_actor,p_sub,p_instructor,'list',p_body);
  items:='[]';
  for item in select value from jsonb_array_elements(data->'tournaments') loop
   select coalesce(jsonb_agg(jsonb_build_object('id',cp.id,'name',coalesce(ee.name,'Instructor')) order by array_position(tt.participants,cp.id)),'[]') into players
    from archery_tournaments tt join archery_competitors cp on cp.id=any(tt.participants) and cp.class_id=tt.class_id
    left join attendance_enrollments ee on ee.id=cp.enrollment_id where tt.id=(item->>'id')::uuid;
   items:=items||jsonb_build_array(item||jsonb_build_object('players',players));
  end loop;
  return data||jsonb_build_object('tournaments',items,'tournamentMe',me);
 end if;
 if p_action is null then raise exception 'Unknown archery action';end if;
 if p_action not in ('tournament_open','tournament_join','tournament_leave','tournament_close','match_result','match_confirm') then
  return archery_private.archery_api_practice(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 if c.archived then raise exception 'Restore this class before recording new activity';end if;
 id_value:=nullif(p_body->>'id','')::uuid;
 if id_value is null then raise exception 'A request ID is required';end if;
 if p_action='tournament_open' then
  if not owner then raise exception 'Instructor access required';end if;
  if (p_body->>'date')::date is distinct from today then raise exception 'Open registration for today';end if;
  if p_body ? 'participants' then raise exception 'Players must opt in themselves';end if;
  if coalesce(length(trim(p_body->>'title')),0) not between 1 and 120 or coalesce(length(trim(p_body->>'game')),0) not between 1 and 160 or length(coalesce(p_body->>'instructions',''))>1000 then raise exception 'Enter a title, game and valid instructions';end if;
  format_value:=case when p_body ? 'format' then p_body->>'format' else 'single' end;
  if format_value is null or format_value not in ('single','double') then raise exception 'Choose a tournament format';end if;
  if not(p_body ? 'signupMinutes') then minutes:=5;
  elsif p_body->'signupMinutes'='null'::jsonb then minutes:=null;
  elsif jsonb_typeof(p_body->'signupMinutes')<>'number' or (p_body->>'signupMinutes') !~ '^[0-9]{1,3}$' then raise exception 'Set a signup timer from 1 to 120 minutes';
  else minutes:=(p_body->>'signupMinutes')::integer;end if;
  if minutes is not null and minutes not between 1 and 120 then raise exception 'Set a signup timer from 1 to 120 minutes';end if;
  select * into t from archery_tournaments where id=id_value;
  if t.id is not null then
   if t.class_id<>c.id or t.event_date<>today or t.title<>trim(p_body->>'title') or t.game<>trim(p_body->>'game') or t.instructions<>coalesce(p_body->>'instructions','') or t.format<>format_value or t.signup_minutes is distinct from minutes then raise exception 'This tournament was already saved';end if;
   return jsonb_build_object('tournament',to_jsonb(t));
  end if;
  deadline:=case when minutes is not null then clock_timestamp()+make_interval(mins=>minutes) end;
  insert into archery_tournaments(id,class_id,title,game,instructions,event_date,participants,bracket_size,status,registration_ends_at,engine_version,format,signup_minutes)
   values(id_value,c.id,trim(p_body->>'title'),trim(p_body->>'game'),coalesce(p_body->>'instructions',''),today,'{}',null,'registration',deadline,2,format_value,minutes) returning * into t;
  return jsonb_build_object('tournament',to_jsonb(t));
 end if;
 if p_action in ('tournament_join','tournament_leave','tournament_close') then
  select * into t from archery_tournaments where id=id_value and class_id=c.id for update;
  if t.id is null then raise exception 'Tournament not found or access denied';end if;
 else
  select mm.* into m from archery_matches mm join archery_tournaments tt on tt.id=mm.tournament_id where mm.id=id_value and tt.class_id=c.id for update of mm;
  if m.id is null then raise exception 'Match not found or access denied';end if;
  select * into t from archery_tournaments where id=m.tournament_id;
 end if;
 if t.engine_version=1 then
  if p_action='tournament_join' and not owner then
   insert into archery_competitors(id,class_id,enrollment_id) values(me,c.id,me) on conflict(id) do nothing;
  end if;
  return archery_private.archery_api_practice(p_actor,p_sub,p_instructor,p_action,p_body);
 end if;
 if p_action='tournament_close' then
  if not owner then raise exception 'Instructor access required';end if;
  drawn:=archery_private.lock_draw(t.id);select * into t from archery_tournaments where id=t.id;
  return jsonb_build_object('tournament',to_jsonb(t),'drawn',drawn);
 elsif p_action in ('tournament_join','tournament_leave') then
  if t.status<>'registration' or t.registration_ends_at<=clock_timestamp() then raise exception 'Registration is closed';end if;
  if p_action='tournament_join' then
   if owner and me is null then
    insert into archery_competitors(class_id,instructor_email,instructor_sub) values(c.id,p_actor,p_sub) returning id into me;
   elsif not owner then
    insert into archery_competitors(id,class_id,enrollment_id) values(me,c.id,me) on conflict(id) do nothing;
   end if;
   if me is null then raise exception 'A verified participant is required';end if;
   if not(me=any(t.participants)) then
    if cardinality(t.participants)>=64 then raise exception 'This tournament is full';end if;
    if owner and exists(select 1 from archery_competitors cp where cp.id=any(t.participants) and cp.enrollment_id is null) then raise exception 'The instructor is already entered with another identity';end if;
    update archery_tournaments set participants=participants||me where id=t.id returning * into t;
   end if;
  elsif me is not null then update archery_tournaments set participants=array_remove(participants,me) where id=t.id returning * into t;
  end if;
  return jsonb_build_object('tournament',to_jsonb(t));
 end if;
 if not owner and me is distinct from m.a and me is distinct from m.b then raise exception 'Match not found or access denied';end if;
 -- An owner signed in with a different provider subject must not become a
 -- manager of their own existing competitor's match and bypass confirmation.
 if owner and me is distinct from m.a and me is distinct from m.b and exists(
  select 1 from archery_competitors cp where cp.id in (m.a,m.b) and cp.class_id=c.id and cp.instructor_email=p_actor
 ) then raise exception 'Use the same verified instructor identity that joined this tournament';end if;
 if p_action='match_result' and owner and me is distinct from m.a and me is distinct from m.b then
  perform archery_private.record_match(m.id,(p_body->>'winnerId')::uuid,p_body->>'notes');return jsonb_build_object('saved',true);
 end if;
 if me is distinct from m.a and me is distinct from m.b then raise exception 'Only a match participant can confirm';end if;
 if t.status='cancelled' or m.a is null or m.b is null or m.bye then raise exception 'This match is not ready or completed';end if;
 if p_action='match_result' then
  winner:=(p_body->>'winnerId')::uuid;
  if winner is null or winner not in (m.a,m.b) then raise exception 'Winner must be a participant';end if;
  if length(coalesce(p_body->>'notes',''))>2000 then raise exception 'Keep result notes to 2000 characters';end if;
  if m.resolved then
   if m.winner_id=winner then return jsonb_build_object('saved',true,'duplicate',true);end if;raise exception 'This match is completed';
  end if;
  if t.status<>'active' then raise exception 'This match is completed';end if;
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
end $$;

revoke all on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_practice(text,text,boolean,text,jsonb),archery_private.settle_bracket(uuid),archery_private.lock_draw(uuid),archery_private.record_match(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.archery_api(text,text,boolean,text,jsonb),archery_private.archery_api_practice(text,text,boolean,text,jsonb),archery_private.settle_bracket(uuid),archery_private.lock_draw(uuid),archery_private.record_match(uuid,uuid,text) to service_role;
