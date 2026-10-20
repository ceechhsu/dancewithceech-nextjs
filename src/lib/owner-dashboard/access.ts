// Authorization uses only the server-verified Auth.js session, never headers or query fields.
// Same sole owner already used by attendance navigation. No instructor-list fallback.
export const DASHBOARD_OWNER_EMAIL = 'dancewithceech@gmail.com'
export function ownerAccess(session: unknown): 200 | 401 | 403 {
  const user = (session as { user?: Record<string, unknown> } | null)?.user
  if (!user) return 401
  if (user.googleEmailVerified !== true || typeof user.googleSub !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(user.googleSub)) return 403
  return typeof user.email === 'string' && user.email.trim().toLowerCase() === DASHBOARD_OWNER_EMAIL ? 200 : 403
}
export function localPreviewEnabled(env: Record<string, string | undefined>) {
  return env.NODE_ENV === 'development' && !env.VERCEL_ENV && env.OWNER_DASHBOARD_LOCAL_PREVIEW === 'true'
}
