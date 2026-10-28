import test from 'node:test'
import assert from 'node:assert/strict'
import {monthCells,moveMonth,monthTitle,classDate} from '../src/lib/archery/calendar'
test('monthly archery dates cover leap years, year changes and the class timezone',()=>{
 const days=monthCells('2028-02')
 assert.equal(days.filter(Boolean).length,29)
 assert.equal(days.length%7,0)
 assert.equal(days.filter(Boolean).at(-1),'2028-02-29')
 assert.equal(moveMonth('2026-12',1),'2027-01')
 assert.equal(moveMonth('2026-01',-1),'2025-12')
 assert.equal(monthTitle('2026-10'),'October 2026')
 assert.equal(classDate('2026-10-19T01:00:00Z','America/Los_Angeles'),'2026-10-18')
 assert.throws(()=>monthCells('2026-13'))
})
