import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('all attendance pages use the shared header without duplicate old navigation', () => {
  const frame = readFileSync('src/components/attendance/Frame.tsx', 'utf8')
  assert.match(frame, /pathname\.startsWith\('\/attendance\/instructor'\)/)
  assert.match(frame, /InstructorHeader/)
  assert.doesNotMatch(frame, /My Attendance|>Dashboard</)
  assert.match(frame, /<InstructorHeader student=\{!instructor\} user=\{user\}/)
})

test('attendance header reuses the regular role-aware website menu', () => {
  const header = readFileSync('src/components/attendance/InstructorHeader.tsx', 'utf8')
  assert.match(header, /href="\/"/)
  assert.match(header, /logo-mark\.png/)
  assert.match(header, /<MobileMenu user=\{user\} showAttendance=\{canSeeAttendance\(user\)\} alwaysVisible/)
  assert.doesNotMatch(header, /<details|<summary/)
  assert.doesNotMatch(header, /My Attendance/)
  for (const path of ['src/app/attendance/layout.tsx', 'src/app/dashboard/page.tsx']) {
    assert.match(readFileSync(path, 'utf8'), /googleEmailVerified: \(session.user as \{ googleEmailVerified\?: boolean \}\).googleEmailVerified/)
  }
})
