import { attendanceDb, attendanceIdentity, AttendanceError } from '@/lib/attendance/server'
import { pushConfigured, validPushEndpoint } from '@/lib/attendance/push'
export const dynamic = 'force-dynamic'
export async function GET() {
 try { await attendanceIdentity(); return Response.json({enabled:pushConfigured(),publicKey:pushConfigured()?process.env.NEXT_PUBLIC_ATTENDANCE_VAPID_PUBLIC_KEY:null},{headers:{'Cache-Control':'private, no-store'}}) }
 catch { return Response.json({error:'Sign in again to enable notifications.'},{status:401}) }
}
export async function POST(request: Request) {
 try {
  const actor=await attendanceIdentity()
  if(!actor.instructor) throw new AttendanceError('Instructor access required.',403)
  if(request.headers.get('origin')!==new URL(request.url).origin) throw new AttendanceError('Request origin is not allowed.',403)
  const body=await request.json()
  const endpoint=body.subscription?.endpoint || body.endpoint
  if(typeof endpoint!=='string' || !validPushEndpoint(endpoint)) throw new AttendanceError('Invalid push subscription.')
  const db=attendanceDb()
  if(body.action==='unsubscribe') {
   const {error}=await db.from('attendance_push_subscriptions').delete().eq('endpoint',endpoint).eq('actor_email',actor.email)
   if(error) throw error
  } else {
   if(!pushConfigured()) throw new AttendanceError('Notifications are not configured yet.',503)
   if(typeof body.subscription.keys?.auth!=='string' || typeof body.subscription.keys?.p256dh!=='string' || JSON.stringify(body.subscription).length>8192) throw new AttendanceError('Invalid push subscription.')
   const {error}=await db.from('attendance_push_subscriptions').upsert({endpoint,actor_email:actor.email,subscription:body.subscription})
   if(error) throw error
  }
  return Response.json({saved:true},{headers:{'Cache-Control':'private, no-store'}})
 } catch(error) {return Response.json({error:error instanceof AttendanceError?error.message:'Could not save notifications.'},{status:error instanceof AttendanceError?error.status:503})}
}
