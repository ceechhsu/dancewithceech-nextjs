export function resolveDirectoryConfig(env: Record<string, string | undefined>) {
  const overrideUrl = env.OWNER_DIRECTORY_SUPABASE_URL?.trim()
  const overrideKey = env.OWNER_DIRECTORY_SUPABASE_SERVER_KEY?.trim()
  if (overrideUrl || overrideKey) {
    if (!overrideUrl || !overrideKey) throw new Error('Directory configuration is incomplete')
    return { url: overrideUrl, key: overrideKey }
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) throw new Error('Directory is not configured')
  return { url, key }
}
