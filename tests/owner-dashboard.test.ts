import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { ownerAccess, localPreviewEnabled } from '../src/lib/owner-dashboard/access'
import { buildOverview, snapshotState } from '../src/lib/owner-dashboard/model'
import { signInRecord, signInRecordingEnabled } from '../src/lib/owner-dashboard/signin'
const user = { email: 'dancewithceech@gmail.com', googleSub: 'owner-sub', googleEmailVerified: true }
test('owner gate rejects guests, ordinary users and unverified or malformed identities', () => {
  assert.equal(ownerAccess(null), 401)
  assert.equal(ownerAccess({ user: {} }), 403)
  assert.equal(ownerAccess({ user: { ...user, email: 'ordinary@example.invalid', isAdmin: true, owner: true } }), 403)
  assert.equal(ownerAccess({ user: { ...user, googleEmailVerified: false } }), 403)
  assert.equal(ownerAccess({ user: { ...user, googleSub: '' } }), 403)
  assert.equal(ownerAccess({ user: { ...user, googleSub: 'bad/sub' } }), 403)
  assert.equal(ownerAccess({ user: { ...user, email: ' DANCEWITHCEECH@gmail.com ' } }), 200)
})
test('synthetic preview is impossible in production or hosted preview environments', () => {
  assert.equal(localPreviewEnabled({ NODE_ENV: 'development', OWNER_DASHBOARD_LOCAL_PREVIEW: 'true' }), true)
  for (const env of [ {NODE_ENV:'production'}, {NODE_ENV:'development',VERCEL_ENV:'preview'}, {NODE_ENV:'development',VERCEL_ENV:'production'}, {NODE_ENV:'test'} ]) assert.equal(localPreviewEnabled({...env,OWNER_DASHBOARD_LOCAL_PREVIEW:'true'}),false)
})
test('recording defaults off and requires both explicit switches, verified subject and email', () => {
  assert.equal(signInRecordingEnabled({}),false)
  assert.equal(signInRecordingEnabled({OWNER_SIGNIN_RECORDING_ENABLED:'true'}),false)
  assert.equal(signInRecordingEnabled({OWNER_SIGNIN_RECORDING_ENABLED:'true',OWNER_SIGNIN_PRIVACY_REVIEWED:'true'}),true)
  const profile={sub:'123',email_verified:true,email:' Dancer@Example.invalid ',name:'Private name',picture:'private',access_token:'private'}
  assert.deepEqual(signInRecord(profile),{p_user_id:'google:123',p_email:'dancer@example.invalid'})
  assert.equal(signInRecord({...profile,email_verified:false}),null)
  assert.equal(signInRecord({...profile,sub:''}),null)
  assert.equal(signInRecord({...profile,email:'bad'}),null)
})
test('join uses stable Google subject, preserves sign-in-only accounts and never invents sign-in or time from a save', () => {
  const report=buildOverview([{user_id:'google:only-signin',email:'signin@example.invalid',first_sign_in_at:'2026-10-18T00:00:00Z',last_sign_in_at:'2026-10-19T00:00:00Z'}],[{user_id:'google:older-player',service:'beatfirst',saved_at:'2026-10-19T01:00:00Z',description:'round'},{user_id:'google:older-player',service:'trainer',saved_at:'2026-10-19T02:00:00Z',description:'score'}],[])
  assert.equal(report.accounts.length,2)
  const player=report.accounts.find(x=>x.id==='google:older-player')!
  assert.equal(player.email,null);assert.equal(player.lastSignIn,null);assert.equal(player.lastActivity,'2026-10-19T02:00:00Z')
  assert.equal(player.beatfirst,1);assert.equal(player.trainer,1)
  assert.equal(report.accounts.find(x=>x.id==='google:only-signin')!.lastActivity,null)
  assert.equal('activeMinutes' in player,false)
})
test('directory schema enforces private grants, server timestamps, retention and first/last sign-in', async () => {
  const db=new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
    await db.exec((await readFile(new URL('../supabase/migrations/20261020161706_owner_account_directory.sql',import.meta.url),'utf8')).split('-- CRON_SETUP:')[0])
    assert.equal((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname='owner_account_directory'")).rows[0].relrowsecurity,true)
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      for(const sql of ["select * from owner_account_directory","select owner_directory_record_signin('google:a','a@example.invalid')","delete from owner_account_directory","insert into owner_account_directory values('google:a','a@example.invalid',now(),now(),now()+interval '90 days')"]) await assert.rejects(db.exec(sql),/permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    await db.exec("select owner_directory_record_signin('google:a','a@example.invalid')")
    const first=(await db.query<{first_sign_in_at:Date;last_sign_in_at:Date}>("select * from owner_account_directory")).rows[0]
    await db.exec("select owner_directory_record_signin('google:a','changed@example.invalid')")
    const rows=(await db.query<{email:string;first_sign_in_at:Date;last_sign_in_at:Date;days:number}>("select *,extract(epoch from expires_at-last_sign_in_at)/86400 as days from owner_account_directory")).rows
    assert.equal(rows.length,1);assert.equal(rows[0].email,'changed@example.invalid');assert.equal(+rows[0].first_sign_in_at,+first.first_sign_in_at);assert.ok(+rows[0].last_sign_in_at>=+first.last_sign_in_at);assert.equal(Number(rows[0].days),90)
    await assert.rejects(db.exec("select owner_directory_record_signin('google:bad','NOT-AN-EMAIL')"),/check constraint/)
    await db.exec("update owner_account_directory set first_sign_in_at=now()-interval '100 days',last_sign_in_at=now()-interval '91 days',expires_at=now()-interval '1 day'")
    assert.equal(Number((await db.query<{count:string}>("select owner_directory_purge_expired() as count")).rows[0].count),1)
    assert.equal((await db.query('select * from owner_account_directory')).rows.length,0)
    await db.exec("select owner_directory_record_signin('google:a','a@example.invalid')")
    const reset=(await db.query<{same:boolean}>("select first_sign_in_at=last_sign_in_at as same from owner_account_directory")).rows[0]
    assert.equal(reset.same,true)
    const fn=(await db.query<{prosecdef:boolean}>("select prosecdef from pg_proc where proname='owner_directory_record_signin'")).rows[0];assert.equal(fn.prosecdef,false)
  } finally {await db.close()}
})

test('exact counts flag server row caps and reject unknown totals', () => {
  assert.equal(snapshotState(0,0),'available')
  assert.equal(snapshotState(2200,1000),'limited')
  assert.equal(snapshotState(120,120),'available')
  assert.throws(()=>snapshotState(null,1000))
})
