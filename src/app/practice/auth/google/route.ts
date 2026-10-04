import { signIn } from '@/auth'
import { trainerReturnPath } from '@/lib/trainer/session'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
 const url=new URL(request.url)
 const destination=await signIn('google',{redirect:false,redirectTo:trainerReturnPath(url.searchParams.get('next'))},url.searchParams.get('switch')==='1'?{prompt:'select_account'}:undefined)
 return Response.redirect(destination,303)
}
