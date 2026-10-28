import ArcheryHub from '@/components/archery/ArcheryHub'
import GoogleLogin from '@/components/attendance/GoogleLogin'
import ArcheryAccessDenied from '@/components/attendance/ArcheryAccessDenied'
import { getArcheryClasses } from '@/lib/attendance/archery-access-server'
import { AttendanceError } from '@/lib/attendance/server'
export const metadata = { title: 'Archery | Dance With Ceech', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  let access
  try {
    access = await getArcheryClasses()
  } catch (error) {
    if (error instanceof AttendanceError && error.status === 401) return <GoogleLogin returnTo={`/attendance/archery/${classId}`} />
    return <ArcheryAccessDenied />
  }
  const { classes } = access
  if (!classes.some(item => item.id === classId)) return <ArcheryAccessDenied />
  return <><a href="/dashboard">← Your classes</a><ArcheryHub key={classId} classId={classId} /><a href={`/attendance/progress/${classId}`}>Earlier practice notes</a></>
}
