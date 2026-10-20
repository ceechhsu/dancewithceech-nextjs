import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { signInRecord, signInRecordingEnabled } from './signin'
import { resolveDirectoryConfig } from './config'
export async function recordOwnerDirectorySignIn(profile: Record<string, unknown> | undefined) {
  if (!signInRecordingEnabled(process.env)) return
  const record = signInRecord(profile)
  if (!record) return
  try {
    const { url, key } = resolveDirectoryConfig(process.env)
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) }) } })
    const { error } = await db.rpc('owner_directory_record_signin', record)
    if (error) throw new Error('Recording unavailable')
  } catch { console.error('Owner sign-in recording unavailable') }
}
