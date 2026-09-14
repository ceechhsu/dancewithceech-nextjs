export function rosterGoogleProfile(profile: Record<string, unknown> | undefined) {
  if (profile?.email_verified !== true || typeof profile.email !== 'string' || !profile.email.trim()) return null
  const name = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : null
  let photo_url: string | null = null
  if (typeof profile.picture === 'string') {
    try {
      const url = new URL(profile.picture)
      if (url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) photo_url = url.href
    } catch { /* Missing or unsupported photos use the initials fallback. */ }
  }
  return { email: profile.email.trim().toLowerCase(), first_name: name(profile.given_name), last_name: name(profile.family_name), photo_url }
}
