import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('only verified Google profiles provide roster fields, never guessed names', async () => {
  const { rosterGoogleProfile } = await import('../src/lib/attendance/google-profile')
  const profile = { email_verified: true, email: ' STUDENT@gmail.com ', given_name: ' Jordan ', family_name: ' Lee ', picture: 'https://lh3.googleusercontent.com/photo' }
  assert.deepEqual(rosterGoogleProfile(profile), { email: 'student@gmail.com', first_name: 'Jordan', last_name: 'Lee', photo_url: profile.picture })
  assert.equal(rosterGoogleProfile({ ...profile, email_verified: false }), null)
  assert.deepEqual(rosterGoogleProfile({ email_verified: true, email: 'student@gmail.com', name: 'Do Not Split', picture: 'https://evil.example/photo' }), { email: 'student@gmail.com', first_name: null, last_name: null, photo_url: null })
})
test('sync fills missing names only and instructor roster refreshes in background', () => {
  const auth = readFileSync('src/lib/attendance/profile-sync.ts', 'utf8')
  assert.match(auth, /first_name\.is\.null,first_name\.eq\./)
  assert.match(auth, /last_name\.is\.null,last_name\.eq\./)
  const roster = readFileSync('src/components/attendance/ClassRosterSummary.tsx', 'utf8')
  assert.match(roster, /setInterval/)
  assert.match(roster, /visibilitychange/)
  assert.match(roster, /clearInterval/)
  const frame = readFileSync('src/components/attendance/Frame.tsx', 'utf8')
  assert.match(frame, /<InstructorHeader student=\{!instructor\} user=\{user\}/)
})
