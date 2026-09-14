import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('calendar privacy, immutable timestamps, schedule exceptions and reviewed requests', async () => {
 const db = new PGlite()
 try {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(await readFile('supabase/migrations/20260912163507_attendance_private.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/20260913193819_attendance_roster_identity_fields.sql','utf8'))
  await db.exec(await readFile('supabase/attendance-summary.sql','utf8'))
  const c=(await db.query("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,days) values('teacher@example.com','Test','Fall',2026,current_date-30,current_date+30,'09:00','10:00',array[1]) returning id")).rows[0].id
  const e=(await db.query("insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Student','student@example.com',current_date-30) returning id",[c])).rows[0].id
  const m=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date,status) values($1,'teacher@example.com',current_date-1,'closed') returning id",[c])).rows[0].id
  await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'Student')",[m,e])
  await db.query("insert into attendance_records(meeting_id,enrollment_id,status,source,updated_at) values($1,$2,'present','check_in','2026-09-01T12:00:00Z')",[m,e])
  await db.exec(await readFile('supabase/migrations/20260913223327_attendance_calendar.sql','utf8'))
  const call=async(resource,action,body={},actor='teacher@example.com')=>(await db.query('select attendance_calendar_api($1,$2,$3,$4,$5,$6) as data',[actor,'sub',actor==='teacher@example.com',resource,action,{classId:c,...body}])).rows[0].data
  assert.ok((await db.query("select column_name from information_schema.columns where table_name='attendance_records' and column_name='checked_in_at'")).rows.length)
  await assert.rejects(call('calendar','list',{},'stranger@example.com'),/access denied/)
  let cal=await call('calendar','list',{},'student@example.com')
  assert.equal(cal.meetings.length,1)
  assert.equal(cal.meetings[0].record.checked_in_at,'2026-09-01T12:00:00+00:00')
  assert.ok(!JSON.stringify(cal).includes('token'))
  await db.query("update attendance_records set checked_in_at=now(),status='absent',source='manual',revision=revision+1 where meeting_id=$1",[m])
  assert.equal((await call('calendar','list',{},'student@example.com')).meetings[0].record.checked_in_at,cal.meetings[0].record.checked_in_at)
  const totals=async()=>(await db.query("select attendance_class_summary('teacher@example.com',$1) as data",[c])).rows[0].data.students[0]
  assert.equal((await totals()).absent,1)
  const req=(await call('requests','create',{meetingId:m,enrollmentId:e,requested_status:'present',explanation:'I attended'},'student@example.com')).request
  assert.equal((await totals()).absent,1)
  await assert.rejects(call('requests','create',{meetingId:m,enrollmentId:e,requested_status:'present',explanation:'Again'},'student@example.com'),/pending/)
  assert.equal((await call('requests','review',{requestId:req.id,decision:'approved',response:'Confirmed',expectedRevision:1})).code,'conflict')
  assert.equal((await call('requests','review',{requestId:req.id,decision:'approved',response:'Confirmed',expectedRevision:2})).request.status,'approved')
  assert.equal((await totals()).present,1)
  assert.equal((await totals()).absent,0)
  await call('requests','review',{requestId:req.id,decision:'approved',response:'Confirmed',expectedRevision:2})
  assert.equal((await db.query('select * from attendance_corrections')).rows.length,1)
  const date=cal.meetings[0].meeting_date
  await call('schedule','exclude',{date,kind:'holiday',reason:'Break'})
  assert.equal((await call('calendar','list',{},'student@example.com')).meetings[0].status,'cancelled')
  await assert.rejects(db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date) values($1,'teacher@example.com',$2)",[c,date]),/excluded/)
  await call('schedule','restore',{date})
  assert.equal((await call('calendar','list',{},'student@example.com')).meetings[0].status,'closed')
  assert.equal((await db.query('select * from attendance_records')).rows.length,1)
  const s=await call('schedule','list')
  await db.query('update attendance_classes set days=array[2] where id=$1',[c])
  assert.equal((await call('schedule','save',{start_date:s.class.start_date,end_date:s.class.end_date,days:[3],expectedRevision:s.class.schedule_revision})).code,'conflict')
  const expired=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date,expires_at) values($1,'teacher@example.com',current_date,now()-interval '1 minute') returning id",[c])).rows[0].id
  await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'Student')",[expired,e])
  cal=await call('calendar','list',{},'student@example.com')
  assert.equal(cal.meetings.find(x=>x.id===expired).record.status,'absent')
  const pending=(await call('requests','create',{meetingId:expired,enrollmentId:e,requested_status:'present',explanation:'Review please'},'student@example.com')).request
  assert.equal((await call('calendar','list')).requests.length,0,'calendar never exposes another student request')
  await db.query('update attendance_records set revision=revision+1 where meeting_id=$1',[expired])
  assert.equal((await call('requests','review',{requestId:pending.id,decision:'approved',response:'',expectedRevision:1})).code,'conflict')
  assert.equal((await call('requests','review',{requestId:pending.id,decision:'kept',response:'Current record reviewed',expectedRevision:2})).request.status,'kept')
  assert.equal((await db.query('select status from attendance_records where meeting_id=$1',[expired])).rows[0].status,'absent')
  const updated=(await call('requests','create',{meetingId:expired,enrollmentId:e,requested_status:'present',explanation:'New evidence'},'student@example.com')).request
  await db.query('update attendance_records set revision=revision+1 where meeting_id=$1',[expired])
  assert.equal((await call('requests','review',{requestId:updated.id,decision:'approved',response:'Reviewed latest value',expectedRevision:3})).request.status,'approved')
  await assert.rejects(db.query("update attendance_change_requests set response='Altered' where id=$1",[pending.id]),/immutable/)
  await assert.rejects(db.query('delete from attendance_change_requests where id=$1',[pending.id]),/immutable/)
  const missing=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date,status) values($1,'teacher@example.com',$2,'closed') returning id",[c,date])).rows[0].id
  await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'Student')",[missing,e])
  await call('schedule','exclude',{date,kind:'cancelled'})
  await call('schedule','restore',{date})
  assert.equal((await call('calendar','list',{},'student@example.com')).meetings.find(x=>x.id===missing).record,null)
  await db.exec('set role anon')
  await assert.rejects(db.query("select attendance_calendar_api('student@example.com','sub',false,'calendar','list','{}')"),/permission denied/)
  await assert.rejects(db.query('select * from attendance_change_requests'),/permission denied/)
  await db.exec('reset role')
  const latest=await call('schedule','list')
  await assert.rejects(call('schedule','save',{start_date:'2026-01-01',end_date:'2028-01-02',days:[1],expectedRevision:latest.class.schedule_revision,confirmShorten:true}),/two years/)
  await assert.rejects(call('schedule','save',{start_date:latest.class.start_date,end_date:latest.class.end_date,days:[1,1],expectedRevision:latest.class.schedule_revision}),/unique weekdays/)
  await assert.rejects(call('schedule','save',{start_date:latest.class.start_date,end_date:date,days:[1],expectedRevision:latest.class.schedule_revision}),/Confirm shortening/)
  const saved=await call('schedule','save',{start_date:latest.class.start_date,end_date:date,days:[1,3],expectedRevision:latest.class.schedule_revision,confirmShorten:true})
  assert.equal(saved.class.end_date,date)
  assert.equal(saved.class.schedule_revision,latest.class.schedule_revision+1)
  assert.equal((await totals()).present,2,'shortening the schedule preserves completed historical attendance totals')
  await assert.rejects(call('schedule','list',{},'student@example.com'),/Instructor access/)
  await db.query("update attendance_enrollments set google_sub='linked-sub',effective_to=current_date-1 where id=$1",[e])
  await assert.rejects(call('calendar','list',{},'student@example.com'),/access denied/)
  const past=(await db.query("select attendance_calendar_api('student@example.com','linked-sub',false,'calendar','list',$1) as data",[{classId:c}])).rows[0].data
  assert.equal(past.enrollments.length,1,'past enrollment remains authorized with the correct Google identity')
 } finally { await db.close() }
})

test('only uncorrected first check-ins backfill and new check-in time uses the server clock',async()=>{
 const db=new PGlite()
 try {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(await readFile('supabase/migrations/20260912163507_attendance_private.sql','utf8'))
  const c=(await db.query("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time) values('t@example.com','Test','Fall',2026,current_date-30,current_date+30,'09:00','10:00') returning id")).rows[0].id
  const m=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date,status) values($1,'t@example.com',current_date,'closed') returning id",[c])).rows[0].id
  const ids=[]
  for(const [source,revision,audited] of [['check_in',1,false],['check_in',2,false],['check_in',1,true],['manual',1,false]]){
   const e=(await db.query("insert into attendance_enrollments(class_id,name,effective_from) values($1,'Student',current_date-30) returning id",[c])).rows[0].id
   ids.push(e)
   await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'Student')",[m,e])
   await db.query("insert into attendance_records(meeting_id,enrollment_id,status,source,revision,updated_at) values($1,$2,'present',$3,$4,'2026-09-01T12:00:00Z')",[m,e,source,revision])
   if(audited) await db.query("insert into attendance_corrections(meeting_id,enrollment_id,new_status,actor_email,operation_id,request_payload) values($1,$2,'present','t@example.com',gen_random_uuid(),'{}')",[m,e])
  }
  await db.exec(await readFile('supabase/migrations/20260913223327_attendance_calendar.sql','utf8'))
  for(let i=0;i<ids.length;i++){
   const row=(await db.query('select checked_in_at from attendance_records where meeting_id=$1 and enrollment_id=$2',[m,ids[i]])).rows[0]
   assert.equal(row.checked_in_at!==null,i===0)
  }
  const e=(await db.query("insert into attendance_enrollments(class_id,name,effective_from) values($1,'New student',current_date) returning id",[c])).rows[0].id
  await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'New student')",[m,e])
  const row=(await db.query("insert into attendance_records(meeting_id,enrollment_id,status,source,checked_in_at) values($1,$2,'present','check_in','2000-01-01') returning abs(extract(epoch from checked_in_at-clock_timestamp()))<2 as fresh",[m,e])).rows[0]
  assert.equal(row.fresh,true)
 } finally {await db.close()}
})

test('calendar HTTP entrypoints use trusted identity, origin, action and UUID validation', async()=>{
 const source=await readFile('src/lib/attendance/calendar-server.ts','utf8').catch(()=> '')
 assert.match(source,/attendanceIdentity\(\)/)
 assert.match(source,/headers\.get\('origin'\)/)
 assert.match(source,/attendance_calendar_api/)
 assert.match(source,/UUID/)
 for(const resource of ['calendar','schedule','requests']) {
  const route=await readFile(`src/app/api/attendance/${resource}/route.ts`,'utf8')
  assert.ok(route.includes(`'${resource}'`))
 }
 const legacy=await readFile('src/lib/attendance/server.ts','utf8')
 assert.match(legacy,/resource === 'classes' && action === 'update'/)
 assert.match(legacy,/\['start_date', 'end_date', 'days'\]\.some/)
 assert.match(legacy,/throw new AttendanceError\('Use the schedule editor/)
})
