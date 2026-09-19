import assert from 'node:assert/strict'
import test from 'node:test'
import * as engine from '../src/components/beatfirst-preview/engine'
import { ClapAudio } from '../src/components/beatfirst-preview/audio'
import { LEVELS, getLevel, PASS_SCORE, unlockedLevelIds } from '../src/components/beatfirst-preview/levels'

const quarterMs = 60_000 / 90

test('the nine-level catalog has the agreed names, durations, lanes, and tempo', () => {
  assert.equal(LEVELS.length, 9)
  assert.deepEqual(LEVELS.map(level => level.title), [
    'Find the beat', 'Keep the beat', 'Catch the doubles',
    'Stay in the groove', 'Go a little longer', 'Follow the pattern',
    'Hold the pattern', 'Catch the new rhythm', 'Two-hand rhythm',
  ])
  const durations = [10_000, 10_000, 10_000, 15_000, 20_000, 20_000, 25_000, 25_000, 15_000]
  for (const [index, level] of LEVELS.entries()) {
    assert.equal(level.id, index + 1)
    assert.equal(level.bpm, 90)
    assert.equal(level.durationMs, durations[index])
    assert.equal(level.lanes, index === 8 ? 2 : 1)
    assert.ok(level.description.length > 0)
    assert.equal(getLevel(level.id), level)
    assert.ok(level.notes.every(note => note.atMs >= 0 && note.atMs + engine.LEVEL.windowMs < level.durationMs))
    assert.ok(level.notes.every((note, i) => i === 0 || note.atMs > level.notes[i - 1].atMs))
  }
  for (const invalidId of [0, 10, 1.5, NaN, Infinity]) assert.throws(() => getLevel(invalidId))
})

test('intro rhythms contain steady beats, specific gaps, and specific doubles', () => {
  const steady = Array.from({ length: 15 }, (_, i) => i * quarterMs)
  assert.deepEqual(getLevel(1).notes.map(note => note.atMs), steady)
  assert.deepEqual(getLevel(2).notes.map(note => note.atMs), steady.filter((_, i) => ![3, 7, 11].includes(i)))
  assert.deepEqual(getLevel(3).notes.map(note => note.atMs), [
    ...steady, ...[3, 7, 11].map(i => (i + 0.5) * quarterMs),
  ].sort((a, b) => a - b))
  for (const id of [1, 2, 3]) assert.ok(getLevel(id).notes.every(note => note.lane === 0))
})

test('account levels build duration before introducing gaps, doubles, and alternating hands', () => {
  const steady = (count: number) => Array.from({ length: count }, (_, i) => ({ atMs: i * quarterMs, lane: 0 }))
  const pattern = (count: number) => steady(count).filter((_, i) => i % 8 !== 7)
  assert.deepEqual(getLevel(4).notes, steady(23))
  assert.deepEqual(getLevel(5).notes, steady(30))
  assert.deepEqual(getLevel(6).notes, pattern(30))
  assert.deepEqual(getLevel(7).notes, pattern(38))
  assert.deepEqual(getLevel(8).notes, [
    ...pattern(38),
    ...[5, 13, 21, 29].map(i => ({ atMs: (i + 0.5) * quarterMs, lane: 0 })),
  ].sort((a, b) => a.atMs - b.atMs))
  assert.deepEqual(getLevel(9).notes, steady(23).map((note, i) => ({ ...note, lane: i % 2 })))
})

test('sign-in opens levels 4 through 6 immediately and later gates honor the exact 80 boundary', () => {
  assert.equal(PASS_SCORE, 80)
  assert.deepEqual(unlockedLevelIds({}, false), [1, 2, 3])
  assert.deepEqual(unlockedLevelIds({ 1: 100, 2: 100, 3: 100, 4: 100, 5: 100, 6: 100, 7: 100, 8: 100 }, false), [1, 2, 3])
  const initial = [1, 2, 3, 4, 5, 6]
  assert.deepEqual(unlockedLevelIds({}, true), initial)
  assert.deepEqual(unlockedLevelIds({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, true), initial)
  for (const id of [1, 2, 3, 4, 5]) {
    assert.deepEqual(unlockedLevelIds({ [id]: 100 }, true), initial)
  }
  assert.deepEqual(unlockedLevelIds({ 6: 79, 7: 100, 8: 100 }, true), initial)
  assert.deepEqual(unlockedLevelIds({ 7: 100, 8: 100 }, true), initial)
  assert.deepEqual(unlockedLevelIds({ 6: 80 }, true), [...initial, 7])
  assert.deepEqual(unlockedLevelIds({ 6: 80, 7: 79, 8: 100 }, true), [...initial, 7])
  assert.deepEqual(unlockedLevelIds({ 6: 80, 8: 100 }, true), [...initial, 7])
  assert.deepEqual(unlockedLevelIds({ 6: 80, 7: 80 }, true), [...initial, 7, 8])
  assert.deepEqual(unlockedLevelIds({ 6: 80, 7: 80, 8: 79 }, true), [...initial, 7, 8])
  assert.deepEqual(unlockedLevelIds({ 6: 80, 7: 80, 8: 80 }, true), [...initial, 7, 8, 9])
})

test('rounds copy the selected catalog and accept taps during the full level duration', () => {
  const round = engine.createRound(4)
  assert.equal(round.levelId, 4)
  assert.equal(round.durationMs, 15_000)
  assert.equal(round.notes.length, 23)
  const last = round.notes[22]
  assert.equal(last.lane, 0)
  const hit = engine.tapRound(round, last.atMs + 179)
  assert.equal(hit.round.notes[22].status, 'hit')
  assert.equal(engine.tapRound(round, 15_000).round, round)
  assert.equal(engine.advanceRound(round, 15_000).notes.filter(note => note.status === 'miss').length, 23)
  assert.equal(round.notes[0].status, 'pending')
  assert.equal(engine.createRound().levelId, 1)
})

test('a wrong-hand tap counts as an extra tap without consuming the target', () => {
  const round = engine.createRound(9)
  const wrong = engine.tapRound(round, 0, 1)
  assert.equal(wrong.feedback, 'Off beat')
  assert.equal(wrong.round.extraTaps, 1)
  assert.equal(wrong.round.notes[0].status, 'pending')
  const correct = engine.tapRound(wrong.round, 0, 0)
  assert.equal(correct.round.notes[0].status, 'hit')
  assert.equal(engine.tapRound(correct.round, quarterMs, 1).round.notes[1].status, 'hit')
})

test('overlapping windows choose the nearest pending note in the same lane', () => {
  const round = engine.createRound(3)
  const laterAtMs = 3.5 * quarterMs
  const result = engine.tapRound(round, laterAtMs - 160)
  assert.equal(result.round.notes.find(note => note.atMs === 3 * quarterMs)?.status, 'pending')
  assert.equal(result.round.notes.find(note => note.atMs === laterAtMs)?.status, 'hit')
  assert.equal(result.offsetMs, -160)
})

test('equally near notes choose the earlier note without considering another lane', () => {
  const round = {
    ...engine.createRound(9),
    notes: [
      { atMs: 1000, lane: 0 as const, status: 'pending' as const, points: 0 },
      { atMs: 1150, lane: 1 as const, status: 'pending' as const, points: 0 },
      { atMs: 1300, lane: 0 as const, status: 'pending' as const, points: 0 },
    ],
  }
  const result = engine.tapRound(round, 1150, 0)
  assert.deepEqual(result.round.notes.map(note => note.status), ['hit', 'pending', 'pending'])
  assert.equal(result.offsetMs, 150)
})

test('non-finite times and invalid lanes are ignored without mutating a round', () => {
  const round = engine.createRound(9)
  for (const atMs of [NaN, Infinity, -Infinity]) {
    const result = engine.tapRound(round, atMs)
    assert.equal(result.round, round)
    assert.equal(result.feedback, null)
    assert.equal(engine.advanceRound(round, atMs), round)
  }
  for (const lane of [-1, 2, 0.5, NaN, Infinity]) {
    const result = engine.tapRound(round, 0, lane as 0 | 1)
    assert.equal(result.round, round)
    assert.equal(result.feedback, null)
  }
})

test('every level can be replayed perfectly with all notes finalized', () => {
  for (const level of LEVELS) {
    const replayed = engine.replayRound(level.id, level.notes)
    assert.deepEqual(engine.summarize(replayed), {
      hits: level.notes.length, total: level.notes.length, bestStreak: level.notes.length, score: 100, extraTaps: 0,
    })
    assert.ok(replayed.notes.every(note => note.status === 'hit'))
    assert.ok(engine.replayRound(level.id, []).notes.every(note => note.status === 'miss'))
  }
})

test('replay preserves exact early, late, extra, wrong-hand, and ignored tap rules', () => {
  const taps = [
    { atMs: -181, lane: 0 as const },
    { atMs: -180, lane: 0 as const },
    { atMs: 0, lane: 0 as const },
    { atMs: quarterMs + 180, lane: 1 as const },
    { atMs: 2 * quarterMs, lane: 1 as const },
    { atMs: 2 * quarterMs + 60, lane: 0 as const },
    { atMs: 3 * quarterMs - 120, lane: 1 as const },
    { atMs: 15_000, lane: 0 as const },
    { atMs: NaN, lane: 0 as const },
  ]
  const round = engine.replayRound(9, taps)
  let direct = engine.createRound(9)
  for (const tap of taps) direct = engine.tapRound(direct, tap.atMs, tap.lane).round
  assert.deepEqual(round, engine.advanceRound(direct, 15_000))
  assert.deepEqual(round.notes.slice(0, 4).map(note => note.points), [40, 40, 100, 70])
  assert.equal(round.extraTaps, 2)
  assert.equal(engine.summarize(round).score, 10)
  assert.ok(round.notes.every(note => note.status !== 'pending'))
})

test('audio schedules four count-in claps plus each selected level note on the same clock', () => {
  const sourceLog: { at: number, buffer: unknown, stopped: boolean }[] = []
  class FakeAudioContext {
    sampleRate = 1000
    currentTime = 10
    state = 'running'
    destination = {}
    createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) } }
    createBufferSource() {
      const entry = { at: 0, buffer: null as unknown, stopped: false }
      return {
        buffer: null as unknown,
        connect() {}, disconnect() {},
        start(at: number) { entry.at = at; entry.buffer = this.buffer; sourceLog.push(entry) },
        stop() { entry.stopped = true },
      }
    }
    async close() {}
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeAudioContext })
  try {
    const audio = new ClapAudio()
    for (const level of LEVELS) {
      const previous = sourceLog.length
      audio.start(level.id)
      const scheduled = sourceLog.slice(previous)
      const countInStart = 10.12
      const roundStart = countInStart + engine.COUNT_IN_MS / 1000
      assert.equal(scheduled.length, 4 + level.notes.length)
      assert.deepEqual(scheduled.map(source => source.at), [
        ...Array.from({ length: 4 }, (_, i) => countInStart + i * quarterMs / 1000),
        ...level.notes.map(note => roundStart + note.atMs / 1000),
      ])
      assert.ok(scheduled.every(source => source.buffer === scheduled[0].buffer))
      assert.ok(sourceLog.slice(0, previous).every(source => source.stopped))
      assert.ok(Math.abs(audio.elapsedMs() - ((10 - roundStart) * 1000)) < 0.001)
    }
    audio.dispose()
    assert.ok(sourceLog.every(source => source.stopped))
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})
