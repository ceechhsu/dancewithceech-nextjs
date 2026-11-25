// A disposable REST adapter for the actual BeatFirst migrations. All data is fictional.
import { createServer } from 'node:http'
import { once } from 'node:events'
import { readdir, readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const migrations = new URL('../../supabase/migrations/', import.meta.url)
const serviceKey = 'beatfirst-disposable-local-fixture'
export const returningSubject = 'beatfirst-returning-fixture'
export const guestSubject = 'beatfirst-former-guest-fixture'

const restPrefix = '/rest/v1/'
const attemptTable = `${restPrefix}beatfirst_preview_attempts`
const profileTable = `${restPrefix}beatfirst_leaderboard_profiles`
const rewardFunction = `${restPrefix}rpc/beatfirst_check_in`
const leaderboardFunction = `${restPrefix}rpc/beatfirst_level_top_ten`

async function readJson(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 500_000) throw Error('Fixture request too large')
  }
  return JSON.parse(raw)
}

function json(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify(value))
}

export async function startBeatFirstAccountFixture() {
  const db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  const beatfirstFiles = (await readdir(migrations)).filter(name => /^\d{14}_beatfirst_.+\.sql$/.test(name)).sort()
  for (const name of beatfirstFiles) await db.exec(await readFile(new URL(name, migrations), 'utf8'))
  const owner = `google:${returningSubject}`
  await db.query(`insert into public.beatfirst_preview_attempts
    (user_id, attempt_id, level_id, score, hits, total, best_streak, completed_at)
    values ($1, 'd347b1bc-e77b-4416-ac88-585abd567c70', 6, 92, 26, 27, 25, now() - interval '10 days')`, [owner])
  await db.query(`insert into public.beatfirst_daily_check_ins (user_id, check_in_date)
    select $1, (statement_timestamp() at time zone 'America/Los_Angeles')::date - day
    from (values (2), (1)) as previous(day)`, [owner])
  await db.exec('set role service_role')

  const server = createServer(async (request, response) => {
    try {
      if (request.headers.apikey !== serviceKey || request.headers.authorization !== `Bearer ${serviceKey}`) {
        return json(response, 401, { message: 'Fixture service key required.' })
      }
      const { pathname, searchParams } = new URL(request.url, 'http://127.0.0.1')
      const ownerQuery = searchParams.get('user_id')
      const userId = ownerQuery?.startsWith('eq.') ? ownerQuery.slice(3) : null
      if (pathname === attemptTable && request.method === 'GET' && userId) {
        const offset = Number(searchParams.get('offset') ?? 0)
        const limit = Number(searchParams.get('limit') ?? 1000)
        const { rows } = await db.query(`select attempt_id, level_id, score, hits, total, best_streak, completed_at
          from public.beatfirst_preview_attempts where user_id = $1
          order by saved_at, attempt_id offset $2 limit $3`, [userId, offset, limit])
        return json(response, 200, rows)
      }
      if (pathname === attemptTable && request.method === 'POST') {
        const body = await readJson(request)
        await db.query(`insert into public.beatfirst_preview_attempts
          (user_id, attempt_id, level_id, score, hits, total, best_streak, completed_at)
          select user_id, attempt_id, level_id, score, hits, total, best_streak, completed_at
          from json_to_recordset($1::json) as attempt (
            user_id text, attempt_id uuid, level_id smallint, score smallint, hits integer,
            total integer, best_streak integer, completed_at timestamptz
          ) on conflict (user_id, attempt_id) do nothing`, [JSON.stringify(body)])
        response.writeHead(201)
        return response.end()
      }
      if (pathname === rewardFunction && request.method === 'POST') {
        const { p_user_id, p_claim = false } = await readJson(request)
        const { rows } = await db.query(`select points::integer, current_streak, best_streak,
          check_in_date::text, checked_in_today, check_in_awarded, restarted
          from public.beatfirst_check_in($1, $2)`, [p_user_id, p_claim])
        return json(response, 200, request.headers.accept === 'application/vnd.pgrst.object+json' ? rows[0] : rows)
      }
      if (pathname === profileTable && request.method === 'GET' && userId) {
        const { rows } = await db.query(`select display_name, listed from public.beatfirst_leaderboard_profiles
          where user_id = $1`, [userId])
        return json(response, 200, rows)
      }
      if (pathname === leaderboardFunction && request.method === 'POST') {
        const { p_level_id } = await readJson(request)
        const { rows } = await db.query(`select user_id, display_name, score, rank::integer
          from public.beatfirst_level_top_ten($1)`, [p_level_id])
        return json(response, 200, rows)
      }
      return json(response, 404, { message: `Unhandled fixture request ${request.method} ${pathname}.` })
    } catch (error) {
      return json(response, 400, { code: error.code || 'P0001', message: error.message })
    }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    db, serviceKey, url: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      await db.close()
    },
  }
}
