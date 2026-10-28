import InstructorClass from '@/components/attendance/InstructorClass'
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return <InstructorClass key={classId} classId={classId} />
}
