export type Level = {
  id: number
  title: string
  description: string
  durationMs: number
  bpm: 90
  lanes: 1 | 2
  notes: { atMs: number; lane: 0 | 1 }[]
}

const BEAT_MS = 60_000 / 90

function quarterNotes(count: number): Level['notes'] {
  return Array.from({ length: count }, (_, i) => ({ atMs: i * BEAT_MS, lane: 0 }))
}

export const LEVELS: readonly Level[] = [
  {
    id: 1,
    title: 'Find the beat',
    description: 'Tap along with 15 steady claps and find a comfortable rhythm.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    notes: quarterNotes(15),
  },
  {
    id: 2,
    title: 'Keep the beat',
    description: 'Keep the rhythm through the gaps. Stay quiet until the next clap.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    notes: quarterNotes(15).filter((_, i) => ![3, 7, 11].includes(i)),
  },
  {
    id: 3,
    title: 'Catch the doubles',
    description: 'Follow the steady claps and catch three quick extra taps.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    notes: [
      ...quarterNotes(15),
      ...[3, 7, 11].map(i => ({ atMs: (i + 0.5) * BEAT_MS, lane: 0 as const })),
    ].sort((a, b) => a.atMs - b.atMs),
  },
  {
    id: 4,
    title: 'Stay in the groove',
    description: 'Hold your timing through 20 seconds of steady claps.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 1,
    notes: quarterNotes(30),
  },
  {
    id: 5,
    title: 'Follow the pattern',
    description: 'Learn a repeating rhythm of steady claps, quiet gaps, and doubles.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 1,
    notes: quarterNotes(30).flatMap((note, i) => {
      if ([3, 7].includes(i % 8)) return []
      return i % 8 === 5
        ? [note, { atMs: (i + 0.5) * BEAT_MS, lane: 0 as const }]
        : [note]
    }),
  },
  {
    id: 6,
    title: 'Two-hand rhythm',
    description: 'Alternate left and right on each clap, keeping both hands in time.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 2,
    notes: quarterNotes(30).map((note, i) => ({ ...note, lane: i % 2 === 0 ? 0 : 1 })),
  },
]

export function getLevel(id: number): Level {
  const level = LEVELS.find(level => level.id === id)
  if (!level) throw new RangeError(`Unknown BeatFirst level: ${id}`)
  return level
}

export const PASS_SCORE = 80

export function unlockedLevelIds(bestScores: Record<string, number>, signedIn: boolean): number[] {
  const unlocked = [1, 2, 3]
  if (!signedIn || !unlocked.every(id => bestScores[id] >= PASS_SCORE)) return unlocked
  unlocked.push(4)
  if (!(bestScores[4] >= PASS_SCORE)) return unlocked
  unlocked.push(5)
  if (bestScores[5] >= PASS_SCORE) unlocked.push(6)
  return unlocked
}
