import 'server-only'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { ownerAccess } from './access'
import { buildOverview, snapshotState, type ActivityRow, type Coverage, type DirectoryRow, type HistoricalEmailRow } from './model'
import { resolveDirectoryConfig } from './config'
import { readDirectory } from './directory'
import { resolveProgressDatabaseConfig } from '@/lib/beatfirst-progress-store'

export class OwnerDashboardError extends Error {
  constructor(public status: number) { super(status === 401 ? 'Sign in to continue.' : status === 403 ? 'Owner access required.' : 'Owner dashboard is not enabled.') }
}
export async function requireOwner() {
  // Authorize before even constructing a database client.
  const status = ownerAccess(await auth())
  if (status !== 200) throw new OwnerDashboardError(status)
  if (process.env.OWNER_DASHBOARD_ENABLED !== 'true') throw new OwnerDashboardError(404)
}
const client = (url: string, key: string) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10000) }) } })
function directoryClient() {
  const { url, key } = resolveDirectoryConfig(process.env)
  return client(url, key)
}

const LIMIT = 2000
export async function loadOwnerOverview() {
  await requireOwner()
  const coverage: Coverage[] = []
  const activity: ActivityRow[] = []
  let directory: DirectoryRow[] = []
  let historical: HistoricalEmailRow[] = []
  // Independent sources fail independently. A missing source is never shown as zero usage.
  await Promise.all([
    (async () => {
      const name = 'Google sign-ins'
      try {
        const db = directoryClient()
        const cutoff = new Date().toISOString()
        directory = await readDirectory(async offset => {
          const { data, error, count } = await db.from('owner_account_directory').select('user_id,email,first_sign_in_at,last_sign_in_at', { count: 'exact' }).gt('expires_at', cutoff).order('user_id').range(offset, offset + 999)
          if (error || !data) throw new Error('Directory unavailable')
          return { rows: data as DirectoryRow[], count }
        })
        coverage.push({ id: 'directory', name, state: 'available', detail: `Showing ${directory.length} nonexpired recorded accounts. Collection began October 20, 2026; earlier sign-in-only accounts cannot be reconstructed.` })
      } catch { coverage.push({ id: 'directory', name, state: 'unavailable', detail: 'No directory connected. Sign-in-only accounts and historical sign-in dates are unknown.' }) }
    })(),
    (async () => {
      const name = 'Historical email matches'
      try {
        const db = directoryClient(), cutoff = new Date().toISOString()
        historical = await readDirectory(async offset => {
          const { data, error, count } = await db.from('owner_account_email_matches').select('user_id,email,matched_at', { count: 'exact' }).gt('expires_at', cutoff).order('user_id').range(offset, offset + 999)
          if (error || !data) throw new Error('Historical matches unavailable')
          return { rows: data as HistoricalEmailRow[], count }
        })
        coverage.push({ id: 'historical-emails', name, state: 'available', detail: `${historical.length} nonexpired exact Google-account ID matches from previously saved attendance account records. These are email associations, not recorded website sign-ins. No attendance details are included.` })
      } catch { coverage.push({ id: 'historical-emails', name, state: 'unavailable', detail: 'Historical associations unavailable. No email is guessed.' }) }
    })(),
    (async () => {
      const name = 'BeatFirst'
      try {
        const { url, key } = resolveProgressDatabaseConfig(process.env)
        const { data, error, count } = await client(url, key).from('beatfirst_preview_attempts').select('user_id,attempt_id,level_id,saved_at', { count: 'exact' }).order('saved_at', { ascending: false }).order('user_id').order('attempt_id').limit(LIMIT)
        if (error || !data) throw new Error()
        snapshotState(count, data.length)
        activity.push(...data.slice(0, LIMIT).map(row => ({ user_id: row.user_id, service: 'beatfirst' as const, saved_at: row.saved_at, description: `Level ${row.level_id} round saved` })))
        coverage.push({ id: 'beatfirst', name, state: snapshotState(count, data.length), detail: `Showing ${data.length} of ${count} saved rounds. Server save time can follow an offline import; it is not play time or sign-in time.` })
      } catch { coverage.push({ id: 'beatfirst', name, state: 'unavailable', detail: 'Saved rounds unavailable. No usage totals inferred.' }) }
    })(),
    (async () => {
      const name = 'Practice trainer'
      try {
        const url = process.env.TRAINER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.TRAINER_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!url || !key) throw new Error()
        const table = process.env.VERCEL_ENV === 'preview' ? 'trainer_preview_scores' : 'trainer_scores'
        const { data, error, count } = await client(url, key).from(table).select('account,take,lesson,saved', { count: 'exact' }).order('saved', { ascending: false }).order('account').order('take').limit(LIMIT)
        if (error || !data) throw new Error()
        snapshotState(count, data.length)
        activity.push(...data.slice(0, LIMIT).map(row => ({ user_id: row.account, service: 'trainer' as const, saved_at: new Date(row.saved * 1000).toISOString(), description: `${row.lesson === 'marching' ? 'Marching' : row.lesson === '2step' ? '2 Step' : 'Practice'} score saved` })))
        coverage.push({ id: 'trainer', name, state: snapshotState(count, data.length), detail: `Showing ${data.length} of ${count} saved scores. These timestamps do not measure recording, watching, or active practice time.` })
      } catch { coverage.push({ id: 'trainer', name, state: 'unavailable', detail: 'Saved scores unavailable. No usage totals inferred.' }) }
    })(),
  ])
  coverage.sort((a, b) => a.id.localeCompare(b.id))
  return buildOverview(directory, activity, coverage, false, new Date().toISOString(), historical)
}
