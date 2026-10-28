import { getArcheryClasses } from '@/lib/attendance/archery-access-server'
import { AttendanceError } from '@/lib/attendance/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' }
  try { return Response.json(await getArcheryClasses(), { headers }) }
  catch (error) {
    return Response.json({ error: error instanceof AttendanceError ? error.message : 'Archery access is unavailable.' }, {
      status: error instanceof AttendanceError ? error.status : 503, headers,
    })
  }
}
