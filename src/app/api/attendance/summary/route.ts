import { attendanceDb, attendanceIdentity, AttendanceError } from '@/lib/attendance/server'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const actor = await attendanceIdentity()
    if (!actor.instructor) throw new AttendanceError('Instructor access required.', 403)
    const classId = new URL(request.url).searchParams.get('classId')
    if (!classId || !/^[0-9a-f-]{36}$/i.test(classId)) throw new AttendanceError('Choose a class.')
    const { data, error } = await attendanceDb().rpc('attendance_class_summary', { p_actor: actor.email, p_class_id: classId })
    if (error) throw new AttendanceError('Unable to load this class roster.', 400)
    return Response.json(data, { headers })
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceError ? error.message : 'Unable to load roster.' }, { status: error instanceof AttendanceError ? error.status : 500, headers })
  }
}
