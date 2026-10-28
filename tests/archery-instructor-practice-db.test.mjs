import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'

test('instructor personally practices without enrollment; own rounds stay private, immutable and separate from student review',async()=>{
 const db=new PGlite()
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;')
  for(const name of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql','20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql'])await db.exec(await readFile('supabase/migrations/'+name,'utf8'))
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows
  const makeClass=async(owner)=>(await q("insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values($1,'Archery','Fall',2026,current_date-30,current_date+60,'10:00','11:00','archery') returning id",[owner]))[0].id
  const cid=await makeClass('teacher@example.com'),other=await makeClass('other@example.com')
  const sid=(await q("insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Alex Sample','student@example.com',current_date-30) returning id",[cid]))[0].id
  const api=async(action,body={},email='teacher@example.com',instructor=email==='teacher@example.com'||email==='other@example.com',sub='test-'+email)=>(await q('select archery_api($1,$2,$3,$4,$5) data',[email,sub,instructor,action,{classId:cid,...body}]))[0].data
  const today=(await api('list')).today
  await api('round_save',{id:crypto.randomUUID(),date:today,distance:10,unit:'m',scores:[3]},'student@example.com')
  const upgrade=await readFile('supabase/migrations/20261027153351_archery_instructor_practice.sql','utf8')
  await assert.rejects(db.transaction(async tx=>{await tx.exec(upgrade);await tx.exec('select nonexistent_upgrade_guard()')}))
  assert.equal((await q("select to_regclass('public.archery_instructor_rounds') present"))[0].present,null,'failed upgrade rolls back table and RPC changes')
  assert.equal((await api('list',{},'student@example.com')).rounds.length,1,'previous student history survives a failed upgrade')
  await db.exec(upgrade)
  const body={id:crypto.randomUUID(),date:today,distance:30,unit:'m',scores:[10,10,9,0,7],marks:['X','10','9','M','7'],notes:'My private instructor practice',total:999,enrollmentId:sid,instructor_email:'spoof@example.com'}
  const saved=(await api('round_save',body)).round
  assert.equal(saved.total,36);assert.deepEqual(saved.score_marks,body.marks)
  assert.equal(saved.instructor_email,undefined);assert.equal(saved.instructor_sub,undefined)
  assert.equal((await api('round_save',body)).duplicate,true)
  await assert.rejects(api(null,{...body,id:crypto.randomUUID()}),/Unknown/)
  for(const change of [{marks:['10','10','9','M','7']},{distance:20},{notes:'Changed'},{date:'2000-01-01'}])await assert.rejects(api('round_save',{...body,...change}),/already saved|date/i)
  let own=await api('list',{date:today})
  assert.equal(own.personalRounds.length,1);assert.equal(own.personalDayRounds.length,1);assert.equal(own.personalRoundDays[today],1)
  assert.equal(own.rounds.length,1);assert.equal(own.dayRounds.length,1,'student review remains separate')
  assert.equal(own.roster.length,1);assert.equal(own.me,null,'instructor is not made a student')
  assert.equal((await q('select count(*)::int n from attendance_enrollments where class_id=$1',[cid]))[0].n,1)
  const student=await api('list',{date:today},'student@example.com')
  assert.equal(student.personalRounds.length,0);assert.equal(student.personalDayRounds.length,0);assert.deepEqual(student.personalRoundDays,{})
  assert.equal(student.dayRounds.length,1);assert.ok(!JSON.stringify(student).includes(body.notes))
  await api('round_save',{...body,id:crypto.randomUUID(),instructor:true},'student@example.com')
  assert.equal((await api('list',{date:today})).personalDayRounds.length,1,'client identity fields do not create instructor records')
  await assert.rejects(api('list',{},'teacher@example.com',false),/access denied/)
  await assert.rejects(api('round_save',{...body,id:crypto.randomUUID()},'other@example.com'),/access denied/)
  await assert.rejects(api('round_save',{...body,classId:other,id:crypto.randomUUID()}),/access denied/)
  const changedSub=await api('list',{date:today},'teacher@example.com',true,'different-subject')
  assert.equal(changedSub.personalRounds.length,0);assert.equal(changedSub.personalDayRounds.length,0);assert.deepEqual(changedSub.personalRoundDays,{})
  await assert.rejects(api('round_save',body,'teacher@example.com',true,'different-subject'),/already saved/)
  for(const change of [{scores:[]},{scores:[11]},{scores:[1.5]},{scores:[null]},{marks:['x']},{marks:['X'],scores:[9]},{distance:0},{distance:1001},{unit:'km'},{date:'2100-01-01'},{date:'2000-01-01'},{notes:'x'.repeat(2001)}])await assert.rejects(api('round_save',{...body,id:crypto.randomUUID(),...change}))
  const retry={...body,id:crypto.randomUUID(),notes:'Concurrent retry'}
  const two=await Promise.all([api('round_save',retry),api('round_save',retry)])
  assert.equal(two.filter(r=>r.duplicate).length,1)
  assert.equal((await q('select count(*)::int n from archery_instructor_rounds where id=$1',[retry.id]))[0].n,1)
  await q('update attendance_classes set instructor_email=$2 where id=$1',[cid,'other@example.com'])
  const newOwner=await api('list',{date:today},'other@example.com')
  assert.equal(newOwner.personalRounds.length,0);assert.deepEqual(newOwner.personalRoundDays,{})
  await q('update attendance_classes set instructor_email=$2,archived=true where id=$1',[cid,'teacher@example.com'])
  assert.equal((await api('list')).personalRounds.length,2)
  await assert.rejects(api('round_save',{...body,id:crypto.randomUUID()}),/Restore|archived/)
  await q('update attendance_classes set archived=false where id=$1',[cid])
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(api('list'),/permission denied/)
   await assert.rejects(q('select * from archery_instructor_rounds'),/permission denied/);await db.exec('reset role')
  }
  await db.exec('set role service_role')
  const roleSaved=(await api('round_save',{...body,id:crypto.randomUUID()})).round
  assert.equal(roleSaved.total,36)
  await assert.rejects(q('update archery_instructor_rounds set notes=$2 where id=$1',[body.id,'tamper']),/permission denied/)
  await assert.rejects(q('delete from archery_instructor_rounds where id=$1',[body.id]),/permission denied/)
  await db.exec('reset role')
  await q("insert into archery_instructor_rounds(id,class_id,instructor_email,instructor_sub,entry_date,distance,unit,scores,score_marks) select gen_random_uuid(),$1,'teacher@example.com','test-teacher@example.com',$2,30,'m',array[10],array['X'] from generate_series(1,501)",[cid,today])
  own=await api('list',{date:today});assert.equal(own.personalRounds.length,500);assert.equal(own.personalDayRounds.length,504);assert.equal(own.personalRoundDays[today],504)
 }finally{await db.close()}
})

test('instructor upgrade preserves rounds and brackets from each previous preview schema',async()=>{
 const migrations=await Promise.all(['20261018225039_archery_rounds_and_competitions.sql','20261019010834_archery_calendar_registration.sql','20261019013958_archery_score_wheel.sql','20261027153351_archery_instructor_practice.sql'].map(name=>readFile('supabase/migrations/'+name,'utf8')))
 for(const startingVersion of [1,2,3]){
  const db=new PGlite()
  try{
   await db.exec(await readFile('src/lib/archery/demo-schema.sql','utf8'));await db.exec(migrations[0])
   const classId='00000000-0000-0000-0000-000000000001',ids=Array.from({length:7},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'))
   const api=async(action,body={},teacher=false)=>(await db.query('select archery_api($1,$2,$3,$4,$5) data',[teacher?'teacher@example.com':'student1@example.com',teacher?'demo-teacher':'demo-student1@example.com',teacher,action,{classId,...body}])).rows[0].data
   const today=(await api('list')).today,id=crypto.randomUUID()
   await api('round_save',{id,date:today,distance:30,unit:'m',scores:[10,0,7],notes:'Original preview practice'})
   const draw=(await api('tournament_create',{id:crypto.randomUUID(),title:'Original draw',game:'Game',participants:ids},true)).tournament
   const before=(await api('list',{},true)).matches.map(m=>[m.id,m.a,m.b,m.winner_id])
   for(let i=1;i<startingVersion;i++)await db.transaction(async tx=>{await tx.exec(migrations[i])})
   await db.transaction(async tx=>{for(let i=startingVersion;i<migrations.length;i++)await tx.exec(migrations[i])})
   const student=await api('list',{date:today});assert.equal(student.dayRounds.length,1);assert.equal(student.dayRounds[0].total,17);assert.deepEqual(student.dayRounds[0].score_marks,['10','M','7'])
   const teacher=await api('list',{},true);assert.equal(teacher.tournaments[0].id,draw.id);assert.deepEqual(teacher.matches.map(m=>[m.id,m.a,m.b,m.winner_id]),before)
   await api('round_save',{id:crypto.randomUUID(),date:today,distance:15,unit:'yd',marks:['X','M']},true)
   assert.equal((await api('list',{date:today},true)).personalDayRounds[0].total,10)
   assert.equal((await api('list',{date:today})).personalDayRounds.length,0)
  }finally{await db.close()}
 }
})
