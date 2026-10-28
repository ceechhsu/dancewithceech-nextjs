import 'server-only'
import { attendanceDb, attendanceIdentity, AttendanceError } from './server'
import { archeryClasses } from './archery-navigation'

export async function getArcheryClasses() {
  const actor = await attendanceIdentity()
  // The existing RPC checks instructor ownership or current, active enrollment,
  // including Google subject, removal, effective dates and the class term.
  const { data, error } = await attendanceDb().rpc('attendance_progress_api', {
    p_actor: actor.email, p_sub: actor.sub, p_instructor: actor.instructor, p_action: 'list', p_body: {},
  })
  if (error) throw new AttendanceError('Archery access is unavailable. Please try again.', 503)
  return { account: actor.email, classes: archeryClasses(data) }
}
