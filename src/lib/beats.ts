// ─── Beat Library ────────────────────────────────────────────────────────────

export type Beat = {
  id: string
  name: string
  genre: string
  bpm: number
  bars: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  kick:     number[]
  snare:    number[]
  hihat:    number[]
  taps:     number[]  // which steps the player is scored on
  clap?:    number[]
  bassline?: (string | null)[]
}

export const INTERMEDIATE_MASTERY_REQUIRED = 2

export const BEATS: Beat[] = [
  // ── Beginner ──────────────────────────────────────────────────────────────
  {
    id: 'hiphop-basic',
    name: 'Kick on Every Beat',
    genre: 'hip-hop-dance-moves',
    bpm: 100,
    bars: 8,
    difficulty: 'beginner',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'hiphop-basic-2',
    name: 'Kick & Snare on 2 & 4',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'beginner',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },

  // ── Intermediate ──────────────────────────────────────────────────────────
  {
    id: 'hiphop-intermediate',
    name: 'Hi-Hat on 3 & 4',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 1,0,1,0, 1,0,0,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
  },
  {
    id: 'hiphop-intermediate-3',
    name: 'Hi-Hat on Ands of 1 & 3',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
    taps:  [1,0,1,0, 1,0,0,0, 1,0,1,0, 1,0,0,0],
  },
  {
    id: 'hiphop-intermediate-4',
    name: 'Syncopated Kick',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
  },
  {
    id: 'hiphop-intermediate-5',
    name: 'Syncopated Kick & Snare',
    genre: 'hip-hop-dance-moves',
    bpm: 90,
    bars: 8,
    difficulty: 'intermediate',
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    taps:  [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,0,0],
  },

  // ── Advanced ──────────────────────────────────────────────────────────────
  {
    id: 'funk-groove',
    name: 'Funk Groove',
    genre: 'funk-style-dance-moves',
    bpm: 100,
    bars: 4,
    difficulty: 'advanced',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,0,0],
    clap:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    bassline: ['E2',null,'G2',null,'A2','G2','E2',null,'E2',null,'G2',null,'A2',null,null,null],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'house',
    name: 'House Four-on-Floor',
    genre: 'house-dance',
    bpm: 125,
    bars: 4,
    difficulty: 'advanced',
    kick:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    taps:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  },
  {
    id: 'locking-funk',
    name: 'Locking Funk Break',
    genre: 'locking-dance-moves',
    bpm: 100,
    bars: 4,
    difficulty: 'advanced',
    kick:  [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
    snare: [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
    taps:  [1,0,1,0, 0,1,0,0, 1,0,0,1, 0,0,1,0],
  },
]
