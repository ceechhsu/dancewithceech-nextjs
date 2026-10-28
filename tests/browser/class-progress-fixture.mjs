// Disposable in-memory database with fictional people. No live project or credentials.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite()
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
for (const name of ['20260912163507_attendance_private.sql','20260912210000_attendance_email_code_auth.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql']) await db.exec(await readFile('supabase/migrations/' + name, 'utf8'))
await db.exec(await readFile('tests/fixtures/attendance-live-functions.sql', 'utf8'))
for (const name of ['20260918010000_attendance_single_daily_roll_call.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql','20261027164537_archery_tournament_formats.sql','20261027224308_archery_result_disputes.sql','20261028002402_archery_history_visibility.sql','20261028014318_archery_instructor_challenges.sql']) await db.exec(await readFile('supabase/migrations/' + name, 'utf8'))
for (const [i, name, tool] of [[1,'Archery','archery'],[2,'Weight training','weight_training'],[3,'Hip hop dance','none'],[4,'Other instructor’s class','archery']]) {
  const cid = `00000000-0000-0000-0000-00000000000${i}`
  await db.query(`insert into attendance_classes(id,instructor_email,name,college,term,year,start_date,end_date,timezone,days,start_time,end_time,progress_tool) values($1,$2,$3,'Example College','Fall',2026,current_date-30,current_date+90,'America/Los_Angeles',array[1,3],'10:00','11:30',$4)`, [cid,i===4?'other@example.com':'teacher@example.com',name,tool])
  for (const [j,email,first,last] of [[1,i===4?'other-student@example.com':'student@example.com','Alex','Sample'],[2,i===4?'other-second@example.com':'second@example.com','Jordan','Example']]) {
    await db.query(`insert into attendance_enrollments(id,class_id,name,first_name,last_name,email,effective_from) values($1,$2,$3,$4,$5,$6,current_date-30)`, [`00000000-0000-0000-0000-0000000000${i}${j}`,cid,first+' '+last,first,last,email])
  }
  await db.query(`insert into attendance_meetings(id,class_id,instructor_email,meeting_date,status) values($1,$2,$3,current_date-7,'closed')`, [`00000000-0000-0000-0000-0000000001${i}0`,cid,i===4?'other@example.com':'teacher@example.com'])
  await db.query(`insert into attendance_roster select $1,id,name,college_id,email from attendance_enrollments where class_id=$2`, [`00000000-0000-0000-0000-0000000001${i}0`,cid])
  await db.query(`insert into attendance_records(meeting_id,enrollment_id,status,source) select $1,id,case when email='student@example.com' then 'present' else 'absent' end,'finalized' from attendance_enrollments where class_id=$2`, [`00000000-0000-0000-0000-0000000001${i}0`,cid])
}
await db.query(`insert into attendance_enrollments(class_id,name,email,effective_from) values('00000000-0000-0000-0000-000000000003','Dance Student','dance@example.com',current_date-30)`)
const functions = {
  archery_api: ['p_actor','p_sub','p_instructor','p_action','p_body'],
  attendance_api: ['p_actor','p_sub','p_instructor','p_resource','p_action','p_body'],
  attendance_progress_api: ['p_actor','p_sub','p_instructor','p_action','p_body'],
  attendance_class_summary: ['p_actor','p_class_id'],
  attendance_calendar_api: ['p_actor','p_sub','p_instructor','p_resource','p_action','p_body'],
  attendance_set_nickname: ['p_actor','p_class_id','p_enrollment_id','p_nickname'],
  attendance_add_student: ['p_actor','p_sub','p_instructor','p_class_id','p_email','p_first','p_last'],
}
http.createServer(async (req,res) => {
  res.setHeader('content-type','application/json')
  const fn = req.url?.split('/').pop()
  if (req.method!=='POST' || !req.url.startsWith('/rest/v1/rpc/') || !functions[fn]) { res.writeHead(404); return res.end('{}') }
  try {
    let raw=''; for await (const chunk of req) { raw+=chunk; if(raw.length>500000) throw Error('Too large') }
    const body=JSON.parse(raw), keys=functions[fn]
    const {rows}=await db.query(`select ${fn}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) data`,keys.map(key=>body[key]))
    res.end(JSON.stringify(rows[0].data))
  } catch(error) { res.writeHead(400); res.end(JSON.stringify({code:error.code || 'P0001',message:error.message})) }
}).listen(55434,'127.0.0.1',()=>console.log('Class progress fictional fixture ready on 55434'))
