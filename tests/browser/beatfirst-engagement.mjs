// Run with Node 24: node --test tests/browser/beatfirst-engagement.mjs.
// Set DWC_VERIFY_BASE to the engagement-enabled server under test.
// Set DWC_VERIFY_ENGINE=webkit for mobile WebKit and DWC_VERIFY_ACCOUNT_FIXTURE=1
// against an account-enabled test server to verify the client during a slow save.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { getLevel, PASS_SCORE } from '../../src/components/beatfirst-preview/levels.ts';

const { chromium, devices, webkit } = createRequire(import.meta.url)(process.env.DWC_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DWC_VERIFY_BASE || 'http://127.0.0.1:4331';
const isWebKit = process.env.DWC_VERIFY_ENGINE === 'webkit';
const gameField = '[data-phase]';
const countInCopy = 'Four-beat count-in. Get ready to tap.';

async function openEngagement(options = {}, accountFixture) {
  const browser = await (isWebKit ? webkit : chromium).launch({
    headless: true,
    ...(isWebKit ? {} : process.env.DWC_CHROMIUM_EXECUTABLE ? { executablePath: process.env.DWC_CHROMIUM_EXECUTABLE } : { channel: 'chrome' }),
  });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', ignoreHTTPSErrors: process.env.DWC_VERIFY_SELF_SIGNED === '1', ...(isWebKit ? devices['iPhone 13'] : {}), ...options });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.routeWebSocket(/\/_next\/webpack-hmr(?:[?]|$)/, () => {});
    await context.route(/^https:\/\/(?:[^/]+\.)?(?:googletagmanager\.com|google-analytics\.com|doubleclick\.net|facebook\.com|facebook\.net)\//, route => route.abort());
    if (process.env.DWC_VERIFY_ACCOUNT_FIXTURE === '1') {
      await context.route('**/api/auth/session', route => route.fulfill({ json: accountFixture ? {
        user: { name: 'Rhythm Test', googleSub: 'fixture-account', googleEmailVerified: true },
        expires: '2099-01-01T00:00:00.000Z',
      } : {} }));
    }
    if (accountFixture) {
      await context.route('**/api/beatfirst/progress', async route => {
        if (route.request().method() === 'POST') {
          const { attempts } = route.request().postDataJSON();
          accountFixture.startSave(attempts);
          await accountFixture.releaseSave;
          await route.fulfill({ json: { ...accountFixture.summary, unlockedLevelIds: [1, 2, 3, 4, 5, 6, 7], acceptedIds: attempts.map(attempt => attempt.id) } });
        } else {
          await route.fulfill({ json: accountFixture.summary });
        }
      });
      await context.route('**/api/beatfirst/leaderboard**', route => route.fulfill({ json: { entries: [] } }));
    }
    await page.addInitScript(() => {
      const originalStart = AudioBufferSourceNode.prototype.start;
      const originalStop = AudioBufferSourceNode.prototype.stop;
      const sources = new WeakMap();
      let pendingBatch = null;
      window.beatFirstTestAudio = [];
      AudioBufferSourceNode.prototype.start = function (when, ...args) {
        originalStart.call(this, when, ...args);
        if (!pendingBatch) {
          pendingBatch = { context: this.context, times: [], sources: [] };
          queueMicrotask(() => {
            window.beatFirstTestAudio.push(pendingBatch);
            pendingBatch = null;
          });
        }
        const startAt = when ?? this.context.currentTime;
        const source = { startAt, duration: this.buffer.duration, loop: this.loop, stopAt: null };
        pendingBatch.times.push(startAt);
        pendingBatch.sources.push(source);
        sources.set(this, source);
      };
      AudioBufferSourceNode.prototype.stop = function (when, ...args) {
        originalStop.call(this, when, ...args);
        const source = sources.get(this);
        if (source) source.stopAt = when ?? this.context.currentTime;
      };
    });
    const response = await page.goto(new URL('/beat-first', base).href);
    assert.equal(response?.status(), 200);
    const game = page.getByRole('region', { name: 'BeatFirst rhythm game' });
    await game.getByRole('button', { name: 'Let’s play' }).waitFor();
    return { browser, page, game, errors };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function clickIntoCountIn(page, game, buttonName, levelId) {
  const level = getLevel(levelId);
  const startIndex = await page.evaluate(() => window.beatFirstTestAudio.length);
  await game.getByRole('button', { name: buttonName, exact: true }).click();
  await game.getByRole('heading', { name: level.title, exact: true, level: 2 }).waitFor({ timeout: 4000 });
  await game.getByText(countInCopy, { exact: true }).waitFor({ timeout: 3000 });
  assert.equal(await game.locator(gameField).getAttribute('data-phase'), 'countin');
  assert.equal(await game.getByRole('button', { name: 'Let’s play', exact: true }).count(), 0);
  await page.waitForFunction(index => window.beatFirstTestAudio.length > index, startIndex, { timeout: 2000 });
  const { times, running } = await page.evaluate(index => {
    const { context, times } = window.beatFirstTestAudio[index];
    return { times, running: context.state === 'running' };
  }, startIndex);
  assert.equal(running, true);
  assert.equal(times.length, level.notes.length + 4, 'the original four count-in cues precede the level notes');
  for (let index = 1; index <= 4; index++) {
    assert.ok(Math.abs(times[index] - times[index - 1] - 60 / level.bpm) < 0.0001);
  }
  return startIndex;
}

async function tapAlong(page, levelId, startIndex) {
  const { notes, durationMs } = getLevel(levelId);
  const tapped = await page.evaluate(({ index, notes, durationMs }) => new Promise((resolve, reject) => {
    const { context, times } = window.beatFirstTestAudio[index];
    const roundStart = times[4];
    let noteIndex = 0;
    const timeout = window.setTimeout(() => reject(new Error(`Beat taps stopped at ${noteIndex}/${notes.length}.`)), durationMs + 5000);

    function tapFrame() {
      // Follow the genuine Web Audio output clock, matching the in-game hit
      // window. The input reaches ClapGame only through its actual tap pads.
      const stamp = context.getOutputTimestamp?.();
      const outputTime = stamp?.contextTime > 0 && stamp.performanceTime > 0
        ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
        : context.currentTime - (context.outputLatency || context.baseLatency || 0);
      const elapsed = (outputTime - roundStart) * 1000;
      const note = notes[noteIndex];
      if (elapsed >= note.atMs - 12) {
        const pad = document.querySelector(`[data-tap-lane="${note.lane}"]`);
        pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'touch' }));
        noteIndex++;
      }
      if (noteIndex === notes.length) {
        window.clearTimeout(timeout);
        resolve(noteIndex);
      } else {
        requestAnimationFrame(tapFrame);
      }
    }

    requestAnimationFrame(tapFrame);
  }), { index: startIndex, notes, durationMs });
  assert.equal(tapped, notes.length);
}

async function resultScore(game, levelId) {
  await game.locator(`${gameField}[data-phase="results"]`).waitFor({ timeout: getLevel(levelId).durationMs + 6000 });
  const timingSummary = await game.getByRole('status').filter({ hasText: /Timing score \d+ out of 100/ }).textContent();
  const match = timingSummary.match(/Timing score (\d+) out of 100/);
  assert.ok(match, timingSummary);
  return Number(match[1]);
}

async function assertResultCue(page, roundIndex, expectedDuration) {
  await page.waitForFunction(index => window.beatFirstTestAudio.length > index + 1, roundIndex, { timeout: 1000 });
  const cue = await page.evaluate(index => window.beatFirstTestAudio[index + 1]?.sources, roundIndex);
  assert.equal(cue?.length, 1, 'a result schedules a single feedback cue');
  assert.ok(Math.abs(cue[0].duration - expectedDuration) < 0.002, `expected a ${expectedDuration}s feedback cue`);
  assert.equal(cue[0].loop, false);
}

async function assertCueClearsBeforeCountIn(page, resultIndex, countInIndex, requireCutoff = false) {
  const followup = await page.evaluate(({ resultIndex, countInIndex }) => {
    const cue = window.beatFirstTestAudio[resultIndex + 1].sources[0];
    const firstCountIn = window.beatFirstTestAudio[countInIndex].times[0];
    return { cue, firstCountIn };
  }, { resultIndex, countInIndex });
  const { cue, firstCountIn } = followup;
  if (requireCutoff) {
    assert.ok(cue.stopAt !== null && cue.stopAt < cue.startAt + cue.duration, 'the rapid action cuts off the playing cue');
  }
  assert.ok(Math.min(cue.stopAt ?? Infinity, cue.startAt + cue.duration) < firstCountIn, 'the feedback cue clears before the first clap');
}

async function verifyLayout(page, game, primaryName) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  const primary = game.getByRole('button', { name: primaryName, exact: true });
  const box = await primary.boundingBox();
  assert.ok(box && box.height >= 44, 'primary result action has a usable touch target');
  assert.equal(await primary.evaluate(button => document.activeElement === button), true);
}

test('pass, replay and Continue retain their result audio and four-count timing', { timeout: 45000 }, async () => {
  const { browser, page, game, errors } = await openEngagement({ reducedMotion: 'reduce' });
  try {
    const index = await clickIntoCountIn(page, game, 'Let’s play', 1);
    await tapAlong(page, 1, index);
    assert.ok(await resultScore(game, 1) >= PASS_SCORE);
    await assertResultCue(page, index, 0.32);
    const motionCount = await game.locator('[data-passed=true]').evaluate(result => result.getAnimations({ subtree: true }).length);
    assert.equal(motionCount, 0, 'reduced motion suppresses the celebration');
    const replay = await clickIntoCountIn(page, game, 'Replay', 1);
    await assertCueClearsBeforeCountIn(page, index, replay, !isWebKit);
    await tapAlong(page, 1, replay);
    assert.ok(await resultScore(game, 1) >= PASS_SCORE);
    await assertResultCue(page, replay, 0.32);
    const next = await clickIntoCountIn(page, game, 'Continue to Level 2', 2);
    await assertCueClearsBeforeCountIn(page, replay, next, !isWebKit);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('a missed sample can retry or continue and an interrupted round plays no result cue', { timeout: 30000 }, async () => {
  const { browser, page, game, errors } = await openEngagement();
  try {
    const index = await clickIntoCountIn(page, game, 'Let’s play', 1);
    assert.equal(await resultScore(game, 1), 0);
    await assertResultCue(page, index, 0.37);
    await game.getByRole('heading', { name: 'Try again. You’ve got this.' }).waitFor();
    await game.getByRole('button', { name: 'Try again', exact: true }).waitFor();
    await verifyLayout(page, game, 'Continue to Level 2');
    const next = await clickIntoCountIn(page, game, 'Continue to Level 2', 2);
    await assertCueClearsBeforeCountIn(page, index, next);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await game.getByRole('button', { name: 'Start again', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.beatFirstTestAudio.length), next + 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('a passing Level 6 immediately opens Level 7 while the signed-in save is pending', {
  skip: process.env.DWC_VERIFY_ACCOUNT_FIXTURE !== '1',
  timeout: 40000,
}, async () => {
  const summary = {
    bestScores: { 1: 98 },
    completedLevelIds: [1],
    attemptCount: 1,
    recent: [],
    unlockedLevelIds: [1, 2, 3, 4, 5, 6],
    rewards: { points: 25, currentStreak: 1, bestStreak: 1, checkInDate: '2026-11-24', checkedInToday: true, restarted: false },
  };
  let release;
  let acknowledgeStart;
  const releaseSave = new Promise(resolve => { release = resolve; });
  const saveStarted = new Promise(resolve => { acknowledgeStart = resolve; });
  const { browser, page, game, errors } = await openEngagement({}, { summary, releaseSave, startSave: acknowledgeStart });
  try {
    await page.getByText('Welcome back, Rhythm.').waitFor();
    await page.getByRole('button', { name: /Follow the pattern/ }).click();
    const index = await clickIntoCountIn(page, game, 'Let’s play', 6);
    await tapAlong(page, 6, index);
    assert.ok(await resultScore(game, 6) >= PASS_SCORE);
    await game.getByText('+10 round', { exact: true }).waitFor();
    await game.getByText('First saved passes add 20 points.', { exact: true }).waitFor();
    const attempts = await saveStarted;
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].levelId, 6);
    const next = await clickIntoCountIn(page, game, 'Continue to Level 7', 7);
    await assertCueClearsBeforeCountIn(page, index, next);
    assert.deepEqual(errors, []);
  } finally {
    release();
    await browser.close();
  }
});
