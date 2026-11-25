// Run with node --import tsx --test tests/browser/beatfirst-account-integration.mjs.
// Set DWC_PLAYWRIGHT_MODULE to an installed Playwright module if needed.
// DWC_BEATFIRST_TEST_ROOT can point to a clean copy if this worktree is already serving Next dev.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { encode } from 'next-auth/jwt'
import { guestSubject, returningSubject, startBeatFirstAccountFixture } from './beatfirst-account-fixture.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.DWC_PLAYWRIGHT_MODULE || 'playwright')
const { getLevel } = require('../../src/components/beatfirst-preview/levels.ts')
const port = process.env.DWC_BEATFIRST_TEST_PORT || '4321'
const origin = `http://localhost:${port}`
const secret = 'local-beatfirst-account-integration-only'
const progressPath = '/api/beatfirst/progress'
const sessionCookie = 'authjs.session-token'
const storageKey = 'beatfirst-preview-progress-v1'

function launchApp(fixture) {
  const root = process.env.DWC_BEATFIRST_TEST_ROOT || fileURLToPath(new URL('../../', import.meta.url))
  const next = resolve(root, 'node_modules/next/dist/bin/next')
  const child = spawn(process.execPath, [next, 'dev', '--webpack', '--hostname', 'localhost', '--port', port], {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      AUTH_SECRET: secret,
      AUTH_URL: origin,
      AUTH_TRUST_HOST: 'true',
      GOOGLE_CLIENT_ID: 'local-beatfirst-fixture.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'local-beatfirst-fixture',
      BEATFIRST_ENGAGEMENT_ENABLED: '1',
      BEATFIRST_SUPABASE_URL: fixture.url,
      BEATFIRST_SUPABASE_SERVICE_ROLE_KEY: fixture.serviceKey,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = `${output}${chunk}`.slice(-12_000) })
  return {
    async waitUntilReady() {
      const deadline = Date.now() + 70_000
      while (child.exitCode === null && Date.now() < deadline) {
        try {
          const response = await fetch(`${origin}${progressPath}`, { signal: AbortSignal.timeout(8000) })
          if (response.status === 401) return
        } catch { /* Wait for the local route to compile. */ }
        await delay(250)
      }
      throw Error(`Local BeatFirst app did not become ready.\n${output}`)
    },
    logs: () => output,
    async close() {
      if (child.exitCode !== null || child.signalCode !== null) return
      const exit = once(child, 'exit')
      child.kill('SIGTERM')
      await exit
    },
  }
}

async function signInFixture(context, subject) {
  const value = await encode({
    secret,
    salt: sessionCookie,
    token: { sub: subject, googleSub: subject, googleEmailVerified: true, email: `${subject}@example.test`, name: 'Fixture Dancer' },
  })
  await context.addCookies([{ name: sessionCookie, value, url: origin, httpOnly: true, sameSite: 'Lax' }])
}

async function progress(context, subject, { checkIn = false, attempts } = {}) {
  const headers = { origin, 'x-beatfirst-owner': `google:${subject}` }
  const response = checkIn ? await context.request.post(`${origin}${progressPath}/check-in`, { headers })
    : attempts ? await context.request.post(`${origin}${progressPath}`, { headers, data: { attempts } })
      : await context.request.get(`${origin}${progressPath}`, { headers })
  const body = await response.json()
  assert.equal(response.status(), 200, JSON.stringify(body))
  return body
}

async function playGuestRound(page) {
  await page.addInitScript(() => {
    const start = AudioBufferSourceNode.prototype.start
    const anchors = []
    window.beatFirstFixtureAudio = anchors
    AudioBufferSourceNode.prototype.start = function (when, ...args) {
      start.call(this, when, ...args)
      anchors.push({ context: this.context, when })
    }
  })
  assert.equal((await page.goto(`${origin}/beat-first`)).status(), 200)
  const game = page.getByRole('region', { name: 'BeatFirst rhythm game' })
  await game.getByRole('button', { name: 'Let’s play', exact: true }).click()
  await page.waitForFunction(() => window.beatFirstFixtureAudio.length >= 5)
  await page.evaluate(notes => new Promise((resolve, reject) => {
    const { context, when } = window.beatFirstFixtureAudio[4]
    let index = 0
    const timeout = setTimeout(() => reject(Error('Guest input timed out')), 16_000)
    const strike = () => {
      const stamp = context.getOutputTimestamp()
      const output = stamp.contextTime > 0 && stamp.performanceTime > 0
        ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
        : context.currentTime - (context.outputLatency || context.baseLatency || 0)
      if ((output - when) * 1000 >= notes[index].atMs - 12) {
        const pad = document.querySelector(`[data-tap-lane="${notes[index].lane}"]`)
        pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'touch' }))
        index++
      }
      if (index < notes.length) requestAnimationFrame(strike)
      else {
        clearTimeout(timeout)
        resolve()
      }
    }
    requestAnimationFrame(strike)
  }), getLevel(1).notes)
  await game.getByRole('heading', { name: 'Level 1 passed!' }).waitFor()
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key))?.guest?.length === 1, storageKey)
}

async function localPage(context) {
  const page = await context.newPage()
  await page.route('**/*', route => route.request().url().startsWith(`${origin}/`) ? route.continue() : route.abort())
  await page.routeWebSocket('**/_next/webpack-hmr*', () => {})
  return page
}

test('a real NextAuth identity shares BeatFirst rewards in two clients and claims a guest round', { timeout: 135_000 }, async () => {
  const fixture = await startBeatFirstAccountFixture()
  const app = launchApp(fixture)
  let browser
  try {
    await app.waitUntilReady()
    browser = await chromium.launch({ headless: true, channel: 'chrome' })
    const laptop = await browser.newContext()
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    await Promise.all([signInFixture(laptop, returningSubject), signInFixture(phone, returningSubject)])

    const first = await progress(laptop, returningSubject)
    assert.equal(first.bestScores[6], 92)
    assert.deepEqual(first.unlockedLevelIds, [1, 2, 3, 4, 5, 6, 7])
    assert.equal(first.attemptCount, 1)
    assert.equal(first.rewards.points, 80)
    assert.equal(first.rewards.currentStreak, 2)
    assert.equal(first.rewards.checkedInToday, false)

    const claims = await Promise.all([progress(laptop, returningSubject, { checkIn: true }), progress(phone, returningSubject, { checkIn: true })])
    assert.equal(claims.filter(claim => claim.checkInAwarded).length, 1)
    assert.deepEqual(claims[0].rewards, claims[1].rewards)
    assert.equal(claims[0].rewards.points, 105)
    assert.equal(claims[0].rewards.currentStreak, 3)
    assert.equal(claims[0].rewards.bestStreak, 3)

    const perfect = { levelId: 7, id: crypto.randomUUID(), taps: getLevel(7).notes, completedAt: new Date().toISOString() }
    const concurrent = await Promise.all([progress(laptop, returningSubject, { attempts: [perfect] }), progress(phone, returningSubject, { attempts: [perfect] })])
    for (const saved of concurrent) {
      assert.deepEqual(saved.acceptedIds, [perfect.id])
      assert.equal(saved.attemptCount, 2)
      assert.equal(saved.bestScores[7], 100)
      assert.ok(saved.unlockedLevelIds.includes(8))
      assert.equal(saved.rewards.points, 135)
    }
    const retry = await progress(phone, returningSubject, { attempts: [{ ...perfect, taps: [] }] })
    assert.equal(retry.bestScores[7], 100)
    assert.equal(retry.rewards.points, 135)
    const repeatedAttempt = { ...perfect, id: crypto.randomUUID() }
    const repeat = await progress(laptop, returningSubject, { attempts: [repeatedAttempt] })
    assert.equal(repeat.recent.find(round => round.id === repeatedAttempt.id)?.score, 100)
    assert.equal(repeat.rewards.points, 145)
    assert.deepEqual((await progress(phone, returningSubject)).rewards, repeat.rewards)

    const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await localPage(guest)
    assert.equal((await guest.request.get(`${origin}${progressPath}`)).status(), 401)
    await playGuestRound(page)
    const guestRound = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).guest[0], storageKey)
    assert.equal((await fixture.db.query('select * from public.beatfirst_preview_attempts where user_id = $1', [`google:${guestSubject}`])).rows.length, 0)

    // Substitute only Google's OAuth completion. The browser still initiates
    // sign-in and the actual NextAuth/session and BeatFirst routes verify the cookie.
    await page.route(url => url.origin === origin && url.pathname === '/api/auth/signin/google', async route => {
      await signInFixture(guest, guestSubject)
      await route.fulfill({ json: { url: `${origin}/beat-first` } })
    })
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.getByRole('button', { name: /sign in free to unlock levels 4–6/i }).first().click(),
    ])
    await page.waitForFunction(({ key, owner }) => {
      const local = JSON.parse(localStorage.getItem(key))
      return local?.guest?.length === 0 && local?.claim === false && local?.pending?.[owner]?.length === 0
    }, { key: storageKey, owner: `google:${guestSubject}` }, { timeout: 20_000 })
    await page.getByText('Progress saved to your account', { exact: true }).waitFor()
    const claimed = await progress(guest, guestSubject)
    assert.equal(claimed.attemptCount, 1)
    assert.equal(claimed.recent[0].id, guestRound.id)
    assert.ok(claimed.bestScores[1] >= 80)
    assert.deepEqual(claimed.unlockedLevelIds, [1, 2, 3, 4, 5, 6])
    assert.equal(claimed.rewards.points, 55)
    assert.equal(claimed.rewards.checkedInToday, true)
    assert.equal(claimed.rewards.currentStreak, 1)
    assert.equal((await progress(laptop, returningSubject)).rewards.points, 145)
    await Promise.all([laptop, phone].map(async context => {
      const signedIn = await localPage(context)
      assert.equal((await signedIn.goto(`${origin}/beat-first`)).status(), 200)
      const panel = signedIn.getByRole('region', { name: 'Rhythm rewards' })
      await panel.getByText('145', { exact: true }).waitFor()
      await panel.getByText('3-day streak', { exact: true }).waitFor()
    }))
    assert.deepEqual((await progress(phone, returningSubject)).rewards, repeat.rewards)
  } catch (error) {
    throw Error(`${error.message}\n${app.logs()}`, { cause: error })
  } finally {
    await browser?.close()
    await app.close()
    await fixture.close()
  }
})
