import test from 'node:test'
import assert from 'node:assert/strict'

const loadRoute = () => import('../src/app/api/attendance/sign-out/route')

test('student sign-out expires the remembered cookie at its original path', async () => {
  const { POST } = await loadRoute()
  const response = await POST(new Request('https://example.com/api/attendance/sign-out', {
    method: 'POST', headers: { origin: 'https://example.com', cookie: 'attendance_device=alex' },
  }))
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie') || ''
  assert.match(cookie, /attendance_device=;/)
  assert.match(cookie, /Path=\//i)
  assert.match(cookie, /Max-Age=0/i)
  assert.match(cookie, /HttpOnly/i)
  assert.match(response.headers.get('cache-control') || '', /no-store/)
})

test('student sign-out rejects foreign or absent origins without clearing cookies', async () => {
  const { POST } = await loadRoute()
  for (const origin of ['https://other.example', '']) {
    const response = await POST(new Request('https://example.com/api/attendance/sign-out', {
      method: 'POST', headers: origin ? { origin } : {},
    }))
    assert.equal(response.status, 403)
    assert.equal(response.headers.get('set-cookie'), null)
  }
})
