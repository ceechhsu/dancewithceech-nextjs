import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('eighteen-level migration keeps saved level 9 scores and private append-only access', async () => {
  const db = new PGlite()
  const insert = (level: number) => db.query(`insert into public.beatfirst_preview_attempts
    (user_id, attempt_id, level_id, score, hits, total, best_streak, completed_at)
    values ('google:migration-test', gen_random_uuid(), $1, 80, 8, 10, 8, now())`, [level])
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
    await db.exec(await readFile(new URL('../supabase/migrations/20260919205437_beatfirst_preview_progress.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('../supabase/migrations/20260919215102_beatfirst_nine_levels.sql', import.meta.url), 'utf8'))
    await insert(9)
    await db.exec(await readFile(new URL('../supabase/migrations/20260919223617_beatfirst_eighteen_levels.sql', import.meta.url), 'utf8'))
    await db.exec('set role service_role')
    for (const level of Array.from({ length: 9 }, (_, i) => i + 10)) await insert(level)
    assert.equal((await db.query('select * from public.beatfirst_preview_attempts')).rows.length, 10)
    assert.equal((await db.query<{ score: number }>('select score from public.beatfirst_preview_attempts where level_id = 9')).rows[0].score, 80)
    for (const level of [0, 19]) await assert.rejects(insert(level), /check constraint/)
    await assert.rejects(db.exec('update public.beatfirst_preview_attempts set score = 100'), /permission denied/)
    await assert.rejects(db.exec('delete from public.beatfirst_preview_attempts'), /permission denied/)
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.exec('select * from public.beatfirst_preview_attempts'), /permission denied/)
      await assert.rejects(insert(9), /permission denied/)
    }
    await db.exec('reset role')
    assert.equal((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = 'beatfirst_preview_attempts'")).rows[0].relrowsecurity, true)
  } finally { await db.close() }
})
