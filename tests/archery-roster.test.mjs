import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('classmate wheel roster includes every active student in this semester class and excludes other rosters',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;')
  for(const name of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'))
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows
  const createClass=async(term,offset,owner='teacher@example.com',tool='archery')=>(await q("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values($1,'Archery',$2,2026,current_date+$3::int,current_date+$3::int+60,'10:00','11:00',$4) returning id",[owner,term,offset,tool]))[0].id
  const cid=await createClass('Fall',-20),past=await createClass('Spring',-240),other=await createClass('Fall',-20,'other@example.com'),weights=await createClass('Fall',-20,'teacher@example.com','weight_training')
  const add=async(classId,name,email)=>(await q('insert into attendance_enrollments(class_id,name,email,effective_from) values($1,$2,$3,current_date-20) returning id',[classId,name,email]))[0].id
  const ids=[];for(let i=0;i<70;i++)ids.push(await add(cid,'Classmate '+String(i).padStart(2,'0'),'student'+i+'@example.com'))
  const previous=await add(past,'Previous semester student','prior@example.com'),foreign=await add(other,'Other class student','other-student@example.com'),weight=await add(weights,'Weight training student','weights@example.com')
  const removed=await add(cid,'Removed student','removed@example.com'),dropped=await add(cid,'Dropped student','dropped@example.com'),future=await add(cid,'Future student','future@example.com')
  await q('update attendance_enrollments set removed_at=clock_timestamp() where id=$1',[removed])
  await q('update attendance_enrollments set effective_to=current_date-7 where id=$1',[dropped])
  await q('update attendance_enrollments set effective_from=current_date+7 where id=$1',[future])
  const api=async(action,body={},email='student0@example.com')=>(await q('select archery_api($1,$2,$3,$4,$5) data',[email,'test-'+email,email==='teacher@example.com',action,{classId:cid,...body}]))[0].data
  const roster=(await api('list')).roster
  assert.equal(roster.length,70,'every eligible student is included, even above the tournament participant limit')
  assert.deepEqual(new Set(roster.map(p=>p.id)),new Set(ids))
  assert.ok(roster.every(p=>Object.keys(p).sort().join(',')==='id,name'),'no peer emails or account identifiers')
  assert.equal((await api('list',{},'teacher@example.com')).roster.length,70)
  for(const opponentId of [previous,foreign,weight,removed,dropped,future,ids[0]])await assert.rejects(api('challenge_create',{id:crypto.randomUUID(),opponentId,game:'Game'}),/classmate/)
  await api('challenge_create',{id:crypto.randomUUID(),opponentId:ids[69],game:'Game'})
  await q('update attendance_enrollments set name=$2 where id=$1',[ids[69],'Updated classmate name'])
  assert.equal((await api('list')).roster.find(p=>p.id===ids[69]).name,'Updated classmate name')
 }finally{await db.close()}
})
