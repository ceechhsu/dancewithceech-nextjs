import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOverview } from '../src/lib/owner-dashboard/model'
import { otherUsersOverview, loadOtherUsers } from '../src/lib/owner-dashboard/other-users'

const initial = buildOverview([
 {user_id:'google:123',email:'changed@example.invalid',first_sign_in_at:'2026-10-20T10:00:00Z',last_sign_in_at:'2026-10-20T10:00:00Z'},
 {user_id:'google:456',email:' Student@Example.invalid ',first_sign_in_at:'2026-10-20T11:00:00Z',last_sign_in_at:'2026-10-20T11:00:00Z'},
 {user_id:'google:789',email:'outside@example.invalid',first_sign_in_at:'2026-10-20T12:00:00Z',last_sign_in_at:'2026-10-20T12:00:00Z'},
], [
 {user_id:'google:123',service:'beatfirst',saved_at:'2026-10-20T11:00:00Z',description:'Round saved'},
 {user_id:'google:old',service:'trainer',saved_at:'2026-10-20T12:00:00Z',description:'Score saved'},
 {user_id:'google:unknown',service:'beatfirst',saved_at:'2026-10-20T12:00:00Z',description:'Round saved'},
], [], false, '2026-10-20T13:00:00Z', [{user_id:'google:old',email:'historical@example.invalid',matched_at:'2026-10-20T12:00:00Z'}])

test('other users excludes exact linked Google IDs and exact normalized roster emails',()=>{
 const view=otherUsersOverview(initial,[{google_sub:'123',email:null},{google_sub:null,email:'student@example.invalid'},{google_sub:'google:1234',email:'side@example.invalid'}])
 assert.deepEqual(view.accounts.map(a=>a.id).sort(),['google:789','google:old','google:unknown'])
 assert.deepEqual(view.activity.map(a=>a.user_id).sort(),['google:old','google:unknown'])
 assert.equal(view.accounts.find(a=>a.id==='google:old')!.lastSignIn,null)
 assert.equal(view.accounts.find(a=>a.id==='google:old')!.emailSource,'historical-match')
 assert.equal(view.accounts.find(a=>a.id==='google:unknown')!.email,null)
 assert.equal(view.accounts.find(a=>a.id==='google:789')!.lastSignIn,'2026-10-20T12:00:00Z')
 assert.equal(initial.accounts.length,5)
})

test('other users recognizes canonical prefixed subjects and never matches empty identities',()=>{
 const view=otherUsersOverview(initial,[{google_sub:'google:123',email:''},{google_sub:'',email:null}])
 assert.equal(view.accounts.some(a=>a.id==='google:123'),false)
 assert.equal(view.accounts.some(a=>a.id==='google:unknown'),true)
})

test('membership reads require owner authorization and source failures never return an unfiltered list',async()=>{
 let reads=0
 const deps={authorize:async()=>{throw new Error('denied')},overview:async()=>{reads++;return initial},memberships:async()=>{reads++;return []}}
 await assert.rejects(loadOtherUsers(deps),/denied/)
 assert.equal(reads,0)
 await assert.rejects(loadOtherUsers({...deps,authorize:async()=>{},memberships:async()=>{throw new Error('roster unavailable')}}),/roster unavailable/)
 assert.equal(reads,0,'Failed membership checks should not start account queries')
 const result=await loadOtherUsers({...deps,authorize:async()=>{},memberships:async()=>[{google_sub:'123',email:null}]})
 assert.equal(result.accounts.some(a=>a.id==='google:123'),false)
})
