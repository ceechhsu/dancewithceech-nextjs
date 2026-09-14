import {test} from 'node:test'
import assert from 'node:assert/strict'
import config from '../next.config'
import {isPrivateAttendancePath} from '../src/lib/attendance/privacy'
test('attendance excludes analytics and permits geolocation only on its own routes',async()=>{
 assert.equal(isPrivateAttendancePath('/attendance/checkin/secret'),true);assert.equal(isPrivateAttendancePath('/dashboard'),true);assert.equal(isPrivateAttendancePath('/'),false)
 const headers=await config.headers!();const attendance=headers.find(h=>h.source==='/attendance/:path*')!;assert.ok(attendance);assert.ok(attendance.headers.some(h=>h.key==='Permissions-Policy'&&h.value.includes('geolocation=(self)')));assert.ok(attendance.headers.some(h=>h.key==='Referrer-Policy'&&h.value==='no-referrer'))
})
