import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('exact target marks survive saving, retries, legacy history upgrades and role boundaries',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
  for(const f of ['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
  const classId='00000000-0000-0000-0000-000000000001'
  const api=async(action,body={},email='student1@example.com')=>(await db.query('select archery_api($1,$2,$3,$4,$5) data',[email,'demo-'+email,email==='teacher@example.com',action,{classId,...body}])).rows[0].data
  const today=(await api('list')).today
  const old={id:crypto.randomUUID(),date:today,distance:30,unit:'m',scores:[10,0,5]}
  await api('round_save',old)
  await db.exec(await readFile('supabase/migrations/20261019013958_archery_score_wheel.sql','utf8'))
  assert.deepEqual((await api('list')).rounds[0].score_marks,['10','M','5'])
  const body={id:crypto.randomUUID(),date:today,distance:30,unit:'m',scores:[10,10,9,0,1],marks:['X','10','9','M','1']}
  const saved=(await api('round_save',body)).round
  assert.deepEqual(saved.score_marks,body.marks);assert.equal(saved.total,30)
  assert.equal((await api('round_save',body)).duplicate,true)
  await assert.rejects(api('round_save',{...body,marks:['10','10','9','M','1']}),/already saved/)
  for(const change of [{scores:[9,10,9,0,1]},{marks:['x','10','9','M','1']},{marks:['X']},{marks:[null,'10','9','M','1']},{marks:['X','10','9','0','1']}])await assert.rejects(api('round_save',{...body,id:crypto.randomUUID(),...change}),/mark|score/i)
  assert.equal((await api('list',{},'student2@example.com')).rounds.length,0)
  assert.deepEqual((await api('list',{},'teacher@example.com')).rounds.find(r=>r.id===body.id).score_marks,body.marks)
  const legacy=(await api('round_save',{...old,id:crypto.randomUUID()})).round
  assert.deepEqual(legacy.score_marks,['10','M','5'],'old numeric clients still work')
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(api('list'),/permission denied/)
   await assert.rejects(db.query('select * from archery_rounds'),/permission denied/);await db.exec('reset role')
  }
  await db.exec('grant select,update on attendance_classes,attendance_enrollments to service_role;set role service_role')
  const extra=(await api('round_save',{...body,id:crypto.randomUUID()})).round
  assert.deepEqual(extra.score_marks,body.marks)
  await assert.rejects(db.query('update archery_rounds set total=0 where id=$1',[body.id]),/permission denied/)
  await db.exec('reset role')
 }finally{await db.close()}
})

test('date summaries fetch every own round beyond the recent-history cap and preserve privacy',async()=>{
 const db=new PGlite()
 try{
  await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'))
  for(const f of ['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql'])await db.exec(await readFile('supabase/migrations/'+f,'utf8'))
  const classId='00000000-0000-0000-0000-000000000001'
  const api=async(body={},email='student1@example.com')=>(await db.query('select archery_api($1,$2,$3,$4,$5) data',[email,'demo-'+email,email==='teacher@example.com','list',{classId,...body}])).rows[0].data
  const today=(await api()).today,yesterday=new Date(today+'T12:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1)
  const past=yesterday.toISOString().slice(0,10)
  for(const [date,n,student] of [[today,501,1],[past,601,1],[past,3,2]])await db.query("insert into archery_rounds(id,class_id,enrollment_id,entry_date,distance,unit,scores,total) select gen_random_uuid(),$1,$2,$3,30,'m',array[10],10 from generate_series(1,$4)",[classId,'00000000-0000-0000-0000-'+String(student).padStart(12,'0'),date,n])
  const legacy=await api();assert.equal(legacy.rounds.length,500);assert.ok(legacy.rounds.every(r=>r.entry_date===today))
  await db.exec(await readFile('supabase/migrations/20261019013958_archery_score_wheel.sql','utf8'))
  const own=await api({date:past});assert.equal(own.dayRounds.length,601);assert.equal(own.roundDate,past);assert.equal(own.roundDays[past],601)
  assert.equal((await api({date:past},'student2@example.com')).dayRounds.length,3)
  assert.equal((await api({date:past},'teacher@example.com')).dayRounds.length,604)
  assert.equal((await api({date:today})).dayRounds.length,501)
 }finally{await db.close()}
})
