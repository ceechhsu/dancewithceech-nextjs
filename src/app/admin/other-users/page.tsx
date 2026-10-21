/* Full-document navigation isolates private account pages. */
import { redirect } from 'next/navigation'
import Dashboard from '@/components/owner-dashboard/Dashboard'
import OwnerSidebar from '@/components/owner-dashboard/OwnerSidebar'
import { loadOwnerOtherUsers } from '@/lib/owner-dashboard/other-users-server'
import { OwnerDashboardError } from '@/lib/owner-dashboard/server'
import styles from '@/components/owner-dashboard/Dashboard.module.css'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Other users | DanceWithCeech', robots: { index: false, follow: false } }
export default async function OtherUsersPage() {
  let overview
  try { overview = await loadOwnerOtherUsers() }
  catch (error) {
    if (error instanceof OwnerDashboardError && [401, 403].includes(error.status)) redirect('/admin')
    return <div className={styles.shell}><OwnerSidebar otherUsers /><main className={styles.main}><h1>Other users temporarily unavailable</h1><p>All four current rosters must be available before accounts can be listed here. Please try again shortly.</p><a href="/admin/other-users">Try again</a></main></div>
  }
  return <Dashboard initial={overview} otherUsers />
}
