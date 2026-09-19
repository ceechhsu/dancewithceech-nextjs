import assert from 'node:assert/strict'
import test from 'node:test'
import { LEVEL, createRound, advanceRound, tapRound, summarize } from '../src/components/beatfirst-preview/engine'

test('90 BPM gives 15 evenly spaced targets in a ten-second round', () => {
  const round = createRound()
  assert.equal(LEVEL.durationMs, 10_000)
  assert.equal(round.notes.length, 15)
  assert.equal(round.notes[0].atMs, 0)
  assert.ok(Math.abs(round.notes[14].atMs - 9333.333333333334) < 0.001)
  assert.ok(round.notes[14].atMs + LEVEL.windowMs < LEVEL.durationMs)
})

test('perfect round scores 100 with 15 hits and a 15-note best streak', () => {
  let round = createRound()
  for (const note of round.notes) round = tapRound(round, note.atMs).round
  assert.deepEqual(summarize(advanceRound(round, 10_000)), { hits: 15, total: 15, bestStreak: 15, score: 100, extraTaps: 0 })
})

test('all misses end normally with zero score', () => {
  const round = advanceRound(createRound(), 10_000)
  assert.equal(round.notes.filter(n => n.status === 'miss').length, 15)
  assert.equal(summarize(round).score, 0)
})

test('first note accepts early input and hit windows include the boundary', () => {
  for (const time of [-180, 180]) {
    const result = tapRound(createRound(), time)
    assert.equal(result.round.notes[0].status, 'hit')
    assert.equal(result.offsetMs, time)
  }
  assert.equal(tapRound(createRound(), -181).round.notes[0].status, 'pending')
  assert.equal(tapRound(createRound(), 181).round.notes[0].status, 'miss')
})

test('duplicate taps never hit the same note twice, and stray taps lower score', () => {
  const hit = tapRound(createRound(), 0).round
  const duplicate = tapRound(hit, 30).round
  assert.equal(summarize(duplicate).hits, 1)
  assert.equal(duplicate.extraTaps, 1)
  assert.equal(duplicate.streak, 0)
  assert.ok(summarize(duplicate).score < summarize(hit).score)
})

test('a missed intervening note breaks a streak before a later tap', () => {
  let round = tapRound(createRound(), 0).round
  round = tapRound(round, 2 * 60_000 / 90).round
  assert.equal(round.notes[1].status, 'miss')
  assert.equal(round.streak, 1)
  assert.equal(round.bestStreak, 1)
})

test('late and early taps get signed feedback and lower points than perfect taps', () => {
  const early = tapRound(createRound(), -100)
  const late = tapRound(createRound(), 150)
  assert.equal(early.feedback, 'Early')
  assert.equal(late.feedback, 'Late')
  assert.ok(summarize(early.round).score > summarize(late.round).score)
  assert.ok(summarize(tapRound(createRound(), 0).round).score > summarize(early.round).score)
})

test('count-in taps before the first hit window and taps after the end are ignored', () => {
  const round = createRound()
  assert.equal(tapRound(round, -500).round, round)
  assert.equal(tapRound(round, 10_000).round, round)
})

test('last note has its full late window and replay starts with fresh state', () => {
  const round = createRound()
  const result = tapRound(round, round.notes[14].atMs + 179)
  assert.equal(result.round.notes[14].status, 'hit')
  assert.equal(summarize(result.round).hits, 1)
  assert.equal(createRound().notes.filter(n => n.status === 'pending').length, 15)
  assert.equal(round.notes[0].status, 'pending')
})
