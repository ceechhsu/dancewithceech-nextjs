import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

test('check-in sync uses verified profile and waits for all filtered writes', async () => {
  const { syncRosterProfile } = await import('../src/lib/attendance/profile-sync')
  const requests: { url: URL; body: Record<string, unknown> }[] = []
  const db = createClient('https://test.supabase.co', 'test-key', { auth: { persistSession: false }, global: { fetch: async (url, init) => {
    requests.push({ url: new URL(String(url)), body: JSON.parse(String(init?.body)) })
    return new Response(null, { status: 204 })
  } } })
  await syncRosterProfile(db, { email: 'student@gmail.com', first_name: 'Jane', last_name: 'Doe', photo_url: 'https://lh3.googleusercontent.com/photo' })
  assert.equal(requests.length, 3)
  for (const request of requests) {
    assert.equal(request.url.searchParams.get('email'), 'eq.student@gmail.com')
    assert.equal(request.url.searchParams.get('effective_to'), 'is.null')
  }
  assert.equal(requests.find(r => r.body.first_name)?.url.searchParams.get('or'), '(first_name.is.null,first_name.eq.)')
  assert.equal(requests.find(r => r.body.last_name)?.url.searchParams.get('or'), '(last_name.is.null,last_name.eq.)')
})
test('sync failures are surfaced instead of silently succeeding', async () => {
  const { syncRosterProfile } = await import('../src/lib/attendance/profile-sync')
  const db = createClient('https://test.supabase.co', 'test-key', { auth: { persistSession: false }, global: { fetch: async () => new Response(JSON.stringify({ message: 'failed', code: '42501' }), { status: 403 }) } })
  await assert.rejects(syncRosterProfile(db, { email: 'student@gmail.com', first_name: null, last_name: null, photo_url: null }), /profile/)
})
test('check-in refreshes profile before recording Present and old sessions reauthenticate', () => {
  const server = readFileSync('src/lib/attendance/server.ts', 'utf8')
  assert.match(server, /actor.profileReady/)
  assert.ok(server.indexOf('await syncRosterProfile') >= 0)
  assert.ok(server.indexOf('await syncRosterProfile') < server.indexOf("db.rpc('attendance_api'"))
  const auth = readFileSync('src/auth.ts', 'utf8')
  assert.match(auth, /googleGivenName/)
  assert.match(auth, /googleFamilyName/)
  assert.match(auth, /googleProfileReady/)
})
test('avatars use same-origin optimized images compatible with private-page CSP', () => {
  const avatar = readFileSync('src/components/attendance/StudentAvatar.tsx', 'utf8')
  assert.match(avatar, /from 'next\/image'/)
  assert.match(avatar, /<Image /)
  assert.doesNotMatch(avatar, /<img /)
})
