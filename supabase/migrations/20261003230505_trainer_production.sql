-- Additive, empty production trainer storage. No prototype imports or existing data changes.
create table public.trainer_profiles (
 account text primary key check (account like 'google:%'), first_name text not null, last_name text not null,
 display_name text not null check (length(display_name) between 1 and 40 and position('@' in display_name)=0),
 photo_mode text not null check(photo_mode in ('google','custom','none')), photo text, updated double precision not null
);
create table public.trainer_scores (
 account text not null, take text not null, lesson text not null, score integer not null check(score between 0 and 100),
 measured integer not null check(measured between 1 and 16), onbeat integer not null check(onbeat between 0 and 16), saved double precision not null,
 primary key(account,take)
);
create index trainer_scores_history on public.trainer_scores(account,saved desc);
create table public.trainer_challenges (
 id text primary key check(id ~ '^[a-f0-9]{32}$'), sender text not null, name text not null, take text not null,
 lesson text not null, version integer not null, reference_hash text not null, scoring text not null,
 score integer not null check(score between 0 and 100), measured integer not null check(measured between 1 and 16),
 created double precision not null, expires double precision not null, unique(sender,take)
);
create index trainer_challenges_sender on public.trainer_challenges(sender,created desc);
create table public.trainer_challenge_entries (
 challenge text not null references public.trainer_challenges(id), recipient text not null, name text not null,
 accepted double precision not null, primary key(challenge,recipient)
);
create index trainer_entries_recipient on public.trainer_challenge_entries(recipient,accepted desc);
create table public.trainer_challenge_completions (
 challenge text not null references public.trainer_challenges(id), recipient text not null, sender text not null,
 take text not null, video_hash text not null check(video_hash ~ '^[a-f0-9]{64}$'), score integer not null check(score between 0 and 100),
 measured integer not null check(measured between 1 and 16), points integer not null check(points in (100,50,25,10)),
 completed double precision not null, pair_a text not null, pair_b text not null, check(sender<>recipient),
 primary key(challenge,recipient), unique(recipient,take), unique(recipient,video_hash),
 foreign key(challenge,recipient) references public.trainer_challenge_entries(challenge,recipient)
);
create index trainer_completions_pair on public.trainer_challenge_completions(pair_a,pair_b);
create index trainer_completions_sender on public.trainer_challenge_completions(sender,completed desc);
create index trainer_completions_recipient on public.trainer_challenge_completions(recipient,completed desc);
create table public.trainer_email_invites (
 id text primary key, challenge text not null references public.trainer_challenges(id), sender text not null,
 recipient_hash text not null, created double precision not null, lease_until double precision not null,
 state text not null check(state in ('pending','sent')), payload jsonb, receipt text, unique(challenge,recipient_hash)
);
create index trainer_email_limits on public.trainer_email_invites(created);

-- Invoker function callable only by server service_role. Browser roles have no table or RPC grants.
-- One transaction-scoped lock serializes short mutation transactions, including pair rewards and mail limits.
-- No network I/O happens while this lock is held.
create function public.trainer_mutate(action text, actor text, payload jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 c public.trainer_challenges%rowtype; e public.trainer_challenge_entries%rowtype;
 d public.trainer_challenge_completions%rowtype; mail public.trainer_email_invites%rowtype;
 now_s double precision := extract(epoch from clock_timestamp()); n integer; reward integer;
 a text; b text; val jsonb; numeric_delta numeric; total integer := 0; measured integer := 0; score integer;
begin
 if actor is null or actor not like 'google:%' then return jsonb_build_object('error','Sign in with Google to continue this challenge.','status',401); end if;
 perform pg_advisory_xact_lock(73491, 1);
 if action = 'create' then
   select * into c from public.trainer_challenges where sender=actor and take=trainer_mutate.payload->>'take';
   if found then return jsonb_build_object('id',c.id,'existing',true); end if;
   select count(*) into n from public.trainer_challenges where sender=actor and created>now_s-86400;
   if n>=30 then return jsonb_build_object('error','You have made plenty of challenges today. Try again tomorrow.','status',429); end if;
   insert into public.trainer_challenges values(trainer_mutate.payload->>'id',actor,trainer_mutate.payload->>'name',trainer_mutate.payload->>'take',trainer_mutate.payload->>'lesson',(trainer_mutate.payload->>'version')::integer,trainer_mutate.payload->>'reference_hash',trainer_mutate.payload->>'scoring',(trainer_mutate.payload->>'score')::integer,(trainer_mutate.payload->>'measured')::integer,now_s,now_s+2592000);
   return jsonb_build_object('id',trainer_mutate.payload->>'id','existing',false);
 end if;
 select * into c from public.trainer_challenges where id=trainer_mutate.payload->>'id';
 if not found then return jsonb_build_object('error','This challenge could not be found.','status',404); end if;
 if action in ('accept','complete') then
   if c.sender=actor then return jsonb_build_object('error','You cannot accept your own challenge. Share it with a friend.','status',409); end if;
   select * into d from public.trainer_challenge_completions where challenge=c.id and recipient=actor;
   if found then return jsonb_build_object('score',d.score,'measured',d.measured,'points',d.points,'test_only',true); end if;
 end if;
 if c.expires<=now_s then return jsonb_build_object('error','This challenge has expired. Ask your friend for a new one.','status',410); end if;
 if trainer_mutate.payload->>'current_reference_hash' is distinct from c.reference_hash or trainer_mutate.payload->>'current_version' is distinct from c.version::text or c.scoring<>'67-100-150:100-50-25-0' then
   return jsonb_build_object('error','This reference has changed. Start a new comparison from the library.','status',409);
 end if;
 if action='accept' then
   insert into public.trainer_challenge_entries values(c.id,actor,trainer_mutate.payload->>'name',now_s) on conflict do nothing;
   return jsonb_build_object('accepted',true);
 elsif action='complete' then
   select * into e from public.trainer_challenge_entries where challenge=c.id and recipient=actor;
   if not found then return jsonb_build_object('error','Accept this challenge before recording your take.','status',409); end if;
   if trainer_mutate.payload->>'lesson' is distinct from c.lesson or trainer_mutate.payload->>'version' is distinct from c.version::text or trainer_mutate.payload->>'reference_hash' is distinct from c.reference_hash or coalesce(trainer_mutate.payload->>'scoring','67-100-150:100-50-25-0')<>c.scoring then
     return jsonb_build_object('error','Record the drill named in this challenge using its current reference.','status',409);
   end if;
   if trainer_mutate.payload->>'source' is distinct from 'browser-recording' or trainer_mutate.payload->'completed' is distinct from 'true'::jsonb or trainer_mutate.payload->'interrupted' is distinct from 'false'::jsonb or jsonb_typeof(trainer_mutate.payload->'created_at') is distinct from 'number' then
     return jsonb_build_object('error','Record a new, uninterrupted take after accepting this challenge.','status',422);
   end if;
   if (trainer_mutate.payload->>'created_at')::numeric < e.accepted*1000 or (trainer_mutate.payload->>'created_at')::numeric > now_s*1000+300000 then
     return jsonb_build_object('error','Record a new, uninterrupted take after accepting this challenge.','status',422);
   end if;
   if coalesce(trainer_mutate.payload->>'take','') !~ '^local-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' or coalesce(trainer_mutate.payload->>'video_hash','') !~ '^[a-f0-9]{64}$' or trainer_mutate.payload->'aligned' is distinct from 'true'::jsonb or jsonb_typeof(trainer_mutate.payload->'deltas') is distinct from 'array' then
     return jsonb_build_object('error','Invalid completed comparison.','status',422);
   end if;
   if jsonb_array_length(trainer_mutate.payload->'deltas')<>16 then return jsonb_build_object('error','Finish analyzing all 16 beats first.','status',422); end if;
   for val in select value from jsonb_array_elements(trainer_mutate.payload->'deltas') loop
     if val='null'::jsonb then continue; end if;
     if jsonb_typeof(val)<>'number' then return jsonb_build_object('error','Invalid timing estimate.','status',422); end if;
     numeric_delta := abs(val::text::numeric);
     if numeric_delta>300 then return jsonb_build_object('error','Invalid timing estimate.','status',422); end if;
     measured:=measured+1; total:=total+case when numeric_delta<=67 then 100 when numeric_delta<=100 then 50 when numeric_delta<=150 then 25 else 0 end;
   end loop;
   if measured=0 then return jsonb_build_object('error','No usable timing estimates.','status',422); end if;
   score:=round(total::numeric/measured);
   if exists(select 1 from public.trainer_challenge_completions where recipient=actor and (take=trainer_mutate.payload->>'take' or video_hash=trainer_mutate.payload->>'video_hash')) then
     return jsonb_build_object('error','This recording already earned challenge points. Record a new take.','status',409);
   end if;
   a:=least(actor,c.sender); b:=greatest(actor,c.sender);
   select count(*) into n from public.trainer_challenge_completions where pair_a=a and pair_b=b;
   reward:=case n when 0 then 100 when 1 then 50 when 2 then 25 else 10 end;
   insert into public.trainer_challenge_completions values(c.id,actor,c.sender,trainer_mutate.payload->>'take',trainer_mutate.payload->>'video_hash',score,measured,reward,now_s,a,b);
   return jsonb_build_object('score',score,'measured',measured,'points',reward,'test_only',true);
 elsif action='email_reserve' then
   if c.sender<>actor then return jsonb_build_object('error','Only the person who created this challenge can email it.','status',403); end if;
   select * into mail from public.trainer_email_invites where challenge=c.id and recipient_hash=trainer_mutate.payload->>'recipient_hash';
   if found then
     if mail.state='sent' then return jsonb_build_object('sent',true,'already_sent',true); end if;
     if mail.created<now_s-82800 then return jsonb_build_object('error','The previous send could not be confirmed. Use Copy link rather than risk a duplicate email.','status',409); end if;
     if mail.lease_until>now_s then return jsonb_build_object('sent',false,'status',202,'message','This invitation is still sending. Please check again shortly.'); end if;
     update public.trainer_email_invites set lease_until=now_s+30 where id=mail.id;
     return jsonb_build_object('reservation',mail.id,'payload',mail.payload);
   end if;
   if (select count(*) from public.trainer_email_invites where created>now_s-86400)>=60 or (select count(*) from public.trainer_email_invites where sender=actor and created>now_s-86400)>=10 or (select count(*) from public.trainer_email_invites where recipient_hash=trainer_mutate.payload->>'recipient_hash' and created>now_s-86400)>=3 then
     return jsonb_build_object('error','The email invitation limit has been reached for today. You can still share or copy the link.','status',429);
   end if;
   insert into public.trainer_email_invites values(trainer_mutate.payload->>'reservation',c.id,actor,trainer_mutate.payload->>'recipient_hash',now_s,now_s+30,'pending',trainer_mutate.payload->'message',null);
   return jsonb_build_object('reservation',trainer_mutate.payload->>'reservation','payload',trainer_mutate.payload->'message');
 end if;
 return jsonb_build_object('error','Challenge action not found.','status',404);
end;
$$;
revoke all on function public.trainer_mutate(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.trainer_mutate(text,text,jsonb) to service_role;
alter table public.trainer_profiles enable row level security;
revoke all on table public.trainer_profiles from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_profiles to service_role;
alter table public.trainer_scores enable row level security;
revoke all on table public.trainer_scores from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_scores to service_role;
alter table public.trainer_challenges enable row level security;
revoke all on table public.trainer_challenges from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_challenges to service_role;
alter table public.trainer_challenge_entries enable row level security;
revoke all on table public.trainer_challenge_entries from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_challenge_entries to service_role;
alter table public.trainer_challenge_completions enable row level security;
revoke all on table public.trainer_challenge_completions from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_challenge_completions to service_role;
alter table public.trainer_email_invites enable row level security;
revoke all on table public.trainer_email_invites from public, anon, authenticated;
grant select,insert,update,delete on table public.trainer_email_invites to service_role;

-- Aggregate in the database so long-lived balances are not truncated by REST row limits.
create function public.trainer_rewards(actor text) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'points', coalesce((select sum(points) from public.trainer_challenge_completions where sender=actor or recipient=actor),0),
  'rewards', coalesce((select jsonb_agg(recent order by completed desc) from (
    select c.lesson,x.points,x.completed from public.trainer_challenge_completions x
    join public.trainer_challenges c on c.id=x.challenge
    where x.sender=actor or x.recipient=actor order by x.completed desc limit 10
  ) recent),'[]'::jsonb)
 );
$$;
revoke all on function public.trainer_rewards(text) from public, anon, authenticated;
grant execute on function public.trainer_rewards(text) to service_role;
