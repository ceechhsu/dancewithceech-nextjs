import { handlers } from '@/auth'
import type { NextRequest } from 'next/server'

function diagnosticHandler(handler: typeof handlers.GET) {
  return async (request: NextRequest) => {
    if (process.env.AUTH_DIAGNOSTICS !== 'true') return handler(request)
    const path = new URL(request.url).pathname
    const cookieNames = (request.headers.get('cookie') ?? '').split(';').map(c => c.trim().split('=')[0])
    const response = await handler(request)
    const issued = response.headers.getSetCookie()
    const location = response.headers.get('location')
    let destination: URL | undefined
    try { if (location) destination = new URL(location, request.url) } catch { /* No redirect */ }
    console.info('auth-diagnostic', JSON.stringify({
      path,
      host: new URL(request.url).host,
      pkceCookieReceived: cookieNames.some(n => n.endsWith('authjs.pkce.code_verifier')),
      pkceCookieIssued: issued.some(c => c.split('=')[0].endsWith('authjs.pkce.code_verifier') && !c.includes('Max-Age=0')),
      status: response.status,
      redirectHost: destination?.host,
      error: destination?.pathname === '/api/auth/error' ? destination.searchParams.get('error') : undefined,
    }))
    return response
  }
}

export const GET = diagnosticHandler(handlers.GET)
export const POST = diagnosticHandler(handlers.POST)
