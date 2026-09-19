export type Sound = 'clap' | 'kick'

export type Level = {
  id: number
  title: string
  description: string
  durationMs: number
  bpm: 90 | 100 | 110
  lanes: 1 | 2
  sounds: readonly [Sound] | readonly [Sound, Sound]
  notes: { atMs: number; lane: 0 | 1 }[]
}

const BEAT_MS = 60_000 / 90

function quarterNotes(count: number): Level['notes'] {
  return Array.from({ length: count }, (_, i) => ({ atMs: i * BEAT_MS, lane: 0 }))
}

function patternNotes(count: number): Level['notes'] {
  return quarterNotes(count).filter((_, i) => i % 8 !== 7)
}

type BeatNote = { beat: number; lane: 0 | 1 }
const alternatingHands: BeatNote[] = Array.from({ length: 8 }, (_, beat) => ({ beat, lane: beat % 2 as 0 | 1 }))
const pairedHands: BeatNote[] = alternatingHands.map(note => ({ ...note, lane: Math.floor(note.beat / 2) % 2 as 0 | 1 }))
const pairedWithGap = pairedHands.filter(note => note.beat !== 7)
const withKickDouble: BeatNote[] = [...pairedWithGap, { beat: 5.5, lane: 0 }]
const withBothDoubles: BeatNote[] = [...withKickDouble, { beat: 6.5, lane: 1 }]

function twoHandNotes(durationMs: number, bpm: Level['bpm'], pattern: readonly BeatNote[]): Level['notes'] {
  const beatMs = 60_000 / bpm
  const notes: Level['notes'] = []
  for (let firstBeat = 0; firstBeat * beatMs < durationMs; firstBeat += 8) {
    for (const note of pattern) {
      const atMs = (firstBeat + note.beat) * beatMs
      // Leave the complete scoring window before the round ends.
      if (atMs + 180 < durationMs) notes.push({ atMs, lane: note.lane })
    }
  }
  return notes.sort((a, b) => a.atMs - b.atMs)
}

export const LEVELS: readonly Level[] = [
  {
    id: 1,
    title: 'Find the beat',
    description: 'Tap along with 15 steady claps and find a comfortable rhythm.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: quarterNotes(15),
  },
  {
    id: 2,
    title: 'Keep the beat',
    description: 'Keep the rhythm through the gaps. Stay quiet until the next clap.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: quarterNotes(15).filter((_, i) => ![3, 7, 11].includes(i)),
  },
  {
    id: 3,
    title: 'Catch the doubles',
    description: 'Follow the steady claps and catch three quick extra taps.',
    durationMs: 10_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: [
      ...quarterNotes(15),
      ...[3, 7, 11].map(i => ({ atMs: (i + 0.5) * BEAT_MS, lane: 0 as const })),
    ].sort((a, b) => a.atMs - b.atMs),
  },
  {
    id: 4,
    title: 'Stay in the groove',
    description: 'Hold your timing through 15 seconds of steady claps.',
    durationMs: 15_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: quarterNotes(23),
  },
  {
    id: 5,
    title: 'Go a little longer',
    description: 'Keep the steady claps going for 20 seconds.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: quarterNotes(30),
  },
  {
    id: 6,
    title: 'Follow the pattern',
    description: 'Follow a simple repeating rhythm with one quiet gap every eight beats.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: patternNotes(30),
  },
  {
    id: 7,
    title: 'Hold the pattern',
    description: 'Keep the same repeating rhythm steady for 25 seconds.',
    durationMs: 25_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: patternNotes(38),
  },
  {
    id: 8,
    title: 'Catch the new rhythm',
    description: 'Catch a quick extra tap in the familiar pattern while keeping its quiet gaps.',
    durationMs: 25_000,
    bpm: 90,
    lanes: 1,
    sounds: ['clap'],
    notes: [
      ...patternNotes(38),
      ...[5, 13, 21, 29].map(i => ({ atMs: (i + 0.5) * BEAT_MS, lane: 0 as const })),
    ].sort((a, b) => a.atMs - b.atMs),
  },
  {
    id: 9,
    title: 'Two-hand rhythm',
    description: 'Alternate the left kick and right clap, keeping both hands in time.',
    durationMs: 15_000,
    bpm: 90,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: quarterNotes(23).map((note, i) => ({ ...note, lane: i % 2 === 0 ? 0 : 1 })),
  },
  {
    id: 10,
    title: 'Settle into the groove',
    description: 'Keep alternating the left kick and right clap for 20 seconds.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(20_000, 90, alternatingHands),
  },
  {
    id: 11,
    title: 'Pair it up',
    description: 'Play two left kicks, then two right claps, at the same steady pace.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(20_000, 90, pairedHands),
  },
  {
    id: 12,
    title: 'Leave some space',
    description: 'Keep the paired rhythm, leaving one quiet gap every eight beats.',
    durationMs: 20_000,
    bpm: 90,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(20_000, 90, pairedWithGap),
  },
  {
    id: 13,
    title: 'Find 100',
    description: 'Bring the familiar paired rhythm and quiet gap up to 100 BPM.',
    durationMs: 20_000,
    bpm: 100,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(20_000, 100, pairedWithGap),
  },
  {
    id: 14,
    title: 'Hold 100',
    description: 'Hold the same rhythm at 100 BPM for 25 seconds.',
    durationMs: 25_000,
    bpm: 100,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(25_000, 100, pairedWithGap),
  },
  {
    id: 15,
    title: 'Catch the kick',
    description: 'Catch a quick extra left kick while keeping the paired rhythm and gap.',
    durationMs: 25_000,
    bpm: 100,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(25_000, 100, withKickDouble),
  },
  {
    id: 16,
    title: 'Find 110',
    description: 'Bring the same rhythm, including the extra kick, up to 110 BPM.',
    durationMs: 25_000,
    bpm: 110,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(25_000, 110, withKickDouble),
  },
  {
    id: 17,
    title: 'Catch the clap',
    description: 'Add a quick extra right clap to the rhythm you know at 110 BPM.',
    durationMs: 25_000,
    bpm: 110,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(25_000, 110, withBothDoubles),
  },
  {
    id: 18,
    title: 'Keep the pocket',
    description: 'Keep the kicks, claps, and quiet gaps steady for 30 seconds at 110 BPM.',
    durationMs: 30_000,
    bpm: 110,
    lanes: 2,
    sounds: ['kick', 'clap'],
    notes: twoHandNotes(30_000, 110, withBothDoubles),
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
  if (!signedIn) return unlocked
  unlocked.push(4, 5, 6)
  for (let previousId = 6; previousId < LEVELS.length; previousId++) {
    if (!(bestScores[previousId] >= PASS_SCORE)) break
    unlocked.push(previousId + 1)
  }
  return unlocked
}
