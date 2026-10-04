import { trainerReturnPath } from '@/lib/trainer/session'
export function GET(request: Request) {
 const url=new URL(request.url),target=new URL('/practice/auth/google',url.origin)
 target.searchParams.set('next',trainerReturnPath(url.searchParams.get('next')))
 return Response.redirect(target,303)
}
