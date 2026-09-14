import test from 'node:test'
import assert from 'node:assert/strict'
import { applySyncResults, clearOfflineData, describeQueued, syncCandidates } from '../src/lib/attendance/offline'

const entry = { owner: 'teacher@example.com', operationId: 'op', meetingId: 'm', enrollmentId: 'e', status: 'present' as const, expectedRevision: 1, note: 'Seen in room', state: 'pending' as const, recordedAt: '2026-09-12T12:00:00Z' }
test('saved operations leave the queue', () => assert.deepEqual(applySyncResults([entry], [{ operationId: 'op', saved: true }]), []))
test('revision conflicts remain for explicit review', () => assert.equal(applySyncResults([entry], [{ operationId: 'op', code: 'conflict', error: 'Changed on server' }])[0].state, 'conflict'))
test('missing responses do not silently delete operations', () => assert.deepEqual(applySyncResults([entry], []), [entry]))
test('failed operations retain their original revision', () => assert.equal(applySyncResults([entry], [{ operationId: 'op', error: 'Not saved' }])[0].expectedRevision, 1))
test('automatic sync selects only pending operations', () => assert.equal(syncCandidates([entry, { ...entry, operationId: 'error', state: 'error' }, { ...entry, operationId: 'conflict', state: 'conflict' }], true).length, 1))
test('manual sync retains conflict exclusions', () => assert.equal(syncCandidates([{ ...entry, state: 'conflict' }], false).length, 0))
test('missing cached identities have explicit unique fallbacks', () => assert.deepEqual(describeQueued(entry, []), { student: 'Student e', className: 'Meeting m', meetingDate: 'Date unavailable' }))
test('conflicts preserve original recording time', () => assert.equal(applySyncResults([entry], [{operationId:'op',code:'conflict'}])[0].recordedAt, entry.recordedAt))
test('conflicts retain the server status and revision for review', () => { const record = { status: 'absent' as const, revision: 4 }; assert.deepEqual(applySyncResults([entry], [{operationId:'op',code:'conflict',record}])[0].serverRecord, record) })
test('ordinary logout without any offline usage does not open IndexedDB', async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{getItem:()=>null} })
  Object.defineProperty(globalThis, 'indexedDB', { configurable:true, value:{open:()=>{throw new Error('must not open')},databases:async()=>[]} })
  await clearOfflineData('ordinary@example.com')
  delete (globalThis as {localStorage?:unknown}).localStorage
  delete (globalThis as {indexedDB?:unknown}).indexedDB
})
test('known offline usage never bypasses an inaccessible pending queue', async () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{getItem:()=> '1'} })
  Object.defineProperty(globalThis, 'indexedDB', { configurable:true, value:{open:()=>{throw new Error('storage denied')}} })
  await assert.rejects(clearOfflineData('teacher@example.com'), /storage denied/)
  delete (globalThis as {localStorage?:unknown}).localStorage
  delete (globalThis as {indexedDB?:unknown}).indexedDB
})
