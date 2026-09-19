import type { AttemptResult } from './progress'

export function masteryStars(score: number | undefined): number {
  return [80, 90, 95].filter(target => (score ?? 0) >= target).length
}

export function nextStarTarget(score: number | undefined): number | null {
  return [80, 90, 95].find(target => (score ?? 0) < target) ?? null
}

export function dailyPractice(recent: AttemptResult[], now: Date) {
  const completed = new Set(recent.filter(round => {
    const date = new Date(round.completedAt)
    return date <= now && date.toDateString() === now.toDateString()
  }).map(round => round.id)).size
  return { completed: Math.min(completed, 3), target: 3, done: completed >= 3 }
}

export function nextMasteryLevel(bestScores: Record<string, number>, unlocked: number[]): number {
  const candidates = unlocked.filter(id => bestScores[id] !== undefined && nextStarTarget(bestScores[id]) !== null)
  candidates.sort((a, b) => (nextStarTarget(bestScores[a])! - bestScores[a]) - (nextStarTarget(bestScores[b])! - bestScores[b]) || b - a)
  const unplayed = unlocked.filter(id => bestScores[id] === undefined)
  return candidates[0] ?? unplayed[unplayed.length - 1] ?? unlocked[unlocked.length - 1] ?? 1
}
