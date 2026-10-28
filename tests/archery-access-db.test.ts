import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { archeryClasses } from '../src/lib/attendance/archery-navigation'

test('navigation membership uses current enrollment, identity, configured tool and owner boundaries', async () => {
  const db = new PGlite()
  try {
    await db.exec("set timezone='America/Los_Angeles'; create role anon; create role authenticated; create role service_role bypassrls;")
    for (const file of ['20260912163507_attendance_private.sql','20260913193819_attendance_roster_identity_fields.sql','20260913223327_attendance_calendar.sql','20260914005600_attendance_add_student.sql','20260918020000_attendance_credit_nicknames.sql','20260918030000_attendance_roster_removal.sql','20261018221205_attendance_class_progress.sql']) await db.exec(await readFile('supabase/migrations/'+file,'utf8'))
    const {rows:[{id}]} = await db.query<{id:string}>(`insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time,progress_tool) values('teacher@example.com','Section 1','Fall',2026,current_date-30,current_date+30,'09:00','10:00','archery') returning id`)
    await db.query(`insert into attendance_enrollments(class_id,name,email,effective_from) values($1,'Example Student','student@example.com',current_date-30)`,[id])
    const links = async (email='student@example.com',instructor=false,sub='sub-'+email) => {
      const {rows:[{data}]}=await db.query<{data:unknown}>("select attendance_progress_api($1,$2,$3,'list','{}') data",[email,sub,instructor])
      return archeryClasses(data)
    }
    assert.deepEqual(await links(),[{id,name:'Section 1'}])
    assert.deepEqual(await links('other@example.com'),[])
    assert.deepEqual(await links('other@example.com',true),[])
    assert.deepEqual(await links('student@example.com',false,'different-sub'),[])
    for (const [field,value,restore] of [
      ['effective_to','current_date-1','null'],
      ['effective_from','current_date+1','current_date-30'],
      ['removed_at','clock_timestamp()','null'],
    ]) {
      await db.query(`update attendance_enrollments set ${field}=${value} where class_id=$1`,[id])
      assert.deepEqual(await links(),[],field+' cannot grant navigation')
      await db.query(`update attendance_enrollments set ${field}=${restore} where class_id=$1`,[id])
    }
    for (const [field,value,restore] of [
      ['end_date','current_date-1','current_date+30'],
      ['start_date','current_date+1','current_date-30'],
      ['archived','true','false'],
    ]) {
      await db.query(`update attendance_classes set ${field}=${value} where id=$1`,[id])
      assert.deepEqual(await links(),[],field+' cannot grant student navigation')
      assert.deepEqual(await links('teacher@example.com',true),[{id,name:'Section 1'}],'owner retains class access')
      await db.query(`update attendance_classes set ${field}=${restore} where id=$1`,[id])
    }
    await db.query("update attendance_classes set name='Archery',progress_tool='weight_training' where id=$1",[id])
    assert.deepEqual(await links(),[],'a class name alone grants nothing')
    assert.deepEqual(await links('teacher@example.com',true),[])
  } finally { await db.close() }
})
