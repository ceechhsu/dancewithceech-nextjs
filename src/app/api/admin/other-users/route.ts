import { loadOwnerOtherUsers } from '@/lib/owner-dashboard/other-users-server'
import { OwnerDashboardError } from '@/lib/owner-dashboard/server'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' }
export async function GET() {
  try { return Response.json(await loadOwnerOtherUsers(), { headers }) }
  catch (error) {
    const status = error instanceof OwnerDashboardError ? error.status : 503
    return Response.json({ error: status === 401 ? 'Sign in to continue.' : status === 403 ? 'Owner access required.' : 'Other users unavailable. All four current rosters must be available to check membership.' }, { status, headers })
  }
}
