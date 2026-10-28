import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

const migrations=['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql']
const cid='00000000-0000-0000-0000-000000000001'
const sid=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0')
async function fixture({upgrade=true}={}){
 const db=new PGlite();await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
 await db.exec('grant select,update on attendance_classes,attendance_enrollments to service_role')
 for(const f of upgrade?migrations:migrations.slice(0,-1))await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows
 const api=async(action,body={},actor=0,sub)=>{
  const email=actor?'student'+actor+'@example.com':'teacher@example.com'
  return (await q('select archery_api($1,$2,$3,$4,$5) data',[email,sub??'demo-'+email,!actor,action,{classId:cid,...body}]))[0].data
 }
 const today=(await api('list')).today
 const open=async(options={})=>(await api('tournament_open',{id:crypto.randomUUID(),date:today,title:'Class tournament',game:'Best of three',format:'double',signupMinutes:null,...options})).tournament
 return {db,q,api,open,today}
}

test('manual/timed hosting, optional instructor entry and peer-confirmed double-elimination results',async()=>{
 const {db,q,api,open,today}=await fixture()
 try{
  const t=await open();assert.equal(t.format,'double');assert.equal(t.registration_ends_at,null)
  const rosterCount=(await api('list')).roster.length
  await api('tournament_join',{id:t.id});await api('tournament_join',{id:t.id})
  let data=await api('list'),teacher=data.tournamentMe
  assert.ok(teacher);assert.equal(data.me,null);assert.equal(data.roster.length,rosterCount)
  assert.deepEqual(data.tournaments.find(x=>x.id===t.id).participants,[teacher])
  assert.equal(data.tournaments.find(x=>x.id===t.id).players.find(x=>x.id===teacher).name,'Instructor')
  assert.equal(JSON.stringify((await api('list',{},1)).tournaments).includes('teacher@example.com'),false)
  await api('tournament_leave',{id:t.id});assert.equal((await api('list')).tournaments.find(x=>x.id===t.id).participants.length,0)
  await api('tournament_join',{id:t.id});await api('tournament_join',{id:t.id},1)
  await assert.rejects(api('tournament_open',{id:crypto.randomUUID(),date:today,title:'Fake',game:'Game'},2),/Instructor/)
  await api('tournament_close',{id:t.id})
  await assert.rejects(api('tournament_join',{id:t.id},2),/closed/)
  let m=(await api('list')).matches.find(x=>x.tournament_id===t.id&&x.a&&x.b&&!x.resolved)
  await assert.rejects(api('match_result',{id:m.id,winnerId:teacher},0,'different-subject'),/same verified instructor identity/)
  const signature=(await q('select id,a,b from archery_matches where tournament_id=$1 order by id',[t.id]))
  await api('tournament_close',{id:t.id});assert.deepEqual(await q('select id,a,b from archery_matches where tournament_id=$1 order by id',[t.id]),signature)
  await api('match_result',{id:m.id,winnerId:sid(1)})
  assert.equal((await api('list')).matches.find(x=>x.id===m.id).winner_id,null,'instructor competing also needs opponent confirmation')
  await assert.rejects(api('match_confirm',{id:m.id,accept:true}),/other player/)
  await api('match_confirm',{id:m.id,accept:false},1)
  await api('match_result',{id:m.id,winnerId:sid(1)},1)
  await api('match_confirm',{id:m.id,accept:true})
  m=(await api('list')).matches.find(x=>x.tournament_id===t.id&&x.bracket==='final'&&!x.resolved)
  assert.ok(m.a&&m.b,'two-player double elimination reaches championship after first loss')
  await api('match_result',{id:m.id,winnerId:m.b},1);await api('match_confirm',{id:m.id,accept:true})
  data=await api('list');assert.equal(data.tournaments.find(x=>x.id===t.id).status,'active')
  const reset=data.matches.find(x=>x.tournament_id===t.id&&x.bracket==='reset');assert.ok(reset)
  await api('match_result',{id:reset.id,winnerId:teacher});await api('match_confirm',{id:reset.id,accept:true},1)
  assert.equal((await api('list')).tournaments.find(x=>x.id===t.id).winner_id,teacher)
  await api('match_result',{id:reset.id,winnerId:teacher})
  await assert.rejects(api('match_result',{id:reset.id,winnerId:sid(1)},1),/completed/)
  const timed=await open({signupMinutes:2,format:'single'})
  assert.ok(Math.abs(Date.parse(timed.registration_ends_at)-Date.parse(timed.created_at)-120000)<2000)
  await api('tournament_join',{id:timed.id},2);await api('tournament_join',{id:timed.id},3)
  await q("update archery_tournaments set registration_ends_at=clock_timestamp()-interval '1 second' where id=$1",[timed.id])
  assert.equal((await api('list',{},2)).tournaments.find(x=>x.id===timed.id).status,'active','poll automatically closes and draws')
  await assert.rejects(api('tournament_join',{id:timed.id},4),/closed/)
  const single=(await api('list')).matches.find(x=>x.tournament_id===timed.id&&x.a&&x.b)
  await api('match_result',{id:single.id,winnerId:single.a})
  assert.equal((await api('list')).tournaments.find(x=>x.id===timed.id).status,'completed')
  const none=await open({signupMinutes:1});await q("update archery_tournaments set registration_ends_at=clock_timestamp()-interval '1 second' where id=$1",[none.id])
  assert.equal((await api('list')).tournaments.find(x=>x.id===none.id).status,'registration_closed')
  assert.equal((await q('select count(*)::int n from archery_matches where tournament_id=$1',[none.id]))[0].n,0)
  for(const options of [{format:'triple'},{signupMinutes:0},{signupMinutes:121},{signupMinutes:1.5},{signupMinutes:'5'},{format:null}])await assert.rejects(open(options),/format|timer|minutes/i)
  await assert.rejects(api('tournament_open',{id:t.id,date:today,title:t.title,game:t.game,format:'single',signupMinutes:null}),/already saved/)
  const foreignSub=await api('list',{},0,'different-subject');assert.notEqual(foreignSub.tournamentMe,teacher)
  assert.equal((await q('select count(*)::int n from attendance_enrollments'))[0].n,12,'instructor entry never creates a student')
  const cancel=await open();await api('tournament_join',{id:cancel.id},1);await api('tournament_join',{id:cancel.id},2);await api('tournament_close',{id:cancel.id});await api('tournament_cancel',{id:cancel.id})
  const cm=(await api('list')).matches.find(x=>x.tournament_id===cancel.id&&x.a&&x.b)
  await assert.rejects(api('match_result',{id:cm.id,winnerId:cm.a}),/ready|cancelled|completed/)
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role)
   await assert.rejects(q('select * from archery_competitors'),/permission denied/)
   await assert.rejects(api('list'),/permission denied/)
   await assert.rejects(q('select archery_private.settle_bracket($1)',[t.id]),/permission denied/)
   await db.exec('reset role')
  }
  await db.exec('set role service_role');assert.equal((await api('list',{},1)).me,sid(1));await db.exec('reset role')
 }finally{await db.close()}
})

test('tournament upgrade preserves legacy registration, active/pending results and private history; failure rolls back atomically',async()=>{
 const {db,q,api,open,today}=await fixture({upgrade:false})
 try{
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:20,unit:'m',marks:['X','M'],notes:'Student private'},1)
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:15,unit:'yd',marks:['9'],notes:'Instructor private'})
  const challenge=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(2),game:'Original challenge'},1)).challenge
  const registration=await open({title:'Legacy signup'})
  for(const i of [1,2])await api('tournament_join',{id:registration.id},i)
  const active=await open({title:'Legacy active'})
  for(const i of [1,2,3,4])await api('tournament_join',{id:active.id},i)
  await api('tournament_close',{id:active.id})
  let match=(await api('list')).matches.find(m=>m.tournament_id===active.id&&m.round===1)
  const actor=Number(match.a.slice(-12)),other=Number(match.b.slice(-12))
  await api('match_result',{id:match.id,winnerId:match.a,notes:'Pending before upgrade'},actor)
  const original=await api('list',{date:today})
  const migration=await readFile('supabase/migrations/'+migrations.at(-1),'utf8')
  await assert.rejects(db.transaction(async tx=>{await tx.exec(migration);await tx.exec('select missing_upgrade_guard()')}))
  assert.equal((await q("select to_regclass('public.archery_competitors') present"))[0].present,null)
  assert.equal((await q("select count(*)::int n from information_schema.columns where table_name='archery_tournaments' and column_name='engine_version'"))[0].n,0)
  assert.deepEqual((await api('list',{date:today})).dayRounds,original.dayRounds)
  await db.transaction(async tx=>{await tx.exec(migration)})
  // Same version guard as browser reload: a second startup leaves schema/data alone.
  const upgradeIfNeeded=async()=>{if(!(await q("select 1 from information_schema.columns where table_name='archery_tournaments' and column_name='engine_version'")).length)await db.transaction(async tx=>{await tx.exec(migration)})}
  await upgradeIfNeeded()
  let upgraded=await api('list',{date:today})
  for(const field of ['dayRounds','personalDayRounds','challenges'])assert.deepEqual(upgraded[field],original[field])
  assert.deepEqual(upgraded.matches.map(m=>[m.id,m.a,m.b,m.winner_id,m.proposed_winner,m.notes]),original.matches.map(m=>[m.id,m.a,m.b,m.winner_id,m.proposed_winner,m.notes]))
  assert.equal(upgraded.challenges[0].id,challenge.id)
  assert.ok(upgraded.tournaments.every(t=>t.engine_version===1&&t.format==='single'))
  await api('match_confirm',{id:match.id,accept:true},other)
  assert.equal((await api('list')).matches.find(m=>m.id===match.id).winner_id,match.a)
  // An enrollment created after the registry migration can still join an old signup.
  await q('insert into attendance_enrollments(id,class_id,name,email) values($1,$2,$3,$4)',[sid(13),cid,'New student','student13@example.com'])
  await api('tournament_join',{id:registration.id},13)
  assert.equal((await api('list')).tournaments.find(t=>t.id===registration.id).players.find(p=>p.id===sid(13))?.name,'New student')
  await api('tournament_close',{id:registration.id})
  assert.equal((await api('list')).tournaments.find(t=>t.id===registration.id).participants.length,3)
  while(true){
   match=(await api('list')).matches.find(m=>m.tournament_id===active.id&&!m.winner_id&&m.a&&m.b)
   if(!match)break
   await api('match_result',{id:match.id,winnerId:match.a})
  }
  upgraded=await api('list');assert.equal(upgraded.tournaments.find(t=>t.id===active.id).status,'completed')
  assert.equal((await api('list',{},2)).personalRounds.length,0)
  assert.ok(!JSON.stringify(await api('list',{},2)).includes('Instructor private'))
 }finally{await db.close()}
})

test('fixed single/double bracket paths finish for every size 2–64 with exactly one/two played losses eliminating players',async()=>{
 const {db,q,api,open}=await fixture()
 try{
  for(let i=13;i<=64;i++)await q('insert into attendance_enrollments(id,class_id,name,email) values($1,$2,$3,$4)',[sid(i),cid,'Student '+i,'student'+i+'@example.com'])
  for(const format of ['single','double'])for(let n=2;n<=64;n++){
   const t=await open({format,title:format+' '+n})
   // Draw revalidates enrollment and seeds the registry, just as after individual opt-ins.
   await q('update archery_tournaments set participants=$2 where id=$1',[t.id,Array.from({length:n},(_,i)=>sid(i+1))])
   await api('tournament_close',{id:t.id})
   let played=0,finals=0
   const losses=new Map()
   while(true){
    const tournament=(await q('select * from archery_tournaments where id=$1',[t.id]))[0]
    if(tournament.status==='completed'){
     assert.equal(played,format==='single'?n-1:2*n-2+(finals===2?1:0),format+' '+n)
     for(let i=1;i<=n;i++)assert.equal(losses.get(sid(i))??0,sid(i)===tournament.winner_id?(finals===2?1:0):format==='single'?1:2,format+' '+n+' player '+i)
     break
    }
    const ready=await q('select * from archery_matches where tournament_id=$1 and not resolved and a is not null and b is not null order by bracket,round,position',[t.id])
    assert.ok(ready.length,'no dead end '+format+' '+n)
    const active=new Set()
    for(const m of ready){
     assert.notEqual(m.a,m.b);for(const id of [m.a,m.b]){assert.ok(!active.has(id),'one ready match per player');active.add(id);assert.ok((losses.get(id)??0)<(format==='double'?2:1))}
     let winner=(played+n)%2?m.a:m.b
     if(m.bracket==='final'){finals++;winner=n%2?m.b:m.a}
     if(m.bracket==='reset')finals++
     const loser=winner===m.a?m.b:m.a;losses.set(loser,(losses.get(loser)??0)+1)
     await q('select archery_private.record_match($1,$2,$3)',[m.id,winner,'Played'])
     played++;assert.ok(played<=2*n-1)
    }
   }
   const first=await q("select * from archery_matches where tournament_id=$1 and bracket='upper' and round=1",[t.id])
   assert.equal(first.filter(m=>m.bye).length,2**Math.ceil(Math.log2(n))-n)
  }
 }finally{await db.close()}
})
