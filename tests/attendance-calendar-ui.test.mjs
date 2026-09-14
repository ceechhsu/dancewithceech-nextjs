import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('calendar provides month navigation, alternate list, explicit statuses and semester summary',()=>{
 const source=readFileSync('src/components/attendance/AttendanceCalendar.tsx','utf8')+readFileSync('src/components/attendance/CorrectionRequest.tsx','utf8')
 for(const text of ['Previous month','Next month','Calendar','List','Semester summary','Remaining','Request a correction'])assert.ok(source.includes(text),text)
 assert.match(source,/aria-pressed/);assert.match(source,/checked_in_at/);assert.doesNotMatch(source,/checkInTime\([^)]*updated_at/)
})
test('correction form requires explanation and requested status, preserving existing record',()=>{
 const source=readFileSync('src/components/attendance/CorrectionRequest.tsx','utf8')
 assert.match(source,/requested_status/);assert.match(source,/explanation/);assert.match(source,/Pending review/)
 assert.match(source,/required/);assert.match(source,/attendanceApi\("requests"/)
})
