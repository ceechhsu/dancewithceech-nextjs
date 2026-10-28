import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const cid='00000000-0000-0000-0000-000000000001',sid=i=>'00000000-0000-0000-0000-'+String(i).padStart(12,'0')
const base=['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql','20261027224308_archery_result_disputes.sql','20261028002402_archery_history_visibility.sql']
async function fixture(upgrade=true){
 const db=new PGlite();await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
 await db.exec('grant select,update on attendance_classes,attendance_enrollments to service_role')
 for(const file of base)await db.exec(await readFile('supabase/migrations/'+file,'utf8'))
 const migration=(await readdir('supabase/migrations')).find(x=>x.endsWith('_archery_instructor_challenges.sql'))
 if(upgrade&&migration)await db.transaction(async tx=>tx.exec(await readFile('supabase/migrations/'+migration,'utf8')))
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows
 const api=async(action,body={},actor=0,sub)=>{const email=actor?'student'+actor+'@example.com':'teacher@example.com';return(await q('select archery_api($1,$2,$3,$4,$5) data',[email,sub??'demo-'+email,!actor,action,{classId:cid,...body}]))[0].data}
 return{db,q,api,migration}
}
const noIdentity=data=>{const text=JSON.stringify(data);for(const v of ['@example.com','demo-','"reported_by":','"raised_by":','"resolved_by":'])assert.ok(!text.includes(v),v)}

test('students can invite their instructor before the first owner visit; the instructor accepts and plays without enrollment',async()=>{
 const {db,q,api}=await fixture();try{
  const before=(await q('select count(*)::int n from attendance_enrollments'))[0].n
  const student=await api('list',{},1),host=student.challengeRoster?.find(p=>p.name==='Instructor')
  assert.ok(host,'instructor must be available in the challenge wheel before owner visits')
  assert.equal(student.challengeMe,sid(1));assert.equal(student.roster.length,12)
  const id=crypto.randomUUID(),body={id,opponentId:host.id,game:'Tic tac toe'}
  const created=(await api('challenge_create',body,1)).challenge
  assert.equal(created.opponent,host.id);noIdentity(created)
  assert.equal((await api('challenge_create',body,1)).challenge.id,id)
  const owner=await api('list');assert.equal(owner.challengeMe,host.id);assert.equal(owner.me,null)
  assert.ok(owner.challenges.some(c=>c.id===id&&c.opponent_name==='Instructor'))
  await assert.rejects(api('challenge_respond',{id,accept:true},2),/denied|opponent/i)
  await api('challenge_respond',{id,accept:true})
  await api('challenge_result',{id,winnerId:host.id,notes:'Instructor reported'})
  let ch=(await api('list',{},1)).challenges.find(c=>c.id===id)
  assert.equal(ch.status,'accepted');assert.equal(ch.winner_id,null);assert.equal(ch.proposed_winner,host.id)
  await assert.rejects(api('challenge_confirm',{id,accept:true}),/other player/i)
  await api('challenge_confirm',{id,accept:true},1)
  ch=(await api('list')).challenges.find(c=>c.id===id);assert.equal(ch.status,'completed');assert.equal(ch.winner_id,host.id)
  await assert.rejects(api('challenge_result',{id,winnerId:sid(1)}),/completed|closed/i)
  assert.equal((await q('select count(*)::int n from attendance_enrollments'))[0].n,before)
  noIdentity((await api('list',{},1)).challenges)
 }finally{await db.close()}
})

test('instructor invites, student reports, instructor confirms or disputes; explicit own dispute rulings preserve evidence',async()=>{
 const {db,q,api}=await fixture();try{
  const me=(await api('list')).challengeMe;assert.ok(me)
  const id=crypto.randomUUID();await api('challenge_create',{id,opponentId:sid(2),game:'Ten rings'})
  await assert.rejects(api('challenge_respond',{id,accept:true}),/opponent/i)
  await api('challenge_respond',{id,accept:true},2)
  await api('challenge_result',{id,winnerId:sid(2),notes:'Student says two to one'},2)
  await api('challenge_confirm',{id,accept:false})
  let view=await api('list'),ch=view.challenges.find(c=>c.id===id),d=view.disputes.find(d=>d.result_id===id)
  assert.equal(ch.dispute.status,'pending');assert.equal(ch.proposed_winner,sid(2));assert.equal(ch.winner_id,null)
  assert.equal(d.players.length,2);assert.deepEqual(new Set(d.players.map(p=>p.id)),new Set([me,sid(2)]))
  await assert.rejects(api('challenge_result',{id,winnerId:me}),/disput|instructor/i)
  await assert.rejects(api('challenge_confirm',{id,accept:true},2),/disput|instructor/i)
  await assert.rejects(api('dispute_resolve',{id:d.id,winnerId:me},2),/Instructor/i)
  const decision={id:d.id,winnerId:me,notes:'Reviewed together'}
  await api('dispute_resolve',decision);assert.equal((await api('dispute_resolve',decision)).duplicate,true)
  await assert.rejects(api('dispute_resolve',{...decision,winnerId:sid(2)}),/resolved/i)
  ch=(await api('list',{},2)).challenges.find(c=>c.id===id)
  assert.equal(ch.winner_id,me);assert.equal(ch.dispute.reported_winner,sid(2));assert.equal(ch.dispute.decision_notes,decision.notes)
  noIdentity(ch)
  const audit=(await q('select reported_by,raised_by,resolved_by from archery_result_disputes where id=$1',[d.id]))[0]
  assert.equal(audit.reported_by,'student2@example.com');assert.equal(audit.raised_by,'teacher@example.com');assert.equal(audit.resolved_by,'teacher@example.com')
 }finally{await db.close()}
})

test('identity, active roster, self-match and duplicate guards apply to both directions; outsiders cannot see instructor invitations',async()=>{
 const {db,q,api}=await fixture();try{
  const host=(await api('list')).challengeMe;assert.ok(host)
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:host,game:'Self'}),/another|yourself|self/i)
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(1),game:'Self'},1),/another|yourself|self/i)
  const id=crypto.randomUUID();await api('challenge_create',{id,opponentId:host,game:'Invite instructor'},1)
  assert.equal((await api('list',{},2)).challenges.length,0)
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(1),game:'Duplicate reverse'}),/active challenge/i)
  await assert.rejects(api('challenge_respond',{id,accept:true},0,'changed-sub'),/same verified|identity/i)
  await api('challenge_respond',{id,accept:false});assert.equal((await api('list',{},1)).challenges[0].status,'declined')
  await q('update attendance_enrollments set removed_at=clock_timestamp() where id=$1',[sid(3)])
  assert.ok(!(await api('list')).challengeRoster.some(p=>p.id===sid(3)))
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(3),game:'Removed'}),/active|enrolled|opponent/i)
  await q('update attendance_classes set archived=true where id=$1',[cid])
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(2),game:'Archived'}),/Restore|archived/i)
 }finally{await db.close()}
})

test('upgrade preserves student challenge IDs and pending disputes; owner referee actions and private practice remain intact',async()=>{
 const {db,q,api,migration}=await fixture(false);try{
  const id=crypto.randomUUID();await api('challenge_create',{id,opponentId:sid(2),game:'Legacy'},1);await api('challenge_respond',{id,accept:true},2)
  await api('challenge_result',{id,winnerId:sid(1)},1);await api('challenge_confirm',{id,accept:false},2)
  assert.ok(migration,'new migration exists');await db.transaction(async tx=>tx.exec(await readFile('supabase/migrations/'+migration,'utf8')))
  const view=await api('list'),d=view.disputes.find(d=>d.result_id===id);assert.equal(d.players.length,2)
  await api('dispute_resolve',{id:d.id,winnerId:sid(2)})
  const ch=(await api('list',{},1)).challenges.find(c=>c.id===id);assert.equal(ch.challenger,sid(1));assert.equal(ch.opponent,sid(2));assert.equal(ch.winner_id,sid(2))
  const date=view.today;await api('round_save',{id:crypto.randomUUID(),date,distance:20,unit:'m',marks:['X']})
  assert.equal((await api('list',{},1)).personalRounds.length,0)
  await db.exec('set role anon');await assert.rejects(q('select * from archery_challenge_players'),/permission denied/i);await assert.rejects(api('list'),/permission denied/i);await db.exec('reset role')
 }finally{await db.close()}
})


test('student disputes the instructor report; owner cancellation closes it and new owners cannot act as the old player',async()=>{
 const {db,q,api}=await fixture();try{
  const host=(await api('list')).challengeMe,id=crypto.randomUUID()
  await api('challenge_create',{id,opponentId:sid(1),game:'Own disputed result'})
  await api('challenge_respond',{id,accept:true},1);await api('challenge_result',{id,winnerId:host})
  await api('challenge_confirm',{id,accept:false},1)
  const dispute=(await api('list')).disputes.find(d=>d.result_id===id)
  assert.equal(dispute.players.find(p=>p.id===host).name,'Instructor')
  await assert.rejects(api('dispute_resolve',{id:dispute.id,winnerId:host},0,'wrong-sub'),/same verified|identity/i)
  await assert.rejects(api('challenge_cancel',{id},1),/disput/i)
  await api('challenge_cancel',{id})
  assert.equal((await api('list',{},1)).challenges[0].dispute.status,'cancelled')
  const second=crypto.randomUUID();await api('challenge_create',{id:second,opponentId:sid(2),game:'Old owner invite'})
  await q("update attendance_classes set instructor_email='replacement@example.com' where id=$1",[cid])
  const replacement=async(action,body={})=>(await q('select archery_api($1,$2,true,$3,$4) data',['replacement@example.com','replacement-sub',action,{classId:cid,...body}]))[0].data
  const view=await replacement('list');assert.notEqual(view.challengeMe,host)
  assert.ok(!view.challengeRoster.some(p=>p.id===host));assert.equal(view.challenges.find(c=>c.id===second).challenger,host)
  await assert.rejects(replacement('challenge_respond',{id:second,accept:true}),/opponent/i)
  await replacement('challenge_cancel',{id:second})
 }finally{await db.close()}
})

test('class-scoped constraints, current enrollment and rate limits remain enforced; migration failure rolls back legacy history',async()=>{
 const {db,q,api}=await fixture();try{
  const host=(await api('list')).challengeMe
  const other=crypto.randomUUID();await q("insert into attendance_classes(id,instructor_email,name) values($1,'other@example.com','Other class')",[other])
  const otherStudent=crypto.randomUUID();await q("insert into attendance_enrollments(id,class_id,name,email) values($1,$2,'Other player','other@example.com')",[otherStudent,other])
  await q('insert into archery_challenge_players(id,class_id,enrollment_id) values($1,$2,$1)',[otherStudent,other])
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:otherStudent,game:'Cross class'}),/enrolled|active/i)
  await assert.rejects(q("insert into archery_challenges(id,class_id,challenger,opponent,game) values($1,$2,$3,$4,'Wrong class')",[crypto.randomUUID(),cid,host,otherStudent]),/foreign key/i)
  for(let i=1;i<=5;i++){const id=crypto.randomUUID();await api('challenge_create',{id,opponentId:sid(i),game:'Rate limit'});await api('challenge_cancel',{id})}
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:sid(6),game:'Rate limit'}),/few minutes/i)
  await q("update attendance_enrollments set effective_to=(clock_timestamp() at time zone 'America/Los_Angeles')::date-1 where id=$1",[sid(7)])
  await assert.rejects(api('list',{},7),/access denied/i)
 }finally{await db.close()}
 const before=await fixture(false);try{
  const id=crypto.randomUUID();await before.api('challenge_create',{id,opponentId:sid(2),game:'Rollback-safe'},1)
  const sql=await readFile('supabase/migrations/'+before.migration,'utf8')
  await assert.rejects(before.db.transaction(async tx=>{await tx.exec(sql);throw Error('Injected failure')}),/Injected failure/)
  assert.equal((await before.q("select to_regclass('public.archery_challenge_players') present"))[0].present,null)
  assert.equal((await before.api('list',{},1)).challenges[0].id,id)
  await before.db.transaction(async tx=>tx.exec(sql));assert.equal((await before.api('list',{},1)).challenges[0].id,id)
 }finally{await before.db.close()}
})


test('a renamed instructor with the same Google subject cannot become the referee of their own historical challenge',async()=>{
 const {db,q,api}=await fixture();try{
  const host=(await api('list',{},0,'stable-owner-sub')).challengeMe,id=crypto.randomUUID()
  await api('challenge_create',{id,opponentId:sid(1),game:'Identity rename'},0,'stable-owner-sub')
  await api('challenge_respond',{id,accept:true},1)
  await q("update attendance_classes set instructor_email='renamed@example.com' where id=$1",[cid])
  const renamed=async(action,body={})=>(await q('select archery_api($1,$2,true,$3,$4) data',['renamed@example.com','stable-owner-sub',action,{classId:cid,...body}]))[0].data
  await assert.rejects(renamed('challenge_result',{id,winnerId:host}),/identity changed|same verified/i)
  await api('challenge_result',{id,winnerId:sid(1)},1)
  await assert.rejects(renamed('challenge_confirm',{id,accept:true}),/identity changed|same verified/i)
  assert.equal((await q('select status,winner_id from archery_challenges where id=$1',[id]))[0].winner_id,null)
  await renamed('challenge_cancel',{id})
 }finally{await db.close()}
})
