import assert from 'node:assert/strict'
import test from 'node:test'
import type { LeaderboardProfile } from '../src/components/beatfirst-preview/leaderboard-model'
import { createLeaderboardHandlers, LeaderboardNameConflict } from '../src/lib/beatfirst-leaderboard-service'

const origin = 'https://dance.example.test'
const endpoint = `${origin}/api/beatfirst/leaderboard`
const session = { user: { googleSub: 'owner', googleEmailVerified: true } }
const secret = 'SECRET_DATABASE_DETAIL'

class MemoryStore {
  rows = [
    { userId: 'google:owner', displayName: 'Dancer One', score: 100, rank: 1, email: 'private@example.test', savedAt: 'private timestamp' },
    { userId: 'google:other', displayName: 'Dancer Two', score: 90, rank: 2 },
  ]
  profiles = new Map<string, LeaderboardProfile>()
  reads: number[] = []
  profileReads: string[] = []
  writes: { userId: string; profile: LeaderboardProfile }[] = []
  fail = ''
  async top(levelId: number) {
    if (this.fail === 'top') throw new Error(secret)
    this.reads.push(levelId)
    return this.rows
  }
  async profile(userId: string) {
    if (this.fail === 'profile') throw new Error(secret)
    this.profileReads.push(userId)
    return this.profiles.get(userId) ?? null
  }
  async saveProfile(userId: string, profile: LeaderboardProfile) {
    if (this.fail === 'save') throw new Error(secret)
    this.writes.push({ userId, profile })
    this.profiles.set(userId, profile)
    return profile
  }
}

async function setup(authSession: unknown = session, store = new MemoryStore()) {
  let storeLoads = 0
  return {
    store, storeLoads: () => storeLoads,
    handlers: createLeaderboardHandlers({ getSession: async () => authSession, getStore: () => { storeLoads++; return store } }),
  }
}

function post(body: unknown = { displayName: 'Dancer One', listed: true }) {
  return new Request(endpoint, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-beatfirst-owner': 'google:owner' }, body: JSON.stringify(body),
  })
}

test('anonymous GET is public, uncached and exposes only chosen names, scores and ranks', async () => {
  const { handlers, store } = await setup(null)
  const response = await handlers.GET(new Request(`${endpoint}?level=18&userId=google:owner`))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await response.json(), { levelId: 18, profile: null, entries: [
    { displayName: 'Dancer One', score: 100, rank: 1, isYou: false },
    { displayName: 'Dancer Two', score: 90, rank: 2, isYou: false },
  ] })
  assert.deepEqual(store.reads, [18])
  assert.deepEqual(store.profileReads, [])
})

test('verified GET includes only the session owner profile and own-row marker', async () => {
  const { handlers, store } = await setup()
  store.profiles.set('google:owner', { displayName: 'Dancer One', listed: false })
  const response = await handlers.GET(new Request(`${endpoint}?level=1`, { headers: { 'x-beatfirst-owner': 'google:owner' } }))
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.deepEqual(data.profile, { displayName: 'Dancer One', listed: false })
  assert.deepEqual(data.entries.map((row: { isYou: boolean }) => row.isYou), [true, false])
  assert.deepEqual(store.profileReads, ['google:owner'])
  assert.doesNotMatch(JSON.stringify(data), /google:|private|timestamp|email|userId/)
})

test('invalid levels return 400 before authentication or database access', async () => {
  const handlers = createLeaderboardHandlers({ getSession: async () => { throw new Error('should not authenticate') }, getStore: () => { throw new Error('should not open database') } })
  for (const suffix of ['', '?level=0', '?level=19', '?level=1.5', '?level=01', '?level=NaN']) assert.equal((await handlers.GET(new Request(endpoint + suffix))).status, 400)
})

test('GET optional owner headers reject stale signed-in and signed-out requests', async () => {
  for (const authSession of [session, null]) {
    const { handlers, storeLoads } = await setup(authSession)
    assert.equal((await handlers.GET(new Request(`${endpoint}?level=1`, { headers: { 'x-beatfirst-owner': 'google:other' } }))).status, 409)
    assert.equal(storeLoads(), 0)
  }
})

test('POST requires a verified Google session while unverified GET remains public', async () => {
  for (const authSession of [null, { user: { email: 'private@example.test' } }, { user: { googleSub: 'owner', googleEmailVerified: false } }]) {
    const { handlers, storeLoads } = await setup(authSession)
    assert.equal((await handlers.POST(post())).status, 401)
    assert.equal(storeLoads(), 0)
    const data = await (await handlers.GET(new Request(`${endpoint}?level=1`))).json()
    assert.equal(data.profile, null)
    assert.ok(data.entries.every((row: { isYou: boolean }) => row.isYou === false))
  }
})

test('POST writes normalized public profile only for the session owner', async () => {
  const { handlers, store } = await setup()
  const response = await handlers.POST(post({ displayName: '  My   Name_2.-  ', listed: false }))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await response.json(), { profile: { displayName: 'My Name_2.-', listed: false } })
  assert.deepEqual(store.writes, [{ userId: 'google:owner', profile: { displayName: 'My Name_2.-', listed: false } }])
})

test('POST requires the exact owner, same Origin and application/json', async () => {
  const { handlers, storeLoads } = await setup()
  for (const value of [null, 'google:other']) {
    const request = post()
    if (value === null) request.headers.delete('x-beatfirst-owner')
    else request.headers.set('x-beatfirst-owner', value)
    assert.equal((await handlers.POST(request)).status, 409)
  }
  for (const value of [null, 'null', 'https://other.example.test']) {
    const request = post()
    if (value === null) request.headers.delete('origin')
    else request.headers.set('origin', value)
    assert.equal((await handlers.POST(request)).status, 403)
  }
  for (const value of [null, 'text/plain', 'application/x-www-form-urlencoded']) {
    const request = post()
    if (value === null) request.headers.delete('content-type')
    else request.headers.set('content-type', value)
    assert.equal((await handlers.POST(request)).status, 400)
  }
  assert.equal(storeLoads(), 0)
})

test('invalid names, listing flags, extra fields and malformed bodies never reach the store', async () => {
  const { handlers, storeLoads } = await setup()
  for (const body of [null, [], {}, 'hi', { displayName: 'Ok Name' }, { displayName: 'Ok Name', listed: 'true' },
    { displayName: 'ab', listed: true }, { displayName: 'a@b.com', listed: true }, { displayName: '<script>', listed: true },
    { displayName: 'Name', listed: true, userId: 'google:other' }, { displayName: 'Name', listed: true, score: 100 }]) {
    assert.equal((await handlers.POST(post(body))).status, 400)
  }
  const headers = post().headers
  for (const body of ['{broken', '', 'null']) assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers, body }))).status, 400)
  assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers }))).status, 400)
  assert.equal((await handlers.POST(new Request(endpoint, { method: 'POST', headers, body: new Uint8Array([0xff, 0xfe]) }))).status, 400)
  assert.equal(storeLoads(), 0)
})

test('a 4096-byte stream limit stops forged and missing content-length bodies', async () => {
  for (const length of [null, '1']) {
    const { handlers, storeLoads } = await setup()
    let canceled = false
    let chunks = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) { chunks++; controller.enqueue(new TextEncoder().encode('é'.repeat(1000))) },
      cancel() { canceled = true },
    })
    const headers = post().headers
    if (length) headers.set('content-length', length)
    const request = new Request(endpoint, { method: 'POST', headers, body, duplex: 'half' } as RequestInit & { duplex: 'half' })
    assert.equal((await handlers.POST(request)).status, 400)
    assert.equal(canceled, true)
    assert.ok(chunks <= 4)
    assert.equal(storeLoads(), 0)
  }
  const { handlers, storeLoads } = await setup()
  const request = post()
  request.headers.set('content-length', '4097')
  assert.equal((await handlers.POST(request)).status, 400)
  assert.equal(storeLoads(), 0)
})

test('case-insensitive name conflicts return a useful 409 without database detail', async () => {
  const store = new MemoryStore()
  store.saveProfile = async () => { throw new LeaderboardNameConflict() }
  const handlers = createLeaderboardHandlers({ getSession: async () => session, getStore: () => store })
  const response = await handlers.POST(post())
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /name.*taken/i)
})

test('session, read, write and configuration failures return safe uncached 503 responses', async () => {
  const failing = [
    createLeaderboardHandlers({ getSession: async () => { throw new Error(secret) }, getStore: () => new MemoryStore() }),
    createLeaderboardHandlers({ getSession: async () => session, getStore: () => { throw new Error(secret) } }),
  ]
  for (const handlers of failing) for (const response of [await handlers.GET(new Request(`${endpoint}?level=1`)), await handlers.POST(post())]) {
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.doesNotMatch(await response.text(), /SECRET/)
  }
  for (const failure of ['top', 'profile', 'save']) {
    const { handlers, store } = await setup()
    store.fail = failure
    const response = failure === 'save' ? await handlers.POST(post()) : await handlers.GET(new Request(`${endpoint}?level=1`))
    assert.equal(response.status, 503)
    assert.doesNotMatch(await response.text(), /SECRET/)
  }
})
