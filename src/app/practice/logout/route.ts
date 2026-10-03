import { signOut } from '@/auth'
export async function POST(request: Request) {
 const url=new URL(request.url)
 if(request.headers.get('origin')!==url.origin) return new Response('This request must come from this website.',{status:403})
 await signOut({redirect:false,redirectTo:'/practice/'})
 return Response.redirect(new URL('/practice/',url.origin),303)
}
