import type { SupabaseClient } from '@supabase/supabase-js'
import type { rosterGoogleProfile } from './google-profile'

/** Called only with a server-verified Google profile, never request-body fields. */
export async function syncRosterProfile(db: SupabaseClient, fields: NonNullable<ReturnType<typeof rosterGoogleProfile>>) {
  const writes = [db.from('attendance_enrollments').update({ photo_url: fields.photo_url }).eq('email', fields.email).is('effective_to', null)]
  if (fields.first_name) writes.push(db.from('attendance_enrollments').update({ first_name: fields.first_name }).eq('email', fields.email).is('effective_to', null).or('first_name.is.null,first_name.eq.'))
  if (fields.last_name) writes.push(db.from('attendance_enrollments').update({ last_name: fields.last_name }).eq('email', fields.email).is('effective_to', null).or('last_name.is.null,last_name.eq.'))
  const results = await Promise.all(writes)
  if (results.some(result => result.error)) throw new Error('Your profile could not be refreshed. Please try checking in again.')
}
