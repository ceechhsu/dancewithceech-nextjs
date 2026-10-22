import { scoreAttempt, type Attempt } from './progress'

export type HomeDemoBest = { hits: number; score: number }

/** Separate maxima: hitting more beats need not mean more accurate timing. */
export function nextHomeDemoBest(current: HomeDemoBest | undefined, attempt: Attempt): HomeDemoBest | undefined {
  if (attempt.levelId !== 1) return current
  const result = scoreAttempt(attempt)
  return { hits: Math.max(current?.hits ?? 0, result.hits), score: Math.max(current?.score ?? 0, result.score) }
}
