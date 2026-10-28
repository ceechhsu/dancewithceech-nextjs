import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('archery scores, challenges and arbitrary-size draws enforce class permissions and transactional advancement',async()=>{
 const db=new PGlite()
 try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  for(const f of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql']) await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows
  const c=(await q(`insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values('teacher@example.com','Archery','Fall',2026,current_date-30,current_date+90,'10:00','11:00','archery') returning id`))[0].id
  const other=(await q(`insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values('other@example.com','Archery 2','Fall',2026,current_date-30,current_date+90,'10:00','11:00','archery') returning id`))[0].id
  const ids=[];for(let i=0;i<64;i++) ids.push((await q(`insert into attendance_enrollments(class_id,name,email,effective_from) values($1,$2,$3,current_date-30) returning id`,[c,'Student '+i,'student'+i+'@example.com']))[0].id)
  const today=(await q("select (clock_timestamp() at time zone 'America/Los_Angeles')::date::text date"))[0].date
  const api=async(action,body={},actor='teacher@example.com',instructor=actor==='teacher@example.com',sub='sub-'+actor)=>(await q('select archery_api($1,$2,$3,$4,$5) data',[actor,sub,instructor,action,{classId:c,...body}]))[0].data
  await assert.rejects(api('list',{},'outsider@example.com'),/access denied/)
  await assert.rejects(api('list',{classId:other}),/access denied/)
  await assert.rejects(api('list',{},'',false),/identity/)
  const data=await api('list',{},'student0@example.com')
  assert.equal(data.roster.length,64);assert.deepEqual(Object.keys(data.roster[0]).sort(),['id','name'])
  assert.ok(!JSON.stringify(data.roster).includes('@'))
  await assert.rejects(api('list',{},'student0@example.com',false,'wrong-sub'),/access denied/)
  const round={id:crypto.randomUUID(),date:today,distance:30,unit:'m',scores:[10,10,9,8,7],notes:'Practice'}
  assert.equal((await api('round_save',round,'student0@example.com')).round.total,44)
  assert.equal((await api('round_save',round,'student0@example.com')).duplicate,true)
  await assert.rejects(api('round_save',{...round,scores:[1]},'student0@example.com'),/already saved/)
  assert.equal((await api('list',{},'student1@example.com')).rounds.length,0)
  for(const bad of [{scores:[]},{scores:[11]},{scores:[1.5]},{scores:[null]},{distance:0},{unit:'km'},{date:'2100-01-01'}])await assert.rejects(api('round_save',{...round,id:crypto.randomUUID(),...bad},'student0@example.com'))
  assert.equal((await api('list')).rounds.length,1)
  const challenge=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:ids[1],game:'Tic tac toe'},'student0@example.com')).challenge
  await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId:ids[1],game:'Again'},'student0@example.com'),/active challenge/)
  assert.equal((await api('list',{},'student2@example.com')).challenges.length,0)
  await assert.rejects(api('challenge_respond',{id:challenge.id,accept:true},'student0@example.com'),/opponent/)
  await assert.rejects(api('challenge_respond',{id:challenge.id,accept:true},'student2@example.com'),/access denied/)
  await assert.rejects(api('challenge_result',{id:challenge.id,winnerId:ids[0]},'student0@example.com'),/accepted/)
  await api('challenge_respond',{id:challenge.id,accept:true},'student1@example.com')
  await assert.rejects(api('challenge_result',{id:challenge.id,winnerId:ids[2]},'student0@example.com'),/participant/)
  await api('challenge_result',{id:challenge.id,winnerId:ids[0],notes:'Won the board'},'student0@example.com')
  await assert.rejects(api('challenge_confirm',{id:challenge.id,accept:true},'student0@example.com'),/other player/)
  await api('challenge_confirm',{id:challenge.id,accept:false},'student1@example.com')
  assert.equal((await api('list',{},'student0@example.com')).challenges[0].proposed_winner,null)
  await api('challenge_result',{id:challenge.id,winnerId:ids[0]},'student0@example.com')
  await api('challenge_confirm',{id:challenge.id,accept:true},'student1@example.com')
  assert.equal((await api('list',{},'student0@example.com')).challenges[0].winner_id,ids[0])
  await assert.rejects(api('challenge_result',{id:challenge.id,winnerId:ids[1]},'student0@example.com'),/completed/)
  const declined=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:ids[2],game:'Ten rings'},'student0@example.com')).challenge
  await api('challenge_respond',{id:declined.id,accept:false},'student2@example.com')
  assert.equal((await api('list',{},'student0@example.com')).challenges.find(x=>x.id===declined.id).status,'declined')
  const cancelled=(await api('challenge_create',{id:crypto.randomUUID(),opponentId:ids[3],game:'Practice game'},'student0@example.com')).challenge
  await api('challenge_respond',{id:cancelled.id,accept:true},'student3@example.com')
  await api('challenge_result',{id:cancelled.id,winnerId:ids[3]},'student3@example.com')
  assert.equal((await api('challenge_cancel',{id:cancelled.id},'student0@example.com')).challenge.reported_by,undefined,'challenge responses never disclose another student email')
  for(const n of Array.from({length:63},(_,i)=>i+2)) {
   const body={id:crypto.randomUUID(),title:'Draw '+n,game:'Winner only',participants:ids.slice(0,n)}
   const t=(await api('tournament_create',body)).tournament
   let view=await api('list');let matches=view.matches.filter(m=>m.tournament_id===t.id)
   assert.equal(t.bracket_size,2**Math.ceil(Math.log2(n)))
   const first=matches.filter(m=>m.round===1)
   assert.equal(first.filter(m=>m.bye).length,t.bracket_size-n)
   assert.equal(new Set(first.flatMap(m=>[m.a,m.b]).filter(Boolean)).size,n)
   assert.ok(first.every(m=>m.a || m.b),'no bye against bye')
   assert.equal((await api('tournament_create',body)).tournament.id,t.id,'draw retries cannot reshuffle')
   await assert.rejects(api('tournament_create',{...body,id:crypto.randomUUID()},'student0@example.com'),/Instructor/)
   for(let r=1;r<=Math.log2(t.bracket_size);r++) {
    matches=(await api('list')).matches.filter(m=>m.tournament_id===t.id && m.round===r)
    for(const m of matches)if(!m.bye) {
     assert.ok(m.a&&m.b)
     await assert.rejects(api('match_result',{id:m.id,winnerId:m.a},'student0@example.com'),/Instructor/)
     await assert.rejects(api('match_result',{id:m.id,winnerId:crypto.randomUUID()}),/participant/)
     await api('match_result',{id:m.id,winnerId:m.a,notes:'Class game'})
     await api('match_result',{id:m.id,winnerId:m.a,notes:'Class game'})
     await assert.rejects(api('match_result',{id:m.id,winnerId:m.b}),/completed/)
    }
   }
   view=await api('list');const done=view.tournaments.find(x=>x.id===t.id)
   assert.equal(done.status,'completed');assert.ok(ids.slice(0,n).includes(done.winner_id))
   assert.equal(view.matches.filter(m=>m.tournament_id===t.id&&!m.bye&&m.winner_id).length,n-1)
  }
  await assert.rejects(api('tournament_create',{id:crypto.randomUUID(),title:'Bad',game:'Bad',participants:[ids[0],ids[0]]}),/unique/)
  await assert.rejects(api('tournament_create',{id:crypto.randomUUID(),title:'Bad',game:'Bad',participants:[ids[0],crypto.randomUUID()]}),/enrolled/)
  await q('update attendance_enrollments set removed_at=now() where id=$1',[ids[1]])
  await assert.rejects(api('list',{},'student1@example.com'),/access denied/)
  assert.equal((await api('list',{},'student0@example.com')).roster.length,63)
  for(const role of ['anon','authenticated']) {
   await db.exec('set role '+role)
   await assert.rejects(api('list'),/permission denied/)
   for(const table of ['archery_rounds','archery_challenges','archery_tournaments','archery_matches'])await assert.rejects(q('select * from '+table),/permission denied/)
   await db.exec('reset role')
  }
  await db.exec('set role service_role')
  assert.equal((await api('list',{},'student0@example.com')).rounds.length,1)
  await api('round_save',{...round,id:crypto.randomUUID(),scores:[1,2,3]},'student0@example.com')
  await db.exec('reset role')
 }finally {await db.close()}
})
