import { signInRecord } from './signin'
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }
export function createSignInErasureHandler(deps: { getSession: () => Promise<unknown>; erase: (id: string) => Promise<void> }) {
  return async (request: Request) => {
    const reply = (body: object, status: number) => Response.json(body, { status, headers })
    try {
      const user = (await deps.getSession() as { user?: Record<string, unknown> } | null)?.user
      const record = signInRecord({ sub: user?.googleSub, email: user?.email, email_verified: user?.googleEmailVerified })
      if (!record) return reply({ error: 'Sign in with your verified Google account.' }, 401)
      if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Request must come from this site.' }, 403)
      if (new URL(request.url).search) return reply({ error: 'Account selectors are not accepted.' }, 400)
      // Next may supply an empty stream for DELETE. Reject bytes, not the stream itself.
      const reader = request.body?.getReader()
      if (reader) {
        try {
          while (true) {
            const chunk = await reader.read()
            if (chunk.done) break
            if (chunk.value.byteLength) { await reader.cancel(); return reply({ error: 'Account selectors are not accepted.' }, 400) }
          }
        } finally { reader.releaseLock() }
      }
      await deps.erase(record.p_user_id)
      return reply({ deleted: true }, 200)
    } catch { return reply({ error: 'Could not delete the sign-in record. Please try again.' }, 503) }
  }
}
