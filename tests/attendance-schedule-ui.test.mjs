import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('instructor schedule uses explicit save revision and cancel/restore with confirmation',()=>{
 const source=readFileSync('src/components/attendance/ScheduleManager.tsx','utf8')
 for(const field of ['expectedRevision','start_date','end_date','days','confirmShorten','Cancel today’s class','Undo','reason'])assert.ok(source.includes(field),field)
 assert.match(source,/attendanceApi<ScheduleData>\('schedule'/)
})
test('instructor can review request using current revision without bypassing review',()=>{
 const source=readFileSync('src/components/attendance/CorrectionRequests.tsx','utf8')
 for(const field of ['Approve correction','Keep current record','current_revision','explanation','response','expectedRevision'])assert.ok(source.includes(field),field)
})
