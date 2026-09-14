import 'server-only'
import { AttendanceError, attendanceDb, attendanceIdentity } from './server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const actions = { calendar: ['list'], schedule: ['list', 'save', 'exclude', 'restore'], requests: ['list', 'create', 'review'] } as const
type Resource = keyof typeof actions

/** Only server-verified Google identity reaches the service-only calendar RPC. */
export async function attendanceCalendarRequest(request: Request, resource: Resource) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const actor = await attendanceIdentity()
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) throw new AttendanceError('Request origin is not allowed.', 403)
    let body: Record<string, unknown>
    if (request.method === 'GET') body = Object.fromEntries(url.searchParams)
    else {
      const raw = await request.text()
      if (raw.length > 12000) throw new AttendanceError('Request is too large.', 413)
      body = JSON.parse(raw)
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AttendanceError('Invalid request.')
    const action = request.method === 'GET' ? 'list' : body.action
    if (typeof action !== 'string' || !(actions[resource] as readonly string[]).includes(action) || (request.method !== 'GET' && action === 'list')) throw new AttendanceError('Unknown calendar action.')
    const requiredIds = ['classId', ...(action === 'create' ? ['meetingId', 'enrollmentId'] : []), ...(action === 'review' ? ['requestId'] : [])]
    for (const key of requiredIds) if (typeof body[key] !== 'string' || !UUID.test(body[key] as string)) throw new AttendanceError(`Invalid ${key}.`)
    for (const key of ['classId', 'meetingId', 'enrollmentId', 'requestId']) if (body[key] !== undefined && (typeof body[key] !== 'string' || !UUID.test(body[key] as string))) throw new AttendanceError(`Invalid ${key}.`)
    if (action === 'save' || action === 'review') {
      if (!Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 1) throw new AttendanceError('A current revision is required.')
    }
    const { data, error } = await attendanceDb().rpc('attendance_calendar_api', {
      p_actor: actor.email, p_sub: actor.sub, p_instructor: actor.instructor,
      p_resource: resource, p_action: action, p_body: body,
    })
    if (error) {
      console.error('Attendance calendar request failed', error.code)
      if (error.code === '23505') throw new AttendanceError('A pending request already exists for this meeting.', 409)
      throw new AttendanceError(error.code === 'P0001' ? error.message : 'Attendance could not be saved. Please try again.', error.code === 'P0001' ? 400 : 503)
    }
    return Response.json(data, { status: data?.error ? (data.code === 'conflict' ? 409 : 400) : 200, headers })
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceError ? error.message : 'Unable to process attendance request.' }, { status: error instanceof AttendanceError ? error.status : 400, headers })
  }
}
