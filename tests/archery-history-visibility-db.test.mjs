import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

const files=['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql','20261027224308_archery_result_disputes.sql']
const upgrade='20261028002402_archery_history_visibility.sql',cid='00000000-0000-0000-0000-000000000001'
const sid=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0')
async function fixture(apply=true){
 const db=new PGlite();await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
 await db.exec('grant select,update on attendance_classes,attendance_enrollments to service_role')
 for(const file of [...files,...(apply?[upgrade]:[])])await db.exec(await readFile('supabase/migrations/'+file,'utf8'))
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows
 const api=async(action,body={},actor=0,sub)=>{
  const email=actor?'student'+actor+'@example.com':'teacher@example.com'
  return (await q('select archery_api($1,$2,$3,$4,$5) data',[email,sub??'demo-'+email,!actor,action,{classId:cid,...body}]))[0].data
 }
 const today=(await api('list')).today
 const older=(await q('select ($1::date-10)::text as date_value',[today]))[0].date_value
 const open=async(title='Old registration')=>(await api('tournament_open',{id:crypto.randomUUID(),date:today,title,game:'Ten rings',signupMinutes:null})).tournament
 const newer=async(count=35)=>q("insert into archery_tournaments(id,class_id,title,game,participants,bracket_size,status,event_date,created_at) select gen_random_uuid(),$1,'Newer '||i,'Game','{}',null,'cancelled',$2,clock_timestamp()+i*interval '1 second' from generate_series(1,$3::int) i",[cid,today,count])
 return {db,q,api,today,older,open,newer}
}
const ids=rows=>new Set(rows.map(x=>x.id))
const noIdentities=value=>{
 const text=JSON.stringify(value)
 assert.ok(!text.includes('@example.com'),text)
 assert.ok(!text.includes('demo-'),text)
 assert.ok(!text.includes('"reported_by":'),text)
 assert.ok(!text.includes('"raised_by":'),text)
 assert.ok(!text.includes('"resolved_by":'),text)
}

test('older registration and active matches remain visible after more than 30 newer events',async()=>{
 const {db,q,api,today,older,open,newer}=await fixture()
 try{
  const registration=await open(),active=await open('Old active')
  for(const actor of [1,2])await api('tournament_join',{id:active.id},actor)
  await api('tournament_close',{id:active.id})
  const match=(await api('list')).matches.find(x=>x.tournament_id===active.id)
  await api('match_result',{id:match.id,winnerId:match.a,notes:'Keep pending result'},Number(match.a.slice(-12)))
  await q('update archery_tournaments set event_date=$1,created_at=clock_timestamp()-interval \'10 days\' where id=any($2::uuid[])',[older,[registration.id,active.id]])
  await newer()
  for(const actor of [0,1,3]){
   const data=await api('list',{date:today},actor)
   assert.ok(ids(data.tournaments).has(registration.id),'manual registration must outlive the history window')
   assert.ok(ids(data.tournaments).has(active.id),'active draws must outlive the history window')
   const safe=data.matches.find(x=>x.id===match.id)
   assert.equal(safe.proposed_winner,match.a)
   assert.equal(safe.reported_by_me,actor===Number(match.a.slice(-12)))
   assert.equal(safe.dispute,null)
   assert.equal(data.tournamentDays[older],2)
   assert.equal(data.tournamentDays[today],35)
   assert.deepEqual(data.tournaments.find(x=>x.id===active.id).players.map(x=>x.name).sort(),['Alex Sample','Jordan Example'])
   noIdentities(data)
  }
 }finally{await db.close()}
})

test('selected older calendar date returns all 36 events and counts every old day while closed no-draw history stays bounded',async()=>{
 const {db,q,api,today,older,newer}=await fixture()
 try{
  const rows=await q("insert into archery_tournaments(id,class_id,title,game,participants,bracket_size,status,event_date,created_at) select gen_random_uuid(),$1,'Old same-day '||i,'Game','{}',null,'registration_closed',$2,clock_timestamp()-interval '10 days' from generate_series(1,36) i returning id",[cid,older])
  await newer()
  const unselected=await api('list',{date:today})
  assert.equal(unselected.tournaments.length,35,'all selected day events survive the recent history cap')
  assert.equal(unselected.tournamentDays[older],36,'calendar counts cover the full class history')
  const selected=await api('list',{date:older},1)
  assert.ok(rows.every(x=>ids(selected.tournaments).has(x.id)),'selected day must include more than30 events')
  assert.equal(selected.tournaments.length,66,'36 selected events plus30 most recent other history')
 }finally{await db.close()}
})

test('pending and accepted challenges outlive 100 terminal rows and retain only participant-safe metadata',async()=>{
 const {db,q,api}=await fixture()
 try{
  const pending=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(2),game:'Pending'},1)).challenge
  const accepted=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(3),game:'Accepted'},1)).challenge
  await api('challenge_respond',{id:accepted.id,accept:true},3)
  await api('challenge_result',{id:accepted.id,winnerId:sid(1),notes:'Preserve evidence'},1)
  await api('challenge_confirm',{id:accepted.id,accept:false},3)
  await q("update archery_challenges set created_at=clock_timestamp()-interval '10 days' where id=any($1::uuid[])",[[pending.id,accepted.id]])
  await q("insert into archery_challenges(id,class_id,challenger,opponent,game,status,winner_id,created_at) select gen_random_uuid(),$1,$2,$3,'New terminal','completed',$2,clock_timestamp()+i*interval '1 second' from generate_series(1,105) i",[cid,sid(1),sid(2)])
  const owner=await api('list'),student=await api('list',{},1)
  for(const data of [owner,student]){
   assert.equal(data.challenges.length,102)
   assert.ok(ids(data.challenges).has(pending.id));assert.ok(ids(data.challenges).has(accepted.id))
   const safe=data.challenges.find(x=>x.id===accepted.id)
   assert.equal(safe.challenger_name,'Alex Sample');assert.equal(safe.opponent_name,'Casey Demo')
   assert.equal(safe.reported_by_me,data===student)
   assert.equal(safe.proposed_winner,sid(1));assert.equal(safe.dispute.reported_notes,'Preserve evidence')
   assert.deepEqual(Object.keys(safe.dispute).sort(),['id','status','reported_winner','reported_notes','created_at','winner_id','decision_notes','resolved_at'].sort())
   noIdentities(data)
  }
  assert.deepEqual((await api('list',{},4)).challenges,[])
  assert.deepEqual((await api('list',{},3)).challenges.map(x=>x.id),[accepted.id])
  assert.equal(owner.disputes.length,1)
 }finally{await db.close()}
})

test('history upgrade leaves marks and private round arrays unchanged, delegates writes, and excludes other classes',async()=>{
 const {db,q,api,today,older,open}=await fixture(false)
 try{
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:30,unit:'m',marks:['M','X','10'],notes:'Student round'},1)
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:20,unit:'yd',marks:['X','M'],notes:'Private instructor round'})
  const t=await open();await api('tournament_join',{id:t.id});await api('tournament_join',{id:t.id},1);await api('tournament_close',{id:t.id})
  const m=(await api('list')).matches.find(x=>x.tournament_id===t.id)
  await api('match_result',{id:m.id,winnerId:m.a},m.a===sid(1)?1:0)
  await api('match_confirm',{id:m.id,accept:false},m.b===sid(1)?1:0)
  const before=await Promise.all([api('list',{date:today}),api('list',{date:today},1),api('list',{date:today},2)])
  assert.deepEqual(before[1].dayRounds[0].score_marks,['M','X','10'])
  assert.deepEqual(before[0].personalDayRounds[0].score_marks,['X','M'])
  assert.deepEqual(before[2].dayRounds,[])
  for(const actor of [1,2])assert.deepEqual(before[actor].personalRounds,[])
  const migration=await readFile('supabase/migrations/'+upgrade,'utf8')
  await assert.rejects(db.transaction(async tx=>{await tx.exec(migration);await tx.exec('select nonexistent_history_upgrade_guard()')}))
  assert.equal((await q("select to_regprocedure('archery_private.archery_api_disputes(text,text,boolean,text,jsonb)') present"))[0].present,null)
  await db.transaction(async tx=>{await tx.exec(migration)})
  // The browser startup checks the renamed predecessor, so a second startup does not reapply ALTER FUNCTION.
  if(!(await q("select to_regprocedure('archery_private.archery_api_disputes(text,text,boolean,text,jsonb)') present"))[0].present)await db.exec(migration)
  for(const actor of [0,1,2]){
   const after=await api('list',{date:today},actor)
   for(const field of ['today','rounds','roundDays','dayRounds','personalRounds','personalRoundDays','personalDayRounds','roundDate'])assert.deepEqual(after[field],before[actor][field],field)
   const safe=after.matches.find(x=>x.id===m.id)
   assert.equal(safe.dispute.status,'pending');assert.equal(safe.proposed_winner,m.a)
   assert.deepEqual(Object.keys(safe.dispute).sort(),['id','status','reported_winner','reported_notes','created_at','winner_id','decision_notes','resolved_at'].sort())
   assert.ok(after.tournaments.find(x=>x.id===t.id).players.some(x=>x.name==='Instructor'))
   noIdentities(after)
  }
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:5,unit:'m',marks:['X','M']},1)
  assert.equal((await api('list',{date:today},1)).dayRounds.length,2)
  const other=crypto.randomUUID()
  await q("insert into attendance_classes(id,instructor_email,name) values($1,'other@example.com','Private other class')",[other])
  await q("insert into archery_tournaments(id,class_id,title,game,participants,status,event_date) values(gen_random_uuid(),$1,'Other secret','Game','{}','registration',$2)",[other,older])
  const after=await api('list',{date:older},1)
  assert.equal(after.tournamentDays[older],undefined);assert.ok(!JSON.stringify(after).includes('Other secret'))
  await assert.rejects(api('list',{classId:other},1),/access denied/)
  await assert.rejects(api('list',{},1,'different-sub'),/access denied/)
  for(const date of [null,'','2026-99-99','not-a-date'])await assert.rejects(api('list',{date}),/date|range|syntax/i)
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role)
   await assert.rejects(api('list'),/permission denied/)
   await assert.rejects(q('select archery_private.archery_api_disputes($1,$2,true,$3,$4)',['teacher@example.com','demo-teacher@example.com','list',{classId:cid}]),/permission denied/)
   await db.exec('reset role')
  }
  await db.exec('set role service_role');assert.equal((await api('list',{},1)).tournamentDays[today],1);await db.exec('reset role')
 }finally{await db.close()}
})

test('legacy engine draws keep names and pending result fields beyond the window and still advance through delegated writes',async()=>{
 const {db,q,api,today,older,newer}=await fixture(false)
 try{
  const t=(await q('select archery_private.archery_api_calendar($1,$2,true,$3,$4) data',['teacher@example.com','demo-teacher@example.com','tournament_open',{classId:cid,id:crypto.randomUUID(),date:today,title:'Legacy cup',game:'Legacy game'}]))[0].data.tournament
  assert.equal(t.engine_version,1)
  for(const actor of [1,2])await api('tournament_join',{id:t.id},actor)
  await api('tournament_close',{id:t.id})
  const m=(await api('list')).matches.find(x=>x.tournament_id===t.id)
  const reporter=Number(m.a.slice(-12)),confirmer=Number(m.b.slice(-12))
  await api('match_result',{id:m.id,winnerId:m.a,notes:'Legacy proposal'},reporter)
  await q("update archery_tournaments set event_date=$1,created_at=clock_timestamp()-interval '10 days' where id=$2",[older,t.id])
  await newer()
  assert.ok(!ids((await api('list')).tournaments).has(t.id))
  await db.exec(await readFile('supabase/migrations/'+upgrade,'utf8'))
  const restored=await api('list',{date:today},reporter),safe=restored.matches.find(x=>x.id===m.id)
  assert.equal(safe.proposed_winner,m.a);assert.equal(safe.notes,'Legacy proposal');assert.equal(safe.reported_by_me,true)
  assert.equal(safe.resolved,false);assert.equal(safe.dispute,null)
  assert.deepEqual(restored.tournaments.find(x=>x.id===t.id).players.map(x=>x.name).sort(),['Alex Sample','Jordan Example'])
  await api('match_confirm',{id:m.id,accept:true},confirmer)
  assert.ok(!ids((await api('list',{date:today})).tournaments).has(t.id),'completed legacy event returns to ordinary history paging')
  const completed=await api('list',{date:older})
  assert.equal(completed.tournaments.find(x=>x.id===t.id).status,'completed')
  assert.equal(completed.matches.find(x=>x.id===m.id).winner_id,m.a)
  noIdentities(completed)
 }finally{await db.close()}
})
