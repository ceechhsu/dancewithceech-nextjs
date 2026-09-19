import { replayRound, summarize, type Tap } from './engine'
import { LEVELS, unlockedLevelIds } from './levels'

export type Attempt = { id: string; levelId: number; taps: Tap[]; completedAt: string }
export type AttemptResult = Pick<Attempt, 'id' | 'levelId' | 'completedAt'> & { score: number; hits: number; total: number; bestStreak: number }
export type ProgressSummary = { bestScores: Record<string, number>; completedLevelIds: number[]; attemptCount: number; recent: AttemptResult[]; unlockedLevelIds: number[] }
export const MAX_BATCH = 25
export const MAX_TAPS = 250

export function identityFromSession(session: unknown): string | null {
  const user = (session as { user?: { googleSub?: unknown; googleEmailVerified?: unknown } } | null)?.user
  return typeof user?.googleSub === 'string' && user.googleSub.length > 0 && user.googleSub.length <= 255 && user.googleEmailVerified === true ? `google:${user.googleSub}` : null
}

export function validateAttempts(value: unknown, now = Date.now()): Attempt[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BATCH) throw new Error('Send 1–25 completed rounds at a time.')
  const ids = new Set<string>()
  return value.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid round.')
    const { id, levelId, taps, completedAt } = raw as Record<string, unknown>
    const level = LEVELS.find(item => item.id === levelId)
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || ids.has(id.toLowerCase())) throw new Error('Invalid round ID.')
    ids.add(id.toLowerCase())
    if (!level || !Array.isArray(taps) || taps.length > MAX_TAPS) throw new Error('Invalid level or taps.')
    if (typeof completedAt !== 'string' || !Number.isFinite(Date.parse(completedAt)) || Date.parse(completedAt) > now + 300_000 || Date.parse(completedAt) < Date.UTC(2020, 0, 1)) throw new Error('Invalid completion time.')
    let previous = -180
    const parsedTaps: Tap[] = taps.map(tap => {
      if (!tap || typeof tap !== 'object') throw new Error('Invalid tap.')
      const { atMs, lane } = tap as Record<string, unknown>
      if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < previous || atMs >= level.durationMs || (lane !== 0 && lane !== 1) || lane >= level.lanes) throw new Error('Invalid tap timing or lane.')
      previous = atMs
      return { atMs, lane }
    })
    return { id: id.toLowerCase(), levelId: level.id, taps: parsedTaps, completedAt: new Date(completedAt).toISOString() }
  })
}

export function scoreAttempt(attempt: Attempt): AttemptResult {
  const { score, hits, total, bestStreak } = summarize(replayRound(attempt.levelId, attempt.taps))
  return { id: attempt.id, levelId: attempt.levelId, completedAt: attempt.completedAt, score, hits, total, bestStreak }
}

export function summarizeAttempts(results: AttemptResult[]): ProgressSummary {
  const bestScores: Record<string, number> = {}
  for (const row of results) bestScores[row.levelId] = Math.max(bestScores[row.levelId] ?? 0, row.score)
  return {
    bestScores, completedLevelIds: Object.keys(bestScores).map(Number).sort((a,b) => a-b),
    attemptCount: results.length, recent: results.slice().sort((a,b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)).slice(0,5),
    unlockedLevelIds: unlockedLevelIds(bestScores, true),
  }
}
