export type LeaderboardProfile = { displayName: string; listed: boolean }
export type LeaderboardEntry = { rank: number; displayName: string; score: number; isYou: boolean }
export type LeaderboardData = { levelId: number; entries: LeaderboardEntry[]; profile: LeaderboardProfile | null }

// ASCII matches the database constraint. Reject controls before normalizing spaces.
export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9 ._-]+$/.test(value)) {
    throw new Error('Use letters A–Z, numbers, spaces, dots, underscores or hyphens in your public name.')
  }
  const name = value.trim().replace(/ +/g, ' ')
  if (name.length < 3 || name.length > 20) throw new Error('Your public name must be 3–20 characters.')
  return name
}

export function parseLeaderboardLevel(value: string | null): number {
  if (value === null || !/^(?:[1-9]|1[0-8])$/.test(value)) throw new Error('Choose a level from 1 to 18.')
  return Number(value)
}
