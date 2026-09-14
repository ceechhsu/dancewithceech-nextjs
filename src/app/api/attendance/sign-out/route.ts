import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
  response.cookies.set('attendance_device', '', {
    path: '/', maxAge: 0, httpOnly: true,
    secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
  })
  return response
}
