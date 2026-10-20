/* Full document links keep private pages isolated from marketing scripts. */
/* eslint-disable @next/next/no-html-link-for-pages */
import Dashboard from '@/components/owner-dashboard/Dashboard'
import GoogleLogin from '@/components/attendance/GoogleLogin'
import { loadOwnerOverview, OwnerDashboardError } from '@/lib/owner-dashboard/server'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Owner studio | DanceWithCeech', robots: { index: false, follow: false } }
export default async function AdminPage() {
  let overview
  try { overview = await loadOwnerOverview() }
  catch (error) {
    const status = error instanceof OwnerDashboardError ? error.status : 503
    return <main className="mx-auto max-w-xl px-6 py-24"><p className="text-sm text-muted">PRIVATE OWNER WORKSPACE</p><h1 className="my-4 text-3xl font-semibold">{status === 401 ? 'Sign in to the owner workspace' : status === 403 ? 'Owner access required' : status === 404 ? 'Owner dashboard is not enabled' : 'Dashboard temporarily unavailable'}</h1><p className="mb-8 text-muted">{status === 401 ? 'Use your verified Google owner account to continue.' : 'Account and activity records are available only to the site owner.'}</p>{(status === 401 || status === 403) && <GoogleLogin returnTo="/admin" />}<a className="ml-4 inline-block py-3 text-muted" href="/">Return to the website</a></main>
  }
  return <Dashboard initial={overview} />
}
