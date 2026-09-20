import assert from 'node:assert/strict'
import test from 'node:test'
import { progressRequest } from '../src/components/beatfirst-preview/progress-request'
import { beatFirstRoutes, progressApiEnabled } from '../src/components/beatfirst-preview/routes'
import { signOutAfterAttendanceCleanup } from '../src/components/beatfirst-preview/logout'
import { createProgressHandlers } from '../src/lib/beatfirst-progress-service'

test('public page and progress paths are the default; preview paths remain explicit', () => {
  assert.deepEqual(beatFirstRoutes(), { pagePath: '/beat-first', progressPath: '/api/beatfirst/progress' })
  assert.deepEqual(beatFirstRoutes(false), { pagePath: '/beat-first', progressPath: '/api/beatfirst/progress' })
  assert.deepEqual(beatFirstRoutes(true), { pagePath: '/beat-first/preview', progressPath: '/api/beatfirst-preview/progress' })
})

test('progress requests use the public endpoint by default', async () => {
  const requested: unknown[] = []
  const fetcher: typeof fetch = async (url, options) => {
    requested.push([url, options?.method ?? 'GET'])
    return Response.json({ attemptCount: 0 })
  }
  await progressRequest({}, fetcher)
  await progressRequest({ method: 'POST', body: '{}' }, fetcher)
  assert.deepEqual(requested, [['/api/beatfirst/progress', 'GET'], ['/api/beatfirst/progress', 'POST']])
})

test('progress requests preserve an explicitly selected endpoint for reads and saves', async () => {
  const requested: unknown[] = []
  const fetcher: typeof fetch = async (url, options) => {
    requested.push([url, options?.method ?? 'GET'])
    return Response.json({ acceptedIds: [] })
  }
  await progressRequest({}, fetcher, 100, '/api/beatfirst-preview/progress')
  await progressRequest({ method: 'POST', body: '{}' }, fetcher, 100, '/api/beatfirst-preview/progress')
  await progressRequest({}, fetcher, 100, '/api/beatfirst/progress')
  assert.deepEqual(requested, [['/api/beatfirst-preview/progress', 'GET'], ['/api/beatfirst-preview/progress', 'POST'], ['/api/beatfirst/progress', 'GET']])
})

test('production public progress authenticates requests while preview refuses them before authentication', async () => {
  for (const preview of [false, true]) {
    let authentications = 0
    let storeLoads = 0
    const handlers = createProgressHandlers({
      isEnabled: () => progressApiEnabled(preview, 'production'),
      getSession: async () => { authentications++; return null },
      getStore: () => { storeLoads++; throw new Error('Unauthorized requests must not open the store') },
    })
    const url = `https://dance.example.test${preview ? '/api/beatfirst-preview/progress' : '/api/beatfirst/progress'}`
    assert.equal((await handlers.GET(new Request(url))).status, preview ? 404 : 401)
    assert.equal((await handlers.POST(new Request(url, { method: 'POST' }))).status, preview ? 404 : 401)
    assert.equal(authentications, preview ? 0 : 2)
    assert.equal(storeLoads, 0)
  }
})

test('preview progress remains available in local, development, and preview environments', () => {
  for (const environment of [undefined, '', 'development', 'preview']) {
    assert.equal(progressApiEnabled(true, environment), true)
    assert.equal(progressApiEnabled(false, environment), true)
  }
  assert.equal(progressApiEnabled(true, 'unexpected'), false)
})

test('logout waits for normalized attendance cleanup before it signs out', async () => {
  const actions: string[] = []
  let finishCleanup!: () => void
  const cleanupFinished = new Promise<void>(resolve => { finishCleanup = resolve })
  const logout = signOutAfterAttendanceCleanup(' Instructor@Example.test ', async () => { actions.push('signed out') }, async (owner: string) => {
    actions.push(`cleaning ${owner}`)
    await cleanupFinished
    actions.push('cleaned')
  })
  await Promise.resolve()
  assert.deepEqual(actions, ['cleaning instructor@example.test'])
  finishCleanup()
  await logout
  assert.deepEqual(actions, ['cleaning instructor@example.test', 'cleaned', 'signed out'])
})

test('pending attendance or failed cleanup blocks logout with actionable guidance', async () => {
  for (const failure of [new Error('Sync or explicitly discard pending attendance changes before signing out.'), new Error('Storage unavailable')]) {
    let signedOut = false
    await assert.rejects(signOutAfterAttendanceCleanup('instructor@example.test', async () => { signedOut = true }, async () => { throw failure }), /sync or discard pending attendance changes/i)
    assert.equal(signedOut, false)
  }
})

test('an account without an attendance email can sign out without touching attendance storage', async () => {
  let signedOut = false
  await signOutAfterAttendanceCleanup(null, async () => { signedOut = true }, async () => { assert.fail('There is no attendance owner to clear') })
  assert.equal(signedOut, true)
})
