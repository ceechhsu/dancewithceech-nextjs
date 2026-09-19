import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AttemptResult } from '../components/beatfirst-preview/progress'
import type { ProgressStore } from './beatfirst-progress-service'

type ProgressRow = {
  attempt_id: string
  level_id: number
  score: number
  hits: number
  total: number
  best_streak: number
  completed_at: string
}

const TABLE = 'beatfirst_preview_attempts'
const PAGE_SIZE = 1000

export function resolveProgressDatabaseConfig(environment: Record<string, string | undefined>) {
  const pairs = [
    ['BEATFIRST_SUPABASE_URL', 'BEATFIRST_SUPABASE_SERVICE_ROLE_KEY'],
    ['ATTENDANCE_SUPABASE_URL', 'ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY'],
    ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  ] as const
  for (const [urlName, keyName] of pairs) {
    const url = environment[urlName]?.trim()
    if (!url) continue
    const key = environment[keyName]?.trim()
    if (!key) throw new Error('Saved progress database is not configured.')
    return { url, key }
  }
  throw new Error('Saved progress database is not configured.')
}

export function createProgressStore(client: SupabaseClient): ProgressStore {
  return {
    async list(userId) {
      const results: AttemptResult[] = []
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await client.from(TABLE)
          .select('attempt_id,level_id,score,hits,total,best_streak,completed_at')
          .eq('user_id', userId)
          .order('saved_at', { ascending: true })
          .order('attempt_id', { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1)
          .returns<ProgressRow[]>()
        if (error || !data) throw new Error('Saved progress could not be loaded.')
        results.push(...data.map(row => ({
          id: row.attempt_id, levelId: row.level_id, score: row.score,
          hits: row.hits, total: row.total, bestStreak: row.best_streak,
          completedAt: row.completed_at,
        })))
        if (data.length < PAGE_SIZE) return results
      }
    },
    async insert(userId, results) {
      const { error } = await client.from(TABLE).upsert(results.map(result => ({
        user_id: userId, attempt_id: result.id, level_id: result.levelId,
        score: result.score, hits: result.hits, total: result.total,
        best_streak: result.bestStreak, completed_at: result.completedAt,
      })), { onConflict: 'user_id,attempt_id', ignoreDuplicates: true })
      if (error) throw new Error('Saved progress could not be written.')
    },
  }
}

let store: ProgressStore | undefined

export function getProgressStore(): ProgressStore {
  if (!store) {
    const { url, key } = resolveProgressDatabaseConfig(process.env)
    store = createProgressStore(createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }))
  }
  return store
}
