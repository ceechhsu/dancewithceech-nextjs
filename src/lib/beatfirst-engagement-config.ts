type Environment = Record<string, string | undefined>

const stagingBranch = 'codex/beatfirst-engagement-staging'
const productionDatabaseHost = 'ywianppupnxduthvyeyb.supabase.co'

function isVercelProduction(environment: Environment) {
  return environment.VERCEL_ENV === 'production' || environment.VERCEL_TARGET_ENV === 'production'
}

function isVercelPreview(environment: Environment) {
  return environment.VERCEL_ENV === 'preview' || environment.VERCEL_TARGET_ENV === 'preview'
}

export function isBeatFirstStaging(environment: Environment = process.env) {
  if (isVercelProduction(environment)) return false
  return environment.BEATFIRST_STAGING_ISOLATION === '1' ||
    (isVercelPreview(environment) && environment.VERCEL_GIT_COMMIT_REF === stagingBranch)
}

export function requiresBeatFirstStagingDatabase(environment: Environment = process.env) {
  return !isVercelProduction(environment) && (isVercelPreview(environment) || isBeatFirstStaging(environment))
}

export function beatFirstEngagementEnabled(environment: Environment = process.env) {
  return isBeatFirstStaging(environment) || environment.BEATFIRST_ENGAGEMENT_ENABLED === '1'
}

export function beatFirstStagingDatabase(environment: Environment = process.env) {
  const url = environment.BEATFIRST_STAGING_SUPABASE_URL?.trim()
  const key = environment.BEATFIRST_STAGING_SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  try {
    const target = new URL(url)
    if (target.protocol !== 'https:' || target.hostname === productionDatabaseHost) return null
    for (const configured of [environment.BEATFIRST_SUPABASE_URL, environment.ATTENDANCE_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_URL]) {
      if (configured?.trim() && new URL(configured).origin === target.origin) return null
    }
    return { url, key }
  } catch { return null }
}

export function beatFirstAccountsEnabled(environment: Environment = process.env) {
  return !requiresBeatFirstStagingDatabase(environment) || beatFirstStagingDatabase(environment) !== null
}

export function beatFirstStagingPathAllowed(pathname: string, accountsEnabled: boolean) {
  if (pathname === '/beat-first' || pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/logo-mark.png' ||
      pathname === '/_next/image' || pathname.startsWith('/_next/static/') || pathname.startsWith('/images/')) return true
  return accountsEnabled && (pathname.startsWith('/api/auth/') || pathname === '/auth/retry' ||
    pathname === '/api/beatfirst/progress' || pathname === '/api/beatfirst/progress/check-in' || pathname === '/api/beatfirst/leaderboard')
}
