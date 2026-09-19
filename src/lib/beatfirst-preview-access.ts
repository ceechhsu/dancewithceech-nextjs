import { createHash, timingSafeEqual } from 'node:crypto'

const privateHeaders = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
}

/** Deployment-only gate. The passcode is supplied to this preview, never bundled in the game. */
export function protectBeatFirstPreview(request: Request, environment?: string, password?: string): Response | null {
  const path = new URL(request.url).pathname
  if (path === '/' && environment === 'preview' && password) {
    return new Response(null, {
      status: 307,
      headers: { ...privateHeaders, location: new URL('/beat-first/preview', request.url).href },
    })
  }
  if (path !== '/beat-first/preview' && !path.startsWith('/beat-first/preview/')) return null
  if (!environment || environment === 'development') return null
  if (environment !== 'preview') return new Response('Not found', { status: 404, headers: privateHeaders })
  if (!password) return new Response('Private preview is not configured.', { status: 503, headers: privateHeaders })

  const authorization = request.headers.get('authorization') ?? ''
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization)
  if (match) {
    const supplied = Buffer.from(match[1], 'base64').toString('utf8')
    const digest = (value: string) => createHash('sha256').update(value).digest()
    if (timingSafeEqual(digest(supplied), digest(`ceech:${password}`))) return null
  }

  return new Response('Enter your BeatFirst preview credentials.', {
    status: 401,
    headers: { ...privateHeaders, 'www-authenticate': 'Basic realm="BeatFirst private preview", charset="UTF-8"' },
  })
}
