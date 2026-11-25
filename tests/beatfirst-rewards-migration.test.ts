import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const migrations = new URL('../supabase/migrations/', import.meta.url)
const attemptMigrations = [
  '20260919205437_beatfirst_preview_progress.sql',
  '20260919215102_beatfirst_nine_levels.sql',
  '20260919223617_beatfirst_eighteen_levels.sql',
]

async function migrateRewards(db: PGlite) {
  const names = (await readdir(migrations)).filter(name => name.endsWith('_beatfirst_rewards.sql'))
  assert.equal(names.length, 1, 'one BeatFirst rewards migration must exist')
  await db.exec(await readFile(new URL(names[0], migrations), 'utf8'))
}

async function database() {
  const db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  for (const name of attemptMigrations) await db.exec(await readFile(new URL(name, migrations), 'utf8'))
  return db
}

type Rewards = {
  points: number
  current_streak: number
  best_streak: number
  check_in_date: string
  checked_in_today: boolean
  check_in_awarded: boolean
  restarted: boolean
}

async function rewards(db: PGlite, user: string, claim = false) {
  const { rows } = await db.query<Rewards>(`select points::integer, current_streak, best_streak,
    check_in_date::text, checked_in_today, check_in_awarded, restarted
    from public.beatfirst_check_in($1, $2)`, [user, claim])
  assert.equal(rows.length, 1)
  return rows[0]
}

function attempt(db: PGlite, user: string, score: number, level: number, id = randomUUID()) {
  return db.query(`insert into public.beatfirst_preview_attempts
    (user_id, attempt_id, level_id, score, hits, total, best_streak, completed_at)
    values ($1,$2,$3,$4,8,10,8,now()) on conflict (user_id, attempt_id) do nothing`, [user, id, level, score])
}

function priorCheckIns(db: PGlite, user: string, daysAgo: number[]) {
  return db.query(`insert into public.beatfirst_daily_check_ins (user_id, check_in_date)
    select $1, (statement_timestamp() at time zone 'America/Los_Angeles')::date - day
    from unnest($2::integer[]) as day`, [user, daysAgo])
}

test('existing authoritative rounds and first passes get credit without rewriting progress', async () => {
  const db = await database()
  try {
    const player = 'google:legacy'
    const id = randomUUID()
    await attempt(db, player, 79, 6, id)
    await attempt(db, player, 80, 7)
    await attempt(db, player, 100, 7)
    await attempt(db, player, 90, 18)
    await attempt(db, 'google:other', 100, 1)
    const original = (await db.query('select * from public.beatfirst_preview_attempts order by user_id, attempt_id')).rows
    await migrateRewards(db)
    assert.deepEqual((await db.query('select * from public.beatfirst_preview_attempts order by user_id, attempt_id')).rows, original)

    await db.exec('set role service_role')
    const before = await rewards(db, player)
    assert.equal(before.points, 80)
    assert.equal(before.checked_in_today, false)
    assert.equal(before.current_streak, 0)
    assert.equal(before.best_streak, 0)
    await attempt(db, player, 100, 6, id)
    assert.equal((await rewards(db, player)).points, 80, 'same attempt ID never earns another round or an altered score')
    await attempt(db, player, 80, 6)
    assert.equal((await rewards(db, player)).points, 110)
    await attempt(db, player, 92, 6)
    assert.equal((await rewards(db, player)).points, 120, 'a second passing round earns the round credit only')
    assert.equal((await rewards(db, 'google:other')).points, 30)
  } finally { await db.close() }
})

test('snapshot calls never claim and two same-day claim requests award one bonus per account', async () => {
  const db = await database()
  try {
    await migrateRewards(db)
    await db.exec("set role service_role; set time zone 'Pacific/Kiritimati'")
    const player = 'google:two-devices'
    const expectedDate = (await db.query<{ day: string }>(`select to_char(
      statement_timestamp() at time zone 'America/Los_Angeles', 'YYYY-MM-DD') as day`)).rows[0].day
    const initial = await rewards(db, player)
    assert.deepEqual(initial, {
      points: 0, current_streak: 0, best_streak: 0, check_in_date: expectedDate,
      checked_in_today: false, check_in_awarded: false, restarted: false,
    })
    assert.equal((await db.query('select * from public.beatfirst_check_in($1)', [player])).rows.length, 1)
    assert.equal((await db.query('select * from public.beatfirst_daily_check_ins')).rows.length, 0)

    // PGlite runs these queued requests in one PostgreSQL process. The table's
    // unique constraint is also what serializes same-day inserts across sessions.
    const claims = await Promise.all([rewards(db, player, true), rewards(db, player, true)])
    assert.equal(claims.filter(claim => claim.check_in_awarded).length, 1)
    for (const claim of claims) {
      assert.deepEqual(claim, { ...initial, points: 25, current_streak: 1, best_streak: 1, checked_in_today: true, check_in_awarded: claim.check_in_awarded })
    }
    assert.equal((await rewards(db, player)).check_in_awarded, false)
    assert.equal((await db.query('select * from public.beatfirst_daily_check_ins')).rows.length, 1)
    assert.equal((await rewards(db, 'google:other', true)).points, 25)
  } finally { await db.close() }
})

test('yesterday stays active and a missed date starts a new streak while keeping the best', async () => {
  const db = await database()
  try {
    await migrateRewards(db)
    await priorCheckIns(db, 'google:building', [3, 2, 1])
    await priorCheckIns(db, 'google:back', [8, 7, 6, 5, 3, 2])
    await db.exec('set role service_role')

    const eligible = await rewards(db, 'google:building')
    assert.deepEqual([eligible.points, eligible.current_streak, eligible.best_streak, eligible.checked_in_today], [75, 3, 3, false])
    const continued = await rewards(db, 'google:building', true)
    assert.deepEqual([continued.points, continued.current_streak, continued.best_streak, continued.restarted], [100, 4, 4, false])

    const missed = await rewards(db, 'google:back')
    assert.deepEqual([missed.points, missed.current_streak, missed.best_streak, missed.restarted], [150, 0, 4, false])
    const returned = await rewards(db, 'google:back', true)
    assert.deepEqual([returned.points, returned.current_streak, returned.best_streak, returned.restarted], [175, 1, 4, true])
    assert.deepEqual(await rewards(db, 'google:back'), { ...returned, check_in_awarded: false })
  } finally { await db.close() }
})

test('the rewards table and invoker function are service-role only and append-only', async () => {
  const db = await database()
  try {
    await migrateRewards(db)
    const { rows: [table] } = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class
      where oid = 'public.beatfirst_daily_check_ins'::regclass`)
    assert.equal(table.relrowsecurity, true)
    const { rows: [procedure] } = await db.query<{ prosecdef: boolean; proconfig: string[] }>(`select prosecdef, proconfig from pg_proc
      where oid = 'public.beatfirst_check_in(text,boolean)'::regprocedure`)
    assert.equal(procedure.prosecdef, false)
    assert.ok(procedure.proconfig.some(setting => setting.startsWith('search_path=')))
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(rewards(db, 'google:private', true), /permission denied/)
      await assert.rejects(db.exec('select * from public.beatfirst_daily_check_ins'), /permission denied/)
      await assert.rejects(priorCheckIns(db, 'google:private', [1]), /permission denied/)
    }
    await db.exec('set role service_role')
    assert.equal((await rewards(db, 'google:private', true)).points, 25)
    await assert.rejects(db.exec('delete from public.beatfirst_daily_check_ins'), /permission denied/)
    await assert.rejects(db.exec('update public.beatfirst_daily_check_ins set check_in_date = current_date'), /permission denied/)
  } finally { await db.close() }
})
