import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyLocal, addAttempt, claimGuest, acknowledge, parseLocal, nextSaveBatch } from '../src/components/beatfirst-preview/local-progress'
import type { Attempt } from '../src/components/beatfirst-preview/progress'
const attempt = (id: string, levelId = 1): Attempt => ({ id, levelId, taps: [], completedAt: new Date().toISOString() })
test('guest transfer claims once and isolates account queues', () => {
  let state = addAttempt(emptyLocal(), attempt('11111111-1111-4111-8111-111111111111'), null)
  state = claimGuest(state, 'google:alice')
  assert.equal(state.guest.length, 0)
  assert.equal(state.pending['google:alice'].length, 1)
  state = claimGuest(state, 'google:bob')
  assert.equal(state.pending['google:bob']?.length ?? 0, 0)
  assert.equal(state.pending['google:alice'].length, 1)
})
test('acknowledgements remove only saved attempts for the current owner', () => {
  let state = addAttempt(emptyLocal(), attempt('11111111-1111-4111-8111-111111111111'), 'google:alice')
  state = addAttempt(state, attempt('22222222-2222-4222-8222-222222222222'), 'google:alice')
  state = addAttempt(state, attempt('11111111-1111-4111-8111-111111111111'), 'google:bob')
  state = acknowledge(state, 'google:alice', ['11111111-1111-4111-8111-111111111111'])
  assert.equal(state.pending['google:alice'].length, 1)
  assert.equal(state.pending['google:bob'].length, 1)
})
test('malformed storage safely starts fresh', () => {
  for (const raw of ['bad', '{}', 'null', '{"version":1,"guest":{},"pending":[]}']) assert.deepEqual(parseLocal(raw), emptyLocal())
})

test('account queues restore all account levels while guest storage remains limited to introductions', () => {
  let state = emptyLocal()
  for (const id of Array.from({ length: 15 }, (_, index) => index + 4)) {
    state = addAttempt(state, attempt(`11111111-1111-4111-8111-${String(id).padStart(12, '0')}`, id), 'google:alice')
  }
  state = { ...state, guest: [attempt('22222222-2222-4222-8222-222222222222', 3), attempt('33333333-3333-4333-8333-333333333333', 18)] }
  const restored = parseLocal(JSON.stringify(state))
  assert.deepEqual(restored.pending['google:alice'], state.pending['google:alice'])
  assert.deepEqual(restored.guest.map(round => round.levelId), [3])
})

test('offline batches fit the API byte limit without losing rounds', () => {
  const queue = Array.from({ length: 25 }, (_, i) => ({ ...attempt(`11111111-1111-4111-8111-${String(i).padStart(12, '0')}`), taps: Array.from({ length: 250 }, (_, j) => ({ atMs: j * 33.12345678901234, lane: 0 as const })) }))
  assert.ok(new TextEncoder().encode(JSON.stringify({ attempts: queue })).byteLength > 128 * 1024)
  let remaining = queue
  let sent = 0
  while (remaining.length) {
    const batch = nextSaveBatch(remaining)
    assert.ok(batch.length > 0 && batch.length <= 25)
    assert.ok(new TextEncoder().encode(JSON.stringify({ attempts: batch })).byteLength <= 128 * 1024)
    sent += batch.length
    remaining = remaining.slice(batch.length)
  }
  assert.equal(sent, 25)
})
