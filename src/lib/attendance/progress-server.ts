import 'server-only'
import { AttendanceError, attendanceDb, attendanceIdentity } from './server'
import { parseProgressRequest, ProgressRequestError } from './progress-request'

export async function attendanceProgressRequest(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const actor = await attendanceIdentity()
    const { action, body } = await parseProgressRequest(request)
    if (['configure', 'workspace'].includes(action) && !actor.instructor) throw new AttendanceError('Instructor access required.', 403)
    const { data, error } = await attendanceDb().rpc('attendance_progress_api', {
      p_actor: actor.email, p_sub: actor.sub, p_instructor: actor.instructor, p_action: action, p_body: body,
    })
    if (error) {
      console.error('Class progress request failed', error.code)
      const status = /access denied|enrolled student/.test(error.message) ? 403 : error.code === 'P0001' ? 400 : 503
      throw new AttendanceError(error.code === 'P0001' ? error.message : 'Class progress is unavailable. Please try again.', status)
    }
    return Response.json(data, { headers })
  } catch (error) {
    const known = error instanceof AttendanceError || error instanceof ProgressRequestError
    return Response.json({ error: known ? error.message : 'Unable to process class progress request.' }, { status: known ? error.status : 400, headers })
  }
}
