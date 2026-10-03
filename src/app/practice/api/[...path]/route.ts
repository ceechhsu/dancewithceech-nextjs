import { auth } from '@/auth'
import { handleTrainerApi, readTrainerProfile } from '@/lib/trainer/api'
import { trainerIdentity } from '@/lib/trainer/session'
import { googlePhoto } from '@/lib/trainer/validation'
import catalog from '@/content/trainer-lessons.json'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const json = (body: unknown, status=200) => Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
async function dispatch(request: Request, context: {params: Promise<{path:string[]}>}) {
 const {path:parts}=await context.params
 const path='/api/'+parts.join('/')
 if(path==='/api/lessons' && ['GET','HEAD'].includes(request.method)) return json(catalog)
 const identity=trainerIdentity(await auth())
 if(path==='/api/account' && ['GET','HEAD'].includes(request.method)) {
  let display_name=identity?.name || 'Dancer', photo_url=googlePhoto(identity?.photo || '')
  if(identity) { try { const profile=await readTrainerProfile(identity); display_name=profile.display_name;photo_url=profile.photo_url } catch { /* Sign-in remains available during a storage outage. */ } }
  return json({signed_in:!!identity,can_adjust_sync:identity?.owner===true,google_available:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),can_save_scores:!!identity,display_name,photo_url})
 }
 if(path==='/api/sync-permission' && ['GET','HEAD'].includes(request.method)) return json({can_adjust_sync:identity?.owner===true})
 return handleTrainerApi(request,path,identity)
}
export {dispatch as GET,dispatch as HEAD,dispatch as POST}
