import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
test('failed roster avatars can recover on the next roster refresh', () => {
  const avatar = readFileSync('src/components/attendance/StudentAvatar.tsx','utf8')
  const roster = readFileSync('src/components/attendance/ClassRosterSummary.tsx','utf8')
  assert.match(avatar, /retryKey/)
  assert.match(avatar, /failedAttempt === attempt/)
  assert.match(roster, /setPhotoRetryKey/)
  assert.match(roster, /retryKey=\{photoRetryKey\}/)
  assert.doesNotMatch(roster, /key=\{photoRetryKey\}/)
})
