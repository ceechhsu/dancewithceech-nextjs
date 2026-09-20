import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { LeaderboardNameConflict, type LeaderboardStore } from './beatfirst-leaderboard-service'
import { resolveProgressDatabaseConfig } from './beatfirst-progress-store'

type ProfileRow = { display_name: string; listed: boolean }
type RankedRow = { user_id: string; display_name: string; score: number; rank: number }
const TABLE = 'beatfirst_leaderboard_profiles'

export function createLeaderboardStore(client: SupabaseClient): LeaderboardStore {
  return {
    async top(levelId) {
      const { data, error } = await client.rpc('beatfirst_level_top_ten', { p_level_id: levelId }).returns<RankedRow[]>()
      if (error || !Array.isArray(data)) throw new Error('The leaderboard could not be loaded.')
      return data.map(row => ({ userId: row.user_id, displayName: row.display_name, score: row.score, rank: row.rank }))
    },
    async profile(userId) {
      const { data, error } = await client.from(TABLE).select('display_name,listed').eq('user_id', userId).maybeSingle<ProfileRow>()
      if (error) throw new Error('Your public profile could not be loaded.')
      return data ? { displayName: data.display_name, listed: data.listed } : null
    },
    async saveProfile(userId, profile) {
      const { data, error } = await client.from(TABLE).upsert({
        user_id: userId, display_name: profile.displayName, listed: profile.listed,
      }, { onConflict: 'user_id' }).select('display_name,listed').single<ProfileRow>()
      if (error?.code === '23505') throw new LeaderboardNameConflict()
      if (error || !data) throw new Error('Your public profile could not be saved.')
      return { displayName: data.display_name, listed: data.listed }
    },
  }
}

let store: LeaderboardStore | undefined

export function getLeaderboardStore(): LeaderboardStore {
  if (!store) {
    const { url, key } = resolveProgressDatabaseConfig(process.env)
    store = createLeaderboardStore(createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }))
  }
  return store
}
