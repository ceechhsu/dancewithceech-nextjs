import {test} from 'node:test'
import assert from 'node:assert/strict'
import {scheduledClasses} from '../src/lib/attendance/schedule'
test('selects using class timezone and excludes archived/out-of-term classes',()=>{
 const c={id:'a',timezone:'America/Los_Angeles',start_date:'2026-09-01',end_date:'2026-12-20',days:[2,4],start_time:'09:30',end_time:'11:00',archived:false}
 assert.equal(scheduledClasses([c],new Date('2026-09-15T16:30:00Z')).length,1)
 assert.equal(scheduledClasses([c],new Date('2026-09-15T18:00:00Z')).length,0)
 assert.equal(scheduledClasses([{...c,archived:true}],new Date('2026-09-15T16:30:00Z')).length,0)
 assert.equal(scheduledClasses([c,c],new Date('2026-09-15T16:30:00Z')).length,2)
})
