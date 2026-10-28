import GoogleLogin from '@/components/attendance/GoogleLogin'
import ArcheryAccessDenied from '@/components/attendance/ArcheryAccessDenied'
import { getArcheryClasses } from '@/lib/attendance/archery-access-server'
import { AttendanceError } from '@/lib/attendance/server'
export const metadata = { title: 'Archery | Dance With Ceech', robots: { index: false, follow: false } }
export default async function Page() {
  let access
  try { access = await getArcheryClasses() }
  catch (error) {
    if (error instanceof AttendanceError && error.status === 401) return <GoogleLogin returnTo="/attendance/archery" />
    return <ArcheryAccessDenied />
  }
  if (!access.classes.length) return <ArcheryAccessDenied />
  return <section><h1>Your archery classes</h1><ul>{access.classes.map(item => <li key={item.id}><a href={`/attendance/archery/${item.id}`}>{item.name}</a></li>)}</ul></section>
}
