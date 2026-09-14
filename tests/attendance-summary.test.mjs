import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('roster totals include only completed eligible sessions and enforce ownership', async () => {
 const db = new PGlite()
 try {
 // Fixture CURRENT_DATE must match the class's date, including after UTC midnight.
 await db.exec("set time zone 'America/Los_Angeles';")
 await db.exec('create role anon; create role authenticated; create role service_role;')
 await db.exec(await readFile('supabase/migrations/20260912163507_attendance_private.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20260913193819_attendance_roster_identity_fields.sql','utf8'))
 await db.exec(await readFile('supabase/attendance-summary.sql','utf8'))
 const c=(await db.query("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time) values('teacher@example.com','Test','Fall',2026,current_date-30,current_date+30,'09:00','10:00') returning id")).rows[0].id
 const e=(await db.query("insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Student','student@example.com',current_date-5) returning id",[c])).rows[0].id
 await db.query("insert into attendance_enrollments(class_id,name,effective_from) values($1,'New student',current_date)",[c])
 for (const [status,days,record] of [['closed',2,'present'],['closed',1,'absent'],['open',0,'present'],['cancelled',3,'absent'],['closed',10,'absent']]) {
  const m=(await db.query("insert into attendance_meetings(class_id,instructor_email,meeting_date,status) values($1,'teacher@example.com',current_date-$2::integer,$3) returning id",[c,days,status])).rows[0].id
  await db.query("insert into attendance_roster(meeting_id,enrollment_id,name) values($1,$2,'Student')",[m,e])
  await db.query("insert into attendance_records(meeting_id,enrollment_id,status,source) values($1,$2,$3,'manual')",[m,e,record])
 }
 const summary=async(actor)=> (await db.query('select attendance_class_summary($1,$2) as data',[actor,c])).rows[0].data
 await assert.rejects(summary('stranger@example.com'),/Instructor access required/)
 const result=await summary('teacher@example.com')
 assert.equal(result.students.length,2)
 assert.equal(result.students[0].first_name,null)
 assert.equal(result.students[0].last_name,null)
 assert.equal(result.students[0].photo_url,null)
 assert.deepEqual(result.students.map(s=>[s.name,s.present,s.absent]),[['New student',0,0],['Student',1,1]])
 await db.query('update attendance_enrollments set effective_to=current_date-1 where id=$1',[e])
 assert.equal((await summary('teacher@example.com')).students.length,1)
 } finally { await db.close() }
})
