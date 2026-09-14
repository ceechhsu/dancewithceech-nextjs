import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarMonth, semesterSummary, shiftMonth, checkInTime, calendarBounds } from '../src/lib/attendance/calendar'
import type { CalendarData } from '../src/lib/attendance/calendar'

const data: CalendarData = {
  class: { id:'class',instructor_email:'teacher@example.com',name:'Hip Hop',college:'Cabrillo',location_label:'Studio',term:'Fall',year:2026,start_date:'2026-09-01',end_date:'2026-09-30',timezone:'America/Los_Angeles',days:[2,4],start_time:'09:30:00',end_time:'11:00:00',archived:false },
  today:'2026-09-10',now:'2026-09-10T17:00:00Z',enrollments:[{id:'e',effective_from:'2026-09-01',effective_to:null}],
  exceptions:[{date:'2026-09-15',kind:'holiday',reason:'Holiday'}],requests:[],meetings:[
    {id:'m1',meeting_date:'2026-09-01',status:'closed',record:{meeting_id:'m1',enrollment_id:'e',status:'present',source:'check_in',revision:1,updated_at:'2026-09-01T16:32:00Z',checked_in_at:'2026-09-01T16:32:00Z'}},
    {id:'m2',meeting_date:'2026-09-03',status:'closed',record:{meeting_id:'m2',enrollment_id:'e',status:'absent',source:'finalized',revision:1,updated_at:'2026-09-03T17:00:00Z',checked_in_at:null}},
    {id:'m3',meeting_date:'2026-09-10',status:'open',record:null}
  ]
}
test('calendar separates present, absent, pending, upcoming and no-class dates', () => {
  const days=calendarMonth(data,'2026-09').filter(Boolean)
  const state=(date:string)=>days.find(d=>d!.date===date)!.state
  assert.equal(state('2026-09-01'),'present');assert.equal(state('2026-09-03'),'absent')
  assert.equal(state('2026-09-08'),'pending');assert.equal(state('2026-09-10'),'pending')
  assert.equal(state('2026-09-15'),'holiday');assert.equal(state('2026-09-17'),'upcoming')
  assert.equal(state('2026-09-19'),'none')
})
test('summary excludes holidays and cancelled sessions', () => {
  assert.deepEqual(semesterSummary(data),{present:1,absent:1,remaining:4})
  const cancelled={...data,exceptions:[...data.exceptions,{date:'2026-09-01',kind:'cancelled' as const,reason:'Power outage'}]}
  assert.deepEqual(semesterSummary(cancelled),{present:0,absent:1,remaining:4})
  assert.equal(calendarMonth(cancelled,'2026-09').find(d=>d?.date==='2026-09-01')!.state,'cancelled')
})
test('successful check-in counts immediately and is not counted twice when the window closes',()=>{
  const checkedIn:CalendarData={...data,meetings:data.meetings.map(m=>m.id==='m3'?{...m,record:{...data.meetings[0].record!,meeting_id:'m3'}}:m)}
  assert.equal(semesterSummary(checkedIn).present,2)
  assert.equal(semesterSummary(checkedIn).absent,1)
  const closed={...checkedIn,meetings:checkedIn.meetings.map(m=>m.id==='m3'?{...m,status:'closed' as const}:m)}
  assert.deepEqual(semesterSummary(closed),semesterSummary(checkedIn))
  const cancelled={...checkedIn,meetings:checkedIn.meetings.map(m=>m.id==='m3'?{...m,status:'cancelled' as const}:m)}
  assert.equal(semesterSummary(cancelled).present,1)
})
test('an open window never contributes an absence',()=>{
  const pending={...data,meetings:data.meetings.map(m=>m.id==='m3'?{...m,record:{...data.meetings[1].record!,meeting_id:'m3'}}:m)}
  assert.equal(semesterSummary(pending).absent,1)
  assert.equal(semesterSummary({...pending,meetings:pending.meetings.map(m=>({...m,status:'closed' as const}))}).absent,2)
})
test('enrollment windows exclude future sessions after dropping a class', () => {
  assert.equal(semesterSummary({...data,enrollments:[{id:'e',effective_from:'2026-09-01',effective_to:'2026-09-20'}]}).remaining,1)
})
test('sessions outside enrollment without an own record are not pending',()=>{
  const dropped={...data,enrollments:[{id:'e',effective_from:'2026-09-01',effective_to:'2026-09-05'}]}
  assert.equal(calendarMonth(dropped,'2026-09').find(d=>d?.date==='2026-09-10')!.state,'none')
})
test('historical meetings remain visible beyond shortened schedule dates', () => {
  const changed={...data,class:{...data.class,start_date:'2026-09-10',end_date:'2026-09-20'}}
  assert.equal(calendarMonth(changed,'2026-09').find(d=>d?.date==='2026-09-01')!.state,'present')
  assert.equal(semesterSummary(changed).present,1)
  assert.deepEqual(calendarBounds({...changed,meetings:[...changed.meetings,{...changed.meetings[0],meeting_date:'2026-08-30'}]}),{first:'2026-08',last:'2026-09'})
})
test('month transitions, leap days, class timezone and unknown timestamps are explicit', () => {
  assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12')
  assert.equal(calendarMonth(data,'2028-02').filter(Boolean).length,29)
  assert.equal(checkInTime('2026-09-01T16:32:00Z','America/Los_Angeles'),'9:32 am')
  assert.equal(checkInTime(null,'America/Los_Angeles'),null)
})
test('multiple sessions on one date remain separate and do not hide mixed results', () => {
  const multiple={...data,meetings:[...data.meetings,{...data.meetings[1],id:'m4',meeting_date:'2026-09-01'}]}
  const day=calendarMonth(multiple,'2026-09').find(d=>d?.date==='2026-09-01')!
  assert.equal(day.state,'mixed');assert.equal(day.meetings.length,2)
  assert.equal(semesterSummary(multiple).absent,2)
})
