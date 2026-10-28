import ClassProgress from '@/components/attendance/ClassProgress'
import VerifiedAccess from '@/components/attendance/VerifiedAccess'
export const metadata = { title: 'Class progress | Dance With Ceech', robots: { index: false, follow: false } }
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return <VerifiedAccess returnTo={`/attendance/progress/${classId}`}><ClassProgress key={classId} classId={classId} /></VerifiedAccess>
}
