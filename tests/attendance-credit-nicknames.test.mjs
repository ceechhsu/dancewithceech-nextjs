import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('transition credit excludes holidays and cutoff; nicknames are private instructor edits',async()=>{
 const db=new PGlite();
 try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  for(const f of ['20260912163507_attendance_private.sql','20260912210000_attendance_email_code_auth.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
  await db.exec(await readFile('tests/fixtures/attendance-live-functions.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20260918010000_attendance_single_daily_roll_call.sql','utf8'));
  const migration=await readFile('supabase/migrations/20260918020000_attendance_credit_nicknames.sql','utf8').catch(()=> '');
  if(migration)await db.exec(migration);
  assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_name='attendance_enrollments' and column_name='nickname'")).rows[0].n,1,'nickname feature must exist');
  const q=async(s,a=[])=>(await db.query(s,a)).rows;
  const c=(await q("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,days,start_time,end_time,credit_before) values('teacher@example.com','Test','Fall',2026,'2026-08-31','2026-12-09',array[1,3],'10:00','11:00','2026-09-14') returning id"))[0].id;
  await q("insert into attendance_schedule_exceptions values($1,'2026-09-07','holiday','Labor Day')",[c]);
  const e=(await q("insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Student','student@example.com','2026-09-17') returning id",[c]))[0].id;
  const records=await q('select m.meeting_date,r.* from attendance_records r join attendance_meetings m on m.id=r.meeting_id where enrollment_id=$1 order by meeting_date',[e]);
  assert.equal(records.length,3);assert.ok(records.every(r=>r.status==='present'&&r.source==='instructor_credit'&&r.checked_in_at===null));
  assert.equal((await q("select count(*)::int n from attendance_meetings where meeting_date>='2026-09-14' or meeting_date='2026-09-07'"))[0].n,0);
  await q('select attendance_grant_transition_credit($1)',[e]);
  assert.equal((await q('select count(*)::int n from attendance_records'))[0].n,3);
  const later=(await q("insert into attendance_meetings(class_id,instructor_email,meeting_date,status) values($1,'teacher@example.com','2026-09-14','closed') returning id",[c]))[0].id;
  await q("insert into attendance_roster(meeting_id,enrollment_id,name,email) values($1,$2,'Student','student@example.com')",[later,e]);
  await q("insert into attendance_records(meeting_id,enrollment_id,status,source) values($1,$2,'absent','finalized')",[later,e]);
  const before=await q('select * from attendance_records where meeting_id=$1',[later]);
  await q('select attendance_grant_transition_credit($1)',[e]);
  assert.deepEqual(await q('select * from attendance_records where meeting_id=$1',[later]),before,'September 14 onwards unchanged');
  await assert.rejects(q("select attendance_set_nickname('stranger@example.com',$1,$2,'Nicky')",[c,e]),/access denied/);
  await q("select attendance_set_nickname('teacher@example.com',$1,$2,'  Nicky  ')",[c,e]);
  const student=(await q("select attendance_class_summary('teacher@example.com',$1) data",[c]))[0].data.students[0];
  assert.equal(student.nickname,'Nicky');assert.equal(student.present,3);assert.equal(student.name,'Student');
  await assert.rejects(q("select attendance_set_nickname('teacher@example.com',$1,$2,$3)",[c,e,'a'.repeat(81)]),/80/);
  const removal=await readFile('supabase/migrations/20260918030000_attendance_roster_removal.sql','utf8').catch(()=> '');
  if(removal)await db.exec(removal);
  assert.equal((await q("select count(*)::int n from information_schema.columns where table_name='attendance_enrollments' and column_name='removed_at'"))[0].n,1,'safe removal must exist');
  await assert.rejects(q("select attendance_remove_student('teacher@example.com',$1,$2,'yes')",[c,e]),/type delete/);
  await assert.rejects(q("select attendance_remove_student('stranger@example.com',$1,$2,'delete')",[c,e]),/access denied/);
  const saved=await q('select * from attendance_records order by meeting_id,enrollment_id');
  for (const field of ['first_name','last_name','photo_url']) {
    await q(`update attendance_enrollments set ${field}='provided' where id=$1`,[e]);
    await assert.rejects(q("select attendance_remove_student('teacher@example.com',$1,$2,'delete')",[c,e]),/profile information/);
    await q(`update attendance_enrollments set ${field}=null where id=$1`,[e]);
  }
  await q("select attendance_remove_student('teacher@example.com',$1,$2,'delete')",[c,e]);
  assert.deepEqual(await q('select * from attendance_records order by meeting_id,enrollment_id'),saved);
  assert.equal((await q("select attendance_class_summary('teacher@example.com',$1) data",[c]))[0].data.students.length,0);
  assert.equal((await q('select email from attendance_enrollments where id=$1',[e]))[0].email,'student@example.com');
  const open=(await q("insert into attendance_meetings(class_id,instructor_email,meeting_date,token,token_slot) values($1,'teacher@example.com',current_date,encode(sha256(convert_to('test-token','UTF8')),'hex'),extract(epoch from clock_timestamp())::bigint) returning id",[c]))[0].id;
  await q("insert into attendance_roster(meeting_id,enrollment_id,name,email) values($1,$2,'Student','student@example.com')",[open,e]);
  const denied=(await q("select attendance_api('student@example.com','google-student',false,'check-in','check_in','{\"token\":\"test-token\"}') data"))[0].data;
  assert.match(denied.error,/not actively enrolled/);
 }finally{await db.close()}
});
