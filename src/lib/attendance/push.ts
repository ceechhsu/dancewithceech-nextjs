import 'server-only'
import webpush from 'web-push'
import { attendanceDb } from './server'

export function pushConfigured() {
  return process.env.ATTENDANCE_ENABLED === 'true' && process.env.ATTENDANCE_PUSH_ENABLED === 'true' && !!process.env.NEXT_PUBLIC_ATTENDANCE_VAPID_PUBLIC_KEY && !!process.env.ATTENDANCE_VAPID_PRIVATE_KEY && !!process.env.ATTENDANCE_VAPID_SUBJECT
}
// Restrict user-supplied push endpoints to browser push providers to avoid SSRF.
export function validPushEndpoint(endpoint: string) {
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
      (u.hostname === 'fcm.googleapis.com' || u.hostname === 'updates.push.services.mozilla.com' || u.hostname.endsWith('.push.apple.com') || u.hostname === 'web.push.apple.com' || u.hostname.endsWith('.notify.windows.com'))
  } catch { return false }
}
export async function notifyAttendanceFailure(attemptId: string) {
  if (!pushConfigured()) return
  const db = attendanceDb()
  const { data: owner } = await db.rpc('attendance_claim_failure_notice',{p_attempt:attemptId})
  if (!owner) return
  const { data: subscriptions } = await db.from('attendance_push_subscriptions').select('endpoint,subscription').eq('actor_email',owner)
  webpush.setVapidDetails(process.env.ATTENDANCE_VAPID_SUBJECT!,process.env.NEXT_PUBLIC_ATTENDANCE_VAPID_PUBLIC_KEY!,process.env.ATTENDANCE_VAPID_PRIVATE_KEY!)
  await Promise.allSettled((subscriptions || []).map(async row=>{
    if (!validPushEndpoint(row.endpoint)) return
    try { await webpush.sendNotification(row.subscription,JSON.stringify({title:'Attendance needs attention',body:'Open your instructor console to review recent check-in issues.',url:'/attendance/instructor'}),{TTL:60,timeout:5000}) }
    catch(error) { if ([404,410].includes((error as {statusCode?:number}).statusCode || 0)) await db.from('attendance_push_subscriptions').delete().eq('endpoint',row.endpoint) }
  }))
}
