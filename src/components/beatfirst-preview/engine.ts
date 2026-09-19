import { getLevel } from './levels'

export const LEVEL = {
  bpm: 90,
  durationMs: 10_000,
  countInBeats: 4,
  windowMs: 180,
  travelMs: 1800,
} as const

export const BEAT_MS = 60_000 / LEVEL.bpm
export const COUNT_IN_MS = LEVEL.countInBeats * BEAT_MS

export function getLevelTiming(levelId: number) {
  const beatMs = 60_000 / getLevel(levelId).bpm
  return { beatMs, countInMs: LEVEL.countInBeats * beatMs }
}

export type Note = {
  atMs: number
  lane: 0 | 1
  status: 'pending' | 'hit' | 'miss'
  points: number
  offsetMs?: number
}

export type Round = {
  levelId: number
  durationMs: number
  notes: Note[]
  streak: number
  bestStreak: number
  extraTaps: number
}

export type Tap = { atMs: number; lane: 0 | 1 }

export function createRound(levelId = 1): Round {
  const level = getLevel(levelId)
  return {
    levelId: level.id,
    durationMs: level.durationMs,
    notes: level.notes.map(note => ({
      ...note, status: 'pending', points: 0,
    })),
    streak: 0, bestStreak: 0, extraTaps: 0,
  }
}

export function advanceRound(round: Round, elapsedMs: number): Round {
  if (!Number.isFinite(elapsedMs)) return round
  let missed = false
  const notes = round.notes.map(note => {
    if (note.status === 'pending' && elapsedMs > note.atMs + LEVEL.windowMs) {
      missed = true
      return { ...note, status: 'miss' as const }
    }
    return note
  })
  return missed ? { ...round, notes, streak: 0 } : round
}

export function tapRound(round: Round, elapsedMs: number, lane: 0 | 1 = 0): {
  round: Round
  feedback: 'Perfect' | 'Early' | 'Late' | 'Off beat' | null
  offsetMs?: number
} {
  if (!Number.isFinite(elapsedMs) || (lane !== 0 && lane !== 1)
    || elapsedMs < -LEVEL.windowMs || elapsedMs >= round.durationMs) {
    return { round, feedback: null }
  }
  round = advanceRound(round, elapsedMs)
  let index = -1
  let nearestDistance = Infinity
  round.notes.forEach((note, i) => {
    const distance = Math.abs(elapsedMs - note.atMs)
    if (note.status !== 'pending' || note.lane !== lane || distance > LEVEL.windowMs) return
    if (distance < nearestDistance
      || (distance === nearestDistance && note.atMs < round.notes[index].atMs)) {
      index = i
      nearestDistance = distance
    }
  })
  if (index === -1) {
    return { round: { ...round, streak: 0, extraTaps: round.extraTaps + 1 }, feedback: 'Off beat' }
  }
  const offsetMs = elapsedMs - round.notes[index].atMs
  const distance = Math.abs(offsetMs)
  const points = distance <= 60 ? 100 : distance <= 120 ? 70 : 40
  const streak = round.streak + 1
  return {
    round: {
      ...round,
      notes: round.notes.map((note, i) => i === index ? { ...note, status: 'hit', offsetMs, points } : note),
      streak,
      bestStreak: Math.max(round.bestStreak, streak),
    },
    feedback: distance <= 60 ? 'Perfect' : offsetMs < 0 ? 'Early' : 'Late',
    offsetMs,
  }
}

export function replayRound(levelId: number, taps: readonly Tap[]): Round {
  let round = createRound(levelId)
  for (const tap of taps) round = tapRound(round, tap.atMs, tap.lane).round
  return advanceRound(round, round.durationMs)
}

export function summarize(round: Round) {
  return {
    hits: round.notes.filter(note => note.status === 'hit').length,
    total: round.notes.length,
    bestStreak: round.bestStreak,
    score: Math.round(round.notes.reduce((sum, note) => sum + note.points, 0) / (round.notes.length + round.extraTaps)),
    extraTaps: round.extraTaps,
  }
}
