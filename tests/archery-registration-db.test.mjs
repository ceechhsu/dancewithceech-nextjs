import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('dated instructor-hosted registration locks self-opted entrants and confirmed student winners advance',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;')
  for(const f of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows
  const cid=(await q(`insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values('teacher@example.com','Archery','Fall',2026,current_date-30,current_date+30,'10:00','11:00','archery') returning id`))[0].id
  const ids=[];for(let i=0;i<12;i++)ids.push((await q(`insert into attendance_enrollments(class_id,name,email,effective_from) values($1,$2,$3,current_date-30) returning id`,[cid,'Student '+i,'student'+i+'@example.com']))[0].id)
  const api=async(action,body={},email='teacher@example.com',instructor=email==='teacher@example.com')=>(await q('select archery_api($1,$2,$3,$4,$5) data',[email,'sub-'+email,instructor,action,{classId:cid,...body}]))[0].data
  const initial=await api('list'),today=initial.today
  const email=id=>'student'+ids.indexOf(id)+'@example.com'
  const open=async(title='Class event')=>{const body={id:crypto.randomUUID(),title,game:'Tic tac toe',date:today,instructions:'Best of three. Report the match winner.'};return {body,t:(await api('tournament_open',body)).tournament}}
  await assert.rejects(api('tournament_open',{id:crypto.randomUUID(),title:'Fake',game:'Game',date:today},email(ids[0])),/Instructor/)
  await assert.rejects(api('tournament_create',{id:crypto.randomUUID(),title:'Old draw',game:'Game',participants:ids.slice(0,2)}),/registration|signups/)
  await assert.rejects(api('tournament_open',{id:crypto.randomUUID(),title:'Future',game:'Game',date:'2100-01-01'}),/today/)
  const {body,t}=await open()
  assert.equal(t.status,'registration');assert.equal(t.event_date,today);assert.equal(t.bracket_size,null);assert.equal(t.participants.length,0)
  assert.ok(Math.abs((Date.parse(t.registration_ends_at)-Date.parse(t.created_at))/1000-300)<2)
  assert.equal((await api('tournament_open',body)).tournament.id,t.id,'retry does not reopen or extend the window')
  assert.equal((await api('list')).matches.length,0,'no pairings before registration closes')
  await api('tournament_join',{id:t.id,enrollmentId:ids[3]},email(ids[0]))
  await api('tournament_join',{id:t.id},email(ids[0]))
  assert.deepEqual((await api('list')).tournaments[0].participants,[ids[0]],'join uses the caller, not a supplied enrollment')
  await api('tournament_leave',{id:t.id},email(ids[0]));assert.equal((await api('list')).tournaments[0].participants.length,0)
  for(let i=0;i<11;i++)await api('tournament_join',{id:t.id},email(ids[i]))
  await assert.rejects(api('tournament_close',{id:t.id},email(ids[0])),/Instructor/)
  const closed=(await api('tournament_close',{id:t.id})).tournament
  assert.equal(closed.status,'active');assert.equal(closed.participants.length,11);assert.equal(closed.bracket_size,16)
  let data=await api('list'),matches=data.matches.filter(m=>m.tournament_id===t.id)
  assert.equal(matches.filter(m=>m.bye).length,5)
  const original=matches.map(m=>[m.id,m.a,m.b])
  await api('tournament_close',{id:t.id})
  assert.deepEqual((await api('list')).matches.filter(m=>m.tournament_id===t.id).map(m=>[m.id,m.a,m.b]),original,'close retries retain the draw')
  await assert.rejects(api('tournament_join',{id:t.id},email(ids[11])),/closed/)
  await assert.rejects(api('tournament_leave',{id:t.id},email(ids[0])),/closed/)
  let match=matches.find(m=>m.round===1&&!m.bye)
  await assert.rejects(api('match_result',{id:match.id,winnerId:match.a},email(ids[11])),/access denied/)
  await api('match_result',{id:match.id,winnerId:match.a,notes:'Two games to one'},email(match.a))
  data=await api('list',{},email(match.b));let proposed=data.matches.find(m=>m.id===match.id)
  assert.equal(proposed.winner_id,null);assert.equal(proposed.proposed_winner,match.a);assert.equal(proposed.reported_by,undefined)
  await assert.rejects(api('match_confirm',{id:match.id,accept:true},email(match.a)),/other player/)
  await api('match_confirm',{id:match.id,accept:false},email(match.b))
  assert.equal((await api('list')).matches.find(m=>m.id===match.id).proposed_winner,null)
  await api('match_result',{id:match.id,winnerId:match.a},email(match.a))
  await api('match_confirm',{id:match.id,accept:true},email(match.b))
  assert.equal((await api('list')).matches.find(m=>m.id===match.id).winner_id,match.a)
  await assert.rejects(api('match_result',{id:match.id,winnerId:match.b},email(match.b)),/completed/)
  for(let r=1;r<=4;r++){
   matches=(await api('list')).matches.filter(m=>m.tournament_id===t.id&&m.round===r&&!m.winner_id)
   for(const m of matches){assert.ok(m.a&&m.b);await api('match_result',{id:m.id,winnerId:m.a},email(m.a));await api('match_confirm',{id:m.id,accept:true},email(m.b))}
  }
  const complete=(await api('list')).tournaments.find(x=>x.id===t.id)
  assert.equal(complete.status,'completed');assert.ok(complete.winner_id)
  assert.equal((await api('list')).matches.filter(m=>m.tournament_id===t.id&&!m.bye&&m.winner_id).length,10)
  const zero=(await open('No entrants')).t
  const zeroClosed=(await api('tournament_close',{id:zero.id})).tournament
  assert.equal(zeroClosed.status,'registration_closed');assert.equal(zeroClosed.winner_id,null);assert.equal(zeroClosed.bracket_size,null)
  const one=(await open('One entrant')).t;await api('tournament_join',{id:one.id},email(ids[0]));await api('tournament_close',{id:one.id})
  assert.equal((await api('list')).matches.filter(m=>m.tournament_id===one.id).length,0)
  const expires=(await open('Deadline')).t
  await q("update archery_tournaments set registration_ends_at=clock_timestamp()-interval '1 second' where id=$1",[expires.id])
  await assert.rejects(api('tournament_join',{id:expires.id},email(ids[0])),/closed/)
  assert.equal((await api('list')).tournaments.find(x=>x.id===expires.id).status,'registration_closed')
  const removed=(await open('Enrollment change')).t
  for(let i=0;i<3;i++)await api('tournament_join',{id:removed.id},email(ids[i]))
  await q('update attendance_enrollments set removed_at=clock_timestamp() where id=$1',[ids[2]])
  assert.equal((await api('tournament_close',{id:removed.id})).tournament.participants.length,2)
  await assert.rejects(api('tournament_join',{id:removed.id},email(ids[2])),/access denied/)
  const remainingMatch=(await api('list')).matches.find(m=>m.tournament_id===removed.id)
  await api('match_result',{id:remainingMatch.id,winnerId:remainingMatch.a,notes:'Instructor resolved'})
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(api('list'),/permission denied/);await assert.rejects(q('select archery_private.lock_draw($1)',[t.id]),/permission denied/);await db.exec('reset role')}
  await db.exec('set role service_role');assert.equal((await api('list',{},email(ids[0]))).me,ids[0]);await db.exec('reset role')
 }finally{await db.close()}
})


test('self-registration draw supports every class size from 2 through 64',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
  for(const f of ['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
  const cid='00000000-0000-0000-0000-000000000001'
  for(let i=13;i<=64;i++)await db.query('insert into attendance_enrollments(id,class_id,name,email) values($1,$2,$3,$4)',['00000000-0000-0000-0000-'+String(i).padStart(12,'0'),cid,'Student '+i,'student'+i+'@example.com'])
  const api=async(action,body={},i=0)=>(await db.query('select archery_api($1,$2,$3,$4,$5) data',[i?'student'+i+'@example.com':'teacher@example.com',i?'demo-student'+i:'demo-teacher',!i,action,{classId:cid,...body}])).rows[0].data
  const today=(await api('list')).today
  for(let n=2;n<=64;n++){
   const id=crypto.randomUUID()
   await api('tournament_open',{id,title:'Class size '+n,game:'Winner only',date:today})
   for(let i=1;i<=n;i++)await api('tournament_join',{id},i)
   const t=(await api('tournament_close',{id})).tournament
   const size=2**Math.ceil(Math.log2(n))
   assert.equal(t.bracket_size,size)
   let matches=(await api('list')).matches.filter(m=>m.tournament_id===id)
   const first=matches.filter(m=>m.round===1)
   assert.equal(first.filter(m=>m.bye).length,size-n)
   assert.equal(new Set(first.flatMap(m=>[m.a,m.b]).filter(Boolean)).size,n)
   assert.ok(first.every(m=>m.a||m.b),'no empty match receives two byes')
   for(let round=1;round<=Math.log2(size);round++){
    matches=(await api('list')).matches.filter(m=>m.tournament_id===id&&m.round===round&&!m.winner_id)
    for(const m of matches){assert.ok(m.a&&m.b);await api('match_result',{id:m.id,winnerId:m.a})}
   }
   const done=await api('list')
   assert.equal(done.tournaments.find(t=>t.id===id).status,'completed')
   assert.equal(done.matches.filter(m=>m.tournament_id===id&&!m.bye&&m.winner_id).length,n-1)
  }
  const id=crypto.randomUUID()
  await api('tournament_open',{id,title:'Join close boundary',game:'Game',date:today})
  await api('tournament_join',{id},1);await api('tournament_join',{id},2)
  const results=await Promise.allSettled([api('tournament_join',{id},3),api('tournament_close',{id}),api('tournament_join',{id},4)])
  const t=(await api('list')).tournaments.find(t=>t.id===id)
  assert.equal(t.status,'active')
  assert.equal(t.participants.includes('00000000-0000-0000-0000-000000000003'),results[0].status==='fulfilled')
  assert.equal(t.participants.includes('00000000-0000-0000-0000-000000000004'),results[2].status==='fulfilled')
 }finally{await db.close()}
})
