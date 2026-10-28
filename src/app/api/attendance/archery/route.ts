import { AttendanceError,attendanceDb,attendanceIdentity } from '@/lib/attendance/server'
import { ProgressRequestError } from '@/lib/attendance/progress-request'
import { parseArcheryRequest } from '@/lib/archery/request'
export const dynamic='force-dynamic'
export const runtime='nodejs'
async function handle(request:Request){
 const headers={'Cache-Control':'private, no-store'}
 try{
  const actor=await attendanceIdentity(),{action,body}=await parseArcheryRequest(request)
  if(['tournament_open','tournament_close','tournament_cancel','dispute_resolve'].includes(action)&&!actor.instructor)throw new AttendanceError('Instructor access required.',403)
  const {data,error}=await attendanceDb().rpc('archery_api',{p_actor:actor.email,p_sub:actor.sub,p_instructor:actor.instructor,p_action:action,p_body:body})
  if(error)throw new AttendanceError(error.code==='P0001'?error.message:'Unable to save archery activity.',/access denied|Instructor access/.test(error.message)?403:error.code==='P0001'?400:503)
  return Response.json(data,{headers})
 }catch(error){const known=error instanceof AttendanceError||error instanceof ProgressRequestError;return Response.json({error:known?error.message:'Unable to process archery request.'},{status:known?error.status:400,headers})}
}
export const GET=handle
export const POST=handle
