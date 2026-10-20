export function signInRecordingEnabled(env: Record<string, string | undefined>) {
  return env.OWNER_SIGNIN_RECORDING_ENABLED === 'true' && env.OWNER_SIGNIN_PRIVACY_REVIEWED === 'true'
}
/** No name, photo, IP, device, location, Google tokens, or browsing history. */
export function signInRecord(profile: Record<string, unknown> | undefined) {
  if (profile?.email_verified !== true || typeof profile.sub !== 'string' || !/^[a-zA-Z0-9_-]{1,255}$/.test(profile.sub) || typeof profile.email !== 'string') return null
  const email = profile.email.trim().toLowerCase()
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return { p_user_id: `google:${profile.sub}`, p_email: email }
}
