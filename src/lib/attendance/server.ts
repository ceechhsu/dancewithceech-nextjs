import 'server-only'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { after } from 'next/server'
import { getSupabaseServerKey } from '../supabase-server-key'
import { googleAttendanceIdentity } from './google-identity'
import { rosterGoogleProfile } from './google-profile'
import { syncRosterProfile } from './profile-sync'

export function attendanceDb() {
  if (process.env.ATTENDANCE_ENABLED !== 'true') throw new AttendanceError('Attendance is not available yet.', 503)
  const url = process.env.ATTENDANCE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.ATTENDANCE_SUPABASE_URL ? process.env.ATTENDANCE_SUPABASE_SERVICE_ROLE_KEY : getSupabaseServerKey()
  if (!url || !key) throw new AttendanceError('Attendance is not configured yet.', 503)
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
export class AttendanceError extends Error { constructor(message: string, public status = 400) { super(message) } }
export async function attendanceIdentity() {
  const session = await auth()
  const user = session?.user as { email?: string | null; image?: string | null; googleSub?: string; googleEmailVerified?: boolean; googleGivenName?: string | null; googleFamilyName?: string | null; googleProfileReady?: boolean } | undefined
  const identity = googleAttendanceIdentity(user, process.env.ATTENDANCE_INSTRUCTOR_EMAILS || '')
  if (identity) return { ...identity, profileReady: user?.googleProfileReady === true, profile: rosterGoogleProfile({ email_verified: true, email: identity.email, given_name: user?.googleGivenName, family_name: user?.googleFamilyName, picture: user?.image })! }
  throw new AttendanceError('Sign in with Google to continue.', 401)
}
export async function attendanceRequest(request: Request, resource: string) {
  try {
    const actor = await attendanceIdentity()
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin')
      if (!origin || origin !== new URL(request.url).origin) throw new AttendanceError('Request origin is not allowed.', 403)
    }
    const params = new URL(request.url).searchParams
    const body = request.method === 'GET' ? Object.fromEntries(params) : await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AttendanceError('Invalid request.')
    if (JSON.stringify(body).length > 500000) throw new AttendanceError('Request is too large.', 413)
    const action = request.method === 'GET' ? 'list' : body.action || (resource === 'check-in' ? 'check_in' : 'save')
    if (resource === 'classes' && action === 'update' && ['start_date', 'end_date', 'days'].some(key => Object.prototype.hasOwnProperty.call(body, key))) {
      throw new AttendanceError('Use the schedule editor to change dates or weekdays.')
    }
    const db = attendanceDb()
    if (resource === 'check-in') {
      if (!actor.profileReady) throw new AttendanceError('Refresh your Google sign-in once so we can update your roster profile.', 401)
      try { await syncRosterProfile(db, actor.profile) }
      catch { throw new AttendanceError('Your profile could not be refreshed. Please try checking in again.', 503) }
    }
    const addingStudent = resource === 'enrollments' && action === 'add'
    const editingNickname = resource === 'enrollments' && action === 'nickname'
    const removingStudent = resource === 'enrollments' && action === 'remove_from_class'
    if ((addingStudent || editingNickname || removingStudent) && !actor.instructor) throw new AttendanceError('Instructor access required.', 403)
    if (removingStudent && body.confirmation !== 'delete') throw new AttendanceError('Please type delete to confirm.')
    if (editingNickname && typeof body.nickname !== 'string') throw new AttendanceError('Enter a nickname or leave it blank.')
    const { data, error } = removingStudent
      ? await db.rpc('attendance_remove_student', { p_actor: actor.email, p_class_id: body.classId, p_enrollment_id: body.enrollmentId, p_confirmation: body.confirmation })
      : editingNickname
      ? await db.rpc('attendance_set_nickname', { p_actor: actor.email, p_class_id: body.classId, p_enrollment_id: body.enrollmentId, p_nickname: body.nickname })
      : addingStudent
      ? await db.rpc('attendance_add_student', { p_actor: actor.email, p_sub: actor.sub, p_instructor: actor.instructor, p_class_id: body.classId, p_email: body.email, p_first: body.first_name || '', p_last: body.last_name || '' })
      : await db.rpc('attendance_api', { p_actor: actor.email, p_sub: actor.sub, p_instructor: actor.instructor, p_resource: resource, p_action: action, p_body: body })
    if (error) {
      console.error('Attendance database request failed', error.code)
      throw new AttendanceError(error.code === 'P0001' ? error.message : 'Attendance could not be saved. Please try again.', error.code === 'P0001' ? 400 : 503)
    }
    if (resource === 'check-in' && data?.error && data?.attemptId) {
      after(async () => { const { notifyAttendanceFailure } = await import('./push'); await notifyAttendanceFailure(data.attemptId) })
    }
    return Response.json(data, { status: data?.error ? (data.code === 'conflict' ? 409 : 400) : 200, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceError ? error.message : 'Unable to process attendance request.' }, { status: error instanceof AttendanceError ? error.status : 400, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
