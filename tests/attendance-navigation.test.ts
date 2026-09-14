import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import { canSeeAttendance } from '../src/lib/attendance/navigation'

test('attendance navigation belongs only to the verified instructor Google account', () => {
  assert.equal(canSeeAttendance(null), false)
  assert.equal(canSeeAttendance({ email: 'ceechmission+alex@gmail.com', googleEmailVerified: true }), false)
  assert.equal(canSeeAttendance({ email: 'dancewithceech@gmail.com' }), false)
  assert.equal(canSeeAttendance({ email: 'dancewithceech@gmail.com', googleEmailVerified: true }), true)
})
test('public navigation enters attendance through a fresh document for privacy and location permissions',async()=>{
  for(const file of ['Nav','MobileMenu']){
    const source=await readFile(`src/components/${file}.tsx`,'utf8')
    assert.match(source,/<a\s+href="\/attendance\/instructor"/)
    assert.doesNotMatch(source,/<Link\s+href="\/attendance\/instructor"/)
  }
})
