import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { createSignInErasureHandler } from '@/lib/owner-dashboard/erasure'
import { resolveDirectoryConfig } from '@/lib/owner-dashboard/config'
export const dynamic = 'force-dynamic'
export const DELETE = createSignInErasureHandler({ getSession: auth, erase: async id => {
  const { url, key } = resolveDirectoryConfig(process.env)
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) }) } })
  const { error } = await db.rpc('owner_directory_erase_account', { p_user_id: id })
  if (error) throw new Error('Deletion unavailable')
} })
