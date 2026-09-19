import assert from 'node:assert/strict'
import test from 'node:test'
import * as engine from '../src/components/beatfirst-preview/engine'
import { ClapAudio } from '../src/components/beatfirst-preview/audio'
import { LEVELS, getLevel, PASS_SCORE, unlockedLevelIds } from '../src/components/beatfirst-preview/levels'

const quarterMs = 60_000 / 90

test('the six-level catalog has the agreed names, durations, lanes, and tempo', () => {
  assert.equal(LEVELS.length, 6)
  assert.deepEqual(LEVELS.map(level => level.title), [
    'Find the beat', 'Keep the beat', 'Catch the doubles',
    'Stay in the groove', 'Follow the pattern', 'Two-hand rhythm',
  ])
  for (const [index, level] of LEVELS.entries()) {
    assert.equal(level.id, index + 1)
    assert.equal(level.bpm, 90)
    assert.equal(level.durationMs, index < 3 ? 10_000 : 20_000)
    assert.equal(level.lanes, index === 5 ? 2 : 1)
    assert.ok(level.description.length > 0)
    assert.equal(getLevel(level.id), level)
    assert.ok(level.notes.every(note => note.atMs >= 0 && note.atMs + engine.LEVEL.windowMs < level.durationMs))
    assert.ok(level.notes.every((note, i) => i === 0 || note.atMs > level.notes[i - 1].atMs))
  }
  for (const invalidId of [0, 7, 1.5, NaN, Infinity]) assert.throws(() => getLevel(invalidId))
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

test('long levels contain steady notes, an eight-beat pattern, and alternating hands', () => {
  const steady = Array.from({ length: 30 }, (_, i) => i * quarterMs)
  assert.deepEqual(getLevel(4).notes.map(note => note.atMs), steady)
  const pattern = steady.flatMap((atMs, i) => {
    if ([3, 7].includes(i % 8)) return []
    return i % 8 === 5 ? [atMs, (i + 0.5) * quarterMs] : [atMs]
  })
  assert.equal(pattern.length, 27)
  assert.deepEqual(getLevel(5).notes.map(note => note.atMs), pattern)
  assert.deepEqual(getLevel(6).notes, steady.map((atMs, i) => ({ atMs, lane: i % 2 })))
})

test('all intros stay unlocked while account progression honors the exact 80 boundary', () => {
  assert.equal(PASS_SCORE, 80)
  assert.deepEqual(unlockedLevelIds({}, false), [1, 2, 3])
  assert.deepEqual(unlockedLevelIds({ 1: 100, 2: 100, 3: 100, 4: 100, 5: 100 }, false), [1, 2, 3])
  assert.deepEqual(unlockedLevelIds({}, true), [1, 2, 3])
  for (const id of [1, 2, 3]) {
    assert.deepEqual(unlockedLevelIds({ 1: 80, 2: 80, 3: 80, [id]: 79 }, true), [1, 2, 3])
  }
  assert.deepEqual(unlockedLevelIds({ 1: 80, 2: 80, 3: 80 }, true), [1, 2, 3, 4])
  assert.deepEqual(unlockedLevelIds({ 1: 80, 2: 80, 3: 80, 4: 79, 5: 100 }, true), [1, 2, 3, 4])
  assert.deepEqual(unlockedLevelIds({ 1: 80, 2: 80, 3: 80, 4: 80, 5: 79 }, true), [1, 2, 3, 4, 5])
  assert.deepEqual(unlockedLevelIds({ 1: 80, 2: 80, 3: 80, 4: 80, 5: 80 }, true), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(unlockedLevelIds({ 4: 100, 5: 100 }, true), [1, 2, 3])
})

test('rounds copy the selected catalog and accept taps during the full level duration', () => {
  const round = engine.createRound(4)
  assert.equal(round.levelId, 4)
  assert.equal(round.durationMs, 20_000)
  assert.equal(round.notes.length, 30)
  const last = round.notes[29]
  assert.equal(last.lane, 0)
  const hit = engine.tapRound(round, last.atMs + 179)
  assert.equal(hit.round.notes[29].status, 'hit')
  assert.equal(engine.tapRound(round, 20_000).round, round)
  assert.equal(engine.advanceRound(round, 20_000).notes.filter(note => note.status === 'miss').length, 30)
  assert.equal(round.notes[0].status, 'pending')
  assert.equal(engine.createRound().levelId, 1)
})

test('a wrong-hand tap counts as an extra tap without consuming the target', () => {
  const round = engine.createRound(6)
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
    ...engine.createRound(6),
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
  const round = engine.createRound(6)
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
    { atMs: 20_000, lane: 0 as const },
    { atMs: NaN, lane: 0 as const },
  ]
  const round = engine.replayRound(6, taps)
  let direct = engine.createRound(6)
  for (const tap of taps) direct = engine.tapRound(direct, tap.atMs, tap.lane).round
  assert.deepEqual(round, engine.advanceRound(direct, 20_000))
  assert.deepEqual(round.notes.slice(0, 4).map(note => note.points), [40, 40, 100, 70])
  assert.equal(round.extraTaps, 2)
  assert.equal(engine.summarize(round).score, 8)
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
