import 'server-only'

export function getSupabaseServerKey(environment: Record<string, string | undefined> = process.env) {
  return environment.SUPABASE_SECRET_KEY?.trim() || environment.SUPABASE_SERVICE_ROLE_KEY?.trim()
}
