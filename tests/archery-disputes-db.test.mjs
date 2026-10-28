import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const files=['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql']
const upgrade='20261027224308_archery_result_disputes.sql',cid='00000000-0000-0000-0000-000000000001'
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
 const challenge=async()=>{
  const ch=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(2),game:'Ten rings'},1)).challenge
  await api('challenge_respond',{id:ch.id,accept:true},2);return ch
 }
 const tournament=async(format='double',players=[1,2,3,4])=>{
  const t=(await api('tournament_open',{id:crypto.randomUUID(),date:today,title:'Dispute cup',game:'Tic tac toe',format,signupMinutes:null})).tournament
  for(const i of players)await api('tournament_join',{id:t.id},i)
  await api('tournament_close',{id:t.id});return t
 }
 return {db,q,api,today,challenge,tournament}
}

test('challenge dispute preserves evidence, pauses both players and requires an owning-instructor decision with private immutable audit',async()=>{
 const {db,q,api,challenge}=await fixture()
 try{
  const ch=await challenge()
  await api('challenge_result',{id:ch.id,winnerId:sid(1),notes:'Reported two games to one'},1)
  await assert.rejects(api('challenge_confirm',{id:ch.id,accept:false},1),/other player/)
  await assert.rejects(api('challenge_confirm',{id:ch.id,accept:false},3),/access denied/)
  await api('challenge_confirm',{id:ch.id,accept:false},2)
  const first=(await api('list',{},1)).challenges.find(c=>c.id===ch.id)
  assert.equal(first.dispute?.status,'pending');assert.equal(first.proposed_winner,sid(1));assert.equal(first.winner_id,null)
  assert.equal(first.dispute.reported_notes,'Reported two games to one')
  assert.deepEqual((await api('list',{},2)).challenges.find(c=>c.id===ch.id).dispute,first.dispute)
  const id=first.dispute.id
  await api('challenge_confirm',{id:ch.id,accept:false},2)
  assert.equal((await q('select count(*)::int n from archery_result_disputes where challenge_id=$1',[ch.id]))[0].n,1)
  for(const actor of [1,2]){
   await assert.rejects(api('challenge_result',{id:ch.id,winnerId:sid(actor)},actor),/instructor|disput/i)
   await assert.rejects(api('challenge_confirm',{id:ch.id,accept:true},actor),/instructor|disput/i)
   await assert.rejects(api('challenge_cancel',{id:ch.id},actor),/instructor|disput/i)
   await assert.rejects(api('dispute_resolve',{id,winnerId:sid(actor),instructor:true},actor),/Instructor/)
  }
  assert.equal((await api('list')).disputes.length,1)
  assert.equal((await api('list')).disputes[0].game,'Ten rings')
  assert.deepEqual((await api('list',{},3)).disputes,[])
  assert.equal((await api('list',{},3)).challenges.length,0)
  await assert.rejects(api('dispute_resolve',{id,winnerId:sid(3)}),/participant|player/)
  await assert.rejects(api('dispute_resolve',{id:crypto.randomUUID(),winnerId:sid(1)}),/access denied|not found/)
  const decision={id,winnerId:sid(2),notes:'Reviewed together at the target'}
  await api('dispute_resolve',decision)
  for(const actor of [1,2]){
   const result=(await api('list',{},actor)).challenges.find(c=>c.id===ch.id)
   assert.equal(result.status,'completed');assert.equal(result.winner_id,sid(2));assert.equal(result.dispute.status,'resolved')
   assert.equal(result.dispute.reported_winner,sid(1));assert.equal(result.dispute.decision_notes,decision.notes)
   assert.ok(result.dispute.resolved_at)
   assert.ok(!JSON.stringify(result).includes('@example.com'))
   assert.ok(!JSON.stringify(result).includes('demo-'))
  }
  assert.equal((await api('list')).disputes.length,0)
  assert.equal((await api('dispute_resolve',decision)).duplicate,true)
  for(const change of [{winnerId:sid(1)},{notes:'Changed decision'}])await assert.rejects(api('dispute_resolve',{...decision,...change}),/already|resolved|completed/)
  const audit=(await q('select * from archery_result_disputes where id=$1',[id]))[0]
  assert.equal(audit.raised_by,'student2@example.com');assert.equal(audit.resolved_by,'teacher@example.com');assert.equal(audit.reported_winner,sid(1));assert.equal(audit.winner_id,sid(2))
  await assert.rejects(api('challenge_confirm',{id:ch.id,accept:false},1),/confirm|completed|resolved/)
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(q('select * from archery_result_disputes'),/permission denied/);await assert.rejects(api('list'),/permission denied/);await db.exec('reset role')
  }
  await db.exec('set role service_role');assert.equal((await api('list',{},1)).challenges[0].dispute.status,'resolved');await db.exec('reset role')
 }finally{await db.close()}
})

test('tournament dispute blocks advancement, instructor resolves once, and double-elimination championship reset still works',async()=>{
 const {db,q,api,tournament}=await fixture()
 try{
  const t=await tournament(),actor=id=>Number(id.slice(-12))
  let data=await api('list'),m=data.matches.find(m=>m.tournament_id===t.id&&m.a&&m.b&&!m.resolved)
  await api('match_result',{id:m.id,winnerId:m.a,notes:'Original report'},actor(m.a))
  await api('match_confirm',{id:m.id,accept:false},actor(m.b))
  let dispute=(await api('list',{},actor(m.a))).matches.find(x=>x.id===m.id).dispute
  assert.equal(dispute?.status,'pending')
  const id=dispute.id
  assert.equal((await api('list')).matches.find(x=>x.id===m.id).winner_id,null)
  assert.ok((await q('select a,b from archery_matches where a_source=$1 or b_source=$1',[m.id])).every(x=>x.a!==m.a&&x.b!==m.a),'no winner/loser feed before decision')
  for(const who of [actor(m.a),actor(m.b),0]){
   await assert.rejects(api('match_result',{id:m.id,winnerId:m.b},who),/instructor|disput/i)
   await assert.rejects(api('match_confirm',{id:m.id,accept:true},who),/instructor|disput/i)
  }
  const body={id,winnerId:m.b,notes:'Instructor checked the outcome'}
  const retries=await Promise.all([api('dispute_resolve',body),api('dispute_resolve',body)])
  assert.equal(retries.filter(x=>x.duplicate).length,1)
  assert.equal((await api('list')).matches.find(x=>x.id===m.id).winner_id,m.b)
  let finalDisputed=false,resetPlayed=false,steps=0
  while(true){
   data=await api('list')
   if(data.tournaments.find(x=>x.id===t.id).status==='completed')break
   m=data.matches.find(x=>x.tournament_id===t.id&&!x.resolved&&x.a&&x.b)
   assert.ok(m);assert.ok(steps++<10)
   if(m.bracket==='final'){
    await api('match_result',{id:m.id,winnerId:m.a},actor(m.a));await api('match_confirm',{id:m.id,accept:false},actor(m.b))
    dispute=(await api('list')).matches.find(x=>x.id===m.id).dispute
    await api('dispute_resolve',{id:dispute.id,winnerId:m.b,notes:'Lower finalist won'})
    assert.equal((await api('list')).tournaments.find(x=>x.id===t.id).status,'active')
    finalDisputed=true
   }else{await api('match_result',{id:m.id,winnerId:m.a});if(m.bracket==='reset')resetPlayed=true}
  }
  assert.ok(finalDisputed&&resetPlayed)
  assert.equal((await q("select count(*)::int n from archery_result_disputes where status='resolved'"))[0].n,2)
 }finally{await db.close()}
})

test('instructor playing can explicitly decide a disputed own match, with subject binding and cancelled/archived protection',async()=>{
 const {db,q,api,tournament,challenge}=await fixture()
 try{
  const t=await tournament('single',[0,1]);let data=await api('list'),teacher=data.tournamentMe
  const m=data.matches.find(x=>x.tournament_id===t.id&&x.a&&x.b)
  await api('match_result',{id:m.id,winnerId:teacher});await api('match_confirm',{id:m.id,accept:false},1)
  const id=(await api('list')).disputes[0].id
  await assert.rejects(api('dispute_resolve',{id,winnerId:teacher},0,'different-subject'),/same verified instructor identity/)
  await q('update attendance_classes set archived=true where id=$1',[cid])
  await assert.rejects(api('dispute_resolve',{id,winnerId:teacher}),/Restore|archived/)
  await q('update attendance_classes set archived=false where id=$1',[cid])
  await api('dispute_resolve',{id,winnerId:sid(1)})
  assert.equal((await api('list')).tournaments.find(x=>x.id===t.id).winner_id,sid(1))
  const ch=await challenge();await api('challenge_result',{id:ch.id,winnerId:sid(1)},1);await api('challenge_confirm',{id:ch.id,accept:false},2)
  const cancelled=(await api('list')).disputes[0].id
  await api('challenge_cancel',{id:ch.id})
  assert.equal((await api('list')).disputes.length,0)
  assert.equal((await api('list',{},1)).challenges.find(x=>x.id===ch.id).dispute.status,'cancelled')
  await assert.rejects(api('dispute_resolve',{id:cancelled,winnerId:sid(1)}),/cancelled|closed/)
 }finally{await db.close()}
})

test('pending older disputes outlive history pagination, legacy upgrade is atomic, and decisions enforce cross-class ownership',async()=>{
 const {db,q,api,today,challenge}=await fixture(false)
 try{
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:30,unit:'m',marks:['X','M'],notes:'Keep student history'},1)
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:20,unit:'yd',marks:['9'],notes:'Keep private instructor history'})
  const ch=await challenge();await api('challenge_result',{id:ch.id,winnerId:sid(1),notes:'Keep challenge proposal'},1)
  const t=(await q('select archery_private.archery_api_calendar($1,$2,true,$3,$4) data',['teacher@example.com','demo-teacher@example.com','tournament_open',{classId:cid,id:crypto.randomUUID(),date:today,title:'Legacy pending tournament',game:'Legacy game'}]))[0].data.tournament
  for(const actor of [1,2])await api('tournament_join',{id:t.id},actor)
  await api('tournament_close',{id:t.id})
  const m=(await api('list')).matches.find(x=>x.tournament_id===t.id)
  await api('match_result',{id:m.id,winnerId:m.a,notes:'Keep pending match'},Number(m.a.slice(-12)))
  const original=await api('list',{date:today}),migration=await readFile('supabase/migrations/'+upgrade,'utf8')
  await assert.rejects(db.transaction(async tx=>{await tx.exec(migration);await tx.exec('select nonexistent_upgrade_guard()')}))
  assert.equal((await q("select to_regclass('public.archery_result_disputes') present"))[0].present,null)
  assert.deepEqual((await api('list',{date:today})).personalDayRounds,original.personalDayRounds)
  await db.transaction(async tx=>{await tx.exec(migration)})
  // Browser bootstrap's guard makes repeated startup harmless.
  if(!(await q("select to_regclass('public.archery_result_disputes') present"))[0].present)await db.exec(migration)
  const upgraded=await api('list',{date:today})
  for(const field of ['dayRounds','personalDayRounds'])assert.deepEqual(upgraded[field],original[field])
  assert.equal(upgraded.matches.find(x=>x.id===m.id).proposed_winner,m.a)
  await api('challenge_confirm',{id:ch.id,accept:false},2)
  await api('match_confirm',{id:m.id,accept:false},Number(m.b.slice(-12)))
  await q("update archery_tournaments set created_at=clock_timestamp()-interval '2 days' where id=$1",[t.id])
  await q("update archery_challenges set created_at=clock_timestamp()-interval '2 days' where id=$1",[ch.id])
  await q("insert into archery_tournaments(id,class_id,title,game,participants,bracket_size,status,winner_id,event_date) select gen_random_uuid(),$1,'Newer event '||i,'Game',array[$2::uuid,$3::uuid],2,'completed',$2,$4 from generate_series(1,31) i",[cid,sid(1),sid(2),today])
  await q("insert into archery_challenges(id,class_id,challenger,opponent,game,status,winner_id) select gen_random_uuid(),$1,$2,$3,'Newer challenge','completed',$2 from generate_series(1,101)",[cid,sid(1),sid(2)])
  const paged=await api('list')
  assert.equal(paged.tournaments.some(x=>x.id===t.id),false);assert.equal(paged.challenges.some(x=>x.id===ch.id),false)
  assert.equal(paged.disputes.length,2,'queue does not lose old pending disputes')
  assert.ok(paged.disputes.every(x=>x.players.length===2&&!JSON.stringify(x).includes('@example.com')))
  const other=crypto.randomUUID()
  await q("insert into attendance_classes(id,instructor_email,name) values($1,'other@example.com','Other class')",[other])
  await assert.rejects(q('select archery_api($1,$2,true,$3,$4)',['other@example.com','other-sub','dispute_resolve',{classId:other,id:paged.disputes[0].id,winnerId:sid(1)}]),/access denied/)
  for(const d of paged.disputes)await api('dispute_resolve',{id:d.id,winnerId:d.players[1].id,notes:'Legacy outcome reviewed'})
  assert.equal((await q('select status from archery_tournaments where id=$1',[t.id]))[0].status,'completed')
  assert.equal((await q('select status from archery_challenges where id=$1',[ch.id]))[0].status,'completed')
  assert.equal((await api('list')).disputes.length,0)
 }finally{await db.close()}
})

test('resolution versus cancellation serializes to one terminal outcome without reopening disputes',async()=>{
 const {db,q,api,tournament,challenge}=await fixture()
 try{
  for(const kind of ['challenge','match'])for(const cancelFirst of [false,true]){
   let id,whoA=1,whoB=2,winner=sid(1),t
   if(kind==='challenge')id=(await challenge()).id
   else{t=await tournament('single',[1,2]);const m=(await api('list')).matches.find(x=>x.tournament_id===t.id);id=m.id;winner=m.a;whoA=Number(m.a.slice(-12));whoB=Number(m.b.slice(-12))}
   await api(kind+'_result',{id,winnerId:winner},whoA);await api(kind+'_confirm',{id,accept:false},whoB)
   const d=(await api('list')).disputes.find(x=>x.result_id===id)
   const resolve=()=>api('dispute_resolve',{id:d.id,winnerId:winner,notes:'Final ruling'})
   const cancel=()=>api(kind==='challenge'?'challenge_cancel':'tournament_cancel',{id:t?.id??id})
   const operations=cancelFirst?[cancel(),resolve()]:[resolve(),cancel()]
   const outcomes=await Promise.allSettled(operations)
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1)
   const row=(await q('select * from archery_result_disputes where id=$1',[d.id]))[0]
   assert.equal(row.status,cancelFirst?'cancelled':'resolved')
   if(cancelFirst){
    assert.equal(row.winner_id,null)
    if(kind==='match')assert.equal((await q('select winner_id from archery_matches where id=$1',[id]))[0].winner_id,null)
   }
   await assert.rejects(api(kind+'_confirm',{id,accept:false},whoB),/already|resolved|cancelled/)
   assert.equal((await q('select count(*)::int n from archery_result_disputes where id=$1',[d.id]))[0].n,1)
  }
 }finally{await db.close()}
})
