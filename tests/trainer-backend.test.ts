import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { timingResult, cleanName, googlePhoto, emailAddress, readBody, SCORING } from '../src/lib/trainer/validation'
const migration = new URL('../supabase/migrations/20261003230505_trainer_production.sql', import.meta.url)
const take = (n: number) => `local-00000000-0000-0000-0000-${n.toString(16).padStart(12, '0')}`
const id = (n: number) => n.toString(16).padStart(32, '0')
const hash = (n: number) => n.toString(16).padStart(64, '0')
const revision = { current_version: 4, current_reference_hash: hash(1) }
const base = { lesson: 'marching', version: 4, reference_hash: hash(1), scoring: SCORING }

test('timing and profile validation reject spoofed or malformed inputs', async () => {
  const data = { take: take(1), aligned: true, deltas: [0,67,68,100,101,150,151,...Array(9).fill(null)] }
  assert.deepEqual(timingResult(data), { score: 50, measured: 7, onbeat: 2 })
  for (const deltas of [Array(16).fill(null), Array(16).fill(true), Array(16).fill(NaN), Array(15).fill(0), Array(16).fill(301)]) assert.throws(() => timingResult({ ...data, deltas }))
  assert.throws(() => timingResult({ ...data, aligned: false }))
  assert.throws(() => cleanName('user@example.com', true))
  assert.equal(cleanName('  A   B  ', true), 'A B')
  assert.equal(googlePhoto('https://evilgoogleusercontent.com/x'), '')
  assert.equal(googlePhoto('https://lh3.googleusercontent.com/x'), 'https://lh3.googleusercontent.com/x')
  for (const address of ['a..b@x.com','a@-x.com','a@x.com\nb@x.com','a@x.com,b@x.com']) assert.throws(() => emailAddress(address))
  assert.equal(emailAddress(' A@Example.com '), 'a@example.com')
  await assert.rejects(readBody(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ x: 'x'.repeat(100) }) }), 30))
})

test('Postgres RPC: empty start, atomic rewards, idempotence, revision/evidence rules, email limits and browser isolation', async () => {
  const db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  await db.exec(await readFile(migration, 'utf8'))
  async function rpc(action: string, actor: string, payload: Record<string, unknown>) {
    const out = await db.query<{ result: Record<string, unknown> }>('select public.trainer_mutate($1,$2,$3::jsonb) as result', [action, actor, JSON.stringify(payload)])
    return out.rows[0].result
  }
  async function create(n: number, sender = 'google:alice') {
    return rpc('create', sender, { id: id(n), take: take(n), ...base, name: 'Alice', score: 100, measured: 16 })
  }
  async function accept(n: number, recipient = 'google:bob') { return rpc('accept', recipient, { id: id(n), ...revision, name: 'Bob' }) }
  function evidence(n: number) { return { id: id(n), ...base, ...revision, take: take(n+100), video_hash: hash(n+100), aligned: true, deltas: Array(16).fill(0), source: 'browser-recording', completed: true, interrupted: false, created_at: Date.now()+1000 } }
  try {
    assert.equal((await db.query<{ n: number }>('select count(*)::int as n from trainer_challenge_completions')).rows[0].n, 0)
    await create(1)
    assert.equal((await create(1)).existing, true)
    assert.equal((await accept(1, 'google:alice')).status, 409)
    assert.equal((await rpc('complete','google:bob', evidence(1))).status, 409)
    await accept(1)
    for (const patch of [{ source: 'upload' }, { interrupted: true }, { completed: false }, { created_at: 0 }, { created_at: Date.now()+900000 }, { deltas: Array(15).fill(0) }, { deltas: Array(16).fill(true) }, { deltas: Array(16).fill(null) }, { aligned: false }, { video_hash: 'wrong' }]) {
      assert.equal((await rpc('complete', 'google:bob', { ...evidence(1), ...patch })).status, 422)
    }
    assert.equal((await rpc('complete', 'google:bob', { ...evidence(1), reference_hash: hash(2) })).status, 409)
    const simultaneous = await Promise.all(Array.from({length:8}, () => rpc('complete','google:bob', evidence(1))))
    assert.ok(simultaneous.every(x => x.points===100))
    assert.equal((await db.query<{ n: number }>('select count(*)::int as n from trainer_challenge_completions')).rows[0].n, 1)
    for (const [n, reward] of [[2,50],[3,25],[4,10],[5,10]]) {
      await create(n); await accept(n)
      if (n===2) {
        assert.equal((await rpc('complete','google:bob',{ ...evidence(n), take: take(101) })).status, 409)
        assert.equal((await rpc('complete','google:bob',{ ...evidence(n), video_hash: hash(101) })).status, 409)
      }
      assert.equal((await rpc('complete','google:bob', evidence(n))).points, reward)
    }
    await create(6,'google:bob'); await accept(6,'google:alice')
    assert.equal((await rpc('complete','google:alice', evidence(6))).points, 10, 'pair rewards are symmetric')
    assert.equal((await db.query<{ balance: number }>("select sum(points)::int as balance from trainer_challenge_completions where sender='google:alice' or recipient='google:alice'")).rows[0].balance, 205)
    const summary = (await db.query<{ r: { points: number; rewards: unknown[] } }>("select trainer_rewards('google:alice') as r")).rows[0].r
    assert.equal(summary.points,205); assert.equal(summary.rewards.length,6)
    await create(7)
    assert.equal((await rpc('accept','google:bob',{id:id(7), ...revision,current_version:3})).status,409)
    await db.query('update trainer_challenges set expires=0 where id=$1',[id(7)])
    assert.equal((await accept(7)).status,410)
    assert.equal((await rpc('complete','google:bob', {id:id(1)})).points,100,'completed retries remain safe without fresh evidence')
    const reserve = (recipient: string, n = 1, sender = 'google:alice') => rpc('email_reserve', sender, { id: id(n), ...revision, recipient_hash: recipient, reservation: id(1000+n), message: { to: ['friend@example.com'], text:'Original' } })
    assert.equal((await reserve(hash(20),1,'google:mallory')).status,403)
    const first = await reserve(hash(20)); assert.equal(first.reservation,id(1001))
    assert.equal((await reserve(hash(20))).status,202)
    await db.query('update trainer_email_invites set lease_until=0 where id=$1',[id(1001)])
    assert.deepEqual((await reserve(hash(20))).payload,{to:['friend@example.com'],text:'Original'})
    await db.query("update trainer_email_invites set state='sent',payload=null where id=$1",[id(1001)])
    assert.equal((await reserve(hash(20))).already_sent,true)
    await reserve(hash(20),2); await reserve(hash(20),3)
    assert.equal((await reserve(hash(20),4)).status,429)
    await db.query('update trainer_email_invites set created=0,lease_until=0 where id=$1',[id(1002)])
    assert.equal((await reserve(hash(20),2)).status,409)
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query('select * from trainer_profiles'), /permission denied/)
      await assert.rejects(rpc('accept','google:bob',{id:id(1), ...revision}), /permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    assert.equal((await rpc('accept','google:new',{id:id(1), ...revision,name:'New'})).accepted,true)
    await db.exec('reset role')
    const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname like 'trainer_%' and relkind='r'")
    assert.equal(rls.rows.length,6); assert.ok(rls.rows.every(r => r.relrowsecurity))
  } finally { await db.close() }
})
