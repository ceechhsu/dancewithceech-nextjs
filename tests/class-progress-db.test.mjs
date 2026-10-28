import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('class progress enforces enrollment, identity, subject and instructor boundaries in PostgreSQL', async () => {
  const db = new PGlite()
  try {
    await db.exec("set timezone='America/Los_Angeles'; create role anon; create role authenticated; create role service_role bypassrls;")
    for (const name of ['20260912163507_attendance_private.sql', '20260913193819_attendance_roster_identity_fields.sql', '20260913223327_attendance_calendar.sql', '20260914005600_attendance_add_student.sql', '20260918020000_attendance_credit_nicknames.sql', '20260918030000_attendance_roster_removal.sql', '20261018221205_attendance_class_progress.sql']) {
      await db.exec(await readFile('supabase/migrations/' + name, 'utf8'))
    }
    const query = async (sql, args = []) => (await db.query(sql, args)).rows
    const makeClass = async (name, owner = 'teacher@example.com') => (await query(`insert into attendance_classes(instructor_email,name,term,year,start_date,end_date,start_time,end_time) values($1,$2,'Fall',2026,current_date-30,current_date+30,'09:00','10:00') returning id`, [owner, name]))[0].id
    const archery = await makeClass('Archery'), weights = await makeClass('Weights'), dance = await makeClass('Hip hop'), other = await makeClass('Another teacher', 'other@example.com')
    const enroll = async (classId, email) => (await query(`insert into attendance_enrollments(class_id,name,email,effective_from) values($1,$2,$2,current_date-30) returning id`, [classId, email]))[0].id
    const alice = await enroll(archery, 'alice@example.com'), bob = await enroll(archery, 'bob@example.com')
    await enroll(weights, 'alice@example.com'); await enroll(weights, 'weights@example.com'); await enroll(dance, 'dancer@example.com')
    const api = async (action, body = {}, email = 'teacher@example.com', instructor = email === 'teacher@example.com', sub = 'sub-' + email) => (await query('select attendance_progress_api($1,$2,$3,$4,$5) data', [email, sub, instructor, action, body]))[0].data
    const config = (classId, tool) => api('configure', { classId, tool })
    assert.equal((await api('list', {}, 'alice@example.com')).classes.length, 0, 'no tools until explicitly configured')
    await config(archery, 'archery'); await config(weights, 'weight_training')
    await assert.rejects(config(other, 'archery'), /access denied/)
    await assert.rejects(config(dance, 'unknown'), /progress tool/)
    await assert.rejects(api('configure', { classId: archery, tool: 'none' }, 'alice@example.com'), /Instructor/)
    await assert.rejects(api('list', {}, '', false), /identity/)
    const classes = (await api('list', {}, 'alice@example.com')).classes
    assert.deepEqual(classes.map(c => c.progress_tool).sort(), ['archery', 'weight_training'])
    assert.equal((await api('list', {}, 'dancer@example.com')).classes.length, 0)
    assert.equal((await api('list', {}, 'outsider@example.com')).classes.length, 0)
    await assert.rejects(api('list', { classId: archery }, 'weights@example.com'), /access denied/)
    await assert.rejects(api('list', { classId: archery }, 'alice@example.com', false, 'wrong-sub'), /access denied/)
    const today = (await query('select current_date::text today'))[0].today
    const entry = { classId: archery, entryId: crypto.randomUUID(), date: today, activity: 'Weekly round · 10 m', result: '72 / 100', notes: 'Steadier release' }
    const saved = await api('save', entry, 'alice@example.com')
    assert.equal(saved.entry.enrollment_id, alice)
    assert.equal(saved.entry.subject, 'archery')
    assert.equal((await api('save', entry, 'alice@example.com')).duplicate, true)
    await assert.rejects(api('save', { ...entry, result: 'Changed' }, 'alice@example.com'), /already saved/)
    await assert.rejects(api('save', { ...entry, classId: weights }, 'alice@example.com'), /already saved/)
    await api('save', { ...entry, entryId: crypto.randomUUID(), result: '50' }, 'bob@example.com')
    assert.equal((await api('list', { classId: archery, enrollmentId: bob }, 'alice@example.com')).entries.length, 1, 'student-supplied enrollment never widens access')
    assert.equal((await api('list', { classId: archery }, 'alice@example.com')).entries[0].notes, entry.notes)
    assert.equal((await api('list', { classId: archery })).entries.length, 2)
    await assert.rejects(api('list', { classId: archery }, 'other@example.com', true), /access denied/)
    await assert.rejects(api('save', { ...entry, entryId: crypto.randomUUID(), enrollmentId: bob }, 'weights@example.com'), /access denied/)
    await assert.rejects(api('save', { ...entry, entryId: crypto.randomUUID() }), /enrolled student/)
    for (const bad of [{ date: '2100-01-01' }, { activity: ' ' }, { result: '' }, { notes: 'x'.repeat(2001) }, { date: '2000-01-01' }]) {
      await assert.rejects(api('save', { ...entry, entryId: crypto.randomUUID(), ...bad }, 'alice@example.com'), /date|activity|result|notes/i)
    }
    await query('update attendance_enrollments set effective_to=current_date-1 where id=$1', [alice])
    await assert.rejects(api('list', { classId: archery }, 'alice@example.com'), /access denied/)
    await assert.rejects(api('save', { ...entry, entryId: crypto.randomUUID() }, 'alice@example.com'), /access denied/)
    assert.equal((await api('list', { classId: archery })).entries.length, 2, 'teacher retains class records')
    await query('update attendance_enrollments set effective_to=null,email=$2,google_sub=null where id=$1', [alice, 'corrected@example.com'])
    await assert.rejects(api('list', { classId: archery }, 'alice@example.com'), /access denied/)
    assert.equal((await api('list', { classId: archery }, 'corrected@example.com')).entries.length, 1)
    await config(archery, 'none')
    await assert.rejects(api('list', { classId: archery }, 'corrected@example.com'), /progress tool/)
    await config(archery, 'weight_training')
    assert.equal((await api('list', { classId: archery }, 'corrected@example.com')).entries.length, 0, 'different subject does not mix logs')
    await config(archery, 'archery')
    assert.equal((await api('list', { classId: archery }, 'corrected@example.com')).entries.length, 1)
    await query('update attendance_enrollments set removed_at=clock_timestamp() where id=$1', [alice])
    await assert.rejects(api('list', { classId: archery }, 'corrected@example.com'), /access denied/)
    assert.equal((await api('list', {}, 'corrected@example.com')).classes.length, 0)
    await query('update attendance_enrollments set removed_at=null where id=$1', [alice])
    const m = (await query(`insert into attendance_meetings(class_id,instructor_email,meeting_date,status,token) values($1,'teacher@example.com',current_date,'closed','secret') returning id`, [archery]))[0].id
    await query("insert into attendance_roster(meeting_id,enrollment_id,name,email) values($1,$2,'Historical student','old@example.com')", [m, bob])
    await query("insert into attendance_records(meeting_id,enrollment_id,status,source) values($1,$2,'present','check_in')", [m, bob])
    const workspace = await api('workspace', { classId: archery })
    assert.equal(workspace.roster.length, 2)
    assert.equal(workspace.meetings.length, 1)
    assert.equal(workspace.records[0].status, 'present')
    assert.ok(!JSON.stringify(workspace).includes('secret'))
    await assert.rejects(api('workspace', { classId: archery }, 'bob@example.com'), /Instructor/)
    await assert.rejects(api('workspace', { classId: other }), /access denied/)
    await query('update attendance_classes set archived=true where id=$1', [archery])
    await assert.rejects(api('list', { classId: archery }, 'bob@example.com'), /access denied/)
    for (const role of ['anon', 'authenticated']) {
      await db.exec('set role ' + role)
      await assert.rejects(query('select * from attendance_progress_entries'), /permission denied/)
      await assert.rejects(api('list', {}, 'bob@example.com'), /permission denied/)
      await assert.rejects(query("insert into attendance_progress_entries default values"), /permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    assert.equal((await api('list', {}, 'weights@example.com')).classes.length, 1)
    const workout = await api('save', { classId: weights, entryId: crypto.randomUUID(), date: today, activity: 'Push-ups', result: '20 reps' }, 'weights@example.com')
    assert.equal(workout.entry.result, '20 reps', 'real invoker role can insert its validated entry')
    assert.equal((await api('workspace', { classId: weights })).class.id, weights)
    await api('configure', { classId: weights, tool: 'none' })
    await db.exec('reset role')
  } finally { await db.close() }
})
