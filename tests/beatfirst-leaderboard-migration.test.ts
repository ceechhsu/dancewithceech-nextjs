import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migrations = [
  '20260919205437_beatfirst_preview_progress.sql',
  '20260919215102_beatfirst_nine_levels.sql',
  '20260919223617_beatfirst_eighteen_levels.sql',
  '20260920043626_beatfirst_leaderboard.sql',
]

async function database() {
  const db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  for (const name of migrations) await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'))
  return db
}

const profile = (db: PGlite, user: string, name: string, listed = true) => db.query(
  `insert into public.beatfirst_leaderboard_profiles (user_id, display_name, listed) values ($1,$2,$3)
  on conflict (user_id) do update set display_name = excluded.display_name, listed = excluded.listed`, [user, name, listed])
const attempt = (db: PGlite, user: string, score: number, level = 1, time = '2026-09-19T00:00:00Z', id = randomUUID()) => db.query(
  `insert into public.beatfirst_preview_attempts (user_id,attempt_id,level_id,score,hits,total,best_streak,completed_at,saved_at)
  values ($1,$2,$3,$4,8,10,8,$5,$5) on conflict (user_id,attempt_id) do nothing`, [user, id, level, score, time])
const top = async (db: PGlite, level = 1) => (await db.query<{ user_id: string; display_name: string; score: number; rank: number }>(
  'select * from public.beatfirst_level_top_ten($1)', [level])).rows

test('the migration creates an empty opt-in profile table with row security', async () => {
  const db = await database()
  try {
    const rows = (await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = 'beatfirst_leaderboard_profiles'")).rows
    assert.equal(rows.length, 1, 'the profile table must exist')
    assert.equal(rows[0].relrowsecurity, true)
    assert.equal((await db.query('select * from public.beatfirst_leaderboard_profiles')).rows.length, 0)
  } finally { await db.close() }
})

test('each level shows one best per listed player with shared ranks and stable tied bests', async () => {
  const db = await database()
  try {
    await db.exec('set role service_role')
    for (const [user, name] of [['google:a', 'Alpha'], ['google:b', 'Bravo'], ['google:c', 'Charlie']]) await profile(db, user, name)
    await attempt(db, 'google:a', 90, 1, '2026-09-19T00:00:00Z')
    await attempt(db, 'google:a', 100, 1, '2026-09-19T02:00:00Z')
    await attempt(db, 'google:a', 100, 1, '2026-09-19T03:00:00Z')
    const id = randomUUID()
    await attempt(db, 'google:b', 100, 1, '2026-09-19T01:00:00Z', id)
    await attempt(db, 'google:b', 99, 1, '2026-09-19T00:00:00Z', id)
    await attempt(db, 'google:c', 95)
    await attempt(db, 'google:a', 75, 18)
    assert.deepEqual(await top(db), [
      { user_id: 'google:b', display_name: 'Bravo', score: 100, rank: 1 },
      { user_id: 'google:a', display_name: 'Alpha', score: 100, rank: 1 },
      { user_id: 'google:c', display_name: 'Charlie', score: 95, rank: 3 },
    ])
    assert.deepEqual(await top(db, 18), [{ user_id: 'google:a', display_name: 'Alpha', score: 75, rank: 1 }])
    assert.deepEqual(await top(db, 2), [])
  } finally { await db.close() }
})

test('the top ten cutoff uses first best-score time then owner for ties', async () => {
  const db = await database()
  try {
    await db.exec('set role service_role')
    for (let i = 12; i >= 1; i--) {
      const user = `google:${String(i).padStart(2, '0')}`
      await profile(db, user, `Player ${i}`)
      await attempt(db, user, 100, 1, i === 12 ? '2026-09-18T00:00:00Z' : '2026-09-19T00:00:00Z')
    }
    const rows = await top(db)
    assert.equal(rows.length, 10)
    assert.deepEqual(rows.map(row => row.user_id), ['google:12', ...Array.from({ length: 9 }, (_, i) => `google:0${i + 1}`)])
    assert.ok(rows.every(row => row.rank === 1))
  } finally { await db.close() }
})

test('old bests appear only on opt-in, then improvements, rename and hide are immediate', async () => {
  const db = await database()
  try {
    await db.exec('set role service_role')
    await attempt(db, 'google:old', 80)
    await attempt(db, 'google:no-profile', 100)
    await profile(db, 'google:hidden', 'Hidden', false)
    await attempt(db, 'google:hidden', 100)
    assert.deepEqual(await top(db), [])
    await profile(db, 'google:old', 'Old Player')
    assert.equal((await top(db))[0].score, 80)
    await attempt(db, 'google:old', 90)
    await attempt(db, 'google:old', 50)
    await profile(db, 'google:old', 'New Name')
    assert.deepEqual(await top(db), [{ user_id: 'google:old', display_name: 'New Name', score: 90, rank: 1 }])
    await profile(db, 'google:old', 'New Name', false)
    assert.deepEqual(await top(db), [])
    assert.equal((await db.query('select * from public.beatfirst_preview_attempts')).rows.length, 5)
    await profile(db, 'google:old', 'New Name', true)
    assert.equal((await top(db))[0].score, 90)
  } finally { await db.close() }
})

test('database name rules and case-insensitive reservations survive renaming and hiding', async () => {
  const db = await database()
  try {
    await db.exec('set role service_role')
    for (const name of ['ab', 'A'.repeat(21), ' Abc', 'Abc ', 'Ab  cd', 'a@b.com', '<b>hi</b>', 'Abc\nDef', 'Abc\tDef', '你好呀', 'Abc\u00a0Def', 'Abc\n']) await assert.rejects(profile(db, 'google:bad', name), /check constraint/)
    await profile(db, 'google:one', 'Ceech Hsu_2.-', false)
    await assert.rejects(profile(db, 'google:two', 'ceech hsu_2.-'), /duplicate key/)
    await profile(db, 'google:two', 'Second')
    await assert.rejects(profile(db, 'google:two', 'CEECH HSU_2.-'), /duplicate key/)
    await profile(db, 'google:one', 'Renamed')
    await profile(db, 'google:two', 'ceech hsu_2.-')
    assert.equal((await db.query('select * from public.beatfirst_leaderboard_profiles')).rows.length, 2)
  } finally { await db.close() }
})

test('only service_role can read or upsert profiles and execute the invoker RPC', async () => {
  const db = await database()
  try {
    const functionInfo = (await db.query<{ prosecdef: boolean; proconfig: string[] }>("select prosecdef, proconfig from pg_proc where proname = 'beatfirst_level_top_ten'")).rows[0]
    assert.ok(functionInfo, 'the leaderboard RPC must exist')
    assert.equal(functionInfo.prosecdef, false)
    assert.ok(functionInfo.proconfig.some(value => value.startsWith('search_path=')))
    await db.exec('set role service_role')
    await profile(db, 'google:one', 'One')
    await profile(db, 'google:one', 'One New')
    await attempt(db, 'google:one', 100)
    assert.equal((await top(db)).length, 1)
    await assert.rejects(db.exec('delete from public.beatfirst_leaderboard_profiles'), /permission denied/)
    await assert.rejects(db.exec('truncate public.beatfirst_leaderboard_profiles'), /permission denied/)
    await assert.rejects(db.exec('update public.beatfirst_preview_attempts set score = 90'), /permission denied/)
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(top(db), /permission denied/)
      await assert.rejects(db.exec('select * from public.beatfirst_leaderboard_profiles'), /permission denied/)
      await assert.rejects(profile(db, 'google:intruder', 'Intruder'), /permission denied/)
      await assert.rejects(db.exec('select * from public.beatfirst_preview_attempts'), /permission denied/)
    }
  } finally { await db.close() }
})
