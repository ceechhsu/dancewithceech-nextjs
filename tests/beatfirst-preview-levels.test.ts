import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import * as engine from '../src/components/beatfirst-preview/engine'
import { ClapAudio } from '../src/components/beatfirst-preview/audio'
import { LEVELS, getLevel, PASS_SCORE, unlockedLevelIds } from '../src/components/beatfirst-preview/levels'

const quarterMs = 60_000 / 90

test('the eighteen-level catalog has the agreed names, durations, lanes, sounds, and tempos', () => {
  assert.equal(LEVELS.length, 18)
  assert.deepEqual(LEVELS.map(level => level.title), [
    'Find the beat', 'Keep the beat', 'Catch the doubles',
    'Stay in the groove', 'Go a little longer', 'Follow the pattern',
    'Hold the pattern', 'Catch the new rhythm', 'Two-hand rhythm',
    'Settle into the groove', 'Pair it up', 'Leave some space',
    'Find 100', 'Hold 100', 'Catch the kick', 'Find 110', 'Catch the clap', 'Keep the pocket',
  ])
  const durations = [10_000, 10_000, 10_000, 15_000, 20_000, 20_000, 25_000, 25_000, 15_000,
    20_000, 20_000, 20_000, 20_000, 25_000, 25_000, 25_000, 25_000, 30_000]
  for (const [index, level] of LEVELS.entries()) {
    assert.equal(level.id, index + 1)
    assert.equal(level.bpm, level.id < 13 ? 90 : level.id < 16 ? 100 : 110)
    assert.equal(level.durationMs, durations[index])
    assert.equal(level.lanes, level.id >= 9 ? 2 : 1)
    assert.deepEqual(level.sounds, level.id >= 9 ? ['kick', 'clap'] : ['clap'])
    assert.ok(level.description.length > 0)
    assert.equal(getLevel(level.id), level)
    assert.ok(level.notes.every(note => note.atMs >= 0 && note.atMs + engine.LEVEL.windowMs < level.durationMs))
    assert.ok(level.notes.every((note, i) => i === 0 || note.atMs > level.notes[i - 1].atMs))
  }
  for (const invalidId of [0, 19, 1.5, NaN, Infinity]) assert.throws(() => getLevel(invalidId))
})

test('the first nine levels preserve their exact persisted note and timing data', () => {
  const historical = LEVELS.slice(0, 9).map(({ id, durationMs, bpm, lanes, notes }) => ({ id, durationMs, bpm, lanes, notes }))
  assert.equal(createHash('sha256').update(JSON.stringify(historical)).digest('hex'),
    '76d9487b4a307d0e02c6bce3c0b5203bee62cc4d27a504f413a032ee7f8ad6d3')
})

const beatNotes = (id: number) => getLevel(id).notes.map(note => ({
  beat: Math.round(note.atMs / (60_000 / getLevel(id).bpm) * 2) / 2,
  lane: note.lane,
}))

test('levels 10 through 12 extend alternating hands, pair the hands, then add one gap', () => {
  assert.deepEqual(getLevel(10).notes.slice(0, getLevel(9).notes.length), getLevel(9).notes)
  assert.ok(getLevel(10).notes.length > getLevel(9).notes.length)
  assert.deepEqual(beatNotes(10), Array.from({ length: 30 }, (_, beat) => ({ beat, lane: beat % 2 })))
  assert.deepEqual(beatNotes(11), beatNotes(10).map(note => ({ ...note, lane: Math.floor(note.beat / 2) % 2 })))
  assert.deepEqual(beatNotes(12), beatNotes(11).filter(note => note.beat % 8 !== 7))
})

test('tempo and duration steps preserve the existing pattern in beat units', () => {
  for (const [previousId, nextId] of [[12, 13], [13, 14], [15, 16], [17, 18]]) {
    const previous = beatNotes(previousId)
    assert.deepEqual(beatNotes(nextId).slice(0, previous.length), previous)
    assert.ok(getLevel(nextId).notes.length >= previous.length)
  }
  for (const id of [13, 14, 15, 16, 17, 18]) {
    const level = getLevel(id)
    const beatMs = 60_000 / level.bpm
    for (const [index, note] of beatNotes(id).entries()) {
      assert.ok(Math.abs(level.notes[index].atMs - note.beat * beatMs) < 1e-9)
    }
  }
})

test('levels 15 and 17 each add only their named half-beat sound', () => {
  for (const [previousId, nextId, afterBeat, lane] of [[14, 15, 5, 0], [16, 17, 6, 1]]) {
    const previous = beatNotes(previousId)
    const next = beatNotes(nextId)
    assert.deepEqual(next.filter(note => previous.some(old => old.beat === note.beat)), previous)
    const added = next.filter(note => !previous.some(old => old.beat === note.beat))
    assert.ok(added.length > 0)
    assert.ok(added.every(note => note.beat % 8 === afterBeat + 0.5 && note.lane === lane))
  }
  for (const id of [12, 13, 14, 15, 16, 17, 18]) {
    const level = getLevel(id)
    const expected: { beat: number; lane: number }[] = []
    const add = (beat: number, lane: number) => {
      if (beat * (60_000 / level.bpm) + engine.LEVEL.windowMs < level.durationMs) expected.push({ beat, lane })
    }
    for (let beat = 0; beat * (60_000 / level.bpm) < level.durationMs; beat++) {
      if (beat % 8 !== 7) add(beat, Math.floor(beat / 2) % 2)
      if (id >= 15 && beat % 8 === 5) add(beat + 0.5, 0)
      if (id >= 17 && beat % 8 === 6) add(beat + 0.5, 1)
    }
    assert.deepEqual(beatNotes(id), expected.sort((a, b) => a.beat - b.beat))
  }
})

test('level timing uses four beats at the selected tempo and preserves default exports', () => {
  assert.equal(engine.BEAT_MS, quarterMs)
  assert.equal(engine.COUNT_IN_MS, 4 * quarterMs)
  assert.equal(typeof engine.getLevelTiming, 'function')
  for (const level of LEVELS) {
    assert.deepEqual(engine.getLevelTiming(level.id), { beatMs: 60_000 / level.bpm, countInMs: 4 * (60_000 / level.bpm) })
  }
  assert.throws(() => engine.getLevelTiming(19))
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
  const scores: Record<string, number> = {}
  for (let previousId = 6; previousId < 18; previousId++) {
    const before = Array.from({ length: previousId }, (_, index) => index + 1)
    assert.deepEqual(unlockedLevelIds({ ...scores, [previousId]: 79, [previousId + 1]: 100 }, true), before)
    scores[previousId] = 80
    assert.deepEqual(unlockedLevelIds(scores, true), [...before, previousId + 1])
  }
  assert.deepEqual(unlockedLevelIds(scores, false), [1, 2, 3])
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
  type Buffer = { data: Float32Array; channels: number; getChannelData: () => Float32Array }
  const buffers: Buffer[] = []
  const sourceLog: { at: number, buffer: Buffer | null, stopped: boolean }[] = []
  class FakeAudioContext {
    sampleRate = 48_000
    currentTime = 10
    state = 'running'
    destination = {}
    createBuffer(channels: number, length: number) {
      const data = new Float32Array(length)
      const buffer = { data, channels, getChannelData: () => data }
      buffers.push(buffer)
      return buffer
    }
    createBufferSource() {
      const entry = { at: 0, buffer: null as Buffer | null, stopped: false }
      return {
        buffer: null as Buffer | null,
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
    assert.equal(buffers.length, 2, 'clap and kick each need their own reusable buffer')
    for (const buffer of buffers) {
      assert.equal(buffer.channels, 1)
      assert.ok(buffer.data.every(Number.isFinite))
      assert.ok(buffer.data.some(sample => Math.abs(sample) > 0.1), 'the sound must contain an audible waveform')
    }
    let kick: Buffer | null = null
    for (const level of LEVELS) {
      const previous = sourceLog.length
      audio.start(level.id)
      const scheduled = sourceLog.slice(previous)
      const countInStart = 10.12
      const beatMs = 60_000 / level.bpm
      const roundStart = countInStart + 4 * beatMs / 1000
      assert.equal(scheduled.length, 4 + level.notes.length)
      assert.deepEqual(scheduled.map(source => source.at), [
        ...Array.from({ length: 4 }, (_, i) => countInStart + i * beatMs / 1000),
        ...level.notes.map(note => roundStart + note.atMs / 1000),
      ])
      const clap = scheduled[0].buffer
      assert.ok(scheduled.slice(0, 4).every(source => source.buffer === clap))
      for (const [index, note] of level.notes.entries()) {
        const sound = scheduled[index + 4].buffer
        if (level.lanes === 2 && note.lane === 0) {
          assert.notEqual(sound, clap, 'the left lane must sound like a kick')
          kick ??= sound
          assert.equal(sound, kick)
        } else assert.equal(sound, clap)
      }
      const scheduledCount = sourceLog.length
      engine.replayRound(level.id, [])
      assert.equal(sourceLog.length, scheduledCount, 'missed input must not interrupt the beat')
      assert.ok(sourceLog.slice(0, previous).every(source => source.stopped))
      assert.ok(Math.abs(audio.elapsedMs() - ((10 - roundStart) * 1000)) < 0.001)
    }
    audio.dispose()
    assert.ok(sourceLog.every(source => source.stopped))
    assert.ok(kick)
    const kickData = kick.data
    const rms = (start: number, end: number) => Math.sqrt(kickData.slice(start, end).reduce((sum, value) => sum + value ** 2, 0) / (end - start))
    assert.ok(rms(0, 2400) > rms(kickData.length - 2400, kickData.length) * 4, 'the kick should decay after its attack')
    const magnitude = (frequency: number) => {
      let real = 0
      let imaginary = 0
      for (let index = 0; index < 1440; index++) {
        real += kickData[index] * Math.cos(2 * Math.PI * frequency * index / 48_000)
        imaginary -= kickData[index] * Math.sin(2 * Math.PI * frequency * index / 48_000)
      }
      return Math.hypot(real, imaginary) / 1440
    }
    assert.ok(magnitude(900) > 0.002, 'the kick needs an attack harmonic audible on small speakers')
  } finally {
    if (original) Object.defineProperty(globalThis, 'AudioContext', original)
    else Reflect.deleteProperty(globalThis, 'AudioContext')
  }
})
