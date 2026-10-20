import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOverview } from '../src/lib/owner-dashboard/model'
const time='2026-10-20T17:00:00Z'
const activity=[{user_id:'google:history',service:'beatfirst' as const,saved_at:'2026-09-20T10:00:00Z',description:'round'}, {user_id:'google:unknown',service:'beatfirst' as const,saved_at:'2026-09-20T09:00:00Z',description:'round'}]
test('historical emails label saved activity without inventing sign-in timestamps or accounts',()=>{
 const report=buildOverview([],activity,[],false,time,[{user_id:'google:history',email:'history@example.invalid',matched_at:time},{user_id:'google:orphan',email:'orphan@example.invalid',matched_at:time}])
 assert.equal(report.accounts.length,2)
 const known=report.accounts.find(a=>a.id==='google:history')!
 assert.equal(known.email,'history@example.invalid');assert.equal(known.emailSource,'historical-match')
 assert.equal(known.firstSignIn,null);assert.equal(known.lastSignIn,null);assert.equal(known.emailMatchedAt,time)
 assert.equal(report.accounts.filter(a=>a.lastSignIn).length,0)
 assert.equal(report.accounts.find(a=>a.id==='google:unknown')!.email,null)
})
test('actual Google sign-in email and timestamps take precedence over historical evidence',()=>{
 const report=buildOverview([{user_id:'google:history',email:'current@example.invalid',first_sign_in_at:time,last_sign_in_at:time}],activity,[],false,time,[{user_id:'google:history',email:'old@example.invalid',matched_at:'2026-10-19T00:00:00Z'}])
 const a=report.accounts.find(a=>a.id==='google:history')!
 assert.equal(a.email,'current@example.invalid');assert.equal(a.emailSource,'google-signin');assert.equal(a.lastSignIn,time)
 assert.equal(report.accounts.filter(a=>a.lastSignIn).length,1)
})
