export async function POST() {
  return Response.json({ error: 'Email codes are no longer supported. Sign in with Google.' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } })
}
