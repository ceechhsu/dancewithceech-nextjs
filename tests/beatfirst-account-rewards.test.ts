import assert from 'node:assert/strict'
import { test } from 'node:test'
import { beatFirstAccountsEnabled, beatFirstEngagementEnabled, beatFirstStagingDatabase, beatFirstStagingPathAllowed } from '../src/lib/beatfirst-engagement-config'
import { createProgressHandlers } from '../src/lib/beatfirst-progress-service'
import { includePendingUnlocks, type AttemptResult } from '../src/components/beatfirst-preview/progress'

const host = 'https://stage.example.test'
const owner = 'google:test-user'
const stage = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/beatfirst-engagement-staging' }
const stagingDatabase = { BEATFIRST_STAGING_SUPABASE_URL: 'https://test-db.supabase.co', BEATFIRST_STAGING_SUPABASE_SERVICE_ROLE_KEY: 'test-secret' }
const checkInPath = '/api/beatfirst/progress/check-in'
const existing: AttemptResult = { id: 'legacy', levelId: 6, score: 75, hits: 20, total: 30, bestStreak: 10, completedAt: '2026-11-20T12:00:00.000Z' }

test('the BeatFirst Preview enables gameplay and fails closed on shared or missing database settings', () => {
  const shared = { ATTENDANCE_SUPABASE_URL: 'https://attendance.supabase.co' }
  assert.equal(beatFirstEngagementEnabled(stage), true)
  assert.equal(beatFirstAccountsEnabled({ ...stage, ...shared }), false)
  assert.equal(beatFirstAccountsEnabled({ VERCEL_ENV: 'preview', ...shared }), false)
  assert.equal(beatFirstAccountsEnabled({ VERCEL_TARGET_ENV: 'preview', ...shared }), false)
  assert.equal(beatFirstAccountsEnabled({ BEATFIRST_STAGING_ISOLATION: '1', ...shared }), false)
  assert.equal(beatFirstStagingDatabase({ ...stage, ...shared, ...stagingDatabase, BEATFIRST_STAGING_SUPABASE_URL: shared.ATTENDANCE_SUPABASE_URL }), null)
  assert.equal(beatFirstStagingDatabase({ ...stage, ...stagingDatabase, NEXT_PUBLIC_SUPABASE_URL: 'https://test-db.supabase.co/' }), null)
  assert.equal(beatFirstStagingDatabase({ ...stage, ...stagingDatabase, BEATFIRST_STAGING_SUPABASE_URL: 'https://ywianppupnxduthvyeyb.supabase.co' }), null)
  assert.deepEqual(beatFirstStagingDatabase({ ...stage, ...shared, ...stagingDatabase }), { url: stagingDatabase.BEATFIRST_STAGING_SUPABASE_URL, key: 'test-secret' })
  assert.equal(beatFirstAccountsEnabled({ ...stage, ...shared, ...stagingDatabase }), true)
  assert.equal(beatFirstEngagementEnabled({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: stage.VERCEL_GIT_COMMIT_REF }), false)
  assert.equal(beatFirstAccountsEnabled({ VERCEL_ENV: 'production' }), true)
  assert.equal(beatFirstAccountsEnabled({ VERCEL_ENV: 'production', BEATFIRST_STAGING_ISOLATION: '1' }), true)
})

test('the staged app limits traffic to BeatFirst and verified account destinations', () => {
  assert.equal(beatFirstStagingPathAllowed('/beat-first', false), true)
  assert.equal(beatFirstStagingPathAllowed('/_next/static/css/game.css', false), true)
  assert.equal(beatFirstStagingPathAllowed('/images/ceech/logo.webp', false), true)
  assert.equal(beatFirstStagingPathAllowed('/api/auth/signin/google', false), false)
  assert.equal(beatFirstStagingPathAllowed(checkInPath, false), false)
  assert.equal(beatFirstStagingPathAllowed('/api/auth/callback/google', true), true)
  assert.equal(beatFirstStagingPathAllowed(checkInPath, true), true)
  assert.equal(beatFirstStagingPathAllowed('/api/attendance/profile', true), false)
  assert.equal(beatFirstStagingPathAllowed('/api/cron/running-man-reconcile', true), false)
})

test('read and claim use the verified account and only an explicit same-origin POST can award today', async () => {
  const calls: { id: string; claim: boolean }[] = []
  let checkedIn = false
  const handlers = createProgressHandlers({
    getSession: async () => ({ user: { googleSub: 'test-user', googleEmailVerified: true } }),
    rewardsEnabled: () => true,
    getStore: () => ({
      list: async () => [existing],
      insert: async () => assert.fail('check-in should not insert a round'),
      engagement: async (id: string, claim: boolean) => {
        calls.push({ id, claim })
        if (claim) checkedIn = true
        return { checkInAwarded: claim, rewards: { points: checkedIn ? 35 : 10, currentStreak: checkedIn ? 1 : 0, bestStreak: checkedIn ? 1 : 0, checkInDate: '2026-11-24', checkedInToday: checkedIn, restarted: false } }
      },
    }),
  })
  const get = await handlers.GET(new Request(`${host}/api/beatfirst/progress`))
  assert.equal((await get.json()).rewards.points, 10)
  const claim = (origin = host, expectedOwner = owner) => handlers.CHECK_IN(new Request(`${host}${checkInPath}`, { method: 'POST', headers: { origin, 'x-beatfirst-owner': expectedOwner } }))
  assert.equal((await claim('https://other.example.test')).status, 403)
  assert.equal((await claim(host, 'google:another-user')).status, 409)
  const response = await claim()
  assert.equal(response.status, 200)
  assert.equal((await response.json()).rewards.points, 35)
  assert.deepEqual(calls, [{ id: owner, claim: false }, { id: owner, claim: true }])
})

test('a same-owner pending pass opens the next count-in before saving, in normal unlock order', () => {
  const official = { bestScores: { 6: 75 }, completedLevelIds: [6], attemptCount: 1, recent: [existing], unlockedLevelIds: [1, 2, 3, 4, 5, 6] }
  const passed = { ...existing, id: 'pending', score: 80 }
  const nextPassed = { ...passed, id: 'next', levelId: 7 }
  assert.deepEqual(includePendingUnlocks(official, [nextPassed]).unlockedLevelIds, official.unlockedLevelIds)
  const projected = includePendingUnlocks(official, [passed, nextPassed])
  assert.deepEqual(projected.unlockedLevelIds, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(projected.attemptCount, official.attemptCount)
  assert.deepEqual(official.bestScores, { 6: 75 })
})
