import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerKey } from '@/lib/supabase-server-key'
import { loadOwnerOverview, requireOwner } from './server'
import { OWNER_CLASSES, ClassViewError } from './classes'
import { loadOtherUsers, type RosterIdentity } from './other-users'

async function currentRosterIdentities(): Promise<RosterIdentity[]> {
  const url = process.env.ATTENDANCE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.ATTENDANCE_SUPABASE_URL ? process.env.ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY : getSupabaseServerKey()
  if (!url || !key) throw new ClassViewError(503)
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10000) }) },
  })
  const ids = OWNER_CLASSES.map(item => item.id)
  const { data, error } = await db.from('attendance_classes')
    .select('id,instructor_email,term,year,archived').in('id', ids)
    .eq('instructor_email', 'dancewithceech@gmail.com').eq('term', 'Fall').eq('year', 2026).eq('archived', false)
  if (error || !data || data.length !== ids.length || !ids.every(id => data.some(row => row.id === id && row.instructor_email.trim().toLowerCase() === 'dancewithceech@gmail.com' && row.term === 'Fall' && row.year === 2026 && row.archived === false))) throw new ClassViewError(503)
  const identities: RosterIdentity[] = []
  while (true) {
    const offset = identities.length
    const { data, error, count } = await db.from('attendance_enrollments')
      .select('google_sub,email', { count: 'exact' }).in('class_id', ids)
      .is('effective_to', null).is('removed_at', null).order('id').range(offset, offset + 999)
    if (error || !data || count === null || count < 0) throw new ClassViewError(503)
    identities.push(...data as RosterIdentity[])
    if (identities.length >= count) return identities
    if (!data.length) throw new ClassViewError(503)
  }
}

export const loadOwnerOtherUsers = () => loadOtherUsers({
  authorize: requireOwner,
  overview: loadOwnerOverview,
  memberships: currentRosterIdentities,
})
