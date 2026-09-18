import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('merge duplicates, reopen one daily session, retain presence and timestamps, protect manual corrections', async()=>{
 const db=new PGlite();
 try {
 await db.exec('create role anon; create role authenticated; create role service_role;');
 for(const f of ['20260912163507_attendance_private.sql','20260912210000_attendance_email_code_auth.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'));
 await db.exec(await readFile('tests/fixtures/attendance-live-functions.sql','utf8'));
 const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const api=async(resource,action,body={},email='teacher@example.com',instructor=true)=>(await query('select attendance_api($1,$2,$3,$4,$5,$6) data',[email,'google-'+email,instructor,resource,action,JSON.stringify(body)]))[0].data;
 const {class:c}=await api('classes','create',{name:'Test class',college:'Test college',term:'Fall',year:2026,start_date:'2020-01-01',end_date:'2030-01-01',timezone:'America/Los_Angeles',days:[1,3],start_time:'10:00',end_time:'11:00'});
 const {enrollments}=await api('enrollments','import',{classId:c.id,rows:['early','late','manual','absent'].map(name=>({name,email:name+'@example.com',effective_from:'2020-01-01'}))});
 const eid=name=>enrollments.find(e=>e.name===name).id;
 const a=(await api('meetings','open',{classId:c.id})).meeting;
 const token=(await api('meetings','token',{classId:c.id,meetingId:a.id})).token;
 await api('check-in','check_in',{token},'early@example.com',false);
 await api('meetings','close',{meetingId:a.id});
 const b=(await api('meetings','open',{classId:c.id})).meeting;
 await api('check-in','check_in',{token:(await api('meetings','token',{meetingId:b.id})).token},'late@example.com',false);
 await api('meetings','close',{meetingId:b.id});
 const original=(await query('select checked_in_at from attendance_records where meeting_id=$1 and enrollment_id=$2',[a.id,eid('early')]))[0].checked_in_at;
 const migration=await readFile('supabase/migrations/20260918010000_attendance_single_daily_roll_call.sql','utf8');
 await query("update attendance_records set source='manual' where meeting_id=$1 and enrollment_id=$2",[a.id,eid('late')]);
 await assert.rejects(db.exec('begin;'+migration+'commit;'),/conflicting manual corrections/);
 await db.exec('rollback');
 await query("update attendance_records set source='finalized' where meeting_id=$1 and enrollment_id=$2",[a.id,eid('late')]);
 await db.exec('begin;'+migration+'commit;');
 assert.equal((await query("select count(*)::int n from attendance_meetings where status<>'cancelled'"))[0].n,1);
 assert.equal((await query('select count(*)::int n from attendance_roll_call_merge_audit'))[0].n,1);
 assert.equal((await query('select merged_into from attendance_meetings where id=$1',[b.id]))[0].merged_into,a.id);
 for(const name of ['early','late']) assert.equal((await query('select status from attendance_records where meeting_id=$1 and enrollment_id=$2',[a.id,eid(name)]))[0].status,'present');
 const summary=(await query('select attendance_class_summary($1,$2) data',['teacher@example.com',c.id]))[0].data;
 assert.equal(summary.students.find(s=>s.id===eid('early')).present,1);
 assert.equal(summary.students.find(s=>s.id===eid('early')).absent,0);
 const calendar=async()=>(await query('select attendance_calendar_api($1,$2,false,$3,$4,$5) data',['early@example.com','google-early@example.com','calendar','list',JSON.stringify({classId:c.id})]))[0].data;
 assert.equal((await calendar()).meetings.length,1);
 assert.equal((await api('history','list',{},'early@example.com',false)).records.length,1);
 await assert.rejects(api('meetings','extend',{meetingId:b.id}),/combined/);
 const reopened=(await api('meetings','open',{classId:c.id})).meeting;
 assert.equal(reopened.id,a.id);assert.equal(reopened.reopen_count,1);
 assert.equal((await api('meetings','open',{classId:c.id})).meeting.reopen_count,1);
 assert.equal((await query('select attendance_class_summary($1,$2) data',['teacher@example.com',c.id]))[0].data.students.find(s=>s.id===eid('early')).present,1);
 const newToken=(await api('meetings','token',{meetingId:a.id})).token;
 assert.ok((await api('check-in','check_in',{token},'early@example.com',false)).error);
 const rec=(await query('select * from attendance_records where meeting_id=$1 and enrollment_id=$2',[a.id,eid('manual')]))[0];
 await api('corrections','save',{meetingId:a.id,enrollmentId:eid('manual'),status:'absent',expectedRevision:rec.revision,operationId:crypto.randomUUID()});
 assert.match((await api('check-in','check_in',{token:newToken},'manual@example.com',false)).error,/instructor/);
 const checked=await api('check-in','check_in',{token:newToken},'absent@example.com',false);
 assert.equal(checked.record.status,'present');assert.ok(checked.record.checked_in_at);
 const retry=await api('check-in','check_in',{token:newToken},'absent@example.com',false);
 assert.equal(retry.record.checked_in_at,checked.record.checked_in_at);assert.equal(retry.record.revision,checked.record.revision);
 assert.equal(new Date((await query('select checked_in_at from attendance_records where meeting_id=$1 and enrollment_id=$2',[a.id,eid('early')]))[0].checked_in_at).getTime(),new Date(original).getTime());
 await assert.rejects(api('meetings','open',{classId:c.id},'stranger@example.com',true),/access denied/);
 await assert.rejects(query('insert into attendance_meetings(class_id,instructor_email,meeting_date,status) select class_id,instructor_email,meeting_date,\'closed\' from attendance_meetings where id=$1',[a.id]),/duplicate key/);
 await api('meetings','close',{meetingId:a.id});
 assert.ok((await api('check-in','check_in',{token:newToken},'early@example.com',false)).error);
 assert.equal((await api('meetings','open',{classId:c.id})).meeting.id,a.id);
 }finally{await db.close()}
});
