import test from 'node:test'
import assert from 'node:assert/strict'
import { parseProgressRequest } from '../src/lib/attendance/progress-request'

const origin = 'https://dancewithceech.com'
const classId = '00000000-0000-0000-0000-000000000001'
const post = (body: unknown, requestOrigin = origin) => new Request(origin + '/api/attendance/progress', { method: 'POST', headers: { origin: requestOrigin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
test('progress requests constrain actions, IDs, body size and mutation origin', async () => {
  assert.deepEqual(await parseProgressRequest(new Request(origin + '/api/attendance/progress')), { action: 'list', body: {} })
  assert.equal((await parseProgressRequest(new Request(origin + '/api/attendance/progress?classId=' + classId))).body.classId, classId)
  assert.equal((await parseProgressRequest(post({ action: 'configure', classId, tool: 'archery' }))).action, 'configure')
  for (const body of [null, [], { action: 'destroy', classId }, { action: 'save', classId }, { action: 'configure', classId: 'bad', tool: 'archery' }, { action: 'configure', classId, tool: 'admin' }]) {
    await assert.rejects(parseProgressRequest(post(body)))
  }
  await assert.rejects(parseProgressRequest(post({ action: 'configure', classId, tool: 'archery' }, 'https://outsider.example')), /origin/)
  await assert.rejects(parseProgressRequest(new Request(origin + '/api/attendance/progress?action=configure&classId=' + classId)), /action/)
  await assert.rejects(parseProgressRequest(post({ action: 'save', classId, entryId: classId, date: '2026-10-18', activity: 'Push-ups', result: '20', notes: 'x'.repeat(13000) })), /large/)
  const body = { action: 'save', classId, entryId: classId, date: '2026-10-18', activity: 'Push-ups', result: '20', notes: '', p_actor: 'spoof@example.com', instructor: true, enrollmentId: classId }
  const parsed = await parseProgressRequest(post(body))
  assert.equal(parsed.body.p_actor, undefined)
  assert.equal(parsed.body.instructor, undefined)
  assert.equal(parsed.body.enrollmentId, undefined)
})
