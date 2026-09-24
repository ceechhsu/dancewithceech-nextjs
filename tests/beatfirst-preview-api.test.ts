import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { LEVELS } from '../src/components/beatfirst-preview/levels'
import { scoreAttempt, type Attempt, type AttemptResult } from '../src/components/beatfirst-preview/progress'
import { createProgressHandlers, type ProgressStore } from '../src/lib/beatfirst-progress-service'

const origin = 'https://preview.example.test'
const endpoint = `${origin}/api/beatfirst-preview/progress`
const session = { user: { googleSub: 'owner', googleEmailVerified: true } }

function attempt(levelId = 1, perfect = true): Attempt {
  return {
    id: randomUUID(), levelId, completedAt: new Date().toISOString(),
    taps: perfect ? LEVELS.find(level => level.id === levelId)!.notes.map(note => ({ ...note })) : [],
  }
}

class MemoryStore implements ProgressStore {
  rows = new Map<string, AttemptResult[]>()
  failReads = false
  failWrites = false
  writes = 0

  async list(userId: string) {
    if (this.failReads) throw new Error('private database credential detail')
    return structuredClone(this.rows.get(userId) ?? [])
  }

  async insert(userId: string, results: AttemptResult[]) {
    if (this.failWrites) throw new Error('private database credential detail')
    this.writes++
    const owned = this.rows.get(userId) ?? []
    for (const result of results) if (!owned.some(row => row.id === result.id)) owned.push(structuredClone(result))
    this.rows.set(userId, owned)
  }
}

function setup(store = new MemoryStore(), authSession: unknown = session) {
  let storeLoads = 0
  return {
    store,
    handlers: createProgressHandlers({
      getSession: async () => authSession,
      getStore: () => { storeLoads++; return store },
    }),
    storeLoads: () => storeLoads,
  }
}

function post(attempts: unknown, extra: Record<string, unknown> = {}) {
  return new Request(endpoint, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-beatfirst-owner': 'google:owner' },
    body: JSON.stringify({ attempts, ...extra }),
  })
}

test('GET returns only the verified subject’s summary and prevents caching', async () => {
  const { store, handlers } = setup()
  store.rows.set('google:owner', [scoreAttempt(attempt(1))])
  store.rows.set('google:other', [scoreAttempt(attempt(2))])
  const response = await handlers.GET(new Request(`${endpoint}?userId=google:other`))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  const summary = await response.json()
  assert.equal(summary.attemptCount, 1)
  assert.deepEqual(summary.bestScores, { 1: 100 })
})

test('an empty signed-in account immediately has levels 1 through 6', async () => {
  const { handlers } = setup()
  const response = await handlers.GET(new Request(endpoint))
  assert.equal(response.status, 200)
  const summary = await response.json()
  assert.deepEqual(summary.unlockedLevelIds, [1, 2, 3, 4, 5, 6])
  assert.deepEqual(summary.bestScores, {})
  assert.equal(summary.attemptCount, 0)
})

test('GET and POST reject missing or unverified Google identities before touching the store', async () => {
  for (const authSession of [null, { user: { email: 'owner@example.test' } }, { user: { googleSub: 'owner', googleEmailVerified: false } }]) {
    const { handlers, storeLoads } = setup(new MemoryStore(), authSession)
    assert.equal((await handlers.GET(new Request(endpoint))).status, 401)
    assert.equal((await handlers.POST(post([attempt()]))).status, 401)
    assert.equal(storeLoads(), 0)
  }
})

test('POST replays taps, ignores client score and owner, and saves only result fields', async () => {
  const { store, handlers } = setup()
  const round = attempt(1, false)
  const response = await handlers.POST(post([{ ...round, score: 100, userId: 'google:other' }], { userId: 'google:other' }))
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.deepEqual(result.acceptedIds, [round.id])
  assert.equal(result.bestScores[1], 0)
  const [saved] = store.rows.get('google:owner')!
  assert.equal('taps' in saved, false)
  assert.equal('userId' in saved, false)
  assert.equal(store.rows.has('google:other'), false)
})

test('levels 4, 5, and 6 can each save before any introductions or earlier levels', async () => {
  for (const levelId of [4, 5, 6]) {
    const { handlers } = setup()
    const round = attempt(levelId, false)
    const response = await handlers.POST(post([round]))
    assert.equal(response.status, 200)
    const summary = await response.json()
    assert.deepEqual(summary.acceptedIds, [round.id])
    assert.deepEqual(summary.bestScores, { [levelId]: 0 })
    assert.deepEqual(summary.unlockedLevelIds, [1, 2, 3, 4, 5, 6])
  }
})

test('an ordered batch can pass levels 6 through 17 and immediately play level 18', async () => {
  assert.equal(LEVELS.length, 18)
  const { handlers } = setup()
  const rounds = Array.from({ length: 13 }, (_, index) => attempt(index + 6))
  const response = await handlers.POST(post(rounds))
  assert.equal(response.status, 200)
  const { acceptedIds, ...summary } = await response.json()
  assert.deepEqual(acceptedIds, rounds.map(round => round.id))
  assert.deepEqual(summary.unlockedLevelIds, Array.from({ length: 18 }, (_, index) => index + 1))
  assert.equal(summary.attemptCount, 13)
})

test('a locked round rejects the entire batch before inserting earlier valid rounds', async () => {
  const { store, handlers } = setup()
  const response = await handlers.POST(post([attempt(6, false), attempt(7)]))
  assert.equal(response.status, 403)
  assert.equal(store.writes, 0)
  assert.equal(store.rows.size, 0)
})

test('new account levels reject early or out-of-order submissions before writing', async () => {
  assert.equal(LEVELS.length, 18)
  for (const levelId of [10, 11, 12, 13, 14, 15, 16, 17, 18]) {
    const { store, handlers } = setup()
    assert.equal((await handlers.POST(post([attempt(levelId)]))).status, 403)
    const preceding = Array.from({ length: levelId - 7 }, (_, index) => attempt(index + 6))
    assert.equal((await handlers.POST(post([...preceding, attempt(levelId)]))).status, 403)
    assert.equal(store.writes, 0)
    assert.equal(store.rows.size, 0)
  }
})

test('an idempotent retry cannot change an existing result or unlock a level using changed taps', async () => {
  const { store, handlers } = setup()
  const original = attempt(6, false)
  assert.equal((await handlers.POST(post([original]))).status, 200)
  const changed = { ...attempt(6), id: original.id }
  const retried = await handlers.POST(post([changed]))
  assert.equal(retried.status, 200)
  const result = await retried.json()
  assert.deepEqual(result.acceptedIds, [original.id])
  assert.equal(result.attemptCount, 1)
  assert.equal(result.bestScores[6], 0)
  assert.equal(store.writes, 1)
  assert.equal((await handlers.POST(post([changed, attempt(7)]))).status, 403)
  assert.equal(store.writes, 1)
})

test('lower later attempts never revoke a previously earned unlock', async () => {
  assert.equal(LEVELS.length, 18)
  const { handlers } = setup()
  const gatingIds = Array.from({ length: 12 }, (_, index) => index + 6)
  assert.equal((await handlers.POST(post(gatingIds.map(id => attempt(id))))).status, 200)
  const response = await handlers.POST(post(gatingIds.map(id => attempt(id, false))))
  assert.equal(response.status, 200)
  const summary = await response.json()
  assert.deepEqual(summary.bestScores, Object.fromEntries(gatingIds.map(id => [id, 100])))
  assert.deepEqual(summary.unlockedLevelIds, Array.from({ length: 18 }, (_, index) => index + 1))
  assert.equal(summary.attemptCount, 24)
  assert.equal((await handlers.POST(post([attempt(18)]))).status, 200)
})

test('transient write failure reports a safe error and the same rounds can be retried intact', async () => {
  const { store, handlers } = setup()
  const rounds = [attempt()]
  store.failWrites = true
  const failed = await handlers.POST(post(rounds))
  assert.equal(failed.status, 503)
  assert.doesNotMatch(await failed.text(), /credential|private database/)
  assert.equal(store.rows.size, 0)
  store.failWrites = false
  const retried = await handlers.POST(post(rounds))
  assert.equal(retried.status, 200)
  assert.deepEqual((await retried.json()).acceptedIds, rounds.map(round => round.id))
})

test('database read and configuration failures return 503 without leaking internal detail', async () => {
  const { store, handlers } = setup()
  store.failReads = true
  for (const response of [await handlers.GET(new Request(endpoint)), await handlers.POST(post([attempt()]))]) {
    assert.equal(response.status, 503)
    assert.doesNotMatch(await response.text(), /credential|private database/)
  }
  const unavailable = createProgressHandlers({ getSession: async () => session, getStore: () => { throw new Error('SECRET_KEY=private') } })
  const response = await unavailable.GET(new Request(endpoint))
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /SECRET|private/)
})

test('POST requires the exact same Origin and application/json before reading a body', async () => {
  const { handlers, storeLoads } = setup()
  for (const headerOrigin of [null, 'https://other.example.test', 'null']) {
    const headers = new Headers({ 'content-type': 'application/json', 'x-beatfirst-owner': 'google:owner' })
    if (headerOrigin) headers.set('origin', headerOrigin)
    assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers, body: JSON.stringify({ attempts: [attempt()] }) }))).status, 403)
  }
  assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers: { origin, 'content-type': 'text/plain', 'x-beatfirst-owner': 'google:owner' }, body: '{}' }))).status, 400)
  assert.equal(storeLoads(), 0)
})

test('malformed JSON, invalid taps, duplicate IDs, and batches over 25 do not reach the database', async () => {
  const { handlers, storeLoads } = setup()
  const round = attempt()
  const invalid = [[], null, Array.from({ length: 26 }, () => attempt()), [round, round], [{ ...round, taps: [{ atMs: 20, lane: 1 }] }]]
  for (const rounds of invalid) assert.equal((await handlers.POST(post(rounds))).status, 400)
  assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-beatfirst-owner': 'google:owner' }, body: '{broken' }))).status, 400)
  assert.equal(storeLoads(), 0)
})

test('the byte limit stops an oversized stream even without a truthful content-length', async () => {
  const { handlers, storeLoads } = setup()
  let canceled = false
  let chunks = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { chunks++; controller.enqueue(new TextEncoder().encode('é'.repeat(20_000))) },
    cancel() { canceled = true },
  })
  const request = new Request(endpoint, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'content-length': '1', 'x-beatfirst-owner': 'google:owner' }, body, duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  assert.equal((await handlers.POST(request)).status, 400)
  assert.equal(canceled, true)
  assert.ok(chunks <= 5)
  assert.equal(storeLoads(), 0)
})

test('an account switch rejects another owner’s outbox and mismatched GET headers', async () => {
  const { handlers, storeLoads } = setup()
  for (const headerOwner of [null, 'google:other']) {
    const request = post([attempt()])
    if (headerOwner) request.headers.set('x-beatfirst-owner', headerOwner)
    else request.headers.delete('x-beatfirst-owner')
    const response = await handlers.POST(request)
    assert.equal(response.status, 409)
    assert.match((await response.json()).error, /account changed/i)
  }
  const response = await handlers.GET(new Request(endpoint, { headers: { 'x-beatfirst-owner': 'google:other' } }))
  assert.equal(response.status, 409)
  assert.equal(storeLoads(), 0)
})

test('disabled preview endpoints return 404 before authenticating or opening the database', async () => {
  let authCalls = 0
  let storeLoads = 0
  const handlers = createProgressHandlers({
    isEnabled: () => false,
    getSession: async () => { authCalls++; return session },
    getStore: () => { storeLoads++; return new MemoryStore() },
  })
  assert.equal((await handlers.GET(new Request(endpoint))).status, 404)
  assert.equal((await handlers.POST(post([attempt()]))).status, 404)
  assert.equal(authCalls, 0)
  assert.equal(storeLoads, 0)
})

test('a concurrent low-score duplicate cannot unlock later rounds with different submitted taps', async () => {
  const rounds = [6, 7].map(id => attempt(id))
  class ConcurrentStore extends MemoryStore {
    async insert(userId: string, results: AttemptResult[]) {
      if (!this.rows.has(userId)) this.rows.set(userId, [scoreAttempt({ ...rounds[0], taps: [] })])
      await super.insert(userId, results)
    }
  }
  const { handlers, store } = setup(new ConcurrentStore())
  const response = await handlers.POST(post(rounds))
  assert.equal(response.status, 409)
  assert.equal(store.rows.get('google:owner')!.some(row => row.levelId === 7), false)
  assert.equal(store.rows.get('google:owner')!.find(row => row.levelId === 6)!.score, 0)
})

// Keep the server-only import in its own server-conditioned process, so the ordinary
// test runner can still load client-side tests with React's normal module exports.
function checkServerStore(code: string) {
  execFileSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', '--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    import { createClient } from '@supabase/supabase-js';
    import storeModule from './src/lib/beatfirst-progress-store.ts';
    const { createProgressStore, resolveProgressDatabaseConfig } = storeModule;
    ${code}
  `], { cwd: new URL('..', import.meta.url), stdio: 'pipe' })
}

test('the store selects one complete trimmed environment pair without mixing credentials', () => {
  checkServerStore(`
    const fallback = { NEXT_PUBLIC_SUPABASE_URL: ' https://default.example.test ', SUPABASE_SERVICE_ROLE_KEY: ' default-key ' };
    assert.deepEqual(resolveProgressDatabaseConfig(fallback), { url: 'https://default.example.test', key: 'default-key' });
    const migrated = { ...fallback, SUPABASE_SECRET_KEY: ' new-secret-key ' };
    assert.deepEqual(resolveProgressDatabaseConfig(migrated), { url: 'https://default.example.test', key: 'new-secret-key' });
    const attendance = { ...fallback, ATTENDANCE_SUPABASE_URL: ' https://attendance.example.test ', ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY: ' attendance-key ' };
    assert.deepEqual(resolveProgressDatabaseConfig(attendance), { url: 'https://attendance.example.test', key: 'attendance-key' });
    const beatfirst = { ...attendance, BEATFIRST_SUPABASE_URL: ' https://beatfirst.example.test ', BEATFIRST_SUPABASE_SERVICE_ROLE_KEY: ' beatfirst-key ' };
    assert.deepEqual(resolveProgressDatabaseConfig(beatfirst), { url: 'https://beatfirst.example.test', key: 'beatfirst-key' });
    assert.throws(() => resolveProgressDatabaseConfig({ ...attendance, BEATFIRST_SUPABASE_URL: 'https://beatfirst.example.test' }));
    assert.throws(() => resolveProgressDatabaseConfig({ ...fallback, ATTENDANCE_SUPABASE_URL: 'https://attendance.example.test' }));
    assert.deepEqual(resolveProgressDatabaseConfig({ ...attendance, BEATFIRST_SUPABASE_URL: '  ' }), { url: 'https://attendance.example.test', key: 'attendance-key' });
    assert.throws(() => resolveProgressDatabaseConfig({}));
  `)
})

test('the database adapter loads every owned page after 1,000 rows', () => {
  checkServerStore(`
    let requests = 0;
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      attempt_id: '00000000-0000-4000-8000-' + String(index).padStart(12, '0'), level_id: 1,
      score: 80, hits: 12, total: 15, best_streak: 12, completed_at: '2026-09-19T00:00:00.000Z',
    }));
    const db = createClient('https://database.example.test', 'test-service-role', {
      auth: { persistSession: false },
      global: { fetch: async (input) => {
        const url = new URL(String(input));
        assert.equal(url.pathname, '/rest/v1/beatfirst_preview_attempts');
        assert.equal(url.searchParams.get('user_id'), 'eq.google:owner');
        assert.equal(url.searchParams.get('order'), 'saved_at.asc,attempt_id.asc');
        const offset = Number(url.searchParams.get('offset'));
        const limit = Number(url.searchParams.get('limit'));
        assert.equal(limit, 1000);
        assert.equal(offset, requests * 1000);
        requests++;
        return Response.json(rows.slice(offset, offset + limit));
      } },
    });
    const actual = await createProgressStore(db).list('google:owner');
    assert.equal(requests, 2);
    assert.equal(actual.length, 1001);
    assert.deepEqual(actual[1000], { id: rows[1000].attempt_id, levelId: 1, score: 80, hits: 12, total: 15, bestStreak: 12, completedAt: rows[1000].completed_at });
  `)
})

test('the database adapter ignores conflicts and writes only the verified owner and score results', () => {
  checkServerStore(`
    let requests = 0;
    const result = { id: '00000000-0000-4000-8000-000000000001', levelId: 1, score: 80, hits: 12, total: 15, bestStreak: 12, completedAt: '2026-09-19T00:00:00.000Z' };
    const db = createClient('https://database.example.test', 'test-service-role', {
      auth: { persistSession: false },
      global: { fetch: async (input, init) => {
        requests++;
        const url = new URL(String(input));
        assert.equal(url.searchParams.get('on_conflict'), 'user_id,attempt_id');
        assert.match(new Headers(init.headers).get('prefer'), /resolution=ignore-duplicates/);
        assert.deepEqual(JSON.parse(init.body), [{ user_id: 'google:owner', attempt_id: result.id, level_id: 1, score: 80, hits: 12, total: 15, best_streak: 12, completed_at: result.completedAt }]);
        return new Response(null, { status: 201 });
      } },
    });
    await createProgressStore(db).insert('google:owner', [result]);
    assert.equal(requests, 1);
  `)
})

test('the migration enforces result bounds, unique owned rounds, and private database access', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
    await db.exec(await readFile(new URL('../supabase/migrations/20260919205437_beatfirst_preview_progress.sql', import.meta.url), 'utf8'))
    const tables = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname = 'beatfirst_preview_attempts'")
    assert.equal(tables.rows.length, 1)
    assert.equal(tables.rows[0].relrowsecurity, true)
    const round = attempt()
    const insert = (owner = 'google:owner', score = 100, hits = 15, total = 15, streak = 15, level = 1) => db.query(
      'insert into public.beatfirst_preview_attempts (user_id,attempt_id,level_id,score,hits,total,best_streak,completed_at) values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [owner, round.id, level, score, hits, total, streak, round.completedAt],
    )
    for (const parameters of [
      ['google:owner', 101, 15, 15, 15, 1], ['google:owner', -1, 15, 15, 15, 1],
      ['google:owner', 100, -1, 15, 0, 1], ['google:owner', 100, 16, 15, 15, 1],
      ['google:owner', 100, 15, 15, 16, 1], ['google:owner', 100, 15, 15, -1, 1],
      ['google:owner', 100, 0, 0, 0, 1], ['google:owner', 100, 15, 15, 15, 7],
    ] as [string, number, number, number, number, number][]) await assert.rejects(insert(...parameters), /check constraint/)
    await db.exec('set role service_role')
    await insert()
    await assert.rejects(insert(), /duplicate key/)
    await insert('google:other')
    assert.equal((await db.query('select * from public.beatfirst_preview_attempts')).rows.length, 2)
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query('select * from public.beatfirst_preview_attempts'), /permission denied/)
      await assert.rejects(insert('google:intruder'), /permission denied/)
    }
  } finally {
    await db.close()
  }
})
