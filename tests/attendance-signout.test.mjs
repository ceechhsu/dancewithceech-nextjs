import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('attendance frame provides the regular menu sign-out with offline-data protection', () => {
  const frame = readFileSync('src/components/attendance/Frame.tsx', 'utf8')
  const header = readFileSync('src/components/attendance/InstructorHeader.tsx', 'utf8')
  const menu = readFileSync('src/components/MobileMenu.tsx', 'utf8')
  const control = readFileSync('src/components/UserMenu.tsx', 'utf8')
  assert.match(frame, /<InstructorHeader/)
  assert.match(header, /<MobileMenu user=\{user\}/)
  assert.match(menu, /user \? <UserMenu/)
  assert.match(control, /Sign Out/)
  assert.match(control, /await clearOfflineData/)
  assert.match(control, /await signOut\(\)/)
})
