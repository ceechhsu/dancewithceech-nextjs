import assert from 'node:assert/strict'
import test from 'node:test'
import { leaderboardRequest } from '../src/components/beatfirst-preview/leaderboard-request'

test('leaderboard reads the selected level and forwards the current owner', async () => {
  const controller = new AbortController()
  const result = await leaderboardRequest('/api/beatfirst/leaderboard?level=9', { signal: controller.signal, headers: { 'X-BeatFirst-Owner': 'google:player' } }, async (url, options) => {
    assert.equal(url, '/api/beatfirst/leaderboard?level=9')
    assert.equal(new Headers(options?.headers).get('X-BeatFirst-Owner'), 'google:player')
    assert.equal(options?.cache, 'no-store')
    return Response.json({ levelId: 9, entries: [], profile: null })
  })
  assert.deepEqual(result, { levelId: 9, entries: [], profile: null })
})

test('name conflicts and server failures stay actionable without pretending a profile was saved', async () => {
  await assert.rejects(leaderboardRequest('/board', { method: 'POST', body: '{}' }, async () => Response.json({ error: 'That name is taken. Choose another.' }, { status: 409 })), /That name is taken/)
  await assert.rejects(leaderboardRequest('/board', {}, async () => new Response('Server error', { status: 503 })), /Leaderboard.*try again/i)
})

test('level or account changes abort outstanding requests', async () => {
  const controller = new AbortController()
  let signal: AbortSignal | null | undefined
  const pending = leaderboardRequest('/board', { signal: controller.signal }, async (_url, options) => {
    signal = options?.signal
    return new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  })
  controller.abort()
  await assert.rejects(pending, /Leaderboard.*try again/i)
  assert.equal(signal?.aborted, true)
})

test('the deadline covers a stalled response body as well as the connection', async () => {
  let signal: AbortSignal | null | undefined
  await assert.rejects(leaderboardRequest('/board', {}, async (_url, options) => {
    signal = options?.signal
    return { ok: true, json: () => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })) } as Response
  }, 5), /Leaderboard.*try again/i)
  assert.equal(signal?.aborted, true)
})

test('already cancelled work does not start a request', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(leaderboardRequest('/board', { signal: controller.signal }, async () => { assert.fail('Cancelled work must not fetch') }), /Leaderboard.*try again/i)
})
