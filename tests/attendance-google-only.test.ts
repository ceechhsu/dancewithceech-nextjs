import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('verified Google students and instructors share the same identity system', async () => {
  const { googleAttendanceIdentity } = await import('../src/lib/attendance/google-identity')
  const user = { email: 'Student@gmail.com', googleSub: '123', googleEmailVerified: true }
  assert.deepEqual(googleAttendanceIdentity(user, 'teacher@gmail.com'), { email: 'student@gmail.com', sub: 'google:123', instructor: false })
  assert.equal(googleAttendanceIdentity(user, 'student@gmail.com')?.instructor, true)
  assert.equal(googleAttendanceIdentity({ ...user, googleEmailVerified: false }, ''), null)
  assert.equal(googleAttendanceIdentity({ email: user.email }, ''), null)
  assert.equal(googleAttendanceIdentity(undefined, ''), null)
})
test('email code endpoints are retired and issue no cookies', async () => {
  for (const path of ['request', 'verify']) {
    const { POST } = await import(`../src/app/api/attendance/email/${path}/route`)
    const response = await POST(new Request('https://example.com', { method: 'POST' }))
    assert.equal(response.status, 410)
    assert.equal(response.headers.get('set-cookie'), null)
    assert.match((await response.json()).error, /Google/)
  }
})
test('QR page authenticates before location check and never renders email-code login', () => {
  const page = readFileSync('src/app/attendance/checkin/[token]/page.tsx', 'utf8')
  const checkIn = readFileSync('src/components/attendance/CheckIn.tsx', 'utf8')
  const server = readFileSync('src/lib/attendance/server.ts', 'utf8')
  assert.match(page, /GoogleLogin/)
  assert.match(page, /googleAttendanceIdentity/)
  assert.doesNotMatch(checkIn, /EmailCodeLogin/)
  assert.doesNotMatch(server, /studentDeviceIdentity|email-auth/)
  assert.doesNotMatch(readFileSync('src/components/attendance/AttendanceHistory.tsx', 'utf8'), /EmailCodeLogin/)
})
