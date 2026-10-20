import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const base=await readFile(new URL('../supabase/migrations/20261020162031_owner_account_directory.sql',import.meta.url),'utf8')
const migration=await readFile(new URL('../supabase/migrations/20261020173711_owner_historical_email_matches.sql',import.meta.url),'utf8')
const recovery=await readFile(new URL('../scripts/recover-owner-emails.sql',import.meta.url),'utf8')
async function setup() {
 const db=new PGlite()
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
 await db.exec(base.split('-- CRON_SETUP:')[0]);await db.exec(migration)
 await db.exec(`create table public.beatfirst_preview_attempts(user_id text);create table public.trainer_scores(account text);create table public.attendance_enrollments(google_sub text,email text);create table public.attendance_attempts(google_sub text,actor_email text);`)
 return db
}
const count=async (db,table)=>Number((await db.query('select count(*) as n from '+table)).rows[0].n)
test('exact unique historical recovery preserves directory timestamps and rejects conflicts and near-ID guesses',async()=>{
 const db=await setup()
 try {
 await db.exec(`select owner_directory_record_signin('google:owner','owner@example.invalid');insert into beatfirst_preview_attempts values('google:a'),('google:b'),('google:unknown');insert into attendance_enrollments values('a',' A@EXAMPLE.INVALID '),('google:b','b@example.invalid'),('unknown-near','guess@example.invalid');insert into attendance_attempts values('google:a','a@example.invalid');`)
 const before=(await db.query('select * from owner_account_directory')).rows
 await db.exec(recovery)
 assert.equal(await count(db,'owner_account_email_matches'),2);assert.deepEqual((await db.query('select * from owner_account_directory')).rows,before)
 const matches=(await db.query('select user_id,email from owner_account_email_matches order by user_id')).rows
 assert.deepEqual(matches,[{user_id:'google:a',email:'a@example.invalid'},{user_id:'google:b',email:'b@example.invalid'}])
 const dates=(await db.query('select user_id,matched_at,expires_at from owner_account_email_matches order by user_id')).rows
 await db.exec(recovery);assert.deepEqual((await db.query('select user_id,matched_at,expires_at from owner_account_email_matches order by user_id')).rows,dates)
 await db.exec(`insert into attendance_attempts values('b','conflict@example.invalid')`)
 await assert.rejects(db.exec(recovery),/Ambiguous/);await db.exec('rollback')
 }finally{await db.close()}
})
test('deletion and expiry permanently suppress historical recovery while real future sign-in remains valid',async()=>{
 const db=await setup()
 try {
 await db.exec(`insert into beatfirst_preview_attempts values('google:a'),('google:b'),('google:c');insert into attendance_enrollments values('a','a@example.invalid'),('b','b@example.invalid'),('c','c@example.invalid');`)
 await db.exec(recovery)
 await db.exec(`set role service_role;select owner_directory_erase_account('google:a');reset role;`)
 await db.exec(recovery);assert.equal((await db.query(`select count(*) as n from owner_account_email_matches where user_id='google:a'`)).rows[0].n,0)
 await db.exec(`update owner_account_email_matches set matched_at=now()-interval '91 days',expires_at=now()-interval '1 day' where user_id='google:b';select owner_directory_purge_expired();`)
 await db.exec(recovery);assert.equal(await count(db,'owner_account_email_matches'),1)
 await db.exec(`select owner_directory_record_signin('google:c','current@example.invalid')`)
 assert.equal(await count(db,'owner_account_email_matches'),0)
 await db.exec(recovery);assert.equal(await count(db,'owner_account_email_matches'),0)
 await db.exec(`select owner_directory_record_signin('google:a','new@example.invalid')`)
 assert.equal(await count(db,'owner_account_directory'),2)
 assert.equal(await count(db,'owner_email_recovery_exclusions'),3)
 assert.ok((await db.query('select account_hash from owner_email_recovery_exclusions')).rows.every(x=>/^[a-f0-9]{64}$/.test(x.account_hash)))
 }finally{await db.close()}
})
test('recovery data and mutation functions remain inaccessible to browser roles',async()=>{
 const db=await setup()
 try {
 for(const role of ['anon','authenticated']) {
 await db.exec('set role '+role)
 for(const q of ['select * from owner_account_email_matches','select * from owner_email_recovery_exclusions',`select owner_directory_erase_account('google:a')`])await assert.rejects(db.exec(q),/permission denied/)
 await db.exec('reset role')
 }
 const rows=(await db.query(`select relrowsecurity from pg_class where relname in ('owner_account_email_matches','owner_email_recovery_exclusions')`)).rows
 assert.equal(rows.length,2);assert.ok(rows.every(r=>r.relrowsecurity))
 }finally{await db.close()}
})

test('an expired directory row cannot become a historical match before cleanup creates its marker',async()=>{
 const db=await setup()
 try {
 await db.exec(`select owner_directory_record_signin('google:expired','old@example.invalid');insert into beatfirst_preview_attempts values('google:expired');insert into attendance_enrollments values('expired','old@example.invalid');update owner_account_directory set first_sign_in_at=now()-interval '100 days',last_sign_in_at=now()-interval '91 days',expires_at=now()-interval '1 day';`)
 await db.exec(recovery);assert.equal(await count(db,'owner_account_email_matches'),0)
 await db.exec('select owner_directory_purge_expired()');await db.exec(recovery)
 assert.equal(await count(db,'owner_account_email_matches'),0)
 }finally{await db.close()}
})
