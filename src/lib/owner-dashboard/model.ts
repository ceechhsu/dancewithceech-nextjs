export type Service = 'beatfirst' | 'trainer'
export type DirectoryRow = { user_id: string; email: string; first_sign_in_at: string; last_sign_in_at: string }
export type ActivityRow = { user_id: string; service: Service; saved_at: string; description: string }
export type Coverage = { id: string; name: string; state: 'available' | 'unavailable' | 'limited'; detail: string }
export type Account = { id: string; email: string | null; firstSignIn: string | null; lastSignIn: string | null; lastActivity: string | null; beatfirst: number; trainer: number }
export type Overview = { generatedAt: string; demo: boolean; accounts: Account[]; activity: ActivityRow[]; coverage: Coverage[] }
const validTime = (time: string) => Number.isFinite(Date.parse(time))
export function buildOverview(directory: DirectoryRow[], activity: ActivityRow[], coverage: Coverage[], demo = false, generatedAt = new Date().toISOString()): Overview {
  const accounts = new Map<string, Account>()
  const get = (id: string) => {
    if (!accounts.has(id)) accounts.set(id, { id, email: null, firstSignIn: null, lastSignIn: null, lastActivity: null, beatfirst: 0, trainer: 0 })
    return accounts.get(id)!
  }
  for (const row of directory) {
    const account = get(row.user_id)
    account.email = row.email
    account.firstSignIn = validTime(row.first_sign_in_at) ? row.first_sign_in_at : null
    account.lastSignIn = validTime(row.last_sign_in_at) ? row.last_sign_in_at : null
  }
  const events = activity.filter(row => validTime(row.saved_at))
  for (const row of events) {
    const account = get(row.user_id)
    account[row.service] += 1
    if (!account.lastActivity || Date.parse(row.saved_at) > Date.parse(account.lastActivity)) account.lastActivity = row.saved_at
  }
  return { generatedAt, demo, coverage, accounts: [...accounts.values()].sort((a, b) => Date.parse(b.lastActivity || b.lastSignIn || '1970-01-01') - Date.parse(a.lastActivity || a.lastSignIn || '1970-01-01')), activity: events.sort((a, b) => Date.parse(b.saved_at) - Date.parse(a.saved_at)).slice(0, 40) }
}

/** Exact counts expose server row caps instead of silently presenting a partial result as complete. */
export function snapshotState(total: number | null, returned: number): 'available' | 'limited' {
  if (total === null || total < returned) throw new Error('Snapshot count is unavailable')
  return total > returned ? 'limited' : 'available'
}
