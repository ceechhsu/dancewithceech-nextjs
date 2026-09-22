import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recoveryDestination } from '../src/lib/auth-recovery'

test('preserves a same-site class check-in link', () => {
  assert.equal(recoveryDestination('https://dancewithceech.com/attendance/checkin/example', 'https://dancewithceech.com'), '/attendance/checkin/example')
})
test('rejects foreign destinations and authentication loops', () => {
  for (const url of ['https://evil.example/', '//evil.example/', '/api/auth/callback/google', '/auth/retry', 'javascript:alert(1)', '/\\evil.example/']) {
    assert.equal(recoveryDestination(url, 'https://dancewithceech.com'), '/dashboard')
  }
})
test('missing destination falls back to dashboard', () => {
  assert.equal(recoveryDestination(undefined, 'https://dancewithceech.com'), '/dashboard')
})
