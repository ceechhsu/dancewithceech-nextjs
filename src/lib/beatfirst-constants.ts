export const TOLERANCE = { beginner: 300, intermediate: 200, advanced: 100 }
export const STEPS_PER_BAR = 16
export const GAME_BARS = 9      // 1 countdown bar + 8 scored bars
export const CANVAS_W = 560
export const CANVAS_H = 120
export const PLAYBACK_SCALE = 0.18 // px/ms — shows ~3.1 seconds at a time

export type TapResult = {
  beat: number
  tapMs: number
  idealMs: number
  diffMs: number
  offsetMs: number  // signed: negative = early, positive = late
  rating: 'perfect' | 'good' | 'ok' | 'miss'
}

export type GamePhase = 'select' | 'preview' | 'ready' | 'countdown' | 'playing' | 'results'
