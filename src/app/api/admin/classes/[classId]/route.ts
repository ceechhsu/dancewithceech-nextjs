import { loadOwnerClass } from '@/lib/owner-dashboard/classes-server'
import { ClassViewError } from '@/lib/owner-dashboard/classes'
import { OwnerDashboardError } from '@/lib/owner-dashboard/server'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}
export async function GET(_request:Request,{params}:{params:Promise<{classId:string}>}) {
 try{return Response.json(await loadOwnerClass((await params).classId),{headers})}
 catch(error){const status=error instanceof ClassViewError||error instanceof OwnerDashboardError?error.status:503;return Response.json({error:status===401?'Sign in to continue.':status===403?'Owner access required.':status===404?'Class not found.':'Class records unavailable.'},{status,headers})}
}
