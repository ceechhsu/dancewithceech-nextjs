import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('release migrations apply to a data-free snapshot of the actual live attendance table structure',async()=>{
 // Schema/constraint metadata captured read-only on October 27, 2026.
 // This fixture contains no live student, class, attendance or account rows.
 const snapshot=JSON.parse(await readFile('tests/fixtures/attendance-archery-live-schema.json','utf8'))
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;')
  for(const row of [...snapshot.tables,...snapshot.constraints])await db.exec(row.ddl)
  await db.exec('grant select,insert,update on all tables in schema public to service_role')
  for(const file of ['20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql','20261027224308_archery_result_disputes.sql','20261028002402_archery_history_visibility.sql'])await db.transaction(async tx=>{await tx.exec(await readFile('supabase/migrations/'+file,'utf8'))})
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows
  const cid=(await q("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values('teacher@example.com','Schema test archery','Fall',2026,current_date-30,current_date+30,'10:00','12:00','archery') returning id"))[0].id
  const sid=(await q("insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Fictional Student','student@example.com',current_date-30) returning id",[cid]))[0].id
  const api=async(action,body={},teacher=false)=>(await q('select archery_api($1,$2,$3,$4,$5) data',[teacher?'teacher@example.com':'student@example.com',teacher?'teacher-sub':'student-sub',teacher,action,{classId:cid,...body}]))[0].data
  await db.exec('set role service_role')
  const today=(await api('list')).today
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:30,unit:'m',marks:['X','M']})
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:20,unit:'yd',marks:['9']},true)
  const student=await api('list',{date:today}),teacher=await api('list',{date:today},true)
  assert.equal(student.me,sid);assert.equal(student.dayRounds[0].total,10);assert.equal(student.personalRounds.length,0)
  assert.equal(teacher.personalDayRounds[0].total,9);assert.equal(teacher.dayRounds[0].total,10)
  assert.deepEqual(student.tournamentDays,{})
  const membership=(await q('select attendance_progress_api($1,$2,false,$3,$4) data',['student@example.com','student-sub','list',{}]))[0].data
  assert.equal(membership.classes[0].id,cid)
  await db.exec('reset role')
 }finally{await db.close()}
})
