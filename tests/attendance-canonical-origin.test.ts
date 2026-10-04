import assert from 'node:assert/strict'
import test from 'node:test'
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server'
import nextConfig from '../next.config'
import { attendanceCheckInUrl } from '../src/lib/attendance/check-in-url'

test('old preview bookmarks and QR links redirect to production preserving path and query', async () => {
  for (const path of ['/', '/attendance/instructor', '/attendance/checkin/sample-token?from=qr', '/auth/retry', '/api/auth/csrf']) {
    const response = await unstable_getResponseFromNextConfig({ url: `https://attendance-preview.dancewithceech.com${path}`, nextConfig })
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), `https://dancewithceech.com${path}`)
  }
})

test('production and separate testing hosts are not caught by the retired-preview redirect', async () => {
  for (const origin of ['https://dancewithceech.com', 'https://test.dancewithceech.com', 'http://localhost:3100']) {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}/attendance/instructor`, nextConfig })
    assert.equal(response.status, 200)
  }
})

test('classroom QR links use the production origin and preserve the signed token', () => {
  assert.equal(attendanceCheckInUrl('signed.token_example-123'), 'https://dancewithceech.com/attendance/checkin/signed.token_example-123')
})

test('local development can still exercise check-in on its local server', () => {
  assert.equal(attendanceCheckInUrl('sample', 'http://localhost:3100'), 'http://localhost:3100/attendance/checkin/sample')
})
