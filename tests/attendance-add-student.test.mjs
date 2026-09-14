import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('add student validates ownership, deduplicates, and joins only a live roster without marking present', async () => {
 const db = new PGlite()
 try {
  await db.exec("set time zone 'America/Los_Angeles'; create role anon; create role authenticated; create role service_role;")
  for (const file of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260914005600_attendance_add_student.sql']) await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'))
  const c=(await db.query("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time) values('teacher@example.com','Cabrillo Hip Hop','Fall',2026,current_date-20,current_date+30,'09:40','11:00') returning id")).rows[0].id
  const m=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date) values($1,'teacher@example.com',current_date) returning id",[c])).rows[0].id
  const add=async(email, actor='teacher@example.com', instructor=true)=>(await db.query('select attendance_add_student($1,$2,$3,$4,$5,$6,$7) as data',[actor,'google-sub',instructor,c,email,'',''])).rows[0].data
  await assert.rejects(add('new@example.com','stranger@example.com'),/access/i)
  await assert.rejects(add('new@example.com','teacher@example.com',false),/access/i)
  await assert.rejects(add('invalid'),/email/i)
  const first=await add(' NEW@Example.com ')
  assert.equal(first.student.email,'new@example.com')
  assert.equal(first.student.name,'new@example.com')
  assert.equal(first.alreadyEnrolled,false)
  assert.equal((await add('new@example.com')).alreadyEnrolled,true)
  assert.equal((await db.query('select * from attendance_enrollments')).rows.length,1)
  assert.equal((await db.query('select * from attendance_roster where meeting_id=$1',[m])).rows.length,1)
  assert.equal((await db.query('select * from attendance_records')).rows.length,0)
  await db.query("update attendance_meetings set expires_at=clock_timestamp()-interval '1 minute' where id=$1",[m])
  await add('other@example.com')
  assert.equal((await db.query('select * from attendance_roster where meeting_id=$1',[m])).rows.length,1)
  assert.equal((await db.query("select has_function_privilege('anon','attendance_add_student(text,text,boolean,uuid,text,text,text)','execute') as allowed")).rows[0].allowed,false)
 } finally { await db.close() }
})

test('roster embeds the add student form and refreshes after saving', async()=>{
 const source=await readFile('src/components/attendance/ClassRosterSummary.tsx','utf8')
 assert.match(source,/<AddStudent/)
 assert.match(source,/onAdded=/)
})

test('quick add asks only for the Google email, not names', async()=>{
 const source=await readFile('src/components/attendance/AddStudent.tsx','utf8')
 assert.match(source,/name="email"/)
 assert.doesNotMatch(source,/name="(?:first_name|last_name)"/)
})

test('attendance supports a separate database without replacing public-site credentials',async()=>{
 for(const path of ['src/auth.ts','src/lib/attendance/server.ts']){
  const source=await readFile(path,'utf8')
  assert.match(source,/process.env.ATTENDANCE_SUPABASE_URL/)
  assert.match(source,/process.env.ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY/)
 }
})
